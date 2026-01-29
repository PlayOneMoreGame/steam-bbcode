# Building Steam BBCode Desktop App

This document explains how to build the Steam BBCode converter as a native macOS app using Tauri.

## Prerequisites (Build Machine Only)

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
│   └── Steam BBCode_1.0.0_aarch64.dmg   # Distributable disk image
└── macos/
    └── Steam BBCode.app                  # The app bundle
```

## Distributing to Your Team

### Option 1: Share the .dmg (Recommended)
Send the `.dmg` file from `src-tauri/target/release/bundle/dmg/`. 

Team members:
1. Double-click the `.dmg`
2. Drag "Steam BBCode" to Applications
3. Done!

### Option 2: Share the .app directly
Zip the `.app` bundle and share. Team members unzip and move to Applications.

## Troubleshooting

### "App is damaged and can't be opened"
This happens with unsigned apps. Your team can fix it by running:
```bash
xattr -cr /Applications/Steam\ BBCode.app
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
    "productName": "Steam BBCode",
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
