import { useState } from 'react';
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

// Multi-select closes its list after each pick (owner rule, design-system.md),
// unless the caller controls `open` itself.
function Select({ className = '', prefix, suffixIcon, ...props }) {
  const classes = ['ui-select', className].filter(Boolean).join(' ');
  const [open, setOpen] = useState(false);
  const autoClose = props.mode === 'multiple' && props.open === undefined;
  const closeProps = autoClose ? {
    open,
    onOpenChange: (next, ...rest) => { setOpen(next); props.onOpenChange?.(next, ...rest); },
    onSelect: (...args) => { setOpen(false); props.onSelect?.(...args); },
  } : {};

  return (
    <AntSelect
      className={classes}
      prefix={prefix}
      suffixIcon={suffixIcon === undefined ? defaultSuffixIcon : suffixIcon}
      {...props}
      {...closeProps}
    />
  );
}

Select.Option = AntSelect.Option;
Select.OptGroup = AntSelect.OptGroup;

export default Select;
