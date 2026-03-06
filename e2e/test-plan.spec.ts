import { test, expect } from '@playwright/test';

// ============================================================================
// Test Plan Execution — steambb-test-plan.md
// Tests against the local web build (not staging — no basic auth tests here)
// ============================================================================

const MARKDOWN_INPUT = `# Patch Notes v2.0

**SWAPMEAT** — Major balance changes and bug fixes.

## Gameplay
- Currencies capped at 9999
- Renamed "Elite Enemies" to "Shiny Enemies"
- New "Flash Freeze" artifact replaces "Armor of Chill"

## Bug Fixes
- Fixed moleman leg "tunneling" off cliffs
- Fixed weapons retained between runs
- Fixed Frank's minions spawning less than designed

> Note: Performance tuning is still in progress.

Visit [Steam Community](https://steamcommunity.com) for feedback.`;

const CONFLUENCE_INPUT = `<h2 local-id="8c8c629dc341"><strong><u>Shrines</u></strong></h2>
<p local-id="8f9ecbf8916d">Shrines are large monuments found around planets that players can interact with to gain a global Boon (buff), and sometimes are paired with a Curse (debuff), that lasts for a period of time, for the duration of the planet, or for the duration of a run.</p><ac:image ac:align="center" ac:layout="center" ac:original-height="608" ac:original-width="640" ac:custom-width="true" ac:local-id="fbb78bea0669" ac:alt="Shrine_InGame_FirstPass_PatchEmbed.gif" ac:width="640"><ri:attachment ri:filename="Shrine_InGame_FirstPass_PatchEmbed.gif" ri:version-at-save="1" /></ac:image>
<p local-id="d5ba5d88caaa">Players will be able to see a Shrine icon on the compass when they are within range.</p>
<h2 local-id="90b2e85d"><strong><u>Gameplay</u></strong></h2>
<ul local-id="dd61402631a3">
<li local-id="07dca5561ff3"><p local-id="dc59b6cf08ec">A new event type called shrines has been added.</p></li>
<li local-id="06a1617b2a43"><p local-id="e1c6b0edaed1">Currencies have been capped to a max value of 9999</p></li>
<li local-id="f0b0dac0bfdb"><p local-id="463ccf06a936">Renamed "Elite Enemies" to "Shiny Enemies"</p></li>
</ul>`;

const PLAIN_INPUT = `Patch Notes v2.0

SWAPMEAT — Major update!

Gameplay Changes:
• Currencies capped at 9999
• New shrine events added
• Flash Freeze artifact replaces Armor of Chill

Bug Fixes:
• Fixed tunneling bug
• Fixed weapon retention between runs`;

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
});

// ============================================================================
// 2. Welcome Experience
// ============================================================================

test.describe('2. Welcome Experience', () => {
  test('app loads with welcome document', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await expect(mdEditor).toHaveValue(/Welcome to SteamBBEditor/);
    await page.screenshot({ path: '/private/tmp/test-plan/02-welcome.png', fullPage: true });
  });

  test('welcome doc describes correct workflow', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    const value = await mdEditor.inputValue();
    expect(value).toContain('preview');
    expect(value).toContain('Copy BBCode');
    expect(value).toContain('Steam');
  });

  test('no lint errors on welcome doc', async ({ page }) => {
    // Check editor panel has no lint messages
    await expect(page.locator('.panel').first().locator('.panel-lint .lint-message')).toHaveCount(0);
    // Check output panel — switch to BBCode tab
    await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
    await expect(page.locator('.output-panel .lint-message')).toHaveCount(0);
  });

  test('copy BBCode button enabled on welcome doc', async ({ page }) => {
    const copyBtn = page.locator('.output-panel .btn-primary');
    await expect(copyBtn).toBeEnabled();
  });

  test('keyboard shortcuts shown in footer', async ({ page }) => {
    const hints = page.locator('.keyboard-hints');
    await expect(hints).toContainText('Open');
    await expect(hints).toContainText('Save As');
    await expect(hints).toContainText('Copy BBCode');
  });

  test('two panels visible', async ({ page }) => {
    await expect(page.locator('.panel').first()).toBeVisible();
    await expect(page.locator('.output-panel')).toBeVisible();
  });
});

// ============================================================================
// 3. Markdown Input
// ============================================================================

test.describe('3. Markdown Input', () => {
  test('format badge shows MD', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(MARKDOWN_INPUT);
    await page.waitForTimeout(500);
    const badge = page.locator('.panel').first().locator('.format-badge');
    await expect(badge).toContainText('MD');
    await page.screenshot({ path: '/private/tmp/test-plan/03-markdown-input.png', fullPage: true });
  });

  test('preview renders headings, bold, lists, blockquote, link', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(MARKDOWN_INPUT);
    const preview = page.locator('.preview.preview-bbcode');
    await expect(preview).toContainText('Patch Notes v2.0');
    await expect(preview).toContainText('SWAPMEAT');
    await expect(preview).toContainText('Currencies capped');
    await expect(preview).toContainText('Performance tuning');
    await expect(preview).toContainText('Steam Community');
  });

  test('BBCode tab shows correct Steam BBCode', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(MARKDOWN_INPUT);
    await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
    const bbcode = page.locator('.bbcode-readonly');
    await expect(bbcode).toContainText('[h1]Patch Notes v2.0[/h1]');
    await expect(bbcode).toContainText('[b]SWAPMEAT[/b]');
    await expect(bbcode).toContainText('[*]Currencies capped at 9999');
    await expect(bbcode).toContainText('[quote]');
    await expect(bbcode).toContainText('[url=');
    await page.screenshot({ path: '/private/tmp/test-plan/03-bbcode-tab.png', fullPage: true });
  });

  test('no lint errors on markdown input', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(MARKDOWN_INPUT);
    await page.waitForTimeout(300);
    const lintStatus = page.locator('.output-panel .lint-status-ready');
    await expect(lintStatus).toBeVisible();
  });

  test('copy BBCode works', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(MARKDOWN_INPUT);
    const copyBtn = page.locator('.output-panel .btn-primary');
    await copyBtn.click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('[h1]Patch Notes v2.0[/h1]');
  });

  test('character count visible', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(MARKDOWN_INPUT);
    await expect(page.locator('.output-panel .char-count-inline')).toBeVisible();
  });
});

// ============================================================================
// 4. Confluence XHTML Input
// ============================================================================

test.describe('4. Confluence XHTML Input', () => {
  test('format badge switches to CONFLUENCE', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(CONFLUENCE_INPUT);
    await page.waitForTimeout(500);
    const badge = page.locator('.panel').first().locator('.format-badge');
    await expect(badge).toContainText('CONFLUENCE');
    await page.screenshot({ path: '/private/tmp/test-plan/04-confluence-input.png', fullPage: true });
  });

  test('preview renders headings, paragraphs, lists', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(CONFLUENCE_INPUT);
    const preview = page.locator('.preview.preview-bbcode');
    await expect(preview).toContainText('Shrines');
    await expect(preview).toContainText('large monuments');
    await expect(preview).toContainText('Currencies have been capped');
  });

  test('image placeholder appears', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(CONFLUENCE_INPUT);
    await expect(page.locator('.preview.preview-bbcode')).toContainText('Shrine_InGame_FirstPass_PatchEmbed.gif');
    await page.screenshot({ path: '/private/tmp/test-plan/04-image-placeholder.png', fullPage: true });
  });

  test('images panel appears with URL input', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(CONFLUENCE_INPUT);
    await expect(page.locator('.images-panel')).toBeVisible();
    await expect(page.locator('.images-panel')).toContainText('needs Steam URL');
  });

  test('BBCode output has Steam tags not HTML', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(CONFLUENCE_INPUT);
    await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
    const bbcode = page.locator('.bbcode-readonly');
    await expect(bbcode).toContainText('[h2]');
    await expect(bbcode).toContainText('[list]');
    await expect(bbcode).toContainText('[*]');
    // Should NOT contain raw HTML
    const text = await bbcode.textContent() || '';
    expect(text).not.toContain('<h2');
    expect(text).not.toContain('<li');
  });

  test('local-id attributes stripped', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(CONFLUENCE_INPUT);
    await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
    const text = await page.locator('.bbcode-readonly').textContent() || '';
    expect(text).not.toContain('local-id');
  });
});

// ============================================================================
// 5. Plain Text / Copypasta
// ============================================================================

test.describe('5. Plain Text / Copypasta', () => {
  test('plain text renders reasonably', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(PLAIN_INPUT);
    await page.waitForTimeout(500);
    const preview = page.locator('.preview.preview-bbcode');
    await expect(preview).toContainText('Patch Notes v2.0');
    await expect(preview).toContainText('SWAPMEAT');
    await page.screenshot({ path: '/private/tmp/test-plan/05-plain-text.png', fullPage: true });
  });
});

// ============================================================================
// 6. Image Placeholders (continued from test 4)
// ============================================================================

test.describe('6. Image Placeholders', () => {
  test('placeholder card shows with dashed border', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(CONFLUENCE_INPUT);
    const placeholder = page.locator('.image-placeholder');
    await expect(placeholder).toBeVisible();
  });

  test('entering URL updates BBCode', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill(CONFLUENCE_INPUT);
    // Enter a URL in the images panel
    const urlInput = page.locator('.images-panel input[type="text"]').first();
    await urlInput.fill('https://cdn.steam.com/test-image.png');
    await page.waitForTimeout(300);
    // Check BBCode tab
    await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
    const bbcode = await page.locator('.bbcode-readonly').textContent() || '';
    expect(bbcode).toContain('https://cdn.steam.com/test-image.png');
    await page.screenshot({ path: '/private/tmp/test-plan/06-image-url-entered.png', fullPage: true });
  });
});

// ============================================================================
// 8. Term Protection
// ============================================================================

test.describe('8. Term Protection', () => {
  test('Settings shows DNT glossary read-only', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('.settings-panel')).toBeVisible();
    await expect(page.locator('.settings-panel')).toContainText('SWAPMEAT');
    await expect(page.locator('.settings-panel')).toContainText('Tangus');
    await page.screenshot({ path: '/private/tmp/test-plan/08-dnt-glossary.png', fullPage: true });
  });

  test('blacklist section visible and empty by default', async ({ page }) => {
    // Clear any leftover blacklist
    await page.evaluate(() => localStorage.removeItem('steambb-blacklist-terms'));
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('.settings-panel')).toContainText('BLACKLISTED TERMS');
  });

  test('add term to blacklist, see wavy underline and warning', async ({ page }) => {
    // Set up blacklist
    await page.evaluate(() => {
      localStorage.setItem('steambb-blacklist-terms', JSON.stringify(['damn']));
    });
    await page.reload();
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('This is a damn good test');
    await page.waitForTimeout(300);
    // Check for lint warning
    const lintPanel = page.locator('.panel').first().locator('.panel-lint');
    await expect(lintPanel).toContainText('damn');
    // Check for highlight
    await expect(page.locator('.highlight-blacklist')).toBeVisible();
    await page.screenshot({ path: '/private/tmp/test-plan/08-blacklist-highlight.png', fullPage: true });
  });

  test('copy still works with blacklist warnings', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('steambb-blacklist-terms', JSON.stringify(['damn']));
    });
    await page.reload();
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('This is a damn good test');
    await page.waitForTimeout(300);
    const copyBtn = page.locator('.output-panel .btn-primary');
    await expect(copyBtn).toBeEnabled();
    await copyBtn.click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard.length).toBeGreaterThan(0);
  });

  test('remove term from blacklist clears underline', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('steambb-blacklist-terms', JSON.stringify(['damn']));
    });
    await page.reload();
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('This is a damn good test');
    await page.waitForTimeout(300);
    await expect(page.locator('.highlight-blacklist')).toBeVisible();
    // Remove term via settings
    await page.getByRole('button', { name: 'Settings' }).click();
    // Click the x on the 'damn' chip
    const chip = page.locator('.settings-panel .blacklist-chip', { hasText: 'damn' });
    await chip.locator('.chip-remove').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.highlight-blacklist')).not.toBeVisible();
  });
});

// ============================================================================
// 9. Lint Messages
// ============================================================================

test.describe('9. Lint Messages', () => {
  test('unclosed tag shows lint error with friendly message', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('[b]unclosed bold tag');
    await page.waitForTimeout(300);
    await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
    const lintPanel = page.locator('.output-panel .panel-lint');
    await expect(lintPanel).toBeVisible();
    const text = await lintPanel.textContent() || '';
    // Should be friendly, not "Invalid tag"
    expect(text.toLowerCase()).not.toContain('invalid');
    await page.screenshot({ path: '/private/tmp/test-plan/09-lint-error.png', fullPage: true });
  });

  test('Why? button expands help text', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('{code}some code{code}');
    const lintPanel = page.locator('.panel').first().locator('.panel-lint');
    const whyBtn = lintPanel.locator('.lint-help-toggle').first();
    await expect(whyBtn).toBeVisible();
    await whyBtn.click();
    await expect(lintPanel.locator('.lint-help-text').first()).toBeVisible();
    await page.screenshot({ path: '/private/tmp/test-plan/09-lint-why.png', fullPage: true });
  });

  test('lint status shows Ready/errors/warnings', async ({ page }) => {
    // Clean content — Ready
    await expect(page.locator('.output-panel .lint-status-ready')).toBeVisible();

    // Error content
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('[b]unclosed');
    await page.waitForTimeout(300);
    await expect(page.locator('.output-panel .lint-status-error')).toBeVisible();
  });

  test('clicking error count switches to BBCode tab', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('[b]unclosed');
    await page.waitForTimeout(300);
    await page.locator('.output-panel .lint-status-error').click();
    const bbcodeTab = page.locator('.output-panel .preview-tab', { hasText: 'BBCode' });
    await expect(bbcodeTab).toHaveClass(/active/);
  });
});

// ============================================================================
// 10. Editor Behavior
// ============================================================================

test.describe('10. Editor Behavior', () => {
  test('Tab key moves focus, does not insert spaces', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('hello');
    await mdEditor.focus();
    await mdEditor.press('End');
    await mdEditor.press('Tab');
    const value = await mdEditor.inputValue();
    expect(value).toBe('hello');
  });

  test('Cmd+Shift+C copies BBCode', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('**bold**');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'C', code: 'KeyC', metaKey: true, shiftKey: true, bubbles: true,
      }));
    });
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('[b]bold[/b]');
  });

  test('line numbers visible', async ({ page }) => {
    await expect(page.locator('.line-numbers')).toBeVisible();
  });
});

// ============================================================================
// 11. Output Panel
// ============================================================================

test.describe('11. Output Panel', () => {
  test('Steam Preview is default tab', async ({ page }) => {
    const previewTab = page.locator('.output-panel .preview-tab', { hasText: 'Steam Preview' });
    await expect(previewTab).toHaveClass(/active/);
  });

  test('character count visible on both tabs', async ({ page }) => {
    // Preview tab
    await expect(page.locator('.output-panel .char-count-inline')).toBeVisible();
    // BBCode tab
    await page.locator('.output-panel .preview-tab', { hasText: 'BBCode' }).click();
    await expect(page.locator('.output-panel .char-count-inline')).toBeVisible();
  });

  test('copy button disabled with errors, tooltip explains', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('[b]unclosed');
    await page.waitForTimeout(300);
    const copyBtn = page.locator('.output-panel .btn-primary');
    await expect(copyBtn).toBeDisabled();
    await expect(copyBtn).toHaveAttribute('title', 'Fix errors before copying');
    await page.screenshot({ path: '/private/tmp/test-plan/11-disabled-copy.png', fullPage: true });
  });
});

// ============================================================================
// 12. Settings
// ============================================================================

test.describe('12. Settings', () => {
  test('gear icon opens settings panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('.settings-panel')).toBeVisible();
    await page.screenshot({ path: '/private/tmp/test-plan/12-settings.png', fullPage: true });
  });

  test('settings persist after reload', async ({ page }) => {
    // Add a blacklist term
    await page.getByRole('button', { name: 'Settings' }).click();
    const input = page.locator('.settings-panel .blacklist-add-input');
    await input.fill('testterm');
    await input.press('Enter');
    await page.waitForTimeout(200);

    // Reload
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('.settings-panel')).toContainText('testterm');

    // Cleanup
    await page.evaluate(() => localStorage.removeItem('steambb-blacklist-terms'));
  });
});

// ============================================================================
// 13. Footer
// ============================================================================

test.describe('13. Footer', () => {
  test('keyboard shortcuts displayed correctly', async ({ page }) => {
    const hints = page.locator('.keyboard-hints');
    await expect(hints).toContainText('Open');
    await expect(hints).toContainText('Save As');
    await expect(hints).toContainText('Copy BBCode');
  });

  test('feedback link opens GitHub Issues', async ({ page }) => {
    const link = page.locator('.feedback-link');
    await expect(link).toHaveAttribute('href', 'https://github.com/PlayOneMoreGame/steam-bbcode/issues/new/choose');
  });

  test('no redundant SteamBBEditor label in footer', async ({ page }) => {
    const footer = page.locator('.footer');
    const text = await footer.textContent() || '';
    // The header has "SteamBBEditor", the footer should not repeat it
    expect(text).not.toContain('SteamBBEditor');
  });

  test('footer is slim status bar', async ({ page }) => {
    const footer = page.locator('.footer');
    const box = await footer.boundingBox();
    // Status bar should be slim — under 40px height
    expect(box!.height).toBeLessThan(40);
    await page.screenshot({ path: '/private/tmp/test-plan/13-footer.png', fullPage: true });
  });
});

// ============================================================================
// 14. Responsive Layout
// ============================================================================

test.describe('14. Responsive Layout', () => {
  test('panels remain visible at narrow width', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(300);
    await expect(page.locator('.panel').first()).toBeVisible();
    await expect(page.locator('.output-panel')).toBeVisible();
    await page.screenshot({ path: '/private/tmp/test-plan/14-responsive-narrow.png', fullPage: true });
  });

  test('panels remain visible at wide width', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForTimeout(300);
    await expect(page.locator('.panel').first()).toBeVisible();
    await expect(page.locator('.output-panel')).toBeVisible();
    await page.screenshot({ path: '/private/tmp/test-plan/14-responsive-wide.png', fullPage: true });
  });
});

// ============================================================================
// 15. Edge Cases
// ============================================================================

test.describe('15. Edge Cases', () => {
  test('empty editor — preview empty, copy produces empty', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('');
    await page.waitForTimeout(300);
    const copyBtn = page.locator('.output-panel .btn-primary');
    if (await copyBtn.isEnabled()) {
      await copyBtn.click();
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboard.trim()).toBe('');
    }
  });

  test('very long content — app remains responsive', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    // Generate ~10,000 chars
    const longContent = Array.from({ length: 200 }, (_, i) => `## Section ${i}\n\nThis is paragraph ${i} with some **bold** and *italic* text.\n\n- Item A\n- Item B\n`).join('\n');
    await mdEditor.fill(longContent);
    await page.waitForTimeout(500);
    // App should still be interactive
    const copyBtn = page.locator('.output-panel .btn-primary');
    await expect(copyBtn).toBeVisible();
    await page.screenshot({ path: '/private/tmp/test-plan/15-long-content.png', fullPage: true });
  });

  test('paste HTML from random website — not detected as Confluence', async ({ page }) => {
    const mdEditor = page.locator('.panel').first().locator('textarea');
    await mdEditor.fill('<div class="post"><h1>Title</h1><p>Just a normal web page.</p></div>');
    await page.waitForTimeout(500);
    const badge = page.locator('.panel').first().locator('.format-badge');
    // Should NOT be CONFLUENCE (no ac: or ri: markers)
    const badgeText = await badge.textContent() || '';
    expect(badgeText).not.toContain('CONFLUENCE');
  });
});
