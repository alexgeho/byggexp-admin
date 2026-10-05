'use client';

import { useMemo } from 'react';
import { Table } from 'antd';
import { withEmptyCells } from '@/src/shared/components/EmptyCell';
import './DataTable.scss';

// The one styled table for the whole app. It bakes in the Figma table design
// (header 12px/600, body 14px/600 #052D50, row rhythm, cell padding, dividers)
// so every table looks the same. Use it directly for section/report tables, and
// through AdminTable for full list pages (which adds the card + search + checkbox
// chrome on top). New tables should use this, not a raw antd <Table>.
// Blank cells render the shared grey dash (withEmptyCells).
export default function DataTable({ className = '', columns, ...props }) {
  const classes = ['data-table', className].filter(Boolean).join(' ');
  const cols = useMemo(() => withEmptyCells(columns), [columns]);
  return <Table className={classes} columns={cols} {...props} />;
}

// Same blank-cell behaviour for the few places that keep antd's plain styling.
export function PlainTable({ columns, ...props }) {
  const cols = useMemo(() => withEmptyCells(columns), [columns]);
  return <Table columns={cols} {...props} />;
}
PlainTable.Summary = Table.Summary;
DataTable.Summary = Table.Summary;
