import { getLiveStatus } from '@/src/utils/liveStatus';

export default function LiveStatusCell({ user, workerShiftInfo }) {
  const liveStatus = getLiveStatus(user, workerShiftInfo);

  if (liveStatus.kind === 'na') {
    return <span className="live-status-cell live-status-cell--na">-</span>;
  }

  return (
    <div className="live-status-cell">
      <span
        className={[
          'live-status-badge',
          `live-status-badge--${liveStatus.kind}`,
          liveStatus.offline && 'live-status-badge--offline',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="live-status-dot" aria-hidden="true" />
        <span className="live-status-label">{liveStatus.label}</span>
      </span>
      {liveStatus.lastSeenLabel ? (
        <span className="live-status-lastseen">{liveStatus.lastSeenLabel}</span>
      ) : null}
    </div>
  );
}
