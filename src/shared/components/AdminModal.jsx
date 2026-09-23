import { Modal } from 'antd';
import { Button } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';

export default function AdminModal({
  title,
  cancelText,
  saveText,
  saveForm,
  onSave,
  saveDisabled = false,
  saveLoading = false,
  children,
  className = '',
  width = 920,
  footer,
  ...modalProps
}) {
  const t = useT();
  const modalClassName = ['admin-modal', className].filter(Boolean).join(' ');
  // `footer` is an optional override: pass `null` to hide the built-in
  // Cancel/Save row (e.g. when the body renders its own wizard nav), or a node
  // to replace it. Leaving it undefined keeps the default footer.
  // The actions render in the header (top-right, next to the title), which sits
  // outside the scrolling body — so they stay visible however long the form is.
  const builtInFooter = (
    <div className="admin-modal__footer-inner">
          <Button
            variant="secondary"
            onClick={modalProps.onCancel}
          >
            {cancelText ?? t('Cancel')}
          </Button>
          <Button
            variant="primary"
            htmlType={saveForm ? 'submit' : 'button'}
            form={saveForm}
            onClick={saveForm ? undefined : onSave}
            disabled={saveDisabled}
            loading={saveLoading}
          >
            {saveText ?? t('Save')}
          </Button>
        </div>
  );

  const actions = footer !== undefined ? footer : builtInFooter;

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
      footer={null}
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
      title={(
        <div className="admin-modal__titlebar">
          <div className="admin-modal__title">{title}</div>
          {actions ? <div className="admin-modal__actions">{actions}</div> : null}
        </div>
      )}
    >
      <div className="admin-modal__body-inner">
        {children}
      </div>
    </Modal>
  );
}
