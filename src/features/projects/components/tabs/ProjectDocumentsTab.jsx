import { useMemo, useRef, useState } from 'react';
import {
  DownloadOutlined,
  EyeOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Typography, message } from 'antd';
import { Button } from '@/src/ui-kit';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import ProjectDocumentNewFilterSelect from '@/src/features/projects/components/ProjectDocumentNewFilterSelect';
import { useProjectStore } from '@/src/store/projectStore';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import {
  formatDocumentSize,
  isNewProjectDocument,
  normalizeProjectDocuments,
} from '@/src/features/projects/utils/projectDetailUtils';

const formatDocumentDate = (value) => formatAdminDateTime(value);

export default function ProjectDocumentsTab({ project, projectId, onRefresh }) {
  const uploadDocuments = useProjectStore((state) => state.uploadDocuments);
  const [documentFilter, setDocumentFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const documents = useMemo(() => {
    const normalized = normalizeProjectDocuments(project?.documents || []);

    if (documentFilter === 'new') {
      return normalized.filter((document) => isNewProjectDocument(document));
    }

    return normalized;
  }, [documentFilter, project?.documents]);

  const toolbarStart = useMemo(() => (
    <div className="admin-table-toolbar-filters">
      <ProjectDocumentNewFilterSelect
        value={documentFilter}
        onChange={setDocumentFilter}
      />
    </div>
  ), [documentFilter]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setUploading(true);
    try {
      await uploadDocuments(projectId, files);
      await onRefresh?.();
    } catch {
      message.error('Failed to upload documents');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const toolbarEnd = useMemo(() => (
    <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}>
      <Button
        icon={<UploadOutlined />}
        loading={uploading}
        onClick={handleUploadClick}
      >
        Upload document
      </Button>
    </RoleBasedAccess>
  ), [uploading]);

  const columns = useMemo(() => [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, document) => (
        document.url ? (
          <Typography.Link href={document.url} target="_blank" rel="noreferrer">
            {name}
          </Typography.Link>
        ) : name
      ),
    },
    {
      title: 'Uploaded by',
      dataIndex: 'uploadedByName',
      key: 'uploadedByName',
      render: (value) => value || '-',
    },
    {
      title: 'Date',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      render: formatDocumentDate,
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (size) => formatDocumentSize(size),
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, document) => (
        <AdminTableActions
          items={[
            document.url
              ? {
                key: 'open',
                label: 'Open',
                icon: <EyeOutlined />,
                onClick: () => window.open(document.url, '_blank', 'noopener,noreferrer'),
              }
              : null,
            document.url
              ? {
                key: 'download',
                label: 'Download',
                icon: <DownloadOutlined />,
                onClick: () => {
                  const link = window.document.createElement('a');
                  link.href = document.url;
                  link.download = document.name || 'document';
                  link.target = '_blank';
                  link.rel = 'noreferrer';
                  link.click();
                },
              }
              : null,
          ].filter(Boolean)}
        />
      ),
    },
  ], []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={handleFileChange}
      />

      <AdminTable
        dataSource={documents}
        columns={columns}
        rowKey="key"
        toolbarStart={toolbarStart}
        toolbarEnd={toolbarEnd}
        infiniteScroll={false}
        scroll={false}
        pagination={false}
      />
    </>
  );
}
