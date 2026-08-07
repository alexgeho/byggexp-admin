import './LinkButton.scss';

// Text-only inline action — "Today", "View all", "Reset", etc. No box, accent
// text, one hover treatment. Use for actions that read as links, not buttons.
//   tone: 'accent' (default) | 'muted' | 'danger'
export default function LinkButton({ className = '', tone = 'accent', type = 'button', ...props }) {
  const classes = ['ui-linkbtn', `ui-linkbtn--${tone}`, className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...props} />;
}
