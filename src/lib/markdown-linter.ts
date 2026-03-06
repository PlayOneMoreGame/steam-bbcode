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
  help?: string;    // Expandable help text explaining the issue
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
        help: 'Each backtick (`) needs a matching closing backtick on the same line. Add the missing backtick or remove the extra one.',
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
          help: 'Bold text needs matching ** markers: **bold text**. Check that you have an even number of ** pairs.',
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
            help: 'Strikethrough text needs matching ~~ markers: ~~deleted text~~. Check that you have an even number of ~~ pairs.',
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
      help: 'Code blocks need matching ``` on their own line to open and close. Add a closing ``` on a new line after your code.',
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
          help: 'Markdown bold markers must be immediately next to the text: **bold**, not ** bold**. Remove the space after the opening **.',
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
          help: 'Markdown bold markers must be immediately next to the text: **bold**, not **bold **. Remove the space before the closing **.',
        });
        warningLines.add(i + 1);
        continue;
      }
    }
    
    // Same for strikethrough
    const tildePairs = (line.match(/~~/g) || []).length;
    
    if (tildePairs === 2) {
      const match2 = line.match(/~~( +)([^~]+)~~/);
      if (match2 && match2[1]) {
        warnings.push({
          type: 'warning',
          message: 'Space after ~~ may prevent strikethrough formatting',
          line: i + 1,
          help: 'Strikethrough markers must be immediately next to the text: ~~deleted~~, not ~~ deleted~~. Remove the space after the opening ~~.',
        });
        warningLines.add(i + 1);
        continue;
      }
      
      const matchEnd2 = line.match(/~~([^~]+)( +)~~/);
      if (matchEnd2 && matchEnd2[2]) {
        warnings.push({
          type: 'warning',
          message: 'Space before ~~ may prevent strikethrough formatting',
          line: i + 1,
          help: 'Strikethrough markers must be immediately next to the text: ~~deleted~~, not ~~deleted ~~. Remove the space before the closing ~~.',
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
        help: 'Markdown headers need a space after the # symbols: "# Header", not "#Header". Without the space, it will not be treated as a header.',
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
        help: 'List items need a space after the marker: "- Item", not "-Item". Without the space, it will not be treated as a list.',
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
          help: 'This bracket pattern is not valid in Markdown or BBCode and will appear as literal text. If you intended a list item, use "- " (dash space) in Markdown.',
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
      help: 'Markdown links must not have a space between the text and URL parts: [text](url), not [text] (url). Remove the space to fix the link.',
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
      help: 'This link has no display text. Add text between the brackets: [link text](https://example.com).',
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
      help: 'This link has no URL. Add a URL inside the parentheses: [link text](https://example.com).',
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
        help: 'This looks like a Confluence macro. SteamBBEditor can convert Confluence content directly -- paste the page source (View Storage Format) for better results.',
      });
      warningLines.add(i + 1);
    }

    // Confluence user mentions
    if (/\[~[^\]]+\]/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Confluence user mention detected',
        line: i + 1,
        help: 'Confluence user mentions like [~username] have no equivalent in Steam BBCode. Replace with the person\'s display name or remove the mention.',
      });
      warningLines.add(i + 1);
    }

    // Confluence status macros
    if (/\{status[^\}]*\}/i.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Confluence status macro detected',
        line: i + 1,
        help: 'Confluence status macros have no Steam BBCode equivalent. Replace with plain text like [b]STATUS[/b] or remove it.',
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
      help: 'Steam has no inline code formatting. The converter uses [b]bold[/b] as the closest visual approximation for `inline code` spans.',
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
        help: 'Steam BBCode supports nested lists but rendering can be inconsistent. Consider flattening your list or using indented text instead of nested bullets.',
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
        help: 'Use exactly one space after the list marker: "- Item". Extra spaces may cause the item to be interpreted as a nested list or code block.',
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
        help: 'Markdown tables convert to [table] BBCode but Steam table rendering is basic. Check the preview to verify alignment and column widths look acceptable.',
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
      help: 'For Announcements, [img] with a direct URL works. For Guides, you must upload images through the Steam guide editor and use [previewimg]ID[/previewimg] instead.',
    });
    warningLines.add(firstLine);
  }
}
