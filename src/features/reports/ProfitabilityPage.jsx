'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Empty, Spin, Table, Tag } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatSek } from '@/src/utils/formatCurrency';
import { getProjectStatusColor, getProjectStatusLabel } from '@/src/utils/projectStatus';

const UNASSIGNED = '__unassigned__';
const pid = (value) => (value && typeof value === 'object' ? (value._id || value.id) : value);
const invoiceValue = (invoice) => invoice.roundedTotal ?? invoice.total;

const money = (value) => formatSek(value, { decimals: false });
const marginColor = (value) => (value < 0 ? '#e5484d' : '#16a35f');

// Where the company earns or loses: revenue (invoiced) minus costs (supplier
// invoices + approved expenses) per project. Aggregated from the same list
// endpoints as the dashboard economy rollup so the numbers reconcile.
export default function ProfitabilityPage() {
  const { t } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [supplier, setSupplier] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [labor, setLabor] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const projectsUrl = user?.role === 'superadmin' ? '/projects' : '/projects/my';

    Promise.all([
      apiClient.get(projectsUrl).then((r) => r.data).catch(() => []),
      apiClient.get('/invoices').then((r) => r.data).catch(() => []),
      apiClient.get('/supplier-invoices').then((r) => r.data).catch(() => []),
      apiClient.get('/expenses').then((r) => r.data).catch(() => []),
      apiClient.get('/hours/labor-cost').then((r) => r.data).catch(() => ({ byProject: {} })),
    ]).then(([p, i, s, e, l]) => {
      if (!active) return;
      setProjects(Array.isArray(p) ? p : []);
      setInvoices(Array.isArray(i) ? i : []);
      setSupplier(Array.isArray(s) ? s : []);
      setExpenses(Array.isArray(e) ? e : []);
      setLabor(l?.byProject || {});
      setLoading(false);
    });

    return () => { active = false; };
  }, [user?.role]);

  const rows = useMemo(() => {
    const map = new Map();
    const ensure = (id, project) => {
      if (!map.has(id)) {
        map.set(id, {
          key: id,
          name: project?.name || t('Unassigned'),
          status: project?.status || null,
          invoiced: 0,
          material: 0,
        });
      }
      return map.get(id);
    };

    projects.forEach((project) => ensure(getEntityId(project), project));
    const bucketFor = (rawId) => {
      const id = pid(rawId);
      return (id && map.get(id)) || ensure(UNASSIGNED, null);
    };

    invoices.forEach((invoice) => {
      if (!['sent', 'paid', 'overdue'].includes(invoice.status)) return;
      bucketFor(invoice.projectId).invoiced += Number(invoiceValue(invoice)) || 0;
    });
    supplier.forEach((invoice) => {
      bucketFor(invoice.projectId).material += Number(invoice.total) || 0;
    });
    expenses.forEach((expense) => {
      if (!['approved', 'reimbursed'].includes(expense.status)) return;
      bucketFor(expense.projectId).material += Number(expense.amount) || 0;
    });

    return [...map.values()]
      .map((row) => {
        const laborCost = Number(labor[row.key]) || 0;
        const cost = row.material + laborCost;
        const margin = row.invoiced - cost;
        return {
          ...row,
          labor: laborCost,
          cost,
          margin,
          marginPct: row.invoiced > 0 ? Math.round((margin / row.invoiced) * 100) : null,
        };
      })
      .filter((row) => row.invoiced !== 0 || row.cost !== 0)
      .sort((a, b) => b.margin - a.margin);
  }, [projects, invoices, supplier, expenses, labor, t]);

  const totals = useMemo(() => {
    const invoiced = rows.reduce((sum, row) => sum + row.invoiced, 0);
    const material = rows.reduce((sum, row) => sum + row.material, 0);
    const laborTotal = rows.reduce((sum, row) => sum + row.labor, 0);
    const cost = material + laborTotal;
    return { invoiced, material, labor: laborTotal, cost, margin: invoiced - cost };
  }, [rows]);

  const columns = [
    {
      title: t('Project'),
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <div className="approvals-cell">
          <span className="approvals-cell__primary">{name}</span>
          {row.status ? (
            <span>
              <Tag color={getProjectStatusColor(row.status)}>
                {t(getProjectStatusLabel(row.status))}
              </Tag>
            </span>
          ) : null}
        </div>
      ),
    },
    {
      title: t('Invoiced'),
      dataIndex: 'invoiced',
      key: 'invoiced',
      align: 'right',
      sorter: (a, b) => a.invoiced - b.invoiced,
      render: money,
    },
    {
      title: t('Material'),
      dataIndex: 'material',
      key: 'material',
      align: 'right',
      sorter: (a, b) => a.material - b.material,
      render: money,
    },
    {
      title: t('Labor'),
      dataIndex: 'labor',
      key: 'labor',
      align: 'right',
      sorter: (a, b) => a.labor - b.labor,
      render: money,
    },
    {
      title: t('Margin'),
      dataIndex: 'margin',
      key: 'margin',
      align: 'right',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.margin - b.margin,
      render: (value) => (
        <strong style={{ color: marginColor(value) }}>{money(value)}</strong>
      ),
    },
    {
      title: t('Margin %'),
      dataIndex: 'marginPct',
      key: 'marginPct',
      align: 'right',
      sorter: (a, b) => (a.marginPct ?? -Infinity) - (b.marginPct ?? -Infinity),
      render: (value) => (value == null ? '—' : (
        <span style={{ color: marginColor(value) }}>{`${value}%`}</span>
      )),
    },
  ];

  const kpis = [
    { key: 'invoiced', label: t('Invoiced'), value: money(totals.invoiced), tone: 'default' },
    { key: 'costs', label: t('Costs'), value: money(totals.cost), tone: 'default' },
    {
      key: 'margin',
      label: t('Margin'),
      value: money(totals.margin),
      tone: totals.margin < 0 ? 'bad' : 'good',
    },
  ];

  return (
    <Card className="dashboard-section-card" title={t('Profitability by project')}>
      {loading ? (
        <div className="dashboard-economy__loading"><Spin /></div>
      ) : (
        <>
          <div className="dashboard-economy__grid profitability__kpis">
            {kpis.map((kpi) => (
              <div key={kpi.key} className="dashboard-economy__tile">
                <span className="dashboard-economy__label">{kpi.label}</span>
                <strong className={`dashboard-economy__value dashboard-economy__value--${kpi.tone}`}>
                  {kpi.value}
                </strong>
              </div>
            ))}
          </div>

          <Table
            className="dashboard-overview__table"
            columns={columns}
            dataSource={rows}
            rowKey="key"
            pagination={false}
            scroll={{ x: 720 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('No financial data yet')} /> }}
            summary={() => (rows.length ? (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><strong>{t('Total')}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><strong>{money(totals.invoiced)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><strong>{money(totals.material)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right"><strong>{money(totals.labor)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <strong style={{ color: marginColor(totals.margin) }}>{money(totals.margin)}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <strong style={{ color: marginColor(totals.margin) }}>
                      {totals.invoiced > 0 ? `${Math.round((totals.margin / totals.invoiced) * 100)}%` : '—'}
                    </strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null)}
          />
        </>
      )}
    </Card>
  );
}
