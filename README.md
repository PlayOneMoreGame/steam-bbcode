# SteamBBEditor

Convert content to Steam BBCode with live preview, linting, and translation.

Built for One More Game's marketing, community, and dev teams to streamline patch notes and announcements. Import from Confluence, Markdown, or plain text -- edit, preview, copy, and post to Steam.

## Installation (Team Members)

1. Download the latest `.dmg` from [Releases](../../releases) or Slack
2. Double-click the `.dmg`
3. Drag **SteamBBEditor** to Applications
4. Double-click to run

**First launch:** If you see "can't be opened because Apple cannot check it for malicious software":
- Right-click the app > **Open** > Click **Open** in the dialog

## Getting Started

The app opens with an **interactive welcome document** that shows:
- How the two-panel workflow works
- Formatting examples (bold, lists, links, code)
- Steam BBCode quirks to watch out for
- A sample error you can click to see the "jump to error" feature

The welcome doc resets on each launch. Open a file or paste your content to get started!

## Workflow

```
+-------------------+    +-----------------------------------+
|      EDITOR       |    |             OUTPUT                |
|                   |    |                                   |
| - Open .md file   |--->|  Preview | BBCode | Translation   |
| - Paste content   |    |                                   |
| - Drag & drop     |    |  - Steam-accurate preview         |
| - Auto-detect     |    |  - BBCode source view             |
|   format (MD /    |    |  - Translation (pt-BR, es-LATAM)  |
|   Confluence /    |    |  - Copy to clipboard              |
|   plain text)     |    |  - Character count + lint status  |
| - Syntax colored  |    |                                   |
| - Linting         |    |                                   |
+-------------------+    +-----------------------------------+
```

### Non-Destructive Editing

The app uses a **"Save As"** workflow to protect your source files:

- **Open** loads a file but doesn't lock it
- **Save As** always prompts for a new filename/location
- Original files are never overwritten

### Typical Flow

1. **Open** your patch notes `.md` file (or paste from Confluence)
2. Review the Steam preview in the right panel
3. Make any edits in the editor
4. **Copy** the BBCode and paste into Steam
5. Optionally **Save As** to keep the source for next time

## Features

### Editor Panel (Left)
- **Open** - Load `.md` files from disk
- **Save As** - Save to new `.md` file
- **Format detection** - Auto-detects Markdown, Confluence XHTML, or plain text
- **Linting** - Catches formatting errors (click to jump and select)
- **Syntax highlighting** - One Dark Pro theme
- **Image drag-and-drop** - Drop images to insert placeholders
- **Blacklist detection** - Wavy underlines on configurable blocked terms
- **Auto-save** - Draft persistence to browser storage

### Output Panel (Right)
Tabbed output with three views:

- **Preview** - Live Steam-accurate rendered preview
- **BBCode** - Raw BBCode source for inspection
- **Translation** - Claude API translation (pt-BR, es-LATAM) with DNT glossary

All tabs show character count and lint status. Copy button copies the active tab content.

### Additional Features
- **Image placeholders** - `{placeholder:filename}` resolved via Images panel with Steam URLs
- **Tag reference** - Floating popover with Markdown-to-BBCode mapping
- **Settings panel** - Blacklist term management, DNT glossary
- **Recent files** - Quick access to last opened files (desktop only)
- **Discord splitter** - Auto-split into 2000-char chunks
- **Context-aware linting** - Validates against Steam context rules (Announcements, Guides, Forums, Reviews)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+O` | Open file |
| `Cmd+S` | Save As |
| `Cmd+Shift+C` | Copy BBCode to clipboard |
| `Tab` | Insert 2 spaces |
| `Esc` | Blur editor |

---

## Building the App (Developers Only)

Team members don't need this -- just use the pre-built `.dmg`.

### Prerequisites

```bash
# Xcode Command Line Tools
xcode-select --install

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Node.js (if not installed)
brew install node
```

### Build

```bash
# Install dependencies
npm install

# Generate app icon (first time only)
npm run tauri icon path/to/your-logo.png

# Build the app
npm run tauri:build
```

**Output:**
```
src-tauri/target/release/bundle/dmg/SteamBBEditor_1.0.0_aarch64.dmg
```

### Development Mode

```bash
npm run tauri:dev    # Desktop app with hot reload
npm run dev          # Web-only (no Tauri)
```

### Testing

```bash
npm run test:run     # Run all 551 unit tests once
npm run test         # Watch mode
npx playwright test  # Run 110 E2E tests
```

### Releasing a New Version

```bash
npm run release
```

This interactive script will:
1. Show current version and prompt for bump type (patch/minor/major)
2. Update `package.json`, `Cargo.toml`, and `tauri.conf.json`
3. Commit, tag, and push to GitHub
4. GitHub Actions builds and publishes releases automatically

---

## Project Structure

```
steam-bbcode/
├── src/                    # React frontend
│   ├── components/         # UI panels (Editor, Output, Preview, Settings, Images)
│   ├── lib/                # Conversion, linting, translation, format detection
│   ├── hooks/              # React hooks (file service, auto-save, image store)
│   └── styles/             # CSS (app theme + Steam preview styling)
├── src-tauri/              # Rust/Tauri backend
│   ├── tauri.conf.json     # App config
│   ├── Cargo.toml          # Rust dependencies
│   └── src/main.rs         # Rust entry point
├── e2e/                    # Playwright E2E tests
├── scripts/                # Build & release scripts
├── terraform/              # Infrastructure as code
├── CLAUDE.md               # AI assistant context
├── BUILD.md                # Detailed build instructions
├── WEBAPP.md               # Web deployment guide
└── ROADMAP.md              # Feature tracking
```

## Steam BBCode Reference

### Supported Tags

| Tag | Announcements | Guides | Forums | Reviews |
|-----|:-------------:|:------:|:------:|:-------:|
| `[h1]` `[h2]` `[h3]` | Yes | Yes | Yes | Yes |
| `[b]` `[i]` `[u]` `[strike]` | Yes | Yes | Yes | Yes |
| `[list]` `[olist]` `[*]` | Yes | Yes | Yes | Yes |
| `[url]` | Yes | Yes | Yes | Yes |
| `[img]` | Yes | Limited | Yes | No |
| `[code]` | Yes | Yes | Yes | Yes |
| `[quote]` | Yes | Yes | Yes | Yes |
| `[spoiler]` | Yes | Yes | Yes | No |
| `[table]` | Yes | Yes | Yes | No |
| `[hr]` | Yes | Yes | Yes | Yes |

Limited: Guides require uploaded images with `[previewimg]` tags.

### Character Limits

| Context | Limit |
|---------|------:|
| Announcements | 8,000 |
| Guides (per section) | 8,000 |
| Forums | 4,000 |
| Reviews | 8,000 |
| Discord | 2,000 |

---

## License

MIT -- One More Game
