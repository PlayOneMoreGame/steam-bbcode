import { useRef, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { 
  tokenizeMarkdown, 
  tokenizeBBCode, 
  applyHighlighting,
  type HighlightToken 
} from '@/lib/highlighter';

export interface SyntaxEditorHandle {
  scrollToLine: (line: number, column?: number, length?: number) => void;
  selectRange: (start: number, end: number) => void;
  focus: () => void;
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
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

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

  // Tokenize and highlight
  const highlightedHtml = useMemo(() => {
    const tokens: HighlightToken[] = language === 'markdown' 
      ? tokenizeMarkdown(value)
      : tokenizeBBCode(value);
    return applyHighlighting(value, tokens);
  }, [value, language]);

  // Sync on value change
  useEffect(() => {
    syncScroll();
  }, [value, syncScroll]);

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
    <div className="syntax-editor">
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
          onPaste={onPaste}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={language === 'markdown'}
        />
      </div>
    </div>
  );
});

SyntaxEditor.displayName = 'SyntaxEditor';
