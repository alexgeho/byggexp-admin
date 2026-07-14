import { Select as AntSelect } from 'antd';
import './Select.scss';

const defaultSuffixIcon = (
  <span className="ui-select__chevron" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 6L8 11L13 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

function Select({ className = '', prefix, suffixIcon, ...props }) {
  const classes = ['ui-select', className].filter(Boolean).join(' ');

  return (
    <AntSelect
      className={classes}
      prefix={prefix}
      suffixIcon={suffixIcon === undefined ? defaultSuffixIcon : suffixIcon}
      {...props}
    />
  );
}

Select.Option = AntSelect.Option;
Select.OptGroup = AntSelect.OptGroup;

export default Select;
