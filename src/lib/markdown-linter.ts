// Markdown linter
// Checks for common issues and Steam-incompatible patterns

import { getLineNumber } from './utils';
import { detectBlacklistTerms } from './blacklist-detector';

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

export interface MarkdownLintOptions {
  blacklist?: string[];
}

/**
 * Lint Markdown for issues
 */
export function lintMarkdown(markdown: string, options?: MarkdownLintOptions): MarkdownLintResult {
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

  // Check for blacklisted terms
  if (options?.blacklist && options.blacklist.length > 0) {
    checkBlacklistTerms(markdown, options.blacklist, warnings, warningLines);
  }

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
        message: 'Unclosed inline code — missing a closing backtick (`)',
        line: i + 1,
        help: 'Each backtick (`) needs a matching closing backtick on the same line. Add the missing one, or remove the extra backtick.',
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
          message: 'Unmatched ** (bold) — missing a closing **',
          line: i + 1,
          help: 'Bold text needs a ** at the start and end: **bold text**. It looks like one of the pairs is missing.',
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
            message: 'Unmatched ~~ (strikethrough) — missing a closing ~~',
            line: i + 1,
            help: 'Strikethrough text needs ~~ at the start and end: ~~deleted text~~. It looks like one of the pairs is missing.',
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
      message: 'Unclosed code block — add ``` on a new line to close it',
      line: lastOpener,
      help: 'Code blocks start and end with ``` on their own line. It looks like the closing ``` is missing. Add one on a new line after your code.',
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
          message: 'Space after ** — this may not render as bold',
          line: i + 1,
          help: 'Bold markers need to be right next to the text: **bold**, not ** bold**. Remove the space after the opening ** to fix it.',
        });
        warningLines.add(i + 1);
        continue;
      }
      
      // Check for space before closing: **text **
      const matchEnd = line.match(/\*\*([^*]+)( +)\*\*/);
      if (matchEnd && matchEnd[2]) {
        warnings.push({
          type: 'warning',
          message: 'Space before ** — this may not render as bold',
          line: i + 1,
          help: 'Bold markers need to be right next to the text: **bold**, not **bold **. Remove the space before the closing ** to fix it.',
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
          message: 'Space after ~~ — this may not render as strikethrough',
          line: i + 1,
          help: 'Strikethrough markers need to be right next to the text: ~~deleted~~, not ~~ deleted~~. Remove the space after the opening ~~ to fix it.',
        });
        warningLines.add(i + 1);
        continue;
      }
      
      const matchEnd2 = line.match(/~~([^~]+)( +)~~/);
      if (matchEnd2 && matchEnd2[2]) {
        warnings.push({
          type: 'warning',
          message: 'Space before ~~ — this may not render as strikethrough',
          line: i + 1,
          help: 'Strikethrough markers need to be right next to the text: ~~deleted~~, not ~~deleted ~~. Remove the space before the closing ~~ to fix it.',
        });
        warningLines.add(i + 1);
        continue;
      }
    }
    
    // Check for header without space: #Header (but not # alone)
    if (/^#{1,6}[^\s#]/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Missing space after # — this won\'t be treated as a heading',
        line: i + 1,
        help: 'Headings need a space between the # and the text: "# Heading", not "#Heading". Without the space, it will show as plain text.',
      });
      warningLines.add(i + 1);
    }
    
    // Check for bullet list without space: -Item (not --, not -1, not -**)
    // Must be: dash/plus at start, immediately followed by a letter
    if (/^[-+]\w/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Missing space after list marker — this won\'t be treated as a list item',
        line: i + 1,
        help: 'List items need a space after the dash: "- Item", not "-Item". Without the space, it will show as plain text instead of a bullet point.',
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
          message: content ? `[${content}] isn't a valid tag — this will show as plain text` : `Empty brackets [] — this will show as plain text`,
          line: i + 1,
          column: match.index + 1,  // 1-indexed
          length: match[0].length,
          start,
          end: start + match[0].length,
          help: 'This bracket pattern won\'t do anything in Markdown or BBCode and will appear as-is in the output. For list items, use "- " (dash then space). Otherwise, you can remove or rewrite this.',
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
      message: 'This link looks broken — there\'s a space between ] and (',
      line,
      help: 'Markdown links can\'t have a space between the text and the URL: [text](url) works, but [text] (url) doesn\'t. Remove the space to fix it.',
    });
    warningLines.add(line);
  }

  // Check for empty link text
  const emptyTextRegex = /\[\]\([^)]+\)/g;
  while ((match = emptyTextRegex.exec(text)) !== null) {
    const line = getLineNumber(text, match.index);
    warnings.push({
      type: 'warning',
      message: 'This link has no display text — it will be invisible',
      line,
      help: 'Links need text between the brackets so readers can see and click them: [click here](https://example.com).',
    });
    warningLines.add(line);
  }

  // Check for empty link URL
  const emptyUrlRegex = /\[[^\]]+\]\(\s*\)/g;
  while ((match = emptyUrlRegex.exec(text)) !== null) {
    const line = getLineNumber(text, match.index);
    warnings.push({
      type: 'warning',
      message: 'This link is missing a URL — it won\'t go anywhere',
      line,
      help: 'Links need a web address inside the parentheses: [link text](https://example.com). Add the URL to fix it.',
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
        message: 'Confluence element found — this will be converted to plain text',
        line: i + 1,
        help: 'This looks like a Confluence macro (like {code} or {panel}). It doesn\'t have a Steam equivalent, so the content inside will be kept as plain text. For better results, paste the Confluence page source (View Storage Format) instead.',
      });
      warningLines.add(i + 1);
    }

    // Confluence user mentions
    if (/\[~[^\]]+\]/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Confluence @mention found — these don\'t work on Steam',
        line: i + 1,
        help: 'Confluence mentions like [~username] won\'t carry over to Steam. Replace them with the person\'s name or remove the mention.',
      });
      warningLines.add(i + 1);
    }

    // Confluence status macros
    if (/\{status[^\}]*\}/i.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Confluence status badge found — these don\'t work on Steam',
        line: i + 1,
        help: 'Confluence status badges aren\'t supported on Steam. You can replace them with plain text like [b]DONE[/b] or just remove them.',
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
      message: `${count} inline code snippet${count === 1 ? '' : 's'} will appear as bold on Steam`,
      line: firstLine,
      help: 'Steam doesn\'t have inline code formatting, so the converter uses [b]bold[/b] as the closest alternative. The text will be preserved, just shown in bold instead of a code style.',
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
        message: 'Nested list found — these can look inconsistent on Steam',
        line: i + 1,
        help: 'Steam does support nested lists, but the rendering can be unpredictable. Consider flattening your list or using indented text instead. Check the preview to see how it looks.',
      });
      warningLines.add(i + 1);
      break; // Only warn once
    }
    
    // Check for excessive whitespace after list marker (e.g., "-  item" or "-   item")
    if (/^[-*+][ \t]{2,}\S/.test(line)) {
      warnings.push({
        type: 'warning',
        message: 'Extra spaces after list marker — this may cause formatting issues',
        line: i + 1,
        help: 'Use just one space after the dash: "- Item". Extra spaces can make the item look like a nested list or a code block, which may not render as expected on Steam.',
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
        message: 'Table found — check the preview to make sure it looks right',
        line: i + 1,
        help: 'This table will be converted to Steam\'s [table] format, but Steam tables are pretty basic. Check the preview to make sure the columns and alignment look acceptable.',
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
      message: `${count} image${count === 1 ? '' : 's'} found — Guides require uploaded images with [previewimg]`,
      line: firstLine,
      help: 'For Steam Announcements, [img] with a direct URL works fine. For Guides, you\'ll need to upload images through the Steam guide editor and use [previewimg]ID[/previewimg] instead.',
    });
    warningLines.add(firstLine);
  }
}

function checkBlacklistTerms(text: string, blacklist: string[], warnings: LintMessage[], warningLines: Set<number>): void {
  const matches = detectBlacklistTerms(text, blacklist);

  for (const match of matches) {
    warnings.push({
      type: 'warning',
      message: `'${match.term}' may not be appropriate — consider rephrasing`,
      line: match.line,
      column: match.column,
      length: match.length,
      help: 'This term is on your team\'s blacklist. You can edit the blacklist in Settings.',
    });
    warningLines.add(match.line);
  }
}
