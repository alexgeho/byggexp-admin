import { useCallback, useMemo, useState } from 'react';
import { Modal } from 'antd';
import { Button } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import { ModalActionsContext } from '@/src/shared/components/modalActions';

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
  // Components inside that render the primary action themselves (a wizard's
  // step bar) claim the actions via useOwnModalActions(); only then is the
  // built-in Cancel/Save row hidden. See modalActions.js.
  const [ownActionClaims, setOwnActionClaims] = useState(0);
  const claim = useCallback(() => {
    setOwnActionClaims((n) => n + 1);
    return () => setOwnActionClaims((n) => n - 1);
  }, []);
  const actionsContext = useMemo(() => ({ claim }), [claim]);
  const modalClassName = ['admin-modal', className].filter(Boolean).join(' ');
  // `footer` optionally REPLACES the built-in Cancel/Save row with other
  // buttons. It cannot hide the actions: `null` falls back to the default row,
  // so a form is never left without a way to submit. A body that draws its own
  // primary action hides the row itself via useOwnModalActions().
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

  const actions = ownActionClaims > 0 ? null : (footer ?? builtInFooter);

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
        <ModalActionsContext.Provider value={actionsContext}>
          {children}
        </ModalActionsContext.Provider>
      </div>
    </Modal>
  );
}
