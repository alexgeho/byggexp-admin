// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
