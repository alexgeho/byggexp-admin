'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Spin, Switch, Tag } from 'antd';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { getEntityId } from '@/src/utils/entityId';
import { MODULE_GROUPS, MODULE_LABELS } from '@/src/shared/config/modules';
import './CompanyModulesModal.scss';

// Superadmin control for which modules a company sees. The plan sets the
// baseline; toggling away from it records an override, toggling back to the
// plan default clears it — so the stored map stays minimal.
export default function CompanyModulesModal({ company, open, onClose }) {
  const t = useT();
  const companyId = company ? getEntityId(company) : null;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(null);
  const [planModules, setPlanModules] = useState([]);
  const [state, setState] = useState({}); // key -> enabled

  useEffect(() => {
    if (!open || !companyId) return;
    let alive = true;
    setLoading(true);
    apiClient
      .get(`/company/${companyId}/modules`)
      .then(({ data }) => {
        if (!alive) return;
        const enabled = new Set(data?.enabled || []);
        const next = {};
        for (const group of MODULE_GROUPS) {
          for (const key of group.keys) next[key] = enabled.has(key);
        }
        setState(next);
        setPlan(data?.plan ?? null);
        setPlanModules(data?.planModules || []);
      })
      .catch(() => appMessage.error(t('Could not load modules')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, companyId, t]);

  const planSet = useMemo(() => new Set(planModules), [planModules]);

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
      onClose?.();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not save modules'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={save}
      okText={t('Save')}
      cancelText={t('Cancel')}
      confirmLoading={saving}
      centered
      width={620}
      title={`${t('Modules')} — ${company?.name || ''}`}
    >
      {loading ? (
        <div className="cmods__spin"><Spin /></div>
      ) : (
        <div className="cmods">
          <div className="cmods__plan">
            {t('Plan')}: <strong>{plan ? t(plan) : t('No plan (all modules)')}</strong>
            <span className="cmods__hint">{t('Toggle to override the plan for this company')}</span>
          </div>
          {MODULE_GROUPS.map((group) => (
            <div key={group.label} className="cmods__group">
              <div className="cmods__group-title">{t(group.label)}</div>
              {group.keys.map((key) => {
                const inPlan = planSet.has(key);
                const on = Boolean(state[key]);
                const overridden = on !== inPlan;
                return (
                  <div key={key} className="cmods__row">
                    <span className="cmods__label">{t(MODULE_LABELS[key])}</span>
                    <span className="cmods__tags">
                      {inPlan ? (
                        <Tag color="blue">{t('In plan')}</Tag>
                      ) : (
                        <Tag>{t('Not in plan')}</Tag>
                      )}
                      {overridden ? <Tag color="orange">{t('Override')}</Tag> : null}
                    </span>
                    <Switch
                      checked={on}
                      onChange={(v) => setState((s) => ({ ...s, [key]: v }))}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
