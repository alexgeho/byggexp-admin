import { useMemo } from 'react';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatMoney } from '@/src/utils/formatCurrency';

// "Totalt: … · Moms: …" for the ticked rows of a money table. One component for
// every list (Utlägg, Inköpsfakturor): pass it to AdminTable as
// `selectionSummary`. Mixed currencies are summed per currency and joined
// with "+".
export default function SelectionSums({ rows, amountKey = 'amount', vatKey = 'vat', fallbackCurrency = 'SEK' }) {
  const { t } = useLanguage();
  const sums = useMemo(() => {
    const byCurrency = new Map();
    (rows || []).forEach((row) => {
      const currency = row.currency || fallbackCurrency;
      const sum = byCurrency.get(currency) || { amount: 0, vat: 0 };
      sum.amount += Number(row[amountKey]) || 0;
      sum.vat += Number(row[vatKey]) || 0;
      byCurrency.set(currency, sum);
    });
    return [...byCurrency.entries()];
  }, [rows, amountKey, vatKey, fallbackCurrency]);

  if (!sums.length) return null;
  return (
    <span className="admin-table-selection-sum">
      <span>{t('Total')}: <b>{sums.map(([cur, sum]) => formatMoney(sum.amount, cur)).join(' + ')}</b></span>
      <span>·</span>
      <span>{t('VAT')}: <b>{sums.map(([cur, sum]) => formatMoney(sum.vat, cur)).join(' + ')}</b></span>
    </span>
  );
}
