import { useRef, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef, useState } from 'react';
import {
  tokenizeMarkdown,
  tokenizeBBCode,
  applyHighlighting,
  type HighlightToken
} from '@/lib/highlighter';
import { detectBlacklistTerms } from '@/lib/blacklist-detector';
import { ContextMenu, type ContextMenuEntry } from './ContextMenu';

/** Debounce delay for syntax highlighting updates (ms) */
const HIGHLIGHT_DEBOUNCE_MS = 50;

export interface SyntaxEditorHandle {
  scrollToLine: (line: number, column?: number, length?: number) => void;
  selectRange: (start: number, end: number) => void;
  focus: () => void;
}

/** Accepted image MIME types for drag-and-drop and paste */
const ACCEPTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

/** Maximum image file size in bytes (10 MB) */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** Text file extensions accepted for drag-and-drop */
const TEXT_FILE_EXTENSIONS = new Set(['md', 'markdown', 'txt', 'bbcode']);

/** Check if a filename has a text file extension we accept */
function isTextFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return TEXT_FILE_EXTENSIONS.has(ext);
}

interface SyntaxEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'markdown' | 'bbcode';
  readOnly?: boolean;
  placeholder?: string;
  errorLines?: Set<number>;
  warningLines?: Set<number>;
  onSave?: () => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onImageDrop?: (filename: string, dataUrl: string) => void;
  onFileDrop?: (filename: string, content: string) => void;
  onPasteAsConfluence?: () => void;
  blacklistTerms?: string[];
}

export const SyntaxEditor = forwardRef<SyntaxEditorHandle, SyntaxEditorProps>(({
  value,
  onChange,
  language,
  readOnly = false,
  placeholder,
  errorLines = new Set(),
  warningLines = new Set(),
  onSave,
  onPaste,
  onImageDrop,
  onFileDrop,
  onPasteAsConfluence,
  blacklistTerms = [],
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragIsTextFile, setDragIsTextFile] = useState(false);
  const dragCounterRef = useRef(0);
  const pastedImageCountRef = useRef(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Sync scroll positions - defined early so useImperativeHandle can use it
  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    const lineNums = lineNumbersRef.current;
    
    if (textarea && highlight) {
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    }
    if (textarea && lineNums) {
      lineNums.scrollTop = textarea.scrollTop;
    }
  }, []);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    scrollToLine: (line: number, column?: number, length?: number) => {
      const textarea = textareaRef.current;
      const lineNums = lineNumbersRef.current;
      if (!textarea || !lineNums) return;
      
      // Calculate line height from actual rendered size
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 22;
      const scrollTop = (line - 1) * lineHeight - textarea.clientHeight / 2 + lineHeight;
      
      textarea.scrollTop = Math.max(0, scrollTop);
      syncScroll();
      
      // If column and length provided, select the text
      if (column !== undefined) {
        const lines = value.split('\n');
        let charOffset = 0;
        
        // Calculate character offset to start of target line
        for (let i = 0; i < line - 1 && i < lines.length; i++) {
          charOffset += lines[i].length + 1; // +1 for newline
        }
        
        // Add column offset (column is 1-indexed)
        const selectionStart = charOffset + (column - 1);
        const selectionEnd = selectionStart + (length || 1);
        
        // Set selection
        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);
      }
    },
    selectRange: (start: number, end: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      // Focus and select
      textarea.focus();
      textarea.setSelectionRange(start, end);
      
      // Calculate line number for scrolling
      const textBefore = value.substring(0, start);
      const lineNumber = (textBefore.match(/\n/g) || []).length + 1;
      
      // Scroll to make selection visible
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 22;
      const scrollTop = (lineNumber - 1) * lineHeight - textarea.clientHeight / 2 + lineHeight;
      textarea.scrollTop = Math.max(0, scrollTop);
      
      syncScroll();
    },
    focus: () => {
      textareaRef.current?.focus();
    },
  }), [value, syncScroll]);

  // Count lines
  const lineCount = useMemo(() => {
    return value.split('\n').length;
  }, [value]);

  // Generate line numbers with error/warning states
  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => ({
      num: i + 1,
      hasError: errorLines.has(i + 1),
      hasWarning: warningLines.has(i + 1),
    }));
  }, [lineCount, errorLines, warningLines]);

  // Compute highlighted HTML for a given value
  const computeHighlightedHtml = useCallback((text: string): string => {
    const tokens: HighlightToken[] = language === 'markdown'
      ? tokenizeMarkdown(text)
      : tokenizeBBCode(text);

    // Add blacklist term tokens
    if (blacklistTerms.length > 0) {
      const matches = detectBlacklistTerms(text, blacklistTerms);
      const lines = text.split('\n');
      for (const match of matches) {
        // Convert line/column to character offset
        let offset = 0;
        for (let i = 0; i < match.line - 1 && i < lines.length; i++) {
          offset += lines[i].length + 1;
        }
        offset += match.column - 1;
        tokens.push({
          type: 'highlight-blacklist',
          start: offset,
          end: offset + match.length,
        });
      }
    }

    return applyHighlighting(text, tokens);
  }, [language, blacklistTerms]);

  // Debounced syntax highlighting — the overlay trails the textarea by up to
  // HIGHLIGHT_DEBOUNCE_MS so rapid keystrokes don't trigger re-tokenization
  // on every character. The textarea itself remains immediate.
  const [highlightedHtml, setHighlightedHtml] = useState(() => computeHighlightedHtml(value));
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedHtml(computeHighlightedHtml(value));
    }, HIGHLIGHT_DEBOUNCE_MS);
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, [value, computeHighlightedHtml]);

  // Sync on value change
  useEffect(() => {
    syncScroll();
  }, [value, syncScroll]);

  // Insert a markdown image tag at the current cursor position (or end of text)
  const insertImageTag = useCallback((filename: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const tag = `![image](blob:${filename})`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Insert at cursor, adding newlines if not at line start
    const before = value.substring(0, start);
    const after = value.substring(end);
    const needsNewlineBefore = before.length > 0 && !before.endsWith('\n');
    const needsNewlineAfter = after.length > 0 && !after.startsWith('\n');

    const insert = (needsNewlineBefore ? '\n' : '') + tag + (needsNewlineAfter ? '\n' : '');
    const newValue = before + insert + after;
    onChange(newValue);

    // Move cursor after the inserted tag
    const newPos = before.length + insert.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [value, onChange]);

  // Read a File as data URL and store it via onImageDrop
  const processImageFile = useCallback((file: File, filenameOverride?: string) => {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) return;
    if (file.size > MAX_IMAGE_SIZE) {
      console.warn(`Image skipped: ${file.name} exceeds 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }

    const filename = filenameOverride || file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onImageDrop?.(filename, dataUrl);
      insertImageTag(filename);
    };
    reader.readAsDataURL(file);
  }, [onImageDrop, insertImageTag]);

  // Read a text file dropped on the editor
  const processTextFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      onFileDrop?.(file.name, content);
    };
    reader.readAsText(file);
  }, [onFileDrop]);

  // Drag-and-drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
      // Check if any dragged file is a text file (for overlay text)
      const items = Array.from(e.dataTransfer.items);
      const hasTextFile = items.some(item => {
        // dataTransfer.items may not expose filename during dragenter on all browsers
        // Fall back to checking the type
        if (item.kind === 'file') {
          return item.type === 'text/plain' || item.type === 'text/markdown' || item.type === '';
        }
        return false;
      });
      setDragIsTextFile(hasTextFile);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
      setDragIsTextFile(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragIsTextFile(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (isTextFile(file.name)) {
        processTextFile(file);
        return; // Only load the first text file
      }
      processImageFile(file);
    }
  }, [processImageFile, processTextFile]);

  // Enhanced paste handler: detect image data in clipboard
  const handleImagePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Check for image items in clipboard
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => ACCEPTED_IMAGE_TYPES.has(item.type));

    if (imageItems.length > 0) {
      e.preventDefault();
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          pastedImageCountRef.current++;
          const ext = file.type.split('/')[1] || 'png';
          const filename = `pasted-image-${pastedImageCountRef.current}.${ext}`;
          processImageFile(file, filename);
        }
      }
      return;
    }

    // No image data — delegate to parent onPaste handler (e.g., Confluence detection)
    onPaste?.(e);
  }, [processImageFile, onPaste]);

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (readOnly) return; // Let browser handle it for read-only editors
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [readOnly]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Build context menu items
  const contextMenuItems = useMemo((): ContextMenuEntry[] => {
    const textarea = textareaRef.current;
    const hasSelection = textarea
      ? textarea.selectionStart !== textarea.selectionEnd
      : false;

    const items: ContextMenuEntry[] = [
      {
        label: 'Cut',
        disabled: !hasSelection,
        action: () => {
          document.execCommand('cut');
        },
      },
      {
        label: 'Copy',
        disabled: !hasSelection,
        action: () => {
          document.execCommand('copy');
        },
      },
      {
        label: 'Paste',
        action: async () => {
          try {
            const text = await navigator.clipboard.readText();
            const ta = textareaRef.current;
            if (ta) {
              const start = ta.selectionStart;
              const end = ta.selectionEnd;
              const before = value.substring(0, start);
              const after = value.substring(end);
              onChange(before + text + after);
              // Move cursor after pasted text
              requestAnimationFrame(() => {
                ta.focus();
                const newPos = start + text.length;
                ta.setSelectionRange(newPos, newPos);
              });
            }
          } catch {
            // Clipboard read may be denied — fall back to execCommand
            document.execCommand('paste');
          }
        },
      },
      {
        label: 'Select All',
        action: () => {
          const ta = textareaRef.current;
          if (ta) {
            ta.focus();
            ta.setSelectionRange(0, value.length);
          }
        },
      },
    ];

    // Add "Paste as Confluence" if the callback is provided (only in markdown mode)
    if (onPasteAsConfluence) {
      items.push(
        { separator: true },
        {
          label: 'Paste as Confluence',
          action: () => {
            onPasteAsConfluence();
          },
        },
      );
    }

    return items;
  }, [value, onChange, onPasteAsConfluence, contextMenu]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;

    // Ctrl+S / Cmd+S - Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave?.();
    }

    // Escape - Close context menu or blur editor
    if (e.key === 'Escape') {
      if (contextMenu) {
        setContextMenu(null);
      } else {
        textarea.blur();
      }
    }
  }, [onSave, contextMenu]);

  return (
    <div
      className={`syntax-editor${isDragOver ? ' drag-over' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        ref={lineNumbersRef}
        className="line-numbers"
        aria-hidden="true"
      >
        {lineNumbers.map(({ num, hasError, hasWarning }) => (
          <div
            key={num}
            className={`line-number ${hasError ? 'line-error' : hasWarning ? 'line-warning' : ''}`}
          >
            {num}
          </div>
        ))}
      </div>
      <div className="syntax-editor-content">
        <pre
          ref={highlightRef}
          className={`syntax-highlight ${language}`}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
        />
        <textarea
          ref={textareaRef}
          className="syntax-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          onPaste={handleImagePaste}
          onContextMenu={handleContextMenu}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={language === 'markdown'}
        />
      </div>

      {/* Drop zone overlay */}
      {isDragOver && (
        <div className="editor-drop-zone" aria-hidden="true">
          <div className="editor-drop-zone-content">
            <span className="editor-drop-zone-icon">{dragIsTextFile ? '\u{1F4C4}' : '\u{1F5BC}'}</span>
            <span className={dragIsTextFile ? 'editor-drop-zone-text-file' : 'editor-drop-zone-text'}>
              {dragIsTextFile ? 'Drop file to open' : 'Drop images here'}
            </span>
          </div>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
});

SyntaxEditor.displayName = 'SyntaxEditor';
