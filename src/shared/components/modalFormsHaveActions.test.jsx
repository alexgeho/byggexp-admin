// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminModal from './AdminModal';
import UserCreateForm from '@/src/features/users/components/UserCreateForm';
import ClientCreateForm from '@/src/features/clients/components/ClientCreateForm';
import ProjectCreateForm from '@/src/features/projects/components/ProjectCreateForm';
import { useAuthStore } from '@/src/store/authStore';

// Regression guard: every create form, opened in an AdminModal exactly the way
// the pages and the onboarding open it, must show a button that submits it.
// Onboarding's "Create user" once had none (the modal hid its Save for a wizard
// the form no longer rendered), so a new company could not add its first person.

vi.mock('@/src/api/apiClient', () => {
  const ok = () => Promise.resolve({ data: [] });
  const client = { get: ok, post: ok, put: ok, patch: ok, delete: ok, defaults: { baseURL: 'http://localhost' } };
  return { default: client, apiClient: client };
});

beforeAll(() => {
  useAuthStore.setState({
    user: { _id: 'admin1', role: 'companyAdmin', companyId: 'c1', name: 'Admin' },
  });
});

// A button that submits the given form: the modal's Save (form="<id>") or the
// form's own primary action (a wizard's Next / Create).
function expectSubmitAction(formId) {
  const buttons = screen.getAllByRole('button');
  const submits = buttons.filter(
    (b) => b.getAttribute('form') === formId
      || (b.closest(`#${formId}`) && b.closest('.admin-modal-form__wizard-top')),
  );
  expect(submits.length, `no button submits #${formId}`).toBeGreaterThan(0);
}

const CASES = [
  // Onboarding opens these with guided: true; the list pages without it.
  { name: 'user (onboarding)', formId: 'user-create-form', el: <UserCreateForm onClose={() => {}} guided /> },
  { name: 'user (users page)', formId: 'user-create-form', el: <UserCreateForm onClose={() => {}} /> },
  { name: 'client (create)', formId: 'client-create-form', el: <ClientCreateForm onClose={() => {}} /> },
  { name: 'project (onboarding)', formId: 'project-create-form', el: <ProjectCreateForm onClose={() => {}} guided /> },
  { name: 'project (projects page)', formId: 'project-create-form', el: <ProjectCreateForm onClose={() => {}} /> },
];

describe('create forms in an AdminModal always have a submit action', () => {
  it.each(CASES)('$name', async ({ formId, el }) => {
    render(
      <AdminModal open title="Create" saveForm={formId} onCancel={() => {}}>
        {el}
      </AdminModal>,
    );
    await waitFor(() => expect(document.getElementById(formId)).not.toBeNull());
    expectSubmitAction(formId);
  });
});
