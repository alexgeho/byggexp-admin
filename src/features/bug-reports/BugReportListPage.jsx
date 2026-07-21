import { useEffect, useState } from 'react';
import { Space, Tag, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import BugReportCreateForm from '@/src/features/bug-reports/components/BugReportCreateForm';
import BugReportAttachmentPreview from '@/src/features/bug-reports/components/BugReportAttachmentPreview';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import { API_BASE_URL } from '@/src/config/apiConfig';
import { useBugReportStore } from '@/src/store/bugReportStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';

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
  const { bugReports, loading, fetchAllAccessible, remove } = useBugReportStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBugReport, setEditingBugReport] = useState(null);
  const { registerAddButton, unregisterAddButton } = useOutletContext();

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
    registerAddButton(() => showModal(), 'Report bug');

    return () => unregisterAddButton();
  }, [fetchAllAccessible, registerAddButton, unregisterAddButton]);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: formatAdminDateTime,
    },
    {
      title: 'Reporter',
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
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      maxCellWidth: 360,
      render: (value) => value || '-',
    },
    {
      title: 'Attachment',
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag className="status-tag" color={STATUS_COLORS[status] || 'default'}>
          {getStatusLabel(status)}
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
              label: 'Edit',
              icon: <EditOutlined />,
              roles: ['superadmin'],
              onClick: () => showModal(report),
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin'],
              confirmTitle: 'Delete bug report?',
              confirmOkText: 'Delete',
              confirmCancelText: 'Cancel',
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
      />

      <AdminModal
        title={editingBugReport ? 'Edit bug report' : 'Report a bug'}
        saveForm="bug-report-create-form"
        saveText={editingBugReport ? 'Save' : 'Send report'}
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
