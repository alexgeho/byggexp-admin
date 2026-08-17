import { Card } from 'antd';
import Link from 'next/link';
import { useT } from '@/src/i18n/LanguageProvider';

// Titled card used for every list section on the dashboard (personnel,
// deadlines, projects, activity): optional filter slot in the header and an
// optional "View all" footer link.
export default function SectionCard({ title, actionHref, actionLabel = 'View all', filters, children }) {
  const t = useT();
  return (
    <Card
      className="dashboard-section-card"
      title={(
        <span className="dashboard-section-card__headline">
          <span className="dashboard-section-card__headtitle">{t(title)}</span>
        </span>
      )}
      extra={filters ? (
        <span className="dashboard-section-card__headfilter">{filters}</span>
      ) : null}
    >
      {children}
      {actionHref ? (
        <div className="dashboard-section-card__footer">
          <Link href={actionHref} className="dashboard-section-card__action">
            {t(actionLabel)}
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
