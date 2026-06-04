import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, DatePicker, Input, Popover, Space } from 'antd';
import dayjs from 'dayjs';
import {
  buildEnumFilterOptions,
  getColumnFilterKey,
  isColumnFilterActive,
  resolveColumnFilterKind,
} from '../utils/tableColumnFilter';
import { useAdminTableFilter } from '../contexts/AdminTableFilterContext';
import { resolveHeaderIconType } from '../utils/tableHeaderIcon';

import searchIconSvg from '../assets/icons/table-header-search.svg?raw';
import filterIconSvg from '../assets/icons/table-header-filter.svg?raw';

const SEARCH_ICON_SIZE = 12;
const FILTER_ICON_SIZE = 14;

function HeaderIcon({ iconType }) {
  const svg = iconType === 'filter' ? filterIconSvg : searchIconSvg;
  const className =
    iconType === 'filter'
      ? 'admin-table-header-action__icon admin-table-header-action__icon--filter'
      : 'admin-table-header-action__icon admin-table-header-action__icon--search';
  const size = iconType === 'filter' ? FILTER_ICON_SIZE : SEARCH_ICON_SIZE;

  return (
    <span
      className={className}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-hidden
    />
  );
}

function SearchFilterPanel({ column, draft, onDraftChange, onApply, onReset }) {
  return (
    <div className="admin-table-filter-panel">
      <div className="admin-table-filter-panel__title">Search</div>
      <Input
        allowClear
        placeholder={`Search ${String(column.title ?? '')}`}
        value={draft.query ?? ''}
        onChange={(event) => onDraftChange({ type: 'search', query: event.target.value })}
        onPressEnter={onApply}
      />
      <Space className="admin-table-filter-panel__actions">
        <Button type="primary" size="small" onClick={onApply}>
          Apply
        </Button>
        <Button size="small" onClick={onReset}>
          Reset
        </Button>
      </Space>
    </div>
  );
}

function EnumFilterPanel({
  column,
  options,
  draft,
  onDraftChange,
  onApply,
  onReset,
}) {
  return (
    <div className="admin-table-filter-panel">
      <div className="admin-table-filter-panel__title">Filter</div>
      <Checkbox.Group
        className="admin-table-filter-panel__options"
        value={draft.values ?? []}
        options={options}
        onChange={(values) => onDraftChange({ type: 'enum', values })}
      />
      <Space className="admin-table-filter-panel__actions">
        <Button type="primary" size="small" onClick={onApply}>
          Apply
        </Button>
        <Button size="small" onClick={onReset}>
          Reset
        </Button>
      </Space>
    </div>
  );
}

function DateFilterPanel({ draft, onDraftChange, onApply, onReset }) {
  const rangeValue =
    draft.from || draft.to
      ? [
          draft.from ? dayjs(draft.from) : null,
          draft.to ? dayjs(draft.to) : null,
        ]
      : null;

  return (
    <div className="admin-table-filter-panel">
      <div className="admin-table-filter-panel__title">Date range</div>
      <DatePicker.RangePicker
        className="admin-table-filter-panel__range"
        value={rangeValue}
        onChange={(values) => {
          onDraftChange({
            type: 'date',
            from: values?.[0] ? values[0].format('YYYY-MM-DD') : null,
            to: values?.[1] ? values[1].format('YYYY-MM-DD') : null,
          });
        }}
      />
      <Space className="admin-table-filter-panel__actions">
        <Button type="primary" size="small" onClick={onApply}>
          Apply
        </Button>
        <Button size="small" onClick={onReset}>
          Reset
        </Button>
      </Space>
    </div>
  );
}

export default function AdminTableHeaderFilter({ column, title }) {
  const tableFilter = useAdminTableFilter();
  const [open, setOpen] = useState(false);

  const iconType = resolveHeaderIconType(column);
  const columnKey = getColumnFilterKey(column);
  const filterKind = resolveColumnFilterKind(column, iconType);
  const appliedFilter = tableFilter?.columnFilters?.[columnKey];
  const isActive = isColumnFilterActive(appliedFilter);

  const enumOptions = useMemo(() => {
    if (filterKind !== 'enum') {
      return [];
    }

    return buildEnumFilterOptions(tableFilter?.dataSource ?? [], column);
  }, [column, filterKind, tableFilter?.dataSource]);

  const [draft, setDraft] = useState(appliedFilter ?? getEmptyDraft(filterKind));

  useEffect(() => {
    if (!open) {
      setDraft(appliedFilter ?? getEmptyDraft(filterKind));
    }
  }, [appliedFilter, filterKind, open]);

  if (!tableFilter || !iconType) {
    return null;
  }

  const titleContent =
    typeof title === 'function' ? title() : (title ?? '');

  const handleApply = () => {
    const nextDraft = cloneDraft(draft);

    if (isColumnFilterActive(nextDraft)) {
      tableFilter.setColumnFilter(columnKey, nextDraft);
    } else {
      tableFilter.clearColumnFilter(columnKey);
    }

    setOpen(false);
  };

  const handleReset = () => {
    const empty = getEmptyDraft(filterKind);
    setDraft(empty);
    tableFilter.clearColumnFilter(columnKey);
    setOpen(false);
  };

  const popoverContent =
    filterKind === 'search' ? (
      <SearchFilterPanel
        column={column}
        draft={draft}
        onDraftChange={setDraft}
        onApply={handleApply}
        onReset={handleReset}
      />
    ) : filterKind === 'date' ? (
      <DateFilterPanel
        draft={draft}
        onDraftChange={setDraft}
        onApply={handleApply}
        onReset={handleReset}
      />
    ) : (
      <EnumFilterPanel
        column={column}
        options={enumOptions}
        draft={draft}
        onDraftChange={setDraft}
        onApply={handleApply}
        onReset={handleReset}
      />
    );

  return (
    <div className="admin-table-header-cell">
      <span className="admin-table-header-title">{titleContent}</span>
      <Popover
        trigger="click"
        placement="bottomRight"
        open={open}
        onOpenChange={setOpen}
        overlayClassName="admin-table-filter-popover"
        content={popoverContent}
      >
        <button
          type="button"
          className={[
            'admin-table-header-action',
            isActive && 'admin-table-header-action--active',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={iconType === 'filter' ? 'Filter column' : 'Search column'}
          aria-expanded={open}
        >
          <HeaderIcon iconType={iconType} />
        </button>
      </Popover>
    </div>
  );
}

function getEmptyDraft(filterKind) {
  if (filterKind === 'search') {
    return { type: 'search', query: '' };
  }

  if (filterKind === 'date') {
    return { type: 'date', from: null, to: null };
  }

  return { type: 'enum', values: [] };
}

function cloneDraft(draft) {
  if (!draft) {
    return null;
  }

  if (draft.type === 'enum') {
    return { ...draft, values: [...(draft.values ?? [])] };
  }

  return { ...draft };
}
