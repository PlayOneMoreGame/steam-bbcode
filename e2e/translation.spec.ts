import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
});

// ---------------------------------------------------------------------------
// Two-row header: View mode + Language selector
// ---------------------------------------------------------------------------

test('output panel has view mode tabs and language bar', async ({ page }) => {
  // Row 1: View mode tabs
  const viewTabs = page.locator('[data-testid="view-mode-tabs"]');
  await expect(viewTabs).toBeVisible();
  await expect(viewTabs).toContainText('Steam Preview');
  await expect(viewTabs).toContainText('BBCode');

  // Row 2: Language bar with English and + Translate
  const langBar = page.locator('[data-testid="lang-bar"]');
  await expect(langBar).toBeVisible();
  await expect(page.locator('[data-testid="lang-english"]')).toBeVisible();
  await expect(page.locator('[data-testid="translate-add"]')).toBeVisible();
});

test('clicking + Translate shows language options', async ({ page }) => {
  await page.locator('[data-testid="translate-add"]').click();
  const menu = page.locator('.translate-dropdown-menu');
  await expect(menu).toBeVisible();
  await expect(menu).toContainText('Brazilian Portuguese');
  await expect(menu).toContainText('Latin American Spanish');
});

// ---------------------------------------------------------------------------
// API key dialog
// ---------------------------------------------------------------------------

test('selecting a language without API key shows the API key dialog', async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('steambb-anthropic-api-key'));

  await page.locator('[data-testid="translate-add"]').click();
  await page.locator('.dropdown-item', { hasText: 'Brazilian Portuguese' }).click();

  const dialog = page.locator('.api-key-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Translation Key');
  await expect(dialog).toContainText('stored locally');
});

test('API key dialog closes on Escape', async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('steambb-anthropic-api-key'));

  await page.locator('[data-testid="translate-add"]').click();
  await page.locator('.dropdown-item', { hasText: 'Brazilian Portuguese' }).click();

  const dialog = page.locator('.api-key-dialog');
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('API key dialog validates input', async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('steambb-anthropic-api-key'));

  await page.locator('[data-testid="translate-add"]').click();
  await page.locator('.dropdown-item', { hasText: 'Brazilian Portuguese' }).click();

  await page.locator('.api-key-dialog .btn-primary').click();
  await expect(page.locator('.api-key-dialog-error')).toContainText('Please enter');

  await page.locator('.api-key-dialog-input').fill('not-a-valid-key');
  await page.locator('.api-key-dialog .btn-primary').click();
  await expect(page.locator('.api-key-dialog-error')).toContainText('sk-');
});

// ---------------------------------------------------------------------------
// Translation with mocked API
// ---------------------------------------------------------------------------

test('translation language pill appears after successful translation', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('steambb-anthropic-api-key', 'sk-ant-test-key');
  });

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

  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('# Patch Notes');

  await page.locator('[data-testid="translate-add"]').click();
  await page.locator('.dropdown-item', { hasText: 'Latin American Spanish' }).click();

  // Language pill appears in the lang bar
  const langPill = page.locator('[data-testid="lang-es-LATAM"]');
  await expect(langPill).toBeVisible({ timeout: 5000 });

  // Default view mode is Steam Preview — rendered content visible
  const preview = page.locator('.preview');
  await expect(preview).toContainText('Notas del parche');

  // Switch view mode to BBCode to see raw BBCode
  await page.locator('[data-testid="view-mode-tabs"] button', { hasText: 'BBCode' }).click();
  await expect(page.locator('.bbcode-readonly')).toContainText('[h1]Notas del parche[/h1]');

  // Switch back to English
  await page.locator('[data-testid="lang-english"]').click();
  await page.locator('[data-testid="view-mode-tabs"] button', { hasText: 'Steam Preview' }).click();
  await expect(page.locator('.preview')).toContainText('Patch Notes');
});

test('view mode and language are independent dimensions', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('steambb-anthropic-api-key', 'sk-ant-test-key');
  });

  await page.route('https://api.anthropic.com/v1/messages', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: '[h2]Santuarios[/h2]' }],
        model: 'claude-haiku-4-5-20251001',
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    });
  });

  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('## Sanctuaries');

  // Translate
  await page.locator('[data-testid="translate-add"]').click();
  await page.locator('.dropdown-item', { hasText: 'Latin American Spanish' }).click();
  await expect(page.locator('[data-testid="lang-es-LATAM"]')).toBeVisible({ timeout: 5000 });

  // Set view mode to BBCode
  await page.locator('[data-testid="view-mode-tabs"] button', { hasText: 'BBCode' }).click();

  // Switch between languages — view mode stays BBCode
  await page.locator('[data-testid="lang-english"]').click();
  await expect(page.locator('.bbcode-readonly')).toContainText('[h2]Sanctuaries[/h2]');

  await page.locator('[data-testid="lang-es-LATAM"]').click();
  await expect(page.locator('.bbcode-readonly')).toContainText('[h2]Santuarios[/h2]');

  // Switch view mode to Preview — stays on es-LATAM
  await page.locator('[data-testid="view-mode-tabs"] button', { hasText: 'Steam Preview' }).click();
  await expect(page.locator('.preview')).toContainText('Santuarios');
});

// ---------------------------------------------------------------------------
// Stale indicator
// ---------------------------------------------------------------------------

test('stale indicator appears when source changes after translation', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('steambb-anthropic-api-key', 'sk-ant-test-key');
  });

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

  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('# Hello');

  await page.locator('[data-testid="translate-add"]').click();
  await page.locator('.dropdown-item', { hasText: 'Brazilian Portuguese' }).click();

  const langPill = page.locator('[data-testid="lang-pt-BR"]');
  await expect(langPill).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.translation-badge.done')).toBeVisible();

  // Change source content
  await mdEditor.fill('# Goodbye');

  // Stale badge should appear on the language pill
  await expect(page.locator('.translation-badge.stale')).toBeVisible({ timeout: 3000 });
});
