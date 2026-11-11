import { useMemo } from 'react';
import dayjs from 'dayjs';

// Google-Calendar-style week grid: hours down the left, one column per day,
// each assignment is a block from its start time for its hours.
const FIRST_HOUR = 6;
const LAST_HOUR = 20;
const HOUR_PX = 48;
const DEFAULT_START = '07:00';

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || DEFAULT_START).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Place overlapping blocks of one day side by side.
function layoutDay(blocks) {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end);
  const lanes = [];
  sorted.forEach((b) => {
    let lane = lanes.findIndex((end) => end <= b.start);
    if (lane === -1) { lane = lanes.length; lanes.push(b.end); } else lanes[lane] = b.end;
    b.lane = lane;
  });
  sorted.forEach((b) => { b.lanes = Math.max(1, lanes.length); });
  return sorted;
}

export default function ScheduleCalendar({
  days, assignments, visibleWorkerIds, userMap, projectMap, colorFor, lang, t, onSlotClick, onItemClick,
}) {
  const hours = useMemo(() => Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i), []);
  const today = dayjs().format('YYYY-MM-DD');

  const byDay = useMemo(() => {
    const m = new Map(days.map((d) => [d, []]));
    assignments.forEach((a) => {
      const uid = String(a.userId?._id || a.userId || '');
      if (visibleWorkerIds && !visibleWorkerIds.has(uid)) return;
      const day = typeof a.date === 'string' ? a.date.slice(0, 10) : dayjs(a.date).format('YYYY-MM-DD');
      if (!m.has(day)) return;
      const start = toMinutes(a.startTime);
      const end = start + Math.round((Number(a.hours) || 8) * 60);
      m.get(day).push({ a, uid, day, start, end });
    });
    m.forEach((list, k) => m.set(k, layoutDay(list)));
    return m;
  }, [assignments, days, visibleWorkerIds]);

  const top = (min) => ((min - FIRST_HOUR * 60) / 60) * HOUR_PX;

  return (
    <div className="schedule-cal" style={{ '--cal-days': days.length }}>
      <div className="schedule-cal__head">
        <div className="schedule-cal__corner" />
        {days.map((d) => (
          <div key={d} className={`schedule-cal__dayhead${d === today ? ' is-today' : ''}`}>
            <span className="schedule-cal__dow">{dayjs(d).toDate().toLocaleDateString(lang, { weekday: 'short' })}</span>
            <span className="schedule-cal__dnum">{dayjs(d).date()}</span>
          </div>
        ))}
      </div>
      <div className="schedule-cal__body">
        <div className="schedule-cal__times">
          {hours.map((h) => (
            <div key={h} className="schedule-cal__time" style={{ height: HOUR_PX }}>
              <span>{`${String(h).padStart(2, '0')}:00`}</span>
            </div>
          ))}
        </div>
        {days.map((d) => (
          <div key={d} className={`schedule-cal__col${[0, 6].includes(dayjs(d).day()) ? ' is-weekend' : ''}`}>
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                className="schedule-cal__slot"
                style={{ height: HOUR_PX }}
                aria-label={`${d} ${h}:00`}
                onClick={() => onSlotClick(d, `${String(h).padStart(2, '0')}:00`)}
              />
            ))}
            {(byDay.get(d) || []).map((b) => {
              const s = Math.max(b.start, FIRST_HOUR * 60);
              const e = Math.min(b.end, LAST_HOUR * 60);
              if (e <= s) return null;
              const pid = String(b.a.projectId?._id || b.a.projectId || '');
              const width = 100 / b.lanes;
              return (
                <button
                  key={b.a._id || b.a.id}
                  type="button"
                  className="schedule-cal__item"
                  style={{
                    top: top(s),
                    height: Math.max(top(e) - top(s) - 2, 18),
                    left: `calc(${b.lane * width}% + 2px)`,
                    width: `calc(${width}% - 4px)`,
                    background: colorFor(b.uid),
                  }}
                  onClick={() => onItemClick(b.a)}
                >
                  <span className="schedule-cal__item-name">{userMap[b.uid]?.name || t('Employee')}</span>
                  <span className="schedule-cal__item-sub">{pid ? (projectMap[pid]?.name || t('Project')) : t('No project')}</span>
                  <span className="schedule-cal__item-sub">{`${fmt(b.start)}–${fmt(b.end)}`}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
