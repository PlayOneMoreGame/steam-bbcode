import { useRef, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { 
  tokenizeMarkdown, 
  tokenizeBBCode, 
  applyHighlighting,
  type HighlightToken 
} from '@/lib/highlighter';

export interface SyntaxEditorHandle {
  scrollToLine: (line: number) => void;
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
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    scrollToLine: (line: number) => {
      const textarea = textareaRef.current;
      const lineNums = lineNumbersRef.current;
      if (!textarea || !lineNums) return;
      
      const lineHeight = 22.1; // 13px * 1.7 - must match CSS
      const scrollTop = (line - 1) * lineHeight - textarea.clientHeight / 2 + lineHeight;
      
      textarea.scrollTop = Math.max(0, scrollTop);
      syncScroll();
    },
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

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

  // Sync scroll positions
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

  // Sync on value change
  useEffect(() => {
    syncScroll();
  }, [value, syncScroll]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    
    // Tab key - insert spaces instead of changing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Insert 2 spaces
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      // Move cursor after the inserted spaces
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
    
    // Ctrl+S / Cmd+S - Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave?.();
    }
    
    // Escape - Blur editor
    if (e.key === 'Escape') {
      textarea.blur();
    }
  }, [value, onChange, onSave]);

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
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={language === 'markdown'}
        />
      </div>
    </div>
  );
});

SyntaxEditor.displayName = 'SyntaxEditor';
