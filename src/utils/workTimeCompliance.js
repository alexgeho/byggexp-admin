// Lightweight working-time (Arbetstidslagen) checks over recent shifts. Not a
// legal audit — a heads-up so a manager can act. Key rules covered:
//  - Dygnsvila: at least 11 h continuous rest per 24 h → we flag gaps < 11 h
//    between consecutive shifts.
//  - Veckoarbetstid: ~48 h/week average → we flag > 48 h in the last 7 days.

const H = 3600000;

export function checkWorkTime(shifts = [], { restHours = 11, weeklyMax = 48, now = Date.now() } = {}) {
  const byWorker = {};
  shifts.forEach((shift) => {
    const wid = String(shift.workerId?._id || shift.workerId || '');
    if (!wid || !shift.startedAt) return;
    (byWorker[wid] = byWorker[wid] || []).push(shift);
  });

  const weekAgo = now - 7 * 24 * H;
  const results = [];

  Object.entries(byWorker).forEach(([workerId, list]) => {
    const sorted = [...list].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

    const weeklyMs = list
      .filter((s) => new Date(s.startedAt).getTime() >= weekAgo)
      .reduce((sum, s) => sum + (Number(s.durationMs) || 0), 0);
    const weeklyHours = Math.round((weeklyMs / H) * 10) / 10;

    let restViolations = 0;
    let shortestRest = null;
    for (let i = 1; i < sorted.length; i += 1) {
      const prevEnd = sorted[i - 1].endedAt ? new Date(sorted[i - 1].endedAt).getTime() : null;
      const nextStart = new Date(sorted[i].startedAt).getTime();
      if (prevEnd && nextStart > prevEnd && nextStart >= weekAgo) {
        const restH = (nextStart - prevEnd) / H;
        if (restH < restHours) {
          restViolations += 1;
          shortestRest = shortestRest == null ? restH : Math.min(shortestRest, restH);
        }
      }
    }

    const issues = [];
    if (weeklyHours > weeklyMax) issues.push('weekly');
    if (restViolations) issues.push('rest');
    if (issues.length) {
      results.push({
        workerId,
        weeklyHours,
        restViolations,
        shortestRest: shortestRest == null ? null : Math.round(shortestRest * 10) / 10,
        issues,
      });
    }
  });

  return results.sort((a, b) => b.weeklyHours - a.weeklyHours);
}
