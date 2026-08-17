// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskRow from './TaskRow';

const NOW = new Date('2026-06-15T12:00:00Z').getTime();
const noop = () => {};

function renderRow(task, handlers = {}) {
  return render(
    <TaskRow
      task={task}
      now={NOW}
      reminderOpenId={null}
      setReminderOpenId={noop}
      planDragId={null}
      setPlanDragId={noop}
      setPlanDragOverHour={noop}
      onOpen={handlers.onOpen || noop}
      onComplete={handlers.onComplete || noop}
      onReopen={handlers.onReopen || noop}
      onRemove={handlers.onRemove || noop}
      onSaveReminder={noop}
      onClearReminder={noop}
    />,
  );
}

describe('TaskRow', () => {
  it('shows the title and a Personal tag when there is no project', () => {
    renderRow({ _id: 't1', taskTitle: 'Call client', status: 'open' });
    expect(screen.getByText('Call client')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('shows the project name when the task belongs to a project', () => {
    renderRow({ _id: 't2', taskTitle: 'Pour slab', status: 'open', projectId: { name: 'Villa A' } });
    expect(screen.getByText('Villa A')).toBeInTheDocument();
  });

  it('completes an open task via the check button', () => {
    const onComplete = vi.fn();
    const task = { _id: 't3', taskTitle: 'Do it', status: 'open' };
    renderRow(task, { onComplete });
    fireEvent.click(screen.getByRole('button', { name: 'Mark done' }));
    expect(onComplete).toHaveBeenCalledWith(task);
  });

  it('reopens a completed task via the check button', () => {
    const onReopen = vi.fn();
    renderRow({ _id: 't4', taskTitle: 'Done thing', status: 'completed' }, { onReopen });
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(onReopen).toHaveBeenCalledWith('t4');
  });

  it('opens the editor when the body is clicked', () => {
    const onOpen = vi.fn();
    const task = { _id: 't5', taskTitle: 'Edit me', status: 'open' };
    renderRow(task, { onOpen });
    fireEvent.click(screen.getByText('Edit me'));
    expect(onOpen).toHaveBeenCalledWith(task);
  });
});
