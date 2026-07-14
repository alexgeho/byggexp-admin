export default function StatusPills({
  options = [],
  value = 'all',
  onChange,
  className = '',
}) {
  const rootClassName = ['status-pills', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName} role="tablist" aria-label="Status filters">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            className={`status-pills__button${isActive ? ' status-pills__button--active' : ''}`}
            onClick={() => onChange?.(option.value)}
            aria-pressed={isActive}
          >
            <span className="status-pills__label">{option.label}</span>
            <span className="status-pills__count">{option.count ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
