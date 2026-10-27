'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloudUploadOutlined, DownloadOutlined, MoreOutlined } from '@ant-design/icons';
import {
  Alert, Button, DatePicker, Dropdown, Modal, Space,
} from 'antd';
import AdminTable from '@/src/shared/components/AdminTable';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import StatusTag from '@/src/shared/components/StatusTag';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import { formatMoney } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import PayrollSettingsDrawer, { systemLabel } from './PayrollSettingsDrawer';
import RaiseProposalsDrawer from './RaiseProposalsDrawer';
import AgiModal from './AgiModal';
import { downloadPayrollExport } from './payrollExport';
import { fetchFortnoxStatus, sendPayrollToFortnox } from '@/src/features/fortnox/fortnoxApi';
import {
  defaultSelection, lastMonth, monthRange, summarizeWorker, workedOnProject, workerStatus,
} from './payrollPeopleUtils';

const qty = (value, unit) => (value
  ? `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value)} ${unit}`
  : '');

// Ekonomi → Löner: everyone with hours in the month, one row per person, and
// one export of the ticked people to the payroll system.
export default function PayrollPeoplePage() {
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();
  const { t } = useLanguage();
  const currency = useCompanyCurrency();
  const [month, setMonth] = useState(lastMonth);
  const [projectId, setProjectId] = useState();
  const [basis, setBasis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState([]);
  const [settings, setSettings] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingRaises, setPendingRaises] = useState([]);
  const [raiseId, setRaiseId] = useState(null);
  const [fortnoxConnected, setFortnoxConnected] = useState(false);
  const [sendingFortnox, setSendingFortnox] = useState(false);
  const [agiOpen, setAgiOpen] = useState(false);

  useEffect(() => {
    fetchFortnoxStatus().then((s) => setFortnoxConnected(Boolean(s?.connected)));
  }, []);

  useEffect(() => {
    hideHeaderActions();
    return () => showHeaderActions();
  }, [hideHeaderActions, showHeaderActions]);

  const period = useMemo(() => monthRange(month), [month]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/payroll-basis', { params: period });
      setBasis(res.data);
      setSelected(defaultSelection(res.data?.workers));
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to load the payroll basis'));
      setBasis(null);
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await apiClient.get('/payroll-basis/settings');
      setSettings(res.data);
    } catch {
      setSettings(null);
    }
  }, []);

  const loadRaises = useCallback(async () => {
    try {
      const res = await apiClient.get('/payroll-basis/raises');
      setPendingRaises(res.data || []);
    } catch {
      setPendingRaises([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadSettings(); }, [loadSettings]);
  useEffect(() => { void loadRaises(); }, [loadRaises]);

  const rows = useMemo(() => (basis?.workers || [])
    .filter((w) => workedOnProject(w, projectId))
    .map((w) => ({ ...w, key: w.userId, figures: summarizeWorker(w), status: workerStatus(w) })), [basis, projectId]);

  const visibleSelected = selected.filter((id) => rows.some((r) => r.userId === id));

  const exportSelected = async () => {
    setExporting(true);
    try {
      await downloadPayrollExport({
        ...period, userIds: visibleSelected, settings, t,
      });
      void load();
    } catch {
      appMessage.error(t('Export failed'));
    } finally {
      setExporting(false);
    }
  };

  // Lönerunderlag straight into Fortnox Lön. A period already sent asks
  // before sending again, so nobody is paid twice.
  const sendToFortnox = async (force = false) => {
    setSendingFortnox(true);
    try {
      const res = await sendPayrollToFortnox({ ...period, userIds: visibleSelected, force });
      const left = [...new Set([...(res.failed || []), ...(res.skipped || [])].map((r) => r.name || r.employeeId))];
      if (left.length) appMessage.warning(`${t('Sent to Fortnox, but some rows were left out')}: ${left.join(', ')}`);
      else appMessage.success(t('Sent to Fortnox'));
      void load();
    } catch (err) {
      if (err.response?.status === 409 && !force) {
        Modal.confirm({
          title: t('Already sent to Fortnox. Send again?'),
          okText: t('Send'),
          cancelText: t('Cancel'),
          onOk: () => sendToFortnox(true),
        });
      } else {
        appMessage.error(err.response?.data?.message || t('Could not send to Fortnox'));
      }
    } finally {
      setSendingFortnox(false);
    }
  };

  const itemLabel = (code) => settings?.salaryItems?.[code] || settings?.absenceItems?.[code] || code;
  const missingIds = (basis?.workers || []).filter((w) => !w.payrollEmployeeId).map((w) => w.name);
  const problems = [
    basis && !basis.ruleSets?.length ? t('No published agreement version covers this period') : null,
    basis?.unmappedCodes?.length ? `${t('No löneart')}: ${basis.unmappedCodes.map(itemLabel).join(', ')}` : null,
    missingIds.length ? `${t('No employee number')}: ${missingIds.join(', ')}` : null,
  ].filter(Boolean);

  const columns = [
    { title: t('Worker'), dataIndex: 'name', key: 'name', width: 200 },
    { title: t('Normal'), key: 'normal', align: 'right', render: (_, r) => qty(r.figures.normal, 'h') },
    { title: t('Overtime'), key: 'overtime', align: 'right', render: (_, r) => qty(r.figures.overtime, 'h') },
    { title: 'OB', key: 'ob', align: 'right', render: (_, r) => qty(r.figures.ob, 'h') },
    { title: t('Travel time'), key: 'travel', align: 'right', render: (_, r) => qty(r.figures.travel, 'h') },
    { title: t('Car'), key: 'km', align: 'right', render: (_, r) => qty(r.figures.km, 'km') },
    { title: t('Per diem'), key: 'perDiem', align: 'right', width: 130, render: (_, r) => qty(r.figures.perDiemDays, t(r.figures.perDiemDays === 1 ? 'day' : 'days')) },
    { title: t('Absence'), key: 'absence', align: 'right', render: (_, r) => qty(r.figures.absence, 'h') },
    { title: t('Amount'), key: 'amount', align: 'right', width: 150, render: (_, r) => (r.figures.amount ? formatMoney(r.figures.amount, currency) : '') },
    {
      title: t('Status'),
      key: 'status',
      width: 190,
      render: (_, r) => (
        <span title={r.exportedAt ? formatAdminDate(r.exportedAt) : undefined}>
          <StatusTag status={r.status} />
        </span>
      ),
    },
  ];

  const menuItems = [
    { key: 'settings', label: t('Payroll system & codes'), onClick: () => setSettingsOpen(true) },
    { key: 'runs', label: t('Payroll runs'), onClick: () => navigate('runs') },
    { key: 'agi', label: t('Employer declaration'), onClick: () => setAgiOpen(true) },
  ];

  return (
    <div>
      {pendingRaises.map((raise) => (
        <Alert
          key={raise.ruleSetId}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${t('Agreement wage raise from')} ${formatAdminDate(raise.validFrom)}`}
          action={<Button size="small" type="primary" onClick={() => setRaiseId(raise.ruleSetId)}>{t('Review raise')}</Button>}
        />
      ))}
      {problems.length ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={problems.join(' · ')}
          action={basis?.unmappedCodes?.length
            ? <Button size="small" onClick={() => setSettingsOpen(true)}>{t('Set codes')}</Button>
            : null}
        />
      ) : null}

      <AdminTable
        dataSource={rows}
        columns={columns}
        rowKey="userId"
        loading={loading}
        pagination={false}
        scroll={{ x: 1180 }}
        onRowClick={(r) => navigate(`person/${r.userId}?month=${month.format('YYYY-MM')}`)}
        rowSelection={{
          selectedRowKeys: visibleSelected,
          onChange: (keys) => setSelected(keys),
        }}
        projectFilter={<ProjectFilterSelect value={projectId} onChange={setProjectId} />}
        toolbarStart={(
          <DatePicker
            picker="month"
            size="large"
            style={{ width: 180 }}
            value={month}
            allowClear={false}
            format="MMMM YYYY"
            onChange={(v) => v && setMonth(v.startOf('month'))}
          />
        )}
        toolbarEnd={(
          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={exportSelected}
              loading={exporting}
              disabled={!visibleSelected.length}
            >
              {`${t('Export to')} ${systemLabel(settings?.payrollSystem, t)} (${visibleSelected.length})`}
            </Button>
            {fortnoxConnected ? (
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                onClick={() => sendToFortnox()}
                loading={sendingFortnox}
                disabled={!visibleSelected.length}
              >
                {`${t('Send to Fortnox Lön')} (${visibleSelected.length})`}
              </Button>
            ) : null}
            <Dropdown trigger={['click']} menu={{ items: menuItems }}>
              <Button size="large" icon={<MoreOutlined />} aria-label={t('More')} />
            </Dropdown>
          </Space>
        )}
        emptyState={{
          title: t('No hours this month'),
          actionLabel: t('Open shifts'),
          onAction: () => navigate('/company/shifts'),
        }}
      />

      <AgiModal open={agiOpen} onClose={() => setAgiOpen(false)} />

      <PayrollSettingsDrawer
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSaved={(next) => {
          setSettings(next);
          setSettingsOpen(false);
          void load();
        }}
      />

      <RaiseProposalsDrawer
        ruleSetId={raiseId}
        open={!!raiseId}
        onClose={() => setRaiseId(null)}
        onApplied={() => {
          setRaiseId(null);
          void loadRaises();
          void load();
        }}
      />
    </div>
  );
}
