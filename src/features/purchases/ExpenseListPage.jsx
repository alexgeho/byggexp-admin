import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, message } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EditOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  PaperClipOutlined,
  WalletOutlined,
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
import ExpenseForm from '@/src/features/purchases/components/ExpenseForm';
import BulkScanModal from '@/src/features/purchases/components/BulkScanModal';
import { useAuthStore } from '@/src/store/authStore';
import { useExpenseStore } from '@/src/store/expenseStore';
import { getEntityId } from '@/src/utils/entityId';
import { resolveToolPhotoUrl } from '@/src/utils/toolPhotos';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatMoney } from '@/src/utils/formatCurrency';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { formatAdminDate } from '@/src/utils/formatDateTime';

// Unified badge palette (matches invoices / supplier invoices / payroll):
// default=neutral, processing=in-progress, success=done/paid, error=rejected.

// Stored files on an expense (primary receipt + any extra attachments).
const fileCount = (r) => (r.receiptUrl ? 1 : 0) + (Array.isArray(r.attachments) ? r.attachments.length : 0);
const firstFileUrl = (r) => r.receiptUrl || (Array.isArray(r.attachments) ? r.attachments[0] : null);
const isPdf = (url) => /\.pdf($|\?)/i.test(String(url || ''));

// Save a zip blob returned by POST /expenses/receipts/zip.
const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function ExpenseListPage() {
  const { expenses, loading, fetchAll, setStatus, remove } = useExpenseStore();
  const { t } = useLanguage();
  const companyCurrency = useCompanyCurrency();
  const user = useAuthStore((s) => s.user);
  const canDelete = ['superadmin', 'companyAdmin', 'projectAdmin'].includes(user?.role);
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

  // Clear the selection on Escape or a click outside the table (same as
  // purchase invoices).
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

  // Download the receipt originals of the selected expenses: a single file is
  // just opened; anything more comes back as one zip.
  const rowsWithFiles = selectedRows.filter((r) => fileCount(r) > 0);
  const downloadSelected = async () => {
    if (!rowsWithFiles.length) return;
    if (rowsWithFiles.length === 1 && fileCount(rowsWithFiles[0]) === 1) {
      window.open(resolveToolPhotoUrl(firstFileUrl(rowsWithFiles[0])), '_blank', 'noopener');
      clearSelection();
      return;
    }
    setDownloading(true);
    try {
      const ids = rowsWithFiles.map((r) => getEntityId(r));
      const { data } = await apiClient.post('/expenses/receipts/zip', { ids }, { responseType: 'blob' });
      saveBlob(data, 'expense-receipts.zip');
      clearSelection();
    } catch {
      message.error(t('Could not download the documents'));
    } finally {
      setDownloading(false);
    }
  };

  // One expense's originals: open a single file, zip several.
  const downloadRow = async (r) => {
    if (fileCount(r) <= 1) {
      const url = firstFileUrl(r);
      if (url) window.open(resolveToolPhotoUrl(url), '_blank', 'noopener');
      return;
    }
    try {
      const { data } = await apiClient.post('/expenses/receipts/zip', { ids: [getEntityId(r)] }, { responseType: 'blob' });
      saveBlob(data, 'expense-receipt.zip');
    } catch {
      message.error(t('Could not download the documents'));
    }
  };

  const showModal = (record = null) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setEditing(null); setModalOpen(false); };
  const closeBulk = (didSave) => { setBulkOpen(false); if (didSave) fetchAll(); };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useAddButton(() => showModal(), 'Add expense');
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
    const count = expenses.reduce((a, e) => {
      const s = String(e?.status || 'submitted');
      a[s] = (a[s] || 0) + 1;
      return a;
    }, {});
    return [
      { value: 'all', label: t('All'), count: expenses.length },
      { value: 'submitted', label: t('Submitted'), count: count.submitted || 0 },
      { value: 'approved', label: t('Approved'), count: count.approved || 0 },
      { value: 'reimbursed', label: t('Reimbursed'), count: count.reimbursed || 0 },
      { value: 'rejected', label: t('Rejected'), count: count.rejected || 0 },
    ];
  }, [expenses, t]);

  const filtered = useMemo(() => (
    statusFilter === 'all'
      ? expenses
      : expenses.filter((e) => String(e?.status || 'submitted') === statusFilter)
  ), [expenses, statusFilter]);

  const columns = useMemo(() => [
    {
      title: t('Receipt'),
      dataIndex: 'receiptUrl',
      key: 'receiptUrl',
      width: 64,
      render: (v) => (v ? (
        <a href={resolveToolPhotoUrl(v)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
          {/* A PDF can't render in <img> (showed a broken "kvitto" alt text). */}
          {isPdf(v) ? (
            <FilePdfOutlined style={{ color: '#ef4444', fontSize: 26 }} />
          ) : (
            <img src={resolveToolPhotoUrl(v)} alt="kvitto" style={{ height: 36, width: 36, objectFit: 'cover', borderRadius: 6 }} />
          )}
        </a>
      ) : <FileImageOutlined style={{ color: '#cbd5e1', fontSize: 20 }} />),
    },
    { title: t('Supplier'), dataIndex: 'supplierName', key: 'supplierName', render: (v) => <span className="admin-link-cell">{v || '-'}</span> },
    { title: t('Category'), dataIndex: 'category', key: 'category', render: (v) => v || '-' },
    {
      title: t('Project'),
      key: 'project',
      render: (_, r) => (r.projectId ? projectNames[String(r.projectId)] || '—' : '—'),
    },
    { title: t('Date'), dataIndex: 'date', key: 'date', render: (v) => (v ? formatAdminDate(v) : '—') },
    {
      title: t('Paid by'),
      dataIndex: 'paidBy',
      key: 'paidBy',
      render: (v) => (v === 'company' ? t('Company card') : t('Own money')),
    },
    {
      title: t('Total'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v, r) => formatMoney(v, r.currency || companyCurrency),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (v = 'submitted') => <StatusTag status={v} upper />,
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
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => showModal(record),
            },
            fileCount(record) > 0 && {
              key: 'attachment',
              label: fileCount(record) > 1 ? t('Download originals') : t('Open original'),
              icon: <PaperClipOutlined />,
              onClick: () => downloadRow(record),
            },
            ['submitted', 'rejected'].includes(record.status) && {
              key: 'approve',
              label: t('Approve'),
              icon: <CheckCircleOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setStatus(getEntityId(record), 'approved'),
            },
            record.status === 'submitted' && {
              key: 'reject',
              label: t('Reject'),
              icon: <CloseCircleOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setStatus(getEntityId(record), 'rejected'),
            },
            record.status === 'approved' && record.paidBy === 'own' && {
              key: 'reimbursed',
              label: t('Mark as reimbursed'),
              icon: <DollarOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setStatus(getEntityId(record), 'reimbursed'),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              confirmTitle: t('Delete expense?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [projectNames, remove, setStatus, t, companyCurrency]);

  return (
    <>
      <div ref={tableWrapRef}>
        <AdminTable
          dataSource={filtered}
          columns={columns}
          rowKey="_id"
          loading={loading}
          onRowClick={(record) => showModal(record)}
          scroll={{ x: 1120 }}
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
            icon: <WalletOutlined />,
            title: t('No expenses yet'),
            description: t('Capture receipts and out-of-pocket costs so they land on the right project.'),
            actionLabel: t('Add your first expense'),
            onAction: () => showModal(),
          }}
        />
      </div>

      <AdminModal
        title={editing ? t('Edit expense') : t('New expense')}
        saveForm="expense-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={880}
      >
        <ExpenseForm onClose={closeModal} expenseToEdit={editing} />
      </AdminModal>

      <BulkScanModal open={bulkOpen} onClose={closeBulk} />
    </>
  );
}
