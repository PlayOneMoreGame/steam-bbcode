import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('Resizable Split Panes', () => {
  test('resize handle is visible between panels', async ({ page }) => {
    const handle = page.getByTestId('resize-handle');
    await expect(handle).toBeVisible();
    await expect(handle).toHaveCSS('cursor', 'col-resize');
  });

  test('resize handle has correct ARIA attributes', async ({ page }) => {
    const handle = page.getByTestId('resize-handle');
    await expect(handle).toHaveAttribute('role', 'separator');
    await expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    await expect(handle).toHaveAttribute('aria-label', 'Resize panels');
  });

  test('double-click resets to 50/50 split', async ({ page }) => {
    const handle = page.getByTestId('resize-handle');
    const mainGrid = page.locator('.main-grid.two-panel');

    // Set a non-50/50 ratio via localStorage, then reload
    await page.evaluate(() => {
      localStorage.setItem('steam-bbcode-split-ratio', JSON.stringify(0.35));
    });
    await page.reload();
    await page.waitForSelector('.main-grid.two-panel');

    // Verify the ratio is not 0.5
    const styleBefore = await mainGrid.getAttribute('style');
    expect(styleBefore).toContain('0.35fr');

    // Double-click the handle to reset
    const resetHandle = page.getByTestId('resize-handle');
    await resetHandle.dblclick();

    // After reset, the ratio should be 0.5 (50/50)
    const styleAfterReset = await mainGrid.getAttribute('style');
    expect(styleAfterReset).toContain('0.5fr');
  });

  test('resize handle is hidden on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    const handle = page.getByTestId('resize-handle');
    await expect(handle).toBeHidden();
  });

  test('split ratio persists across page reload', async ({ page }) => {
    const handle = page.getByTestId('resize-handle');
    const mainGrid = page.locator('.main-grid.two-panel');

    // Drag to change the ratio
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error('Handle not found');

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 150, handleBox.y + handleBox.height / 2, { steps: 5 });
    await page.mouse.up();

    // Get the style after dragging
    const styleAfterDrag = await mainGrid.getAttribute('style');

    // Reload and check it persisted
    await page.reload();
    await page.waitForSelector('.main-grid.two-panel');
    const styleAfterReload = await page.locator('.main-grid.two-panel').getAttribute('style');
    expect(styleAfterReload).toBe(styleAfterDrag);
  });
});
