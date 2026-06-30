import { Button as AntButton } from 'antd';
import './Button.scss';

export default function Button({
  className = '',
  variant = 'primary',
  type,
  ...props
}) {
  const resolvedType = type ?? (variant === 'primary' ? 'primary' : undefined);
  const classes = ['ui-button', `ui-button--${variant}`, className].filter(Boolean).join(' ');

  return <AntButton className={classes} type={resolvedType} {...props} />;
}
