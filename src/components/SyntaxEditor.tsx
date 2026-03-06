import { useRef, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef, useState } from 'react';
import {
  tokenizeMarkdown,
  tokenizeBBCode,
  applyHighlighting,
  type HighlightToken
} from '@/lib/highlighter';
import { detectBlacklistTerms } from '@/lib/blacklist-detector';

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
  blacklistTerms = [],
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const pastedImageCountRef = useRef(0);

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

  // Tokenize and highlight (including blacklist terms)
  const highlightedHtml = useMemo(() => {
    const tokens: HighlightToken[] = language === 'markdown'
      ? tokenizeMarkdown(value)
      : tokenizeBBCode(value);

    // Add blacklist term tokens
    if (blacklistTerms.length > 0) {
      const matches = detectBlacklistTerms(value, blacklistTerms);
      const lines = value.split('\n');
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

    return applyHighlighting(value, tokens);
  }, [value, language, blacklistTerms]);

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

  // Drag-and-drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
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
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      processImageFile(file);
    }
  }, [processImageFile]);

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

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;

    // Ctrl+S / Cmd+S - Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave?.();
    }

    // Escape - Blur editor
    if (e.key === 'Escape') {
      textarea.blur();
    }
  }, [onSave]);

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
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={language === 'markdown'}
        />
      </div>

      {/* Drop zone overlay */}
      {isDragOver && (
        <div className="editor-drop-zone" aria-hidden="true">
          <div className="editor-drop-zone-content">
            <span className="editor-drop-zone-icon">&#x1F5BC;</span>
            <span className="editor-drop-zone-text">Drop images here</span>
          </div>
        </div>
      )}
    </div>
  );
});

SyntaxEditor.displayName = 'SyntaxEditor';
