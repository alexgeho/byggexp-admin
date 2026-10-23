'use client';

import { useState } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Input, Modal, Tabs, Upload } from 'antd';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';

// Builds a draft agreement version from a Byggnads / Byggföretagen PDF or
// pasted circular text. The figures are read by AI into a DRAFT; nothing is
// published until a superadmin has checked every number.
export default function DraftFromDocumentModal({ open, onClose, onCreated }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState('pdf');
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setText('');
    setTab('pdf');
  };

  const submit = async () => {
    const body = new FormData();
    if (tab === 'pdf') {
      if (!file) {
        appMessage.warning(t('Choose a PDF first'));
        return;
      }
      body.append('file', file);
    } else {
      if (!text.trim()) {
        appMessage.warning(t('Paste the text first'));
        return;
      }
      body.append('text', text);
    }
    setBusy(true);
    try {
      const res = await apiClient.post('/payroll-basis/rules/draft-from-document', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      });
      appMessage.success(t('Draft created — check every figure before publishing'));
      reset();
      onCreated?.(res.data);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not read the document'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('Draft from agreement document')}
      open={open}
      onCancel={() => { reset(); onClose(); }}
      onOk={submit}
      okText={t('Create draft')}
      cancelText={t('Cancel')}
      confirmLoading={busy}
      width={640}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={t('AI reads the figures the document states and creates a draft with a quote for each. Rules the document does not mention are copied from the current version.')}
      />
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'pdf',
            label: 'PDF',
            children: (
              <Upload.Dragger
                accept="application/pdf"
                maxCount={1}
                beforeUpload={(f) => { setFile(f); return false; }}
                onRemove={() => setFile(null)}
                fileList={file ? [{ uid: '1', name: file.name, status: 'done' }] : []}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p>{t('Drop the agreement or circular PDF here')}</p>
              </Upload.Dragger>
            ),
          },
          {
            key: 'text',
            label: t('Text'),
            children: (
              <Input.TextArea
                rows={10}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('Paste the circular text, e.g. from byggnads.se')}
              />
            ),
          },
        ]}
      />
    </Modal>
  );
}
