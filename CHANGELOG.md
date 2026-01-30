# Changelog

All notable changes to SteamBBEditor will be documented in this file.

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
