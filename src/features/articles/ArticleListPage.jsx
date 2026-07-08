import { useEffect, useMemo, useState } from 'react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import ArticleCreateForm from '@/src/features/articles/components/ArticleCreateForm';
import { useArticleStore } from '@/src/store/articleStore';
import { getEntityId } from '@/src/utils/entityId';

const formatAmount = (value) => new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

export default function ArticleListPage() {
  const { articles, loading, fetchAllAccessible, remove } = useArticleStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
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
        dataSource={articles}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 920 }}
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
