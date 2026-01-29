# Steam BBCode Editor

Convert Markdown to Steam BBCode with live preview, linting, and Discord export.

Built for the OMG marketing team to streamline patch notes and announcements.

## Installation (Team Members)

1. Download the latest `.dmg` from [Releases](../../releases) or Slack
2. Double-click the `.dmg`
3. Drag **SteamBBEditor** to Applications
4. Double-click to run

**First launch:** If you see "can't be opened because Apple cannot check it for malicious software":
- Right-click the app → **Open** → Click **Open** in the dialog

## Workflow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    MARKDOWN     │───▶│   STEAM BBCODE  │───▶│  STEAM PREVIEW  │
│                 │    │                 │    │                 │
│ • Open .md file │    │ • Auto-converted│    │ • Live render   │
│ • Paste content │    │ • Editable      │    │ • Steam styling │
│ • Syntax colored│    │ • Save As .txt  │    │                 │
│ • Linting       │    │ • Copy for Steam│    │                 │
│ • Save As .md   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Non-Destructive Editing

The app uses a **"Save As"** workflow to protect your source files:

- **Open** loads a file but doesn't lock it
- **Save As** always prompts for a new filename/location
- Original files are never overwritten
- Each panel (Markdown/BBCode) saves independently

### Typical Flow

1. **Open** your patch notes `.md` file (or paste from Confluence)
2. Review the auto-converted BBCode
3. Make any Steam-specific tweaks in the BBCode panel
4. **Copy** the BBCode and paste into Steam
5. Optionally **Save As** to keep the BBCode for next time

## Features

### Markdown Panel (Left)
- **Open** - Load `.md` files from disk
- **Save As** - Save to new `.md` file
- **Copy** - Copy to clipboard
- **Discord** - Auto-split into 2000-char chunks
- **Linting** - Catches formatting errors
- **Syntax highlighting**

### BBCode Panel (Middle)
- **Auto-converted** from Markdown in real-time
- **Editable** - Make Steam-specific tweaks
- **Save As** - Save to `.txt` file
- **Copy** - Copy for pasting into Steam
- **Revert** - Undo edits, re-sync with Markdown
- **Context-aware linting** - Warns about unsupported tags

### Preview Panel (Right)
- **Live render** approximating Steam's styling
- **Toggle** between Markdown and BBCode preview
- Updates as you type

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+O` | Open file |
| `Cmd+S` | Save As |
| `Cmd+Shift+C` | Copy to clipboard |
| `Tab` | Insert 2 spaces |
| `Esc` | Blur editor |

---

## Building the App (Developers Only)

Team members don't need this—just use the pre-built `.dmg`.

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

### Releasing a New Version

1. Update version in `src-tauri/tauri.conf.json` and `package.json`
2. `npm run tauri:build`
3. Upload `.dmg` to GitHub Releases (or share via Slack)

---

## Project Structure

```
steam-bbcode/
├── src/                    # React frontend
│   ├── components/         # UI panels
│   ├── lib/                # Conversion, linting, highlighting
│   ├── hooks/              # React hooks
│   └── styles/             # CSS
├── src-tauri/              # Rust/Tauri backend
│   ├── tauri.conf.json     # App config
│   ├── Cargo.toml          # Rust dependencies
│   └── src/main.rs         # Rust entry point
├── BUILD.md                # Detailed build instructions
└── ROADMAP.md              # Future improvements
```

## Steam BBCode Reference

### Supported Tags

| Tag | Announcements | Guides | Forums | Reviews |
|-----|:-------------:|:------:|:------:|:-------:|
| `[h1]` `[h2]` `[h3]` | ✓ | ✓ | ✓ | ✓ |
| `[b]` `[i]` `[u]` `[strike]` | ✓ | ✓ | ✓ | ✓ |
| `[list]` `[olist]` `[*]` | ✓ | ✓ | ✓ | ✓ |
| `[url]` | ✓ | ✓ | ✓ | ✓ |
| `[img]` | ✓ | ⚠️ | ✓ | ✗ |
| `[code]` | ✓ | ✓ | ✓ | ✓ |
| `[quote]` | ✓ | ✓ | ✓ | ✓ |
| `[spoiler]` | ✓ | ✓ | ✓ | ✗ |
| `[table]` | ✓ | ✓ | ✓ | ✗ |
| `[hr]` | ✓ | ✓ | ✓ | ✓ |

⚠️ Guides require uploaded images with `[previewimg]` tags.

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

MIT — One More Game
