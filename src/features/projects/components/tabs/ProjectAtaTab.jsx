import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Select, Space, Table, Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useNavigate, useLocation } from '@/src/shared/routing/routerCompat';
import { useAtaStore } from '@/src/store/ataStore';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const TYPE_OPTIONS = [
  { value: 'addition', label: 'Tillägg', en: 'Addition', nb: 'Tillegg' },
  { value: 'change', label: 'Ändring', en: 'Change', nb: 'Endring' },
  { value: 'deduction', label: 'Avgående', en: 'Deduction', nb: 'Fradrag' },
];

const STATUS_COLORS = {
  registered: 'default',
  sent: 'processing',
  approved: 'success',
  rejected: 'error',
  invoiced: 'purple',
};
const STATUS_SV = {
  registered: 'Registrerad',
  sent: 'Skickad',
  approved: 'Godkänd',
  rejected: 'Avvisad',
  invoiced: 'Fakturerad',
};
const STATUS_EN = {
  registered: 'Registered',
  sent: 'Sent',
  approved: 'Approved',
  rejected: 'Rejected',
  invoiced: 'Invoiced',
};
const STATUS_NB = {
  registered: 'Registrert',
  sent: 'Sendt',
  approved: 'Godkjent',
  rejected: 'Avvist',
  invoiced: 'Fakturert',
};

const today = () => new Date().toISOString().slice(0, 10);

function AtaForm({ form }) {
  const { t, lang } = useLanguage();
  return (
    <Form id="ata-form" form={form} layout="vertical">
      <Form.Item name="type" label={t('Type')} initialValue="addition">
        <Select
          options={TYPE_OPTIONS.map((o) => ({
            value: o.value,
            label: lang === 'nb' ? o.nb : lang === 'sv' ? o.label : o.en,
          }))}
        />
      </Form.Item>
      <Form.Item name="title" label={t('Title')} rules={[{ required: true, message: t('Enter a title') }]}>
        <Input placeholder={t('e.g. Extra socket in kitchen')} />
      </Form.Item>
      <Form.Item name="description" label={t('Description')}>
        <Input.TextArea rows={2} />
      </Form.Item>
      <Space size="large" style={{ display: 'flex' }} align="start">
        <Form.Item name="date" label={t('Date')} initialValue={today()}>
          <Input type="date" />
        </Form.Item>
        <Form.Item
          name="amount"
          label={`${t('Amount')} (SEK, ${t('excl. VAT')})`}
          tooltip={t('Positive for tillägg, negative for avgående (deduction)')}
        >
          <InputNumber precision={2} style={{ width: 220 }} />
        </Form.Item>
      </Space>
      <Form.Item name="notes" label={t('Notes')}>
        <Input.TextArea rows={2} />
      </Form.Item>
    </Form>
  );
}

// ÄTA-hantering: change orders (Ändrings-, Tilläggs- och Avgående arbeten) on
// top of the contracted scope, with a registrerad → skickad → godkänd/avvisad →
// fakturerad lifecycle. Approved ÄTA add to the project's contract value.
export default function ProjectAtaTab({ projectId }) {
  const { t, lang } = useLanguage();
  const { items, loading, fetchByProject, create, update, setStatus, remove } = useAtaStore();
  const setDraftPrefill = useInvoiceStore((s) => s.setDraftPrefill);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (projectId) void fetchByProject(projectId);
  }, [projectId, fetchByProject]);

  const showModal = (record = null) => {
    setEditing(record);
    setModalOpen(true);
    setTimeout(() => {
      if (record) {
        form.setFieldsValue({
          type: record.type || 'addition',
          title: record.title || '',
          description: record.description || '',
          date: record.date || today(),
          amount: Number(record.amount) || 0,
          notes: record.notes || '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ type: 'addition', date: today(), amount: 0 });
      }
    }, 0);
  };
  const closeModal = () => { setEditing(null); setModalOpen(false); };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = { ...values, amount: Number(values.amount) || 0 };
    if (editing) {
      await update(getEntityId(editing), payload, projectId);
    } else {
      await create({ ...payload, projectId });
    }
    closeModal();
  };

  const createInvoiceFromAta = (record) => {
    setDraftPrefill({
      projectId,
      orderReference: `ÄTA ${record.number}${record.title ? ` – ${record.title}` : ''}`,
      items: [
        {
          description: record.title || record.description || `ÄTA ${record.number}`,
          quantity: 1,
          unit: 'st',
          price: Number(record.amount) || 0,
          vatRate: 25,
        },
      ],
    });
    void setStatus(getEntityId(record), 'invoiced');
    const base = pathname.split('/projects/')[0];
    navigate(`${base}/invoicing/invoices/new`);
  };

  const totals = useMemo(() => {
    const approved = items
      .filter((it) => ['approved', 'invoiced'].includes(it.status))
      .reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const pending = items
      .filter((it) => ['registered', 'sent'].includes(it.status))
      .reduce((s, it) => s + (Number(it.amount) || 0), 0);
    return { approved, pending };
  }, [items]);

  const typeLabel = (v) => {
    const o = TYPE_OPTIONS.find((x) => x.value === v);
    return o ? (lang === 'nb' ? o.nb : lang === 'sv' ? o.label : o.en) : v;
  };
  const statusLabel = (v) =>
    (lang === 'nb' ? STATUS_NB[v] : lang === 'sv' ? STATUS_SV[v] : STATUS_EN[v]) || v;

  const columns = [
    { title: t('No.'), dataIndex: 'number', key: 'number', width: 64, render: (v) => `#${v}` },
    { title: t('Title'), dataIndex: 'title', key: 'title', render: (v) => v || '—' },
    { title: t('Type'), dataIndex: 'type', key: 'type', render: typeLabel },
    { title: t('Date'), dataIndex: 'date', key: 'date', render: (v) => (v ? formatAdminDate(v) : '—') },
    {
      title: `${t('Amount')} (SEK)`,
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v) => formatAmount(v),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (v = 'registered') => (
        <Tag color={STATUS_COLORS[v] || 'default'}>{statusLabel(v).toUpperCase()}</Tag>
      ),
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'edit',
              label: t('Edit'),
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => showModal(record),
            },
            record.status === 'registered' && {
              key: 'send',
              label: t('Mark as sent'),
              icon: <SendOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setStatus(getEntityId(record), 'sent'),
            },
            ['registered', 'sent'].includes(record.status) && {
              key: 'approve',
              label: t('Approve'),
              icon: <CheckCircleOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setStatus(getEntityId(record), 'approved'),
            },
            ['registered', 'sent'].includes(record.status) && {
              key: 'reject',
              label: t('Reject'),
              icon: <CloseCircleOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setStatus(getEntityId(record), 'rejected'),
            },
            record.status === 'approved' && {
              key: 'invoice',
              label: t('Create invoice'),
              icon: <FileTextOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => createInvoiceFromAta(record),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              confirmTitle: t('Delete ÄTA?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Space size="large" wrap>
          <span>
            {t('Approved ÄTA')}:{' '}
            <strong>{formatAmount(totals.approved)} SEK</strong>
          </span>
          <span style={{ color: 'var(--muted, #64748b)' }}>
            {t('Pending')}: {formatAmount(totals.pending)} SEK
          </span>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          {t('Add ÄTA')}
        </Button>
      </Space>

      <Table
        dataSource={items}
        columns={columns}
        rowKey={(r) => getEntityId(r)}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 860 }}
      />

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted, #64748b)' }}>
        {t('Approved and invoiced ÄTA add to the project contract value. Deductions (avgående) reduce it.')}
      </p>

      <AdminModal
        title={editing ? `${t('Edit ÄTA')} #${editing.number}` : t('New ÄTA')}
        open={modalOpen}
        onSave={handleSave}
        onCancel={closeModal}
        saveText={t('Save')}
        cancelText={t('Cancel')}
        destroyOnHidden
        width={640}
      >
        <AtaForm form={form} />
      </AdminModal>
    </div>
  );
}
