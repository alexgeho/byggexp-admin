import { Empty } from 'antd';
import { useT } from '@/src/i18n/LanguageProvider';
import SectionCard from '@/src/features/dashboard/components/SectionCard';
import { formatRelativeTime } from '@/src/features/dashboard/dashboardUtils';

// Recent activity-log feed for the current user.
export default function RecentActivity({ actionHref, items }) {
  const t = useT();
  return (
    <SectionCard actionHref={actionHref} title="Recent activity">
      {items.length ? (
        <ul className="dashboard-recent-activity">
          {items.map((item) => (
            <li className="dashboard-recent-activity__item" key={item.id || item.createdAt || item.message}>
              <span className="dashboard-recent-activity__message">{item.message}</span>
              <span className="dashboard-recent-activity__time">{formatRelativeTime(item.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('No recent activity')} />
      )}
    </SectionCard>
  );
}
