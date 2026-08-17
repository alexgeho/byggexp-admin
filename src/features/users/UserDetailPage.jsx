import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams, useLocation } from '@/src/shared/routing/routerCompat';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  FolderAddOutlined,
  MailOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Image,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Tabs,
  Typography,
  message,
} from 'antd';
import apiClient from '@/src/api/apiClient';
import { getWorkStatusColor, getWorkStatusLabel } from '@/src/utils/workStatus';
import { useUserStore } from '@/src/store/userStore';
import { useAuthStore } from '@/src/store/authStore';
import AdminModal from '@/src/shared/components/AdminModal';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import AdminTable from '@/src/shared/components/AdminTable';
import UserCreateForm from '@/src/features/users/components/UserCreateForm';
import CertificatesPanel from '@/src/features/users/certificates/CertificatesPanel';
import PermissionsPanel from '@/src/features/users/PermissionsPanel';
import { summarizeCertificates, getCertificateStatusMeta } from '@/src/features/users/certificates/certificateStatus';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { useT } from '@/src/i18n/LanguageProvider';
import { getRoleColor, resolveUrl, CATEGORY_OPTIONS, LEVEL_OPTIONS } from '@/src/features/users/userDetailUtils';
import { buildProjectColumns, buildTokenColumns, buildActivityLogColumns } from '@/src/features/users/userDetailColumns';

export default function UserDetailPage() {
  const { id } = useParams();
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const outletContext = useOutletContext();
  const removeUser = useUserStore((state) => state.remove);

  const [userDetail, setUserDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [activityLogLoadingMore, setActivityLogLoadingMore] = useState(false);
  const [activityLogPage, setActivityLogPage] = useState(1);
  const [activityLogPageSize] = useState(20);
  const [activityLogTotal, setActivityLogTotal] = useState(0);
  const [activityLogCategory, setActivityLogCategory] = useState(undefined);
  const [activityLogLevel, setActivityLogLevel] = useState(undefined);
  const [sendTestPushLoading, setSendTestPushLoading] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignProjectId, setAssignProjectId] = useState(undefined);
  const [assigning, setAssigning] = useState(false);

  const authUser = useAuthStore((state) => state.user);
  const canManageProjects = ['superadmin', 'companyAdmin'].includes(authUser?.role);

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

  const loadActivityLogs = useCallback(
    async ({ page = 1, append = false } = {}) => {
      if (!id) {
        return;
      }

      if (append) {
        setActivityLogLoadingMore(true);
      } else {
        setActivityLogsLoading(true);
      }

      try {
        const { data } = await apiClient.get(`/users/${id}/activity-logs`, {
          params: {
            page,
            pageSize: activityLogPageSize,
            category: activityLogCategory,
            level: activityLogLevel,
          },
        });
        const items = data.items || [];

        setActivityLogs((previous) => (append ? [...previous, ...items] : items));
        setActivityLogTotal(data.total || 0);
        setActivityLogPage(page);
      } catch (error) {
        console.error('Failed to load activity logs:', error);

        if (!append) {
          setActivityLogs([]);
          setActivityLogTotal(0);
        }
      } finally {
        setActivityLogsLoading(false);
        setActivityLogLoadingMore(false);
      }
    },
    [activityLogCategory, activityLogLevel, activityLogPageSize, id],
  );

  useEffect(() => {
    setActivityLogPage(1);
    void loadActivityLogs({ page: 1, append: false });
  }, [activityLogCategory, activityLogLevel, id, loadActivityLogs]);

  const handleLoadMoreActivityLogs = useCallback(() => {
    if (
      activityLogs.length >= activityLogTotal ||
      activityLogLoadingMore ||
      activityLogsLoading
    ) {
      return;
    }

    void loadActivityLogs({ page: activityLogPage + 1, append: true });
  }, [
    activityLogLoadingMore,
    activityLogPage,
    activityLogTotal,
    activityLogs.length,
    activityLogsLoading,
    loadActivityLogs,
  ]);

  // Stable callbacks only — keying on the whole `outletContext` re-fires this
  // effect every time the context value changes and loops setState forever,
  // which freezes client-side navigation.
  const hideHeaderActions = outletContext?.hideHeaderActions;
  const showHeaderActions = outletContext?.showHeaderActions;
  const unregisterAddButton = outletContext?.unregisterAddButton;

  useEffect(() => {
    hideHeaderActions?.();
    unregisterAddButton?.();

    return () => {
      showHeaderActions?.();
      unregisterAddButton?.();
    };
  }, [hideHeaderActions, showHeaderActions, unregisterAddButton]);

  const handleDelete = async () => {
    try {
      await removeUser(id);
      message.success('User deleted');
      navigate(-1);
    } catch {
      message.error('Failed to delete user');
    }
  };

  const handleGdprExport = async () => {
    try {
      const { data } = await apiClient.get(`/gdpr/users/${id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `gdpr-export-${id}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to export data');
    }
  };

  const handleGdprErase = async () => {
    try {
      await apiClient.post(`/gdpr/users/${id}/erase`);
      message.success('Personal data erased');
      await loadUserDetail();
    } catch {
      message.error('Failed to erase personal data');
    }
  };

  const handleResendInvite = async () => {
    setResendingInvite(true);
    try {
      await apiClient.post(`/users/${id}/resend-invite`);
      message.success('Invitation sent');
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to send invitation');
    } finally {
      setResendingInvite(false);
    }
  };

  const currentProjectIds = () => (userDetail?.projects || []).map((p) => String(p.id));

  const handleAddToProject = async () => {
    if (!assignProjectId) return;
    const current = currentProjectIds();
    if (current.includes(String(assignProjectId))) {
      message.info(t('Already in this project'));
      return;
    }
    setAssigning(true);
    try {
      await apiClient.put(`/users/${id}`, { projectIds: [...current, String(assignProjectId)] });
      message.success(t('Added to project'));
      setAssignOpen(false);
      setAssignProjectId(undefined);
      await loadUserDetail();
    } catch (error) {
      message.error(error?.response?.data?.message || t('Failed to update projects'));
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveFromProject = async (projectId) => {
    const next = currentProjectIds().filter((pid) => pid !== String(projectId));
    try {
      await apiClient.put(`/users/${id}`, { projectIds: next });
      message.success(t('Removed from project'));
      await loadUserDetail();
    } catch (error) {
      message.error(error?.response?.data?.message || t('Failed to update projects'));
    }
  };

  const handleCloseModal = async () => {
    setModalOpen(false);
    await loadUserDetail();
  };

  const handleSendTestPush = async () => {
    setSendTestPushLoading(true);
    try {
      const { data } = await apiClient.post(`/notifications/users/${id}/test`, {});
      if (data?.attempted === 0) {
        message.warning('Test push request sent, but this user has no active push tokens.');
      } else if (data?.sent === 0) {
        message.warning('Push request reached the backend, but Expo did not confirm any sent notifications.');
      } else {
        message.success(`Test push sent. Confirmed receipts: ${data.sent}.`);
      }
      await Promise.all([loadUserDetail(), loadActivityLogs()]);
    } catch (error) {
      console.error('Failed to send test push:', error);
      message.error(error?.response?.data?.message || 'Failed to send test push');
      await Promise.all([loadUserDetail(), loadActivityLogs()]);
    } finally {
      setSendTestPushLoading(false);
    }
  };

  const projectColumns = useMemo(() => buildProjectColumns(t, navigate, pathname), [t, navigate, pathname]);
  const tokenColumns = useMemo(() => buildTokenColumns(t), [t]);
  const activityLogColumns = useMemo(() => buildActivityLogColumns(t), [t]);

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

  const certificates = userDetail.certificates || [];
  const certificateSummary = summarizeCertificates(certificates);
  const certificateAlert = certificateSummary.counts.expired || certificateSummary.counts.expiring
    ? getCertificateStatusMeta(certificateSummary.counts.expired ? 'expired' : 'expiring')
    : null;

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
            <Button icon={<EditOutlined />} onClick={() => setModalOpen(true)}>
              Edit
            </Button>
            <Button icon={<MailOutlined />} loading={resendingInvite} onClick={handleResendInvite}>
              Resend invite
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleGdprExport}>
              Export (GDPR)
            </Button>
            <Popconfirm
              title="Erase personal data?"
              description="Anonymises the user and clears their location/personal data. Retained records (bookkeeping) are kept de-identified. This cannot be undone."
              onConfirm={handleGdprErase}
              okText="Erase"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
            >
              <Button danger icon={<SafetyOutlined />}>
                Erase personal data
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Delete user?"
              onConfirm={handleDelete}
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
            >
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
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
              <Tag className="pill-tag" color={getRoleColor(userDetail.role)}>{userDetail.role}</Tag>
              {userDetail.profession ? <Tag className="pill-tag">{userDetail.profession}</Tag> : null}
              {userDetail.company?.name ? <Tag className="pill-tag">{userDetail.company.name}</Tag> : null}
              {certificateAlert ? (
                <Tag color={certificateAlert.color}>
                  {certificateSummary.counts.expired
                    ? `${certificateSummary.counts.expired} ${t('expired')}`
                    : `${certificateSummary.counts.expiring} ${t('expiring soon')}`}
                </Tag>
              ) : null}
            </Space>
            <div style={{ marginTop: 12 }}>
              <Typography.Text type="secondary">{userDetail.email}</Typography.Text>
            </div>
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Statistic title="Projects" value={userDetail.counts?.projectCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Statistic title="Active push tokens" value={userDetail.counts?.activePushTokenCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Statistic title="Additional documents" value={userDetail.counts?.additionalDocumentCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Statistic title="Activity logs" value={userDetail.counts?.activityLogCount || 0} />
          </Card>
        </Col>
      </Row>

      <Tabs
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'overview',
            label: t('Overview'),
            children: (
              <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                <Card title="Profile">
                  <Descriptions bordered column={2} size="middle">
                    <Descriptions.Item label="Email">{userDetail.email}</Descriptions.Item>
                    <Descriptions.Item label="Role">
                      <Tag className="pill-tag" color={getRoleColor(userDetail.role)}>{userDetail.role}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone">
                      {userDetail.phoneAreaCode && userDetail.phoneNumber
                        ? `+${userDetail.phoneAreaCode} ${userDetail.phoneNumber}`
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Profession">{userDetail.profession || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Work status">
                      <Tag className="status-tag" color={getWorkStatusColor(userDetail.workPresence?.status)}>
                        {getWorkStatusLabel(userDetail.workPresence?.status)}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Work status updated">
                      {formatAdminDateTime(userDetail.workPresence?.updatedAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Current work project">
                      {userDetail.workPresence?.projectName || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Presence reason">
                      {userDetail.workPresence?.reason || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Company" span={2}>
                      {userDetail.company ? (
                        <Space orientation="vertical" size={0}>
                          <span>{userDetail.company.name}</span>
                          <Typography.Text type="secondary">{userDetail.company.email}</Typography.Text>
                          <Typography.Text type="secondary">{userDetail.company.address}</Typography.Text>
                        </Space>
                      ) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created">{formatAdminDateTime(userDetail.createdAt)}</Descriptions.Item>
                    <Descriptions.Item label="Updated">{formatAdminDateTime(userDetail.updatedAt)}</Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card
                  title="Projects"
                  extra={canManageProjects ? (
                    <Button
                      type="primary"
                      icon={<FolderAddOutlined />}
                      onClick={() => { setAssignProjectId(undefined); setAssignOpen(true); }}
                    >
                      {t('Add to project')}
                    </Button>
                  ) : null}
                >
                  <AdminTable
                    dataSource={userDetail.projects || []}
                    columns={canManageProjects ? [...projectColumns, {
                      title: '',
                      key: 'actions',
                      align: 'right',
                      render: (_, record) => (
                        <Popconfirm
                          title={t('Remove from project')}
                          okText={t('Remove')}
                          cancelText={t('Cancel')}
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleRemoveFromProject(record.id)}
                        >
                          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                        </Popconfirm>
                      ),
                    }] : projectColumns}
                    rowKey="id"
                    infiniteScroll={false}
                    scroll={false}
                    locale={{ emptyText: 'No project memberships' }}
                  />
                </Card>

                <Card title="Additional Documents">
                  {additionalDocuments.length ? (
                    <Space orientation="vertical" size="small">
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
              </Space>
            ),
          },
          {
            key: 'certificates',
            label: t('Certificates'),
            children: (
              <CertificatesPanel
                userId={userDetail.id}
                certificates={certificates}
                onChanged={loadUserDetail}
              />
            ),
          },
          {
            key: 'permissions',
            label: t('Permissions'),
            children: (
              <PermissionsPanel
                userId={userDetail.id}
                role={userDetail.role}
                capabilities={userDetail.capabilities}
                onChanged={loadUserDetail}
              />
            ),
          },
          {
            key: 'push',
            label: t('Push & Notifications'),
            children: (
              <Card
                title="Active Push Tokens"
                extra={(
                  <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      loading={sendTestPushLoading}
                      onClick={handleSendTestPush}
                    >
                      Send Test Push
                    </Button>
                  </RoleBasedAccess>
                )}
              >
                <Space orientation="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
                  <Typography.Text type="secondary">
                    The test push is sent to all active Expo tokens currently registered for this user.
                  </Typography.Text>
                </Space>
                <AdminTable
                  dataSource={userDetail.activePushTokens || []}
                  columns={tokenColumns}
                  rowKey="id"
                  infiniteScroll={false}
                  scroll={false}
                  locale={{ emptyText: 'No active push tokens' }}
                />
              </Card>
            ),
          },
          {
            key: 'activity',
            label: t('Activity Logs'),
            children: (
              <Card
                title="Activity Logs"
                extra={(
                  <Space>
                    <Select
                      value={activityLogCategory ?? ''}
                      options={CATEGORY_OPTIONS}
                      style={{ width: 180 }}
                      onChange={(value) => {
                        setActivityLogCategory(value || undefined);
                        setActivityLogPage(1);
                      }}
                    />
                    <Select
                      value={activityLogLevel ?? ''}
                      options={LEVEL_OPTIONS}
                      style={{ width: 160 }}
                      onChange={(value) => {
                        setActivityLogLevel(value || undefined);
                        setActivityLogPage(1);
                      }}
                    />
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => void loadActivityLogs({ page: 1, append: false })}
                    >
                      Refresh
                    </Button>
                  </Space>
                )}
              >
                <AdminTable
                  dataSource={activityLogs}
                  columns={activityLogColumns}
                  rowKey="id"
                  loading={activityLogsLoading && activityLogs.length === 0}
                  loadingMore={activityLogLoadingMore}
                  hasMore={activityLogs.length < activityLogTotal}
                  onEndReached={handleLoadMoreActivityLogs}
                  locale={{ emptyText: 'No activity logs yet' }}
                />
              </Card>
            ),
          },
        ]}
      />

      <AdminModal
        title="Edit user"
        saveForm="user-create-form"
        open={modalOpen}
        onCancel={handleCloseModal}
        destroyOnHidden
        width={920}
      >
        <UserCreateForm onClose={handleCloseModal} userToEdit={editingUser} />
      </AdminModal>

      <AdminModal
        title={t('Add to project')}
        open={assignOpen}
        onCancel={() => { setAssignOpen(false); setAssignProjectId(undefined); }}
        onSave={handleAddToProject}
        saveText={t('Add')}
        saveDisabled={!assignProjectId}
        saveLoading={assigning}
        width={460}
        destroyOnHidden
      >
        <ProjectFilterSelect
          value={assignProjectId}
          onChange={setAssignProjectId}
          placeholder="Välj projekt"
        />
      </AdminModal>
    </div>
  );
}
