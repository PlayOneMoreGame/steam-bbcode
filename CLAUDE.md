# Claude Context for SteamBBEditor

This file provides context for AI-assisted development with Claude Code or Claude in VS Code.

## Project Purpose

SteamBBEditor is a translator. Teams write content in whatever tool they prefer -- Confluence, Word, markdown editors, Google Docs -- then use this app to convert it into Steam's non-standard BBCode format. The goal: users never need to learn Steam BBCode. They import their content (paste, open file, drag and drop), fix anything that needs fixing, verify it looks right in the Steam preview, and copy the output to post on Steam. Import -> Edit -> Preview -> Copy -> Post.

**This is NOT a general-purpose text editor.** It's a focused conversion tool for the Confluence -> Steam pipeline.

## Architecture

```
src/
├── App.tsx                  # Main app, state management, keyboard shortcuts
├── main.tsx                 # React entry point
├── vite-env.d.ts            # Vite type declarations
├── components/
│   ├── index.ts             # Component barrel exports
│   ├── MarkdownPanel.tsx    # Left panel - input, markdown linting, format detection
│   ├── OutputPanel.tsx      # Right panel - tabbed output (Preview / BBCode / Translation)
│   ├── PreviewPanel.tsx     # BBCode -> HTML rendered preview (used inside OutputPanel)
│   ├── SyntaxEditor.tsx     # Shared editor component with line numbers
│   ├── TagReference.tsx     # Floating popover with tag reference
│   ├── SettingsPanel.tsx    # Blacklist terms, DNT glossary management
│   ├── ImagesPanel.tsx      # Image placeholder URL resolution
│   └── ApiKeyDialog.tsx     # Claude API key input dialog
├── hooks/
│   ├── useFileService.ts    # Tauri file dialogs (Open, Save As)
│   ├── useLocalStorage.ts   # Browser storage
│   ├── useAutoSave.ts       # Draft persistence
│   ├── useRecentFiles.ts    # Recent files list
│   └── useImageStore.ts     # Image data URL management
├── lib/
│   ├── converter.ts         # Markdown -> BBCode conversion (pure functions)
│   ├── confluence-converter.ts  # Confluence XHTML -> BBCode conversion
│   ├── format-detector.ts   # Auto-detect input format (MD / Confluence / plain text)
│   ├── linter.ts            # BBCode validation (context-aware)
│   ├── markdown-linter.ts   # Markdown validation
│   ├── confluence-linter.ts # Confluence-specific validation
│   ├── highlighter.ts       # Syntax highlighting tokens
│   ├── renderer.ts          # BBCode -> HTML for preview
│   ├── markdown-renderer.ts # Markdown -> HTML for preview
│   ├── image-placeholders.ts # {placeholder:filename} extraction and resolution
│   ├── translation-service.ts # Claude API translation (pt-BR, es-LATAM)
│   ├── glossary.ts          # DNT glossary for translation
│   ├── dnt-store.ts         # Do Not Translate term persistence
│   ├── api-key-store.ts     # Claude API key persistence
│   ├── blacklist-detector.ts # Blocked term detection with word boundaries
│   ├── blacklist-store.ts   # Blocked term persistence
│   ├── blocked-words-default.ts # Default blocked terms list
│   ├── Terms-to-Block.csv   # Source CSV for blocked terms
│   ├── splitter.ts          # Discord 2000-char message splitter
│   ├── plaintext-normalizer.ts # Plain text cleanup
│   ├── analytics.ts         # Usage analytics
│   ├── utils.ts             # Shared utilities
│   ├── contexts.ts          # Steam context types (announcements, guides, etc.)
│   ├── welcome.ts           # Default welcome document
│   └── __tests__/           # Vitest unit tests (551 tests across 21 files)
└── styles/
    ├── app.css              # Main styles with CSS variables
    └── steam-theme.css      # Steam-accurate preview styling
```

## Key Files to Know

- **`src/lib/converter.ts`** - Markdown -> BBCode conversion logic (pure functions).
- **`src/lib/confluence-converter.ts`** - Confluence XHTML -> BBCode conversion.
- **`src/lib/format-detector.ts`** - Detects whether input is Markdown, Confluence XHTML, or plain text.
- **`src/lib/linter.ts`** - BBCode validation rules. Context-aware (announcements vs guides vs forums).
- **`src/lib/markdown-linter.ts`** - Markdown validation. Catches Confluence artifacts.
- **`src/lib/translation-service.ts`** - Claude API translation with DNT glossary support.
- **`src/lib/blacklist-detector.ts`** - Blocked term detection with word-boundary matching.
- **`src/lib/image-placeholders.ts`** - Extracts and resolves `{placeholder:filename}` in BBCode.
- **`src/App.tsx`** - Main component. State management, keyboard shortcuts, panel coordination.
- **`src/components/OutputPanel.tsx`** - Tabbed output panel (Preview / BBCode / Translation tabs).
- **`scripts/bump-version.sh`** - Release script. Run with `npm run release`.

## Testing

```bash
npm run test:run    # Run all 551 unit tests once
npm run test        # Watch mode
npx playwright test # Run 110 E2E tests (7 spec files)
```

Unit tests are in `src/lib/__tests__/`. E2E tests are in `e2e/`.

## Development

```bash
npm run dev         # Web only (no Tauri)
npm run tauri:dev   # Desktop app with hot reload
```

## Release Process

```bash
npm run release     # Interactive version bump, commit, tag, push
```

GitHub Actions builds macOS (ARM + Intel) and Windows automatically on tag push.

## Steam BBCode Quirks

These are the specific issues this tool addresses:

1. **`[hr]` needs closing tag** - Must be `[hr][/hr]`, not self-closing
2. **No inline code** - Backticks don't work, we convert to `[b]`
3. **List markers** - Uses `[*]` without closing, not `[li]...[/li]`
4. **YouTube embeds** - Weird format: `[previewyoutube=ID;full][/previewyoutube]`
5. **Guide images** - Must use `[previewimg]` with uploaded images, not URLs
6. **Nested formatting** - Order matters: `[b][i]text[/i][/b]` not `[b][i]text[/b][/i]`

## LintMessage Interface

```typescript
interface LintMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;      // 1-indexed line number
  column?: number;    // 1-indexed column for click-to-select
  length?: number;    // Length of error span for highlighting
}
```

## Common Tasks

### Add a new BBCode tag
1. Update `VALID_TAGS` in `src/lib/linter.ts`
2. Add conversion rule in `src/lib/converter.ts`
3. Add rendering in `src/lib/renderer.ts`
4. Add tests

### Add a new lint rule
1. Add check function in appropriate linter
2. Call it from main `lint*()` function
3. Add test case

### Update welcome document
Edit `src/lib/welcome.ts`. Keep it lint-error-free in both panels!

## Infrastructure

- **GitHub Actions** - CI/CD for desktop builds (`.github/workflows/`)
- **Buildkite** - OMG standard CI for web builds (`.buildkite/`)
- **Terraform** - Infrastructure as code (`terraform/`)
- **Nix** - Reproducible dev environment (`shell.nix`)

## Related Docs

- [README.md](README.md) - User guide
- [ROADMAP.md](ROADMAP.md) - Feature tracking
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [BUILD.md](BUILD.md) - Desktop build instructions
- [WEBAPP.md](WEBAPP.md) - Web deployment
