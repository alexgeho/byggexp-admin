import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, InputNumber, Modal, Tag, Tooltip, Upload, message } from 'antd';
import BulkScanInvoiceModal from '@/src/features/purchases/components/BulkScanInvoiceModal';
import InboundAddressCard from '@/src/features/purchases/components/InboundAddressCard';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EditOutlined,
  FileTextOutlined,
  InboxOutlined,
  RollbackOutlined,
  PaperClipOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import StatusTag from '@/src/shared/components/StatusTag';
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
import { rebillPrefill } from '@/src/features/purchases/rebill';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { useLocation, useNavigate } from '@/src/shared/routing/routerCompat';

const MARKUP_KEY = 'byggexp.rebillMarkup';
const readMarkup = () => {
  try { return Number(localStorage.getItem(MARKUP_KEY)) || 0; } catch { return 0; }
};

export default function SupplierInvoiceListPage() {
  const { invoices, loading, fetchAll, updateStatus, remove, credit } = useSupplierInvoiceStore();
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const canDelete = ['superadmin', 'companyAdmin'].includes(user?.role);
  const bulkDelete = useBulkDelete(remove, fetchAll);
  const [modalOpen, setModalOpen] = useState(false);
  // Crediting a received bill: null = closed, otherwise the invoice being
  // credited. The amount is optional — empty credits the whole thing.
  const [creditTarget, setCreditTarget] = useState(null);
  const [creditAmount, setCreditAmount] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState(null);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectNames, setProjectNames] = useState({});
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const tableWrapRef = useRef(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const setDraftPrefill = useInvoiceStore((s) => s.setDraftPrefill);
  const [fortnox, setFortnox] = useState(null);
  const [syncing, setSyncing] = useState(false);
  // Fakturera: the purchase invoices being billed on, and the påslag.
  const [rebillRows, setRebillRows] = useState(null);
  const [markup, setMarkup] = useState(readMarkup);
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
  const closeBulk = (didSave) => { setBulkOpen(false); setDroppedFiles(null); if (didSave) fetchAll(); };
  // One drop zone for one invoice or a batch — straight into the scanner.
  const onDrop = (file, fileList) => {
    if (file === fileList[0]) { setDroppedFiles(fileList); setBulkOpen(true); }
    return false;
  };

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

  useEffect(() => {
    apiClient.get('/fortnox/status').then((r) => setFortnox(r.data)).catch(() => setFortnox(null));
  }, []);

  const syncFortnox = async () => {
    setSyncing(true);
    try {
      const { data } = await apiClient.post('/fortnox/supplier-invoices/sync');
      message.success(`${t('Fetched from Fortnox')}: ${data.imported}`);
      fetchAll();
    } catch (err) {
      message.error(err.response?.data?.message?.toString() || t('Could not fetch from Fortnox'));
    } finally {
      setSyncing(false);
    }
  };

  // Rows that can go on one customer invoice: not billed yet, one project.
  const rebillable = selectedRows.filter((r) => !r.rebilledInvoiceId && !r.creditOfId);
  const rebillProjects = new Set(rebillable.map((r) => String(r.projectId || '')));
  const canRebillSelection = rebillable.length > 0 && rebillProjects.size === 1;

  const rebill = () => {
    try { localStorage.setItem(MARKUP_KEY, String(markup || 0)); } catch { /* ignore */ }
    setDraftPrefill(rebillPrefill(rebillRows, markup));
    setRebillRows(null);
    clearSelection();
    navigate(`${pathname.split('/supplier-invoices')[0]}/invoices/new`);
  };


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
          {r.source === 'fortnox' ? <span className="supplier-name-cell__meta">Fortnox</span> : null}
          {r.rebilledInvoiceNumber ? (
            <span className="supplier-name-cell__meta">{`${t('Billed on')} #${r.rebilledInvoiceNumber}`}</span>
          ) : null}
        </span>
      ),
    },
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
    { title: t('Invoice no.'), dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (v) => v || '-' },
    {
      title: t('Project'),
      key: 'project',
      render: (_, r) => (r.projectId ? projectNames[String(r.projectId)] || '—' : '—'),
    },
    { title: t('Date'), dataIndex: 'invoiceDate', key: 'invoiceDate', render: formatAdminDate },
    { title: t('Category'), dataIndex: 'category', key: 'category', render: (v) => v || '-' },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      // Paid: hover shows when, and the bank line it was matched to.
      render: (v = 'registered', record) => (v === 'paid' && record.paidAt ? (
        <Tooltip title={record.paidBankRef || formatAdminDate(record.paidAt)}>
          <span><StatusTag status={v} upper /></span>
        </Tooltip>
      ) : <StatusTag status={v} upper />),
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
            !record.rebilledInvoiceId && !record.creditOfId && {
              key: 'rebill',
              label: t('Invoice customer'),
              icon: <FileTextOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => setRebillRows([record]),
            },
            record.source !== 'fortnox' && record.status === 'registered' && {
              key: 'approve',
              label: t('Approve'),
              icon: <CheckCircleOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'approved'),
            },
            record.source !== 'fortnox' && record.status !== 'paid' && {
              key: 'paid',
              label: t('Mark as paid'),
              icon: <DollarOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'paid'),
            },
            record.source !== 'fortnox' && !record.creditOfId && {
              key: 'credit',
              label: t('Create credit note'),
              icon: <RollbackOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => {
                setCreditAmount(null);
                setCreditTarget(record);
              },
            },
            record.source !== 'fortnox' && {
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
      <InboundAddressCard />
      <Upload.Dragger
        className="expense-drop"
        multiple
        accept="image/*,.pdf,.heic,.heif"
        showUploadList={false}
        beforeUpload={onDrop}
      >
        <p className="expense-drop__icon"><InboxOutlined /></p>
        <p className="expense-drop__title">{t('Drop invoices here or click to choose — one or many')}</p>
        <p className="expense-drop__hint">
          {t('Supplier, date and amount are read automatically.')}{' '}
          <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); showModal(); }}>{t('Enter invoice manually')}</Button>
        </p>
      </Upload.Dragger>
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
          toolbarEnd={(
            <>
              {canRebillSelection ? (
                <Button icon={<FileTextOutlined />} onClick={() => setRebillRows(rebillable)}>
                  {t('Invoice customer')} ({rebillable.length})
                </Button>
              ) : null}
              {rowsWithFiles.length ? (
                <Button icon={<DownloadOutlined />} loading={downloading} onClick={downloadSelected}>
                  {t('Download originals')} ({rowsWithFiles.length})
                </Button>
              ) : null}
              {fortnox?.supplierInvoices && !selectedKeys.length ? (
                <Button icon={<SyncOutlined />} loading={syncing} onClick={syncFortnox}>
                  {t('Fetch from Fortnox')}
                </Button>
              ) : null}
            </>
          )}
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

      <Modal
        title={t('Create credit note')}
        open={Boolean(creditTarget)}
        onCancel={() => setCreditTarget(null)}
        okText={t('Create credit note')}
        cancelText={t('Cancel')}
        onOk={async () => {
          const target = creditTarget;
          setCreditTarget(null);
          await credit(getEntityId(target), creditAmount ?? undefined);
        }}
        destroyOnHidden
      >
        <p>
          {t('Leave the amount empty to credit the whole invoice, or enter the amount excluding VAT to credit part of it.')}
        </p>
        <InputNumber
          style={{ width: '100%' }}
          value={creditAmount}
          onChange={setCreditAmount}
          min={0}
          max={Math.abs(Number(creditTarget?.amountExclVat) || 0)}
          placeholder={t('Amount excl. VAT')}
          decimalSeparator=","
        />
      </Modal>

      <AdminModal
        title={t('Invoice customer')}
        open={Boolean(rebillRows)}
        onCancel={() => setRebillRows(null)}
        onSave={rebill}
        saveText={t('Continue')}
        width={440}
        destroyOnHidden
      >
        <InputNumber
          style={{ width: '100%' }}
          value={markup}
          onChange={(v) => setMarkup(v ?? 0)}
          min={0}
          max={1000}
          addonBefore={t('Markup %')}
          autoFocus
        />
      </AdminModal>

      <BulkScanInvoiceModal open={bulkOpen} onClose={closeBulk} initialFiles={droppedFiles} />
    </>
  );
}
