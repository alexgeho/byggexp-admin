import { Button, Segmented } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import { useOwnModalActions } from '@/src/shared/components/modalActions';

// Top row of a create wizard inside an AdminModal: the step tabs plus the
// primary action (Next / Create). Pinned to the top of the modal body so the
// action is always visible; going back is via an earlier step tab. Because it
// draws the primary action, it claims the modal's actions — the modal hides its
// own Cancel/Save only while this bar is actually on screen.
//
// Stable htmlType="button" so advancing a step can't auto-submit the form.
export default function WizardStepBar({
  steps, step, onStepBack, primaryLabel, loading = false, onPrimary,
}) {
  const t = useT();
  useOwnModalActions();

  return (
    <div className="admin-modal-form__wizard-top">
      <Segmented
        className="admin-modal-form__steps"
        size="sm"
        value={step}
        onChange={(next) => {
          if (next < step) onStepBack(next);
        }}
        options={steps.map((s, i) => ({ value: i, label: `${i + 1}. ${t(s.label)}` }))}
      />
      <Button variant="primary" htmlType="button" loading={loading} onClick={onPrimary}>
        {primaryLabel}
      </Button>
    </div>
  );
}
