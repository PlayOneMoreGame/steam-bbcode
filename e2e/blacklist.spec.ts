import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
});

// ---------------------------------------------------------------------------
// Settings panel
// ---------------------------------------------------------------------------

test('settings button toggles settings panel', async ({ page }) => {
  const settingsBtn = page.getByTestId('settings-btn');
  await expect(page.getByTestId('settings-panel')).not.toBeVisible();

  await settingsBtn.click();
  await expect(page.getByTestId('settings-panel')).toBeVisible();

  await settingsBtn.click();
  await expect(page.getByTestId('settings-panel')).not.toBeVisible();
});

test('add and remove blacklist terms in settings', async ({ page }) => {
  // Open settings
  await page.getByTestId('settings-btn').click();
  await expect(page.getByTestId('settings-panel')).toBeVisible();

  // Add a term
  const input = page.getByTestId('blacklist-input');
  await input.fill('badword');
  await page.getByTestId('blacklist-add-btn').click();

  // Chip should appear
  const chips = page.getByTestId('blacklist-chip');
  await expect(chips).toHaveCount(1);
  await expect(chips.first()).toContainText('badword');

  // Input should be cleared
  await expect(input).toHaveValue('');

  // Add another term via Enter key
  await input.fill('forbidden');
  await input.press('Enter');
  await expect(chips).toHaveCount(2);

  // Remove first term
  await chips.first().locator('.settings-chip-remove').click();
  await expect(chips).toHaveCount(1);
  await expect(chips.first()).toContainText('forbidden');
});

// ---------------------------------------------------------------------------
// Blacklist warnings in editor
// ---------------------------------------------------------------------------

test('blacklisted terms produce lint warnings', async ({ page }) => {
  // Set up blacklist via localStorage before navigating
  await page.evaluate(() => {
    localStorage.setItem('steambb-blacklist-terms', JSON.stringify(['badword']));
  });
  await page.reload();

  // Type text containing blacklisted term
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('This text has badword in it');

  // Should see a warning in the lint panel
  const lintPanel = page.locator('.panel').first().locator('.panel-lint');
  await expect(lintPanel).toBeVisible();

  // Warning should contain the expected message format
  const warningMessage = lintPanel.locator('.lint-message.warning');
  await expect(warningMessage.first()).toContainText("'badword' may not be appropriate");
});

test('blacklist warnings do not block copy', async ({ page }) => {
  // Set up blacklist
  await page.evaluate(() => {
    localStorage.setItem('steambb-blacklist-terms', JSON.stringify(['badword']));
  });
  await page.reload();

  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('This has a badword in it');

  // Copy BBCode button should still be enabled (blacklist = warnings, not errors)
  const copyBtn = page.locator('.output-panel .btn-primary');
  await expect(copyBtn).toBeEnabled();
});

// ---------------------------------------------------------------------------
// Blacklist highlighting in editor
// ---------------------------------------------------------------------------

test('blacklisted terms get highlight-blacklist class in editor overlay', async ({ page }) => {
  // Set up blacklist
  await page.evaluate(() => {
    localStorage.setItem('steambb-blacklist-terms', JSON.stringify(['badword']));
  });
  await page.reload();

  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('This has a badword in it');

  // Check for the highlight-blacklist span in the syntax highlight overlay
  const highlightSpan = page.locator('.syntax-highlight .highlight-blacklist');
  await expect(highlightSpan).toHaveCount(1);
  await expect(highlightSpan).toContainText('badword');
});

// ---------------------------------------------------------------------------
// Warning message format
// ---------------------------------------------------------------------------

test('blacklist warning has correct message format and help text', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('steambb-blacklist-terms', JSON.stringify(['forbidden']));
  });
  await page.reload();

  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('The forbidden zone');

  const lintPanel = page.locator('.panel').first().locator('.panel-lint');
  await expect(lintPanel).toBeVisible();

  // Check message format
  const warning = lintPanel.locator('.lint-message.warning').first();
  await expect(warning).toContainText("'forbidden' may not be appropriate");

  // Check help text is expandable
  const whyButton = warning.locator('.lint-help-toggle');
  await expect(whyButton).toBeVisible();
  await whyButton.click();
  const helpText = lintPanel.locator('.lint-help-text').first();
  await expect(helpText).toContainText('blacklist');
  await expect(helpText).toContainText('Settings');
});
