import { Modal } from 'antd';
import { Button } from '@/src/ui-kit';

export default function AdminModal({
  title,
  cancelText = 'Cancel',
  saveText = 'Save',
  saveForm,
  onSave,
  saveDisabled = false,
  saveLoading = false,
  children,
  className = '',
  width = 920,
  ...modalProps
}) {
  const modalClassName = ['admin-modal', className].filter(Boolean).join(' ');

  return (
    <Modal
      {...modalProps}
      centered
      className={modalClassName}
      classNames={{
        container: 'admin-modal__container',
        header: 'admin-modal__header',
        body: 'admin-modal__body',
        footer: 'admin-modal__footer',
        ...modalProps.classNames,
      }}
      closable={false}
      footer={
        <div className="admin-modal__footer-inner">
          <Button
            variant="secondary"
            onClick={modalProps.onCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            htmlType={saveForm ? 'submit' : 'button'}
            form={saveForm}
            onClick={saveForm ? undefined : onSave}
            disabled={saveDisabled}
            loading={saveLoading}
          >
            {saveText}
          </Button>
        </div>
      }
      maskClosable
      width={width}
      styles={{
        mask: {
          background: 'rgba(5, 45, 80, 0.24)',
        },
        container: {
          padding: 0,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(7, 43, 74, 0.16)',
        },
        body: {
          padding: 0,
        },
        footer: {
          margin: 0,
          padding: '0 20px 20px',
        },
        ...modalProps.styles,
      }}
      title={<div className="admin-modal__title">{title}</div>}
    >
      <div className="admin-modal__body-inner">
        {children}
      </div>
    </Modal>
  );
}
