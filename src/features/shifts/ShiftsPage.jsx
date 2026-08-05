import { useEffect, useState } from 'react';
import { Tabs } from 'antd';
import ShiftListPage from '@/src/features/shifts/ShiftListPage';
import HoursPage from '@/src/features/shifts/HoursPage';
import ManualHoursModal from '@/src/features/shifts/ManualHoursModal';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import { useShiftStore } from '@/src/store/shiftStore';
import { useT } from '@/src/i18n/LanguageProvider';

// Container for the Shifts section: the raw shift log and the aggregated Hours grid.
export default function ShiftsPage() {
  const [tab, setTab] = useState('hours');
  const [manualOpen, setManualOpen] = useState(false);
  const t = useT();
  const outletContext = useOutletContext();
  const fetchAllAccessible = useShiftStore((state) => state.fetchAllAccessible);
  // Depend on the STABLE action callbacks, not the whole context object: the
  // context value is recreated whenever an add-button is (un)registered, so
  // keying the effect on `outletContext` re-fires it and loops setState forever
  // (which freezes client-side navigation).
  const showHeaderActions = outletContext?.showHeaderActions;
  const registerAddButton = outletContext?.registerAddButton;
  const unregisterAddButton = outletContext?.unregisterAddButton;

  // A header "+ Add manual hours" button, on both tabs, for logging a worker's
  // hours by hand when there was no clock-in on the app.
  useEffect(() => {
    showHeaderActions?.();
    registerAddButton?.(() => setManualOpen(true), 'Add manual hours');
    return () => unregisterAddButton?.();
  }, [showHeaderActions, registerAddButton, unregisterAddButton]);

  return (
    <div className="shifts-page">
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'hours', label: t('Hours') },
          { key: 'log', label: t('Shift log') },
        ]}
      />
      {tab === 'log' ? <ShiftListPage /> : <HoursPage />}

      <ManualHoursModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSaved={() => fetchAllAccessible()}
      />
    </div>
  );
}
