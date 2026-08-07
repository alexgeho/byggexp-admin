import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import IconButton from '../IconButton/IconButton';
import LinkButton from '../LinkButton/LinkButton';
import './PeriodNav.scss';

// Shared period navigator used across time/staff screens (Hours, Calendar, …)
// so they all read and control the same way: ‹ [current period] › [Today].
// The centre is a slot — pass a date-range label, a month dropdown, etc.
// Labels are passed in (already translated) since ui-kit has no i18n context.
export default function PeriodNav({
  onPrev,
  onNext,
  onToday,
  todayLabel = 'Today',
  prevLabel = 'Previous',
  nextLabel = 'Next',
  className = '',
  children,
}) {
  const classes = ['ui-periodnav', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <IconButton onClick={onPrev} aria-label={prevLabel}><LeftOutlined /></IconButton>
      <div className="ui-periodnav__center">{children}</div>
      <IconButton onClick={onNext} aria-label={nextLabel}><RightOutlined /></IconButton>
      {onToday ? <LinkButton onClick={onToday}>{todayLabel}</LinkButton> : null}
    </div>
  );
}
