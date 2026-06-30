import { Select as AntSelect } from 'antd';
import './Select.scss';

function Select({ className = '', prefix, ...props }) {
  const classes = ['ui-select', className].filter(Boolean).join(' ');

  return <AntSelect className={classes} prefix={prefix} {...props} />;
}

Select.Option = AntSelect.Option;
Select.OptGroup = AntSelect.OptGroup;

export default Select;
