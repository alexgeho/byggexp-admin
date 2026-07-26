import { useState } from 'react';
import { Tabs } from 'antd';
import ShiftListPage from '@/src/features/shifts/ShiftListPage';
import HoursPage from '@/src/features/shifts/HoursPage';

// Container for the Shifts section: the raw shift log and the aggregated Hours grid.
export default function ShiftsPage() {
  const [tab, setTab] = useState('log');

  return (
    <div className="shifts-page">
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'log', label: 'Shift log' },
          { key: 'hours', label: 'Hours' },
        ]}
      />
      {tab === 'log' ? <ShiftListPage /> : <HoursPage />}
    </div>
  );
}
