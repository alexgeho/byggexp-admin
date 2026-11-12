import { useCallback, useEffect, useState } from 'react';
import { Dropdown, Tabs } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import ShiftListPage from '@/src/features/shifts/ShiftListPage';
import HoursPage from '@/src/features/shifts/HoursPage';
import GridWorkspaceHeader from '@/src/shared/components/GridWorkspaceHeader';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import { useT } from '@/src/i18n/LanguageProvider';

// Container for the Shifts section: the raw shift log and the aggregated Hours grid.
export default function ShiftsPage() {
  const [tab, setTab] = useState('hours');
  // Export CSV lives inside HoursPage but is rendered on the tab-bar row; the
  // grid registers its handler up here so the button can sit next to the tabs.
  const [exportFn, setExportFn] = useState(null);
  const registerExport = useCallback((fn) => setExportFn(() => fn), []);
  const t = useT();
  const outletContext = useOutletContext();
  // Depend on the STABLE action callback, not the whole context object: the
  // context value is recreated whenever an add-button is (un)registered, so
  // keying the effect on `outletContext` re-fires it and loops setState forever
  // (which freezes client-side navigation).
  const showHeaderActions = outletContext?.showHeaderActions;

  useEffect(() => {
    showHeaderActions?.();
  }, [showHeaderActions]);

  // Tabs + Export sit at the right end of the "Hours by" row, like Planering (owner 12.11).
  const exportNode = tab === 'hours' && exportFn ? (
    <Dropdown
      trigger={['click']}
      menu={{
        onClick: ({ key }) => exportFn(key),
        items: [
          { key: 'xlsx', label: t('Excel (.xlsx)') },
          { key: 'xlsx-employee', label: t('Excel per employee (all projects)') },
          { key: 'pdf', label: t('PDF') },
          { key: 'csv', label: t('CSV') },
        ],
      }}
    >
      <span>
        <Button variant="secondary">{t('Export')} <DownOutlined style={{ fontSize: 10 }} /></Button>
      </span>
    </Dropdown>
  ) : null;
  const tabsNode = (
    <Tabs
      className="gwh-row-tabs"
      activeKey={tab}
      onChange={setTab}
      items={[
        { key: 'hours', label: t('Hours') },
        { key: 'log', label: t('Shift log') },
      ]}
    />
  );

  return (
    <div className="shifts-page">
      {tab === 'log' ? (
        <>
          <GridWorkspaceHeader
            className="shifts-page__header"
            toggleRow={(
              <>
                <span className="grid-workspace-header__spacer" />
                {tabsNode}
              </>
            )}
          />
          <ShiftListPage />
        </>
      ) : (
        <HoursPage onRegisterExport={registerExport} headerExtra={<>{exportNode}{tabsNode}</>} />
      )}
    </div>
  );
}
