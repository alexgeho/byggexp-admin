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

export default function AmountInput(props) {
  return (
    <InputNumber
      style={{ width: '100%' }}
      formatter={formatAmount}
      parser={parseAmount}
      {...props}
    />
  );
}
