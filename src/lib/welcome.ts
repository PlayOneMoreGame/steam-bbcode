// Default welcome document shown on startup
// This teaches users the workflow and demonstrates Steam BBCode quirks

export const WELCOME_MARKDOWN = `# Welcome to SteamBBEditor

Convert **Markdown** to **Steam BBCode** with live preview and validation.

## Your Workflow

1. **Write or paste** Markdown here (left panel)
2. **Review** auto-converted BBCode (middle panel)
3. **Preview** how Steam will render it (right panel)
4. **Fix** any errors (click an error to jump to it!)
5. **Copy** BBCode and paste into Steam

---

## Formatting Demo

### Text Styles

**Bold text**, *italic text*, and ~~strikethrough~~.

You can combine them: ***bold and italic***.

### Lists

Bullet list:
- First item
- Second item with **bold**
- Third item

Numbered list:
1. Step one
2. Step two
3. Step three

### Links & Quotes

Visit [Steam Community](https://steamcommunity.com) for more.

> Blockquotes render nicely on Steam.
> They're great for callouts.

### Code Blocks

\`\`\`
// Steam supports code blocks
function example() {
  return "Hello Steam!";
}
\`\`\`

---

## Steam BBCode Quirks ⚠️

Steam's BBCode has some differences from standard BBCode:

| Quirk | Details |
|-------|---------|
| Horizontal rules | Must be \`[hr][/hr]\` (not self-closing) |
| Inline code | Backticks don't work - use code blocks |
| List items | Use \`[*]\` without closing tags |
| Guide images | Require \`[previewimg]\` with uploads |
| YouTube | Format: \`[previewyoutube=ID;full][/previewyoutube]\` |

---

## Try It! Fix This Error ⬇️

This line has [] empty brackets - click the error above to select it!

---

**Ready?** Press **⌘O** to open a file, or just start typing above.

*This welcome doc resets each time you open the app.*
`;

