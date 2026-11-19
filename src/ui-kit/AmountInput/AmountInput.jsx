import { InputNumber } from 'antd';

// Money field (owner 19.11): a space after every thousand — "71 400.00",
// "2 000 000.00" — in every amount field of the admin. The decimals are left
// as typed; only the whole-number part is grouped. Form.Item injects
// value/onChange via {...props}.
export const formatAmount = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const [whole, ...rest] = String(value).split(/([.,])/);
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + rest.join('');
};

export const parseAmount = (value) => (value ? String(value).replace(/\s/g, '') : '');

// With a custom formatter antd no longer pads the decimals, so a field with
// `precision` shows "2 000 000.00" (not "2 000 000") while it is not typed in.
export const formatAmountWithPrecision = (precision) => (value, info) => {
  if (value === undefined || value === null || value === '') return '';
  const typing = info?.userTyping;
  const n = Number(String(value).replace(',', '.'));
  const shown = precision !== undefined && !typing && Number.isFinite(n) ? n.toFixed(precision) : value;
  return formatAmount(shown);
};

export default function AmountInput({ precision, ...props }) {
  return (
    <InputNumber
      style={{ width: '100%' }}
      precision={precision}
      formatter={formatAmountWithPrecision(precision)}
      parser={parseAmount}
      {...props}
    />
  );
}
