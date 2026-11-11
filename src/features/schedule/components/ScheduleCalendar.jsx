import { useEffect, useMemo, useRef, useState } from 'react';
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
  days, assignments, visibleWorkerIds, userMap, projectMap, colorFor, lang, t, onRangeSelect, onItemClick,
}) {
  // Drag (or click) on a day column selects a time range, snapped to 15 min.
  const [drag, setDrag] = useState(null); // { day, a, b } in minutes from 00:00
  const dragRef = useRef(null);
  const minuteAt = (el, clientY) => {
    const r = el.getBoundingClientRect();
    const raw = FIRST_HOUR * 60 + ((clientY - r.top) / HOUR_PX) * 60;
    return Math.min(LAST_HOUR * 60, Math.max(FIRST_HOUR * 60, Math.floor(raw / 30) * 30));
  };
  useEffect(() => {
    if (!drag) return undefined;
    const move = (e) => {
      const el = dragRef.current;
      if (el) setDrag((d) => (d ? { ...d, b: minuteAt(el, e.clientY) } : d));
    };
    const up = () => {
      setDrag((d) => {
        if (d) {
          let s = Math.min(d.a, d.b);
          let e = Math.max(d.a, d.b);
          if (e - s < 60) e = Math.min(LAST_HOUR * 60, s + 60); // a click = 1 hour (minimum)
          if (e <= s) s = e - 60;
          onRangeSelect(d.day, fmt(s), fmt(e));
        }
        return null;
      });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up, { once: true });
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [drag !== null]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <div
            key={d}
            className={`schedule-cal__col${[0, 6].includes(dayjs(d).day()) ? ' is-weekend' : ''}`}
            onMouseDown={(e) => {
              if (e.button !== 0 || e.target.closest('.schedule-cal__item')) return;
              e.preventDefault();
              dragRef.current = e.currentTarget;
              const m = minuteAt(e.currentTarget, e.clientY);
              setDrag({ day: d, a: m, b: m + 30 });
            }}
          >
            {hours.map((h) => (
              <div key={h} className="schedule-cal__slot" style={{ height: HOUR_PX }} />
            ))}
            {drag && drag.day === d ? (() => {
              const s0 = Math.min(drag.a, drag.b);
              const e0 = Math.max(drag.a, drag.b, s0 + 30);
              return (
                <div className="schedule-cal__ghost" style={{ top: top(s0), height: top(e0) - top(s0) }}>
                  {`${fmt(s0)}–${fmt(e0)}`}
                </div>
              );
            })() : null}
            {(byDay.get(d) || []).map((b) => {
              const s = Math.max(b.start, FIRST_HOUR * 60);
              const e = Math.min(b.end, LAST_HOUR * 60);
              if (e <= s) return null;
              const pid = String(b.a.projectId?._id || b.a.projectId || '');
              // Like Google Calendar: overlapping bookings cascade — each later one is
              // shifted right and drawn on top (white outline), so every block stays
              // wide enough to read; a free strip on the right is kept for new drags.
              const step = b.lanes > 1 ? Math.min(16, 30 / (b.lanes - 1)) : 0;
              const leftPct = b.lane * step;
              const widthPct = 85 - leftPct;
              return (
                <button
                  key={b.a._id || b.a.id}
                  type="button"
                  className="schedule-cal__item"
                  style={{
                    top: top(s),
                    height: Math.max(top(e) - top(s) - 2, 18),
                    left: `calc(${leftPct}% + 2px)`,
                    width: `calc(${widthPct}% - 4px)`,
                    zIndex: 1 + b.lane,
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
