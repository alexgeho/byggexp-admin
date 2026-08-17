import { Space, Tag, Typography } from 'antd';
import StatusTag from '@/src/shared/components/StatusTag';
import { getProjectDetailPath } from '@/src/utils/projectRoutes';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { getLogLevelColor } from '@/src/features/users/userDetailUtils';

// Table column definitions for the user detail page, pulled out of the page
// component. buildProjectColumns needs the router; the rest are static.

export const buildProjectColumns = (navigate, pathname) => ([
  {
    title: 'Project',
    dataIndex: 'name',
    key: 'name',
    render: (text, record) => (
      <Typography.Link onClick={() => navigate(getProjectDetailPath(pathname, record.id))}>
        {text}
      </Typography.Link>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status) => <StatusTag status={status} />,
  },
  {
    title: 'Location',
    dataIndex: 'location',
    key: 'location',
    render: (location) => location || '-',
  },
  {
    title: 'Roles',
    dataIndex: 'roles',
    key: 'roles',
    render: (roles = []) => (
      roles.length ? (
        <Space wrap>
          {roles.map((role) => (
            <Tag className="pill-tag" key={role}>{role}</Tag>
          ))}
        </Space>
      ) : '-'
    ),
  },
]);

export const buildTokenColumns = () => ([
  {
    title: 'Platform',
    dataIndex: 'platform',
    key: 'platform',
    render: (platform) => <Tag className="pill-tag">{platform || 'unknown'}</Tag>,
  },
  {
    title: 'Installation ID',
    dataIndex: 'installationId',
    key: 'installationId',
    render: (value) => <Typography.Text code>{value}</Typography.Text>,
  },
  {
    title: 'Expo Push Token',
    dataIndex: 'expoPushToken',
    key: 'expoPushToken',
    render: (value) => (
      <Typography.Paragraph
        copyable={{ text: value }}
        style={{ marginBottom: 0, maxWidth: 480 }}
        ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
      >
        <Typography.Text code>{value}</Typography.Text>
      </Typography.Paragraph>
    ),
  },
  {
    title: 'App Version',
    dataIndex: 'appVersion',
    key: 'appVersion',
    render: (value) => value || '-',
  },
  {
    title: 'Last Seen',
    dataIndex: 'lastSeenAt',
    key: 'lastSeenAt',
    render: formatAdminDateTime,
  },
  {
    title: 'Updated',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    render: formatAdminDateTime,
  },
]);

export const buildActivityLogColumns = () => ([
  {
    title: 'Time',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: formatAdminDateTime,
  },
  {
    title: 'Category',
    dataIndex: 'category',
    key: 'category',
    render: (value) => <Tag>{value}</Tag>,
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    render: (value) => <Typography.Text code>{value}</Typography.Text>,
  },
  {
    title: 'Level',
    dataIndex: 'level',
    key: 'level',
    render: (value) => <Tag color={getLogLevelColor(value)}>{value}</Tag>,
  },
  {
    title: 'Message',
    dataIndex: 'message',
    key: 'message',
  },
  {
    title: 'Source',
    dataIndex: 'source',
    key: 'source',
    render: (value) => value || '-',
  },
  {
    title: 'Details',
    dataIndex: 'details',
    key: 'details',
    render: (details) => {
      const hasDetails = details && Object.keys(details).length > 0;
      if (!hasDetails) {
        return '-';
      }

      const formatted = JSON.stringify(details, null, 2);
      return (
        <Typography.Paragraph
          copyable={{ text: formatted }}
          style={{ marginBottom: 0, maxWidth: 480, whiteSpace: 'pre-wrap' }}
          ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
        >
          <Typography.Text code>{formatted}</Typography.Text>
        </Typography.Paragraph>
      );
    },
  },
]);
