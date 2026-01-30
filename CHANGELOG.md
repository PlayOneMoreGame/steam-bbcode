# Changelog

All notable changes to SteamBBEditor will be documented in this file.

## [1.4.7] - 2026-01-30

### Added
- **Click-to-select** - Clicking on a lint error now jumps to the line AND highlights the problem text
- Linters now return column and length for precise text selection

### Fixed
- Line numbers now scroll in sync with editor content (absolute positioning + relative line-height)
- Whitespace warnings no longer trigger false positives for normal `**bold**` text
- BBCode linter now recognizes `[*]` as valid tag (was incorrectly flagging list items as unformatted)
- Empty brackets `[]` now flagged as invalid pattern
- Both editor panels now have consistent lint click behavior

## [1.4.2] - 2026-01-29

### Added
- Invalid bracket pattern detection (`[-]`, `[+]`, `[.]`) flagged as errors
- Unformatted text warnings for lines with no Markdown/BBCode syntax
- Increased lint panel height (200px) to show more warnings

## [1.4.1] - 2026-01-29

### Fixed
- CSS `@import` order (fonts must be first)

## [1.4.0] - 2026-01-29

### Added
- **One Dark Pro theme** - Warmer dark theme with vibrant syntax highlighting
- **Monoid font** - Loaded via CDN with JetBrains Mono fallback
- **Modular CSS variables** - All colors/fonts now use CSS custom properties
- **Distinct preview styling** - Markdown preview is neutral (white), Steam preview shows exact Steam styling
- **Whitespace linting** - Detects malformed bold/italic/lists in Markdown
- **Extra whitespace after list marker** warnings
- **Markdown linter test suite** - Comprehensive test coverage

### Changed
- Footer redesigned with keyboard shortcut badges (`⌘O`, `⌘S`)
- Preview panel labels clarify "Source Preview" vs "Steam Preview"
- Lint panel scrollable with increased height

## [1.3.0] - 2026-01-29

### Added
- **Tags reference panel now shows both Markdown and BBCode** - Side-by-side comparison table makes it easy to see how to format content in either syntax
- **Recent files dropdown** (Desktop only) - Quick access to last 5 opened files from the Open button
- **Open button on BBCode panel** - Load existing BBCode files directly for editing
- **Auto-save draft** - Your work is automatically saved to browser storage every 2 seconds
- **E2E test suite** - Playwright tests for UI validation

### Changed
- Tags panel redesigned as a compact table with Format, Markdown, and BBCode columns
- Panel actions now consistent across Markdown and BBCode panels (Open, Revert, Save As, Copy)

### Fixed
- Panel parity - both editors now have the same action buttons

## [1.2.0] - 2026-01-29

### Added
- GitHub Actions CI/CD for multi-platform builds (macOS ARM, macOS Intel, Windows)
- Semantic versioning system with `npm run version:*` commands
- GitHub Issue templates for bug reports and feature requests
- In-app feedback link in footer

## [1.1.0] - 2026-01-29

### Added
- Vitest test suite (83 tests) for converter and linter
- Web deployment documentation (WEBAPP.md)

### Fixed
- Nested formatting conversion (bold inside italic, etc.)
- List processing order to prevent conflicts with italic conversion

## [1.0.0] - 2026-01-28

### Added
- Initial release
- Markdown to Steam BBCode converter
- Three-panel layout (Markdown, BBCode, Preview)
- Syntax highlighting for both Markdown and BBCode
- BBCode linter with context-aware validation
- Steam context selector (Announcements, Guides, Forums, Reviews)
- Character limit warnings
- Native file dialogs (Desktop)
- Keyboard shortcuts (Cmd+O, Cmd+S)
- Discord message splitter
- Tag reference panel
