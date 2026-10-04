// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/src/api/apiClient', () => ({
  default: { get: vi.fn(async () => ({ data: [] })), post: vi.fn() },
}));

import { useChecklistStore } from '@/src/store/checklistStore';
import { useModuleStore } from '@/src/store/moduleStore';
import NewChecklistForm from './NewChecklistForm';

// jsdom lacks matchMedia (antd Grid / responsive observers use it).
window.matchMedia = window.matchMedia || ((q) => ({
  matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
}));

describe('NewChecklistForm — solo egenkontroll', () => {
  beforeEach(() => {
    useModuleStore.setState({ plan: 'egenkontroll', enabled: ['kma'] });
    useChecklistStore.setState({
      templates: [{ _id: 't1', name: 'Mall' }],
      aiEnabled: false,
      aiChecked: true,
      fetchAiStatus: async () => {},
      fetchTemplates: async () => {},
    });
  });

  it('keeps the upload zone with an inline AI error and hides template/date/responsible', () => {
    const onCanSave = vi.fn();
    render(<NewChecklistForm onCanSaveChange={onCanSave} />);
    expect(screen.getByText(/AI reading is unavailable/)).toBeInTheDocument();
    expect(screen.queryByText('Template')).toBeNull();
    expect(screen.queryByText('Responsible')).toBeNull();
    expect(screen.queryByText('Date')).toBeNull();
    expect(screen.getByText('Address')).toBeInTheDocument();
    // Nothing to save yet (no points, no address).
    expect(onCanSave).toHaveBeenLastCalledWith(false);
    // Points can be typed by hand instead.
    expect(screen.getByText('Add point')).toBeInTheDocument();
  });
});
