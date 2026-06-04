export default function AdminTableCheckbox({
  checked = false,
  indeterminate = false,
  onChange,
  ariaLabel = 'Select row',
}) {
  const classNames = [
    'admin-table-checkbox',
    checked && 'admin-table-checkbox--checked',
    indeterminate && 'admin-table-checkbox--indeterminate',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      className={classNames}
      onClick={(event) => {
        event.stopPropagation();
        onChange?.();
      }}
    />
  );
}
