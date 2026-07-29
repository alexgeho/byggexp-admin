'use client';

import { useEffect, useMemo, useState } from 'react';
import { Select, Spin, Switch, Tag, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { MODULE_GROUPS, MODULE_LABELS } from '@/src/shared/config/modules';
import './CompanyModulesModal.scss';

// Shared module-visibility editor. Used by the superadmin modal (full control)
// and the companyAdmin settings page (restricted: hide/show within the plan
// only — out-of-plan modules are locked).
export default function CompanyModulesPanel({ companyId, restricted = false, onSaved }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(null);
  const [planModules, setPlanModules] = useState([]);
  const [planSaving, setPlanSaving] = useState(false);
  const [state, setState] = useState({});

  // Turn an API module resolution into the switch state + plan metadata.
  const applyResolution = (data) => {
    const enabled = new Set(data?.enabled || []);
    const next = {};
    for (const group of MODULE_GROUPS) {
      for (const key of group.keys) next[key] = enabled.has(key);
    }
    setState(next);
    setPlan(data?.plan ?? null);
    setPlanModules(data?.planModules || []);
  };

  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    setLoading(true);
    apiClient
      .get(`/company/${companyId}/modules`)
      .then(({ data }) => {
        if (alive) applyResolution(data);
      })
      .catch(() => appMessage.error(t('Could not load modules')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [companyId, t]);

  const planSet = useMemo(() => new Set(planModules), [planModules]);

  const changePlan = async (value) => {
    setPlanSaving(true);
    try {
      const { data } = await apiClient.patch(`/company/${companyId}/plan`, {
        plan: value ?? null,
      });
      applyResolution(data);
      appMessage.success(t('Plan updated'));
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not update plan'));
    } finally {
      setPlanSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const overrides = {};
    for (const group of MODULE_GROUPS) {
      for (const key of group.keys) {
        const inPlan = planSet.has(key);
        if (Boolean(state[key]) !== inPlan) overrides[key] = Boolean(state[key]);
      }
    }
    try {
      await apiClient.patch(`/company/${companyId}/modules`, { overrides });
      appMessage.success(t('Modules updated'));
      onSaved?.();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not save modules'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="cmods__spin"><Spin /></div>;
  }

  return (
    <div className="cmods">
      <div className="cmods__plan">
        {t('Plan')}:{' '}
        {restricted ? (
          <strong>{plan ? t(plan) : t('No plan (all modules)')}</strong>
        ) : (
          <Select
            size="small"
            value={plan || 'none'}
            loading={planSaving}
            style={{ minWidth: 160 }}
            onChange={(v) => changePlan(v === 'none' ? null : v)}
            options={[
              { value: 'none', label: t('No plan (all modules)') },
              { value: 'start', label: t('start') },
              { value: 'tillvaxt', label: t('tillvaxt') },
              { value: 'professionell', label: t('professionell') },
            ]}
          />
        )}
        <span className="cmods__hint">
          {restricted
            ? t('Hide sections you don’t use. Locked ones need a plan upgrade.')
            : t('Toggle to override the plan for this company')}
        </span>
      </div>

      {MODULE_GROUPS.map((group) => (
        <div key={group.label} className="cmods__group">
          <div className="cmods__group-title">{t(group.label)}</div>
          {group.keys.map((key) => {
            const inPlan = planSet.has(key);
            const on = Boolean(state[key]);
            const overridden = on !== inPlan;
            const locked = restricted && !inPlan;
            return (
              <div key={key} className="cmods__row">
                <span className="cmods__label">{t(MODULE_LABELS[key])}</span>
                <span className="cmods__tags">
                  {inPlan ? (
                    <Tag color="blue">{t('In plan')}</Tag>
                  ) : (
                    <Tag>{t('Not in plan')}</Tag>
                  )}
                  {!restricted && overridden ? <Tag color="orange">{t('Override')}</Tag> : null}
                </span>
                {locked ? (
                  <Tooltip title={t('Available on a higher plan')}>
                    <LockOutlined className="cmods__lock" />
                  </Tooltip>
                ) : (
                  <Switch
                    checked={on}
                    onChange={(v) => setState((s) => ({ ...s, [key]: v }))}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div className="cmods__actions">
        <Button variant="primary" onClick={save} loading={saving}>
          {t('Save')}
        </Button>
      </div>
    </div>
  );
}
