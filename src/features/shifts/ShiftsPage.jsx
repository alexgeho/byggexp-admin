import { useCallback, useEffect, useState } from 'react';
import { Dropdown, Tabs } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import ShiftListPage from '@/src/features/shifts/ShiftListPage';
import HoursPage from '@/src/features/shifts/HoursPage';
import ManualHoursModal from '@/src/features/shifts/ManualHoursModal';
import GridWorkspaceHeader from '@/src/shared/components/GridWorkspaceHeader';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import { useShiftStore } from '@/src/store/shiftStore';
import { useT } from '@/src/i18n/LanguageProvider';

// Container for the Shifts section: the raw shift log and the aggregated Hours grid.
export default function ShiftsPage() {
  const [tab, setTab] = useState('hours');
  const [manualOpen, setManualOpen] = useState(false);
  // Export CSV lives inside HoursPage but is rendered on the tab-bar row; the
  // grid registers its handler up here so the button can sit next to the tabs.
  const [exportFn, setExportFn] = useState(null);
  const registerExport = useCallback((fn) => setExportFn(() => fn), []);
  const t = useT();
  const outletContext = useOutletContext();
  const fetchAllAccessible = useShiftStore((state) => state.fetchAllAccessible);
  // Depend on the STABLE action callback, not the whole context object: the
  // context value is recreated whenever an add-button is (un)registered, so
  // keying the effect on `outletContext` re-fires it and loops setState forever
  // (which freezes client-side navigation).
  const showHeaderActions = outletContext?.showHeaderActions;

  useEffect(() => {
    showHeaderActions?.();
  }, [showHeaderActions]);

  return (
    <div className="shifts-page">
      <GridWorkspaceHeader
        className="shifts-page__header"
        reserveRows={tab === 'log'}
        tabs={(
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              { key: 'hours', label: t('Hours') },
              { key: 'log', label: t('Shift log') },
            ]}
            tabBarExtraContent={{
              right: tab === 'hours' && exportFn ? (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    onClick: ({ key }) => exportFn(key),
                    items: [
                      { key: 'xlsx', label: t('Excel (.xlsx)') },
                      { key: 'pdf', label: t('PDF') },
                      { key: 'csv', label: t('CSV') },
                    ],
                  }}
                >
                  <span>
                    <Button variant="secondary">{t('Export')} <DownOutlined style={{ fontSize: 10 }} /></Button>
                  </span>
                </Dropdown>
              ) : null,
            }}
          />
        )}
      />
      {tab === 'log' ? <ShiftListPage /> : <HoursPage onRegisterExport={registerExport} />}

      <ManualHoursModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSaved={() => fetchAllAccessible()}
      />
    </div>
  );
}
