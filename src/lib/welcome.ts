// Default welcome document shown on startup
// This teaches users the workflow and demonstrates Steam BBCode quirks
// IMPORTANT: This doc must be lint-error-free in both Markdown and BBCode panels

export const WELCOME_MARKDOWN = `# Welcome to SteamBBEditor

Convert **Markdown** to **Steam BBCode** with live preview and validation.

## Your Workflow

1. Write or paste Markdown here (left panel)
2. Review auto-converted BBCode (middle panel)
3. Preview how Steam will render it (right panel)
4. Fix any errors by clicking them to jump to the problem
5. Copy BBCode and paste into Steam

---

## Formatting Demo

### Text Styles

Here is **bold text** and *italic text* and ~~strikethrough~~.

### Lists

Bullet list:
- First item
- Second item
- Third item

Numbered list:
1. Step one
2. Step two
3. Step three

### Links and Quotes

Visit [Steam Community](https://steamcommunity.com) for more.

> Blockquotes render nicely on Steam.
> They work great for callouts and notes.

### Code Blocks

\`\`\`
// Steam supports code blocks
function example() {
  return "Hello Steam!";
}
\`\`\`

---

## Steam BBCode Tips

**Horizontal rules** need explicit closing tags in Steam.

**Inline code** with backticks converts to bold since Steam has no inline code.

**List items** use asterisk markers without closing tags.

**Guide images** require special previewimg tags with uploaded images.

**YouTube embeds** require special previewyoutube tags with video ID.

---

**Ready?** Press Cmd+O to open a file, or just start typing above.

*This welcome doc resets each time you open the app.*
`;

