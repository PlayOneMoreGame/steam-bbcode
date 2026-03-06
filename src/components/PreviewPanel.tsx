import { useMemo } from 'react';
import { bbcodeToHTML } from '@/lib/renderer';

interface PreviewPanelProps {
  content: string;
}

export function PreviewPanel({ content }: PreviewPanelProps) {
  const html = useMemo(() => bbcodeToHTML(content), [content]);

  return (
    <div
      className="preview preview-bbcode"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
