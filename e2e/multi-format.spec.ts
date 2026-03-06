import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
});

// ---------------------------------------------------------------------------
// Format badge
// ---------------------------------------------------------------------------

test('format badge shows MD for markdown content', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('# Hello World\n\nThis is **bold** text.\n\n- Item 1\n- Item 2');

  // Wait for debounced format detection (300ms + buffer)
  await page.waitForTimeout(500);

  const badge = page.getByTestId('format-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('MD');
});

test('format badge shows Confluence for XHTML content', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  const confluenceXhtml = '<h1>Patch Notes</h1><p>Fixed <strong>critical bug</strong>.</p><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Important note</p></ac:rich-text-body></ac:structured-macro>';

  await mdEditor.fill(confluenceXhtml);

  // Wait for debounced format detection
  await page.waitForTimeout(500);

  const badge = page.getByTestId('format-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('Confluence');
});

test('format badge shows Plain for plain text', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('Just some plain text without any special formatting markers.');

  // Wait for debounced format detection
  await page.waitForTimeout(500);

  const badge = page.getByTestId('format-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('Plain');
});

// ---------------------------------------------------------------------------
// Confluence conversion in UI
// ---------------------------------------------------------------------------

test('Confluence XHTML is converted to BBCode, not shown raw', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  const confluenceXhtml = '<h1>Release Notes</h1><p>We fixed <strong>many bugs</strong> in this release.</p><ac:structured-macro ac:name="info"><ac:rich-text-body><p>See details below</p></ac:rich-text-body></ac:structured-macro>';

  await mdEditor.fill(confluenceXhtml);
  await page.waitForTimeout(500);

  // Switch to BBCode tab to verify conversion output
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  const bbcodeDisplay = page.locator('.bbcode-readonly');

  // Should contain BBCode, not raw HTML
  await expect(bbcodeDisplay).toContainText('[h1]Release Notes[/h1]');
  await expect(bbcodeDisplay).toContainText('[b]many bugs[/b]');
  // Should NOT contain raw HTML tags
  const bbcodeText = await bbcodeDisplay.textContent();
  expect(bbcodeText).not.toContain('<h1>');
  expect(bbcodeText).not.toContain('<strong>');
  expect(bbcodeText).not.toContain('<ac:');
});

test('Confluence conversion notes appear in header', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  // Input with an info macro that produces a conversion note
  const confluenceXhtml = '<h1>Title</h1><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Info panel content</p></ac:rich-text-body></ac:structured-macro>';

  await mdEditor.fill(confluenceXhtml);
  await page.waitForTimeout(500);

  // Conversion notes should appear in the header
  const notesBar = page.locator('.conversion-notes');
  await expect(notesBar).toBeVisible();
  await expect(notesBar).toContainText('panel');
});

// ---------------------------------------------------------------------------
// Paste from Confluence (clipboard HTML interception)
// ---------------------------------------------------------------------------

test('pasting Confluence HTML from clipboard uses XHTML content', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');

  // Clear the editor first
  await mdEditor.fill('');

  // Simulate a paste event with both text/plain and text/html
  // The HTML contains Confluence markers, so the paste handler should prefer it
  const confluenceHtml = '<h1>Confluence Page</h1><p>Content with <strong>formatting</strong></p><ac:structured-macro ac:name="code"><ac:plain-text-body>console.log("hello")</ac:plain-text-body></ac:structured-macro>';

  await mdEditor.evaluate((el, html) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'Confluence Page\nContent with formatting\nconsole.log("hello")');
    dt.setData('text/html', html);
    const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
  }, confluenceHtml);

  // Wait for format detection
  await page.waitForTimeout(500);

  // The badge should show Confluence since the HTML was used
  const badge = page.getByTestId('format-badge');
  await expect(badge).toHaveText('Confluence');

  // The BBCode output should contain the converted content, not plain text
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  const bbcodeDisplay = page.locator('.bbcode-readonly');
  await expect(bbcodeDisplay).toContainText('[h1]Confluence Page[/h1]');
  await expect(bbcodeDisplay).toContainText('[code]');
});

test('pasting regular HTML does not trigger Confluence interception', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('');

  // Simulate paste with regular HTML (no Confluence markers)
  // Our handler should NOT prevent default, so the browser's native paste inserts the plain text.
  // Since dispatched ClipboardEvents don't trigger default behavior, we verify
  // that the editor content remains empty (handler did not intercept).
  await mdEditor.evaluate((el) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', '# Regular Markdown\n\nJust text.');
    dt.setData('text/html', '<h1>Regular Markdown</h1><p>Just text.</p>');
    const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
  });

  await page.waitForTimeout(500);

  // The handler should not have intercepted the paste (no Confluence markers in HTML).
  // Since dispatched paste events don't trigger the browser's default insert,
  // the textarea should still be empty -- proving our handler did not run.
  const textareaValue = await mdEditor.inputValue();
  expect(textareaValue).toBe('');
});

// ---------------------------------------------------------------------------
// Format badge updates dynamically
// ---------------------------------------------------------------------------

test('format badge updates when content type changes', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  const badge = page.getByTestId('format-badge');

  // Start with markdown
  await mdEditor.fill('# Title\n\n**Bold** text with [link](http://example.com)');
  await page.waitForTimeout(500);
  await expect(badge).toHaveText('MD');

  // Replace with Confluence XHTML
  await mdEditor.fill('<h1>Title</h1><ac:structured-macro ac:name="toc"/><p>Content</p>');
  await page.waitForTimeout(500);
  await expect(badge).toHaveText('Confluence');

  // Replace with plain text
  await mdEditor.fill('Just a simple note.');
  await page.waitForTimeout(500);
  await expect(badge).toHaveText('Plain');
});
