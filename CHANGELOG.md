# Changelog

All notable changes to SteamBBEditor will be documented in this file.

## [1.7.0] - 2026-03-17

### Added
- **Three-tier workspace config** — studio/title/user configuration model for blocked words, DNT glossary, and localization targets
- **SWAPMEAT title config** — DNT terms, localization targets (pt-BR, es-LATAM), and title-specific blocked words loaded from workspace config
- **Workspace info in Settings** — displays active studio, title, and languages
- **Reset confirmation dialogs** — 3-second two-step confirmation prevents accidental resets
- **Concurrent translation guard** — prevents double-firing translation API calls
- **useAutoSave unit tests** — 28 tests covering formatLastSaved and auto-save algorithm
- **ESLint 9 flat config** and Prettier setup

### Fixed
- **Blacklist linter offsets** — line/column positions now correctly reference original BBCode, not tag-stripped text
- **URL XSS in preview** — href attributes now escaped with `escapeHtmlAttr` to prevent attribute injection
- **YouTube embed format** — converter now outputs `[previewyoutube=ID;full]` matching Steam's required format
- **Stray list item detection** — `[*]` outside lists now points to the correct line in the original BBCode
- **Empty translation guard** — empty content returns immediately instead of calling the API
- **Translated preview images** — image placeholders now display in translated previews, not just English
- **New document confirmation** — File > New warns before discarding unsaved changes
- **Code fence protection** — headers inside fenced code blocks no longer get converted
- **Nuclear paste** — paste now inserts at cursor instead of replacing entire editor content
- **handlePaste stale closure** — fixed missing dependency in useCallback
- **Windows path splitting** — file name extraction handles both `/` and `\` separators

### Changed
- **Protected blocked words** — 678 studio-level defaults are immutable, marked with lock icons
- **DNT glossary from config** — terms loaded from title config instead of hardcoded defaults
- **Localization targets from config** — language list driven by title config, not hardcoded
- **App.tsx refactored** — extracted 4 state hooks (useBlacklist, useDntTerms, useTranslation, useFormatDetection), 541 → 425 lines
- **createTermStore factory** — eliminated ~250 lines of duplication across blacklist and DNT stores
- **Tag reference** — repositioned as floating popover
- **Welcome document** — skipped on repeat visits
- **Copyright updated** to 2026

## [1.6.0] - 2026-01-30

### Added
- **Confluence XHTML converter** — paste Confluence content directly, auto-detected and converted to BBCode
- **Format auto-detection** — automatically identifies Markdown, Confluence XHTML, or plain text input
- **Confluence-specific linter** — validates Confluence-format input with targeted warnings
- **Two-panel layout** — Editor + Output (with Preview/BBCode/Translation tabs)
- **Claude API translation** — translate BBCode to pt-BR and es-LATAM via Claude Haiku 4.5
- **Do Not Translate glossary** — editable DNT terms preserved during translation
- **Blocked term detection** — 678 default terms with word-boundary matching and wavy underline highlighting
- **Image placeholders** — `{placeholder:filename}` extraction with Steam URL resolution panel
- **Better lint messages** — expandable "Why?" help text with friendly explanations
- **Native macOS menu bar** — File, Edit, View, Window, Help menus with keyboard shortcuts
- **Dynamic window title** — shows current document name
- **CSS native feel** — system fonts, macOS scrollbars, focus-visible states, reduced-motion support
- **Basic auth for staging** — CloudFront function protects staging environment

### Fixed
- hasChanges tracking uses opened file content, not welcome document

## [1.5.3] - 2026-01-30

### Fixed
- TypeScript build errors (`start`/`end` → `column`/`length` in linter)
- Removed unused `checkUnformattedText` functions

## [1.5.2] - 2026-01-30

### Added
- Interactive release script (`npm run release`)
- Detects existing git tags, warns before overwriting

### Changed
- Version bump workflow now fully automated

## [1.5.1] - 2026-01-30

### Fixed
- Release script tag detection

## [1.5.0] - 2026-01-30

### Added
- **Welcome document** - Interactive tutorial shown on launch demonstrating the Confluence → Steam workflow
- **Click-to-select errors** - Clicking a lint error jumps to the line AND highlights the problem text

### Changed
- **One Dark Pro theme** - Warmer dark theme with vibrant syntax highlighting
- **Monoid font** - Loaded via CDN with JetBrains Mono fallback  
- Content no longer auto-persists - welcome doc shows fresh on each launch

### Fixed
- Markdown linter no longer false-positives on multiple bold spans per line
- Line numbers scroll in sync with editor content
- BBCode linter recognizes `[*]` as valid list marker
- Both editor panels have consistent click-to-error behavior

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
