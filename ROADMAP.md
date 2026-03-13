# Steam BBCode Editor - Roadmap

## Current Status (v1.6.0) - Updated 2026-03-13

### Test Coverage
- 559 Vitest unit tests across 21 files
- 119 Playwright E2E tests across 7 spec files
- 678 total tests, all passing

### Completed Features

**Multi-Format Input (Phases 1-2)**
- Two-panel layout (Editor + Output with Preview/BBCode/Translation tabs)
- Confluence XHTML -> BBCode converter with format auto-detection
- Confluence-specific linter
- Markdown -> BBCode converter (original, 39+ tests)
- Format detector: auto-detect Markdown vs Confluence XHTML vs plain text

**Editor**
- Syntax highlighting via regex tokenization
- Line numbers with scroll sync
- Error/warning line highlighting (red/orange gutter)
- Clickable lint messages (scroll to line AND highlight error text)
- Tab key handling (inserts 2 spaces)
- Keyboard shortcuts (Cmd+S, Cmd+O, Escape)
- Paste-at-cursor (splice, not replace)
- Skip welcome document on repeat visits
- Tag reference as floating popover

**Translation**
- Claude API translation (Haiku 4.5) for pt-BR and es-LATAM
- Do Not Translate (DNT) glossary with editable terms
- Translation preview (rendered, not just raw BBCode)
- Per-language character counts

**Content Safety**
- Blocked term detection with word-boundary matching (678 default terms)
- All terms removable including defaults, with "Reset to defaults"
- Wavy underline highlighting in editor
- Settings panel for term management

**Image Handling**
- `{placeholder:filename}` extraction from BBCode
- Images panel for Steam URL resolution
- Per-placeholder URL entry

**Linting (BBCode)**
- Unknown/invalid tag detection
- HTML tag detection with BBCode suggestions
- Markdown syntax warnings
- Tag matching (unclosed, mismatched, nesting order)
- Empty tag warnings
- Context-specific tag support (announcements, guides, forums, reviews)
- List item validation (per-block blank-line detection)
- URL validation
- Character limit warnings
- Friendly error messages with expandable "Why?" explanations

**Linting (Markdown)**
- Unclosed formatting, whitespace in formatting
- Broken link detection
- Confluence syntax warnings
- Nested list warnings

**UX**
- System fonts for UI chrome, Monoid for editor
- macOS scrollbar behavior
- Focus-visible states
- Welcome document (skipped on repeat visits)
- beforeunload warning for unsaved changes
- Dynamic window title with document name

**Desktop App**
- Tauri v1 macOS build (Apple Silicon + Intel)
- Tauri v1 Windows build (x64)
- Native file dialogs (Open, Save As)
- Non-destructive file workflow

**DevOps**
- GitHub Actions CI/CD (multi-platform desktop builds)
- Buildkite CI (web builds via OMG infrastructure)
- Terraform infrastructure (S3 + CloudFront)
- Basic auth for staging
- Semantic versioning with interactive release script

---

## Completed Jira Tickets (19 closed)

| Ticket | Summary |
|--------|---------|
| SMD-4354 | CSS native feel (system fonts, focus-visible, reduced-motion) |
| SMD-4355 | Two-panel layout |
| SMD-4356 | Dynamic window title |
| SMD-4357 | Confluence XHTML converter, format detector, linter |
| SMD-4358 | Playwright E2E test setup |
| SMD-4359 | Output panel UX (char count, lint status) |
| SMD-4360 | Fix hasChanges bug |
| SMD-4361 | E2E test coverage expansion |
| SMD-4362 | Multi-format input UI integration |
| SMD-4370 | Claude API translation with DNT glossary |
| SMD-4371 | Tag reference as floating popover |
| SMD-4372 | Image placeholders with Steam URL entry |
| SMD-4373 | Better lint messages with inline help |
| SMD-4374 | Blacklist term detection |
| SMD-4375 | Basic auth for staging |
| SMD-4376 | Editor header simplification |
| SMD-4381 | Fix nuclear paste (splice at cursor) |
| SMD-4384 | Fix code fence header conversion bug |
| SMD-4386 | Skip welcome document on repeat visits |

---

## Next Up: Code Health (1-2 days)

| Ticket | Summary | Owner | Priority |
|--------|---------|-------|----------|
| SMD-4382 | Extract state hooks from App.tsx | Frontend Engineer | Medium |
| SMD-4383 | Add SyntaxEditor component tests | Frontend Engineer | Medium |

---

## Phase 3 - Native Desktop (2-3 weeks)

### 3a: Menu Bar + Shortcuts (Tauri v1, 3-5 days)

| Ticket | Summary | Owner | Dependency |
|--------|---------|-------|------------|
| SMD-4363 | Native macOS menu bar (static, v1) | Tauri Engineer + Frontend | None |
| SMD-4364 | Keyboard shortcuts: tab switching | Frontend Engineer | Pairs with SMD-4363 |

### 3b: Tauri v2 Migration (1-2 weeks)

| Ticket | Summary | Owner | Dependency |
|--------|---------|-------|------------|
| SMD-4366 | Tauri v1 -> v2 migration | Tauri Engineer (primary) | SMD-4363 done first |

Acceptance: builds on macOS ARM + Intel + Windows, all tests pass, existing features identical.

### 3c: Post-v2 Polish

| Ticket | Summary | Owner | Dependency |
|--------|---------|-------|------------|
| SMD-4365 | Resizable split panes | Frontend Engineer | SMD-4366 |
| SMD-4367 | Native desktop polish (split into sub-tasks) | Tauri + macOS Dev | SMD-4366 |

SMD-4367 should be split:
- Context menus + file associations + drag-drop
- Code signing + notarization (CI work)
- Auto-updater (Tauri v2 updater or Sparkle)

---

## Phase 4 - Platform Integration (future, scope individually)

| Ticket | Summary | Owner | Dependency |
|--------|---------|-------|------------|
| SMD-4368 | Confluence API proxy + credential storage | Tauri + macOS Dev | SMD-4366 (Keychain via v2) |
| SMD-4385 | Debounce syntax highlighting pipeline | Frontend Engineer | None (low priority) |
| SMD-4377 | Meat Stamp copy confirmation animation | Frontend Engineer | Blocked on concept art |

### Ideas (no tickets yet)
- Steam API integration for direct publishing
- Import from Steam (fetch existing post)
- Multi-window / multi-document support

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [README.md](README.md) | User guide, quick start |
| [BUILD.md](BUILD.md) | Desktop app build instructions, versioning |
| [WEBAPP.md](WEBAPP.md) | Web deployment (Amplify, S3, Terraform) |
| [ROADMAP.md](ROADMAP.md) | This file - feature tracking |
| [docs/test-plan.md](docs/test-plan.md) | QA test plan |

---

## Steam BBCode Reference

### Supported Tags by Context

| Tag | Announcements | Guides | Forums | Reviews |
|-----|:-------------:|:------:|:------:|:-------:|
| `[h1]` `[h2]` `[h3]` | Yes | Yes | Yes | Yes |
| `[b]` `[i]` `[u]` `[strike]` | Yes | Yes | Yes | Yes |
| `[list]` `[olist]` `[*]` | Yes | Yes | Yes | Yes |
| `[url]` `[url=]` | Yes | Yes | Yes | Yes |
| `[img]` | Yes | Limited | Yes | No |
| `[previewimg]` | No | Required | No | No |
| `[code]` | Yes | Yes | Yes | Yes |
| `[quote]` `[quote=]` | Yes | Yes | Yes | Yes |
| `[spoiler]` | Yes | Yes | Yes | Yes |
| `[table]` `[tr]` `[td]` `[th]` | Yes | Yes | Yes | No |
| `[hr]` | Yes | Yes | Yes | Yes |
| `[previewyoutube=]` | Yes | Yes | No | No |
| `[noparse]` | Yes | Yes | Yes | Yes |

### Character Limits

| Context | Limit |
|---------|------:|
| Announcements | 8,000 |
| Guides (per section) | 8,000 |
| Forums | 4,000 |
| Reviews | 8,000 |
| Discord | 2,000 |

### Known Quirks

1. **No inline code** - Backticks become bold or nothing
2. **List items don't close** - `[*]` ends at next `[*]` or `[/list]`
3. **Nested lists fragile** - Extra whitespace breaks parsing
4. **`[hr]` needs closing** - Must be `[hr][/hr]`
5. **Empty tags break layout** - `[b][/b]` causes issues
6. **Images in guides** - Must use `[previewimg]` with uploaded images
7. **YouTube format** - `[previewyoutube=VIDEO_ID;full][/previewyoutube]`
8. **Quote attribution** - `[quote=Author]` not `[quote author=""]`
9. **URL format** - `[url=https://...]text[/url]`
10. **Whitespace in lists** - Blank lines break the list
