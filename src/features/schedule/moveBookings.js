import dayjs from 'dayjs';

// Dragging a booking in Planering: the whole run (one person's consecutive days
// on one order) shifts by whole days, optionally to a new start time and/or to
// another person. Pure: returns what to write and what to restore on «Ångra».
const idOf = (v) => String(v?._id || v?.id || v || '');
export const bookingDay = (a) => (typeof a.date === 'string' ? a.date.slice(0, 10) : dayjs(a.date).format('YYYY-MM-DD'));

export function planMove(docs = [], { dayDelta = 0, startTime, userId } = {}) {
  const sameUser = (a) => !userId || String(userId) === idOf(a.userId);
  if (!dayDelta && !startTime && docs.every(sameUser)) return [];
  return docs.map((a) => ({
    id: idOf(a),
    doc: a,
    next: {
      date: dayjs(bookingDay(a)).add(dayDelta, 'day').format('YYYY-MM-DD'),
      userId: userId ? String(userId) : idOf(a.userId),
      ...(startTime ? { startTime } : {}),
    },
    // The stored start may be empty (= 07:00); the API only takes HH:mm back.
    prev: {
      date: bookingDay(a),
      userId: idOf(a.userId),
      ...(startTime ? { startTime: a.startTime || '07:00' } : {}),
    },
  }));
}

// Pixels dragged → whole days.
export const dayDeltaOf = (dx, dayPx) => (dayPx > 0 ? Math.round(dx / dayPx) : 0);

// Dropped block → its new start (minutes), snapped to 15 and kept inside the grid.
export function droppedStart(rawStart, duration, firstMin, lastMin) {
  const snapped = Math.round(rawStart / 15) * 15;
  return Math.max(firstMin, Math.min(Math.max(firstMin, lastMin - duration), snapped));
}
