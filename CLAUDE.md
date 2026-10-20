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
│   ├── OutputPanel.tsx      # Right panel - two-row header (view mode × language), preview, copy
│   ├── PreviewPanel.tsx     # BBCode -> HTML rendered preview (used inside OutputPanel)
│   ├── SyntaxEditor.tsx     # Shared editor component with line numbers
│   ├── TagReference.tsx     # Floating popover with tag reference
│   ├── SettingsPanel.tsx    # Blacklist terms, DNT glossary management
│   ├── ImagesPanel.tsx      # Image placeholder URL resolution
│   └── ApiKeyDialog.tsx     # Claude API key input dialog
├── hooks/
│   ├── useAutoSave.ts       # Draft persistence
│   ├── useBlacklist.ts      # Blocked term state and persistence
│   ├── useDntTerms.ts       # Do Not Translate glossary state
│   ├── useFileService.ts    # Tauri file dialogs (Open, Save As)
│   ├── useFormatDetection.ts # Auto-detect input format with debounce
│   ├── useImageStore.ts     # Image data URL management
│   ├── useLocalStorage.ts   # Browser storage
│   ├── useRecentFiles.ts    # Recent files list
│   └── useTranslation.ts    # Claude API translation state
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
│   ├── term-store.ts        # Generic term store factory (three-tier: studio/title/user)
│   ├── dnt-store.ts         # Do Not Translate term persistence (thin wrapper)
│   ├── api-key-store.ts     # Claude API key persistence
│   ├── blacklist-detector.ts # Blocked term detection with word boundaries
│   ├── blacklist-store.ts   # Blocked term persistence (thin wrapper)
│   ├── blocked-words-default.ts # Default blocked terms list
│   ├── workspace-types.ts   # Workspace config TypeScript interfaces
│   ├── workspace-loader.ts  # Static workspace config loader
│   ├── Terms-to-Block.csv   # Source CSV for blocked terms
│   ├── splitter.ts          # Discord 2000-char message splitter
│   ├── plaintext-normalizer.ts # Plain text cleanup
│   ├── analytics.ts         # Usage analytics
│   ├── utils.ts             # Shared utilities
│   ├── contexts.ts          # Steam context types (announcements, guides, etc.)
│   ├── welcome.ts           # Default welcome document
│   ├── types.ts             # Shared TypeScript types
│   └── __tests__/           # Vitest unit tests
├── workspace/
│   └── studios/
│       ├── example-studio/      # Default studio: studio.json + titles/example-game.json
│       └── best-mega-gameco/    # Second sample studio
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
- **`src/components/OutputPanel.tsx`** - Two-row header (view mode x language), preview, copy.
- **`scripts/bump-version.sh`** - Release script. Run with `npm run release`.

## Testing

```bash
npm run test:run    # Run all unit tests once
npm run test        # Watch mode
npx playwright test # Run 123 E2E tests (9 spec files)
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
- **Nix** - Reproducible dev environment (`shell.nix`)

## Jira

Project key: **SMD**. Use the `standup-to-jira` skill for batch ticket creation. Use `requests` or `curl` for direct API access — the `jira` Python library fails in the Nix shell. Always use REST API v3 (`/rest/api/3/search/jql`), not v2.

## Agent Definitions

Six specialized agents in `.claude/agents/`:

| Agent | File | Use For |
|-------|------|---------|
| `engineering-manager` | `.claude/agents/engineering-manager.md` | Scoping, prioritization, architecture, Jira integration |
| `frontend-engineer` | `.claude/agents/frontend-engineer.md` | React/TypeScript/CSS implementation |
| `ux-designer` | `.claude/agents/ux-designer.md` | UX evaluation, interaction design, workflow analysis |
| `tauri-engineer` | `.claude/agents/tauri-engineer.md` | Tauri config, Rust, desktop builds, IPC |
| `qa-engineer` | `.claude/agents/qa-engineer.md` | Test plans, E2E tests, verification, coverage |
| `macos-developer` | `.claude/agents/macos-developer.md` | Native macOS APIs, SwiftUI/AppKit |

## Related Docs

- [README.md](README.md) - User guide
- [ROADMAP.md](ROADMAP.md) - Feature tracking
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [BUILD.md](BUILD.md) - Desktop build instructions
- [docs/test-plan.md](docs/test-plan.md) - QA test plan
