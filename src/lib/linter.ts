// BBCode linter for Steam
// Catches structural errors, common mistakes, and context-specific issues

import { TAG_SUPPORT, CHAR_LIMITS, type SteamContext } from './contexts';
import { getLineNumber, getColumnInLine } from './utils';

export interface LintMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;  // 1-indexed column within line
  length?: number;  // Length of problematic text
  help?: string;    // Expandable help text explaining the issue
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

  // NOTE: Unformatted text check disabled - too noisy for real content
  // checkUnformattedText(bbcode, warnings, warningLines);

  // Check character limits
  checkCharacterLimits(bbcode, context, errors, warnings);

  return { errors, warnings, errorLines, warningLines };
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
      column: getColumnInLine(bbcode, match.index),
      length: match[0].length,
      help: `[${tagName}] is not a valid Steam BBCode tag. Valid tags include: [b], [i], [u], [h1], [h2], [h3], [list], [url], [img], [code], [quote], [spoiler], [table], and more.`,
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
      column: getColumnInLine(bbcode, match.index),
      length: match[0].length,
      help: 'Steam uses BBCode, not HTML. Replace HTML tags with their BBCode equivalents. For example: <b> becomes [b], <a href="..."> becomes [url=...].',
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
          help: 'This looks like Markdown syntax in the BBCode output. If you see this, the converter may not have handled this pattern. You can manually replace it with the suggested BBCode tag.',
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
          help: `Found [/${tagName}] but there is no matching [${tagName}] before it. Every closing tag needs a corresponding opening tag.`,
        });
        errorLines.add(line);
      } else {
        const expected = tagStack.pop()!;
        if (expected.tag !== tagName) {
          errors.push({
            type: 'error',
            message: `Mismatched tags: expected [/${expected.tag}] (line ${expected.line}), found [/${tagName}]`,
            line,
            help: `Tags must be closed in the order they were opened. You opened [${expected.tag}] on line ${expected.line}, so it must be closed before [/${tagName}]. Example: [b][i]text[/i][/b], not [b][i]text[/b][/i].`,
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
      help: `Every opening tag needs a matching closing tag. Add [/${tag}] after your content. Example: [${tag}]text[/${tag}].`,
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
            help: `BBCode tags must be closed in reverse order (last opened = first closed). Example: [b][i]text[/i][/b], not [b][i]text[/b][/i].`,
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
        help: `An empty tag like [${tag}][/${tag}] has no content between the opening and closing tags. Steam may render this as a blank space or not at all. Add content or remove the empty tag.`,
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
        help: `Steam ${context} do not support the [${tagName}] tag. Switch to a different Steam context (e.g., Announcements or Guides) for full tag support, or remove this tag.`,
      });
      errorLines.add(line);
    } else if (support[checkTag] === 'limited') {
      warnings.push({
        type: 'warning',
        message: `[${tagName}] has limited support in ${context}`,
        line,
        help: `The [${tagName}] tag works in ${context} but may not render exactly as expected. Test your post on Steam to verify it looks correct.`,
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
        help: 'Steam Guides require images to be uploaded through the Steam guide editor. Use [previewimg]ID[/previewimg] with the uploaded image ID, not external URLs with [img].',
      });
      warningLines.add(line);
    }
  }
}

/**
 * Check for malformed list items and invalid bracket patterns
 */
function checkListItems(
  bbcode: string, 
  errors: LintMessage[], 
  errorLines: Set<number>
): void {
  // Flag [-], [+], [.], [] etc. anywhere - these look like tag attempts but aren't valid
  const malformedPattern = /\[([.\-+•·]?)\]/g;
  const seen = new Set<number>(); // Track lines we've already reported
  
  let match;
  while ((match = malformedPattern.exec(bbcode)) !== null) {
    const content = match[1];
    const line = getLineNumber(bbcode, match.index);
    if (seen.has(line)) continue; // Only one error per line
    seen.add(line);
    
    errors.push({
      type: 'error',
      message: content
        ? `Invalid tag [${content}] - will render as plain text`
        : `Empty brackets [] - will render as plain text`,
      line,
      column: getColumnInLine(bbcode, match.index),
      length: match[0].length,
      help: 'This looks like a tag attempt but is not valid BBCode. If you intended a list item, use [*] inside a [list] or [olist] block. Otherwise, remove or escape the brackets.',
    });
    errorLines.add(line);
  }
  
  // Check for [*] outside of [list] or [olist]
  const listContent = bbcode.replace(/\[(list|olist)\][\s\S]*?\[\/(list|olist)\]/gi, '');
  const strayItemMatch = /\[\*\]/.exec(listContent);
  if (strayItemMatch) {
    // Find position in original text
    const originalIndex = bbcode.indexOf('[*]');
    const line = getLineNumber(bbcode, originalIndex);
    errors.push({
      type: 'error',
      message: '[*] found outside of [list] or [olist]',
      line,
      column: getColumnInLine(bbcode, originalIndex),
      length: 3,
      help: 'The [*] marker is only valid inside a [list] or [olist] block. Wrap your list items: [list][*]Item 1[*]Item 2[/list].',
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
      help: 'Steam may interpret blank lines inside a [list] block as the end of the list. Remove blank lines between [*] items to avoid formatting issues.',
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
      help: 'A URL tag needs both an address and link text. Use [url=https://example.com]link text[/url] or [url]https://example.com[/url].',
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
      help: 'Steam requires full URLs with a protocol. Add https:// at the start: [url=https://example.com]link text[/url].',
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
      help: `Steam enforces a ${limit.toLocaleString()} character limit for ${context}. Shorten your content or split it into multiple posts.`,
    });
  } else if (charCount > limit * 0.9) {
    warnings.push({
      type: 'warning',
      message: `Approaching limit: ${charCount.toLocaleString()} / ${limit.toLocaleString()} (${Math.round(charCount / limit * 100)}%)`,
      help: `Steam enforces a ${limit.toLocaleString()} character limit for ${context}. Consider shortening your content to stay within the limit.`,
    });
  }
}
