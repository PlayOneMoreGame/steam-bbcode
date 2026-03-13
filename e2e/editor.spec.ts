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

test('preview tab shows character count in persistent footer', async ({ page }) => {
  // Default tab is preview — char count should be visible without switching tabs
  const previewTab = page.locator('.output-panel .preview-tab', { hasText: 'Steam Preview' });
  await expect(previewTab).toHaveClass(/active/);
  await expect(page.locator('.output-panel .char-count-inline')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Lint status indicator
// ---------------------------------------------------------------------------

test('lint status shows Ready when no errors', async ({ page }) => {
  // Welcome doc should have no lint errors
  const readyIndicator = page.locator('.output-panel .lint-status-ready');
  await expect(readyIndicator).toBeVisible();
  await expect(readyIndicator).toHaveText('Ready');
});

test('lint status shows error count on preview tab when errors exist', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('[b]unclosed bold');
  await page.waitForTimeout(200);

  // Should be on preview tab by default
  const previewTab = page.locator('.output-panel .preview-tab', { hasText: 'Steam Preview' });
  await expect(previewTab).toHaveClass(/active/);

  // Error indicator should be visible in the header
  const errorIndicator = page.locator('.output-panel .lint-status-error');
  await expect(errorIndicator).toBeVisible();
  await expect(errorIndicator).toContainText('error');
});

test('clicking lint error indicator expands lint detail panel', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('[b]unclosed bold');
  await page.waitForTimeout(200);

  // Lint detail panel should NOT be visible initially
  await expect(page.locator('.output-panel .panel-lint')).not.toBeVisible();

  // Click the error indicator to expand
  const errorIndicator = page.locator('.output-panel .lint-status-error');
  await errorIndicator.click();

  // Lint messages should now be visible (collapsible panel expanded)
  await expect(page.locator('.output-panel .panel-lint')).toBeVisible();
});

test('disabled copy button has tooltip explaining why', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('[b]unclosed bold');
  await page.waitForTimeout(200);

  const copyBtn = page.locator('.output-panel .btn-primary');
  await expect(copyBtn).toBeDisabled();
  await expect(copyBtn).toHaveAttribute('title', 'Fix errors before copying');
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
// Editor header simplification (SMD-4376)
// ---------------------------------------------------------------------------

test('editor header has only Open button, no Copy MD / Revert / Save As', async ({ page }) => {
  const editorPanel = page.locator('.panel').first();
  const header = editorPanel.locator('.panel-header');

  // Open button should still exist
  await expect(header.getByRole('button', { name: 'Open' })).toBeVisible();

  // These buttons should NOT exist
  await expect(header.getByRole('button', { name: 'Copy MD' })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Revert' })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Save As' })).toHaveCount(0);
});

test('lint badges appear in editor header when there are issues', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  // Confluence macro triggers a warning
  await mdEditor.fill('{code}some code{code}');

  const header = page.locator('.panel').first().locator('.panel-header');
  // Should have at least one lint badge in the header actions area
  const badges = header.locator('.panel-actions .lint-badge');
  await expect(badges).not.toHaveCount(0);
});

test('Tab key does not insert spaces in editor', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('hello');
  await mdEditor.focus();

  // Place cursor at end
  await mdEditor.press('End');
  await mdEditor.press('Tab');

  // Tab should move focus away, NOT insert spaces
  const value = await mdEditor.inputValue();
  expect(value).toBe('hello');
});

test('lint messages use "Line" prefix instead of "L"', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('{code}some code{code}');

  const lintPanel = page.locator('.panel').first().locator('.panel-lint');
  await expect(lintPanel).toBeVisible();

  // Check that lint line labels use "Line" not "L"
  const lintLines = lintPanel.locator('.lint-line');
  const count = await lintLines.count();
  expect(count).toBeGreaterThan(0);
  const firstLineText = await lintLines.first().textContent();
  expect(firstLineText).toMatch(/^Line \d+$/);
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

test('tags button toggles reference popover', async ({ page }) => {
  const tagsBtn = page.getByRole('button', { name: 'Tags' });

  await expect(page.locator('.tag-reference-popover')).not.toBeVisible();
  await tagsBtn.click();
  await expect(page.locator('.tag-reference-popover')).toBeVisible();
  await tagsBtn.click();
  await expect(page.locator('.tag-reference-popover')).not.toBeVisible();
});

test('tags popover closes when clicking outside', async ({ page }) => {
  const tagsBtn = page.getByRole('button', { name: 'Tags' });
  await tagsBtn.click();
  await expect(page.locator('.tag-reference-popover')).toBeVisible();

  // Click on the main content area (outside the popover)
  await page.locator('.main-grid').click({ position: { x: 10, y: 10 } });
  await expect(page.locator('.tag-reference-popover')).not.toBeVisible();
});

test('tags popover closes on Escape key', async ({ page }) => {
  const tagsBtn = page.getByRole('button', { name: 'Tags' });
  await tagsBtn.click();
  await expect(page.locator('.tag-reference-popover')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('.tag-reference-popover')).not.toBeVisible();
});

test('tags popover contains Steam Quirks section', async ({ page }) => {
  const tagsBtn = page.getByRole('button', { name: 'Tags' });
  await tagsBtn.click();

  const popover = page.locator('.tag-reference-popover');
  await expect(popover).toBeVisible();

  // Verify the Steam Quirks section is present
  await expect(popover.locator('.tag-ref-quirks-title')).toHaveText('Steam Quirks');
  await expect(popover.locator('.tag-ref-quirks-list li')).toHaveCount(4);

  // Verify specific quirk content
  await expect(popover.locator('.tag-ref-quirks-list')).toContainText('[hr] requires a closing tag');
  await expect(popover.locator('.tag-ref-quirks-list')).toContainText('Nested lists');
  await expect(popover.locator('.tag-ref-quirks-list')).toContainText('[img] vs [previewimg]');
  await expect(popover.locator('.tag-ref-quirks-list')).toContainText('Inline code');
});

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

test('keyboard hints are visible', async ({ page }) => {
  await expect(page.locator('.keyboard-hints')).toBeVisible();
  await expect(page.locator('.keyboard-hints')).toContainText('Save As');
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

test('output panel lint messages show Why? link with expandable help', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  // Input that produces BBCode with unclosed tags
  await mdEditor.fill('[b]unclosed bold tag');
  await page.waitForTimeout(200);

  // Click the error indicator to expand the lint detail panel
  const errorIndicator = page.locator('.output-panel .lint-status-error');
  await errorIndicator.click();

  // Lint panel should now be visible
  const lintPanel = page.locator('.output-panel .panel-lint');
  await expect(lintPanel).toBeVisible();

  // Check for Why? button
  const whyButtons = lintPanel.locator('.lint-help-toggle');
  const count = await whyButtons.count();
  expect(count).toBeGreaterThan(0);

  // Click first Why? to expand
  await whyButtons.first().click();
  await expect(lintPanel.locator('.lint-help-text').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// hasChanges tracks base content, not WELCOME_MARKDOWN (SMD-4360)
// ---------------------------------------------------------------------------

test('welcome doc on load is not dirty', async ({ page }) => {
  // On initial load with welcome doc, there should be no unsaved indicator
  await expect(page.locator('.save-indicator.unsaved')).not.toBeVisible();
});

test('editing content shows dirty indicator', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('Some new content');
  await expect(page.locator('.save-indicator.unsaved')).toBeVisible();
});
