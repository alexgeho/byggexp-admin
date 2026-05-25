import { Button, Drawer } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

export default function AdminDrawer({
  title,
  saveText = 'Save',
  saveForm,
  saveDisabled = false,
  saveLoading = false,
  children,
  className = '',
  width = 560,
  ...drawerProps
}) {
  const drawerClassName = ['admin-drawer', className].filter(Boolean).join(' ');

  return (
    <Drawer
      {...drawerProps}
      className={drawerClassName}
      classNames={{
        wrapper: 'admin-drawer__wrapper',
        section: 'admin-drawer__section',
        header: 'admin-drawer__header',
        body: 'admin-drawer__body',
        ...drawerProps.classNames,
      }}
      closeIcon={false}
      footer={null}
      maskClosable
      width={width}
      styles={{
        mask: {
          background: 'rgba(255, 255, 255, 0.08)',
        },
        wrapper: {
          overflow: 'hidden',
        },
        section: {
          background: 'rgba(238, 245, 251, 1)',
          borderRadius: '30px 0 0 30px',
          boxShadow: '-11px 4px 20.9px 0 rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        },
        header: {
          padding: '18px 18px 0',
          background: 'transparent',
          borderBottom: 'none',
        },
        body: {
          padding: '18px',
          background: 'transparent',
        },
        ...drawerProps.styles,
      }}
      title={
        <div className="admin-drawer__header-inner">
          <Button
            className="admin-drawer__close"
            aria-label="Close drawer"
            icon={<CloseOutlined />}
            onClick={drawerProps.onClose}
          />
          <div className="admin-drawer__title">{title}</div>
          <Button
            className="admin-drawer__save"
            type="primary"
            htmlType="submit"
            form={saveForm}
            disabled={saveDisabled}
            loading={saveLoading}
          >
            {saveText}
          </Button>
        </div>
      }
    >
      {children}
    </Drawer>
  );
}
