// Markdown to HTML renderer for preview

/**
 * Convert Markdown to HTML for preview
 */
export function markdownToHTML(markdown: string): string {
  let html = markdown;

  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;');
  html = html.replace(/</g, '&lt;');
  html = html.replace(/>/g, '&gt;');

  // Code blocks (fenced) - must be before other processing
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : '';
    return `<pre class="md-codeblock"><code${langClass}>${code.trim()}</code></pre>`;
  });

  // Inline code - must be before other inline processing
  html = html.replace(/`([^`\n]+)`/g, '<code class="md-code">$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');

  // Horizontal rules
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr class="md-hr" />');

  // Images (must be before links)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g, 
    '<img src="$2" alt="$1" class="md-img" loading="lazy" />'
  );

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g, 
    '<a href="$2" class="md-link" target="_blank" rel="noopener">$1</a>'
  );

  // Bold (** or __)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic (* or _)
  html = html.replace(/(?<![*_])\*([^*]+)\*(?![*_])/g, '<em>$1</em>');
  html = html.replace(/(?<![*_])_([^_]+)_(?![*_])/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote class="md-quote">/g, '\n');

  // Lists
  html = processMarkdownLists(html);

  // Paragraphs - wrap remaining text blocks
  // Convert double newlines to paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p>');
  
  // Wrap in paragraph if not already a block element
  if (!html.startsWith('<')) {
    html = '<p>' + html;
  }
  if (!html.endsWith('>')) {
    html = html + '</p>';
  }

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  
  // Convert single newlines to <br> within paragraphs
  html = html.replace(/([^>])\n([^<])/g, '$1<br />$2');

  // Clean up <br> and <p> around block elements
  const blockTags = ['h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr'];
  blockTags.forEach(tag => {
    html = html.replace(new RegExp(`<p>\\s*(<${tag})`, 'gi'), '$1');
    html = html.replace(new RegExp(`(</${tag}>)\\s*</p>`, 'gi'), '$1');
    html = html.replace(new RegExp(`(<${tag}[^>]*>)<br />`, 'gi'), '$1');
    html = html.replace(new RegExp(`<br />(</${tag}>)`, 'gi'), '$1');
  });
  html = html.replace(/(<hr[^>]*>)<br \/>/gi, '$1');
  html = html.replace(/<br \/>(<hr)/gi, '$1');

  return html;
}

/**
 * Process Markdown lists to HTML
 */
function processMarkdownLists(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  for (const line of lines) {
    const unorderedMatch = line.match(/^[-*+] (.+)$/);
    const orderedMatch = line.match(/^\d+\. (.+)$/);

    if (unorderedMatch) {
      if (!inUnorderedList) {
        if (inOrderedList) {
          result.push('</ol>');
          inOrderedList = false;
        }
        result.push('<ul class="md-list">');
        inUnorderedList = true;
      }
      result.push(`<li>${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      if (!inOrderedList) {
        if (inUnorderedList) {
          result.push('</ul>');
          inUnorderedList = false;
        }
        result.push('<ol class="md-olist">');
        inOrderedList = true;
      }
      result.push(`<li>${orderedMatch[1]}</li>`);
    } else {
      if (inUnorderedList) {
        result.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        result.push('</ol>');
        inOrderedList = false;
      }
      result.push(line);
    }
  }

  // Close any open lists
  if (inUnorderedList) result.push('</ul>');
  if (inOrderedList) result.push('</ol>');

  return result.join('\n');
}
