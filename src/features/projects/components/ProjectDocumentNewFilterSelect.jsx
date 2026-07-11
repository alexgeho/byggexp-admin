import { Select } from '@/src/ui-kit';
import statusFilterIcon from '@/src/assets/icons/table-header-filter.svg';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

const DOCUMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All documents' },
  { value: 'new', label: 'New documents' },
];

export default function ProjectDocumentNewFilterSelect({
  value = 'all',
  onChange,
  className = 'admin-table-filter-select',
}) {
  return (
    <Select
      className={className}
      placeholder="All documents"
      value={value}
      onChange={onChange}
      options={DOCUMENT_FILTER_OPTIONS}
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
