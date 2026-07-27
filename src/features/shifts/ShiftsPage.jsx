import { useState } from 'react';
import { Tabs } from 'antd';
import ShiftListPage from '@/src/features/shifts/ShiftListPage';
import HoursPage from '@/src/features/shifts/HoursPage';

// Container for the Shifts section: the raw shift log and the aggregated Hours grid.
export default function ShiftsPage() {
  const [tab, setTab] = useState('hours');

  return (
    <div className="shifts-page">
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'hours', label: 'Hours' },
          { key: 'log', label: 'Shift log' },
        ]}
      />
      {tab === 'log' ? <ShiftListPage /> : <HoursPage />}
    </div>
  );
}
