# Steam BBCode Editor - Technical Analysis & Roadmap

## Current Status (v1.5.0)

### Completed Features ✅

**Editor**
- ✅ Syntax highlighting via regex tokenization
- ✅ Line numbers with scroll sync
- ✅ Error/warning line highlighting (red/orange gutter)
- ✅ Clickable lint messages (scroll to line AND highlight error text)
- ✅ Tab key handling (inserts 2 spaces)
- ✅ Keyboard shortcuts (Cmd+S, Cmd+O, Escape)
- ✅ Linting with line number references
- ✅ Error/warning badges in header
- ✅ Tag reference panel (Tags button in header)
- ✅ One Dark Pro theme with Monoid font
- ✅ Modular CSS variables system

**UX**
- ✅ Three-panel responsive layout
- ✅ Save As / Revert / Copy consistent actions
- ✅ Open file dialog (Tauri native)
- ✅ Active panel indication
- ✅ localStorage persistence
- ✅ beforeunload warning for unsaved changes
- ✅ Keyboard shortcut tooltips
- ✅ Focus ring styles for accessibility
- ✅ Smooth scroll to error lines
- ✅ In-app feedback link (→ GitHub Issues)

**BBCode Linting**
- ✅ Unknown/invalid tag detection
- ✅ HTML tag detection with BBCode suggestions
- ✅ Markdown syntax warnings
- ✅ Tag matching (unclosed, mismatched)
- ✅ Tag nesting order validation
- ✅ Empty tag warnings
- ✅ Context-specific tag support warnings
- ✅ List item validation
- ✅ URL validation
- ✅ Character limit warnings
- ✅ Invalid bracket pattern detection (`[-]`, `[+]`, etc.)
- ✅ Unformatted text warnings

**Markdown Linting**
- ✅ Unclosed formatting detection
- ✅ Whitespace in formatting warnings
- ✅ Broken link detection
- ✅ Confluence syntax warnings
- ✅ Nested list warnings
- ✅ Invalid bracket patterns
- ✅ Unformatted text warnings

**Desktop App**
- ✅ Tauri macOS build (Apple Silicon)
- ✅ Tauri macOS build (Intel x64)
- ✅ Tauri Windows build (x64)
- ✅ Native file dialogs (Open, Save As)
- ✅ Non-destructive file workflow

**Testing**
- ✅ Vitest unit tests (83 tests)
- ✅ Converter tests (39 tests)
- ✅ Linter tests (44 tests)
- ✅ Playwright E2E setup

**DevOps**
- ✅ GitHub Actions CI/CD (multi-platform builds)
- ✅ Semantic versioning system
- ✅ GitHub Issue templates (Bug Report, Feature Request)
- ✅ Web deployment docs (AWS Amplify, S3+CloudFront)

---

## Phase 2 - Planned

### High Priority
- [ ] **Auto-update** - Check for new versions, notify users
- [ ] **Web hosting** - Deploy to steambbeditor.onemoregame.com (see WEBAPP.md)

### Medium Priority
- [ ] Resizable panels with drag handles
- [ ] Find/replace dialog
- ✅ Themes - One Dark Pro implemented (dark only for now)
- [ ] Better mobile experience

### Low Priority
- [ ] Bracket/tag matching highlight on hover
- [ ] Multi-cursor editing
- [ ] Code folding for sections
- [ ] Autocomplete dropdown for BBCode tags
- [ ] Virtual scrolling for large documents

---

## Phase 3 - Future

- [ ] Steam API integration for true preview
- [ ] Image upload with `[previewimg]` generation
- [ ] Automatic `[*]` insertion in lists
- [ ] Tag wizard/builder UI
- [ ] Import from Steam (fetch existing post)
- [ ] Export to PDF/HTML
- [ ] Collaborative editing

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [README.md](README.md) | User guide, quick start |
| [BUILD.md](BUILD.md) | Desktop app build instructions, versioning |
| [WEBAPP.md](WEBAPP.md) | Web deployment (Amplify, S3, Terraform) |
| [ROADMAP.md](ROADMAP.md) | This file - feature tracking |

---

## Steam BBCode Reference

### Supported Tags by Context

| Tag | Announcements | Guides | Forums | Reviews |
|-----|:-------------:|:------:|:------:|:-------:|
| `[h1]` `[h2]` `[h3]` | ✅ | ✅ | ✅ | ✅ |
| `[b]` `[i]` `[u]` `[strike]` | ✅ | ✅ | ✅ | ✅ |
| `[list]` `[olist]` `[*]` | ✅ | ✅ | ✅ | ✅ |
| `[url]` `[url=]` | ✅ | ✅ | ✅ | ✅ |
| `[img]` | ✅ | ⚠️ Limited | ✅ | ❌ |
| `[previewimg]` | ❌ | ✅ Required | ❌ | ❌ |
| `[code]` | ✅ | ✅ | ✅ | ✅ |
| `[quote]` `[quote=]` | ✅ | ✅ | ✅ | ✅ |
| `[spoiler]` | ✅ | ✅ | ✅ | ✅ |
| `[table]` `[tr]` `[td]` `[th]` | ✅ | ✅ | ✅ | ❌ |
| `[hr]` | ✅ | ✅ | ✅ | ✅ |
| `[previewyoutube=]` | ✅ | ✅ | ❌ | ❌ |
| `[noparse]` | ✅ | ✅ | ✅ | ✅ |

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
