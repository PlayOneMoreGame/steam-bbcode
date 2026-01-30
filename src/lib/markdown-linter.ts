// Markdown linter
// Checks for common issues and Steam-incompatible patterns

export interface LintMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
}

export interface MarkdownLintResult {
  errors: LintMessage[];
  warnings: LintMessage[];
  info: LintMessage[];
  errorLines: Set<number>;
  warningLines: Set<number>;
}

/**
 * Get line number for a character position
 */
function getLineNumber(text: string, position: number): number {
  const upToPosition = text.slice(0, position);
  return (upToPosition.match(/\n/g) || []).length + 1;
}

/**
 * Lint Markdown for issues
 */
export function lintMarkdown(markdown: string): MarkdownLintResult {
  const errors: LintMessage[] = [];
  const warnings: LintMessage[] = [];
  const info: LintMessage[] = [];
  const errorLines = new Set<number>();
  const warningLines = new Set<number>();

  // Check for unclosed formatting
  checkUnclosedFormatting(markdown, errors, errorLines);

  // Check for whitespace in formatting tags
  checkWhitespaceInFormatting(markdown, warnings, warningLines);

  // Check for broken links
  checkBrokenLinks(markdown, warnings, warningLines);

  // Check for Confluence-specific syntax that won't convert
  checkConfluenceSyntax(markdown, warnings, warningLines);

  // Check for inline code (will become bold in Steam)
  checkInlineCode(markdown, info, warningLines);

  // Check for nested lists (fragile in Steam)
  checkNestedLists(markdown, warnings, warningLines);

  // Check for tables (limited Steam support)
  checkTables(markdown, info, warningLines);

  // Check for images
  checkImages(markdown, info, warningLines);

  return { errors, warnings, info, errorLines, warningLines };
}

function checkUnclosedFormatting(text: string, errors: LintMessage[], errorLines: Set<number>): void {
  const lines = text.split('\n');
  
  // Check each line for unmatched backticks (skip code blocks)
  let inCodeBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    
    if (inCodeBlock) continue;
    
    // Check for unmatched inline code backticks
    const backticks = (line.match(/`/g) || []).length;
    if (backticks % 2 !== 0) {
      errors.push({
        type: 'error',
        message: 'Unclosed inline code',
        line: i + 1,
      });
      errorLines.add(i + 1);
    }
  }

  // Check for unmatched bold markers
  const boldDouble = (text.match(/\*\*/g) || []).length;
  if (boldDouble % 2 !== 0) {
    // Find the line with the issue
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const matches = (lines[i].match(/\*\*/g) || []).length;
      count += matches;
      if (count % 2 !== 0 && i === lines.length - 1) {
        errors.push({
          type: 'error',
          message: 'Unmatched ** (bold) marker',
          line: i + 1,
        });
        errorLines.add(i + 1);
        break;
      }
    }
  }

  // Check for unmatched strikethrough
  const strike = (text.match(/~~/g) || []).length;
  if (strike % 2 !== 0) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('~~')) {
        const matches = (lines[i].match(/~~/g) || []).length;
        if (matches % 2 !== 0) {
          errors.push({
            type: 'error',
            message: 'Unmatched ~~ (strikethrough) marker',
            line: i + 1,
          });
          errorLines.add(i + 1);
          break;
        }
      }
    }
  }

  // Check for unclosed code blocks
  const codeBlocks = (text.match(/```/g) || []).length;
  if (codeBlocks % 2 !== 0) {
    // Find last code block opener
    let lastOpener = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('```')) {
        lastOpener = i + 1;
      }
    }
    errors.push({
      type: 'error',
      message: 'Unclosed code block (```)',
      line: lastOpener,
    });
    errorLines.add(lastOpener);
  }
}

function checkWhitespaceInFormatting(text: string, warnings: LintMessage[], warningLines: Set<number>): void {
  const lines = text.split('\n');
  let inCodeBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    
    if (inCodeBlock) continue;
    
    // Check for space after opening bold: ** text**
    if (/\*\*\s+[^*]/.test(line) && /\*\*[^*]+\*\*/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Space after ** may prevent bold formatting',
        line: i + 1,
      });
      warningLines.add(i + 1);
    }
    
    // Check for space before closing bold: **text **
    if (/[^*]\s+\*\*/.test(line) && /\*\*[^*]+\*\*/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Space before ** may prevent bold formatting',
        line: i + 1,
      });
      warningLines.add(i + 1);
    }
    
    // Check for space after opening strikethrough: ~~ text~~
    if (/~~\s+[^~]/.test(line) && /~~[^~]+~~/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Space after ~~ may prevent strikethrough formatting',
        line: i + 1,
      });
      warningLines.add(i + 1);
    }
    
    // Check for space before closing strikethrough: ~~text ~~
    if (/[^~]\s+~~/.test(line) && /~~[^~]+~~/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Space before ~~ may prevent strikethrough formatting',
        line: i + 1,
      });
      warningLines.add(i + 1);
    }
    
    // Check for header without space: #Header
    if (/^#{1,6}[^ #\n]/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Missing space after # in header',
        line: i + 1,
      });
      warningLines.add(i + 1);
    }
    
    // Check for list item without space: -Item or *Item (but not **bold**)
    if (/^[-*+][^ *\n]/.test(line) && !line.startsWith('**')) {
      warnings.push({
        type: 'warning',
        message: 'Missing space after list marker (- or *)',
        line: i + 1,
      });
      warningLines.add(i + 1);
    }
  }
}

function checkBrokenLinks(text: string, warnings: LintMessage[], warningLines: Set<number>): void {
  // Check for malformed links - space between ] and (
  const brokenLinkRegex = /\[([^\]]*)\]\s+\(/g;
  let match;
  while ((match = brokenLinkRegex.exec(text)) !== null) {
    const line = getLineNumber(text, match.index);
    warnings.push({
      type: 'warning',
      message: 'Possible broken link: space between ] and (',
      line,
    });
    warningLines.add(line);
  }

  // Check for empty link text
  const emptyTextRegex = /\[\]\([^)]+\)/g;
  while ((match = emptyTextRegex.exec(text)) !== null) {
    const line = getLineNumber(text, match.index);
    warnings.push({
      type: 'warning',
      message: 'Link with empty text',
      line,
    });
    warningLines.add(line);
  }

  // Check for empty link URL
  const emptyUrlRegex = /\[[^\]]+\]\(\s*\)/g;
  while ((match = emptyUrlRegex.exec(text)) !== null) {
    const line = getLineNumber(text, match.index);
    warnings.push({
      type: 'warning',
      message: 'Link with empty URL',
      line,
    });
    warningLines.add(line);
  }
}

function checkConfluenceSyntax(text: string, warnings: LintMessage[], warningLines: Set<number>): void {
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Confluence macros
    if (/\{[a-z]+(\:[^\}]*)?\}/i.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Confluence macro detected - needs manual conversion',
        line: i + 1,
      });
      warningLines.add(i + 1);
    }

    // Confluence user mentions
    if (/\[~[^\]]+\]/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Confluence user mention detected',
        line: i + 1,
      });
      warningLines.add(i + 1);
    }

    // Confluence status macros
    if (/\{status[^\}]*\}/i.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Confluence status macro detected',
        line: i + 1,
      });
      warningLines.add(i + 1);
    }
  }
}

function checkInlineCode(text: string, info: LintMessage[], warningLines: Set<number>): void {
  const inlineCodeRegex = /`[^`\n]+`/g;
  let count = 0;
  let firstLine: number | undefined;
  let match;
  
  while ((match = inlineCodeRegex.exec(text)) !== null) {
    if (count === 0) {
      firstLine = getLineNumber(text, match.index);
    }
    count++;
  }
  
  if (count > 0 && firstLine) {
    info.push({
      type: 'info',
      message: `${count} inline code span(s) will convert to [b]old in Steam`,
      line: firstLine,
    });
    warningLines.add(firstLine);
  }
}

function checkNestedLists(text: string, warnings: LintMessage[], warningLines: Set<number>): void {
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for indented list items (nested lists)
    if (/^[ \t]+[-*+]\s/.test(line) || /^[ \t]+\d+\.\s/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Nested list detected - Steam has fragile nested list support',
        line: i + 1,
      });
      warningLines.add(i + 1);
      break; // Only warn once
    }
  }
}

function checkTables(text: string, info: LintMessage[], warningLines: Set<number>): void {
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    // Markdown table separator line
    if (/^\|[-:]+\|/.test(lines[i])) {
      info.push({
        type: 'info',
        message: 'Markdown table detected - conversion may need adjustment',
        line: i + 1,
      });
      warningLines.add(i + 1);
      break; // Only warn once
    }
  }
}

function checkImages(text: string, info: LintMessage[], warningLines: Set<number>): void {
  const imgRegex = /!\[[^\]]*\]\([^)]+\)/g;
  let count = 0;
  let firstLine: number | undefined;
  let match;
  
  while ((match = imgRegex.exec(text)) !== null) {
    if (count === 0) {
      firstLine = getLineNumber(text, match.index);
    }
    count++;
  }
  
  if (count > 0 && firstLine) {
    info.push({
      type: 'info',
      message: `${count} image(s) - for Guides, upload and use [previewimg]`,
      line: firstLine,
    });
    warningLines.add(firstLine);
  }
}
