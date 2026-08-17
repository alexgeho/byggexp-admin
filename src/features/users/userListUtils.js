import apiClient from '@/src/api/apiClient';
import { getLiveStatus } from '@/src/utils/liveStatus';

export const LIVE_POLL_INTERVAL_MS = 15000;

// Group the live-status kinds into the pill filter (paused + off_duty read as
// one "Off duty"). Non-tracked roles (kind 'na') fall outside every group and
// only show under "All".
export const USER_STATUS_GROUPS = [
  { value: 'at_work', label: 'At work', kinds: ['at_work'] },
  { value: 'off_duty', label: 'Off duty', kinds: ['paused', 'off_duty'] },
  { value: 'not_at_work', label: 'Not at work', kinds: ['missing'] },
  { value: 'waiting', label: 'Waiting', kinds: ['waiting'] },
];

export const getUserStatusGroup = (user, shiftInfo) => {
  const kind = getLiveStatus(user, shiftInfo)?.kind;
  return USER_STATUS_GROUPS.find((group) => group.kinds.includes(kind))?.value ?? null;
};

export const resolveUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
};
