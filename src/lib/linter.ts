// BBCode linter for Steam
// Catches structural errors, common mistakes, and context-specific issues

import { TAG_SUPPORT, CHAR_LIMITS, type SteamContext } from './contexts';

export interface LintMessage {
  type: 'error' | 'warning';
  message: string;
  line?: number;
}

export interface LintResult {
  errors: LintMessage[];
  warnings: LintMessage[];
  errorLines: Set<number>;
  warningLines: Set<number>;
}

/**
 * Valid BBCode tags for Steam
 */
const VALID_TAGS = new Set([
  'h1', 'h2', 'h3',
  'b', 'i', 'u', 'strike',
  'list', 'olist',
  'table', 'tr', 'td', 'th',
  'img', 'url',
  'code', 'quote', 'spoiler',
  'hr', 'video', 'previewyoutube', 'previewimg',
  'noparse',
]);

/**
 * Tags that require content between open and close
 */
const CONTENT_TAGS = new Set(['b', 'i', 'u', 'strike', 'url', 'h1', 'h2', 'h3']);

/**
 * Lint BBCode for structural and context-specific issues
 */
export function lintBBCode(bbcode: string, context: SteamContext): LintResult {
  const errors: LintMessage[] = [];
  const warnings: LintMessage[] = [];
  const errorLines = new Set<number>();
  const warningLines = new Set<number>();
  const support = TAG_SUPPORT[context];

  // Check for unknown/invalid tags
  checkUnknownTags(bbcode, errors, errorLines);

  // Check for HTML tags (common mistake)
  checkHtmlTags(bbcode, errors, errorLines);

  // Check for Markdown syntax (common mistake)
  checkMarkdownSyntax(bbcode, warnings, warningLines);

  // Check for unclosed/mismatched tags
  checkTagMatching(bbcode, errors, errorLines);

  // Check for incorrect tag nesting order
  checkTagNesting(bbcode, errors, errorLines);

  // Check for empty tags
  checkEmptyTags(bbcode, warnings, warningLines);

  // Check for unsupported tags in context
  checkTagSupport(bbcode, context, support, errors, warnings, errorLines, warningLines);

  // Check for malformed list items
  checkListItems(bbcode, errors, errorLines);

  // Check for list whitespace issues
checkListWhitespace(bbcode, warnings, warningLines);
  // Check for malformed URLs
  checkUrls(bbcode, warnings, warningLines);

  // Check character limits
  checkCharacterLimits(bbcode, context, errors, warnings);

  return { errors, warnings, errorLines, warningLines };
}

/**
 * Get line number for a character position
 */
function getLineNumber(text: string, position: number): number {
  const upToPosition = text.slice(0, position);
  return (upToPosition.match(/\n/g) || []).length + 1;
}

/**
 * Check for unknown or invalid BBCode tags
 */
function checkUnknownTags(
  bbcode: string, 
  errors: LintMessage[], 
  errorLines: Set<number>
): void {
  const tagPattern = /\[(\/?)([\w]+)(?:=[^\]]*)?\]/gi;
  const seen = new Set<string>();
  
  let match;
  while ((match = tagPattern.exec(bbcode)) !== null) {
    const tagName = match[2].toLowerCase();
    
    // Skip valid tags and list item marker [*]
    if (VALID_TAGS.has(tagName) || tagName === '*') continue;
    
    // Only report each unknown tag once
    if (seen.has(tagName)) continue;
    seen.add(tagName);
    
    const line = getLineNumber(bbcode, match.index);
    errors.push({
      type: 'error',
      message: `Unknown tag [${tagName}]`,
      line,
    });
    errorLines.add(line);
  }
}

/**
 * Check for HTML tags (common mistake)
 */
function checkHtmlTags(
  bbcode: string, 
  errors: LintMessage[], 
  errorLines: Set<number>
): void {
  const htmlPattern = /<\/?(\w+)(?:\s[^>]*)?\/?>/gi;
  const seen = new Set<string>();
  
  let match;
  while ((match = htmlPattern.exec(bbcode)) !== null) {
    const tagName = match[1].toLowerCase();
    
    if (seen.has(tagName)) continue;
    seen.add(tagName);
    
    const line = getLineNumber(bbcode, match.index);
    
    // Suggest BBCode equivalent
    const bbcodeEquiv: Record<string, string> = {
      'b': '[b]',
      'strong': '[b]',
      'i': '[i]',
      'em': '[i]',
      'u': '[u]',
      's': '[strike]',
      'del': '[strike]',
      'br': '(line break)',
      'p': '(blank line)',
      'a': '[url]',
      'img': '[img]',
      'code': '[code]',
      'pre': '[code]',
      'blockquote': '[quote]',
      'h1': '[h1]',
      'h2': '[h2]',
      'h3': '[h3]',
      'ul': '[list]',
      'ol': '[olist]',
      'li': '[*]',
      'hr': '[hr][/hr]',
      'table': '[table]',
      'tr': '[tr]',
      'td': '[td]',
      'th': '[th]',
    };
    
    const suggestion = bbcodeEquiv[tagName] 
      ? ` - use ${bbcodeEquiv[tagName]} instead`
      : '';
    
    errors.push({
      type: 'error',
      message: `HTML tag <${tagName}> not supported${suggestion}`,
      line,
    });
    errorLines.add(line);
  }
}

/**
 * Check for Markdown syntax (common mistake)
 */
function checkMarkdownSyntax(
  bbcode: string, 
  warnings: LintMessage[], 
  warningLines: Set<number>
): void {
  const lines = bbcode.split('\n');
  const patterns: Array<{ regex: RegExp; msg: string; suggestion: string }> = [
    { regex: /^#{1,3}\s/, msg: 'Markdown header', suggestion: 'use [h1], [h2], [h3]' },
    { regex: /\*\*[^*]+\*\*/, msg: 'Markdown bold **', suggestion: 'use [b]...[/b]' },
    { regex: /(?<!\*)\*[^*]+\*(?!\*)/, msg: 'Markdown italic *', suggestion: 'use [i]...[/i]' },
    { regex: /~~[^~]+~~/, msg: 'Markdown strikethrough ~~', suggestion: 'use [strike]...[/strike]' },
    { regex: /`[^`]+`/, msg: 'Markdown code `', suggestion: 'use [code]...[/code] (block only)' },
    { regex: /^\s*[-*+]\s/, msg: 'Markdown list -', suggestion: 'use [list][*]...[/list]' },
    { regex: /^\s*\d+\.\s/, msg: 'Markdown numbered list', suggestion: 'use [olist][*]...[/olist]' },
    { regex: /\[([^\]]+)\]\([^)]+\)/, msg: 'Markdown link []', suggestion: 'use [url=...]...[/url]' },
    { regex: /!\[[^\]]*\]\([^)]+\)/, msg: 'Markdown image ![]', suggestion: 'use [img]...[/img]' },
  ];
  
  const seen = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const { regex, msg, suggestion } of patterns) {
      if (regex.test(line) && !seen.has(msg)) {
        seen.add(msg);
        warnings.push({
          type: 'warning',
          message: `${msg} detected - ${suggestion}`,
          line: i + 1,
        });
        warningLines.add(i + 1);
      }
    }
  }
}

/**
 * Check for mismatched or unclosed tags
 */
function checkTagMatching(
  bbcode: string, 
  errors: LintMessage[], 
  errorLines: Set<number>
): void {
  const tagStack: { tag: string; line: number }[] = [];
  const tagRegex = /\[(\/?)(h[123]|list|olist|table|tr|td|th|img|video|spoiler|code|quote|b|i|u|strike|url|hr|previewyoutube|previewimg|noparse)(?:=[^\]]*)?\]/gi;

  let match;
  while ((match = tagRegex.exec(bbcode)) !== null) {
    const isClosing = match[1] === '/';
    const tagName = match[2].toLowerCase();
    const line = getLineNumber(bbcode, match.index);

    if (isClosing) {
      if (tagStack.length === 0) {
        errors.push({
          type: 'error',
          message: `Unexpected closing [/${tagName}] with no opening tag`,
          line,
        });
        errorLines.add(line);
      } else {
        const expected = tagStack.pop()!;
        if (expected.tag !== tagName) {
          errors.push({
            type: 'error',
            message: `Mismatched tags: expected [/${expected.tag}] (line ${expected.line}), found [/${tagName}]`,
            line,
          });
          errorLines.add(line);
          errorLines.add(expected.line);
        }
      }
    } else {
      tagStack.push({ tag: tagName, line });
    }
  }

  // Report unclosed tags
  tagStack.forEach(({ tag, line }) => {
    errors.push({
      type: 'error',
      message: `Unclosed [${tag}] tag`,
      line,
    });
    errorLines.add(line);
  });
}

/**
 * Check for incorrect tag nesting (e.g., [b][i]...[/b][/i])
 */
function checkTagNesting(
  bbcode: string, 
  errors: LintMessage[], 
  errorLines: Set<number>
): void {
  // This is already partially caught by checkTagMatching
  // Additional check for overlapping tags that might technically parse
  // but produce unexpected results
  
  const formattingTags = ['b', 'i', 'u', 'strike'];
  const pattern = formattingTags.map(t => `\\[${t}\\]|\\[/${t}\\]`).join('|');
  const regex = new RegExp(pattern, 'gi');
  
  const stack: { tag: string; pos: number }[] = [];
  let match;
  
  while ((match = regex.exec(bbcode)) !== null) {
    const isClosing = match[0].includes('/');
    const tagName = match[0].replace(/[\[\]\/]/g, '').toLowerCase();
    
    if (isClosing) {
      // Check if we're closing a different tag than the most recent
      if (stack.length > 0 && stack[stack.length - 1].tag !== tagName) {
        // Find if this tag is somewhere in the stack
        const idx = stack.findIndex(s => s.tag === tagName);
        if (idx !== -1 && idx < stack.length - 1) {
          const line = getLineNumber(bbcode, match.index);
          errors.push({
            type: 'error',
            message: `Overlapping tags: [${tagName}] closes before [${stack[stack.length - 1].tag}]`,
            line,
          });
          errorLines.add(line);
        }
      }
      // Remove from stack
      const idx = stack.findIndex(s => s.tag === tagName);
      if (idx !== -1) stack.splice(idx, 1);
    } else {
      stack.push({ tag: tagName, pos: match.index });
    }
  }
}

/**
 * Check for empty tags like [b][/b]
 */
function checkEmptyTags(
  bbcode: string, 
  warnings: LintMessage[], 
  warningLines: Set<number>
): void {
  for (const tag of CONTENT_TAGS) {
    const pattern = new RegExp(`\\[${tag}(?:=[^\\]]*)?\\]\\s*\\[/${tag}\\]`, 'gi');
    let match;
    
    while ((match = pattern.exec(bbcode)) !== null) {
      const line = getLineNumber(bbcode, match.index);
      warnings.push({
        type: 'warning',
        message: `Empty [${tag}][/${tag}] tag - will render incorrectly`,
        line,
      });
      warningLines.add(line);
    }
  }
}

/**
 * Check for tags not supported in current context
 */
function checkTagSupport(
  bbcode: string,
  context: SteamContext,
  support: typeof TAG_SUPPORT[SteamContext],
  errors: LintMessage[],
  warnings: LintMessage[],
  errorLines: Set<number>,
  warningLines: Set<number>
): void {
  const tagRegex = /\[(h[123]|list|olist|table|img|video|spoiler|code|quote|previewyoutube|previewimg)\]/gi;
  const seen = new Set<string>();
  
  let match;
  while ((match = tagRegex.exec(bbcode)) !== null) {
    const tagName = match[1].toLowerCase();
    
    if (seen.has(tagName)) continue;
    seen.add(tagName);
    
    const checkTag = tagName === 'previewyoutube' ? 'video' : tagName as keyof typeof support;
    const line = getLineNumber(bbcode, match.index);
    
    if (support[checkTag] === false) {
      errors.push({
        type: 'error',
        message: `[${tagName}] not supported in ${context}`,
        line,
      });
      errorLines.add(line);
    } else if (support[checkTag] === 'limited') {
      warnings.push({
        type: 'warning',
        message: `[${tagName}] has limited support in ${context}`,
        line,
      });
      warningLines.add(line);
    }
  }
  
  // Special check: [img] in guides should suggest [previewimg]
  if (context === 'guides' && bbcode.includes('[img]')) {
    const imgMatch = bbcode.match(/\[img\]/i);
    if (imgMatch) {
      const line = getLineNumber(bbcode, bbcode.indexOf('[img]'));
      warnings.push({
        type: 'warning',
        message: 'For guides, upload images and use [previewimg] instead of [img]',
        line,
      });
      warningLines.add(line);
    }
  }
}

/**
 * Check for malformed list items
 */
function checkListItems(
  bbcode: string, 
  errors: LintMessage[], 
  errorLines: Set<number>
): void {
  const malformedPattern = /\[([.\-+•·])\]/g;
  
  let match;
  while ((match = malformedPattern.exec(bbcode)) !== null) {
    const line = getLineNumber(bbcode, match.index);
    errors.push({
      type: 'error',
      message: `Invalid list marker [${match[1]}] - use [*] instead`,
      line,
    });
    errorLines.add(line);
  }
  
  // Check for [*] outside of [list] or [olist]
  const listContent = bbcode.replace(/\[(list|olist)\][\s\S]*?\[\/(list|olist)\]/gi, '');
  const strayItem = listContent.match(/\[\*\]/);
  if (strayItem) {
    const line = getLineNumber(bbcode, bbcode.indexOf(strayItem[0]));
    errors.push({
      type: 'error',
      message: '[*] found outside of [list] or [olist]',
      line,
    });
    errorLines.add(line);
  }
}

/**
 * Check for whitespace issues in lists
 */
function checkListWhitespace(
  bbcode: string, 
  warnings: LintMessage[],
  warningLines: Set<number>
): void {
  // Blank lines in lists
  const pattern = /\[list\][\s\S]*?\n\n[\s\S]*?\[\/list\]/gi;
  let match;
  
  while ((match = pattern.exec(bbcode)) !== null) {
    const blankLinePos = match[0].indexOf('\n\n');
    const line = getLineNumber(bbcode, match.index + blankLinePos);
    warnings.push({
      type: 'warning',
      message: 'Blank line inside [list] may break formatting',
      line,
    });
    warningLines.add(line);
  }
}

/**
 * Check for malformed URLs
 */
function checkUrls(
  bbcode: string, 
  warnings: LintMessage[], 
  warningLines: Set<number>
): void {
  // Empty URL
  const emptyUrl = /\[url=?\]\s*\[\/url\]/gi;
  let match;
  
  while ((match = emptyUrl.exec(bbcode)) !== null) {
    const line = getLineNumber(bbcode, match.index);
    warnings.push({
      type: 'warning',
      message: 'Empty [url] tag',
      line,
    });
    warningLines.add(line);
  }
  
  // URL without protocol
  const noProtocol = /\[url=(?!https?:\/\/|\/\/)([^\]]+)\]/gi;
  while ((match = noProtocol.exec(bbcode)) !== null) {
    const line = getLineNumber(bbcode, match.index);
    warnings.push({
      type: 'warning',
      message: 'URL may need https:// prefix',
      line,
    });
    warningLines.add(line);
  }
}

/**
 * Check character limits for context
 */
function checkCharacterLimits(
  bbcode: string,
  context: SteamContext,
  errors: LintMessage[],
  warnings: LintMessage[]
): void {
  const charCount = bbcode.length;
  const limit = CHAR_LIMITS[context];

  if (charCount > limit) {
    errors.push({
      type: 'error',
      message: `Exceeds ${context} limit: ${charCount.toLocaleString()} / ${limit.toLocaleString()}`,
    });
  } else if (charCount > limit * 0.9) {
    warnings.push({
      type: 'warning',
      message: `Approaching limit: ${charCount.toLocaleString()} / ${limit.toLocaleString()} (${Math.round(charCount / limit * 100)}%)`,
    });
  }
}
