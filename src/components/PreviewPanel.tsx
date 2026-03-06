import { useMemo } from 'react';
import { bbcodeToHTML, type ImageDataUrlMap } from '@/lib/renderer';

interface PreviewPanelProps {
  content: string;
  imageDataUrls?: ImageDataUrlMap;
}

export function PreviewPanel({ content, imageDataUrls }: PreviewPanelProps) {
  const html = useMemo(() => bbcodeToHTML(content, imageDataUrls), [content, imageDataUrls]);

  return (
    <div
      className="preview preview-bbcode"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
