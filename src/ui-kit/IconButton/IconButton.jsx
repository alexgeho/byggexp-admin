import './IconButton.scss';

// Square, icon-only button — the single primitive for gear/settings, nav
// arrows, dismiss ✕, header actions, etc. Keeps every icon control at one
// size, radius and hover across the app.
//   size:    'md' (40×40, default) | 'sm' (32×32) | 'lg' (48×48)
//   variant: 'default' (bordered) | 'ghost' (borderless) | 'primary' (accent)
export default function IconButton({
  className = '',
  size = 'md',
  variant = 'default',
  type = 'button',
  ...props
}) {
  const classes = ['ui-iconbtn', `ui-iconbtn--${size}`, `ui-iconbtn--${variant}`, className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...props} />;
}
