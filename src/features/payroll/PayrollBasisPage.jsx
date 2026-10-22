'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  Space,
  Spin,
  Switch,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { useLocation, useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import { formatAmount, formatMoney } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';

const CATEGORY_LABELS = {
  yrkesarbetare: 'Skilled worker',
  ny_i_branschen: 'New in the industry',
  larling: 'Apprentice',
  other: 'Not covered by the agreement',
};

const ISO = 'YYYY-MM-DD';

// Default period: last full calendar month — what a monthly lönekörning pays.
const lastMonth = () => {
  const start = dayjs().subtract(1, 'month').startOf('month');
  return [start, start.endOf('month')];
};

// Collapses a worker's dated items into one row per code for the summary.
const groupItems = (items) => {
  const byCode = new Map();
  items.forEach((item) => {
    const row = byCode.get(item.code) || { ...item, quantity: 0, amount: 0, days: 0 };
    row.quantity += item.unit === 'sek' ? 0 : item.quantity;
    row.amount += item.amount;
    row.days += 1;
    byCode.set(item.code, row);
  });
  return [...byCode.values()];
};

export default function PayrollBasisPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();
  const { t } = useLanguage();
  const currency = useCompanyCurrency();
  const [range, setRange] = useState(lastMonth);
  const [basis, setBasis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    hideHeaderActions();
    return () => showHeaderActions();
  }, [hideHeaderActions, showHeaderActions]);

  const params = useMemo(() => ({
    from: range[0].format(ISO),
    to: range[1].format(ISO),
  }), [range]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/payroll-basis', { params });
      setBasis(res.data);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to load the payroll basis'));
      setBasis(null);
    } finally {
      setLoading(false);
    }
  }, [params, t]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await apiClient.get('/payroll-basis/settings');
      setSettings(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const openSettings = async () => {
    const data = settings || await loadSettings();
    if (!data) return;
    form.setFieldsValue({
      salaryCodes: data.salaryCodes,
      absenceCodes: data.absenceCodes,
      onlyApprovedShifts: data.onlyApprovedShifts,
    });
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    const values = await form.validateFields();
    setSavingSettings(true);
    try {
      const res = await apiClient.put('/payroll-basis/settings', values);
      setSettings(res.data);
      setSettingsOpen(false);
      appMessage.success(t('Fortnox codes saved'));
      void load();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to save'));
    } finally {
      setSavingSettings(false);
    }
  };

  const exportPaxml = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get('/payroll-basis/paxml', { params, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lonerunderlag-${params.from}-${params.to}.xml`;
      a.click();
      URL.revokeObjectURL(url);

      let skipped = [];
      try {
        skipped = JSON.parse(decodeURIComponent(res.headers['x-paxml-skipped'] || '%5B%5D'));
      } catch {
        skipped = [];
      }
      if (skipped.length) {
        const people = [...new Set(skipped.map((s) => s.name))].join(', ');
        appMessage.warning(`${t('Exported, but some rows were left out')}: ${people}`);
      } else {
        appMessage.success(t('PAXml file downloaded — import it in Fortnox Lön'));
      }
    } catch {
      appMessage.error(t('Export failed'));
    } finally {
      setExporting(false);
    }
  };

  const itemLabel = useCallback((code) => (
    settings?.salaryItems?.[code] || settings?.absenceItems?.[code] || code
  ), [settings]);

  const workers = basis?.workers || [];
  const total = (key) => workers.reduce((s, w) => s + (Number(w.totals?.[key]) || 0), 0);

  const columns = [
    { title: t('Worker'), dataIndex: 'name', key: 'name', render: (v) => v || '—' },
    {
      title: t('Wage category'),
      dataIndex: 'wageCategory',
      key: 'wageCategory',
      render: (v) => (v ? t(CATEGORY_LABELS[v] || v) : '—'),
    },
    {
      title: t('Fortnox no.'),
      dataIndex: 'fortnoxEmployeeId',
      key: 'fortnoxEmployeeId',
      render: (v) => v || '—',
    },
    {
      title: t('Hourly rate'), dataIndex: 'hourlyRate', key: 'hourlyRate', align: 'right', render: (v) => formatAmount(v),
    },
    {
      title: t('Worked h'), key: 'worked', align: 'right', render: (_, r) => formatAmount(r.totals.workedHours),
    },
    {
      title: t('Absence h'), key: 'absence', align: 'right', render: (_, r) => formatAmount(r.totals.absenceHours),
    },
    {
      title: t('Taxable'), key: 'taxable', align: 'right', render: (_, r) => formatAmount(r.totals.taxableAmount),
    },
    {
      title: t('Tax-free'), key: 'taxfree', align: 'right', render: (_, r) => formatAmount(r.totals.taxFreeAmount),
    },
    {
      title: t('Check'),
      key: 'warnings',
      render: (_, r) => (r.warnings.length
        ? <Tag color="orange">{`${r.warnings.length} ${t('to check')}`}</Tag>
        : <Tag>{t('OK')}</Tag>),
    },
  ];

  const itemColumns = [
    { title: t('Item'), dataIndex: 'code', key: 'code', render: (code) => itemLabel(code) },
    {
      title: t('Quantity'),
      key: 'quantity',
      align: 'right',
      render: (_, r) => {
        if (r.unit === 'sek') return `${formatAmount(r.quantity)} %`;
        const unit = { h: 'h', km: 'km', day: t('days') }[r.unit] || '';
        return `${formatAmount(r.unit === 'day' ? r.days : r.quantity)} ${unit}`;
      },
    },
    {
      title: t('Amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v, r) => (r.kind === 'absence' ? '—' : formatMoney(v, currency)),
    },
    {
      title: '',
      key: 'flags',
      render: (_, r) => (
        <Space size={4}>
          {r.taxFree ? <Tag>{t('Tax-free')}</Tag> : null}
          {basis?.unmappedCodes?.includes(r.code) ? <Tag color="orange">{t('No Fortnox code')}</Tag> : null}
        </Space>
      ),
    },
  ];

  const goBack = () => navigate(pathname.replace(/\/[^/]+$/, ''));

  return (
    <div className="invoice-create-page">
      <Space className="invoice-create-page__toolbar" align="center" wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={goBack}>{t('Back to payroll')}</Button>
        <DatePicker.RangePicker
          value={range}
          allowClear={false}
          onChange={(v) => v && setRange(v)}
          format="YYYY-MM-DD"
        />
        <Button icon={<SettingOutlined />} onClick={openSettings}>{t('Fortnox codes')}</Button>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={exportPaxml}
          loading={exporting}
          disabled={!workers.length}
        >
          {t('Export to Fortnox (PAXml)')}
        </Button>
      </Space>

      <Card className="invoice-create-page__card" title={t('Payroll basis (Byggavtalet)')}>
        {loading && !basis ? <Spin /> : null}

        {basis && !basis.ruleSets.length ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={t('No published agreement version covers this period')}
            description={t('Only base pay is calculated. Supplements, travel, per diem and vacation pay need a published Byggavtalet version.')}
          />
        ) : null}

        {basis?.unmappedCodes?.length ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={t('Some items have no Fortnox code and will be left out of the export')}
            description={basis.unmappedCodes.map(itemLabel).join(', ')}
            action={<Button size="small" onClick={openSettings}>{t('Set codes')}</Button>}
          />
        ) : null}

        {basis?.ruleSets?.length ? (
          <p style={{ marginTop: 0, color: 'var(--muted, #64748b)' }}>
            {`${t('Agreement rules')}: `}
            {basis.ruleSets.map((r) => `${r.name} (${formatAdminDate(r.validFrom)} – ${r.validTo ? formatAdminDate(r.validTo) : '…'})`).join(', ')}
            {settings && !settings.onlyApprovedShifts ? ` · ${t('Includes shifts not yet attested')}` : ''}
          </p>
        ) : null}

        <Table
          dataSource={workers.map((w) => ({ ...w, key: w.userId }))}
          columns={columns}
          loading={loading}
          pagination={false}
          scroll={{ x: 960 }}
          expandable={{
            expandedRowRender: (w) => (
              <div>
                {w.warnings.map((warning, i) => (
                  <Alert
                    key={`${warning.code}-${warning.date || i}`}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 8 }}
                    message={warning.date ? `${formatAdminDate(warning.date)}: ${warning.message}` : warning.message}
                  />
                ))}
                <Table
                  size="small"
                  dataSource={groupItems(w.items).map((r) => ({ ...r, key: r.code }))}
                  columns={itemColumns}
                  pagination={false}
                />
              </div>
            ),
          }}
          summary={() => (workers.length ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}><strong>{t('Total')}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><strong>{formatAmount(total('workedHours'))}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><strong>{formatAmount(total('absenceHours'))}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right"><strong>{formatAmount(total('taxableAmount'))}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right"><strong>{formatAmount(total('taxFreeAmount'))}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={9} />
            </Table.Summary.Row>
          ) : null)}
        />
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--muted, #64748b)' }}>
          {t('Tax, sick pay and karens are calculated by Fortnox Lön from the imported rows.')}
        </p>
      </Card>

      <Drawer
        title={t('Fortnox codes')}
        open={settingsOpen}
        width={560}
        onClose={() => setSettingsOpen(false)}
        destroyOnHidden
        extra={<Button type="primary" onClick={saveSettings} loading={savingSettings}>{t('Save')}</Button>}
      >
        <Form form={form} layout="horizontal" labelCol={{ span: 14 }} wrapperCol={{ span: 10 }}>
          <p style={{ marginTop: 0, color: 'var(--muted, #64748b)' }}>
            {t('Enter the löneart number each item has in your Fortnox Lön. Items without a number are not exported.')}
          </p>
          {Object.entries(settings?.salaryItems || {}).map(([code, label]) => (
            <Form.Item key={code} name={['salaryCodes', code]} label={label} style={{ marginBottom: 8 }}>
              <Input placeholder={t('Löneart')} />
            </Form.Item>
          ))}
          <h4>{t('Absence codes')}</h4>
          {Object.entries(settings?.absenceItems || {}).map(([code, label]) => (
            <Form.Item key={code} name={['absenceCodes', code]} label={label} style={{ marginBottom: 8 }}>
              <Input placeholder="SJK" />
            </Form.Item>
          ))}
          <Form.Item
            name="onlyApprovedShifts"
            label={t('Only attested shifts')}
            valuePropName="checked"
            style={{ marginTop: 16 }}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
