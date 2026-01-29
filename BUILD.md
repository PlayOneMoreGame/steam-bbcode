# Building SteamBBEditor

This document covers building both the web app and desktop app.

---

## Quick Reference for Build Systems

### Web App Build (Static Files)

**Requirements:**
- Node.js 20+

**Commands:**
```bash
npm ci                  # Install dependencies (use ci, not install, for reproducible builds)
npm run test:run        # Run tests (optional but recommended)
npm run build           # Build production bundle
```

**Output:**
```
dist/
├── index.html          # Entry point
└── assets/
    ├── index-*.css     # ~18KB
    └── index-*.js      # ~180KB
```

**Deploy:** Copy `dist/` contents to any static file host (S3, nginx, Apache, etc.)

---

### Desktop App Build

**Requirements:**
- Node.js 20+
- Rust (latest stable)
- Platform-specific:
  - macOS: Xcode Command Line Tools
  - Windows: Visual Studio Build Tools with C++ workload

**Commands:**
```bash
npm ci                  # Install dependencies
npm run test:run        # Run tests (optional)
npm run tauri:build     # Build desktop app
```

**Output by Platform:**

| Platform | Output Path | File |
|----------|-------------|------|
| macOS (ARM) | `src-tauri/target/release/bundle/dmg/` | `SteamBBEditor_X.X.X_aarch64.dmg` |
| macOS (Intel) | `src-tauri/target/release/bundle/dmg/` | `SteamBBEditor_X.X.X_x64.dmg` |
| Windows | `src-tauri/target/release/bundle/msi/` | `SteamBBEditor_X.X.X_x64_en-US.msi` |

**Cross-compilation:** Not supported. Build on target platform.

---

### Version Info

Version is stored in three files (kept in sync by `npm run version:*` commands):
- `version.json` - source of truth
- `package.json` - Node version
- `src-tauri/tauri.conf.json` - Desktop app version

Current version: Run `npm run version:show`

---

### Code Signing (Optional)

For unsigned builds, users see security warnings:
- **macOS:** "App is damaged" → Run `xattr -cr /path/to/app`
- **Windows:** SmartScreen warning → Click "More info" → "Run anyway"

For signed builds:
- **macOS:** Requires Apple Developer certificate ($99/yr), set `APPLE_CERTIFICATE` env vars
- **Windows:** Requires EV code signing certificate (~$400/yr), configure in `tauri.conf.json`

---

## Detailed Instructions

### Prerequisites (Build Machine Only)

Your team members don't need any of this—only the person building the app does.

### 1. Install Xcode Command Line Tools
```bash
xcode-select --install
```

### 2. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
Follow the prompts, then restart your terminal or run:
```bash
source $HOME/.cargo/env
```

### 3. Install Node.js
If you don't have Node.js, install via Homebrew:
```bash
brew install node
```

## Building the App

### 1. Install Dependencies
```bash
cd steam-bbcode
npm install
```

### 2. Generate App Icons

Before building, you need to generate the app icons from the SVG:

**Option A: Use Tauri's icon generator (easiest)**
```bash
npm run tauri icon src-tauri/icons/app-icon.svg
```

**Option B: Manual (if you have a custom PNG)**
If you have a 1024x1024 PNG icon, you can use it directly:
```bash
npm run tauri icon path/to/your-icon.png
```

This generates all required icon sizes in `src-tauri/icons/`.

### 3. Build the App
```bash
npm run tauri:build
```

This will:
1. Build the web app (`npm run build`)
2. Compile the Rust wrapper
3. Bundle everything into a macOS app

Build output location:
```
src-tauri/target/release/bundle/
├── dmg/
│   └── SteamBBEditor_1.0.0_aarch64.dmg   # Distributable disk image
└── macos/
    └── SteamBBEditor.app                  # The app bundle
```

## Distributing to Your Team

### Option 1: Share the .dmg (Recommended)
Send the `.dmg` file from `src-tauri/target/release/bundle/dmg/`. 

Team members:
1. Double-click the `.dmg`
2. Drag "SteamBBEditor" to Applications
3. Done!

### Option 2: Share the .app directly
Zip the `.app` bundle and share. Team members unzip and move to Applications.

## Troubleshooting

### "App is damaged and can't be opened"
This happens with unsigned apps. Your team can fix it by running:
```bash
xattr -cr /Applications/SteamBBEditor.app
```

### To avoid this (Code Signing)
For proper distribution, you'd need an Apple Developer account ($99/year) to sign the app. For internal team use, the `xattr` workaround is fine.

### Build fails with Rust errors
Make sure Rust is up to date:
```bash
rustup update
```

### Build fails with Node errors
Clear and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Development Mode

To run the app in development mode with hot reload:
```bash
npm run tauri:dev
```

This opens the app and reloads when you change code.

## Customizing the App

### App Name & Version
Edit `src-tauri/tauri.conf.json`:
```json
{
  "package": {
    "productName": "SteamBBEditor",
    "version": "1.0.0"
  }
}
```

### Window Size
Edit the `windows` section in `tauri.conf.json`:
```json
"windows": [
  {
    "width": 1400,
    "height": 800,
    "minWidth": 900,
    "minHeight": 600
  }
]
```

### App Icon
Replace `src-tauri/icons/app-icon.svg` with your own, then regenerate:
```bash
npm run tauri icon src-tauri/icons/app-icon.svg
```

## App Size

Expected final `.app` size: **8-15 MB**  
(Much smaller than Electron's 150+ MB!)

---

## Versioning

The project uses semantic versioning (semver) with build numbers.

### Version Commands

```bash
npm run version:show    # Display current version
npm run version:patch   # 1.0.0 -> 1.0.1 (bug fixes)
npm run version:minor   # 1.0.0 -> 1.1.0 (new features)  
npm run version:major   # 1.0.0 -> 2.0.0 (breaking changes)
npm run version:build   # 1.0.0 -> 1.0.0+1 (build number only)
```

### When to Use Each

| Change Type | Command | Example |
|-------------|---------|---------|
| Bug fix, minor tweak | `version:patch` | Fix typo in UI |
| New feature, enhancement | `version:minor` | Add file open dialog |
| Breaking change, major rewrite | `version:major` | Complete redesign |
| CI/CD build, no code change | `version:build` | Automated build |

### Release Workflow

```bash
# 1. Bump version
npm run version:minor

# 2. Commit
git add .
git commit -m "Release v1.1.0"

# 3. Tag
git tag v1.1.0

# 4. Push
git push && git push --tags

# 5. Build
npm run tauri:build
```

---

## Windows Build

### Option 1: GitHub Actions (Recommended)

The `.github/workflows/build.yml` workflow automatically builds for both Mac and Windows when you push a version tag.

```bash
git tag v1.0.0
git push origin v1.0.0
```

Downloads appear in GitHub Releases.

### Option 2: Build on Windows

If building manually on a Windows machine:

```powershell
# Install Rust
winget install Rustlang.Rust.MSVC

# Install Node.js
winget install OpenJS.NodeJS

# Clone repo
git clone https://github.com/PlayOneMoreGame/steam-bbcode.git
cd steam-bbcode

# Install and build
npm install
npm run tauri:build
```

Output: `src-tauri\target\release\bundle\msi\SteamBBEditor_1.0.0_x64_en-US.msi`

### Windows Distribution

Share the `.msi` file. Users double-click to install like any Windows app.

For unsigned apps, users may see SmartScreen warning. Click "More info" → "Run anyway".
