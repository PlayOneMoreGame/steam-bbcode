import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
});

// ---------------------------------------------------------------------------
// Translate dropdown is visible
// ---------------------------------------------------------------------------

test('translate dropdown button is visible in the output panel', async ({ page }) => {
  const translateBtn = page.locator('.translate-trigger');
  await expect(translateBtn).toBeVisible();
  await expect(translateBtn).toContainText('Translate');
});

test('clicking translate dropdown shows language options', async ({ page }) => {
  await page.locator('.translate-trigger').click();
  const menu = page.locator('.translate-dropdown-menu');
  await expect(menu).toBeVisible();
  await expect(menu).toContainText('Brazilian Portuguese');
  await expect(menu).toContainText('Latin American Spanish');
});

// ---------------------------------------------------------------------------
// API key dialog
// ---------------------------------------------------------------------------

test('selecting a language without API key shows the API key dialog', async ({ page }) => {
  // Clear any stored API key
  await page.evaluate(() => localStorage.removeItem('steambb-anthropic-api-key'));

  // Click translate and select a language
  await page.locator('.translate-trigger').click();
  await page.locator('.dropdown-item', { hasText: 'Brazilian Portuguese' }).click();

  // API key dialog should appear
  const dialog = page.locator('.api-key-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Anthropic API Key');
  await expect(dialog).toContainText('stored locally');
});

test('API key dialog closes on Escape', async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('steambb-anthropic-api-key'));

  await page.locator('.translate-trigger').click();
  await page.locator('.dropdown-item', { hasText: 'Brazilian Portuguese' }).click();

  const dialog = page.locator('.api-key-dialog');
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('API key dialog validates input', async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('steambb-anthropic-api-key'));

  await page.locator('.translate-trigger').click();
  await page.locator('.dropdown-item', { hasText: 'Brazilian Portuguese' }).click();

  // Try saving empty
  await page.locator('.api-key-dialog .btn-primary').click();
  await expect(page.locator('.api-key-dialog-error')).toContainText('Please enter');

  // Try saving non-sk key
  await page.locator('.api-key-dialog-input').fill('not-a-valid-key');
  await page.locator('.api-key-dialog .btn-primary').click();
  await expect(page.locator('.api-key-dialog-error')).toContainText('sk-');
});

// ---------------------------------------------------------------------------
// Translation with mocked API
// ---------------------------------------------------------------------------

test('translation tab appears after successful translation', async ({ page }) => {
  // Set API key
  await page.evaluate(() => {
    localStorage.setItem('steambb-anthropic-api-key', 'sk-ant-test-key');
  });

  // Intercept the Anthropic API call
  await page.route('https://api.anthropic.com/v1/messages', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: '[h1]Notas del parche[/h1]' }],
        model: 'claude-haiku-4-5-20251001',
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    });
  });

  // Type some content
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('# Patch Notes');

  // Trigger translation
  await page.locator('.translate-trigger').click();
  await page.locator('.dropdown-item', { hasText: 'Latin American Spanish' }).click();

  // Wait for the translation tab to appear
  const translationTab = page.locator('.preview-tab', { hasText: 'ES-LATAM' });
  await expect(translationTab).toBeVisible({ timeout: 5000 });

  // The translated content should be visible
  await expect(page.locator('.bbcode-readonly')).toContainText('Notas del parche');
});

// ---------------------------------------------------------------------------
// Stale indicator
// ---------------------------------------------------------------------------

test('stale indicator appears when source changes after translation', async ({ page }) => {
  // Set API key
  await page.evaluate(() => {
    localStorage.setItem('steambb-anthropic-api-key', 'sk-ant-test-key');
  });

  // Mock API
  await page.route('https://api.anthropic.com/v1/messages', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: '[h1]Ola[/h1]' }],
        model: 'claude-haiku-4-5-20251001',
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    });
  });

  // Set initial content
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('# Hello');

  // Translate
  await page.locator('.translate-trigger').click();
  await page.locator('.dropdown-item', { hasText: 'Brazilian Portuguese' }).click();

  // Wait for translation to complete
  const translationTab = page.locator('.preview-tab', { hasText: 'PT-BR' });
  await expect(translationTab).toBeVisible({ timeout: 5000 });

  // Check for the done badge
  await expect(page.locator('.translation-badge.done')).toBeVisible();

  // Change the source content
  await mdEditor.fill('# Goodbye');

  // The stale badge should appear
  await expect(page.locator('.translation-badge.stale')).toBeVisible({ timeout: 3000 });
});
