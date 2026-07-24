import { useEffect, useMemo, useState } from 'react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import ArticleCreateForm from '@/src/features/articles/components/ArticleCreateForm';
import { useArticleStore } from '@/src/store/articleStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatAmount } from '@/src/utils/formatCurrency';

export default function ArticleListPage() {
  const { articles, loading, fetchAllAccessible, remove } = useArticleStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const { registerAddButton, unregisterAddButton } = useOutletContext();

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
    registerAddButton(() => showModal(), 'Add article');

    return () => unregisterAddButton();
  }, [fetchAllAccessible, registerAddButton, unregisterAddButton]);

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
      { value: 'all', label: 'All', count: articles.length },
      { value: 'services', label: 'Services', count: countByFilter.services || 0 },
      { value: 'products', label: 'Products', count: countByFilter.products || 0 },
      { value: 'private-client', label: 'Private client', count: countByFilter['private-client'] || 0 },
    ];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    if (statusFilter === 'all') {
      return articles;
    }

    return articles.filter((article) => getArticleFilterType(article) === statusFilter);
  }, [articles, statusFilter]);

  const columns = useMemo(() => [
    {
      title: 'Art.no.',
      dataIndex: 'articleNumber',
      key: 'articleNumber',
      width: 100,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Kontering',
      dataIndex: 'kontering',
      key: 'kontering',
      render: (value) => value || '-',
    },
    {
      title: 'VAT %',
      dataIndex: 'momsPercent',
      key: 'momsPercent',
      width: 90,
      render: (value) => `${value ?? 25}%`,
    },
    {
      title: 'Price excl. VAT',
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
              label: 'Edit',
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => showModal(record),
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: 'Delete article?',
              confirmOkText: 'Delete',
              confirmCancelText: 'Cancel',
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [remove]);

  return (
    <>
      <AdminTable
        dataSource={filteredArticles}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 920 }}
        toolbarStart={(
          <StatusPills
            options={statusFilterOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        )}
      />

      <AdminModal
        title={editingArticle ? 'Edit article' : 'Create article'}
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
