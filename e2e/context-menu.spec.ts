import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
});

// ---------------------------------------------------------------------------
// Context menu: appearance and dismissal
// ---------------------------------------------------------------------------

test('right-click on editor shows context menu', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.click({ button: 'right' });

  const menu = page.locator('[data-testid="context-menu"]');
  await expect(menu).toBeVisible();

  // Should contain standard editing items
  await expect(menu.getByRole('menuitem', { name: 'Cut' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Copy' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Paste', exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Select All' })).toBeVisible();
});

test('context menu has Paste as Confluence option', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.click({ button: 'right' });

  const menu = page.locator('[data-testid="context-menu"]');
  await expect(menu.getByRole('menuitem', { name: 'Paste as Confluence' })).toBeVisible();
});

test('context menu has a separator before Paste as Confluence', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.click({ button: 'right' });

  const separators = page.locator('[data-testid="context-menu"] [role="separator"]');
  await expect(separators).toHaveCount(1);
});

test('context menu closes on Escape', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.click({ button: 'right' });

  const menu = page.locator('[data-testid="context-menu"]');
  await expect(menu).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
});

test('context menu closes on click outside', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.click({ button: 'right' });

  const menu = page.locator('[data-testid="context-menu"]');
  await expect(menu).toBeVisible();

  // Click on the header area (outside the context menu)
  await page.locator('.header').click();
  await expect(menu).not.toBeVisible();
});

test('context menu closes after clicking a menu item', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('hello world');

  // Select all text first
  await mdEditor.press('Meta+a');

  await mdEditor.click({ button: 'right' });

  const menu = page.locator('[data-testid="context-menu"]');
  await expect(menu).toBeVisible();

  // Click Select All
  await menu.getByRole('menuitem', { name: 'Select All' }).click();
  await expect(menu).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Context menu: Cut/Copy/Paste actions
// ---------------------------------------------------------------------------

test('Cut and Copy are disabled when nothing is selected', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('hello world');

  // Click at end without selecting
  await mdEditor.click();

  await mdEditor.click({ button: 'right' });

  const menu = page.locator('[data-testid="context-menu"]');
  await expect(menu.getByRole('menuitem', { name: 'Cut' })).toBeDisabled();
  await expect(menu.getByRole('menuitem', { name: 'Copy' })).toBeDisabled();
});

test('Cut and Copy are enabled when text is selected', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('hello world');

  // Select all
  await mdEditor.press('Meta+a');

  await mdEditor.click({ button: 'right', position: { x: 50, y: 10 } });

  const menu = page.locator('[data-testid="context-menu"]');
  await expect(menu.getByRole('menuitem', { name: 'Cut' })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: 'Copy' })).toBeEnabled();
});

test('Select All via context menu selects all text', async ({ page }) => {
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('hello world');

  await mdEditor.click({ button: 'right' });
  const menu = page.locator('[data-testid="context-menu"]');
  await menu.getByRole('menuitem', { name: 'Select All' }).click();

  // Verify selection covers all text
  const selectionLength = await mdEditor.evaluate((el: HTMLTextAreaElement) => {
    return el.selectionEnd - el.selectionStart;
  });
  expect(selectionLength).toBe('hello world'.length);
});

// ---------------------------------------------------------------------------
// Context menu: only on editor textarea (not read-only)
// ---------------------------------------------------------------------------

test('no custom context menu on output panel (read-only)', async ({ page }) => {
  // Switch to BBCode tab
  await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();

  const bbcodeArea = page.locator('.bbcode-readonly textarea');
  if (await bbcodeArea.count() > 0) {
    await bbcodeArea.click({ button: 'right' });
    // Should NOT show our custom context menu on read-only
    const menu = page.locator('[data-testid="context-menu"]');
    await expect(menu).not.toBeVisible();
  }
});
