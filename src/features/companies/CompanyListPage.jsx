import { useEffect, useState } from 'react';
import { message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, AppstoreOutlined, MailOutlined, TagOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { formatApiError } from '@/src/utils/formError';
import useBulkDelete from '@/src/shared/hooks/useBulkDelete';
import { useT } from '@/src/i18n/LanguageProvider';
import { useCompanyStore } from '@/src/store/companyStore';
import CompanyCreateForm from '@/src/features/companies/components/CompanyCreateForm';
import CompanyModulesModal from '@/src/features/companies/components/CompanyModulesModal';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { signupSourceLabel } from '@/src/shared/signupSource';
import { EmptyCell, orDash } from '@/src/shared/components/EmptyCell';

// Superadmin tag: our own / test / real customer. Colour = the tag's meaning.
const LABELS = [
  { value: 'customer', label: 'Customer', color: 'green' },
  { value: 'own', label: 'Own', color: 'blue' },
  { value: 'test', label: 'Test', color: 'orange' },
];

export default function CompanyListPage() {
  const t = useT();
  const { companies, loading, fetchAll, remove } = useCompanyStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [modulesCompany, setModulesCompany] = useState(null);
  // Optimistic local labels so the picker responds instantly.
  const [labels, setLabels] = useState({});
  const labelOf = (c) => (c._id in labels ? labels[c._id] : c.label || null);

  const saveLabel = async (id, value) => {
    setLabels((prev) => ({ ...prev, [id]: value || null }));
    try {
      await apiClient.patch(`/company/${id}/label`, { label: value || null });
    } catch (error) {
      message.error(formatApiError(error, t('Failed to save')));
      setLabels((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };


  const showModal = (companyToEdit = null) => {
    setEditingCompany(companyToEdit);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingCompany(null);
    setModalOpen(false);
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useAddButton(() => showModal(), t('Add company'));

  const handleDelete = async (id) => {
    try {
      await remove(id);
      message.success(t('Company deleted'));
    } catch {
      message.error(t('Failed to delete company'));
    }
  };

  const bulkDelete = useBulkDelete(remove);

  // Fresh invite link for the company admin; the backend returns a real error
  // (e.g. SMTP down, already accepted) instead of a silent "sent".
  const handleResendInvite = async (id) => {
    try {
      const res = await apiClient.post(`/company/${id}/resend-invite`);
      message.success(`${t('Invitation sent')}: ${res.data?.email || ''}`);
    } catch (error) {
      message.error(formatApiError(error, t('Failed to send invitation')), 10);
    }
  };

  const columns = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      render: orDash,
    },
    {
      title: t('Address'),
      dataIndex: 'address',
      key: 'address',
      render: orDash,
    },
    {
      title: t('Email'),
      dataIndex: 'email',
      key: 'email',
      width: 280,
      ellipsis: false,
      render: orDash,
    },
    {
      title: t('Label'),
      key: 'label',
      width: 120,
      render: (_, record) => {
        const current = LABELS.find((l) => l.value === labelOf(record));
        return current ? (
          <Tag color={current.color} style={{ marginInlineEnd: 0 }}>{t(current.label)}</Tag>
        ) : (
          <EmptyCell />
        );
      },
    },
    {
      title: t('Plan'),
      dataIndex: 'plan',
      key: 'plan',
      render: (plan) =>
        plan ? <Tag color="blue">{t(plan)}</Tag> : <EmptyCell />,
    },
    {
      title: t('Source'),
      dataIndex: 'signupSource',
      key: 'signupSource',
      render: (src) => {
        const label = signupSourceLabel(src);
        if (!label) return <EmptyCell />;
        const title = src.landing || src.referrer || undefined;
        return src.campaign ? <Tag color={src.campaignClicked ? 'green' : 'default'} title={title}>{label}</Tag> : <span title={title}>{label}</span>;
      },
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
              roles: ['superadmin'],
              onClick: () => showModal(record),
            },
            {
              key: 'label',
              label: t('Label'),
              icon: <TagOutlined />,
              roles: ['superadmin'],
              children: [
                ...LABELS.map((l) => ({
                  key: `label-${l.value}`,
                  label: t(l.label),
                  roles: ['superadmin'],
                  onClick: () => saveLabel(record._id, l.value),
                })),
                ...(labelOf(record)
                  ? [{
                    key: 'label-none',
                    label: t('Remove'),
                    roles: ['superadmin'],
                    onClick: () => saveLabel(record._id, null),
                  }]
                  : []),
              ],
            },
            {
              key: 'modules',
              label: t('Modules'),
              icon: <AppstoreOutlined />,
              roles: ['superadmin'],
              onClick: () => setModulesCompany(record),
            },
            {
              key: 'resend-invite',
              label: t('Resend invite'),
              icon: <MailOutlined />,
              roles: ['superadmin'],
              onClick: () => handleResendInvite(record._id),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin'],
              confirmTitle: t('Delete company?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => handleDelete(record._id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <AdminTable
        dataSource={companies}
        columns={columns}
        rowKey="_id"
        loading={loading}
        toolbarStart={null}
        onBulkDelete={bulkDelete}
      />

      <AdminModal
        title={editingCompany ? t('Edit company') : t('Create company')}
        saveText={editingCompany ? t('Save') : t('Send')}
        saveForm="company-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
      >
        <CompanyCreateForm onClose={closeModal} companyToEdit={editingCompany} />
      </AdminModal>

      <CompanyModulesModal
        company={modulesCompany}
        open={Boolean(modulesCompany)}
        onClose={() => setModulesCompany(null)}
      />
    </>
  );
}
