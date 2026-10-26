// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/src/config/apiConfig', () => ({ API_BASE_URL: 'http://test' }));
vi.mock('./materialOrdersApi', async (orig) => ({
  ...(await orig()),
  materialOrdersApi: {
    list: vi.fn().mockResolvedValue([
      { _id: 'o1', orderNumber: 3, supplier: 'Lundagrossisten', status: 'draft', rows: [{ articleNumber: '1', quantity: 2 }], desiredDate: '2026-11-02' },
    ]),
    suppliers: vi.fn().mockResolvedValue([{ supplier: 'Lundagrossisten', canOrder: false }]),
    articles: vi.fn().mockResolvedValue([]),
  },
}));

import ProjectMaterialTab from './ProjectMaterialTab';

describe('ProjectMaterialTab', () => {
  it('lists the project orders', async () => {
    render(<ProjectMaterialTab project={{ _id: 'p1', location: 'Storgatan 1' }} />);
    expect(await screen.findByText('Lundagrossisten')).toBeInTheDocument();
    expect(screen.getByText('New order')).toBeInTheDocument();
  });
});
