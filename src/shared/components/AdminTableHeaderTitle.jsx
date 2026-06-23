import AdminTableHeaderFilter from '@/src/shared/components/AdminTableHeaderFilter';
import { resolveHeaderIconType } from '@/src/utils/tableHeaderIcon';

export function wrapColumnTitle(column) {
  const iconType = resolveHeaderIconType(column);

  if (!iconType) {
    return column.title;
  }

  return (
    <AdminTableHeaderFilter column={column} title={column.title} />
  );
}
