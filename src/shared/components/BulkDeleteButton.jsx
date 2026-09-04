import { Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useT } from '@/src/i18n/LanguageProvider';

// The single shared "Delete (N)" button for table bulk-delete. Every table's
// selection-delete uses this so it looks identical and sits in the same place
// (the table toolbar's trailing cluster). Solid red destructive style.
export default function BulkDeleteButton({ count, onClick, loading = false, ...rest }) {
  const t = useT();
  return (
    <Button
      type="primary"
      danger
      icon={<DeleteOutlined />}
      loading={loading}
      onClick={onClick}
      className="bulk-delete-btn"
      {...rest}
    >
      {t('Delete')} ({count})
    </Button>
  );
}
