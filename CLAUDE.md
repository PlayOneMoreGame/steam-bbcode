# Claude Context for SteamBBEditor

This file provides context for AI-assisted development with Claude Code or Claude in VS Code.

## Project Purpose

SteamBBEditor is a translator. Teams write content in whatever tool they prefer — Confluence, Word, markdown editors, Google Docs — then use this app to convert it into Steam's non-standard BBCode format. The goal: users never need to learn Steam BBCode. They import their content (paste, open file, drag and drop), fix anything that needs fixing, verify it looks right in the Steam preview, and copy the output to post on Steam. Import → Edit → Preview → Copy → Post.

**This is NOT a general-purpose text editor.** It's a focused conversion tool for the Confluence → Steam pipeline.

## Architecture

```
src/
├── App.tsx              # Main app, state management, keyboard shortcuts
├── components/
│   ├── MarkdownPanel    # Left panel - input, markdown linting
│   ├── OutputPanel      # Right panel - Steam Preview tab + BBCode tab, copy button
│   ├── PreviewPanel     # BBCode → HTML rendered preview
│   └── SyntaxEditor     # Shared editor component with line numbers
├── hooks/
│   ├── useFileService   # Tauri file dialogs (Open, Save As)
│   ├── useLocalStorage  # Browser storage
│   ├── useAutoSave      # Draft persistence
│   └── useRecentFiles   # Recent files list
├── lib/
│   ├── converter.ts     # Markdown → BBCode conversion (pure functions)
│   ├── linter.ts        # BBCode validation
│   ├── markdown-linter.ts # Markdown validation  
│   ├── highlighter.ts   # Syntax highlighting tokens
│   ├── renderer.ts      # BBCode → HTML for preview
│   ├── markdown-renderer.ts # Markdown → HTML for preview
│   ├── contexts.ts      # Steam context types (announcements, guides, etc.)
│   ├── welcome.ts       # Default welcome document
│   └── __tests__/       # Vitest unit tests
└── styles/
    ├── app.css          # Main styles with CSS variables
    └── steam-theme.css  # Steam-accurate preview styling
```

## Key Files to Know

- **`src/lib/converter.ts`** - The heart of the app. All Markdown→BBCode conversion logic.
- **`src/lib/linter.ts`** - BBCode validation rules. Context-aware (announcements vs guides vs forums).
- **`src/lib/markdown-linter.ts`** - Markdown validation. Catches Confluence artifacts.
- **`src/App.tsx`** - Main component. Large file but well-organized with regions.
- **`scripts/bump-version.sh`** - Release script. Run with `npm run release`.

## Testing

```bash
npm run test:run    # Run all tests once
npm run test        # Watch mode
```

Tests are in `src/lib/__tests__/`. Currently 123 tests covering converter and linters.

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
