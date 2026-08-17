import { useEffect, useMemo, useState } from 'react';
import { DeleteOutlined, EditOutlined, TagsOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import useAddButton from '@/src/shared/hooks/useAddButton';
import ArticleCreateForm from '@/src/features/articles/components/ArticleCreateForm';
import { useArticleStore } from '@/src/store/articleStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatAmount } from '@/src/utils/formatCurrency';

export default function ArticleListPage() {
  const { articles, loading, fetchAllAccessible, remove } = useArticleStore();
  const t = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const showModal = (articleToEdit = null) => {
    setEditingArticle(articleToEdit);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingArticle(null);
    setModalOpen(false);
  };

  useEffect(() => {
    fetchAllAccessible();
  }, [fetchAllAccessible]);

  useAddButton(() => showModal(), 'Add article');

  const getArticleFilterType = (article) => {
    const kontering = String(article?.kontering || '').toLowerCase();

    if (kontering.includes('privat')) {
      return 'private-client';
    }

    if (kontering.includes('varor')) {
      return 'products';
    }

    if (kontering.includes('tjanster') || kontering.includes('tjänster')) {
      return 'services';
    }

    return 'services';
  };

  const statusFilterOptions = useMemo(() => {
    const countByFilter = articles.reduce((accumulator, article) => {
      const filterType = getArticleFilterType(article);
      accumulator[filterType] = (accumulator[filterType] || 0) + 1;
      return accumulator;
    }, {});

    return [
      { value: 'all', label: t('All'), count: articles.length },
      { value: 'services', label: t('Services'), count: countByFilter.services || 0 },
      { value: 'products', label: t('Products'), count: countByFilter.products || 0 },
      { value: 'private-client', label: t('Private client'), count: countByFilter['private-client'] || 0 },
    ];
  }, [articles, t]);

  const filteredArticles = useMemo(() => {
    if (statusFilter === 'all') {
      return articles;
    }

    return articles.filter((article) => getArticleFilterType(article) === statusFilter);
  }, [articles, statusFilter]);

  const columns = useMemo(() => [
    {
      title: t('Art.no.'),
      dataIndex: 'articleNumber',
      key: 'articleNumber',
      width: 100,
    },
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('Kontering'),
      dataIndex: 'kontering',
      key: 'kontering',
      render: (value) => value || '-',
    },
    {
      title: t('VAT %'),
      dataIndex: 'momsPercent',
      key: 'momsPercent',
      width: 90,
      render: (value) => `${value ?? 25}%`,
    },
    {
      title: t('Price excl. VAT'),
      dataIndex: 'priceExclMoms',
      key: 'priceExclMoms',
      align: 'right',
      render: (value) => formatAmount(value),
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
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: t('Delete article?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [remove, t]);

  return (
    <>
      <AdminTable
        dataSource={filteredArticles}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 920 }}
        statusFilter={(
          <StatusPills
            options={statusFilterOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        )}
        emptyState={{
          icon: <TagsOutlined />,
          title: t('No articles yet'),
          description: t('Articles are reusable line items (labour, materials) you drop onto offers and invoices.'),
          actionLabel: t('Create your first article'),
          onAction: () => showModal(),
        }}
      />

      <AdminModal
        title={editingArticle ? t('Edit article') : t('Create article')}
        saveForm="article-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
      >
        <ArticleCreateForm onClose={closeModal} articleToEdit={editingArticle} />
      </AdminModal>
    </>
  );
}
