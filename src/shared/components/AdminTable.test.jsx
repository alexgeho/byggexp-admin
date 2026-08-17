// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminTable from './AdminTable';

const columns = [{ title: 'Name', dataIndex: 'name', key: 'name' }];
const emptyState = {
  title: 'No projects yet',
  description: 'Create your first one to get started.',
  actionLabel: 'Create your first project',
  onAction: () => {},
};

describe('AdminTable empty state', () => {
  it('shows the rich empty CTA when the list has no data', () => {
    render(<AdminTable columns={columns} dataSource={[]} rowKey="id" emptyState={emptyState} />);
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create your first project' })).toBeInTheDocument();
  });

  it('does not show the empty CTA once there are rows', () => {
    render(<AdminTable columns={columns} dataSource={[{ id: '1', name: 'Alpha' }]} rowKey="id" emptyState={emptyState} />);
    expect(screen.queryByText('No projects yet')).toBeNull();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});

describe('AdminTable bulk delete', () => {
  const rows = [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }];

  it('hides the Delete button until a row is selected, then reveals the count', () => {
    render(
      <AdminTable columns={columns} dataSource={rows} rowKey="id" onBulkDelete={vi.fn()} />,
    );

    // No selection yet → no bulk Delete button.
    expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull();

    // Select the first row (the header checkbox is index 0, first row is index 1).
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    expect(screen.getByRole('button', { name: /Delete \(1\)/ })).toBeInTheDocument();
  });

  it('never shows a bulk Delete button when onBulkDelete is not provided', () => {
    render(<AdminTable columns={columns} dataSource={rows} rowKey="id" />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull();
  });
});
