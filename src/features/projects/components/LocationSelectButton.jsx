import { RightOutlined } from '@ant-design/icons';
import { useT } from '@/src/i18n/LanguageProvider';

// Read-only trigger that opens the map location picker; shows the chosen
// address or a placeholder. Form.Item feeds the current value in.
export default function LocationSelectButton({ value, onOpen }) {
  const t = useT();
  return (
    <button
      type="button"
      className={[
        'admin-modal-form__location-trigger',
        !value && 'admin-modal-form__location-trigger--placeholder',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onOpen}
    >
      <span>{value || t('Select location')}</span>
      <RightOutlined />
    </button>
  );
}
