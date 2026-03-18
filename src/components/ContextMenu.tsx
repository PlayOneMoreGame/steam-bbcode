import { useEffect, useCallback, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
  separator?: false;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to keep menu within viewport
  const adjustedPosition = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return { left: x, top: y };

    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x;
    let top = y;

    if (x + rect.width > vw) {
      left = vw - rect.width - 4;
    }
    if (y + rect.height > vh) {
      top = vh - rect.height - 4;
    }

    return { left: Math.max(4, left), top: Math.max(4, top) };
  }, [x, y]);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    // Use capture to close before any other handler fires
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  // Adjust position after render
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const { left, top } = adjustedPosition();
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }, [adjustedPosition]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      data-testid="context-menu"
      style={{ position: 'fixed', left: x, top: y, zIndex: 10000 }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="context-menu-separator" role="separator" />;
        }
        return (
          <button
            key={i}
            className="context-menu-item"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.action();
              onClose();
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
