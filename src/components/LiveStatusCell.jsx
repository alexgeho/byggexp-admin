import { LIVE_DOT_COLORS, getLiveStatus } from '../utils/liveStatus';

export default function LiveStatusCell({ user, workerShiftInfo }) {
  const liveStatus = getLiveStatus(user, workerShiftInfo);

  if (liveStatus.kind === 'na') {
    return <span className="live-status-cell live-status-cell--na">-</span>;
  }

  return (
    <div className="live-status-cell">
      <span
        className="live-status-dot"
        style={{ backgroundColor: LIVE_DOT_COLORS[liveStatus.dotColor] }}
        aria-hidden="true"
      />
      <div className="live-status-content">
        <span className="live-status-label">{liveStatus.label}</span>
        {liveStatus.durationLabel ? (
          <span className="live-status-duration">{liveStatus.durationLabel}</span>
        ) : null}
      </div>
    </div>
  );
}
