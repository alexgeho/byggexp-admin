'use client';

import { Table } from 'antd';
import './DataTable.scss';

// The one styled table for the whole app. It bakes in the Figma table design
// (header 12px/600, body 14px/600 #052D50, row rhythm, cell padding, dividers)
// so every table looks the same. Use it directly for section/report tables, and
// through AdminTable for full list pages (which adds the card + search + checkbox
// chrome on top). New tables should use this, not a raw antd <Table>.
export default function DataTable({ className = '', ...props }) {
  const classes = ['data-table', className].filter(Boolean).join(' ');
  return <Table className={classes} {...props} />;
}
