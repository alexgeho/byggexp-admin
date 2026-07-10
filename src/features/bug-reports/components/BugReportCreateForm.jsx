import { useEffect, useState } from 'react';
import { Form, Image, Upload, message } from 'antd';
import { Field, Select, Textarea, Button } from '@/src/ui-kit';
import { API_BASE_URL } from '@/src/config/apiConfig';
import { useBugReportStore } from '@/src/store/bugReportStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
];

const resolveAttachmentUrl = (value) => {
  if (!value) {
    return null;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

export default function BugReportCreateForm({ onClose, bugReportToEdit = null }) {
  const [form] = Form.useForm();
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);
  const createBugReport = useBugReportStore((state) => state.create);
  const updateBugReport = useBugReportStore((state) => state.update);
  const isEditing = Boolean(bugReportToEdit);
  const existingAttachment = bugReportToEdit?.attachment;
  const existingAttachmentUrl = !removeExistingAttachment
    ? resolveAttachmentUrl(existingAttachment?.url)
    : null;

  useEffect(() => {
    if (bugReportToEdit) {
      form.setFieldsValue({
        message: bugReportToEdit.message || '',
        status: bugReportToEdit.status || 'open',
      });
      setAttachmentFile(null);
      setRemoveExistingAttachment(false);
      return;
    }

    form.resetFields();
    setAttachmentFile(null);
    setRemoveExistingAttachment(false);
  }, [bugReportToEdit, form]);

  const onFinish = async (values) => {
    const trimmedMessage = values.message?.trim() || '';
    const hasExistingAttachment = Boolean(existingAttachmentUrl);

    if (!trimmedMessage && !attachmentFile && !hasExistingAttachment) {
      message.error('Add a description or attach an image');
      return;
    }

    const formData = new FormData();

    if (isEditing) {
      formData.append('message', trimmedMessage);
      formData.append('status', values.status || 'open');
    } else if (trimmedMessage) {
      formData.append('message', trimmedMessage);
    }

    if (attachmentFile) {
      formData.append('attachment', attachmentFile);
    }

    if (isEditing && removeExistingAttachment && !attachmentFile) {
      formData.append('removeAttachment', 'true');
    }

    try {
      if (isEditing) {
        const bugReportId = getEntityId(bugReportToEdit);
        if (!bugReportId) {
          throw new Error('Bug report id is missing');
        }
        await updateBugReport(bugReportId, formData);
      } else {
        await createBugReport(formData);
      }

      onClose();
      form.resetFields();
      setAttachmentFile(null);
      setRemoveExistingAttachment(false);
    } catch (error) {
      message.error(formatApiError(error, isEditing ? 'Failed to update bug report' : 'Failed to send bug report'));
    }
  };

  const handleRemoveExistingAttachment = () => {
    setRemoveExistingAttachment(true);
    setAttachmentFile(null);
  };

  return (
    <Form
      id="bug-report-create-form"
      className="admin-modal-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      {isEditing ? (
        <section className="admin-modal-form__section">
          <div className="admin-modal-form__grid">
            <Field
              name="status"
              label="Status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select options={STATUS_OPTIONS} placeholder="Select status" />
            </Field>
          </div>
        </section>
      ) : null}

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="message" label="Description">
              <Textarea rows={5} placeholder="Describe the problem" />
            </Field>
          </div>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field label="Screenshot">
              {existingAttachmentUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Image
                    src={existingAttachmentUrl}
                    alt={existingAttachment?.name || 'Bug report attachment'}
                    width={72}
                    height={72}
                    style={{ borderRadius: 8, objectFit: 'cover' }}
                  />
                  <Button variant="secondary" onClick={handleRemoveExistingAttachment}>
                    Remove image
                  </Button>
                </div>
              ) : null}

              <Upload
                accept="image/*"
                maxCount={1}
                beforeUpload={(file) => {
                  setAttachmentFile(file);
                  setRemoveExistingAttachment(true);
                  return false;
                }}
                onRemove={() => setAttachmentFile(null)}
                fileList={
                  attachmentFile
                    ? [{ uid: '-1', name: attachmentFile.name, status: 'done' }]
                    : []
                }
              >
                <Button variant="secondary">
                  {existingAttachmentUrl || attachmentFile ? 'Replace image' : 'Select image'}
                </Button>
              </Upload>
            </Field>
          </div>
        </div>
      </section>
    </Form>
  );
}
