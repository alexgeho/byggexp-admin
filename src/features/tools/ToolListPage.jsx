import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Tooltip } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import { DeleteOutlined, EditOutlined, QrcodeOutlined } from '@ant-design/icons';
import useAddButton from '@/src/shared/hooks/useAddButton';
import useBulkButton from '@/src/shared/hooks/useBulkButton';
import AdminModal from '@/src/shared/components/AdminModal';
import ToolCreateForm from '@/src/features/tools/components/ToolCreateForm';
import ToolManageModal from '@/src/features/tools/components/ToolManageModal';
import ToolQrPrintSheet from '@/src/features/tools/components/ToolQrPrintSheet';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useProjectsInfo, useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import StatusPills from '@/src/shared/components/StatusPills';
import StatusTag from '@/src/shared/components/StatusTag';
import { getToolPhotoUrls, resolveToolPhotoUrl } from '@/src/utils/toolPhotos';
import { useToolStore } from '@/src/store/toolStore';
import { matchesEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';

// Availability badge, mirroring the mobile app's tool statuses. Colours use the
// same semantic palette as the shared StatusTag so tool badges match every other
// status pill in the app (success/processing/warning/error).
const TOOL_STATUS = {
  available: { color: 'success', label: 'Available' },
  occupied: { color: 'processing', label: 'In use' },
  in_repair: { color: 'warning', label: 'In repair' },
  broken: { color: 'error', label: 'Broken' },
};

// broken / in_repair come from the tool's own status; otherwise the tool is
// "In use" when someone holds it (holder or assigned worker), else free.
const getToolStatusKey = (tool) => {
  if (tool.status === 'broken' || tool.status === 'in_repair') return tool.status;
  const held = Boolean(tool.currentHolderId) || (tool.workerIds || []).length > 0;
  return held ? 'occupied' : 'available';
};

const TOOL_STATUS_ORDER = ['available', 'occupied', 'in_repair', 'broken'];

export default function ToolListPage() {
  const t = useT();
  const { tools, loading, fetchAllAccessible, remove } = useToolStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [manageToolId, setManageToolId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(undefined);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [printTools, setPrintTools] = useState([]);

  const projectIds = useMemo(
    () => tools.flatMap((tool) => tool.projectIds || []).filter(Boolean),
    [tools],
  );
  const workerIds = useMemo(
    () => tools.flatMap((tool) => [...(tool.workerIds || []), tool.currentHolderId]).filter(Boolean),
    [tools],
  );
  const { projects } = useProjectsInfo(projectIds);
  const { users } = useUsersInfo(workerIds);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesProject = !selectedProjectId
        || (tool.projectIds || []).some((projectId) =>
          matchesEntityId({ _id: projectId }, selectedProjectId));
      const matchesStatus = selectedStatus === 'all' || getToolStatusKey(tool) === selectedStatus;
      return matchesProject && matchesStatus;
    });
  }, [tools, selectedProjectId, selectedStatus]);

  const projectFilterNode = useMemo(() => (
    <div className="admin-table-toolbar-filters">
      <ProjectFilterSelect
        value={selectedProjectId}
        onChange={setSelectedProjectId}
      />
    </div>
  ), [selectedProjectId]);

  const statusFilterNode = useMemo(() => {
    // Count against project-filtered tools so the pill counts track the project filter.
    const scoped = selectedProjectId
      ? tools.filter((tool) => (tool.projectIds || []).some((projectId) =>
        matchesEntityId({ _id: projectId }, selectedProjectId)))
      : tools;
    const counts = scoped.reduce((acc, tool) => {
      const key = getToolStatusKey(tool);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const options = [
      { value: 'all', label: t('All'), count: scoped.length },
      ...TOOL_STATUS_ORDER.map((key) => ({
        value: key,
        label: t(TOOL_STATUS[key].label),
        count: counts[key] || 0,
      })),
    ];
    return <StatusPills options={options} value={selectedStatus} onChange={setSelectedStatus} />;
  }, [tools, selectedProjectId, selectedStatus, t]);

  const printableTools = useMemo(
    () => filteredTools.filter((tool) => tool.qrId),
    [filteredTools],
  );

  // Render the print sheet first, then trigger the browser print dialog, then
  // clear it — so only the intended labels (all, or a single one from the modal)
  // are on the page when printing.
  useEffect(() => {
    if (!printTools.length) return undefined;
    const clear = () => setPrintTools([]);
    window.addEventListener('afterprint', clear, { once: true });
    const timerId = window.setTimeout(() => window.print(), 60);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('afterprint', clear);
    };
  }, [printTools]);

  const showModal = (toolToEdit = null) => {
    setEditingTool(toolToEdit);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingTool(null);
    setModalOpen(false);
  };

  useEffect(() => {
    fetchAllAccessible();
  }, [fetchAllAccessible]);

  useAddButton(() => showModal(), 'Add tool');
  useBulkButton(
    () => setPrintTools(printableTools),
    `${t('Print QR codes')}${printableTools.length ? ` (${printableTools.length})` : ''}`,
    [printableTools],
  );

  const columns = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      render: (_, tool) => {
        const photo = getToolPhotoUrls(tool).map(resolveToolPhotoUrl).filter(Boolean)[0];
        return (
          <span className="admin-table-user">
            <Avatar shape="square" size={39} src={photo} className="admin-table-user__avatar">
              {(tool.name || 'T').charAt(0).toUpperCase()}
            </Avatar>
            <span className="admin-table-user__name">{tool.name}</span>
          </span>
        );
      },
    },
    {
      title: t('Status'),
      key: 'status',
      render: (_, tool) => <StatusTag status={getToolStatusKey(tool)} upper />,
    },
    {
      title: t('QR'),
      key: 'qr',
      // Shift the whole column (header + cells) right by the same amount so the
      // "QR" header lines up with the codes, and widen it so the code never
      // gets truncated.
      width: 230,
      ellipsis: false,
      onCell: () => ({ style: { paddingLeft: 32 } }),
      onHeaderCell: () => ({ style: { paddingLeft: 32 } }),
      render: (_, tool) => (tool.qrId ? (
        <Tooltip title={t('Show large QR / hand-off')}>
          <button
            type="button"
            onClick={() => setManageToolId(tool._id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <QRCodeSVG value={tool.qrId} size={36} />
            <span style={{ fontFamily: 'monospace' }}>{tool.qrId}</span>
          </button>
        </Tooltip>
      ) : '-'),
    },
    {
      title: t('Held by'),
      key: 'heldBy',
      render: (_, tool) => {
        if (tool.currentHolderId) return users[tool.currentHolderId]?.name || '—';
        const names = (tool.workerIds || [])
          .map((workerId) => users[workerId]?.name)
          .filter(Boolean);
        return names.length ? names.join(', ') : t('Storage');
      },
    },
    {
      title: t('Projects'),
      key: 'projects',
      render: (_, tool) => {
        const names = (tool.projectIds || [])
          .map((projectId) => projects[projectId]?.name)
          .filter(Boolean);

        return names.length ? names.join(', ') : '-';
      },
    },
    {
      title: t('Notes'),
      dataIndex: 'notes',
      key: 'notes',
      render: (value) => value || '-',
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'manage',
              label: t('QR & hand-off'),
              icon: <QrcodeOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setManageToolId(record._id),
            },
            {
              key: 'edit',
              label: t('Edit'),
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => showModal(record),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              confirmTitle: t('Delete tool?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(record._id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <AdminTable
        dataSource={filteredTools}
        columns={columns}
        rowKey="_id"
        loading={loading}
        statusFilter={statusFilterNode}
        projectFilter={projectFilterNode}
      />

      <ToolQrPrintSheet tools={printTools} />

      <AdminModal
        title={editingTool ? t('Edit tool') : t('Add tool')}
        saveForm="tool-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
      >
        <ToolCreateForm onClose={closeModal} toolToEdit={editingTool} />
      </AdminModal>

      <ToolManageModal
        open={!!manageToolId}
        tool={tools.find((tool) => matchesEntityId(tool, manageToolId)) || null}
        onClose={() => setManageToolId(null)}
        onPrintLabel={(tool) => setPrintTools([tool])}
      />
    </>
  );
}
