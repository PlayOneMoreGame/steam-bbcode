import { useMemo } from 'react';
import { bbcodeToHTML } from '@/lib/renderer';
import { markdownToHTML } from '@/lib/markdown-renderer';

export type PreviewMode = 'markdown' | 'bbcode';

interface PreviewPanelProps {
  content: string;
  mode: PreviewMode;
}

export function PreviewPanel({ content, mode }: PreviewPanelProps) {
  const html = useMemo(() => {
    if (mode === 'markdown') {
      return markdownToHTML(content);
    } else {
      return bbcodeToHTML(content);
    }
  }, [content, mode]);

  return (
    <div
      className={`preview preview-${mode}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
