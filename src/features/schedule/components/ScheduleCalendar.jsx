import { useEffect, useMemo, useRef, useState } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatDayLabel, getWeekNumber } from '@/src/features/schedule/scheduleUtils';
import { droppedStart } from '@/src/features/schedule/moveBookings';

// Google-Calendar-style week grid: hours down the left, one column per day,
// each assignment is a block from its start time for its hours.
const FIRST_HOUR = 6;
const LAST_HOUR = 20;
const HOUR_PX = 38; // −20% (owner 12.11)
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
  days, assignments, visibleWorkerIds, userMap, projectMap, colorFor, lang, t, onRangeSelect, onItemClick, onItemMove,
  copying, copyIds, onItemCopy, onItemMenu, onPasteDay,
}) {
  // Drag (or click) selects a time range; dragging sideways spans several days (owner 12.11).
  const [drag, setDrag] = useState(null); // { day, dayB, a, b } — a/b in minutes from 00:00
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
      const col = document.elementFromPoint(e.clientX, e.clientY)?.closest('.schedule-cal__col');
      const dayB = col?.dataset.day;
      if (el) setDrag((d) => (d ? { ...d, b: minuteAt(el, e.clientY), ...(dayB ? { dayB } : {}) } : d));
    };
    const up = () => {
      setDrag((d) => {
        if (d) {
          let s = Math.min(d.a, d.b);
          let e = Math.max(d.a, d.b);
          if (e - s < 60) e = Math.min(LAST_HOUR * 60, s + 60); // a click = 1 hour (minimum)
          if (e <= s) s = e - 60;
          const [from, to] = [d.day, d.dayB || d.day].sort();
          onRangeSelect(from, fmt(s), fmt(e), to);
        }
        return null;
      });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up, { once: true });
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [drag !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag a booking to another day and / or time; with Alt it is copied (owner 17.11).
  // Nothing moves until the pointer has travelled 5px — a plain click still opens the order.
  const [move, setMove] = useState(null); // { id, uid, day, start, dur, copy } once it moves
  const moveRef = useRef(null);
  const clickGuard = useRef(false);
  const startMove = (e, b) => {
    if (e.button !== 0 || !onItemMove || copying) return;
    const col = e.currentTarget.closest('.schedule-cal__col');
    const r = col.getBoundingClientRect();
    const pointerMin = FIRST_HOUR * 60 + ((e.clientY - r.top) / HOUR_PX) * 60;
    moveRef.current = { b, x0: e.clientX, y0: e.clientY, grab: pointerMin - Math.max(b.start, FIRST_HOUR * 60), moved: false };
  };
  useEffect(() => {
    const at = (e, m) => {
      const col = document.elementFromPoint(e.clientX, e.clientY)?.closest('.schedule-cal__col');
      const day = col?.dataset.day || m.day || m.b.day;
      let start = m.b.start;
      // A sideways drag keeps the time exactly as it was.
      if (col && Math.abs(e.clientY - m.y0) >= 6) {
        const r = col.getBoundingClientRect();
        const raw = FIRST_HOUR * 60 + ((e.clientY - r.top) / HOUR_PX) * 60 - m.grab;
        start = droppedStart(raw, m.b.end - m.b.start, FIRST_HOUR * 60, LAST_HOUR * 60);
      }
      return { day, start };
    };
    const onMove = (e) => {
      const m = moveRef.current;
      if (!m) return;
      if (!m.moved && Math.hypot(e.clientX - m.x0, e.clientY - m.y0) < 5) return;
      m.moved = true;
      const { day, start } = at(e, m);
      m.day = day;
      m.start = start;
      setMove({ id: String(m.b.a._id || m.b.a.id), uid: m.b.uid, day, start, dur: m.b.end - m.b.start, copy: e.altKey });
    };
    const onUp = (e) => {
      const m = moveRef.current;
      moveRef.current = null;
      if (!m || !m.moved) return;
      setMove(null);
      // The click that follows this mouse-up must not open the order.
      clickGuard.current = true;
      setTimeout(() => { clickGuard.current = false; }, 0);
      const { day, start } = at(e, m);
      const dayDelta = dayjs(day).diff(dayjs(m.b.day), 'day');
      if (!dayDelta && start === m.b.start) return;
      onItemMove(m.b.a, { dayDelta, ...(start !== m.b.start ? { startTime: fmt(start) } : {}), copy: e.altKey });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [onItemMove]);

  // Fade the edges of the scrolling hour grid so it's clear there is more above/below (owner 12.11).
  const bodyRef = useRef(null);
  const [fade, setFade] = useState({ top: false, bottom: false });
  const updateFade = () => {
    const el = bodyRef.current;
    if (!el) return;
    const top = el.scrollTop > 2;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }));
  };
  useEffect(() => {
    updateFade();
    window.addEventListener('resize', updateFade);
    return () => window.removeEventListener('resize', updateFade);
  });

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
    <div className={`schedule-cal${copying ? ' is-copying' : ''}`} style={{ '--cal-days': days.length }}>
      {/* Same header as the timeline: week, day — month + year sit in the people corner (owner 12.11). */}
      {[
        { key: 'week', label: (d) => `${t('Week')} ${getWeekNumber(dayjs(d).toDate())}`, id: (d) => `${dayjs(d).startOf('isoWeek').format('YYYY-MM-DD')}` },
      ].map((band) => {
        const spans = [];
        days.forEach((d) => {
          const last = spans[spans.length - 1];
          if (last && last.id === band.id(d)) last.n += 1;
          else spans.push({ id: band.id(d), d, n: 1 });
        });
        return (
          <div key={band.key} className={`schedule-cal__band schedule-cal__band--${band.key}`}>
            <div className="schedule-cal__corner" />
            {spans.map((sp) => (
              <div key={sp.id} className="schedule-cal__bandcell" style={{ gridColumn: `span ${sp.n}` }}>{band.label(sp.d)}</div>
            ))}
          </div>
        );
      })}
      <div className="schedule-cal__head">
        <div className="schedule-cal__corner" />
        {days.map((d) => (
          <div key={d} className={`schedule-cal__dayhead${d === today ? ' is-today' : ''}`}>
            <span>{formatDayLabel(dayjs(d).toDate(), lang)}</span>
          </div>
        ))}
      </div>
      <div
        ref={bodyRef}
        onScroll={updateFade}
        className={`schedule-cal__body${fade.top ? ' fade-top' : ''}${fade.bottom ? ' fade-bottom' : ''}`}
      >
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
            data-day={d}
            className={`schedule-cal__col${[0, 6].includes(dayjs(d).day()) ? ' is-weekend' : ''}`}
            onMouseDown={(e) => {
              if (e.button !== 0 || e.target.closest('.schedule-cal__item')) return;
              e.preventDefault();
              // A copy is waiting: this click says which day it goes to.
              if (copying) { onPasteDay(d); return; }
              dragRef.current = e.currentTarget;
              const m = minuteAt(e.currentTarget, e.clientY);
              setDrag({ day: d, dayB: d, a: m, b: m + 30 });
            }}
          >
            {hours.map((h) => (
              <div key={h} className="schedule-cal__slot" style={{ height: HOUR_PX }} />
            ))}
            {drag && d >= [drag.day, drag.dayB].sort()[0] && d <= [drag.day, drag.dayB].sort()[1] ? (() => {
              const s0 = Math.min(drag.a, drag.b);
              const e0 = Math.max(drag.a, drag.b, s0 + 30);
              return (
                <div className="schedule-cal__ghost" style={{ top: top(s0), height: top(e0) - top(s0) }}>
                  {`${fmt(s0)}–${fmt(e0)}`}
                </div>
              );
            })() : null}
            {move && move.day === d ? (
              <div
                className="schedule-cal__item schedule-cal__item--moving"
                style={{ top: top(move.start), height: Math.max((move.dur / 60) * HOUR_PX - 2, 18), left: 'calc(0% + 2px)', width: 'calc(85% - 4px)', background: colorFor(move.uid) }}
              >
                <span className="schedule-cal__item-name">{userMap[move.uid]?.name || t('Employee')}</span>
                <span className="schedule-cal__item-sub">{`${fmt(move.start)}–${fmt(move.start + move.dur)}`}</span>
              </div>
            ) : null}
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
                  className={`schedule-cal__item${move && !move.copy && move.id === String(b.a._id || b.a.id) ? ' is-lifted' : ''}${copyIds?.has(String(b.a._id || b.a.id)) ? ' is-copy-source' : ''}`}
                  style={{
                    top: top(s),
                    height: Math.max(top(e) - top(s) - 2, 18),
                    left: `calc(${leftPct}% + 2px)`,
                    width: `calc(${widthPct}% - 4px)`,
                    zIndex: 1 + b.lane,
                    background: colorFor(b.uid),
                  }}
                  onMouseDown={(e) => startMove(e, b)}
                  onClick={() => {
                    if (clickGuard.current) return;
                    if (copying) onPasteDay(d);
                    else onItemClick(b.a);
                  }}
                  onContextMenu={(e) => { if (!onItemMenu) return; e.preventDefault(); onItemMenu(b.a, e.clientX, e.clientY); }}
                >
                  {onItemCopy && !copying ? (
                    <span
                      className="schedule-cal__item-copy"
                      role="button"
                      tabIndex={-1}
                      title={t('Copy')}
                      aria-label={t('Copy')}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onItemCopy(b.a); }}
                    >
                      <CopyOutlined />
                    </span>
                  ) : null}
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
