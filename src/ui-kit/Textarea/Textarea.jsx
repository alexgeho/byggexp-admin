import { Input as AntInput } from 'antd';
import './Textarea.scss';

export default function Textarea({ className = '', ...props }) {
  const classes = ['ui-textarea', className].filter(Boolean).join(' ');

  return <AntInput.TextArea className={classes} {...props} />;
}
