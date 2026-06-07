import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';
import { buildWorkerShiftMap, getTodayDateKey } from '../utils/liveStatus';

const POLL_INTERVAL_MS = 15000;
const TICK_INTERVAL_MS = 1000;

export function useLiveWorkData(enabled = true) {
  const [todayShifts, setTodayShifts] = useState([]);
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
        }
      } catch (error) {
        console.error('Failed to fetch today shifts:', error);
      }
    };

    loadTodayShifts();
    const pollId = setInterval(loadTodayShifts, POLL_INTERVAL_MS);
    const tickId = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, [enabled]);

  const workerShiftMap = useMemo(
    () => buildWorkerShiftMap(todayShifts, now),
    [todayShifts, now],
  );

  return { workerShiftMap, now };
}
