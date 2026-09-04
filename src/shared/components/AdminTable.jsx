import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Input, Modal } from 'antd';
import DataTable from '@/src/shared/components/DataTable';
import BulkDeleteButton from '@/src/shared/components/BulkDeleteButton';
import searchIcon from '@/src/assets/icons/search.svg';
import { useT } from '@/src/i18n/LanguageProvider';
import AdminTableCheckbox from '@/src/shared/components/AdminTableCheckbox';
import { wrapColumnTitle } from '@/src/shared/components/AdminTableHeaderTitle';
import { AdminTableFilterContext } from '@/src/shared/contexts/AdminTableFilterContext';
import EmptyState from '@/src/shared/components/EmptyState';
import { applyColumnFilters } from '@/src/utils/tableColumnFilter';
import {
  LOAD_MORE_THRESHOLD_PX, CHECKBOX_COLUMN_WIDTH_PX, DEFAULT_ROWS_PER_CHUNK,
  DEFAULT_TABLE_SCROLL_Y, resolveSvgSrc, DEFAULT_PAGINATION, getSearchableText,
  inferColumnWidth, sumColumnsWidth,
} from '@/src/shared/components/adminTableUtils';

export default function AdminTable({
  className = '',
  scroll,
  onEndReached,
  hasMore = false,
  loadingMore = false,
  infiniteScroll = false,
  rowsPerChunk = DEFAULT_ROWS_PER_CHUNK,
  statusFilter = null,
  projectFilter = null,
  toolbarStart = null,
  toolbarEnd,
  showSearch = true,
  emptyState = null,
  onBulkDelete = null,
  bulkDeleteTitle = null,
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
  const [selectedKeys, setSelectedKeys] = useState(
    () => new Set(rowSelectionProp?.selectedRowKeys || []),
  );
  const t = useT();
  const [columnFilters, setColumnFilters] = useState({});
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(rowsPerChunk);
  const [loadingMoreRows, setLoadingMoreRows] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  useEffect(() => {
    if (!rowSelectionProp?.selectedRowKeys) {
      return;
    }

    setSelectedKeys(new Set(rowSelectionProp.selectedRowKeys));
  }, [rowSelectionProp?.selectedRowKeys]);

  const emitRowSelectionChange = useCallback((nextKeys) => {
    if (!rowSelectionProp?.onChange) {
      return;
    }

    const nextKeyArray = Array.from(nextKeys);
    const nextKeySet = new Set(nextKeyArray);
    const selectedRows = (dataSource ?? []).filter((record, index) =>
      nextKeySet.has(resolveRowKey(record, index)),
    );

    rowSelectionProp.onChange(nextKeyArray, selectedRows);
  }, [dataSource, resolveRowKey, rowSelectionProp]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
    emitRowSelectionChange(new Set());
  }, [emitRowSelectionChange]);

  // Universal "Delete selected" flow: AdminTable owns the confirm dialog, the
  // in-flight state and clearing the selection, so any page enables bulk delete
  // by passing a single `onBulkDelete(selectedRows)` prop.
  const handleBulkDelete = useCallback(() => {
    const selectedRows = (dataSource ?? []).filter((record, index) =>
      selectedKeys.has(resolveRowKey(record, index)),
    );

    if (!selectedRows.length) {
      return;
    }

    Modal.confirm({
      title: bulkDeleteTitle || t('Delete selected?'),
      content: t('This action cannot be undone.'),
      okText: t('Delete'),
      cancelText: t('Cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        setBulkDeleting(true);
        try {
          await onBulkDelete(selectedRows);
          clearSelection();
        } finally {
          setBulkDeleting(false);
        }
      },
    });
  }, [
    bulkDeleteTitle,
    clearSelection,
    dataSource,
    onBulkDelete,
    resolveRowKey,
    selectedKeys,
    t,
  ]);

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

      emitRowSelectionChange(next);
      return next;
    });
  }, [emitRowSelectionChange]);

  const toggleAllRows = useCallback(() => {
    setSelectedKeys((previous) => {
      if (rowKeys.length === 0) {
        return previous;
      }

      const everySelected = rowKeys.every((key) => previous.has(key));

      if (everySelected) {
        const next = new Set();
        emitRowSelectionChange(next);
        return next;
      }

      const next = new Set(rowKeys);
      emitRowSelectionChange(next);
      return next;
    });
  }, [emitRowSelectionChange, rowKeys]);

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
        maxCellWidth,
        onCell,
        onHeaderCell,
        ellipsis = true,
        headerSearch,
        title,
      } = column;

      // Explicit width/maxCellWidth wins; otherwise size by the column's
      // semantic type so the same kind of column is equal on every page.
      const resolvedWidth = column.width ?? maxCellWidth ?? inferColumnWidth(column);

      const mergedTitle =
        headerSearch === false ? title : wrapColumnTitle(column);

      return {
        ...column,
        title: mergedTitle,
        ellipsis,
        width: resolvedWidth,
        onCell: (record, rowIndex) => {
          const baseCell = onCell ? onCell(record, rowIndex) : {};
          return {
            ...baseCell,
            style: {
              maxWidth: resolvedWidth,
              ...baseCell?.style,
            },
          };
        },
        onHeaderCell: (col) => {
          const baseCell = onHeaderCell ? onHeaderCell(col) : {};
          return {
            ...baseCell,
            style: {
              maxWidth: resolvedWidth,
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
      onChange: (keys, rows, info) => {
        setSelectedKeys(new Set(keys));
        rowSelectionProp?.onChange?.(keys, rows, info);
      },
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

  // Rich first-run empty state — only when the list is genuinely empty (no data
  // at all), never when a search/column filter merely hid every row.
  const richEmptyNode = emptyState
    && !restTableProps.loading
    && (dataSource?.length ?? 0) === 0
    && !tableSearchQuery.trim()
    && Object.keys(columnFilters).length === 0
    ? <EmptyState {...emptyState} />
    : null;

  const tableClassName = ['admin-table', className].filter(Boolean).join(' ');
  const scrollWrapClassName = [
    'admin-table-scroll',
    needsVerticalScroll && 'admin-table-scroll--enabled',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <AdminTableFilterContext.Provider value={filterContextValue}>
      <div
        ref={rootRef}
        className="admin-table-container"
        style={{ '--admin-table-content-width': `${tableContentWidth}px` }}
      >
        <Card className="admin-table-card">
          <div className="admin-table-toolbar">
            <div className="admin-table-toolbar__leading">
              {projectFilter}
              {statusFilter}
              {toolbarStart}
            </div>
            <div className="admin-table-toolbar__trailing">
              {/* Bulk actions appear to the LEFT of the search box, in the empty
                  space, so selecting rows never shoves the search around — the
                  search input stays pinned to the right edge. */}
              {onBulkDelete && selectedKeys.size > 0 ? (
                <BulkDeleteButton
                  count={selectedKeys.size}
                  loading={bulkDeleting}
                  onClick={handleBulkDelete}
                />
              ) : null}
              {toolbarEnd}
              {showSearch ? (
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
                  placeholder={t('Search')}
                  allowClear
                  value={tableSearchQuery}
                  onChange={(event) => setTableSearchQuery(event.target.value)}
                />
              ) : null}
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
            <DataTable
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
              locale={richEmptyNode ? { ...restTableProps.locale, emptyText: richEmptyNode } : restTableProps.locale}
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
