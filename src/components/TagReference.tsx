/**
 * Static BBCode tag reference table
 * Shows Markdown ↔ BBCode equivalents
 */
export function TagReference() {
  return (
    <div className="tag-reference">
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
            <td>Strikethrough</td>
            <td><code>~~text~~</code></td>
            <td><code>[strike]text[/strike]</code></td>
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
      <div className="tag-ref-note">
        Underline (<code>[u]</code>) and Spoiler (<code>[spoiler]</code>) have no Markdown equivalent — edit BBCode directly.
      </div>
    </div>
  );
}
