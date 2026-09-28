import { createContext, useContext, useLayoutEffect } from 'react';

// Who draws a modal's primary action. AdminModal always shows its own
// Cancel/Save row UNLESS a component inside it that actually renders its own
// action buttons (e.g. WizardStepBar with its Next button) claims them via
// useOwnModalActions(). The claim lives in the component that draws the buttons,
// never in the parent — so if a form stops rendering its own buttons, the claim
// goes away with them and the modal's Save reappears. A parent can no longer
// hide the actions on a child's behalf and leave a form with no way to submit
// (that is how "Create user" in onboarding ended up with no button at all).
export const ModalActionsContext = createContext(null);

// Call from a component that renders the modal's primary action itself. While
// it is mounted inside an AdminModal, the modal hides its built-in actions.
// Outside an AdminModal it is a no-op.
export function useOwnModalActions() {
  const ctx = useContext(ModalActionsContext);
  // Layout effect so the built-in row is gone before the first paint (no
  // flash of duplicate buttons).
  useLayoutEffect(() => (ctx ? ctx.claim() : undefined), [ctx]);
}
