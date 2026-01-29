# Steam BBCode Editor - Technical Analysis & Roadmap

## 1. Editor Design (Text Formatting, Linting, Syntax Highlighting)

### Current State
- ✅ Basic syntax highlighting via regex tokenization
- ✅ Line numbers with scroll sync
- ✅ Linting with line number references
- ✅ Error/warning badges in header

### Easy Gains (Implementing Now)
- [ ] **Error line highlighting** - Red/orange background on lines with errors in gutter
- [ ] **Clickable lint messages** - Click to scroll editor to that line
- [ ] **Tab key handling** - Insert 2 spaces instead of changing focus
- [ ] **Better token coverage** - Add missing patterns (URLs, numbers, etc.)
- [ ] **Selection preservation** - Maintain cursor position on re-render
- [ ] **Keyboard shortcuts** - Ctrl+S to save, shown in tooltips

### High Complexity (TODOs)
- [ ] Bracket/tag matching with highlight on hover
- [ ] Multi-cursor editing (Cmd+D style)
- [ ] Find/replace dialog
- [ ] Code folding for sections
- [ ] Proper undo/redo history stack (beyond browser default)
- [ ] Autocomplete dropdown for BBCode tags
- [ ] Minimap for large documents
- [ ] Diff view for comparing versions

---

## 2. Web Editor UX Best Practices

### Current State
- ✅ Three-panel responsive layout
- ✅ Save/Revert/Copy consistent actions
- ✅ Active panel indication
- ✅ localStorage persistence

### Easy Gains (Implementing Now)
- [ ] **beforeunload warning** - Warn if unsaved changes when leaving
- [ ] **Keyboard shortcuts** - Ctrl+S (save), Ctrl+Shift+C (copy), Escape (blur)
- [ ] **Focus ring styles** - Clear focus indicators for accessibility
- [ ] **Double-click to select word** - Already native, but ensure not broken
- [ ] **Tooltip hints** - Show keyboard shortcuts in button titles
- [ ] **Smooth scroll to error** - Animated scroll when clicking lint message

### High Complexity (TODOs)
- [ ] Resizable panels with drag handles
- [ ] Drag-and-drop file upload
- [ ] Virtual scrolling for documents >10k lines
- [ ] Split view (side-by-side same document)
- [ ] Themes (light/dark/custom)
- [ ] Export to multiple formats (HTML, PDF)
- [ ] Collaborative editing with cursors
- [ ] Mobile-optimized touch interactions

---

## 3. Steam BBCode Specifics

### Steam BBCode Reference

#### Supported Tags by Context
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
| `[spoiler]` | ✅ | ✅ | ✅ | ❌ |
| `[table]` `[tr]` `[td]` `[th]` | ✅ | ✅ | ✅ | ❌ |
| `[hr]` | ✅ | ✅ | ✅ | ✅ |
| `[previewyoutube=]` | ✅ | ✅ | ❌ | ❌ |
| `[noparse]` | ✅ | ✅ | ✅ | ✅ |

#### Character Limits
- **Announcements**: 8,000 characters
- **Guides**: 8,000 characters per section
- **Forums**: 4,000 characters
- **Reviews**: 8,000 characters
- **Discord** (for comparison): 2,000 characters

#### Known Quirks & Gotchas
1. **No inline code** - Steam has NO inline code. `code` backticks become bold or nothing.
2. **List items don't close** - `[*]` has no `[/*]`, items end at next `[*]` or `[/list]`
3. **Nested lists are fragile** - Extra whitespace breaks parsing
4. **`[hr]` needs closing** - Must be `[hr][/hr]` not self-closing
5. **Empty tags render weirdly** - `[b][/b]` can cause layout issues
6. **Images in guides** - External URLs often blocked; must use `[previewimg]` with uploaded images
7. **YouTube embeds** - Format is `[previewyoutube=VIDEO_ID;full][/previewyoutube]`
8. **Quote attribution** - `[quote=Author Name]` not `[quote author=""]`
9. **URL format** - `[url=https://...]text[/url]` or `[url]https://...[/url]`
10. **Whitespace matters** - Blank lines in lists break the list

### Common User Mistakes (Lint for These)
1. Using `[.]` or `[-]` instead of `[*]` for list items
2. Forgetting closing tags
3. Nesting tags incorrectly (e.g., `[b][i]text[/b][/i]`)
4. Using HTML tags (`<b>`, `<br>`)
5. Using Markdown in BBCode editor
6. Empty or malformed URLs
7. Inline code backticks (no Steam equivalent)
8. Using `[img]` in reviews (blocked)
9. Exceeding character limits
10. Whitespace issues in nested lists

### Easy Gains (Implementing Now)
- [ ] **Lint for HTML tags** - Warn about `<b>`, `<br>`, etc.
- [ ] **Lint for Markdown syntax** - Warn about `**bold**`, `# header`, etc.
- [ ] **Lint for incorrect nesting** - `[b][i]...[/b][/i]` order
- [ ] **Lint for empty tags** - `[b][/b]`, `[url][/url]`
- [ ] **Better preview accuracy** - Match Steam's actual rendering closer
- [ ] **Tag reference panel** - Quick reference for available tags
- [ ] **Context-specific warnings** - More detailed per-context advice

### High Complexity (TODOs)
- [ ] Steam API integration for true preview
- [ ] Image upload to Steam with `[previewimg]` generation
- [ ] Automatic `[*]` insertion when pressing Enter in list
- [ ] Tag wizard/builder UI
- [ ] Import from Steam (fetch existing post BBCode)
- [ ] A/B test preview (compare contexts)

---

## Implementation Priority

### Phase 1 (This Session)
1. Error line highlighting in gutter
2. Clickable lint messages
3. Tab key handling
4. beforeunload warning
5. Enhanced linting (HTML, Markdown, nesting, empty tags)
6. Keyboard shortcuts with tooltips
7. Tag reference in UI

### Phase 2 (Future)
1. Resizable panels
2. Better mobile experience
3. Find/replace
4. Themes

### Phase 3 (Future)
1. Autocomplete
2. Tag matching highlight
3. Virtual scrolling
4. Export options
