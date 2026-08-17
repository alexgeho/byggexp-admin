import { Tag } from 'antd';
import { useT } from '@/src/i18n/LanguageProvider';

// Task lifecycle badge (open / overdue / completed). Tasks keep their own
// semantics — distinct from the shared status registry — but render as the same
// `.status-tag` pill, in the same semantic palette (success/processing/error),
// as every other status badge in the app. This was duplicated three times with
// two of the copies drifting to raw antd preset colours (green/red/blue) and no
// pill class; this is the single source.
const getTaskDisplayStatus = (task) => {
  if (task?.status === 'completed') {
    return { label: 'Completed', color: 'success' };
  }

  const dueTime = task?.dueDate ? new Date(task.dueDate).getTime() : null;
  if (dueTime && !Number.isNaN(dueTime) && dueTime < Date.now()) {
    return { label: 'Overdue', color: 'error' };
  }

  return { label: 'Open', color: 'processing' };
};

export default function TaskStatusTag({ task }) {
  const t = useT();
  const status = getTaskDisplayStatus(task);
  return <Tag className="status-tag" color={status.color}>{t(status.label)}</Tag>;
}
