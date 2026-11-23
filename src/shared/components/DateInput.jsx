import React from 'react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

// Date field that always shows and types year-month-day (2026-11-23), whatever
// the browser's language. The native date input draws the date in the browser
// locale (07/27/2026 on an English Mac) — owner 23.11: «должно быть
// год-месяц-день во всех местах» (design-system: «Даты в формах … ГГГГ-ММ-ДД»).
//
// Drop-in for the native date input: value is a 'YYYY-MM-DD' string ('' when
// empty) and onChange gets an event-like { target: { value } }, so antd
// Form.Item and `e.target.value` handlers keep working unchanged. min/max are
// 'YYYY-MM-DD' strings like on the native input.
export const DATE_FORMAT = 'YYYY-MM-DD';

export default function DateInput({ value, onChange, min, max, style, ...rest }) {
  const parsed = value ? dayjs(value, DATE_FORMAT) : null;
  const disabledDate = (d) =>
    Boolean((min && d.isBefore(dayjs(min, DATE_FORMAT), 'day')) || (max && d.isAfter(dayjs(max, DATE_FORMAT), 'day')));
  return (
    <DatePicker
      {...rest}
      format={DATE_FORMAT}
      value={parsed && parsed.isValid() ? parsed : null}
      onChange={(d) => onChange?.({ target: { value: d ? d.format(DATE_FORMAT) : '' } })}
      disabledDate={min || max ? disabledDate : undefined}
      placeholder="ÅÅÅÅ-MM-DD"
      style={{ width: '100%', ...style }}
    />
  );
}
