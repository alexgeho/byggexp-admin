import { describe, expect, it } from 'vitest';
import { taskAssigneeIds, taskAssigneeLabel } from './taskAssignees';

describe('taskAssigneeLabel', () => {
  it('uses the single assignee when there is one', () => {
    expect(taskAssigneeLabel({ assigneeUserId: 'u1', assigneeUserName: 'Alex R' })).toEqual({
      id: 'u1',
      name: 'Alex R',
      extra: 0,
    });
  });

  it('falls back to the chosen recipients', () => {
    const task = {
      notificationSettings: { assignees: [{ id: 'a1', name: 'Adam' }, { id: 'r1', name: 'Roger' }] },
    };
    expect(taskAssigneeLabel(task)).toEqual({ id: 'a1', name: 'Adam', extra: 1 });
    expect(taskAssigneeIds(task)).toEqual(['a1', 'r1']);
  });

  it('reads settings stored as a JSON string and names from the user map', () => {
    const task = { notificationSettings: JSON.stringify({ assignees: [{ id: 'a1' }] }) };
    expect(taskAssigneeLabel(task, { a1: { name: 'Adam' } })).toEqual({ id: 'a1', name: 'Adam', extra: 0 });
  });

  it('returns null for a whole-team task', () => {
    expect(taskAssigneeLabel({ notificationSettings: { assignees: [] } })).toBeNull();
  });
});
