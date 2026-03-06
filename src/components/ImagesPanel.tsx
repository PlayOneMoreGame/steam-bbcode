import { useState } from 'react';

interface ImagesPanelProps {
  filenames: string[];
  /** Map of blob filenames to data URLs for thumbnail previews */
  imageDataUrls?: Map<string, string>;
}

export function ImagesPanel({ filenames, imageDataUrls }: ImagesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (filenames.length === 0) return null;

  return (
    <div className="images-panel">
      <button
        className="images-panel-header"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
      >
        <span className="images-panel-title">
          <span className="images-panel-status pending" aria-label={`${filenames.length} images to upload`}>{'\u25CB'}</span>
          Images to Upload ({filenames.length})
        </span>
        <span className="images-panel-toggle">{collapsed ? '\u25B6' : '\u25BC'}</span>
      </button>

      {!collapsed && (
        <div className="images-panel-body">
          <div className="images-panel-hint">
            Upload these to Steam's partner dashboard, then drag each thumbnail into position in Steam's editor.
          </div>
          {filenames.map(filename => {
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
