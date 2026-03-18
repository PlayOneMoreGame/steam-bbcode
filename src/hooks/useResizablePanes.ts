import { useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

const DEFAULT_RATIO = 0.5;
const MIN_PANEL_WIDTH = 300;

/**
 * Hook for resizable split panes.
 *
 * Returns:
 * - splitRatio: fraction (0..1) for the left panel width
 * - handleMouseDown: attach to the drag handle's onMouseDown
 * - handleDoubleClick: attach to the drag handle's onDoubleClick (resets to 50/50)
 * - containerRef: attach to the grid container element
 */
export function useResizablePanes() {
  const [splitRatio, setSplitRatio] = useLocalStorage<number>(
    'steam-bbcode-split-ratio',
    DEFAULT_RATIO,
  );

  const containerRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      document.body.style.cursor = 'col-resize';
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const containerWidth = rect.width;
        // Account for the handle width (5px) and gap
        const x = moveEvent.clientX - rect.left;
        let ratio = x / containerWidth;

        // Enforce minimum panel widths
        const minRatio = MIN_PANEL_WIDTH / containerWidth;
        const maxRatio = 1 - minRatio;
        ratio = Math.max(minRatio, Math.min(maxRatio, ratio));

        setSplitRatio(ratio);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [setSplitRatio],
  );

  const handleDoubleClick = useCallback(() => {
    setSplitRatio(DEFAULT_RATIO);
  }, [setSplitRatio]);

  // Clean up cursor/selection on unmount (safety net)
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  return {
    splitRatio,
    handleMouseDown,
    handleDoubleClick,
    containerRef,
  };
}
