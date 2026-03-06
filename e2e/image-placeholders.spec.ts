import { test, expect } from '@playwright/test';

const CONFLUENCE_WITH_IMAGES = '<h1>Patch Notes</h1><p>Here are changes:</p><ac:image><ri:attachment ri:filename="hero.png" /></ac:image><p>More text</p><ac:image><ri:attachment ri:filename="screenshot.gif" /></ac:image>';

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
});

// ---------------------------------------------------------------------------
// Placeholder cards in preview
// ---------------------------------------------------------------------------

test('Confluence images render as placeholder cards in preview', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill(CONFLUENCE_WITH_IMAGES);
  await page.waitForTimeout(500);

  // Preview should show placeholder cards, not broken images
  const placeholders = page.locator('.steam-img-placeholder');
  await expect(placeholders).toHaveCount(2);

  // Filenames should be visible in placeholder cards
  await expect(placeholders.nth(0)).toContainText('hero.png');
  await expect(placeholders.nth(1)).toContainText('screenshot.gif');

  // Hint text should be visible
  await expect(placeholders.nth(0)).toContainText('Enter Steam URL in Images panel');
});

// ---------------------------------------------------------------------------
// Images panel visibility
// ---------------------------------------------------------------------------

test('Images panel appears when Confluence content has images', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill(CONFLUENCE_WITH_IMAGES);
  await page.waitForTimeout(500);

  // Images panel should be visible in output panel
  const imagesPanel = page.locator('.images-panel');
  await expect(imagesPanel).toBeVisible();

  // Header should show correct count
  await expect(imagesPanel.locator('.images-panel-header')).toContainText('2 total');
  await expect(imagesPanel.locator('.images-panel-header')).toContainText('2 needs Steam URL');
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

  // Markdown images have real URLs, not placeholders
  await expect(page.locator('.images-panel')).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// URL entry and real-time resolution
// ---------------------------------------------------------------------------

test('entering a Steam URL resolves placeholder in preview', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill(CONFLUENCE_WITH_IMAGES);
  await page.waitForTimeout(500);

  // Should start with 2 placeholder cards
  await expect(page.locator('.steam-img-placeholder')).toHaveCount(2);

  // Enter URL for the first image
  const urlInput = page.locator('[data-testid="image-url-hero.png"]');
  await urlInput.fill('https://cdn.cloudflare.steamstatic.com/steam/apps/123/hero.png');
  await page.waitForTimeout(300);

  // First placeholder should be replaced with a real image
  await expect(page.locator('.steam-img-placeholder')).toHaveCount(1);
  await expect(page.locator('.steam-img-placeholder')).toContainText('screenshot.gif');

  // The Images panel header should update count
  await expect(page.locator('.images-panel-header')).toContainText('1 needs Steam URL');
});

test('entering URL updates BBCode tab output', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill(CONFLUENCE_WITH_IMAGES);
  await page.waitForTimeout(500);

  // Enter URL for one image
  const urlInput = page.locator('[data-testid="image-url-hero.png"]');
  await urlInput.fill('https://cdn.steam.com/hero.png');
  await page.waitForTimeout(300);

  // Switch to BBCode tab and verify the URL replaced the placeholder
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  const bbcode = page.locator('.bbcode-readonly');
  await expect(bbcode).toContainText('[img]https://cdn.steam.com/hero.png[/img]');
  // The other image should still be a placeholder
  await expect(bbcode).toContainText('{image: screenshot.gif}');
});

// ---------------------------------------------------------------------------
// Lint warnings for unresolved placeholders
// ---------------------------------------------------------------------------

test('lint warns about unresolved placeholder images', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill(CONFLUENCE_WITH_IMAGES);
  await page.waitForTimeout(500);

  // Switch to BBCode tab to see lint warnings
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  const lintPanel = page.locator('.output-panel .panel-lint');

  // Should have warnings for both images
  const warnings = lintPanel.locator('.lint-message.warning');
  const warningTexts = await warnings.allTextContents();
  const placeholderWarnings = warningTexts.filter(t => t.includes('upload to Steam'));
  expect(placeholderWarnings.length).toBe(2);
});

test('resolving an image URL reduces lint warning count', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill(CONFLUENCE_WITH_IMAGES);
  await page.waitForTimeout(500);

  // Enter URL for one image
  await page.locator('[data-testid="image-url-hero.png"]').fill('https://cdn.steam.com/hero.png');
  await page.waitForTimeout(300);

  // Switch to BBCode tab — should now have 1 placeholder warning instead of 2
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  const lintPanel = page.locator('.output-panel .panel-lint');
  const warnings = lintPanel.locator('.lint-message.warning');
  const warningTexts = await warnings.allTextContents();
  const placeholderWarnings = warningTexts.filter(t => t.includes('upload to Steam'));
  expect(placeholderWarnings.length).toBe(1);
  expect(placeholderWarnings[0]).toContain('screenshot.gif');
});

// ---------------------------------------------------------------------------
// Collapse/expand
// ---------------------------------------------------------------------------

test('Images panel can be collapsed and expanded', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill(CONFLUENCE_WITH_IMAGES);
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
// Copy BBCode uses resolved URLs
// ---------------------------------------------------------------------------

test('copy BBCode includes resolved URLs, not placeholders', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill(CONFLUENCE_WITH_IMAGES);
  await page.waitForTimeout(500);

  // Resolve one image
  await page.locator('[data-testid="image-url-hero.png"]').fill('https://cdn.steam.com/hero.png');
  await page.waitForTimeout(300);

  // Copy BBCode
  const copyBtn = page.locator('.output-panel .btn-primary');
  await copyBtn.click();

  // Verify clipboard
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain('[img]https://cdn.steam.com/hero.png[/img]');
  expect(clipboardText).toContain('{image: screenshot.gif}');
});
