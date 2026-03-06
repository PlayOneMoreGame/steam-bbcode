import { useState, useCallback, type ChangeEvent } from 'react';
import type { ImageUrlMap } from '@/lib/image-placeholders';
import { countUnresolved } from '@/lib/image-placeholders';
import type { SteamContext } from '@/lib/contexts';

interface ImagesPanelProps {
  filenames: string[];
  imageUrls: ImageUrlMap;
  onUrlChange: (filename: string, url: string) => void;
  context: SteamContext;
  /** Map of blob filenames to data URLs for thumbnail previews */
  imageDataUrls?: Map<string, string>;
}

export function ImagesPanel({ filenames, imageUrls, onUrlChange, context, imageDataUrls }: ImagesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const unresolvedCount = countUnresolved(filenames, imageUrls);
  const allResolved = unresolvedCount === 0;

  const handleChange = useCallback((filename: string, e: ChangeEvent<HTMLInputElement>) => {
    onUrlChange(filename, e.target.value);
  }, [onUrlChange]);

  if (filenames.length === 0) return null;

  return (
    <div className="images-panel">
      <button
        className="images-panel-header"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
      >
        <span className="images-panel-title">
          {allResolved ? (
            <span className="images-panel-status resolved" aria-label="All images resolved">{'\u2713'}</span>
          ) : (
            <span className="images-panel-status pending" aria-label={`${unresolvedCount} images need URLs`}>{'\u25CB'}</span>
          )}
          Images ({filenames.length} total{unresolvedCount > 0 ? `, ${unresolvedCount} needs Steam URL` : ''})
        </span>
        <span className="images-panel-toggle">{collapsed ? '\u25B6' : '\u25BC'}</span>
      </button>

      {!collapsed && (
        <div className="images-panel-body">
          <div className="images-panel-hint">
            {context === 'guides'
              ? 'Guides require uploaded images — use [previewimg] instead of [img]'
              : 'Announcements use [img]URL[/img] with the Steam CDN URL'}
          </div>
          {filenames.map(filename => {
            const url = imageUrls[filename] || '';
            const isResolved = url.trim().length > 0;
            const thumbnailUrl = imageDataUrls?.get(filename);
            return (
              <div key={filename} className="images-panel-row">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={filename}
                    className="images-panel-thumbnail"
                  />
                ) : (
                  <span className="images-panel-icon" aria-hidden="true">{'\uD83D\uDDBC'}</span>
                )}
                <span className="images-panel-filename" title={filename}>{filename}</span>
                <input
                  type="text"
                  className="images-panel-input"
                  placeholder="Paste Steam URL..."
                  value={url}
                  onChange={(e) => handleChange(filename, e)}
                  data-testid={`image-url-${filename}`}
                />
                <span className={`images-panel-row-status ${isResolved ? 'resolved' : 'pending'}`}>
                  {isResolved ? '\u2713' : '\u25CB'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
