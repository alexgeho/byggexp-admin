import { useEffect, useState } from 'react';
import { Space, Tag, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import BugReportCreateForm from '@/src/features/bug-reports/components/BugReportCreateForm';
import BugReportAttachmentPreview from '@/src/features/bug-reports/components/BugReportAttachmentPreview';
import useAddButton from '@/src/shared/hooks/useAddButton';
import useBulkDelete from '@/src/shared/hooks/useBulkDelete';
import { API_BASE_URL } from '@/src/config/apiConfig';
import { useBugReportStore } from '@/src/store/bugReportStore';
import { useAuthStore } from '@/src/store/authStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { useT } from '@/src/i18n/LanguageProvider';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
];

const STATUS_COLORS = {
  open: 'red',
  in_progress: 'blue',
  resolved: 'green',
};

const resolveAttachmentUrl = (value) => {
  if (!value) {
    return null;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const getStatusLabel = (status) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label || status || '-';

export default function BugReportListPage() {
  const t = useT();
  const { bugReports, loading, fetchAllAccessible, remove } = useBugReportStore();
  const userRole = useAuthStore((s) => s.user?.role);
  const canDelete = ['superadmin'].includes(userRole);
  const bulkDelete = useBulkDelete(remove);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBugReport, setEditingBugReport] = useState(null);

  const showModal = (bugReportToEdit = null) => {
    setEditingBugReport(bugReportToEdit);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingBugReport(null);
    setModalOpen(false);
  };

  useEffect(() => {
    fetchAllAccessible();
  }, [fetchAllAccessible]);

  useAddButton(() => showModal(), 'Report bug');

  const columns = [
    {
      title: t('Date'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: formatAdminDateTime,
    },
    {
      title: t('Reporter'),
      key: 'reporter',
      render: (_, report) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text>{report.reporterEmail || report.createdByUserId || '-'}</Typography.Text>
          {report.reporterRole ? (
            <Typography.Text type="secondary">{report.reporterRole}</Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: t('Message'),
      dataIndex: 'message',
      key: 'message',
      maxCellWidth: 360,
      render: (value) => value || '-',
    },
    {
      title: t('Attachment'),
      key: 'attachment',
      render: (_, report) => {
        const attachmentUrl = resolveAttachmentUrl(report.attachment?.url);

        if (!attachmentUrl) {
          return '-';
        }

        return (
          <BugReportAttachmentPreview
            attachment={report.attachment}
            url={attachmentUrl}
            width={72}
            height={72}
            alt={report.attachment?.name || 'Bug report attachment'}
          />
        );
      },
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag className="status-tag" color={STATUS_COLORS[status] || 'default'}>
          {t(getStatusLabel(status))}
        </Tag>
      ),
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, report) => (
        <AdminTableActions
          items={[
            {
              key: 'edit',
              label: t('Edit'),
              icon: <EditOutlined />,
              roles: ['superadmin'],
              onClick: () => showModal(report),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin'],
              confirmTitle: t('Delete bug report?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(report)),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <AdminTable
        dataSource={bugReports}
        columns={columns}
        rowKey="_id"
        loading={loading}
        onBulkDelete={canDelete ? bulkDelete : null}
      />

      <AdminModal
        title={editingBugReport ? t('Edit bug report') : t('Report a bug')}
        saveForm="bug-report-create-form"
        saveText={editingBugReport ? t('Save') : t('Send report')}
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={640}
      >
        <BugReportCreateForm onClose={closeModal} bugReportToEdit={editingBugReport} />
      </AdminModal>
    </>
  );
}
