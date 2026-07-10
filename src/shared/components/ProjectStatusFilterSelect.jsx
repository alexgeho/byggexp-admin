import { Select } from '@/src/ui-kit';
import { PROJECT_STATUS_OPTIONS } from '@/src/utils/projectStatus';
import statusFilterIcon from '@/src/assets/icons/table-header-filter.svg';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

export default function ProjectStatusFilterSelect({
  value,
  onChange,
  className = 'admin-table-filter-select',
  placeholder = 'All statuses',
}) {
  return (
    <Select
      className={className}
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      options={PROJECT_STATUS_OPTIONS}
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
