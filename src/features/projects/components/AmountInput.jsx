import { InputNumber } from 'antd';

// A space-grouped SEK/amount InputNumber used across the project form's budget
// fields. Form.Item injects value/onChange via {...props}.
const amountFieldFormatter = (value) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const amountFieldParser = (value) => (value ? value.replace(/\s/g, '') : '');

export default function AmountInput(props) {
  return (
    <InputNumber
      min={0}
      controls={false}
      placeholder="0"
      style={{ width: '100%' }}
      formatter={amountFieldFormatter}
      parser={amountFieldParser}
      {...props}
    />
  );
}
