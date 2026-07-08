import { InboxOutlined } from '@ant-design/icons';
import { Upload } from 'antd';
import './DragNDrop.scss';

export default function DragNDrop({
  className = '',
  icon,
  title = 'Click or drag files to this area to upload',
  description = 'Support for single or bulk upload.',
  children,
  ...props
}) {
  const classes = ['ui-dragndrop', className].filter(Boolean).join(' ');

  return (
    <Upload.Dragger className={classes} {...props}>
      {children || (
        <div className="ui-dragndrop__content">
          <div className="ui-dragndrop__icon">
            {icon || <InboxOutlined />}
          </div>
          <p className="ui-dragndrop__title">{title}</p>
          {description ? (
            <p className="ui-dragndrop__description">{description}</p>
          ) : null}
        </div>
      )}
    </Upload.Dragger>
  );
}
