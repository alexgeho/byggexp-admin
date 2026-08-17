import { Select } from '@/src/ui-kit';
import statusFilterIcon from '@/src/assets/icons/table-header-filter.svg';

import { resolveSvgSrc } from '@/src/utils/assets';
import { useT } from '@/src/i18n/LanguageProvider';

const DOCUMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All documents' },
  { value: 'new', label: 'New documents' },
];

export default function ProjectDocumentNewFilterSelect({
  value = 'all',
  onChange,
  className = 'admin-table-filter-select',
}) {
  const t = useT();
  return (
    <Select
      className={className}
      placeholder={t('All documents')}
      value={value}
      onChange={onChange}
      options={DOCUMENT_FILTER_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
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
