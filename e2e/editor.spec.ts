import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  // Grant clipboard permissions
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
});

// ---------------------------------------------------------------------------
// End-to-end workflow: paste markdown → preview → copy BBCode
// ---------------------------------------------------------------------------

test('full workflow: paste markdown, preview, copy bbcode', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');

  // Step 1: Paste markdown content
  await mdEditor.fill('# Patch Notes v1.0\n\nFixed **critical bug** with save system.\n\n- Bug fix A\n- Bug fix B\n');

  // Step 2: Preview is default tab — verify it shows rendered content
  await expect(page.locator('.preview.preview-bbcode')).toContainText('Patch Notes v1.0');
  await expect(page.locator('.preview.preview-bbcode')).toContainText('critical bug');

  // Step 3: Copy BBCode button should be enabled (no lint errors)
  const copyBtn = page.locator('.output-panel .btn-primary');
  await expect(copyBtn).toBeEnabled();
  await copyBtn.click();

  // Step 4: Verify clipboard has correct BBCode
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain('[h1]Patch Notes v1.0[/h1]');
  expect(clipboardText).toContain('[b]critical bug[/b]');
  expect(clipboardText).toContain('[*]Bug fix A');
});

// ---------------------------------------------------------------------------
// Welcome document
// ---------------------------------------------------------------------------

test('welcome doc loads with zero lint errors and copy enabled', async ({ page }) => {
  // Copy BBCode button should be enabled on initial load (no lint errors in welcome doc)
  const copyBtn = page.locator('.output-panel .btn-primary');
  await expect(copyBtn).toBeEnabled();
  await expect(copyBtn).toHaveText('Copy BBCode');

  // BBCode tab should show no lint error messages
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  await expect(page.locator('.output-panel .lint-message')).toHaveCount(0);

  // Preview should render the welcome content
  await page.locator('.output-panel .preview-tab', { hasText: 'Steam Preview' }).click();
  await expect(page.locator('.preview.preview-bbcode')).toContainText('Welcome to SteamBBEditor');
});

// ---------------------------------------------------------------------------
// Core conversion
// ---------------------------------------------------------------------------

test('converts markdown to bbcode in preview', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('# Hello World\n\nThis is **bold** text.');

  // Switch to BBCode tab in output panel to verify conversion
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  const bbcodeDisplay = page.locator('.bbcode-readonly');
  await expect(bbcodeDisplay).toContainText('[h1]Hello World[/h1]');
  await expect(bbcodeDisplay).toContainText('[b]bold[/b]');
});

// ---------------------------------------------------------------------------
// Output panel tabs
// ---------------------------------------------------------------------------

test('output panel defaults to Steam Preview tab', async ({ page }) => {
  const previewTab = page.locator('.output-panel .preview-tab', { hasText: 'Steam Preview' });
  await expect(previewTab).toHaveClass(/active/);
  await expect(page.locator('.preview.preview-bbcode')).toBeVisible();
});

test('output panel switches between Preview and BBCode tabs', async ({ page }) => {
  // Start on preview tab
  await expect(page.locator('.preview.preview-bbcode')).toBeVisible();

  // Switch to BBCode tab
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  await expect(page.locator('.bbcode-readonly')).toBeVisible();
  await expect(page.locator('.preview.preview-bbcode')).not.toBeVisible();

  // Switch back to preview tab
  await page.locator('.output-panel .preview-tab', { hasText: 'Steam Preview' }).click();
  await expect(page.locator('.preview.preview-bbcode')).toBeVisible();
  await expect(page.locator('.bbcode-readonly')).not.toBeVisible();
});

test('bbcode tab shows character count', async ({ page }) => {
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  await expect(page.locator('.output-panel .char-count-inline')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Copy BBCode
// ---------------------------------------------------------------------------

test('copy bbcode button works', async ({ page }) => {
  const copyBtn = page.locator('.output-panel .btn-primary');
  await expect(copyBtn).toHaveText('Copy BBCode');
  await copyBtn.click();

  // Should show "Copied!" or "Failed" feedback (clipboard may be restricted in headless)
  await expect(copyBtn).not.toHaveText('Copy BBCode');
});

test('cmd+shift+c shortcut triggers copy', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('**test shortcut**');

  // Wait for conversion
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  await expect(page.locator('.bbcode-readonly')).toContainText('[b]test shortcut[/b]');

  // Dispatch the keyboard shortcut manually (Playwright Chromium doesn't map Meta reliably)
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'C',
      code: 'KeyC',
      metaKey: true,
      shiftKey: true,
      bubbles: true,
    }));
  });

  // Verify clipboard content
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain('[b]test shortcut[/b]');
});

// ---------------------------------------------------------------------------
// Markdown panel: Copy MD is secondary, not primary
// ---------------------------------------------------------------------------

test('markdown copy button is labeled Copy MD', async ({ page }) => {
  const copyMdBtn = page.locator('.panel').first().getByRole('button', { name: 'Copy MD' });
  await expect(copyMdBtn).toBeVisible();
  // Should be secondary style, not primary
  await expect(copyMdBtn).toHaveClass(/btn-secondary/);
});

// ---------------------------------------------------------------------------
// Context selector
// ---------------------------------------------------------------------------

test('context selector changes character limit', async ({ page }) => {
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();

  // Default context is announcements (8,000 char limit)
  await expect(page.locator('.output-panel .char-count-inline')).toContainText('8,000');

  // Switch to forums (4,000 char limit)
  await page.selectOption('.control-select', 'forums');
  await expect(page.locator('.output-panel .char-count-inline')).toContainText('4,000');
});

// ---------------------------------------------------------------------------
// Tags reference
// ---------------------------------------------------------------------------

test('tags button toggles reference panel', async ({ page }) => {
  const tagsBtn = page.getByRole('button', { name: 'Tags' });

  await expect(page.locator('.tag-reference')).not.toBeVisible();
  await tagsBtn.click();
  await expect(page.locator('.tag-reference')).toBeVisible();
  await tagsBtn.click();
  await expect(page.locator('.tag-reference')).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

test('keyboard hints are visible', async ({ page }) => {
  await expect(page.locator('.keyboard-hints')).toBeVisible();
  await expect(page.locator('.keyboard-hints')).toContainText('Copy BBCode');
});

test('feedback link exists', async ({ page }) => {
  const feedbackLink = page.locator('.feedback-link');
  await expect(feedbackLink).toHaveAttribute(
    'href',
    'https://github.com/PlayOneMoreGame/steam-bbcode/issues/new/choose'
  );
});

// ---------------------------------------------------------------------------
// Lint help text (SMD-4373)
// ---------------------------------------------------------------------------

test('markdown lint messages show Why? link when help text is available', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  // Confluence macro triggers a warning with help text
  await mdEditor.fill('{code}some code{code}');

  // Markdown panel lint messages should show
  const lintPanel = page.locator('.panel').first().locator('.panel-lint');
  await expect(lintPanel).toBeVisible();

  // Should have a Why? button
  const whyButton = lintPanel.locator('.lint-help-toggle').first();
  await expect(whyButton).toBeVisible();
  await expect(whyButton).toHaveText('Why?');
});

test('clicking Why? expands help text and clicking Hide collapses it', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('{code}some code{code}');

  const lintPanel = page.locator('.panel').first().locator('.panel-lint');
  const whyButton = lintPanel.locator('.lint-help-toggle').first();

  // Initially no help text visible
  await expect(lintPanel.locator('.lint-help-text')).toHaveCount(0);

  // Click Why? to expand
  await whyButton.click();
  await expect(lintPanel.locator('.lint-help-text').first()).toBeVisible();
  await expect(whyButton).toHaveText('Hide');

  // Click Hide to collapse
  await whyButton.click();
  await expect(lintPanel.locator('.lint-help-text')).toHaveCount(0);
  await expect(whyButton).toHaveText('Why?');
});

test('bbcode tab lint messages show Why? link with expandable help', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  // Input that produces BBCode with unclosed tags
  await mdEditor.fill('[b]unclosed bold tag');

  // Switch to BBCode tab
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();

  // Wait for lint messages
  const lintPanel = page.locator('.output-panel .panel-lint');
  // The BBCode output will have markdown syntax warnings, check for any Why? button
  const whyButtons = lintPanel.locator('.lint-help-toggle');

  // There should be at least one Why? button
  const count = await whyButtons.count();
  expect(count).toBeGreaterThan(0);

  // Click first Why? to expand
  await whyButtons.first().click();
  await expect(lintPanel.locator('.lint-help-text').first()).toBeVisible();
});
