import { useEffect, useState } from 'react';
import { Button, Drawer, Image, Space } from 'antd';
import { CheckOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import StatusTag from '@/src/shared/components/StatusTag';
import { statusLabel } from '@/src/shared/statusRegistry';
import { useDeviationStore } from '@/src/store/deviationStore';
import { getEntityId } from '@/src/utils/entityId';
import { resolveUrl } from '@/src/utils/resolveUrl';
import { formatAdminDate, formatAdminDateTime } from '@/src/utils/formatDateTime';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import {
  deviationCategoryLabel,
  deviationSeverityLabel,
  deviationStatusKey,
  isDeviationOverdue,
} from '@/src/features/avvik/deviationMeta';
import CloseDeviationModal from '@/src/features/avvik/components/CloseDeviationModal';
import '@/src/features/avvik/avvik.scss';

const FIELD_LABELS = {
  title: 'Title',
  description: 'Description',
  category: 'Category',
  severity: 'Severity',
  location: 'Location',
  cause: 'Cause',
  correctiveAction: 'Corrective action',
  status: 'Status',
  responsible: 'Responsible',
  dueDate: 'Due by',
};

function Row({ label, children }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div className="avvik-drawer__row">
      <span className="avvik-drawer__label">{label}</span>
      <span className="avvik-drawer__value">{children}</span>
    </div>
  );
}

// One deviation: facts, photos and its change log; close / reopen / edit.
export default function DeviationDrawer({ deviationId, open, onClose, onEdit }) {
  const { t, lang } = useLanguage();
  const fetchOne = useDeviationStore((s) => s.fetchDeviation);
  const reopen = useDeviationStore((s) => s.reopenDeviation);
  const listed = useDeviationStore((s) => s.deviations.find((d) => getEntityId(d) === deviationId));
  const [full, setFull] = useState(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!open || !deviationId) return;
    let alive = true;
    fetchOne(deviationId).then((d) => { if (alive) setFull(d); }).catch(() => {});
    return () => { alive = false; };
  }, [open, deviationId, fetchOne]);

  const d = full && getEntityId(full) === deviationId ? { ...full, ...listed, history: full.history } : listed;
  if (!d) return <Drawer open={open} onClose={onClose} width={520} />;

  const overdue = isDeviationOverdue(d);
  const closed = d.status === 'closed';
  const value = (field, v) => {
    if (field === 'category') return deviationCategoryLabel(v, lang);
    if (field === 'severity') return deviationSeverityLabel(v, lang);
    if (field === 'status') return statusLabel(deviationStatusKey(v), lang);
    if (field === 'dueDate') return v ? formatAdminDate(v) : '—';
    return v || '—';
  };
  const actionLabel = (h) => ({
    created: t('Reported'),
    updated: t('Changed'),
    status: t('Changed'),
    closed: statusLabel('avvik_closed', lang),
    reopened: t('Reopened'),
    photos: t('Photos added'),
  }[h.action] || h.action);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={520}
      title={`#${d.number} ${d.title}`}
      extra={<StatusTag status={deviationStatusKey(d.status)} />}
      footer={d.canManage ? (
        <Space>
          {closed ? (
            <Button icon={<ReloadOutlined />} onClick={async () => setFull(await reopen(getEntityId(d)))}>
              {t('Reopen')}
            </Button>
          ) : (
            <Button type="primary" icon={<CheckOutlined />} onClick={() => setClosing(true)}>
              {t('Close deviation')}
            </Button>
          )}
          <Button icon={<EditOutlined />} onClick={() => onEdit?.(d)}>{t('Edit')}</Button>
        </Space>
      ) : null}
    >
      <div className="avvik-drawer__rows">
        <Row label={t('Project')}>{d.projectName}</Row>
        <Row label={t('Category')}>{deviationCategoryLabel(d.category, lang)}</Row>
        <Row label={t('Severity')}>{deviationSeverityLabel(d.severity, lang)}</Row>
        <Row label={t('Location')}>{d.location}</Row>
        <Row label={t('Reported by')}>{[d.reportedByName, formatAdminDate(d.reportedAt, '')].filter(Boolean).join(' · ')}</Row>
        <Row label={t('Responsible')}>{d.responsibleName || '—'}</Row>
        <Row label={t('Due by')}>
          {d.dueDate ? <span className={overdue ? 'avvik-late' : undefined}>{formatAdminDate(d.dueDate)}</span> : '—'}
        </Row>
        {closed ? (
          <Row label={t('Closed by')}>{[d.closedByName, formatAdminDate(d.closedAt, '')].filter(Boolean).join(' · ')}</Row>
        ) : null}
      </div>

      {d.description ? <p className="avvik-drawer__text">{d.description}</p> : null}
      {d.cause ? (<><div className="avvik-drawer__section">{t('Cause')}</div><p className="avvik-drawer__text">{d.cause}</p></>) : null}
      {d.correctiveAction ? (<><div className="avvik-drawer__section">{t('Corrective action')}</div><p className="avvik-drawer__text">{d.correctiveAction}</p></>) : null}
      {d.closingComment ? (<><div className="avvik-drawer__section">{t('Closing comment')}</div><p className="avvik-drawer__text">{d.closingComment}</p></>) : null}

      {d.photos?.length ? (
        <>
          <div className="avvik-drawer__section">{t('Photos')}</div>
          <Image.PreviewGroup>
            <div className="avvik-drawer__photos">
              {d.photos.map((p) => (
                <Image key={p.url} src={resolveUrl(p.url)} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 6 }} />
              ))}
            </div>
          </Image.PreviewGroup>
        </>
      ) : null}

      {d.history?.length ? (
        <>
          <div className="avvik-drawer__section">{t('History')}</div>
          <div className="avvik-history">
            {[...d.history].reverse().map((h, i) => (
              <div key={`${h.at}-${i}`}>
                <div>
                  <strong>{actionLabel(h)}</strong>
                  {(h.changes || []).filter((c) => c.field !== 'status' || h.action === 'updated' || h.action === 'status').map((c) => (
                    <span key={c.field}> · {t(FIELD_LABELS[c.field] || c.field)}: {value(c.field, c.to)}</span>
                  ))}
                  {h.comment && h.action !== 'photos' ? <span> · {h.comment}</span> : null}
                </div>
                <div className="avvik-history__meta">{[h.userName, formatAdminDateTime(h.at, '')].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <CloseDeviationModal
        deviation={d}
        open={closing}
        onClose={() => setClosing(false)}
        onClosed={(saved) => setFull(saved)}
      />
    </Drawer>
  );
}
