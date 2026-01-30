// Markdown linter
// Checks for common issues and Steam-incompatible patterns

import { getLineNumber } from './utils';

export interface LintMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;  // 1-indexed column within line
  length?: number;  // Length of problematic text
  start?: number;   // Character offset in text
  end?: number;     // Character offset in text
}

export interface MarkdownLintResult {
  errors: LintMessage[];
  warnings: LintMessage[];
  info: LintMessage[];
  errorLines: Set<number>;
  warningLines: Set<number>;
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

  // Check for invalid bracket patterns like [-], [+], [.]
  checkInvalidBracketPatterns(markdown, errors, errorLines);

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

  // NOTE: Unformatted text check disabled - too noisy for real patch notes
  // which often have description paragraphs without formatting
  // checkUnformattedText(markdown, warnings, warningLines);

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
    
    // Check for ACTUAL malformed bold: ** text** (space right after opening **)
    // Only check lines with exactly one bold span to avoid false positives
    // when multiple bold spans exist (e.g., "**a** and **b**")
    const asteriskPairs = (line.match(/\*\*/g) || []).length;
    
    if (asteriskPairs === 2) {
      // Single bold span - safe to check for internal whitespace
      const match = line.match(/\*\*( +)([^*]+)\*\*/);
      if (match && match[1]) {
        warnings.push({
          type: 'warning',
          message: 'Space after ** may prevent bold formatting',
          line: i + 1,
        });
        warningLines.add(i + 1);
        continue;
      }
      
      // Check for space before closing: **text **
      const matchEnd = line.match(/\*\*([^*]+)( +)\*\*/);
      if (matchEnd && matchEnd[2]) {
        warnings.push({
          type: 'warning',
          message: 'Space before ** may prevent bold formatting',
          line: i + 1,
        });
        warningLines.add(i + 1);
        continue;
      }
    }
    
    // Same for strikethrough
    const tildePairs = (line.match(/~~/g) || []).length;
    
    if (tildePairs === 2) {
      const match = line.match(/~~( +)([^~]+)~~/);
      if (match && match[1]) {
        warnings.push({
          type: 'warning',
          message: 'Space after ~~ may prevent strikethrough formatting',
          line: i + 1,
        });
        warningLines.add(i + 1);
        continue;
      }
      
      const matchEnd = line.match(/~~([^~]+)( +)~~/);
      if (matchEnd && matchEnd[2]) {
        warnings.push({
          type: 'warning',
          message: 'Space before ~~ may prevent strikethrough formatting',
          line: i + 1,
        });
        warningLines.add(i + 1);
        continue;
      }
    }
    
    // Check for header without space: #Header (but not # alone)
    if (/^#{1,6}[^\s#]/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Missing space after # in header',
        line: i + 1,
      });
      warningLines.add(i + 1);
    }
    
    // Check for bullet list without space: -Item (not --, not -1, not -**)
    // Must be: dash/plus at start, immediately followed by a letter
    if (/^[-+]\w/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Missing space after list marker',
        line: i + 1,
      });
      warningLines.add(i + 1);
    }
  }
}

function checkInvalidBracketPatterns(text: string, errors: LintMessage[], errorLines: Set<number>): void {
  const lines = text.split('\n');
  let inCodeBlock = false;
  let charOffset = 0; // Track character offset from start of text
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      charOffset += line.length + 1; // +1 for newline
      continue;
    }
    
    if (inCodeBlock) {
      charOffset += line.length + 1;
      continue;
    }
    
    // Check for invalid bracket patterns like [-], [+], [.], [] that look like failed tags
    const invalidPattern = /\[([.\-+•·]?)\]/g;
    let match;
    
    while ((match = invalidPattern.exec(line)) !== null) {
      const content = match[1];
      // Skip valid markdown link text brackets [text]
      if (match[0] === '[]' || content === '-' || content === '+' || content === '.' || content === '•' || content === '·') {
        const start = charOffset + match.index;
        errors.push({
          type: 'error',
          message: content ? `Invalid pattern [${content}] - not valid Markdown or BBCode` : `Empty brackets [] - not valid Markdown or BBCode`,
          line: i + 1,
          column: match.index + 1,  // 1-indexed
          length: match[0].length,
          start,
          end: start + match[0].length,
        });
        errorLines.add(i + 1);
        break; // Only one error per line
      }
    }
    
    charOffset += line.length + 1; // +1 for newline
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
    
    // Check for excessive whitespace after list marker (e.g., "-  item" or "-   item")
    if (/^[-*+][ \t]{2,}\S/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Extra whitespace after list marker may cause formatting issues',
        line: i + 1,
      });
      warningLines.add(i + 1);
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
