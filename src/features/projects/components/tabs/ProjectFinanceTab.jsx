'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, InputNumber, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useShiftStore } from '@/src/store/shiftStore';
import { formatSek } from '@/src/utils/formatCurrency';
import { useT } from '@/src/i18n/LanguageProvider';

const MS_PER_HOUR = 3600000;
const num = (v) => Number(v) || 0;

function Row({ label, value, tone, onClick }) {
  const valueEl = (
    <strong className={`project-finance__row-v${tone ? ` project-finance__row-v--${tone}` : ''}`}>{value}</strong>
  );
  if (onClick) {
    return (
      <button type="button" className="project-finance__row project-finance__row--link" onClick={onClick}>
        <span className="project-finance__row-k">
          {label}
          <span className="project-finance__row-arrow" aria-hidden="true">›</span>
        </span>
        {valueEl}
      </button>
    );
  }
  return (
    <div className="project-finance__row">
      <span className="project-finance__row-k">{label}</span>
      {valueEl}
    </div>
  );
}

// Deep-dive economy for one project: the two hourly rates (självkostnad /
// debiteras), labour cost vs billed, a full cost breakdown and the result.
export default function ProjectFinanceTab({ project, projectId, onRefresh, onNavigateTab }) {
  const t = useT();
  const { shifts, fetchAllAccessible } = useShiftStore();

  const [invoiced, setInvoiced] = useState(0);
  const [supplier, setSupplier] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [ata, setAta] = useState(0);
  const [perEmployeeLabor, setPerEmployeeLabor] = useState(0);

  const [costRate, setCostRate] = useState(num(project?.costRatePerHour));
  const [billRate, setBillRate] = useState(num(project?.billRatePerHour));
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAllAccessible(); }, [fetchAllAccessible]);

  useEffect(() => {
    setCostRate(num(project?.costRatePerHour));
    setBillRate(num(project?.billRatePerHour));
  }, [project?.costRatePerHour, project?.billRatePerHour]);

  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    apiClient.get(`/supplier-invoices/project/${projectId}/summary`)
      .then(({ data }) => { if (active) setSupplier(num(data?.total)); }).catch(() => {});
    apiClient.get(`/expenses/project/${projectId}/summary`)
      .then(({ data }) => { if (active) setExpenses(num(data?.total)); }).catch(() => {});
    apiClient.get(`/ata/project/${projectId}/summary`)
      .then(({ data }) => { if (active) setAta(num(data?.total)); }).catch(() => {});
    apiClient.get('/hours/labor-cost')
      .then(({ data }) => { if (active) setPerEmployeeLabor(num(data?.byProject?.[projectId])); }).catch(() => {});
    apiClient.get('/invoices').then(({ data }) => {
      if (!active) return;
      const total = (data || [])
        .filter((inv) => {
          const pid = typeof inv.projectId === 'object' ? inv.projectId?._id : inv.projectId;
          return pid && String(pid) === String(projectId) && String(inv.status || '').toLowerCase() !== 'draft';
        })
        .reduce((sum, inv) => sum + num(inv.total), 0);
      setInvoiced(total);
    }).catch(() => {});
    return () => { active = false; };
  }, [projectId]);

  const hours = useMemo(
    () => Math.round((shifts.reduce((sum, sh) => sum + num(sh.durationMs), 0) / MS_PER_HOUR) * 10) / 10,
    [shifts],
  );

  const materials = num(project?.spentMaterialsCost);
  const laborCost = costRate > 0 ? hours * costRate : perEmployeeLabor;
  const laborBilled = billRate > 0 ? hours * billRate : 0;
  const totalCost = materials + supplier + expenses + laborCost;
  const margin = invoiced - totalCost;
  const marginPct = invoiced > 0 ? Math.round((margin / invoiced) * 100) : 0;
  const laborMargin = laborBilled - laborCost;
  const marginPerHour = billRate - costRate;

  const saveRates = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/projects/${projectId}`, {
        costRatePerHour: num(costRate),
        billRatePerHour: num(billRate),
      });
      message.success(t('Rates saved'));
      onRefresh?.();
    } catch (err) {
      message.error(err.response?.data?.message || t('Could not save rates'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="project-finance">
      <div className="project-finance__top">
        <Card className="dashboard-section-card" title={t('Hourly rates')}>
          <div className="project-finance__rates">
            <label className="project-finance__rate project-finance__rate--cost">
              <span>{t('Cost rate / hour')} <em>{t('(självkostnad)')}</em></span>
              <InputNumber min={0} controls={false} value={costRate} onChange={setCostRate} addonAfter="kr" style={{ width: '100%' }} />
            </label>
            <label className="project-finance__rate project-finance__rate--bill">
              <span>{t('Bill rate / hour')} <em>{t('(debiteras)')}</em></span>
              <InputNumber min={0} controls={false} value={billRate} onChange={setBillRate} addonAfter="kr" style={{ width: '100%' }} />
            </label>
          </div>
          <div className="project-finance__ratefoot">
            <span>
              {t('Margin / hour')}: <strong>{formatSek(marginPerHour, { decimals: false })}</strong>
              {billRate > 0 ? ` (${Math.round((marginPerHour / billRate) * 100)}%)` : ''}
            </span>
            <Button type="primary" loading={saving} onClick={saveRates}>{t('Save')}</Button>
          </div>
        </Card>

        <Card className="dashboard-section-card" title={t('Labour')}>
          <Row label={t('Hours worked')} value={`${hours} h`} />
          <Row label={`${t('Cost')} · ${hours} × ${formatSek(costRate, { decimals: false })}`} value={formatSek(laborCost, { decimals: false })} tone="cost" />
          <Row label={`${t('Billed')} · ${hours} × ${formatSek(billRate, { decimals: false })}`} value={formatSek(laborBilled, { decimals: false })} tone="bill" />
          <div className="project-finance__sep" />
          <Row label={t('Labour margin')} value={formatSek(laborMargin, { decimals: false })} tone={laborMargin >= 0 ? 'bill' : 'over'} />
        </Card>
      </div>

      <Card className="dashboard-section-card" title={t('Costs breakdown')}>
        <Row label={t('Materials')} value={formatSek(materials, { decimals: false })} />
        <Row label={t('Purchase invoices')} value={formatSek(supplier, { decimals: false })} />
        <Row
          label={t('Expenses')}
          value={formatSek(expenses, { decimals: false })}
          onClick={onNavigateTab ? () => onNavigateTab('expenses') : undefined}
        />
        <Row label={t('Labour')} value={formatSek(laborCost, { decimals: false })} tone="cost" />
        {ata !== 0 ? (
          <Row
            label={t('ÄTA')}
            value={formatSek(ata, { decimals: false })}
            onClick={onNavigateTab ? () => onNavigateTab('ata') : undefined}
          />
        ) : null}
        <div className="project-finance__sep" />
        <Row label={t('Total cost')} value={formatSek(totalCost, { decimals: false })} tone="cost" />
      </Card>

      <Card className="dashboard-section-card" title={t('Result')}>
        <Row label={t('Invoiced')} value={formatSek(invoiced, { decimals: false })} tone="bill" />
        <Row label={t('Total cost')} value={`− ${formatSek(totalCost, { decimals: false })}`} tone="cost" />
        <div className="project-finance__sep" />
        <Row label={t('Margin')} value={`${formatSek(margin, { decimals: false })} · ${marginPct}%`} tone={margin >= 0 ? 'bill' : 'over'} />
      </Card>
    </div>
  );
}
