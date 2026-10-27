import { useEffect, useState } from 'react';
import { Alert, DatePicker, Descriptions, Spin } from 'antd';
import dayjs from 'dayjs';
import AdminModal from '@/src/shared/components/AdminModal';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatMoney } from '@/src/utils/formatCurrency';
import { agiDeadline, agiProblemLabel } from './agi';

// Arbetsgivardeklaration for the month the pay went out: what to pay to the
// skattekonto and the XML file to upload at Skatteverket (BankID).
export default function AgiModal({ open, onClose }) {
  const { t } = useLanguage();
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const period = month.format('YYYYMM');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiClient.get(`/payroll/agi/${period}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, period]);

  const download = async () => {
    setBusy(true);
    try {
      const { data: blob } = await apiClient.get(`/payroll/agi/${period}/xml`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agi-${period}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      appMessage.error(t('Could not create the file'));
    } finally {
      setBusy(false);
    }
  };

  const problems = data?.problems || [];
  const ready = data && data.employees > 0 && !problems.length;

  return (
    <AdminModal
      title={t('Employer declaration')}
      open={open}
      onCancel={onClose}
      onSave={download}
      saveText={t('Download file')}
      saveDisabled={!ready}
      saveLoading={busy}
      width={520}
      destroyOnHidden
    >
      <DatePicker
        picker="month"
        size="large"
        style={{ width: 200, marginBottom: 16 }}
        value={month}
        allowClear={false}
        format="MMMM YYYY"
        onChange={(v) => v && setMonth(v.startOf('month'))}
      />
      {loading ? <Spin /> : null}
      {!loading && data ? (
        <>
          {problems.length ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={problems.map((p) => agiProblemLabel(p, t)).join(' · ')}
            />
          ) : null}
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label={t('Employees')}>{data.employees}</Descriptions.Item>
            <Descriptions.Item label={t('Gross salary')}>{formatMoney(data.gross, 'SEK')}</Descriptions.Item>
            <Descriptions.Item label={t('Tax')}>{formatMoney(data.tax, 'SEK')}</Descriptions.Item>
            <Descriptions.Item label={t('Employer contributions')}>{formatMoney(data.employerFee, 'SEK')}</Descriptions.Item>
            <Descriptions.Item label={t('To pay')}>
              <strong>{formatMoney(data.toPay, 'SEK')}</strong>
            </Descriptions.Item>
            <Descriptions.Item label={t('Bankgiro')}>5050-1055</Descriptions.Item>
            <Descriptions.Item label={t('Last day')}>{agiDeadline(period)}</Descriptions.Item>
          </Descriptions>
        </>
      ) : null}
    </AdminModal>
  );
}
