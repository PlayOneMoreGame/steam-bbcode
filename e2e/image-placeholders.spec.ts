import { test, expect } from '@playwright/test';

const CONFLUENCE_WITH_IMAGES = '<h1>Patch Notes</h1><p>Here are changes:</p><ac:image><ri:attachment ri:filename="hero.png" /></ac:image><p>More text</p><ac:image><ri:attachment ri:filename="screenshot.gif" /></ac:image>';

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
// Drop markers render naturally in preview (as bold text)
// ---------------------------------------------------------------------------

test('Confluence images render as bold drop markers in preview', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill(''); // clear welcome doc
  await mdEditor.focus();
  await pasteConfluenceHtml(mdEditor, CONFLUENCE_WITH_IMAGES, 'Patch Notes');
  await page.waitForTimeout(500);

  // Preview should show drop markers as bold text
  const preview = page.locator('.preview.preview-bbcode');
  await expect(preview).toContainText('Drop image: hero.png');
  await expect(preview).toContainText('Drop image: screenshot.gif');
});

// ---------------------------------------------------------------------------
// Images panel visibility (upload checklist)
// ---------------------------------------------------------------------------

test('Images panel appears when Confluence content has images', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('');
  await mdEditor.focus();
  await pasteConfluenceHtml(mdEditor, CONFLUENCE_WITH_IMAGES, 'Patch Notes');
  await page.waitForTimeout(500);

  // Images panel should be visible in output panel
  const imagesPanel = page.locator('.images-panel');
  await expect(imagesPanel).toBeVisible();

  // Header should show correct count
  await expect(imagesPanel.locator('.images-panel-header')).toContainText('2');
});

test('Images panel not shown for plain markdown', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('# Hello\n\nJust text, no images.');
  await page.waitForTimeout(500);

  await expect(page.locator('.images-panel')).not.toBeVisible();
});

test('Images panel not shown for markdown with URL images', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('# Hello\n\n![alt](https://example.com/img.png)');
  await page.waitForTimeout(500);

  // Markdown images have real URLs, not drop markers
  await expect(page.locator('.images-panel')).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Images panel shows filenames as upload checklist
// ---------------------------------------------------------------------------

test('Images panel lists filenames for upload', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('');
  await mdEditor.focus();
  await pasteConfluenceHtml(mdEditor, CONFLUENCE_WITH_IMAGES, 'Patch Notes');
  await page.waitForTimeout(500);

  const imagesPanel = page.locator('.images-panel');
  await expect(imagesPanel).toBeVisible();

  // Should show filenames
  await expect(imagesPanel).toContainText('hero.png');
  await expect(imagesPanel).toContainText('screenshot.gif');

  // Should show upload hint
  await expect(imagesPanel).toContainText('Upload');
});

// ---------------------------------------------------------------------------
// Drop markers in BBCode output
// ---------------------------------------------------------------------------

test('BBCode output contains drop markers for Confluence images', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('');
  await mdEditor.focus();
  await pasteConfluenceHtml(mdEditor, CONFLUENCE_WITH_IMAGES, 'Patch Notes');
  await page.waitForTimeout(500);

  // Switch to BBCode tab
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  const bbcode = page.locator('.bbcode-readonly');
  await expect(bbcode).toContainText('Drop image: hero.png');
  await expect(bbcode).toContainText('Drop image: screenshot.gif');
});

// ---------------------------------------------------------------------------
// Lint does NOT show drop markers (they're process reminders, not editing issues)
// ---------------------------------------------------------------------------

test('lint does not warn about drop marker images', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('');
  await mdEditor.focus();
  await pasteConfluenceHtml(mdEditor, CONFLUENCE_WITH_IMAGES, 'Patch Notes');
  await page.waitForTimeout(500);

  // Lint status should show Ready (no errors from drop markers)
  await expect(page.locator('.lint-status-ready')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Collapse/expand
// ---------------------------------------------------------------------------

test('Images panel can be collapsed and expanded', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('');
  await mdEditor.focus();
  await pasteConfluenceHtml(mdEditor, CONFLUENCE_WITH_IMAGES, 'Patch Notes');
  await page.waitForTimeout(500);

  const header = page.locator('.images-panel-header');
  const body = page.locator('.images-panel-body');

  // Initially expanded
  await expect(body).toBeVisible();

  // Collapse
  await header.click();
  await expect(body).not.toBeVisible();

  // Expand again
  await header.click();
  await expect(body).toBeVisible();
});

// ---------------------------------------------------------------------------
// Copy BBCode includes drop markers
// ---------------------------------------------------------------------------

test('copy BBCode includes drop markers', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('');
  await mdEditor.focus();
  await pasteConfluenceHtml(mdEditor, CONFLUENCE_WITH_IMAGES, 'Patch Notes');
  await page.waitForTimeout(500);

  // Copy BBCode
  const copyBtn = page.locator('.output-panel .btn-primary');
  await copyBtn.click();

  // Verify clipboard contains drop markers
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain('Drop image: hero.png');
  expect(clipboardText).toContain('Drop image: screenshot.gif');
});
