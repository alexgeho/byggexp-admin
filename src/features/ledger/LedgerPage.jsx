import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Segmented, Select, Space, Table } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import { Button } from '@/src/ui-kit';
import AdminTable from '@/src/shared/components/AdminTable';
import useAddButton from '@/src/shared/hooks/useAddButton';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { formatAmount } from '@/src/utils/formatCurrency';
import { useT } from '@/src/i18n/LanguageProvider';
import { ledgerSide, sumUb } from './ledger';

const amount = (v) => (v ? formatAmount(v) : '');
const num = { align: 'right', width: 150 };

// Ekonomi → Bokföring: fiscal years imported from SIE4 (Fortnox, Visma…).
// Balance / result per account; a row opens that account's verifications.
export default function LedgerPage() {
  const t = useT();
  const fileRef = useRef(null);
  const [years, setYears] = useState([]);
  const [year, setYear] = useState(null);
  const [rows, setRows] = useState([]);
  const [side, setSide] = useState('balance');
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [vers, setVers] = useState(null);

  const loadYears = useCallback(async (pick) => {
    const { data } = await apiClient.get('/accounting/ledger');
    setYears(data);
    setYear((cur) => pick || cur || data[0]?.start || null);
    if (!data.length) setLoading(false);
  }, []);

  useEffect(() => { loadYears().catch(() => setLoading(false)); }, [loadYears]);

  useEffect(() => {
    if (!year) return;
    setLoading(true);
    apiClient.get(`/accounting/ledger/${year}/balances`)
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => {
    if (!account) return;
    setVers(null);
    apiClient.get(`/accounting/ledger/${year}/verifications`, { params: { account: account.account } })
      .then((r) => setVers(r.data))
      .catch(() => setVers([]));
  }, [account, year]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    try {
      const { data } = await apiClient.post('/accounting/ledger/import', body);
      appMessage.success(`${data.start.slice(0, 4)}: ${data.verifications} ${t('verifications')}`);
      await loadYears(data.start);
    } catch (err) {
      appMessage.error(err.response?.data?.message?.toString() || t('Could not import the file'));
    }
  };

  useAddButton(() => fileRef.current?.click(), 'Import SIE');

  const shown = useMemo(() => ledgerSide(rows, side), [rows, side]);

  const columns = [
    { title: t('Account'), dataIndex: 'account', key: 'account', width: 100 },
    { title: t('Name'), dataIndex: 'name', key: 'name' },
    ...(side === 'balance' ? [{ title: t('Opening balance'), dataIndex: 'ib', key: 'ib', ...num, render: amount }] : []),
    { title: t('Change'), dataIndex: 'change', key: 'change', ...num, render: amount },
    { title: side === 'balance' ? t('Closing balance') : t('Amount'), dataIndex: 'ub', key: 'ub', ...num, render: amount },
  ];

  const verColumns = [
    { title: t('Date'), dataIndex: 'date', key: 'date', width: 130, render: (d) => <span style={{ whiteSpace: 'nowrap' }}>{d}</span> },
    { title: t('Ver.'), key: 'ver', width: 80, render: (_, v) => `${v.series}${v.number}` },
    { title: t('Text'), dataIndex: 'text', key: 'text' },
    {
      title: t('Amount'),
      key: 'amount',
      ...num,
      render: (_, v) => amount(v.trans.filter((x) => x.account === account?.account).reduce((s, x) => s + x.amount, 0)),
    },
  ];

  return (
    <>
      <input ref={fileRef} type="file" accept=".se,.si,.sie,.txt" hidden onChange={upload} />
      <AdminTable
        dataSource={shown}
        columns={columns}
        rowKey="account"
        rowSelection={false}
        loading={loading}
        onRow={(r) => ({ onClick: () => setAccount(r) })}
        toolbarStart={years.length ? (
          <Space wrap>
            <Select
              value={year}
              onChange={setYear}
              style={{ width: 120 }}
              options={years.map((y) => ({ value: y.start, label: y.start.slice(0, 4) }))}
            />
            <Segmented
              value={side}
              onChange={setSide}
              options={[
                { value: 'balance', label: t('Balance sheet') },
                { value: 'result', label: `${t('Income statement')} ${formatAmount(-sumUb(rows, 'result'))}` },
              ]}
            />
          </Space>
        ) : null}
        emptyState={{
          icon: <BookOutlined />,
          title: t('No bookkeeping yet'),
          actionLabel: t('Import SIE'),
          onAction: () => fileRef.current?.click(),
        }}
      />

      <AdminModal
        title={account ? `${account.account} ${account.name}` : ''}
        open={!!account}
        onCancel={() => setAccount(null)}
        footer={<Button variant="secondary" onClick={() => setAccount(null)}>{t('Close')}</Button>}
        width={760}
        destroyOnHidden
      >
        <Table dataSource={vers || []} columns={verColumns} rowKey="_id" pagination={false} loading={!vers} />
      </AdminModal>
    </>
  );
}
