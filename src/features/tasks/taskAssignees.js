// Who a task is for, as one short label. A task can name its person two ways:
// a single assignee (assigneeUserId) or a chosen group of recipients stored on
// its notification settings. The list used to read only the first, so a task
// sent to Adam through the recipient picker showed "–" while its own page
// showed Adam ticked.
const parseSettings = (settings) => {
  if (!settings) return null;
  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings);
    } catch {
      return null;
    }
  }
  return settings;
};

export function taskAssigneeIds(task) {
  const single =
    typeof task?.assigneeUserId === 'object'
      ? task.assigneeUserId?._id
      : task?.assigneeUserId;
  if (single) return [String(single)];
  const settings = parseSettings(task?.notificationSettings);
  const group = Array.isArray(settings?.assignees) ? settings.assignees : [];
  return group.map((person) => String(person?.id || '')).filter(Boolean);
}

// { name, extra }: the first person's name and how many more there are.
export function taskAssigneeLabel(task, users = {}) {
  const single =
    typeof task?.assigneeUserId === 'object' ? task.assigneeUserId : null;
  const singleId = single?._id || task?.assigneeUserId;
  if (singleId) {
    const user = single || users[singleId];
    const name = task?.assigneeUserName || user?.name || user?.email || '';
    return name ? { id: String(singleId), name, extra: 0 } : null;
  }
  const settings = parseSettings(task?.notificationSettings);
  const group = Array.isArray(settings?.assignees) ? settings.assignees : [];
  if (!group.length) return null;
  const first = group[0];
  const name = first?.name || users[first?.id]?.name || users[first?.id]?.email || '';
  if (!name) return null;
  return { id: String(first.id), name, extra: group.length - 1 };
}
