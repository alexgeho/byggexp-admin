import { Avatar, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, MailOutlined } from '@ant-design/icons';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import LiveStatusCell from '@/src/shared/components/LiveStatusCell';
import { summarizeCertificates, getCertificateStatusMeta } from '@/src/features/users/certificates/certificateStatus';
import { resolveUrl } from '@/src/features/users/userListUtils';

// Column definitions for the employees table. Live shift data, the company map
// and the row actions come from the page.
export function buildUserColumns({ t, navigate, workerShiftMap, companies, onEdit, onResendInvite, onDelete, currentUserId }) {
  return [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => {
        const avatarUrl = resolveUrl(record.avatarUrl);
        const displayName = text || record.email || 'User';

        return (
          <span className="admin-table-user">
            <Avatar size={39} src={avatarUrl} className="admin-table-user__avatar">
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <a className="admin-table-user__name" onClick={() => navigate(record._id)}>
              {displayName}
            </a>
          </span>
        );
      },
    },
    {
      title: t('Status'),
      key: 'live',
      width: 220,
      ellipsis: false,
      render: (_, record) => (
        <LiveStatusCell
          user={record}
          workerShiftInfo={workerShiftMap[record._id]}
        />
      ),
    },
    {
      title: t('Email'),
      dataIndex: 'email',
      key: 'email',
      width: 320,
      ellipsis: true,
    },
    {
      title: t('Role'),
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: t('Phone'),
      key: 'phone',
      render: (_, user) => {
        if (!user.phoneAreaCode || !user.phoneNumber) return '-';
        return `+${user.phoneAreaCode} ${user.phoneNumber}`;
      },
    },
    {
      title: t('Company'),
      key: 'company',
      render: (_, record) => {
        const company = companies[record.companyId];
        return company?.name || '-';
      },
    },
    {
      title: t('Certificates'),
      key: 'certificates',
      render: (_, record) => {
        const summary = summarizeCertificates(record.certificates || []);
        if (!summary.total) {
          return <span style={{ color: 'var(--admin-text-muted, #999)' }}>—</span>;
        }
        if (summary.counts.expired || summary.counts.expiring) {
          const worst = summary.counts.expired ? 'expired' : 'expiring';
          const meta = getCertificateStatusMeta(worst);
          const count = summary.counts.expired || summary.counts.expiring;
          return (
            <Tag color={meta.color}>
              {count} {summary.counts.expired ? t('expired') : t('expiring soon')}
            </Tag>
          );
        }
        return <Tag color="green">{summary.total} {t('valid')}</Tag>;
      },
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => {
        // Never offer "Delete" on your own row — you can't delete your own
        // account (it would lock you out). Backend enforces this too.
        const isSelf = currentUserId != null && String(record._id) === String(currentUserId);
        return (
          <AdminTableActions
            items={[
              {
                key: 'view',
                label: t('View'),
                icon: <EyeOutlined />,
                onClick: () => navigate(record._id),
              },
              {
                key: 'edit',
                label: t('Edit'),
                icon: <EditOutlined />,
                roles: ['superadmin', 'companyAdmin'],
                onClick: () => onEdit(record),
              },
              {
                key: 'resend-invite',
                label: t('Resend invite'),
                icon: <MailOutlined />,
                roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
                onClick: () => onResendInvite(record._id),
              },
              ...(isSelf ? [] : [{
                key: 'delete',
                label: t('Delete'),
                icon: <DeleteOutlined />,
                danger: true,
                roles: ['superadmin', 'companyAdmin'],
                confirmTitle: t('Delete user?'),
                confirmOkText: t('Delete'),
                confirmCancelText: t('Cancel'),
                onClick: () => onDelete(record._id),
              }]),
            ]}
          />
        );
      },
    },
  ];
}
