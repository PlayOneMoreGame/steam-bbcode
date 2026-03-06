// Default welcome document shown on startup
// This is the first thing every user sees — it demonstrates the workflow
// and shows what the preview panel looks like with real content.
// IMPORTANT: This doc must produce zero lint errors/warnings in both panels.

export const WELCOME_MARKDOWN = `# Welcome to SteamBBEditor

Paste your content here, preview it on the right, then copy the BBCode and post it to Steam.

## How It Works

1. Paste or type your content in this panel
2. Check the **Steam Preview** on the right to see exactly how it will look
3. Click **Copy BBCode** to grab the output
4. Paste into your Steam announcement, guide, or forum post

You can paste from anywhere: a text editor, a Confluence page, a Google Doc, or just write from scratch. The editor detects what you give it and converts it automatically.

---

## Formatting You Can Use

Everything below demonstrates what the converter handles. Look at the preview panel to see how each element renders on Steam.

### Text Styles

Use **bold** for emphasis, *italics* for titles or asides, and ~~strikethrough~~ for removed content.

### Bullet Lists

- Balance changes and bug fixes
- New features and content updates
- Known issues and workarounds

### Numbered Steps

1. Write your patch notes in whatever tool you prefer
2. Paste the content into SteamBBEditor
3. Verify it looks right in the preview
4. Copy and post to Steam

### Links

Link to [Steam Community](https://steamcommunity.com) or [your store page](https://store.steampowered.com).

### Callouts

> Use blockquotes for developer comments or important notices.

### Code Blocks

\`\`\`
// Useful for config examples or console commands
sv_cheats 0
map_restart
\`\`\`

---

## Keyboard Shortcuts

**Open a file** .......... Cmd+O
**Save as** .............. Cmd+S
**Copy BBCode** .......... Cmd+Shift+C

---

Ready to go? Clear this text and paste your content, or press Cmd+O to open a file.
`;
