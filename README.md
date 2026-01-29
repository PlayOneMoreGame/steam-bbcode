# Steam BBCode Converter

Convert Markdown (from Confluence, etc.) to Steam BBCode with live preview, syntax highlighting, and Discord export.

## Workflow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    MARKDOWN     │───▶│   STEAM BBCODE  │───▶│  STEAM PREVIEW  │
│                 │    │                 │    │                 │
│ • Paste from    │    │ • Auto-converted│    │ • Live render   │
│   Confluence    │    │ • Syntax colored│    │ • Approximates  │
│ • Syntax colored│    │ • Editable      │    │   Steam styling │
│ • Linting       │    │ • Save to file  │    │                 │
│ • Export full   │    │ • Copy for Steam│    │                 │
│ • Discord chunks│    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Features

### Markdown Panel (Left)
- **Syntax highlighting** for headers, bold, italic, code, links, etc.
- **Linting** catches unclosed formatting, broken links, Confluence syntax
- **Export full** as `.md` file
- **Discord chunks** - auto-split at 2000 chars, copy individually

### BBCode Panel (Middle)  
- **Auto-converted** from Markdown
- **Syntax highlighting** for BBCode tags
- **Independently editable** - make Steam-specific tweaks
- **Reset** to re-sync with Markdown
- **Save** to file or copy for Steam

### Preview Panel (Right)
- **Live render** of BBCode
- **Approximates Steam styling** (headers, lists, quotes, etc.)
- Updates as you edit either panel

## Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Desktop App (macOS)

Build a native macOS app to distribute to your team:

```bash
npm run tauri:build
```

Output: `src-tauri/target/release/bundle/dmg/Steam BBCode_1.0.0_aarch64.dmg`

See **[BUILD.md](BUILD.md)** for full instructions (Rust installation, code signing, etc.)

## Build & Deploy (Web)

```bash
npm run build      # Production build
npm run preview    # Preview locally
```

### Deploy Options

**Vercel:** `npx vercel`

**Netlify:** `npx netlify deploy --prod --dir=dist`

**GitHub Pages:** Add `base: '/repo-name/'` to vite.config.ts, build, push dist/ to gh-pages

## Project Structure

```
src/
├── lib/
│   ├── contexts.ts        # Steam tag support matrix
│   ├── converter.ts       # MD → BBCode conversion
│   ├── linter.ts          # BBCode structural validation
│   ├── markdown-linter.ts # Markdown validation
│   ├── highlighter.ts     # Syntax highlighting tokens
│   ├── renderer.ts        # BBCode → HTML preview
│   └── splitter.ts        # Discord chunking
├── components/
│   ├── MarkdownPanel.tsx  # Left panel
│   ├── BBCodePanel.tsx    # Middle panel
│   ├── PreviewPanel.tsx   # Right panel
│   └── SyntaxEditor.tsx   # Highlighted editor
├── hooks/
│   └── useLocalStorage.ts # Persistence
└── styles/
    ├── app.css            # Layout & syntax colors
    └── steam-theme.css    # Preview styling
```

## Extending

### Add Markdown lint rules
Edit `src/lib/markdown-linter.ts`

### Add BBCode lint rules
Edit `src/lib/linter.ts`

### Add syntax highlighting
Edit `src/lib/highlighter.ts`

### Add Steam context
Edit `src/lib/contexts.ts`

## Steam BBCode Reference

### Supported Tags by Context

| Tag | Announcements | Guides | Forums | Reviews |
|-----|---------------|--------|--------|---------|
| `[h1]`, `[h2]`, `[h3]` | ✓ | ✓ | ✓ | ✓ |
| `[list]`, `[olist]` | ✓ | ✓ | ✓ | ✓ |
| `[table]` | ✓ | ✓ | ✓ | ✗ |
| `[img]` | ✓ | Limited* | ✓ | ✗ |
| `[video]` | ✓ | ✓ | ✗ | ✗ |

*Guides require uploaded images with `[previewimg]` tags.

### Character Limits

| Context | Limit |
|---------|-------|
| Announcements | ~8000 |
| Guides | ~8000/section |
| Forums | ~4000 |
| Reviews | ~8000 |
| Discord | 2000 |

## License

MIT
