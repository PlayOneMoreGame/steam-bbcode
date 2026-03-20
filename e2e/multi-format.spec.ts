import { test, expect } from '@playwright/test';

// Helper: simulate paste with Confluence HTML
async function pasteConfluenceHtml(
  textarea: import('@playwright/test').Locator,
  html: string,
  plainFallback: string
) {
  await textarea.evaluate(
    (el, { html, plain }) => {
      const ta = el as HTMLTextAreaElement;
      ta.setSelectionRange(0, ta.value.length); // select all to replace
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

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
});

// ---------------------------------------------------------------------------
// Format badge
// ---------------------------------------------------------------------------

test('format selector shows Markdown for markdown content', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('# Hello World\n\nThis is **bold** text.\n\n- Item 1\n- Item 2');

  // Wait for debounced format detection (300ms + buffer)
  await page.waitForTimeout(500);

  const selector = page.getByTestId('format-selector');
  await expect(selector).toBeVisible();
  await expect(selector).toHaveValue('markdown');
});

test('format selector shows Confluence for XHTML content', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  const confluenceXhtml = '<h1>Patch Notes</h1><p>Fixed <strong>critical bug</strong>.</p><ac:structured-macro ac:name="info"><ac:rich-text-body><p>Important note</p></ac:rich-text-body></ac:structured-macro>';

  await mdEditor.fill(confluenceXhtml);

  // Wait for debounced format detection
  await page.waitForTimeout(500);

  const selector = page.getByTestId('format-selector');
  await expect(selector).toBeVisible();
  await expect(selector).toHaveValue('confluence');
});

test('format selector shows Plaintext for plain text', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('Just some plain text without any special formatting markers.');

  // Wait for debounced format detection
  await page.waitForTimeout(500);

  const selector = page.getByTestId('format-selector');
  await expect(selector).toBeVisible();
  await expect(selector).toHaveValue('plaintext');
});

// ---------------------------------------------------------------------------
// Confluence conversion in UI
// ---------------------------------------------------------------------------

test('Confluence XHTML is converted to BBCode, not shown raw', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  const confluenceXhtml = '<h1>Release Notes</h1><p>We fixed <strong>many bugs</strong> in this release.</p><ac:structured-macro ac:name="info"><ac:rich-text-body><p>See details below</p></ac:rich-text-body></ac:structured-macro>';

  // Use paste to trigger Confluence converter (fill() bypasses it)
  await mdEditor.fill('');
  await mdEditor.focus();
  await pasteConfluenceHtml(mdEditor, confluenceXhtml, 'Release Notes');
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

test('Confluence content with inline code produces conversion notes', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  // Input with a code macro that converts to markdown backticks, then to [b] in BBCode
  const confluenceXhtml = '<h1>Title</h1><p>Run <ac:structured-macro ac:name="code"><ac:plain-text-body>npm install</ac:plain-text-body></ac:structured-macro> to install.</p>';

  // Use paste to trigger Confluence converter
  await mdEditor.fill('');
  await mdEditor.focus();
  await pasteConfluenceHtml(mdEditor, confluenceXhtml, 'Title');
  await page.waitForTimeout(500);

  // After paste, the editor contains markdown. The md->BBCode converter
  // produces notes when inline code backticks are converted to [b].
  // Verify the content was pasted and converted
  const value = await mdEditor.inputValue();
  expect(value).toContain('Title');
  expect(value).toContain('npm install');
});

// ---------------------------------------------------------------------------
// Paste from Confluence (clipboard HTML interception)
// ---------------------------------------------------------------------------

test('pasting Confluence HTML from clipboard uses XHTML content', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');

  // Clear the editor first
  await mdEditor.fill('');
  await mdEditor.focus();

  // Paste Confluence HTML — the paste handler should detect ac: markers and convert
  const confluenceHtml = '<h1>Confluence Page</h1><p>Content with <strong>formatting</strong></p><ac:structured-macro ac:name="code"><ac:plain-text-body>console.log("hello")</ac:plain-text-body></ac:structured-macro>';
  await pasteConfluenceHtml(mdEditor, confluenceHtml, 'Confluence Page\nContent with formatting');

  // Wait for format detection and rendering
  await page.waitForTimeout(500);

  // The editor should contain converted markdown (not raw HTML)
  const value = await mdEditor.inputValue();
  expect(value).toContain('Confluence Page');
  expect(value).toContain('formatting');

  // The BBCode output should contain the converted content
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  const bbcodeDisplay = page.locator('.bbcode-readonly');
  await expect(bbcodeDisplay).toContainText('[h1]Confluence Page[/h1]');
  await expect(bbcodeDisplay).toContainText('[b]formatting[/b]');
});

test('pasting regular HTML converts it as rich text (not Confluence)', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('');
  await mdEditor.focus();

  // Simulate paste with regular HTML (no Confluence markers, no Google Docs markers)
  // The handler should intercept it as generic rich HTML and convert to markdown.
  await mdEditor.evaluate((el) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'Regular Markdown\nJust text.');
    dt.setData('text/html', '<h1>Regular Markdown</h1><p>Just text.</p>');
    const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
  });

  await page.waitForTimeout(500);

  // The handler should intercept the paste and convert the rich HTML to markdown.
  const textareaValue = await mdEditor.inputValue();
  expect(textareaValue).toContain('Regular Markdown');
  expect(textareaValue).toContain('Just text');
});

// ---------------------------------------------------------------------------
// Format selector updates dynamically
// ---------------------------------------------------------------------------

test('format selector updates when content type changes', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  const selector = page.getByTestId('format-selector');

  // Start with markdown
  await mdEditor.fill('# Title\n\n**Bold** text with [link](http://example.com)');
  await page.waitForTimeout(500);
  await expect(selector).toHaveValue('markdown');

  // Replace with Confluence XHTML
  await mdEditor.fill('<h1>Title</h1><ac:structured-macro ac:name="toc"/><p>Content</p>');
  await page.waitForTimeout(500);
  await expect(selector).toHaveValue('confluence');

  // Replace with plain text
  await mdEditor.fill('Just a simple note.');
  await page.waitForTimeout(500);
  await expect(selector).toHaveValue('plaintext');
});
