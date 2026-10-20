'use client';

import { useEffect, useMemo, useState } from 'react';
import { Empty, Spin, message } from 'antd';
import AdminModal from '@/src/shared/components/AdminModal';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatMoney } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { getEntityId } from '@/src/utils/entityId';
import { readBankSheet } from '@/src/features/projektkalkyl/excelImport';
import { bankPayments, matchBankPayments } from '@/src/features/planning/bankMatch';

// A dropped bank export → the unpaid supplier invoices it already shows as paid,
// all ticked; one click marks them "Betald" with the bank date + line.
export default function BankMatchModal({ file, invoices, currency, onMarkPaid, onClose }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!file) return undefined;
    let cancelled = false;
    setLoading(true);
    readBankSheet(file)
      .then(({ columns, rows }) => { if (!cancelled) setLines(bankPayments(columns, rows)); })
      .catch(() => { if (!cancelled) { setLines([]); message.error(t('Could not read the Excel file')); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [file, t]);

  const matches = useMemo(() => matchBankPayments(lines, invoices), [lines, invoices]);
  useEffect(() => { setSelected(matches.map((m) => getEntityId(m.invoice))); }, [matches]);

  const save = async () => {
    setSaving(true);
    const chosen = matches.filter((m) => selected.includes(getEntityId(m.invoice)));
    for (const m of chosen) {
      // eslint-disable-next-line no-await-in-loop
      await onMarkPaid(getEntityId(m.invoice), {
        paidAt: m.line.date,
        bankRef: `${m.line.date} ${m.line.description}`.trim(),
      });
    }
    setSaving(false);
    onClose(chosen.length > 0);
  };

  const columns = [
    { title: t('Supplier'), key: 'supplier', render: (_, m) => m.invoice.supplierName },
    { title: t('Due'), key: 'due', render: (_, m) => formatAdminDate(m.invoice.dueDate) },
    { title: t('Paid'), key: 'paid', render: (_, m) => formatAdminDate(m.line.date) },
    { title: t('Bank statement'), key: 'text', ellipsis: true, render: (_, m) => m.line.description },
    { title: t('Amount'), key: 'amount', align: 'right', render: (_, m) => formatMoney(m.invoice.total, currency, { decimals: false }) },
  ];

  return (
    <AdminModal
      open={Boolean(file)}
      onCancel={() => onClose(false)}
      title={t('Paid according to the bank')}
      width={900}
      destroyOnHidden
      saveText={`${t('Mark as paid')} (${selected.length})`}
      onSave={save}
      saveDisabled={!selected.length}
      saveLoading={saving}
    >
      {loading ? <Spin /> : matches.length ? (
        <Table
          dataSource={matches}
          columns={columns}
          rowKey={(m) => getEntityId(m.invoice)}
          rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
          pagination={false}
          size="small"
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('No payments found for unpaid invoices')} />
      )}
    </AdminModal>
  );
}
