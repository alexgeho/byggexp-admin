import { Form } from 'antd';
import './Field.scss';

export default function Field({
  label,
  name,
  rules,
  children,
  className = '',
  ...formItemProps
}) {
  const classes = ['ui-field', className].filter(Boolean).join(' ');

  return (
    <Form.Item
      className={classes}
      colon={false}
      label={label}
      name={name}
      rules={rules}
      {...formItemProps}
    >
      {children}
    </Form.Item>
  );
}
