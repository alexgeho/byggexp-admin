import { Form } from 'antd';

function FieldControl({ name, rules, valuePropName, getValueFromEvent, children }) {
  if (name == null) {
    return children;
  }

  return (
    <Form.Item
      name={name}
      noStyle
      rules={rules}
      valuePropName={valuePropName}
      getValueFromEvent={getValueFromEvent}
    >
      {children}
    </Form.Item>
  );
}

export default function AdminFormField({
  name,
  label,
  rules,
  extra,
  valuePropName,
  getValueFromEvent,
  layout = 'row',
  className = 'project-create-form__item',
  rowClassName = 'project-create-form__row',
  icon = null,
  fieldLabel = null,
  children,
}) {
  if (layout === 'switch') {
    return (
      <Form.Item className={className} label={label} extra={extra}>
        <div className={rowClassName}>
          {fieldLabel ? (
            <div className="project-create-form__switch-label">{fieldLabel}</div>
          ) : null}
          <FieldControl
            name={name}
            rules={rules}
            valuePropName={valuePropName}
            getValueFromEvent={getValueFromEvent}
          >
            {children}
          </FieldControl>
        </div>
      </Form.Item>
    );
  }

  if (layout === 'note') {
    return (
      <Form.Item className={className} label={label} extra={extra}>
        <div className="project-create-form__field-main">
          {fieldLabel ? (
            <div className="project-create-form__field-label">{fieldLabel}</div>
          ) : null}
          <FieldControl
            name={name}
            rules={rules}
            valuePropName={valuePropName}
            getValueFromEvent={getValueFromEvent}
          >
            {children}
          </FieldControl>
        </div>
      </Form.Item>
    );
  }

  return (
    <Form.Item className={className} label={label} extra={extra}>
      <div className={rowClassName}>
        {icon ? <span className="project-create-form__icon">{icon}</span> : null}
        <div className="project-create-form__field-main">
          {fieldLabel ? (
            <div className="project-create-form__field-label">{fieldLabel}</div>
          ) : null}
          <FieldControl
            name={name}
            rules={rules}
            valuePropName={valuePropName}
            getValueFromEvent={getValueFromEvent}
          >
            {children}
          </FieldControl>
        </div>
      </div>
    </Form.Item>
  );
}
