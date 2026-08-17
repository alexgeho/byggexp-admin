import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatSek } from '@/src/utils/formatCurrency';
import { APPROVAL_TYPE } from '@/src/features/mywork/myWorkUtils';

// One row in the inline "To approve" inbox. Presentational — approve/reject/view
// are delegated to the page, which knows the per-type store actions.
export default function ApprovalRow({ row, onApprove, onReject, onView }) {
  const t = useT();
  const meta = APPROVAL_TYPE[row.type];
  return (
    <div className="mywork__appr-row">
      <span className={`mywork__appr-type mywork__appr-type--${meta.tone}`}>{t(meta.label)}</span>
      <div className="mywork__appr-main">
        <span className="mywork__appr-primary">{row.primary}</span>
        {row.secondary ? <span className="mywork__appr-secondary">{row.secondary}</span> : null}
      </div>
      {row.amount != null ? <span className="mywork__appr-amount">{formatSek(row.amount, { decimals: false })}</span> : null}
      <div className="mywork__appr-actions">
        {row.type === 'certificate' ? (
          <button type="button" className="mywork__mini" onClick={() => onView(row)}>
            <EyeOutlined /> {t('View')}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="mywork__mini mywork__mini--ok"
              onClick={() => onApprove(row)}
            >
              <CheckOutlined /> {t('Approve')}
            </button>
            {row.type !== 'supplier' ? (
              <button
                type="button"
                className="mywork__mini mywork__mini--no"
                aria-label={t('Reject')}
                onClick={() => onReject(row)}
              >
                <CloseOutlined />
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
