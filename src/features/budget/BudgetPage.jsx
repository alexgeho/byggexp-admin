'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, InputNumber, Spin } from 'antd';
import { LeftOutlined, RightOutlined, SaveOutlined } from '@ant-design/icons';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { formatMoney } from '@/src/utils/formatCurrency';
import { useEconomyData } from '@/src/features/dashboard/useEconomyData';
import { useBudgetStore } from '@/src/store/budgetStore';
import { monthlyActuals, sumMonths, monthLabels } from '@/src/features/budget/budgetUtils';
import BudgetBars from '@/src/features/budget/BudgetBars';
import './BudgetPage.scss';

const emptyPlan = () => Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
const thisYear = () => new Date().getFullYear();

export default function BudgetPage() {
  const { t, lang } = useLanguage();
  const currency = useCompanyCurrency();
  const money = (v) => formatMoney(v, currency, { decimals: false });

  const { data, loading: econLoading } = useEconomyData();
  const fetchYear = useBudgetStore((s) => s.fetchYear);
  const save = useBudgetStore((s) => s.save);

  const [year, setYear] = useState(() => thisYear());
  const [plan, setPlan] = useState(emptyPlan);
  const [planLoading, setPlanLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPlanLoading(true);
    setDirty(false);
    fetchYear(year).then((months) => setPlan(months)).finally(() => setPlanLoading(false));
  }, [year, fetchYear]);

  const actuals = useMemo(() => monthlyActuals(data, year), [data, year]);
  const labels = useMemo(() => monthLabels(lang), [lang]);

  const planTotal = useMemo(() => sumMonths(plan), [plan]);
  const actualTotal = useMemo(() => sumMonths(actuals), [actuals]);

  const setCell = (i, key, val) => {
    setPlan((prev) => prev.map((m, idx) => (idx === i ? { ...m, [key]: Number(val) || 0 } : m)));
    setDirty(true);
  };

  const onSave = async () => {
    setSaving(true);
    try { await save(year, plan); setDirty(false); } finally { setSaving(false); }
  };

  const loading = econLoading || planLoading;

  const kpis = [
    { key: 'incP', label: t('Income (plan)'), value: planTotal.income, tone: 'in' },
    { key: 'incA', label: t('Income (actual)'), value: actualTotal.income, tone: 'in' },
    { key: 'expP', label: t('Expenses (plan)'), value: planTotal.expense, tone: 'out' },
    { key: 'expA', label: t('Expenses (actual)'), value: actualTotal.expense, tone: 'out' },
    { key: 'res', label: t('Result (actual)'), value: actualTotal.income - actualTotal.expense,
      tone: (actualTotal.income - actualTotal.expense) < 0 ? 'bad' : 'good' },
  ];

  return (
    <div className="budget-page">
      <div className="budget-toolbar">
        <div className="budget-year">
          <Button size="small" icon={<LeftOutlined />} onClick={() => setYear((y) => y - 1)} aria-label={t('Previous year')} />
          <strong>{year}</strong>
          <Button size="small" icon={<RightOutlined />} onClick={() => setYear((y) => y + 1)} aria-label={t('Next year')} />
        </div>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!dirty} onClick={onSave}>
          {t('Save')}
        </Button>
      </div>

      {loading ? (
        <div className="budget-loading"><Spin /></div>
      ) : (
        <>
          <div className="budget-kpis">
            {kpis.map((k) => (
              <div key={k.key} className={`budget-kpi budget-kpi--${k.tone}`}>
                <span className="budget-kpi__label">{k.label}</span>
                <strong className="budget-kpi__value">{money(k.value)}</strong>
              </div>
            ))}
          </div>

          <Card className="dashboard-section-card" title={t('Income vs expenses by month')}>
            <BudgetBars actuals={actuals} plan={plan} labels={labels} money={money} t={t} />
          </Card>

          <Card className="dashboard-section-card budget-table-card" title={t('Monthly budget')}>
            <div className="budget-table-wrap">
              <table className="budget-table">
                <thead>
                  <tr>
                    <th>{t('Month')}</th>
                    <th className="num">{t('Income (plan)')}</th>
                    <th className="num">{t('Income (actual)')}</th>
                    <th className="num">{t('Expenses (plan)')}</th>
                    <th className="num">{t('Expenses (actual)')}</th>
                    <th className="num">{t('Result')}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.map((m, i) => {
                    const a = actuals[i] || { income: 0, expense: 0 };
                    const res = a.income - a.expense;
                    return (
                      <tr key={i}>
                        <td className="budget-month">{labels[i]}</td>
                        <td className="num">
                          <InputNumber size="small" variant="borderless" controls={false} value={m.income}
                            onChange={(v) => setCell(i, 'income', v)} style={{ width: '100%', textAlign: 'right' }}
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(v) => `${v}`.replace(/\s/g, '')} />
                        </td>
                        <td className="num budget-actual">{money(a.income)}</td>
                        <td className="num">
                          <InputNumber size="small" variant="borderless" controls={false} value={m.expense}
                            onChange={(v) => setCell(i, 'expense', v)} style={{ width: '100%', textAlign: 'right' }}
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(v) => `${v}`.replace(/\s/g, '')} />
                        </td>
                        <td className="num budget-actual">{money(a.expense)}</td>
                        <td className={`num budget-result ${res < 0 ? 'neg' : 'pos'}`}>{money(res)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>{t('Total')}</td>
                    <td className="num">{money(planTotal.income)}</td>
                    <td className="num">{money(actualTotal.income)}</td>
                    <td className="num">{money(planTotal.expense)}</td>
                    <td className="num">{money(actualTotal.expense)}</td>
                    <td className={`num budget-result ${(actualTotal.income - actualTotal.expense) < 0 ? 'neg' : 'pos'}`}>
                      {money(actualTotal.income - actualTotal.expense)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
