import { Progress } from 'antd';
import { useT } from '@/src/i18n/LanguageProvider';

// Presentational building blocks for the project overview tab.

// A labelled progress track (spent vs planned) used across the budget/resources
// card.
export function ResourceTrackRow({ label, spentLabel, plannedLabel, percent, color, footLeft, footRight, onClick }) {
  const t = useT();
  const Tag = onClick ? 'button' : 'div';
  const clickProps = onClick
    ? { type: 'button', onClick, className: 'project-resource-track project-resource-track--link' }
    : { className: 'project-resource-track' };
  return (
    <Tag {...clickProps}>
      <div className="project-resource-track__top">
        <span className="project-resource-track__label">
          {t(label)}
          {onClick ? <span className="project-resource-track__arrow" aria-hidden="true">›</span> : null}
        </span>
        <span className="project-resource-track__value">
          {spentLabel}
          {plannedLabel ? <small> / {plannedLabel}</small> : null}
        </span>
      </div>
      <Progress
        className="project-resource-track__bar"
        percent={percent}
        showInfo={false}
        strokeColor={color}
        trailColor="#e7ecf0"
      />
      <div className="project-resource-track__foot">
        <span>{footLeft}</span>
        <span>{footRight}</span>
      </div>
    </Tag>
  );
}

// One label/value row in the "Project overview" info card. Renders nothing when
// the value is empty.
export function OverviewInfoRow({ label, value, wide = false }) {
  if (!value) {
    return null;
  }

  return (
    <div className={`project-overview-info__row${wide ? ' project-overview-info__row--wide' : ''}`}>
      <span className="project-overview-info__label">{label}</span>
      <span className="project-overview-info__value">{value}</span>
    </div>
  );
}

// A coloured-icon stat tile in the overview stats card.
export function ProjectOverviewStatItem({ color, icon, label, value }) {
  return (
    <div className="project-overview-stats__item">
      <span className={`project-overview-stats__icon project-overview-stats__icon--${color}`}>
        {icon}
      </span>
      <span className="project-overview-stats__content">
        <span className="project-overview-stats__label">{label}</span>
        <strong className="project-overview-stats__value">{value}</strong>
      </span>
    </div>
  );
}
