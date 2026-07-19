import {
  useCallback,
  useMemo,
  useState,
  type UIEvent,
} from "react";

interface VirtualRowsOptions {
  count: number;
  rowHeight: number;
  overscan?: number;
  initialViewportRows?: number;
}

interface VirtualRowsResult {
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  startIndex: number;
  endIndex: number;
  paddingTop: number;
  paddingBottom: number;
}

/**
 * Keeps fixed-height collections bounded to the visible viewport. The hook is
 * deliberately DOM-agnostic so tables and simple lists can share it.
 */
export function useVirtualRows({
  count,
  rowHeight,
  overscan = 6,
  initialViewportRows = 12,
}: VirtualRowsOptions): VirtualRowsResult {
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return useMemo(() => {
    const visibleStart = Math.floor(scrollTop / rowHeight);
    const visibleCount = initialViewportRows;
    const startIndex = count === 0
      ? 0
      : Math.min(count - 1, Math.max(0, visibleStart - overscan));
    const endIndex = Math.min(count, visibleStart + visibleCount + overscan);
    return {
      onScroll,
      startIndex,
      endIndex,
      paddingTop: startIndex * rowHeight,
      paddingBottom: Math.max(0, (count - endIndex) * rowHeight),
    };
  }, [count, initialViewportRows, onScroll, overscan, rowHeight, scrollTop]);
}
