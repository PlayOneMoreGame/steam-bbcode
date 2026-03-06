/**
 * BBCode tag reference floating popover
 * Shows Markdown <-> BBCode equivalents and Steam quirks
 */
import { useEffect, useRef } from 'react';

interface TagReferenceProps {
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

export function TagReference({ onClose, anchorRef }: TagReferenceProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        anchorRef.current && !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };
    // Use mousedown so the click is caught before the button's onClick toggles
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  return (
    <div className="tag-reference-popover" ref={popoverRef}>
      <table className="tag-ref-table">
        <thead>
          <tr>
            <th>Format</th>
            <th>Markdown</th>
            <th>BBCode</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Bold</td>
            <td><code>**text**</code></td>
            <td><code>[b]text[/b]</code></td>
          </tr>
          <tr>
            <td>Italic</td>
            <td><code>*text*</code></td>
            <td><code>[i]text[/i]</code></td>
          </tr>
          <tr>
            <td>Underline</td>
            <td className="tag-ref-na">--</td>
            <td><code>[u]text[/u]</code></td>
          </tr>
          <tr>
            <td>Strikethrough</td>
            <td><code>~~text~~</code></td>
            <td><code>[strike]text[/strike]</code></td>
          </tr>
          <tr>
            <td>Spoiler</td>
            <td className="tag-ref-na">--</td>
            <td><code>[spoiler]text[/spoiler]</code></td>
          </tr>
          <tr>
            <td>Header 1</td>
            <td><code># Title</code></td>
            <td><code>[h1]Title[/h1]</code></td>
          </tr>
          <tr>
            <td>Header 2</td>
            <td><code>## Section</code></td>
            <td><code>[h2]Section[/h2]</code></td>
          </tr>
          <tr>
            <td>Header 3</td>
            <td><code>### Sub</code></td>
            <td><code>[h3]Sub[/h3]</code></td>
          </tr>
          <tr>
            <td>Link</td>
            <td><code>[text](url)</code></td>
            <td><code>[url=url]text[/url]</code></td>
          </tr>
          <tr>
            <td>Image</td>
            <td><code>![alt](url)</code></td>
            <td><code>[img]url[/img]</code></td>
          </tr>
          <tr>
            <td>Guide image</td>
            <td className="tag-ref-na">--</td>
            <td><code>[previewimg]id[/previewimg]</code></td>
          </tr>
          <tr>
            <td>Bullet list</td>
            <td><code>- Item</code></td>
            <td><code>[list][*]Item[/list]</code></td>
          </tr>
          <tr>
            <td>Numbered list</td>
            <td><code>1. Item</code></td>
            <td><code>[olist][*]Item[/olist]</code></td>
          </tr>
          <tr>
            <td>Quote</td>
            <td><code>&gt; text</code></td>
            <td><code>[quote]text[/quote]</code></td>
          </tr>
          <tr>
            <td>Code</td>
            <td><code>`code`</code></td>
            <td><code>[code]code[/code]</code></td>
          </tr>
          <tr>
            <td>Noparse</td>
            <td className="tag-ref-na">--</td>
            <td><code>[noparse]text[/noparse]</code></td>
          </tr>
          <tr>
            <td>Horizontal rule</td>
            <td><code>---</code></td>
            <td><code>[hr][/hr]</code></td>
          </tr>
          <tr>
            <td>Table</td>
            <td><code>| A | B |</code><br/><code>|---|---|</code><br/><code>| 1 | 2 |</code></td>
            <td><code>[table][tr][th]A[/th]...</code></td>
          </tr>
          <tr>
            <td>YouTube</td>
            <td><code>![](youtube:ID)</code></td>
            <td><code>[previewyoutube=ID;full]</code></td>
          </tr>
        </tbody>
      </table>

      <div className="tag-ref-quirks">
        <h4 className="tag-ref-quirks-title">Steam Quirks</h4>
        <ul className="tag-ref-quirks-list">
          <li><code>[hr]</code> requires a closing tag: <code>[hr][/hr]</code> (not self-closing)</li>
          <li>Nested lists: Steam doesn't support nesting <code>[list]</code> inside <code>[list]</code> — flatten to a single level</li>
          <li><code>[img]</code> vs <code>[previewimg]</code>: Announcements use <code>[img]URL[/img]</code>, guides use <code>[previewimg]ID[/previewimg]</code></li>
          <li>Inline code: No inline code tag exists — backticks are converted to <code>[b]</code></li>
        </ul>
      </div>
    </div>
  );
}
