import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table } from 'antd';
import AdminTableCheckbox from '@/src/shared/components/AdminTableCheckbox';
import { wrapColumnTitle } from '@/src/shared/components/AdminTableHeaderTitle';
import { AdminTableFilterContext } from '@/src/shared/contexts/AdminTableFilterContext';
import { applyColumnFilters } from '@/src/utils/tableColumnFilter';

const LOAD_MORE_THRESHOLD_PX = 120;
const DEFAULT_CELL_WIDTH_PX = 190;
const CHECKBOX_SIZE_PX = 18;
const CHECKBOX_CELL_HORIZONTAL_PADDING_PX = 11;
const CHECKBOX_COLUMN_WIDTH_PX =
  CHECKBOX_SIZE_PX + CHECKBOX_CELL_HORIZONTAL_PADDING_PX * 2;
const DEFAULT_ROWS_PER_CHUNK = 30;
const DEFAULT_TABLE_SCROLL_Y = 'calc(100vh - 220px)';

function sumColumnsWidth(columns, defaultWidth = DEFAULT_CELL_WIDTH_PX) {
  return columns.reduce((total, column) => {
    if (!column) {
      return total;
    }

    if (column.children?.length) {
      return total + sumColumnsWidth(column.children, defaultWidth);
    }

    const width = column.width;
    return total + (typeof width === 'number' ? width : defaultWidth);
  }, 0);
}

export default function AdminTable({
  className = '',
  scroll,
  onEndReached,
  hasMore = false,
  loadingMore = false,
  infiniteScroll = true,
  rowsPerChunk = DEFAULT_ROWS_PER_CHUNK,
  ...tableProps
}) {
  const rootRef = useRef(null);
  const {
    columns = [],
    tableLayout,
    rowKey = 'key',
    dataSource = [],
    rowSelection: rowSelectionProp,
    pagination: _pagination,
    ...restTableProps
  } = tableProps;
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [columnFilters, setColumnFilters] = useState({});
  const [visibleCount, setVisibleCount] = useState(rowsPerChunk);
  const [loadingMoreRows, setLoadingMoreRows] = useState(false);

  const isExternalInfiniteScroll = Boolean(onEndReached);
  const useClientInfiniteScroll = infiniteScroll && !isExternalInfiniteScroll;

  const setColumnFilter = useCallback((columnKey, filterState) => {
    setColumnFilters((previous) => {
      if (!filterState) {
        const next = { ...previous };
        delete next[columnKey];
        return next;
      }

      return {
        ...previous,
        [columnKey]: filterState,
      };
    });
  }, []);

  const clearColumnFilter = useCallback((columnKey) => {
    setColumnFilters((previous) => {
      if (!previous[columnKey]) {
        return previous;
      }

      const next = { ...previous };
      delete next[columnKey];
      return next;
    });
  }, []);

  const filteredDataSource = useMemo(
    () => applyColumnFilters(dataSource, columns, columnFilters),
    [columnFilters, columns, dataSource],
  );

  useEffect(() => {
    if (!useClientInfiniteScroll) {
      return;
    }

    setVisibleCount(rowsPerChunk);
  }, [columnFilters, dataSource, rowsPerChunk, useClientInfiniteScroll]);

  const displayedDataSource = useMemo(() => {
    if (!useClientInfiniteScroll) {
      return filteredDataSource;
    }

    return filteredDataSource.slice(0, visibleCount);
  }, [filteredDataSource, useClientInfiniteScroll, visibleCount]);

  const hasMoreRows = useClientInfiniteScroll
    ? visibleCount < filteredDataSource.length
    : hasMore;

  const isLoadingMore = useClientInfiniteScroll ? loadingMoreRows : loadingMore;

  const filterContextValue = useMemo(
    () => ({
      dataSource,
      filteredDataSource,
      columnFilters,
      setColumnFilter,
      clearColumnFilter,
    }),
    [
      clearColumnFilter,
      columnFilters,
      dataSource,
      filteredDataSource,
      setColumnFilter,
    ],
  );

  const resolveRowKey = useCallback(
    (record, index) => {
      if (typeof rowKey === 'function') {
        return rowKey(record, index);
      }

      return record?.[rowKey] ?? index;
    },
    [rowKey],
  );

  const rowKeys = useMemo(
    () =>
      (displayedDataSource ?? []).map((record, index) =>
        resolveRowKey(record, index),
      ),
    [displayedDataSource, resolveRowKey],
  );

  const allRowsSelected =
    rowKeys.length > 0 && rowKeys.every((key) => selectedKeys.has(key));
  const someRowsSelected =
    rowKeys.some((key) => selectedKeys.has(key)) && !allRowsSelected;

  const toggleRow = useCallback((key) => {
    setSelectedKeys((previous) => {
      const next = new Set(previous);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }, []);

  const toggleAllRows = useCallback(() => {
    setSelectedKeys((previous) => {
      if (rowKeys.length === 0) {
        return previous;
      }

      const everySelected = rowKeys.every((key) => previous.has(key));

      if (everySelected) {
        return new Set();
      }

      return new Set(rowKeys);
    });
  }, [rowKeys]);

  const tableContentWidth = useMemo(
    () => CHECKBOX_COLUMN_WIDTH_PX + sumColumnsWidth(columns),
    [columns],
  );

  const needsVerticalScroll =
    useClientInfiniteScroll || isExternalInfiniteScroll;

  const scrollWrapMaxHeight = useMemo(() => {
    if (!needsVerticalScroll) {
      return undefined;
    }

    if (scroll === false) {
      return DEFAULT_TABLE_SCROLL_Y;
    }

    if (typeof scroll === 'object' && scroll.y != null) {
      return scroll.y;
    }

    return DEFAULT_TABLE_SCROLL_Y;
  }, [needsVerticalScroll, scroll]);

  const mergedScroll = useMemo(() => {
    if (scroll === false) {
      return undefined;
    }

    if (typeof scroll === 'object') {
      const scrollX =
        typeof scroll.x === 'number' ? scroll.x : tableContentWidth;

      return {
        ...scroll,
        x: scrollX,
        y: undefined,
      };
    }

    return {
      x: tableContentWidth,
    };
  }, [scroll, tableContentWidth]);

  const handleLoadMore = useCallback(() => {
    if (isExternalInfiniteScroll) {
      onEndReached?.();
      return;
    }

    if (!hasMoreRows || loadingMoreRows) {
      return;
    }

    setLoadingMoreRows(true);
    setVisibleCount((current) =>
      Math.min(current + rowsPerChunk, filteredDataSource.length),
    );
    setLoadingMoreRows(false);
  }, [
    filteredDataSource.length,
    hasMoreRows,
    isExternalInfiniteScroll,
    loadingMoreRows,
    onEndReached,
    rowsPerChunk,
  ]);

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
        headerSearch,
        title,
      } = column;

      const mergedTitle =
        headerSearch === false ? title : wrapColumnTitle(column);

      return {
        ...column,
        title: mergedTitle,
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

  const rowSelection = useMemo(() => {
    if (rowSelectionProp === false) {
      return undefined;
    }

    return {
      columnWidth: CHECKBOX_COLUMN_WIDTH_PX,
      ...rowSelectionProp,
      selectedRowKeys: Array.from(selectedKeys),
      onChange: (keys) => setSelectedKeys(new Set(keys)),
      renderCell: (_checked, record, index) => {
        const key = resolveRowKey(record, index);

        return (
          <AdminTableCheckbox
            checked={selectedKeys.has(key)}
            onChange={() => toggleRow(key)}
            ariaLabel="Select row"
          />
        );
      },
      columnTitle: (
        <AdminTableCheckbox
          checked={allRowsSelected}
          indeterminate={someRowsSelected}
          onChange={toggleAllRows}
          ariaLabel="Select all rows"
        />
      ),
    };
  }, [
    allRowsSelected,
    resolveRowKey,
    rowSelectionProp,
    selectedKeys,
    someRowsSelected,
    toggleAllRows,
    toggleRow,
  ]);

  useEffect(() => {
    if (!hasMoreRows || isLoadingMore) {
      return undefined;
    }

    const rootNode = rootRef.current;
    const scrollContainer =
      rootNode?.querySelector('.admin-table-scroll') ??
      rootNode?.querySelector('.ant-table-body');

    if (!scrollContainer) {
      return undefined;
    }

    const handleScroll = () => {
      const remainingDistance =
        scrollContainer.scrollHeight -
        scrollContainer.scrollTop -
        scrollContainer.clientHeight;

      if (remainingDistance <= LOAD_MORE_THRESHOLD_PX) {
        handleLoadMore();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [handleLoadMore, hasMoreRows, isLoadingMore, needsVerticalScroll]);

  const tableClassName = ['admin-table', className].filter(Boolean).join(' ');
  const scrollWrapClassName = [
    'admin-table-scroll',
    needsVerticalScroll && 'admin-table-scroll--enabled',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <AdminTableFilterContext.Provider value={filterContextValue}>
      <div ref={rootRef} className="admin-table-container">
        <div
          className={scrollWrapClassName}
          style={
            scrollWrapMaxHeight
              ? { maxHeight: scrollWrapMaxHeight }
              : undefined
          }
        >
          <Table
            {...restTableProps}
            dataSource={displayedDataSource}
            rowKey={rowKey}
            className={tableClassName}
            columns={normalizedColumns}
            rowSelection={rowSelection}
            scroll={mergedScroll}
            tableLayout={tableLayout ?? (mergedScroll ? 'fixed' : undefined)}
            pagination={false}
            loading={restTableProps.loading}
          />
          {isLoadingMore && !restTableProps.loading ? (
            <div className="admin-table-loading-more">Loading more...</div>
          ) : null}
        </div>
      </div>
    </AdminTableFilterContext.Provider>
  );
}
