// Dagens rapport — what a worker filled in for one day in the app's day card
// and what reaches the lönespecifikation. The day's hours are
// arbetstid + övertid + OB, so normal hours = total − övertid − OB.

// Same colours as the app's day card.
export const DAY_REPORT_COLORS = {
  normal: '#0785F4',
  overtime: '#F59E0B',
  ob: '#7C5CD6',
  leave: '#7C5CD6',
};

// "8,5 h" — hours with a decimal comma, as everywhere else in the app.
export const formatHours = (ms) =>
  `${String(Math.round(((Number(ms) || 0) / 3600000) * 10) / 10).replace('.', ',')} h`;

const totalOf = (shift) => Number(
  shift?.manualDurationMs != null ? shift.manualDurationMs : shift?.durationMs,
) || 0;

// Several shifts on one day (one per project) → one status: anything still
// waiting makes the day wait.
const mergeStatus = (a, b) => {
  if (a === 'pending' || b === 'pending') return 'pending';
  return a || b || null;
};

// One worker's shifts on one day → the day's sums.
export function summarizeDay(shifts = []) {
  const day = {
    totalMs: 0,
    normalMs: 0,
    overtimeMs: 0,
    overtimeStatus: null,
    obMs: 0,
    obStatus: null,
    travelMinutes: 0,
    travelKm: 0,
    perDiem: 'none',
    notes: [],
    photos: [],
  };
  shifts.filter(Boolean).forEach((shift) => {
    const total = totalOf(shift);
    const overtime = Math.min(Math.max(0, Number(shift.overtimeMs) || 0), total);
    const ob = Math.min(Math.max(0, Number(shift.obMs) || 0), total - overtime);
    day.totalMs += total;
    day.normalMs += total - overtime - ob;
    day.overtimeMs += overtime;
    day.obMs += ob;
    if (overtime) day.overtimeStatus = mergeStatus(day.overtimeStatus, shift.overtimeStatus || 'pending');
    if (ob) day.obStatus = mergeStatus(day.obStatus, shift.obStatus || 'pending');
    day.travelMinutes += Number(shift.travelMinutes) || 0;
    day.travelKm += Number(shift.travelKm) || 0;
    if (shift.perDiem === 'full' || (shift.perDiem === 'half' && day.perDiem !== 'full')) {
      day.perDiem = shift.perDiem;
    }
    const note = String(shift.dayNote || '').trim();
    if (note && !day.notes.includes(note)) day.notes.push(note);
    (shift.photos || []).forEach((photo) => day.photos.push(photo));
  });
  return day;
}

// The day's lines, empty ones left out. `leave` is the day's Frånvaro
// request (type + status); `receipts` the day's expenses.
export function dayReportItems(day, { leave = null, receipts = [] } = {}) {
  const items = [];
  if (day.normalMs) items.push({ key: 'normal', label: 'Normal', value: formatHours(day.normalMs), color: DAY_REPORT_COLORS.normal });
  if (day.overtimeMs) {
    items.push({ key: 'overtime', label: 'Overtime', value: formatHours(day.overtimeMs), color: DAY_REPORT_COLORS.overtime, status: day.overtimeStatus });
  }
  if (day.obMs) items.push({ key: 'ob', label: 'OB', value: formatHours(day.obMs), color: DAY_REPORT_COLORS.ob, status: day.obStatus });
  if (leave) items.push({ key: 'leave', label: 'Leave', leaveType: leave.type, color: DAY_REPORT_COLORS.leave, status: leave.status });
  if (day.travelMinutes) items.push({ key: 'travel', label: 'Travel time', value: formatHours(day.travelMinutes * 60000) });
  if (day.travelKm) items.push({ key: 'km', label: 'Car', value: `${String(Math.round(day.travelKm * 10) / 10).replace('.', ',')} km` });
  if (day.perDiem === 'full' || day.perDiem === 'half') {
    items.push({ key: 'perDiem', label: 'Per diem', value: day.perDiem === 'full' ? 'Per diem full' : 'Per diem half' });
  }
  if (day.photos.length) items.push({ key: 'photos', label: 'Photos', count: day.photos.length });
  if (receipts.length) items.push({ key: 'receipts', label: 'Receipts', count: receipts.length });
  return items;
}

// The leave request covering a date, if any (rejected ones don't count).
export function leaveOnDate(leaves, userId, date) {
  return (leaves || []).find((leave) => String(leave.userId) === String(userId)
    && leave.status !== 'rejected'
    && String(leave.startDate).slice(0, 10) <= date
    && date <= String(leave.endDate || leave.startDate).slice(0, 10)) || null;
}

// The worker's receipts dated that day.
export function receiptsOnDate(expenses, userId, date) {
  return (expenses || []).filter((expense) => String(expense.userId) === String(userId)
    && String(expense.date).slice(0, 10) === date);
}
