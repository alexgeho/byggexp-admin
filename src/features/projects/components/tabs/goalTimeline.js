// Pure helpers for the Goals timeline (Gantt) view. Kept out of the component so
// the date math and critical-path logic can be unit-tested.

const DAY = 86400000;

// Parse a "YYYY-MM-DD" string to a UTC epoch ms, or null when empty/invalid.
export const parseDay = (s) => {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? null : t;
};

// Inclusive day span of a stage (end - start + 1 days); 1 when a single day,
// 0 when the stage has no valid start/end pair.
export const stageDurationDays = (stage) => {
  const s = parseDay(stage.startDate);
  const e = parseDay(stage.endDate);
  if (s == null || e == null || e < s) return 0;
  return Math.round((e - s) / DAY) + 1;
};

// Whole-timeline bounds across every scheduled stage.
export const timelineBounds = (stages) => {
  let min = null;
  let max = null;
  stages.forEach((st) => {
    const s = parseDay(st.startDate);
    const e = parseDay(st.endDate);
    if (s != null) min = min == null ? s : Math.min(min, s);
    if (e != null) max = max == null ? e : Math.max(max, e);
    // A start-only stage still contributes a 1-day span.
    if (s != null && e == null) max = max == null ? s : Math.max(max, s);
  });
  if (min == null || max == null) return null;
  const totalDays = Math.round((max - min) / DAY) + 1;
  return { min, max, totalDays: Math.max(1, totalDays) };
};

// Bar geometry (left%, width%) for one stage within the given bounds. Returns
// null when the stage is unscheduled so the caller can render a placeholder.
export const stageBar = (stage, bounds) => {
  if (!bounds) return null;
  const s = parseDay(stage.startDate);
  if (s == null) return null;
  const e = parseDay(stage.endDate) ?? s;
  const startOff = Math.round((s - bounds.min) / DAY);
  const span = Math.max(1, Math.round((e - s) / DAY) + 1);
  return {
    left: (startOff / bounds.totalDays) * 100,
    width: (span / bounds.totalDays) * 100,
  };
};

// Critical path over the dependency DAG: the chain of stages whose cumulative
// duration is the longest. `dependsOn` holds indices of prerequisite stages.
// Returns a Set of stage indices that lie on that longest chain. Cycles and
// out-of-range indices are ignored defensively.
export const criticalPath = (stages) => {
  const n = stages.length;
  const dur = stages.map(stageDurationDays);
  const deps = stages.map((st) =>
    (Array.isArray(st.dependsOn) ? st.dependsOn : []).filter(
      (d) => Number.isInteger(d) && d >= 0 && d < n,
    ),
  );
  const best = new Array(n).fill(-1); // longest cumulative duration ending at i
  const prev = new Array(n).fill(-1); // predecessor on that longest path
  const visiting = new Array(n).fill(0);

  const solve = (i) => {
    if (best[i] >= 0) return best[i];
    if (visiting[i]) return dur[i]; // cycle guard — treat as no predecessor
    visiting[i] = 1;
    let bestPrevLen = 0;
    let bestPrev = -1;
    for (const d of deps[i]) {
      const len = solve(d);
      if (len > bestPrevLen) {
        bestPrevLen = len;
        bestPrev = d;
      }
    }
    visiting[i] = 0;
    prev[i] = bestPrev;
    best[i] = bestPrevLen + dur[i];
    return best[i];
  };

  let end = -1;
  let endLen = -1;
  for (let i = 0; i < n; i += 1) {
    const len = solve(i);
    if (len > endLen) {
      endLen = len;
      end = i;
    }
  }

  const path = new Set();
  // Only a chain with real duration and at least one dependency edge counts as a
  // meaningful "critical path"; a single scheduled stage is not highlighted.
  let cur = end;
  let edges = 0;
  while (cur >= 0) {
    path.add(cur);
    if (prev[cur] >= 0) edges += 1;
    cur = prev[cur];
  }
  return edges > 0 ? path : new Set();
};
