import { useEffect } from 'react';
import { Image, Select, Space, Tag, Typography } from 'antd';
import AdminTable from '@/src/shared/components/AdminTable';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import { API_BASE_URL } from '@/src/config/apiConfig';
import { useBugReportStore } from '@/src/store/bugReportStore';

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

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const getStatusLabel = (status) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label || status || '-';

export default function BugReportListPage() {
  const { bugReports, loading, fetchAllAccessible, updateStatus } = useBugReportStore();
  const outletContext = useOutletContext();

  useEffect(() => {
    fetchAllAccessible();
  }, [fetchAllAccessible]);

  useEffect(() => {
    outletContext?.hideHeaderActions?.();
    outletContext?.unregisterAddButton?.();

    return () => {
      outletContext?.showHeaderActions?.();
      outletContext?.unregisterAddButton?.();
    };
  }, [outletContext]);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: formatDateTime,
    },
    {
      title: 'Reporter',
      key: 'reporter',
      render: (_, report) => (
        <Space direction="vertical" size={0}>
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
          <Image
            src={attachmentUrl}
            alt={report.attachment?.name || 'Bug report attachment'}
            width={56}
            height={56}
            style={{ borderRadius: 8, objectFit: 'cover' }}
          />
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, report) => (
        <Space>
          <Tag className="status-tag" color={STATUS_COLORS[status] || 'default'}>
            {getStatusLabel(status)}
          </Tag>
          <Select
            size="small"
            value={status}
            options={STATUS_OPTIONS}
            style={{ width: 130 }}
            onChange={(nextStatus) => updateStatus(report._id || report.id, nextStatus)}
          />
        </Space>
      ),
    },
  ];

  return (
    <AdminTable
      dataSource={bugReports}
      columns={columns}
      rowKey="_id"
      loading={loading}
    />
  );
}
