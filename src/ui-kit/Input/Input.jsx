import { Input as AntInput } from 'antd';
import './Input.scss';

function Input({ className = '', ...props }) {
  const classes = ['ui-input', className].filter(Boolean).join(' ');

  return <AntInput className={classes} {...props} />;
}

function Password({ className = '', ...props }) {
  const classes = ['ui-input', className].filter(Boolean).join(' ');

  return <AntInput.Password className={classes} {...props} />;
}

Input.Password = Password;

export default Input;
