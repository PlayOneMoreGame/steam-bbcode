import { test, expect } from '@playwright/test';

test('converts markdown to bbcode', async ({ page }) => {
  await page.goto('/');
  
  // Type in markdown panel
  const mdEditor = page.locator('.panel').first().locator('textarea');
  await mdEditor.fill('# Hello World\n\nThis is **bold** text.');
  
  // Check BBCode output
  const bbEditor = page.locator('.panel').nth(1).locator('textarea');
  await expect(bbEditor).toContainText('[h1]Hello World[/h1]');
  await expect(bbEditor).toContainText('[b]bold[/b]');
});

test('shows lint errors for invalid bbcode', async ({ page }) => {
  await page.goto('/');
  
  // Type invalid BBCode directly
  const bbEditor = page.locator('.panel').nth(1).locator('textarea');
  await bbEditor.fill('[b]unclosed');
  
  // Check for error
  await expect(page.locator('.lint-message.error')).toBeVisible();
});

test('copy button works', async ({ page }) => {
  await page.goto('/');
  
  const copyBtn = page.locator('.panel').nth(1).getByRole('button', { name: 'Copy' });
  await copyBtn.click();
  
  await expect(copyBtn).toContainText('Copied');
});
