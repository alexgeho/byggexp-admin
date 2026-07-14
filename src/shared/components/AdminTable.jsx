import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Input, Table } from 'antd';
import searchIcon from '@/src/assets/icons/search.svg';
import AdminTableCheckbox from '@/src/shared/components/AdminTableCheckbox';
import { wrapColumnTitle } from '@/src/shared/components/AdminTableHeaderTitle';
import { AdminTableFilterContext } from '@/src/shared/contexts/AdminTableFilterContext';
import { applyColumnFilters } from '@/src/utils/tableColumnFilter';

const LOAD_MORE_THRESHOLD_PX = 120;
const DEFAULT_CELL_WIDTH_PX = 190;
const CHECKBOX_SIZE_PX = 15;
const CHECKBOX_CELL_HORIZONTAL_PADDING_PX = 11;
const CHECKBOX_COLUMN_WIDTH_PX =
  CHECKBOX_SIZE_PX + CHECKBOX_CELL_HORIZONTAL_PADDING_PX * 2;
const DEFAULT_ROWS_PER_CHUNK = 30;
const DEFAULT_TABLE_SCROLL_Y = 'calc(100vh - 220px)';
const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

const DEFAULT_PAGINATION = {
  pageSize: 10,
  showSizeChanger: false,
};

function getSearchableText(value, seen = new WeakSet()) {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => getSearchableText(item, seen)).join(' ');
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '';
    }

    seen.add(value);
    return Object.values(value).map((item) => getSearchableText(item, seen)).join(' ');
  }

  return '';
}

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
  infiniteScroll = false,
  rowsPerChunk = DEFAULT_ROWS_PER_CHUNK,
  toolbarStart = null,
  toolbarEnd,
  ...tableProps
}) {
  const rootRef = useRef(null);
  const {
    columns = [],
    tableLayout,
    rowKey = 'key',
    dataSource = [],
    rowSelection: rowSelectionProp,
    pagination: paginationProp,
    ...restTableProps
  } = tableProps;
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [columnFilters, setColumnFilters] = useState({});
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(rowsPerChunk);
  const [loadingMoreRows, setLoadingMoreRows] = useState(false);

  const isExternalInfiniteScroll = Boolean(onEndReached);
  const pagination = useMemo(() => {
    if (paginationProp === false || isExternalInfiniteScroll) {
      return false;
    }

    if (typeof paginationProp === 'object') {
      return {
        ...DEFAULT_PAGINATION,
        ...paginationProp,
      };
    }

    return DEFAULT_PAGINATION;
  }, [isExternalInfiniteScroll, paginationProp]);
  const useClientInfiniteScroll = infiniteScroll && !isExternalInfiniteScroll && pagination === false;

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

  const searchedDataSource = useMemo(() => {
    const query = tableSearchQuery.trim().toLowerCase();

    if (!query) {
      return filteredDataSource;
    }

    return filteredDataSource.filter((record) =>
      getSearchableText(record).toLowerCase().includes(query),
    );
  }, [filteredDataSource, tableSearchQuery]);

  useEffect(() => {
    if (!useClientInfiniteScroll) {
      return;
    }

    setVisibleCount(rowsPerChunk);
  }, [columnFilters, dataSource, rowsPerChunk, tableSearchQuery, useClientInfiniteScroll]);

  const displayedDataSource = useMemo(() => {
    if (!useClientInfiniteScroll) {
      return searchedDataSource;
    }

    return searchedDataSource.slice(0, visibleCount);
  }, [searchedDataSource, useClientInfiniteScroll, visibleCount]);

  const hasMoreRows = useClientInfiniteScroll
    ? visibleCount < searchedDataSource.length
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
    const horizontalScroll = { x: tableContentWidth };

    if (scroll === false) {
      return horizontalScroll;
    }

    if (typeof scroll === 'object') {
      const scrollX =
        typeof scroll.x === 'number' ? scroll.x : tableContentWidth;

      return {
        ...scroll,
        x: scroll.x === false ? undefined : scrollX,
        y: undefined,
      };
    }

    return horizontalScroll;
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
      Math.min(current + rowsPerChunk, searchedDataSource.length),
    );
    setLoadingMoreRows(false);
  }, [
    hasMoreRows,
    isExternalInfiniteScroll,
    loadingMoreRows,
    onEndReached,
    rowsPerChunk,
    searchedDataSource.length,
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
        <Card className="admin-table-card">
          <div className="admin-table-toolbar">
            {toolbarStart ? (
              <div className="admin-table-toolbar__leading">
                {toolbarStart}
              </div>
            ) : null}
            <div className="admin-table-toolbar__trailing">
              <Input
                className="admin-table-search"
                prefix={(
                  <img
                    src={resolveSvgSrc(searchIcon)}
                    width={20}
                    height={20}
                    alt=""
                    aria-hidden="true"
                  />
                )}
                placeholder="Search"
                allowClear
                value={tableSearchQuery}
                onChange={(event) => setTableSearchQuery(event.target.value)}
              />
              {toolbarEnd}
            </div>
          </div>
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
              pagination={pagination}
              loading={restTableProps.loading}
            />
            {isLoadingMore && !restTableProps.loading ? (
              <div className="admin-table-loading-more">Loading more...</div>
            ) : null}
          </div>
        </Card>
      </div>
    </AdminTableFilterContext.Provider>
  );
}
