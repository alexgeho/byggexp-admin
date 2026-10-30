import { useEffect, useState } from 'react';
import { Switch, message } from 'antd';
import { MobileOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { formatApiError } from '@/src/utils/formError';
import { useT } from '@/src/i18n/LanguageProvider';

// Fields of the worker's day report in the app the employer can switch off.
// Hours are always on. Saved on toggle into company.hiddenReportFields.
const FIELDS = [
  ['overtime', 'Overtime'],
  ['ob', 'OB'],
  ['travel', 'Travel time'],
  ['mileage', 'Car (km)'],
  ['perDiem', 'Daily allowance'],
  ['absence', 'Absence'],
  ['photos', 'Photos'],
  ['receipts', 'Receipts'],
];

const row = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 0', borderBottom: '1px solid var(--border, #e2e8f0)', fontSize: 14,
};

export default function ReportFieldsCard() {
  const t = useT();
  const companyId = useAuthStore((s) => s.user?.companyId);
  const [hidden, setHidden] = useState([]);

  useEffect(() => {
    if (!companyId) return;
    apiClient.get(`/company/${companyId}`)
      .then(({ data }) => setHidden(data?.hiddenReportFields || []))
      .catch(() => {});
  }, [companyId]);

  const toggle = async (key, on) => {
    const next = on ? hidden.filter((k) => k !== key) : [...hidden, key];
    const prev = hidden;
    setHidden(next);
    try {
      await apiClient.put(`/company/${companyId}`, { hiddenReportFields: next });
    } catch (err) {
      setHidden(prev);
      message.error(formatApiError(err, t('Failed to save')));
    }
  };

  return (
    <div className="profile-page__card">
      <div className="profile-page__card-header">
        <MobileOutlined className="profile-page__card-icon" />
        <div>
          <h3 className="profile-page__card-title">{t('Day report in the app')}</h3>
        </div>
      </div>
      {FIELDS.map(([key, label], i) => (
        <div key={key} style={{ ...row, ...(i === FIELDS.length - 1 ? { borderBottom: 0 } : {}) }}>
          <span>{t(label)}</span>
          <Switch size="small" checked={!hidden.includes(key)} onChange={(on) => toggle(key, on)} />
        </div>
      ))}
    </div>
  );
}
