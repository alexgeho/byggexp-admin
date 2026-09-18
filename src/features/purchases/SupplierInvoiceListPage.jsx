import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tag, Tooltip, message } from 'antd';
import BulkScanInvoiceModal from '@/src/features/purchases/components/BulkScanInvoiceModal';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import StatusTag from '@/src/shared/components/StatusTag';
import useAddButton from '@/src/shared/hooks/useAddButton';
import useBulkButton from '@/src/shared/hooks/useBulkButton';
import useBulkDelete from '@/src/shared/hooks/useBulkDelete';
import SupplierInvoiceForm from '@/src/features/purchases/components/SupplierInvoiceForm';
import { useAuthStore } from '@/src/store/authStore';
import { useSupplierInvoiceStore } from '@/src/store/supplierInvoiceStore';
import { getEntityId } from '@/src/utils/entityId';
import { resolveUrl } from '@/src/utils/resolveUrl';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatMoney } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { paymentDueTone } from '@/src/features/purchases/paymentDue';

export default function SupplierInvoiceListPage() {
  const { invoices, loading, fetchAll, updateStatus, remove } = useSupplierInvoiceStore();
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const canDelete = ['superadmin', 'companyAdmin'].includes(user?.role);
  const bulkDelete = useBulkDelete(remove, fetchAll);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectNames, setProjectNames] = useState({});
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const tableWrapRef = useRef(null);
  const clearSelection = useCallback(() => { setSelectedKeys([]); setSelectedRows([]); }, []);

  // Clear the selection on Escape or a click outside the table.
  useEffect(() => {
    if (!selectedKeys.length) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') clearSelection(); };
    const onDown = (e) => {
      if (tableWrapRef.current && !tableWrapRef.current.contains(e.target)) clearSelection();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [selectedKeys.length, clearSelection]);
  // Captured once so overdue highlighting is stable across re-renders.
  const [now] = useState(() => Date.now());
  const closeBulk = (didSave) => { setBulkOpen(false); if (didSave) fetchAll(); };

  // Count of stored files on a row (primary scan + any extra attachments).
  const fileCount = (r) => (r.attachmentUrl ? 1 : 0) + (Array.isArray(r.attachments) ? r.attachments.length : 0);
  const firstFileUrl = (r) => r.attachmentUrl || (Array.isArray(r.attachments) ? r.attachments[0] : null);

  // Open a single stored document, or zip several files/invoices and download.
  const rowsWithFiles = selectedRows.filter((r) => fileCount(r) > 0);
  const downloadSelected = async () => {
    if (!rowsWithFiles.length) return;
    // Exactly one invoice with a single file → just open it; otherwise zip.
    if (rowsWithFiles.length === 1 && fileCount(rowsWithFiles[0]) === 1) {
      window.open(resolveUrl(firstFileUrl(rowsWithFiles[0])), '_blank', 'noopener');
      clearSelection();
      return;
    }
    setDownloading(true);
    try {
      const ids = rowsWithFiles.map((r) => getEntityId(r));
      const { data } = await apiClient.post('/supplier-invoices/attachments/zip', { ids }, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'purchase-invoices.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      clearSelection();
    } catch {
      message.error(t('Could not download the documents'));
    } finally {
      setDownloading(false);
    }
  };

  // Download one invoice's originals: open directly if it has a single file,
  // otherwise stream a zip of all its attached files.
  const downloadRow = async (r) => {
    if (fileCount(r) <= 1) {
      const url = firstFileUrl(r);
      if (url) window.open(resolveUrl(url), '_blank', 'noopener');
      return;
    }
    try {
      const { data } = await apiClient.post('/supplier-invoices/attachments/zip', { ids: [getEntityId(r)] }, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'purchase-invoice.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      message.error(t('Could not download the documents'));
    }
  };

  const showModal = (record = null) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setEditing(null); setModalOpen(false); };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useAddButton(() => showModal(), 'Add purchase invoice');
  useBulkButton(() => setBulkOpen(true), 'Scan multiple');

  useEffect(() => {
    const load = async () => {
      const url = user?.role === 'superadmin' ? '/projects' : '/projects/my';
      try {
        const { data } = await apiClient.get(url);
        setProjectNames(Object.fromEntries((data || []).map((p) => [getEntityId(p), p.name])));
      } catch { /* ignore */ }
    };
    load();
  }, [user?.role]);

  const statusFilterOptions = useMemo(() => {
    const count = invoices.reduce((a, inv) => {
      const s = String(inv?.status || 'registered');
      a[s] = (a[s] || 0) + 1;
      return a;
    }, {});
    return [
      { value: 'all', label: t('All'), count: invoices.length },
      { value: 'registered', label: t('Registered'), count: count.registered || 0 },
      { value: 'approved', label: t('Approved'), count: count.approved || 0 },
      { value: 'paid', label: t('Paid'), count: count.paid || 0 },
    ];
  }, [invoices, t]);

  const filtered = useMemo(() => (
    statusFilter === 'all'
      ? invoices
      : invoices.filter((inv) => String(inv?.status || 'registered') === statusFilter)
  ), [invoices, statusFilter]);

  const columns = useMemo(() => [
    {
      title: t('Supplier'),
      dataIndex: 'supplierName',
      key: 'supplierName',
      render: (v, r) => (
        <span className="supplier-name-cell">
          <span className="admin-link-cell">{v || '-'}</span>
          {fileCount(r) > 0 ? (
            <span style={{ color: '#64748b', whiteSpace: 'nowrap' }} title={t('Has attached document')}>
              <PaperClipOutlined />
              {fileCount(r) > 1 ? <span style={{ fontSize: 12, marginLeft: 1 }}>{fileCount(r)}</span> : null}
            </span>
          ) : null}
          {r.source === 'email' ? <Tag color="blue">{t('From email')}</Tag> : null}
        </span>
      ),
    },
    { title: t('Invoice no.'), dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (v) => v || '-' },
    {
      title: t('Project'),
      key: 'project',
      render: (_, r) => (r.projectId ? projectNames[String(r.projectId)] || '—' : '—'),
    },
    { title: t('Date'), dataIndex: 'invoiceDate', key: 'invoiceDate', render: formatAdminDate },
    {
      title: t('Due'),
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (v, r) => {
        const tone = paymentDueTone(r, now);
        return (
          <span className={tone && tone !== 'ok' ? `supplier-due supplier-due--${tone}` : undefined}>
            {formatAdminDate(v)}
          </span>
        );
      },
    },
    { title: t('Category'), dataIndex: 'category', key: 'category', render: (v) => v || '-' },
    {
      title: t('Total'),
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      // Wide enough that a five-figure amount + currency ("37 990,00 SEK")
      // never truncates.
      width: 150,
      render: (v, r) => formatMoney(v, r.currency || 'SEK'),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (v = 'registered') => (
        <StatusTag status={v} upper />
      ),
    },
    {
      title: '',
      key: 'download',
      width: 48,
      align: 'center',
      render: (_, r) => (fileCount(r) > 0 ? (
        <Tooltip title={t('Download original')}>
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            data-no-row-click
            onClick={(e) => { e.stopPropagation(); downloadRow(r); }}
          />
        </Tooltip>
      ) : null),
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'edit',
              label: t('Edit'),
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => showModal(record),
            },
            fileCount(record) > 0 && {
              key: 'attachment',
              label: fileCount(record) > 1 ? t('Download originals') : t('Open original'),
              icon: <PaperClipOutlined />,
              onClick: () => downloadRow(record),
            },
            record.status === 'registered' && {
              key: 'approve',
              label: t('Approve'),
              icon: <CheckCircleOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'approved'),
            },
            record.status !== 'paid' && {
              key: 'paid',
              label: t('Mark as paid'),
              icon: <DollarOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'paid'),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: t('Delete purchase invoice?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [projectNames, remove, updateStatus, t, now]);

  return (
    <>
      <div ref={tableWrapRef}>
        <AdminTable
          dataSource={filtered}
          columns={columns}
          rowKey="_id"
          loading={loading}
          onRowClick={(record) => showModal(record)}
          scroll={{ x: 1200 }}
          onBulkDelete={canDelete ? bulkDelete : null}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys, rows) => { setSelectedKeys(keys); setSelectedRows(rows); },
          }}
          toolbarEnd={rowsWithFiles.length ? (
            <Button
              icon={<DownloadOutlined />}
              loading={downloading}
              onClick={downloadSelected}
            >
              {t('Download originals')} ({rowsWithFiles.length})
            </Button>
          ) : null}
          statusFilter={(
            <StatusPills options={statusFilterOptions} value={statusFilter} onChange={setStatusFilter} />
          )}
          emptyState={{
            icon: <FileTextOutlined />,
            title: t('No purchase invoices yet'),
            description: t('Log supplier bills against projects to track real costs and stay ahead of due dates.'),
            actionLabel: t('Add your first purchase invoice'),
            onAction: () => showModal(),
          }}
        />
      </div>

      <AdminModal
        title={editing ? t('Edit purchase invoice') : t('New purchase invoice')}
        saveForm="supplier-invoice-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={880}
      >
        <SupplierInvoiceForm onClose={closeModal} invoiceToEdit={editing} />
      </AdminModal>

      <BulkScanInvoiceModal open={bulkOpen} onClose={closeBulk} />
    </>
  );
}
