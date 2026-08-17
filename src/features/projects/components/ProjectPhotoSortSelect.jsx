import { Select } from '@/src/ui-kit';
import statusFilterIcon from '@/src/assets/icons/table-header-filter.svg';

import { resolveSvgSrc } from '@/src/utils/assets';
import { useT } from '@/src/i18n/LanguageProvider';

const PHOTO_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

export default function ProjectPhotoSortSelect({
  value = 'newest',
  onChange,
  className = 'admin-table-filter-select',
}) {
  const t = useT();
  return (
    <Select
      className={className}
      placeholder={t('Newest first')}
      value={value}
      onChange={onChange}
      options={PHOTO_SORT_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
      prefix={(
        <img
          src={resolveSvgSrc(statusFilterIcon)}
          width={20}
          height={20}
          alt=""
          aria-hidden="true"
        />
      )}
    />
  );
}
