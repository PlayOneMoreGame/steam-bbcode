import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
});

// ---------------------------------------------------------------------------
// Cmd+N (New) — resets editor to welcome document
// ---------------------------------------------------------------------------

test('cmd+n resets editor to welcome document', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');

  // Type something to change the content
  await mdEditor.fill('# Custom content\n\nThis is not the welcome doc.');
  await expect(mdEditor).toHaveValue(/Custom content/);

  // Accept the unsaved changes confirmation dialog
  page.on('dialog', dialog => dialog.accept());

  // Dispatch Cmd+N
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'n',
      code: 'KeyN',
      metaKey: true,
      bubbles: true,
    }));
  });

  // Editor should reset to welcome doc
  await expect(mdEditor).toHaveValue(/Welcome to SteamBBEditor/);

  // Preview should show welcome content
  await expect(page.locator('.preview.preview-bbcode')).toContainText('Welcome to SteamBBEditor');
});

test('cmd+n resets file name and content', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');

  // Edit content
  await mdEditor.fill('# Some file content');

  // Accept the unsaved changes confirmation dialog
  page.on('dialog', dialog => dialog.accept());

  // Dispatch Cmd+N
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'n',
      code: 'KeyN',
      metaKey: true,
      bubbles: true,
    }));
  });

  // Editor should reset to welcome doc
  await expect(mdEditor).toHaveValue(/Welcome to SteamBBEditor/);

  // Preview should show welcome content
  await expect(page.locator('.preview.preview-bbcode')).toContainText('Welcome to SteamBBEditor');
});

// ---------------------------------------------------------------------------
// Existing shortcuts still work
// ---------------------------------------------------------------------------

test('cmd+shift+c shortcut still copies bbcode', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('**bold text**');

  // Wait for conversion
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  await expect(page.locator('.bbcode-readonly')).toContainText('[b]bold text[/b]');

  // Dispatch Cmd+Shift+C
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'C',
      code: 'KeyC',
      metaKey: true,
      shiftKey: true,
      bubbles: true,
    }));
  });

  // Verify clipboard
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain('[b]bold text[/b]');
});

// ---------------------------------------------------------------------------
// Footer shows Cmd+N hint
// ---------------------------------------------------------------------------

test('footer keyboard hints include New shortcut', async ({ page }) => {
  const hints = page.locator('.keyboard-hints');
  await expect(hints).toContainText('New');
  await expect(hints).toContainText('Open');
  await expect(hints).toContainText('Save As');
  await expect(hints).toContainText('Copy BBCode');
  await expect(hints).toContainText('Preview');
  await expect(hints).toContainText('BBCode');
});

// ---------------------------------------------------------------------------
// Cmd+1 / Cmd+2 — tab switching in output panel
// ---------------------------------------------------------------------------

test('cmd+1 switches to Preview tab', async ({ page }) => {
  // Start by switching to BBCode tab
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
  await expect(page.locator('.output-panel .preview-tab.active')).toHaveText('BBCode');

  // Dispatch Cmd+1
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: '1',
      code: 'Digit1',
      metaKey: true,
      bubbles: true,
    }));
  });

  // Preview tab should now be active
  await expect(page.locator('.output-panel .preview-tab.active')).toHaveText('Steam Preview');
});

test('cmd+2 switches to BBCode tab', async ({ page }) => {
  // Verify we start on Preview
  await expect(page.locator('.output-panel .preview-tab.active')).toHaveText('Steam Preview');

  // Dispatch Cmd+2
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: '2',
      code: 'Digit2',
      metaKey: true,
      bubbles: true,
    }));
  });

  // BBCode tab should now be active
  await expect(page.locator('.output-panel .preview-tab.active')).toHaveText('BBCode');
});
