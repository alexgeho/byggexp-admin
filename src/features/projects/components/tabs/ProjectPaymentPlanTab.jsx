import { useEffect, useMemo, useState } from 'react';
import { Button, Input, InputNumber, Space, Table, Tag, Empty } from 'antd';
import { DeleteOutlined, FileTextOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from '@/src/shared/routing/routerCompat';
import { usePaymentPlanStore } from '@/src/store/paymentPlanStore';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAmount } from '@/src/utils/formatCurrency';

const emptyRow = () => ({ description: '', percent: 0, amount: 0, plannedDate: '', status: 'planned', invoiceNumber: null });

const effAmount = (row, contract) => {
  const amount = Number(row.amount) || 0;
  if (amount) return amount;
  const percent = Number(row.percent) || 0;
  return percent ? (percent / 100) * (Number(contract) || 0) : 0;
};

// Betalningsplan — à conto milestone billing for one project.
export default function ProjectPaymentPlanTab({ projectId, project }) {
  const { t, lang } = useLanguage();
  const { plans, loading, fetchByProject, create, update, setRowStatus } = usePaymentPlanStore();
  const setDraftPrefill = useInvoiceStore((s) => s.setDraftPrefill);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const plan = plans[0] || null;
  const [contract, setContract] = useState(0);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (projectId) void fetchByProject(projectId);
  }, [projectId, fetchByProject]);

  useEffect(() => {
    if (plan) {
      setContract(Number(plan.contractAmount) || 0);
      setRows((plan.rows || []).map((r) => ({ ...r })));
    }
  }, [plan]);

  const createPlan = async () => {
    await create({
      projectId,
      name: 'Betalningsplan',
      contractAmount: Number(project?.budget) || 0,
      rows: [emptyRow()],
    });
  };

  const setRow = (index, patch) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const save = async () => {
    if (!plan) return;
    await update(getEntityId(plan), { contractAmount: Number(contract) || 0, rows });
  };

  const createInvoiceFromRow = async (index) => {
    if (!plan) return;
    const row = rows[index];
    const amount = effAmount(row, contract);
    // Persist any pending edits before billing so the amount is stable.
    await update(getEntityId(plan), { contractAmount: Number(contract) || 0, rows });
    setDraftPrefill({
      projectId,
      orderReference: plan.name || 'Betalningsplan',
      items: [
        {
          description: row.description || `${plan.name || 'Betalningsplan'} à conto`,
          quantity: 1,
          unit: 'st',
          price: amount,
          vatRate: 25,
        },
      ],
    });
    await setRowStatus(getEntityId(plan), index, 'invoiced');
    const base = pathname.split('/projects/')[0];
    navigate(`${base}/invoicing/invoices/new`);
  };

  const totals = useMemo(() => {
    const planned = rows.reduce((s, r) => s + effAmount(r, contract), 0);
    const invoiced = rows
      .filter((r) => r.status === 'invoiced')
      .reduce((s, r) => s + effAmount(r, contract), 0);
    return { planned, invoiced, remaining: planned - invoiced };
  }, [rows, contract]);

  if (!plan && !loading) {
    return (
      <Empty description={t('No payment plan yet')} style={{ marginTop: 40 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={createPlan}>
          {t('Create payment plan')}
        </Button>
      </Empty>
    );
  }

  const columns = [
    {
      title: t('Milestone'),
      dataIndex: 'description',
      key: 'description',
      render: (v, _r, i) => (
        <Input value={v} placeholder={t('e.g. Stage 1 – foundation')} onChange={(e) => setRow(i, { description: e.target.value })} />
      ),
    },
    {
      title: '%',
      dataIndex: 'percent',
      key: 'percent',
      width: 90,
      render: (v, _r, i) => (
        <InputNumber min={0} max={100} value={v} style={{ width: '100%' }} onChange={(val) => setRow(i, { percent: val || 0 })} />
      ),
    },
    {
      title: `${t('Amount')} (SEK)`,
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (v, _r, i) => (
        <InputNumber
          min={0}
          precision={2}
          value={v}
          style={{ width: '100%' }}
          placeholder={String(Math.round(effAmount(rows[i], contract)))}
          onChange={(val) => setRow(i, { amount: val || 0 })}
        />
      ),
    },
    {
      title: t('Planned date'),
      dataIndex: 'plannedDate',
      key: 'plannedDate',
      width: 150,
      render: (v, _r, i) => (
        <Input type="date" value={v} onChange={(e) => setRow(i, { plannedDate: e.target.value })} />
      ),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v = 'planned') => (
        <Tag color={v === 'invoiced' ? 'success' : 'default'}>
          {(lang === 'sv' ? (v === 'invoiced' ? 'Fakturerad' : 'Planerad') : v).toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_, _r, i) => (
        <Space>
          {rows[i].status !== 'invoiced' ? (
            <Button size="small" icon={<FileTextOutlined />} onClick={() => createInvoiceFromRow(i)}>
              {t('Invoice')}
            </Button>
          ) : null}
          <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeRow(i)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }} align="center">
        <Space align="center">
          <span>{t('Contract value')} (SEK):</span>
          <InputNumber min={0} precision={2} value={contract} style={{ width: 180 }} onChange={(v) => setContract(v || 0)} />
        </Space>
        <Space size="large" wrap>
          <span>{t('Planned')}: <strong>{formatAmount(totals.planned)}</strong></span>
          <span style={{ color: 'var(--muted, #64748b)' }}>{t('Invoiced')}: {formatAmount(totals.invoiced)}</span>
          <span style={{ color: 'var(--muted, #64748b)' }}>{t('Remaining')}: {formatAmount(totals.remaining)}</span>
        </Space>
      </Space>

      <Table
        dataSource={rows.map((r, i) => ({ ...r, key: i }))}
        columns={columns}
        pagination={false}
        size="small"
        loading={loading}
        scroll={{ x: 820 }}
      />

      <Space style={{ marginTop: 16 }}>
        <Button icon={<PlusOutlined />} onClick={addRow}>{t('Add milestone')}</Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={save}>{t('Save')}</Button>
      </Space>

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted, #64748b)' }}>
        {t('Bill each milestone with an à conto invoice; the row is marked invoiced. Enter an amount, or a percent of the contract value.')}
      </p>
    </div>
  );
}
