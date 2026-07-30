import { useMemo, useState } from 'react';
import { Button, Card, Popconfirm, Space, Tag, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import { getEntityId } from '@/src/utils/entityId';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useT } from '@/src/i18n/LanguageProvider';
import CertificateForm, { CERTIFICATE_FORM_ID } from './CertificateForm';
import {
  getCertificateStatus,
  getCertificateStatusMeta,
  CERT_STATUS,
} from './certificateStatus';

// Human hint next to the expiry date: "in 12 days" / "3 days ago" / "today".
function daysLeftLabel(t, daysLeft) {
  if (daysLeft == null) {
    return '';
  }
  if (daysLeft === 0) {
    return t('expires today');
  }
  if (daysLeft > 0) {
    return `${t('in')} ${daysLeft} ${t('days')}`;
  }
  return `${Math.abs(daysLeft)} ${t('days ago')}`;
}

export default function CertificatesPanel({ userId, certificates = [], onChanged }) {
  const t = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () => (certificates || []).map((cert) => ({ ...cert, key: getEntityId(cert) || cert.name })),
    [certificates],
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (cert) => {
    setEditing(cert);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await apiClient.put(`/users/${userId}/certificates/${getEntityId(editing)}`, payload);
        message.success(t('Certificate updated'));
      } else {
        await apiClient.post(`/users/${userId}/certificates`, payload);
        message.success(t('Certificate added'));
      }
      setModalOpen(false);
      setEditing(null);
      await onChanged?.();
    } catch (error) {
      message.error(error?.response?.data?.message || t('Failed to save certificate'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cert) => {
    try {
      await apiClient.delete(`/users/${userId}/certificates/${getEntityId(cert)}`);
      message.success(t('Certificate deleted'));
      await onChanged?.();
    } catch (error) {
      message.error(error?.response?.data?.message || t('Failed to delete certificate'));
    }
  };

  const columns = [
    {
      title: t('Certificate'),
      key: 'name',
      render: (_, cert) => (
        <div className="approvals-cell">
          <span className="approvals-cell__primary">{cert.name}</span>
          {cert.number || cert.issuer ? (
            <span className="approvals-cell__secondary">
              {[cert.number, cert.issuer].filter(Boolean).join(' · ')}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      title: t('Issued'),
      key: 'issuedAt',
      render: (_, cert) => (cert.issuedAt ? formatAdminDate(cert.issuedAt) : '—'),
    },
    {
      title: t('Expires'),
      key: 'expiresAt',
      render: (_, cert) => {
        const { status, daysLeft } = getCertificateStatus(cert);
        return (
          <Space orientation="vertical" size={0}>
            <span>{cert.expiresAt ? formatAdminDate(cert.expiresAt) : '—'}</span>
            {status !== CERT_STATUS.UNKNOWN ? (
              <Typography.Text type={status === CERT_STATUS.EXPIRED ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                {daysLeftLabel(t, daysLeft)}
              </Typography.Text>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: t('Status'),
      key: 'status',
      render: (_, cert) => {
        const { status } = getCertificateStatus(cert);
        const meta = getCertificateStatusMeta(status);
        return <Tag color={meta.color}>{t(meta.label)}</Tag>;
      },
    },
    {
      title: '',
      key: 'document',
      render: (_, cert) => (cert.fileUrl ? (
        <Typography.Link href={cert.fileUrl} target="_blank" rel="noreferrer">
          <LinkOutlined /> {t('Document')}
        </Typography.Link>
      ) : null),
    },
    {
      title: t('Action'),
      key: 'action',
      align: 'right',
      render: (_, cert) => (
        <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(cert)} />
            <Popconfirm
              title={t('Delete certificate?')}
              onConfirm={() => handleDelete(cert)}
              okText={t('Delete')}
              cancelText={t('Cancel')}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        </RoleBasedAccess>
      ),
    },
  ];

  return (
    <Card
      title={t('Certificates')}
      extra={(
        <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('Add certificate')}
          </Button>
        </RoleBasedAccess>
      )}
    >
      <AdminTable
        dataSource={rows}
        columns={columns}
        rowKey="key"
        infiniteScroll={false}
        scroll={false}
        locale={{ emptyText: t('No certificates') }}
      />

      <AdminModal
        title={editing ? t('Edit certificate') : t('Add certificate')}
        saveForm={CERTIFICATE_FORM_ID}
        saveText={t('Save')}
        cancelText={t('Cancel')}
        saveLoading={saving}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        destroyOnHidden
        width={720}
      >
        <CertificateForm userId={userId} certificate={editing} onSubmit={handleSubmit} />
      </AdminModal>
    </Card>
  );
}
