import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Stale closure regression test for paste handling.
//
// Verifies that incrementally typed content (via keyboard.type, NOT fill)
// is preserved when pasting at cursor. This catches stale closure bugs where
// the paste handler captures an old snapshot of the editor value.
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
});

// Helper: get the editor textarea
function editorTextarea(page: import('@playwright/test').Page) {
  return page.locator('.panel').first().locator('textarea');
}

// Helper: simulate a paste event with text/html (Confluence) content
async function pasteConfluenceHtml(
  textarea: import('@playwright/test').Locator,
  html: string,
  plainFallback: string
) {
  await textarea.evaluate(
    (el, { html, plain }) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', plain);
      dt.setData('text/html', html);
      const event = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(event);
    },
    { html, plain: plainFallback }
  );
}

// Helper: simulate a paste event with text/plain only (structured plain text)
async function pastePlainText(
  textarea: import('@playwright/test').Locator,
  text: string
) {
  await textarea.evaluate(
    (el, plain) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', plain);
      const event = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(event);
    },
    text
  );
}

// ---------------------------------------------------------------------------
// 1. Incremental typing + Confluence paste at cursor
// ---------------------------------------------------------------------------

test('incremental typing then Confluence paste uses current content, not stale initial value', async ({ page }) => {
  const textarea = editorTextarea(page);

  // Clear the welcome doc
  await textarea.fill('');
  await textarea.focus();

  // Type characters one by one (simulates real keystrokes, not fill)
  await page.keyboard.type('Alpha Beta Gamma', { delay: 30 });

  // Small wait for any debounced state to settle
  await page.waitForTimeout(400);

  // Verify the content was typed correctly
  const beforePaste = await textarea.inputValue();
  expect(beforePaste).toBe('Alpha Beta Gamma');

  // Move cursor to after "Alpha " (position 6)
  await textarea.evaluate((el) => {
    (el as HTMLTextAreaElement).setSelectionRange(6, 6);
  });

  // Paste Confluence HTML at cursor position
  const confluenceHtml = '<p>INSERTED</p><ac:structured-macro ac:name="toc"/>';
  await pasteConfluenceHtml(textarea, confluenceHtml, 'INSERTED');

  await page.waitForTimeout(400);

  const value = await textarea.inputValue();

  // The typed content must be preserved — this is the stale closure check.
  // If the paste handler had a stale closure, it would use '' (empty) as
  // the base value and lose "Alpha Beta Gamma".
  expect(value).toContain('Alpha');
  expect(value).toContain('Beta Gamma');
  expect(value).toContain('INSERTED');

  // Verify ordering: "Alpha" before "INSERTED" before "Beta Gamma"
  const alphaIdx = value.indexOf('Alpha');
  const insertedIdx = value.indexOf('INSERTED');
  const betaIdx = value.indexOf('Beta Gamma');
  expect(alphaIdx).toBeLessThan(insertedIdx);
  expect(insertedIdx).toBeLessThan(betaIdx);
});

// ---------------------------------------------------------------------------
// 2. Incremental typing + plain text paste at cursor
// ---------------------------------------------------------------------------

test('incremental typing then plain text paste uses current content, not stale initial value', async ({ page }) => {
  const textarea = editorTextarea(page);

  // Clear the welcome doc
  await textarea.fill('');
  await textarea.focus();

  // Type characters one by one
  await page.keyboard.type('Line one here', { delay: 30 });

  await page.waitForTimeout(400);

  const beforePaste = await textarea.inputValue();
  expect(beforePaste).toBe('Line one here');

  // Move cursor to after "Line " (position 5)
  await textarea.evaluate((el) => {
    (el as HTMLTextAreaElement).setSelectionRange(5, 5);
  });

  // Paste structured plain text (Unicode bullets trigger normalizer interception)
  const structuredText = '\u2022 Pasted Item A\n\u2022 Pasted Item B';
  await pastePlainText(textarea, structuredText);

  await page.waitForTimeout(400);

  const value = await textarea.inputValue();

  // Original typed content must be present
  expect(value).toContain('Line');
  expect(value).toContain('one here');
  // Pasted content (normalized from Unicode bullets to dashes)
  expect(value).toContain('- Pasted Item A');
  expect(value).toContain('- Pasted Item B');
});

// ---------------------------------------------------------------------------
// 3. Rapid typing then immediate paste (no settle delay)
// ---------------------------------------------------------------------------

test('rapid typing followed by immediate paste preserves all typed content', async ({ page }) => {
  const textarea = editorTextarea(page);

  await textarea.fill('');
  await textarea.focus();

  // Type quickly with minimal delay
  await page.keyboard.type('QuickContent', { delay: 10 });

  // Immediately paste without waiting — this stresses the debounce/state pipeline
  const confluenceHtml = '<p>Appended</p><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Note</p></ac:rich-text-body></ac:structured-macro>';
  await pasteConfluenceHtml(textarea, confluenceHtml, 'Appended');

  await page.waitForTimeout(500);

  const value = await textarea.inputValue();

  // Both typed and pasted content should be present
  expect(value).toContain('QuickContent');
  expect(value).toContain('Appended');
});

// ---------------------------------------------------------------------------
// 4. Type, move cursor to beginning, paste — verifies cursor position is accurate
// ---------------------------------------------------------------------------

test('type then paste at beginning inserts before typed content', async ({ page }) => {
  const textarea = editorTextarea(page);

  await textarea.fill('');
  await textarea.focus();

  await page.keyboard.type('End of document', { delay: 20 });

  await page.waitForTimeout(400);

  // Move cursor to the very beginning
  await textarea.evaluate((el) => {
    (el as HTMLTextAreaElement).setSelectionRange(0, 0);
  });

  const confluenceHtml = '<h1>Title</h1><ac:structured-macro ac:name="toc"/>';
  await pasteConfluenceHtml(textarea, confluenceHtml, 'Title');

  await page.waitForTimeout(400);

  const value = await textarea.inputValue();

  expect(value).toContain('Title');
  expect(value).toContain('End of document');

  // Title should come before the typed content
  const titleIdx = value.indexOf('Title');
  const endIdx = value.indexOf('End of document');
  expect(titleIdx).toBeLessThan(endIdx);
});
