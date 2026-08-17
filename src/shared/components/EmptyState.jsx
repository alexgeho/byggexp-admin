import { Button } from '@/src/ui-kit';
import './EmptyState.scss';

// Friendly first-run empty state for list pages: an icon, a one-line reason and
// a primary CTA that starts the create flow — shown by AdminTable only when a
// list is genuinely empty (no data at all, not just filtered to nothing).
export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="admin-empty-state">
      {icon ? <div className="admin-empty-state__icon" aria-hidden="true">{icon}</div> : null}
      {title ? <h3 className="admin-empty-state__title">{title}</h3> : null}
      {description ? <p className="admin-empty-state__desc">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button className="admin-empty-state__action" onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}
