import { Select } from '@/src/ui-kit';
import statusFilterIcon from '@/src/assets/icons/table-header-filter.svg';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

export const PHOTO_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

export default function ProjectPhotoSortSelect({
  value = 'newest',
  onChange,
  className = 'admin-table-filter-select',
}) {
  return (
    <Select
      className={className}
      placeholder="Newest first"
      value={value}
      onChange={onChange}
      options={PHOTO_SORT_OPTIONS}
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
