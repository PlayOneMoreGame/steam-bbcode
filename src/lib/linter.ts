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
      message: `Steam doesn't support [${tagName}] — this won't display correctly`,
      line,
      column: getColumnInLine(bbcode, match.index),
      length: match[0].length,
      help: `[${tagName}] is not a tag Steam recognizes, so it will show as plain text. Supported tags include [b], [i], [u], [h1], [h2], [h3], [list], [url], [img], [code], [quote], [spoiler], and [table].`,
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
      ? ` — use ${bbcodeEquiv[tagName]} instead`
      : '';
    
    errors.push({
      type: 'error',
      message: `This looks like HTML (<${tagName}>)${suggestion}`,
      line,
      column: getColumnInLine(bbcode, match.index),
      length: match[0].length,
      help: 'Steam uses its own formatting called BBCode, not HTML. For example, <b> becomes [b], and <a href="..."> becomes [url=...]. The converter should handle this automatically — if you see this, something may not have converted.',
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
    { regex: /^#{1,3}\s/, msg: 'Markdown header found', suggestion: 'use [h1], [h2], [h3] instead' },
    { regex: /\*\*[^*]+\*\*/, msg: 'Markdown bold (**) found', suggestion: 'use [b]...[/b] instead' },
    { regex: /(?<!\*)\*[^*]+\*(?!\*)/, msg: 'Markdown italic (*) found', suggestion: 'use [i]...[/i] instead' },
    { regex: /~~[^~]+~~/, msg: 'Markdown strikethrough (~~) found', suggestion: 'use [strike]...[/strike] instead' },
    { regex: /`[^`]+`/, msg: 'Markdown code (`) found', suggestion: 'use [code]...[/code] for code blocks' },
    { regex: /^\s*[-*+]\s/, msg: 'Markdown list found', suggestion: 'use [list][*]...[/list] instead' },
    { regex: /^\s*\d+\.\s/, msg: 'Markdown numbered list found', suggestion: 'use [olist][*]...[/olist] instead' },
    { regex: /\[([^\]]+)\]\([^)]+\)/, msg: 'Markdown link found', suggestion: 'use [url=...]...[/url] instead' },
    { regex: /!\[[^\]]*\]\([^)]+\)/, msg: 'Markdown image found', suggestion: 'use [img]...[/img] instead' },
  ];
  
  const seen = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const { regex, msg, suggestion } of patterns) {
      if (regex.test(line) && !seen.has(msg)) {
        seen.add(msg);
        warnings.push({
          type: 'warning',
          message: `${msg} — ${suggestion}`,
          line: i + 1,
          help: 'This looks like Markdown formatting that wasn\'t converted to BBCode. The converter usually handles this automatically — if you see this, you may need to replace it manually with the suggested BBCode tag.',
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
          message: `Found [/${tagName}] but there's no matching [${tagName}] before it`,
          line,
          help: `Every closing tag like [/${tagName}] needs a matching opening tag [${tagName}] earlier in the content. Either add the opening tag or remove this closing one.`,
        });
        errorLines.add(line);
      } else {
        const expected = tagStack.pop()!;
        if (expected.tag !== tagName) {
          errors.push({
            type: 'error',
            message: `Tag mismatch: expected [/${expected.tag}] (from line ${expected.line}) but found [/${tagName}]`,
            line,
            help: `Tags need to be closed in the order they were opened. You opened [${expected.tag}] on line ${expected.line}, so close it before [/${tagName}]. Think of it like nesting: [b][i]text[/i][/b] works, but [b][i]text[/b][/i] does not.`,
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
      message: `[${tag}] is never closed — add [/${tag}] after your content`,
      line,
      help: `Every [${tag}] needs a matching [/${tag}] to tell Steam where the formatting ends. Without it, Steam may format the rest of your post unexpectedly.`,
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
            message: `Formatting tags overlap: [${tagName}] closes before [${stack[stack.length - 1].tag}] does`,
            line,
            help: `Steam needs formatting tags closed in reverse order — last opened, first closed. For example: [b][i]text[/i][/b] works, but [b][i]text[/b][/i] will break the formatting.`,
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
        message: `Empty [${tag}][/${tag}] — nothing to format here`,
        line,
        help: `There's nothing between [${tag}] and [/${tag}], so Steam will either show a blank space or skip it entirely. Add content between them, or remove the empty tag.`,
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
        message: `[${tagName}] won't work in Steam ${context}`,
        line,
        help: `Steam ${context} don't support [${tagName}], so this content won't show up. You can switch to a different Steam context (like Announcements or Guides) where this tag works, or remove it.`,
      });
      errorLines.add(line);
    } else if (support[checkTag] === 'limited') {
      warnings.push({
        type: 'warning',
        message: `[${tagName}] may look different in ${context}`,
        line,
        help: `[${tagName}] works in Steam ${context} but might not look exactly as expected. Check the preview and test on Steam to make sure it looks right.`,
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
        message: 'Steam Guides need uploaded images — use [previewimg] instead of [img]',
        line,
        help: 'Steam Guides require you to upload images through the Steam guide editor. Use [previewimg]ID[/previewimg] with the uploaded image ID instead of [img] with an external URL.',
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
        ? `[${content}] isn't a Steam tag — this will show as plain text`
        : `Empty brackets [] — this will show as plain text`,
      line,
      column: getColumnInLine(bbcode, match.index),
      length: match[0].length,
      help: 'This looks like it was meant to be a tag, but Steam doesn\'t recognize it. For list items, use [*] inside a [list] block. Otherwise, you can remove or rewrite this.',
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
      message: 'List item [*] found outside of a [list] or [olist] block',
      line,
      column: getColumnInLine(bbcode, originalIndex),
      length: 3,
      help: 'The [*] marker only works inside a [list] or [olist] block. Wrap your list items like this: [list][*]Item 1[*]Item 2[/list].',
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
      message: 'Blank line inside a list may break the formatting on Steam',
      line,
      help: 'Steam can interpret blank lines inside a [list] as the end of the list, which breaks the rest of your items. Remove blank lines between [*] items to keep the list together.',
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
      message: 'This [url] link is empty — it needs an address and link text',
      line,
      help: 'A link needs both a web address and display text. Use it like this: [url=https://example.com]click here[/url] or [url]https://example.com[/url].',
    });
    warningLines.add(line);
  }
  
  // URL without protocol
  const noProtocol = /\[url=(?!https?:\/\/|\/\/)([^\]]+)\]/gi;
  while ((match = noProtocol.exec(bbcode)) !== null) {
    const line = getLineNumber(bbcode, match.index);
    warnings.push({
      type: 'warning',
      message: 'This link may need https:// at the start to work on Steam',
      line,
      help: 'Steam requires full web addresses with https:// at the beginning. Try: [url=https://example.com]link text[/url].',
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
      message: `Too long for Steam ${context}: ${charCount.toLocaleString()} / ${limit.toLocaleString()} characters`,
      help: `Steam ${context} have a ${limit.toLocaleString()}-character limit and this content exceeds it. You'll need to shorten it or split it into multiple posts.`,
    });
  } else if (charCount > limit * 0.9) {
    warnings.push({
      type: 'warning',
      message: `Getting close to the limit: ${charCount.toLocaleString()} / ${limit.toLocaleString()} characters (${Math.round(charCount / limit * 100)}%)`,
      help: `Steam ${context} have a ${limit.toLocaleString()}-character limit. You're almost there — consider trimming to leave some room.`,
    });
  }
}
