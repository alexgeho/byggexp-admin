import { Typography } from 'antd';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { leaveTypeLabel } from '@/src/features/leave/leaveTypes';
import { dayReportItems } from '@/src/features/shifts/dayReport';

const STATUS_LABELS = { pending: 'Awaiting', approved: 'Approved' };

const itemValue = (item, t, lang) => {
  if (item.key === 'leave') return leaveTypeLabel(item.leaveType, lang);
  if (item.key === 'perDiem') return t(item.value);
  return item.value ?? item.count;
};

// "Normal 8 h · Övertid 2 h (Väntar) · Restid 1 h · …" — for a cell's title.
export function dayReportText(day, extras, t, lang) {
  const parts = dayReportItems(day, extras).map((item) => {
    const status = item.status && STATUS_LABELS[item.status] ? ` (${t(STATUS_LABELS[item.status])})` : '';
    return `${t(item.label)} ${itemValue(item, t, lang)}${status}`;
  });
  return [...parts, ...day.notes].join(' · ');
}

// Dagens rapport for one worker and day: every line that reaches the
// lönespecifikation, empty ones left out. Photos and receipts link to where
// they are (`photosHref` / `receiptsHref`).
export default function DayReport({ day, leave = null, receipts = [], photosHref, receiptsHref }) {
  const { t, lang } = useLanguage();
  const items = dayReportItems(day, { leave, receipts });
  if (!items.length && !day.notes.length) return null;
  const hrefs = { photos: photosHref, receipts: receiptsHref };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 16, rowGap: 4 }}>
        {items.map((item) => {
          const value = itemValue(item, t, lang);
          const href = hrefs[item.key];
          return (
            <span key={item.key} style={{ whiteSpace: 'nowrap' }}>
              <Typography.Text type="secondary">{t(item.label)}</Typography.Text>{' '}
              {href ? (
                <Typography.Link href={href} onClick={(e) => e.stopPropagation()}>{value}</Typography.Link>
              ) : (
                <Typography.Text style={item.color ? { color: item.color } : undefined}>{value}</Typography.Text>
              )}
              {item.status && STATUS_LABELS[item.status] ? (
                <Typography.Text type="secondary">{` · ${t(STATUS_LABELS[item.status])}`}</Typography.Text>
              ) : null}
            </span>
          );
        })}
      </div>
      {day.notes.map((note) => (
        <Typography.Text key={note} type="secondary" style={{ whiteSpace: 'pre-line' }}>{note}</Typography.Text>
      ))}
    </div>
  );
}
