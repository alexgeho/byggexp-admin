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

  // A header "+ Add manual hours" button, on both tabs, for logging a worker's
  // hours by hand when there was no clock-in on the app.
  useEffect(() => {
    outletContext?.showHeaderActions?.();
    outletContext?.registerAddButton?.(() => setManualOpen(true), 'Add manual hours');
    return () => outletContext?.unregisterAddButton?.();
  }, [outletContext]);

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
