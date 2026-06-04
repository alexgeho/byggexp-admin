import AdminTableHeaderFilter from './AdminTableHeaderFilter';
import { resolveHeaderIconType } from '../utils/tableHeaderIcon';

export function wrapColumnTitle(column) {
  const iconType = resolveHeaderIconType(column);

  if (!iconType) {
    return column.title;
  }

  return (
    <AdminTableHeaderFilter column={column} title={column.title} />
  );
}
