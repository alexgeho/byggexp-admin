// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/company/avvik',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock('@/src/shared/routing/routerCompat', () => ({ useOutletContext: () => ({}) }));

const ROWS = [
  {
    _id: 'd1', number: 2, title: 'Manglende rekkverk', projectId: 'p1', projectName: 'Storgata 5',
    category: 'hms', severity: 'high', status: 'open', responsibleName: 'Kari', dueDate: '2020-01-10T00:00:00.000Z',
    overdue: true, canManage: true, editableFields: [], correctiveAction: '',
  },
  {
    _id: 'd2', number: 1, title: 'Feil membran', projectId: 'p1', projectName: 'Storgata 5',
    category: 'quality', severity: 'medium', status: 'closed', responsibleName: '', dueDate: null,
    overdue: false, canManage: true, editableFields: [],
  },
];

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/src/api/apiClient', () => ({ default: api }));

import DeviationsView from './DeviationsView';

describe('DeviationsView', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.get.mockImplementation(async (url) => {
      if (url === '/deviations') return { data: ROWS };
      if (url === '/deviations/d1') return { data: { ...ROWS[0], history: [{ action: 'created', userName: 'Ola', at: '2026-10-30T08:00:00Z', changes: [] }] } };
      return { data: [] };
    });
  });

  it('lists deviations with counters, overdue due date and status', async () => {
    const { container } = render(<DeviationsView />);
    expect(await screen.findByText('Manglende rekkverk')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('Feil membran')).toBeInTheDocument();
    expect(screen.getByText('HSE')).toBeInTheDocument();
    // Pills: All 2 · Open 1 · In progress 0 · Overdue 1 · Closed 1
    const pills = [...container.querySelectorAll('.status-pills__button')].map((b) => b.textContent);
    expect(pills).toEqual(['All2', 'Open1', 'In progress0', 'Overdue1', 'Closed1']);
    expect(container.querySelector('.avvik-late')).not.toBeNull();
    expect(container).toMatchSnapshot();
  });

  it('filters by the Overdue pill', async () => {
    const { container } = render(<DeviationsView />);
    await screen.findByText('Manglende rekkverk');
    fireEvent.click([...container.querySelectorAll('.status-pills__button')][3]);
    expect(screen.queryByText('Feil membran')).toBeNull();
    expect(screen.getByText('Manglende rekkverk')).toBeInTheDocument();
  });

  it('closes a deviation from the drawer with a comment', async () => {
    api.post.mockImplementation(async (url, body) => ({
      data: { ...ROWS[0], status: 'closed', closingComment: body.closingComment, overdue: false, history: [] },
    }));
    render(<DeviationsView />);
    fireEvent.click(await screen.findByText('Manglende rekkverk'));
    const drawer = await screen.findByRole('dialog');
    await within(drawer).findByText('Reported');
    fireEvent.click(within(drawer).getByRole('button', { name: /Close deviation/ }));

    const modalTitle = await screen.findAllByText('Close deviation');
    expect(modalTitle.length).toBeGreaterThan(1);
    const save = () => screen.getAllByRole('button', { name: 'Close deviation' }).find((b) => b.getAttribute('form') === 'close-deviation-form');
    expect(save()).toBeDisabled(); // comment required
    const textareas = document.querySelectorAll('#close-deviation-form textarea');
    fireEvent.change(textareas[1], { target: { value: 'Rekkverk montert' } });
    await waitFor(() => expect(save()).not.toBeDisabled());
    fireEvent.click(save());
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/deviations/d1/close', {
      closingComment: 'Rekkverk montert',
      correctiveAction: '',
    }));
    await waitFor(() => expect(screen.getAllByText('Closed').length).toBeGreaterThan(1));
  });
});
