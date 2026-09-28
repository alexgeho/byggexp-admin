// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminModal from './AdminModal';
import WizardStepBar from './WizardStepBar';

const STEPS = [{ label: 'One' }, { label: 'Two' }];

const renderModal = (props, children = <p>body</p>) =>
  render(
    <AdminModal open title="Title" saveText="Save" onCancel={() => {}} {...props}>
      {children}
    </AdminModal>,
  );

describe('AdminModal actions', () => {
  it('shows Cancel/Save by default', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('never lets a parent hide the actions: footer={null} keeps Save', () => {
    renderModal({ footer: null });
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('hides its own actions only while a WizardStepBar draws the primary action', () => {
    const wizard = (
      <WizardStepBar steps={STEPS} step={0} onStepBack={() => {}} primaryLabel="Next" onPrimary={() => {}} />
    );
    const { rerender } = renderModal({}, wizard);
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();

    // The form stops rendering its wizard (like the removed user wizard) →
    // the modal's Save must come back on its own.
    rerender(
      <AdminModal open title="Title" saveText="Save" onCancel={() => {}}>
        <p>plain form</p>
      </AdminModal>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
