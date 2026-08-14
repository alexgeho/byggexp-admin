import apiClient from '@/src/api/apiClient';

// One-off "log your hours" nudge. The admin triggers it from the panel; the
// backend delivers the push (+ email fallback) to the worker's mobile app.
//
// - userIds:     explicit workers to remind (omit to let the backend pick).
// - projectId:   scope/context for the reminder (deep-links the app screen).
// - onlyMissing: when true, the backend only pings workers who have NOT logged
//                any hours for today, so people who already reported aren't nagged.
export async function nudgeLogHours({ userIds, projectId, onlyMissing = false } = {}) {
  const { data } = await apiClient.post('/hours-reminders/nudge', {
    userIds: Array.isArray(userIds) ? userIds.filter(Boolean) : undefined,
    projectId,
    onlyMissing,
  });
  return data;
}

// The company-wide shift-anchored reminder rule (enabled, startDelayMinutes,
// intervalMinutes, maxReminders, escalateAfterReminders, workingWeekdays).
export async function getHoursRule() {
  const { data } = await apiClient.get('/hours-reminders/rule');
  return data;
}

export async function updateHoursRule(patch) {
  const { data } = await apiClient.put('/hours-reminders/rule', patch);
  return data;
}
