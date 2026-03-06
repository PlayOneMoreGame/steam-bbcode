// Confluence XHTML linter
// Validates Confluence storage format input and warns about conversion issues

import type { SteamContext } from './contexts';
import type { LintMessage, LintResult } from './linter';

/**
 * Lint Confluence XHTML storage format for conversion issues.
 * Returns warnings about content that won't convert cleanly to BBCode.
 */
export function lintConfluence(xhtml: string, context: SteamContext): LintResult {
  const errors: LintMessage[] = [];
  const warnings: LintMessage[] = [];
  const errorLines = new Set<number>();
  const warningLines = new Set<number>();

  checkUnsupportedMacros(xhtml, warnings, warningLines);
  checkImageAttachments(xhtml, warnings, warningLines, context);
  checkEmptyLinks(xhtml, warnings, warningLines);
  checkMalformedXhtml(xhtml, errors, errorLines);

  return { errors, warnings, errorLines, warningLines };
}

function getLineNumber(text: string, position: number): number {
  return (text.slice(0, position).match(/\n/g) || []).length + 1;
}

function checkUnsupportedMacros(
  xhtml: string,
  warnings: LintMessage[],
  warningLines: Set<number>
): void {
  const macroPattern = /ac:name="([^"]+)"/g;
  const unsupported = new Set(['info', 'warning', 'note', 'tip', 'toc', 'expand', 'excerpt', 'status', 'jira']);
  const seen = new Set<string>();

  let match;
  while ((match = macroPattern.exec(xhtml)) !== null) {
    const name = match[1];
    if (unsupported.has(name) && !seen.has(name)) {
      seen.add(name);
      const line = getLineNumber(xhtml, match.index);
      warnings.push({
        type: 'warning',
        message: `Confluence "${name}" macro has no BBCode equivalent — content will be converted as plain text`,
        line,
      });
      warningLines.add(line);
    }
  }
}

function checkImageAttachments(
  xhtml: string,
  warnings: LintMessage[],
  warningLines: Set<number>,
  context: SteamContext
): void {
  const imagePattern = /ri:filename="([^"]+)"/g;
  const filenames: string[] = [];

  let match;
  while ((match = imagePattern.exec(xhtml)) !== null) {
    filenames.push(match[1]);
  }

  if (filenames.length > 0) {
    const line = getLineNumber(xhtml, xhtml.indexOf('ri:filename'));
    const contextNote = context === 'guides'
      ? ' In guides, use [previewimg] with uploaded images.'
      : context === 'reviews'
        ? ' Images are not supported in reviews.'
        : '';

    warnings.push({
      type: 'warning',
      message: `${filenames.length} image attachment(s) reference Confluence files — upload to Steam and update URLs.${contextNote}`,
      line,
    });
    warningLines.add(line);
  }
}

function checkEmptyLinks(
  xhtml: string,
  warnings: LintMessage[],
  warningLines: Set<number>
): void {
  // Look for ac:link elements without ri:page or ri:url children
  const linkPattern = /<ac:link[^>]*>[\s\S]*?<\/ac:link>/g;

  let match;
  while ((match = linkPattern.exec(xhtml)) !== null) {
    const linkContent = match[0];
    if (!linkContent.includes('ri:page') && !linkContent.includes('ri:url') && !linkContent.includes('ri:attachment')) {
      const line = getLineNumber(xhtml, match.index);
      warnings.push({
        type: 'warning',
        message: 'Confluence link with no target — may produce empty [url] tag',
        line,
      });
      warningLines.add(line);
    }
  }
}

function checkMalformedXhtml(
  xhtml: string,
  errors: LintMessage[],
  errorLines: Set<number>
): void {
  // Check for obviously broken XHTML that might cause parsing issues
  // Count opening vs closing ac: tags
  const openTags = (xhtml.match(/<ac:[a-z-]+/gi) || []).length;
  const closeTags = (xhtml.match(/<\/ac:[a-z-]+/gi) || []).length;

  if (openTags > 0 && Math.abs(openTags - closeTags) > openTags * 0.1) {
    errors.push({
      type: 'error',
      message: `Possible malformed Confluence XHTML: ${openTags} opening vs ${closeTags} closing ac: tags`,
      line: 1,
    });
    errorLines.add(1);
  }
}
