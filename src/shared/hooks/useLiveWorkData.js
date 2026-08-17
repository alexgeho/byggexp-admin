import { useEffect, useMemo, useState } from 'react';
import apiClient from '@/src/api/apiClient';
import { buildWorkerShiftMap, getTodayDateKey } from '@/src/utils/liveStatus';

const POLL_INTERVAL_MS = 15000;

export function useLiveWorkData(enabled = true) {
  const [todayShifts, setTodayShifts] = useState([]);
  // `now` advances only with each poll (every 15s), not on a 1s ticker: the
  // live-hours it feeds render at 0.1h/whole-hour granularity, so a per-second
  // update just re-rendered every consumer (dashboard, user list, project tabs)
  // for no visible change. Refreshing alongside the shift data is plenty.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;

    const loadTodayShifts = async () => {
      try {
        const response = await apiClient.get('/shifts/list', {
          params: { dates: getTodayDateKey() },
        });

        if (!cancelled) {
          setTodayShifts(response.data?.items || []);
          setNow(Date.now());
        }
      } catch (error) {
        console.error('Failed to fetch today shifts:', error);
      }
    };

    loadTodayShifts();
    const pollId = setInterval(loadTodayShifts, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollId);
    };
  }, [enabled]);

  const workerShiftMap = useMemo(
    () => buildWorkerShiftMap(todayShifts, now),
    [todayShifts, now],
  );

  return { workerShiftMap, now };
}
