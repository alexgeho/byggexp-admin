import { useEffect, useMemo, useRef } from 'react';
import { Table } from 'antd';

const LOAD_MORE_THRESHOLD_PX = 120;
const DEFAULT_CELL_WIDTH_PX = 190;

export default function AdminTable({
  className = '',
  scroll,
  onEndReached,
  hasMore = false,
  loadingMore = false,
  ...tableProps
}) {
  const rootRef = useRef(null);
  const { columns = [], tableLayout, ...restTableProps } = tableProps;

  const mergedScroll = useMemo(() => {
    if (scroll === false) {
      return undefined;
    }

    if (!scroll) {
      return { x: 'max-content' };
    }

    if (typeof scroll === 'object') {
      return {
        x: 'max-content',
        ...scroll,
      };
    }

    return scroll;
  }, [scroll]);

  const normalizedColumns = useMemo(() => {
    const normalizeColumn = (column) => {
      if (!column) {
        return column;
      }

      if (column.children?.length) {
        return {
          ...column,
          children: column.children.map(normalizeColumn),
        };
      }

      const {
        maxCellWidth = DEFAULT_CELL_WIDTH_PX,
        onCell,
        onHeaderCell,
        ellipsis = true,
      } = column;

      return {
        ...column,
        ellipsis,
        width: column.width ?? maxCellWidth,
        onCell: (record, rowIndex) => {
          const baseCell = onCell ? onCell(record, rowIndex) : {};
          return {
            ...baseCell,
            style: {
              maxWidth: maxCellWidth,
              ...baseCell?.style,
            },
          };
        },
        onHeaderCell: (col) => {
          const baseCell = onHeaderCell ? onHeaderCell(col) : {};
          return {
            ...baseCell,
            style: {
              maxWidth: maxCellWidth,
              ...baseCell?.style,
            },
          };
        },
      };
    };

    return columns.map(normalizeColumn);
  }, [columns]);

  useEffect(() => {
    if (!onEndReached || !hasMore || loadingMore) {
      return undefined;
    }

    const rootNode = rootRef.current;
    const scrollContainer = rootNode?.querySelector('.ant-table-body');

    if (!scrollContainer) {
      return undefined;
    }

    const handleScroll = () => {
      const remainingDistance =
        scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight;

      if (remainingDistance <= LOAD_MORE_THRESHOLD_PX) {
        onEndReached();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, onEndReached]);

  const tableClassName = ['admin-table', className].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className="admin-table-container">
      <Table
        {...restTableProps}
        className={tableClassName}
        columns={normalizedColumns}
        scroll={mergedScroll}
        tableLayout={tableLayout ?? 'fixed'}
      />
    </div>
  );
}
