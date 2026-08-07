import './Segmented.scss';

// Segmented toggle group — the single primitive for inline choose-one controls
// (Hours by Planned/GPS/Manual, 2 weeks/Month/Custom, approve quadrants, …).
// One height, radius, font, active + hover treatment everywhere.
//   options: [{ value, label, color? }]  — optional per-option accent (a hex)
//            drives a coloured dot + active tint; omit for the plain accent.
//   value / onChange(value)
//   size: 'md' (40, default) | 'sm' (32)
export default function Segmented({
  options = [],
  value,
  onChange,
  className = '',
  size = 'md',
}) {
  const classes = ['ui-segmented', `ui-segmented--${size}`, className].filter(Boolean).join(' ');
  return (
    <div className={classes} role="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        const style = opt.color ? { '--seg-accent': opt.color } : undefined;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`ui-segmented__item${active ? ' is-active' : ''}`}
            style={style}
            onClick={() => onChange?.(opt.value)}
          >
            {opt.color ? <span className="ui-segmented__dot" style={{ background: opt.color }} /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
