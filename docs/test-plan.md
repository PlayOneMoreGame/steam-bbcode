# SteamBBEditor — Manual Test Plan v3
## Target: local dev server (`npm run dev`) or your own deployment
### Automated: 559 unit tests + 119 E2E tests (678 total)

---

## 1. Welcome Experience
- [ ] App loads with welcome document in the editor (left panel)
- [ ] Welcome doc is readable markdown, not raw HTML or BBCode
- [ ] Right panel shows Steam Preview of the welcome content
- [ ] No lint errors or warnings visible
- [ ] Copy BBCode button enabled, status shows "Ready"
- [ ] Keyboard shortcuts shown in footer

## 2. Markdown Input
Paste this into the editor (⌘A to select all, then paste):

```
# Patch Notes v2.0

**SWAPMEAT** — Major balance changes and bug fixes.

## Gameplay
- Currencies capped at 9999
- Renamed "Elite Enemies" to "Shiny Enemies"
- New "Flash Freeze" artifact replaces "Armor of Chill"

## Bug Fixes
- Fixed moleman leg "tunneling" off cliffs
- Fixed weapons retained between runs

> Note: Performance tuning is still in progress.

Visit [Steam Community](https://steamcommunity.com) for feedback.
```

- [ ] Editor shows clean markdown (left panel)
- [ ] Steam Preview shows rendered headings, bold, lists, blockquote, link (right panel)
- [ ] BBCode tab shows correct Steam BBCode
- [ ] No lint errors
- [ ] Copy BBCode works (paste into text editor to verify)
- [ ] Character count visible
- [ ] Status shows "Ready"

## 3. Confluence Rendered HTML (⌘A ⌘C from browser)
Copy all content from a Confluence page in the browser (⌘A ⌘C), then paste:

- [ ] Editor shows clean MARKDOWN (not raw HTML, not BBCode)
- [ ] Headings, lists, paragraphs preserved
- [ ] Image placeholders show as `>>> Drop image: filename.gif <<<`
- [ ] Steam Preview renders correctly
- [ ] BBCode tab shows correct output
- [ ] Images panel shows filenames as upload checklist
- [ ] No Confluence UI junk visible (buttons, SVGs, CSS classes)
- [ ] `data-local-id` attributes NOT visible anywhere

## 4. Plain Text / Copypasta
Paste unformatted text:

```
PATCH NOTES V2.0

GAMEPLAY CHANGES
• Currencies capped at 9999
• New shrine events added
• Flash Freeze artifact replaces Armor of Chill

BUG FIXES
• Fixed tunneling bug
• Fixed weapon retention between runs
```

- [ ] Editor shows text with light markdown formatting applied (ALL-CAPS → headings, bullets normalized)
- [ ] Steam Preview renders reasonably
- [ ] Bullet characters (•) converted to markdown list items

## 5. Image Handling
Using Confluence paste with images:
- [ ] Image placeholder markers visible in editor: `>>> Drop image: filename <<<`
- [ ] Images panel appears with upload checklist
- [ ] Checklist shows filenames (not URLs to enter)
- [ ] No URL input fields (Steam handles URLs via drag-and-drop)
- [ ] Drag image file onto editor — image stored and preview renders inline

## 6. Translation
Output panel has two header rows: Row 1 is view mode (Preview / BBCode), Row 2 is language selector (English / pt-BR / es-LATAM). These are independent dimensions.

- [ ] Translate button visible in output panel language row
- [ ] Click Translate — language options appear (pt-BR, es-LATAM)
- [ ] Select pt-BR and/or es-LATAM — translation begins with loading state
- [ ] **Selecting a language shows STEAM PREVIEW (rendered) by default, not raw BBCode**
- [ ] **View mode toggle (Preview / BBCode) works independently for each language**
- [ ] Translated content preserves all formatting (headings, lists, bold)
- [ ] DNT terms remain in English (SWAPMEAT, Squat Daddy, etc.)
- [ ] Copy button label updates per language: "Copy BBCode" / "Copy pt-BR" / "Copy es-LATAM"
- [ ] Edit source content — stale indicator (yellow dot) appears on translated languages
- [ ] Re-translate clears stale indicator and updates content

## 7. Term Protection
### Do Not Translate (DNT)
- [ ] SWAPMEAT terms have cyan dotted underline in editor
- [ ] "Standard" underlines but "Standardized" does NOT
- [ ] Open Settings — DNT glossary visible and EDITABLE
- [ ] Can add new terms to DNT list
- [ ] Can remove terms (including defaults)
- [ ] "Reset to defaults" restores original SWAPMEAT glossary
- [ ] Default terms visually distinct from user-added terms (dashed border)

### Blocked Words
- [ ] Open Settings — "Blocked Words" section shows count (678 terms)
- [ ] Search works — typing "damn" should NOT find it (removed as gaming false positive)
- [ ] Search for "fuck" — found, shown as chip with X to remove
- [ ] Can add custom blocked terms
- [ ] Can remove terms (including defaults)
- [ ] "Reset to defaults" restores full list
- [ ] Type a blocked word in editor — wavy red underline appears
- [ ] Lint warning appears (not error)
- [ ] Copy BBCode still works with blocked word warnings
- [ ] **Blocked word check also runs on translation output**

## 8. Lint Messages
- [ ] Lint messages appear on the RIGHT panel (output issues)
- [ ] No BBCode lint messages on the LEFT panel (editor)
- [ ] Status indicator in output header: "Ready" (green) / "N warnings" (orange) / "N errors" (red)
- [ ] Lint list is COLLAPSED by default — click status to expand
- [ ] "Why?" expands with helpful explanation
- [ ] Messages use plain English, not developer jargon
- [ ] Blame Steam/formatting, not the user
- [ ] Normal workflow with clean content = zero visible messages, green "Ready"

## 9. Editor Behavior (Left Panel)
- [ ] Tab key moves focus (does NOT insert spaces)
- [ ] ⌘A selects all text
- [ ] ⌘Z undoes last change
- [ ] ⌘S triggers Save As dialog
- [ ] ⌘⇧C copies BBCode to clipboard
- [ ] Paste inserts at cursor, doesn't overwrite entire editor
- [ ] **Paste after typing**: type several lines, move cursor to middle, paste Confluence HTML — pasted content splices at cursor, typed content preserved on both sides (regression: stale closure bug)
- [ ] Line numbers visible
- [ ] Editor header: clean layout, no unnecessary buttons
- [ ] Scrolling works smoothly

## 10. Output Panel (Right Panel)
- [ ] Steam Preview is the default tab
- [ ] BBCode tab shows raw BBCode (read-only)
- [ ] NO line numbers on the right panel
- [ ] Character count visible
- [ ] Copy BBCode button always visible
- [ ] Copy disabled when errors exist (tooltip explains why)
- [ ] Copy enabled when warnings exist
- [ ] No editing possible on the right panel

## 11. Settings
- [ ] Settings button opens settings panel
- [ ] DNT glossary: editable, shows SWAPMEAT terms, add/remove/reset
- [ ] Blocked Words: searchable, shows count, add/remove/reset
- [ ] Descriptions explain purpose: "Game terms that stay in English during translation" / "Words that should never appear in posts"
- [ ] Settings persist after page reload
- [ ] Closing and reopening preserves state

## 12. Footer
- [ ] Keyboard shortcuts displayed (⌘N, ⌘O, ⌘S, ⌘⇧C)
- [ ] Feedback link present
- [ ] Save status indicator
- [ ] Slim status-bar style

## 13. Responsive Layout
- [ ] Resize browser window — panels adjust
- [ ] Both panels remain usable at smaller sizes

## 14. Edge Cases
- [ ] Empty editor — preview is empty, Copy produces empty string
- [ ] Very long content (10,000+ chars) — app remains responsive
- [ ] Paste HTML from random website — handled gracefully
- [ ] Multiple rapid pastes — no crashes or flicker
- [ ] XSS attempt: paste `[url=javascript:alert(1)]click[/url]` — sanitized, no alert

## 15. Native Menu Bar (Requires Tauri build)
### File Menu
- [ ] File > New (⌘N) — resets editor to welcome document
- [ ] File > Open... (⌘O) — opens native file picker, loads .md file
- [ ] File > Save As... (⌘S) — opens native save dialog
- [ ] File > Close Window (⌘W) — closes the window

### Edit Menu
- [ ] Edit > Undo (⌘Z) — undoes last change in focused text field
- [ ] Edit > Redo (⌘⇧Z) — redoes last undo
- [ ] Edit > Cut / Copy / Paste / Select All — all work with textarea
- [ ] Native Edit items work without custom JS (handled by macOS)

### View Menu
- [ ] View > Toggle Tags Reference (⌘T) — opens/closes tag reference popover
- [ ] View > Toggle Settings (⌘,) — opens/closes settings panel

### Window Menu
- [ ] Window > Minimize — minimizes the window
- [ ] Window > Zoom — toggles fullscreen zoom
- [ ] "Bring All to Front" is NOT present (removed intentionally)

### Help Menu
- [ ] Help > SteamBBEditor Help — opens GitHub repo in default browser (not in-app)

### App Menu (macOS only)
- [ ] SteamBBEditor > About SteamBBEditor — shows native About dialog
- [ ] SteamBBEditor > Quit (⌘Q) — exits the app

## 16. Analytics (PostHog)
- [ ] Open PostHog Live Events tab
- [ ] Load the app — session_start and $pageview events appear
- [ ] Paste content — paste event fires
- [ ] Copy BBCode — workflow_completed event fires with properties
- [ ] Check Sessions tab — recording appears and is playable

---

## Test Results

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| 1. Welcome | | |
| 2. Markdown | | |
| 3. Confluence HTML | | |
| 4. Copypasta | | |
| 5. Images | | |
| 6. Translation | | |
| 7. Term Protection | | |
| 8. Lint Messages | | |
| 9. Editor | | |
| 10. Output Panel | | |
| 11. Settings | | |
| 12. Footer | | |
| 13. Responsive | | |
| 14. Edge Cases | | |
| 15. Menu Bar | | Requires Tauri build |
| 16. Analytics | | |

**Tester:** _______________  **Date:** _______________  **Build:** main @ _______________
