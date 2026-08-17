import { useEffect, useMemo, useState } from 'react';
import { CopyOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, FileAddOutlined } from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import { downloadOfferPdf } from '@/src/features/offers/offerPdf';
import { offerToInvoicePrefill } from '@/src/features/offers/offerToInvoice';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import StatusTag from '@/src/shared/components/StatusTag';
import useAddButton from '@/src/shared/hooks/useAddButton';
import useBulkDelete from '@/src/shared/hooks/useBulkDelete';
import { useLocation, useNavigate } from '@/src/shared/routing/routerCompat';
import { useOfferStore } from '@/src/store/offerStore';
import { useAuthStore } from '@/src/store/authStore';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

export default function OfferListPage() {
  const { offers, loading, fetchAllAccessible, remove, copy } = useOfferStore();
  const userRole = useAuthStore((s) => s.user?.role);
  const canDelete = ['superadmin', 'companyAdmin'].includes(userRole);
  const bulkDelete = useBulkDelete(remove);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const setDraftPrefill = useInvoiceStore((state) => state.setDraftPrefill);
  const [statusFilter, setStatusFilter] = useState('all');

  const createInvoiceFromOffer = (offer) => {
    setDraftPrefill(offerToInvoicePrefill(offer));
    const base = pathname.split('/invoicing/')[0];
    navigate(`${base}/invoicing/invoices/new`);
  };

  useEffect(() => {
    fetchAllAccessible();
  }, [fetchAllAccessible]);

  useAddButton(() => navigate('new'), 'Add offer');

  const statusFilterOptions = useMemo(() => {
    const countByStatus = offers.reduce((accumulator, offer) => {
      const status = String(offer?.status || 'draft').toLowerCase();
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    return [
      { value: 'all', label: t('All'), count: offers.length },
      { value: 'draft', label: t('Drafts'), count: countByStatus.draft || 0 },
      { value: 'sent', label: t('Sent'), count: countByStatus.sent || 0 },
      { value: 'accepted', label: t('Accepted'), count: countByStatus.accepted || 0 },
    ];
  }, [offers, t]);

  const filteredOffers = useMemo(() => {
    if (statusFilter === 'all') {
      return offers;
    }

    return offers.filter((offer) => String(offer?.status || 'draft').toLowerCase() === statusFilter);
  }, [offers, statusFilter]);

  const columns = useMemo(() => [
    {
      title: t('No.'),
      dataIndex: 'offerNumber',
      key: 'offerNumber',
      width: 90,
      sorter: (a, b) => Number(a.offerNumber || 0) - Number(b.offerNumber || 0),
    },
    {
      title: t('Customer'),
      dataIndex: 'companyName',
      key: 'companyName',
      render: (value) => value || '-',
    },
    {
      title: t('Subtitle'),
      dataIndex: 'subtitle',
      key: 'subtitle',
      render: (value) => value || '-',
    },
    {
      title: t('Date'),
      dataIndex: 'date',
      key: 'date',
      render: formatAdminDate,
    },
    {
      title: t('Valid until'),
      dataIndex: 'validUntil',
      key: 'validUntil',
      render: formatAdminDate,
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (value = 'draft') => <StatusTag status={value} upper />,
    },
    {
      title: t('Total'),
      key: 'total',
      align: 'right',
      render: (_, record) => (
        Number(record?.total) > 0
          ? `${formatAmount(record.total)} SEK`
          : (record?.priceText || '-')
      ),
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
              onClick: () => navigate(`${getEntityId(record)}/edit`),
            },
            {
              key: 'pdf',
              label: t('Download PDF'),
              icon: <DownloadOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => downloadOfferPdf(record),
            },
            {
              key: 'to-invoice',
              label: t('Create invoice'),
              icon: <FileAddOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => createInvoiceFromOffer(record),
            },
            {
              key: 'copy',
              label: t('Copy'),
              icon: <CopyOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => copy(getEntityId(record)),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: t('Delete offer?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [copy, navigate, remove, t]);

  return (
    <AdminTable
      dataSource={filteredOffers}
      columns={columns}
      rowKey="_id"
      loading={loading}
      onBulkDelete={canDelete ? bulkDelete : null}
      scroll={{ x: 1120 }}
      statusFilter={(
        <StatusPills
          options={statusFilterOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      )}
      emptyState={{
        icon: <FileAddOutlined />,
        title: t('No offers yet'),
        description: t('Draft an offer, then turn it into an invoice when the job is won.'),
        actionLabel: t('Create your first offer'),
        onAction: () => navigate('new'),
      }}
    />
  );
}
