import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// SMD-4381 — Nuclear Paste fix
//
// Verifies that pasting content into a non-empty editor splices at the cursor
// position instead of replacing the entire document.
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
// 1. Confluence paste into non-empty editor preserves existing content
// ---------------------------------------------------------------------------

test('Confluence paste into non-empty editor preserves existing content', async ({ page }) => {
  const textarea = editorTextarea(page);

  // Type some initial content and place cursor at the end
  await textarea.fill('Hello');
  await textarea.focus();
  await textarea.press('End');

  // Paste Confluence HTML at cursor (end of "Hello")
  const confluenceHtml =
    '<p>World</p><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Note</p></ac:rich-text-body></ac:structured-macro>';
  await pasteConfluenceHtml(textarea, confluenceHtml, 'World');

  await page.waitForTimeout(300);

  // The editor should contain both the original text and the pasted content
  const value = await textarea.inputValue();
  expect(value).toContain('Hello');
  // The Confluence HTML is converted to markdown — should contain "World"
  expect(value).toContain('World');

  // Verify the original content was not blown away: "Hello" should appear
  // BEFORE the pasted content (since cursor was at end of "Hello")
  const helloIndex = value.indexOf('Hello');
  const worldIndex = value.indexOf('World');
  expect(helloIndex).toBeLessThan(worldIndex);
});

// ---------------------------------------------------------------------------
// 2. Plain text paste into non-empty editor preserves existing content
// ---------------------------------------------------------------------------

test('structured plain text paste into non-empty editor preserves existing content', async ({ page }) => {
  const textarea = editorTextarea(page);

  // Set up initial content
  await textarea.fill('Hello');
  await textarea.focus();
  await textarea.press('End');

  // Use Unicode bullets — the normalizer converts • to - which means
  // normalized !== plain, so the paste handler intercepts and splices.
  const structuredText = '• Item 1\n• Item 2\n• Item 3';
  await pastePlainText(textarea, structuredText);

  await page.waitForTimeout(300);

  const value = await textarea.inputValue();
  // Original content must still be present
  expect(value).toContain('Hello');
  // Pasted content must also be present (normalized to markdown bullets)
  expect(value).toContain('- Item 1');
  expect(value).toContain('- Item 2');
});

// ---------------------------------------------------------------------------
// 3. Paste with text selection replaces only the selected text
// ---------------------------------------------------------------------------

test('Confluence paste with text selection replaces only selected text', async ({ page }) => {
  const textarea = editorTextarea(page);

  // Set content: AAABBBCCC
  await textarea.fill('AAABBBCCC');
  await textarea.focus();

  // Select only "BBB" (positions 3-6)
  await textarea.evaluate((el) => {
    (el as HTMLTextAreaElement).setSelectionRange(3, 6);
  });

  // Paste Confluence HTML — should replace only the selected "BBB"
  const confluenceHtml =
    '<p>REPLACED</p><ac:structured-macro ac:name="toc"/>';
  await pasteConfluenceHtml(textarea, confluenceHtml, 'REPLACED');

  await page.waitForTimeout(300);

  const value = await textarea.inputValue();
  // AAA and CCC must be preserved
  expect(value).toContain('AAA');
  expect(value).toContain('CCC');
  // BBB must be gone
  expect(value).not.toContain('BBB');
  // The replacement content should be between AAA and CCC
  expect(value).toContain('REPLACED');

  const aaaIndex = value.indexOf('AAA');
  const replacedIndex = value.indexOf('REPLACED');
  const cccIndex = value.indexOf('CCC');
  expect(aaaIndex).toBeLessThan(replacedIndex);
  expect(replacedIndex).toBeLessThan(cccIndex);
});

test('structured plain text paste with text selection replaces only selected text', async ({ page }) => {
  const textarea = editorTextarea(page);

  await textarea.fill('AAABBBCCC');
  await textarea.focus();

  // Select "BBB"
  await textarea.evaluate((el) => {
    (el as HTMLTextAreaElement).setSelectionRange(3, 6);
  });

  // Use Unicode bullets so the normalizer transforms them (triggers interception)
  const structuredText = '• Spliced Item\n• Another Item';
  await pastePlainText(textarea, structuredText);

  await page.waitForTimeout(300);

  const value = await textarea.inputValue();
  expect(value).toContain('AAA');
  expect(value).toContain('CCC');
  expect(value).not.toContain('BBB');
  expect(value).toContain('- Spliced Item');
});

// ---------------------------------------------------------------------------
// 4. Full select (Cmd+A) then paste replaces everything
// ---------------------------------------------------------------------------

test('Cmd+A then Confluence paste replaces all content', async ({ page }) => {
  const textarea = editorTextarea(page);

  await textarea.fill('This entire document should be replaced');
  await textarea.focus();

  // Select all content
  await textarea.evaluate((el) => {
    const ta = el as HTMLTextAreaElement;
    ta.setSelectionRange(0, ta.value.length);
  });

  // Paste Confluence HTML — should replace everything
  const confluenceHtml =
    '<h1>Brand New Content</h1><p>Everything is <strong>fresh</strong>.</p><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Info</p></ac:rich-text-body></ac:structured-macro>';
  await pasteConfluenceHtml(textarea, confluenceHtml, 'Brand New Content');

  await page.waitForTimeout(300);

  const value = await textarea.inputValue();
  // Old content should be gone
  expect(value).not.toContain('This entire document should be replaced');
  // New content should be present
  expect(value).toContain('Brand New Content');
  expect(value).toContain('fresh');
});

// ---------------------------------------------------------------------------
// 5. Paste into empty editor still works (regression guard)
// ---------------------------------------------------------------------------

test('Confluence paste into empty editor works normally', async ({ page }) => {
  const textarea = editorTextarea(page);

  // Clear editor completely
  await textarea.fill('');
  await textarea.focus();

  const confluenceHtml =
    '<h1>From Scratch</h1><p>Content pasted into <strong>empty</strong> editor.</p><ac:structured-macro ac:name="code"><ac:plain-text-body>hello()</ac:plain-text-body></ac:structured-macro>';
  await pasteConfluenceHtml(textarea, confluenceHtml, 'From Scratch');

  await page.waitForTimeout(500);

  const value = await textarea.inputValue();
  expect(value).toContain('From Scratch');
  expect(value).toContain('empty');

  // Confluence HTML is converted to markdown by the paste handler,
  // so the format detector correctly identifies the result as markdown.
  const badge = page.getByTestId('format-badge');
  await expect(badge).toHaveText('MD');
});

// ---------------------------------------------------------------------------
// 6. Paste at middle of content inserts at cursor position
// ---------------------------------------------------------------------------

test('Confluence paste at cursor mid-document inserts at correct position', async ({ page }) => {
  const textarea = editorTextarea(page);

  // Set content with a clear structure
  await textarea.fill('First line\nThird line');
  await textarea.focus();

  // Place cursor at position 11 (after "First line\n", before "Third line")
  await textarea.evaluate((el) => {
    (el as HTMLTextAreaElement).setSelectionRange(11, 11);
  });

  const confluenceHtml =
    '<p>Second line</p><ac:structured-macro ac:name="toc"/>';
  await pasteConfluenceHtml(textarea, confluenceHtml, 'Second line');

  await page.waitForTimeout(300);

  const value = await textarea.inputValue();
  expect(value).toContain('First line');
  expect(value).toContain('Second line');
  expect(value).toContain('Third line');

  // Verify ordering: First < Second < Third
  const firstIdx = value.indexOf('First line');
  const secondIdx = value.indexOf('Second line');
  const thirdIdx = value.indexOf('Third line');
  expect(firstIdx).toBeLessThan(secondIdx);
  expect(secondIdx).toBeLessThan(thirdIdx);
});

// ---------------------------------------------------------------------------
// 7. BBCode output reflects spliced content correctly
// ---------------------------------------------------------------------------

test('BBCode output shows both original and pasted content after splice', async ({ page }) => {
  const textarea = editorTextarea(page);

  // Start with markdown heading
  await textarea.fill('# Original Title\n\n');
  await textarea.focus();

  // Place cursor at end
  await textarea.evaluate((el) => {
    const ta = el as HTMLTextAreaElement;
    ta.setSelectionRange(ta.value.length, ta.value.length);
  });

  // Paste Confluence content after the heading
  const confluenceHtml =
    '<p>Pasted <strong>paragraph</strong> from Confluence.</p><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Done</p></ac:rich-text-body></ac:structured-macro>';
  await pasteConfluenceHtml(textarea, confluenceHtml, 'Pasted paragraph');

  await page.waitForTimeout(500);

  // Switch to BBCode tab and verify both parts rendered
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  const bbcodeDisplay = page.locator('.bbcode-readonly');

  // Original markdown heading should be converted to BBCode
  await expect(bbcodeDisplay).toContainText('[h1]Original Title[/h1]');
  // Pasted Confluence content should also appear
  await expect(bbcodeDisplay).toContainText('Pasted');
  await expect(bbcodeDisplay).toContainText('paragraph');
});
