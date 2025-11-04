/**
 * VirtualizedList Component
 *
 * A performance-optimized list component using react-window
 * for rendering large lists efficiently.
 */

import { memo } from "react";
import { List, RowComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscanCount?: number;
}

function VirtualizedListInner<T>({
  items,
  itemHeight,
  renderItem,
  className = "",
  overscanCount = 3,
}: VirtualizedListProps<T>) {
  const Row = ({ index, style }: RowComponentProps) => {
    const item = items[index];
    return (
      <div style={style} className="px-2">
        {renderItem(item, index)}
      </div>
    );
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            style={{ height, width }}
            defaultHeight={height}
            rowCount={items.length}
            rowHeight={itemHeight}
            rowComponent={Row}
            rowProps={{}}
            overscanCount={overscanCount}
            className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          />
        )}
      </AutoSizer>
    </div>
  );
}

export const VirtualizedList = memo(
  VirtualizedListInner
) as typeof VirtualizedListInner;

/**
 * Variable height virtualized list
 * For items with different heights
 */

interface VirtualizedVariableListProps<T> {
  items: T[];
  getItemHeight: (index: number) => number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscanCount?: number;
}

function VirtualizedVariableListInner<T>({
  items,
  getItemHeight,
  renderItem,
  className = "",
  overscanCount = 3,
}: VirtualizedVariableListProps<T>) {
  const Row = ({ index, style }: RowComponentProps) => {
    const item = items[index];
    return (
      <div style={style} className="px-2">
        {renderItem(item, index)}
      </div>
    );
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            style={{ height, width }}
            defaultHeight={height}
            rowCount={items.length}
            rowHeight={getItemHeight}
            rowComponent={Row}
            rowProps={{}}
            overscanCount={overscanCount}
            className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          />
        )}
      </AutoSizer>
    </div>
  );
}

export const VirtualizedVariableList = memo(
  VirtualizedVariableListInner
) as typeof VirtualizedVariableListInner;
