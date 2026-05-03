import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Image,
  Popconfirm,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import apiClient from '../api/apiClient';
import { useUserStore } from '../store/userStore';
import UserCreateForm from '../components/UserCreateForm';
import RoleBasedAccess from '../components/RoleBasedAccess';

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const getRoleColor = (role) => ({
  superadmin: 'red',
  companyAdmin: 'orange',
  projectAdmin: 'blue',
  worker: 'green',
}[role] || 'default');

const getProjectStatusColor = (status) => ({
  planning: '#D4D933',
  in_progress: '#2582D9',
  completed: '#25D937',
  on_hold: '#252ED9',
}[status] || 'default');

const resolveUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
};

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const removeUser = useUserStore((state) => state.remove);

  const [userDetail, setUserDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadUserDetail = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.get(`/users/${id}/detail`);
      setUserDetail(data);
    } catch (error) {
      console.error('Failed to load user details:', error);
      setUserDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadUserDetail();
  }, [loadUserDetail]);

  useEffect(() => {
    outletContext?.hideHeaderActions?.();
    outletContext?.unregisterAddButton?.();

    return () => {
      outletContext?.showHeaderActions?.();
      outletContext?.unregisterAddButton?.();
    };
  }, [outletContext]);

  const handleDelete = async () => {
    try {
      await removeUser(id);
      message.success('User deleted');
      navigate(-1);
    } catch {
      message.error('Failed to delete user');
    }
  };

  const handleCloseDrawer = async () => {
    setDrawerOpen(false);
    await loadUserDetail();
  };

  const projectColumns = useMemo(() => ([
    {
      title: 'Project',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Typography.Link onClick={() => navigate(`/projects/${record.id}`)}>
          {text}
        </Typography.Link>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={getProjectStatusColor(status)}>{status}</Tag>,
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
              <Tag key={role}>{role}</Tag>
            ))}
          </Space>
        ) : '-'
      ),
    },
  ]), [navigate]);

  const tokenColumns = useMemo(() => ([
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform) => <Tag>{platform || 'unknown'}</Tag>,
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
      render: formatDateTime,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: formatDateTime,
    },
  ]), []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" tip="Loading user..." />
      </div>
    );
  }

  if (!userDetail) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="User not found" />
        <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />}>
          Back
        </Button>
      </div>
    );
  }

  const avatarUrl = resolveUrl(userDetail.avatarUrl);
  const additionalDocuments = (userDetail.additionalDocuments || []).map((url, index) => ({
    key: `${url}-${index}`,
    name: decodeURIComponent(url.split('/').pop() || `Document ${index + 1}`),
    url: resolveUrl(url),
  }));

  const editingUser = {
    ...userDetail,
    _id: userDetail.id,
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />}>
          Back
        </Button>

        <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setDrawerOpen(true)}>
              Edit
            </Button>
            <RoleBasedAccess allowedRoles={['superadmin']}>
              <Popconfirm
                title="Delete user?"
                onConfirm={handleDelete}
                okText="Delete"
                cancelText="Cancel"
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            </RoleBasedAccess>
          </Space>
        </RoleBasedAccess>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={userDetail.name}
              width={120}
              height={120}
              style={{ borderRadius: 12, objectFit: 'cover' }}
            />
          ) : (
            <Avatar size={120} style={{ fontSize: 36 }}>
              {userDetail.name?.slice(0, 1)?.toUpperCase() || 'U'}
            </Avatar>
          )}

          <div>
            <Typography.Title level={3} style={{ marginBottom: 8 }}>
              {userDetail.name}
            </Typography.Title>
            <Space wrap>
              <Tag color={getRoleColor(userDetail.role)}>{userDetail.role}</Tag>
              {userDetail.profession ? <Tag>{userDetail.profession}</Tag> : null}
              {userDetail.company?.name ? <Tag>{userDetail.company.name}</Tag> : null}
            </Space>
            <div style={{ marginTop: 12 }}>
              <Typography.Text type="secondary">{userDetail.email}</Typography.Text>
            </div>
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Projects" value={userDetail.counts?.projectCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Active push tokens" value={userDetail.counts?.activePushTokenCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Additional documents" value={userDetail.counts?.additionalDocumentCount || 0} />
          </Card>
        </Col>
      </Row>

      <Card title="Profile" style={{ marginTop: 16 }}>
        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="Email">{userDetail.email}</Descriptions.Item>
          <Descriptions.Item label="Role">
            <Tag color={getRoleColor(userDetail.role)}>{userDetail.role}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Phone">
            {userDetail.phoneAreaCode && userDetail.phoneNumber
              ? `+${userDetail.phoneAreaCode} ${userDetail.phoneNumber}`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Profession">{userDetail.profession || '-'}</Descriptions.Item>
          <Descriptions.Item label="Company" span={2}>
            {userDetail.company ? (
              <Space direction="vertical" size={0}>
                <span>{userDetail.company.name}</span>
                <Typography.Text type="secondary">{userDetail.company.email}</Typography.Text>
                <Typography.Text type="secondary">{userDetail.company.address}</Typography.Text>
              </Space>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Languages" span={2}>
            {userDetail.language && Object.keys(userDetail.language).length ? (
              <Space wrap>
                {Object.entries(userDetail.language).map(([code, label]) => (
                  <Tag key={code}>{`${code}: ${String(label)}`}</Tag>
                ))}
              </Space>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Created">{formatDateTime(userDetail.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Updated">{formatDateTime(userDetail.updatedAt)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Projects" style={{ marginTop: 16 }}>
        <Table
          dataSource={userDetail.projects || []}
          columns={projectColumns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No project memberships' }}
          scroll={{ x: true }}
        />
      </Card>

      <Card title="Active Push Tokens" style={{ marginTop: 16 }}>
        <Table
          dataSource={userDetail.activePushTokens || []}
          columns={tokenColumns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No active push tokens' }}
          scroll={{ x: true }}
        />
      </Card>

      <Card title="Additional Documents" style={{ marginTop: 16 }}>
        {additionalDocuments.length ? (
          <Space direction="vertical" size="small">
            {additionalDocuments.map((document) => (
              <Typography.Link key={document.key} href={document.url} target="_blank" rel="noreferrer">
                <FileTextOutlined style={{ marginRight: 8 }} />
                {document.name}
              </Typography.Link>
            ))}
          </Space>
        ) : (
          <Empty description="No additional documents" />
        )}
      </Card>

      <Drawer
        title="Edit user"
        width={520}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        destroyOnClose
        footer={(
          <div style={{ textAlign: 'right' }}>
            <Button onClick={handleCloseDrawer} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" form="user-create-form" key="submit" htmlType="submit">
              Save
            </Button>
          </div>
        )}
      >
        <UserCreateForm onClose={handleCloseDrawer} userToEdit={editingUser} />
      </Drawer>
    </div>
  );
}
