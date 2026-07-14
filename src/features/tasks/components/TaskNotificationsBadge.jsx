import bellIcon from '@/src/assets/fi_bell.svg';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

export default function TaskNotificationsBadge({ count = 0 }) {
  const safeCount = Array.isArray(count) ? count.length : Number(count) || 0;
  const label = `${safeCount} notification${safeCount === 1 ? '' : 's'}`;

  return (
    <span className="task-notifications-badge">
      <img
        src={resolveSvgSrc(bellIcon)}
        width={18}
        height={18}
        alt=""
        aria-hidden="true"
        className="task-notifications-badge__icon"
      />
      <span className="task-notifications-badge__label">{label}</span>
    </span>
  );
}
