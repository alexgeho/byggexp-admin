import { useEffect, useState } from 'react';
import { Form, Upload, message } from 'antd';
import { Field, Select, Textarea, Button } from '@/src/ui-kit';
import { API_BASE_URL } from '@/src/config/apiConfig';
import { useBugReportStore } from '@/src/store/bugReportStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
import BugReportAttachmentPreview, {
  isVideoAttachment,
} from '@/src/features/bug-reports/components/BugReportAttachmentPreview';

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
  const previewAttachment = attachmentFile || existingAttachment;
  const previewUrl = attachmentFile ? null : existingAttachmentUrl;
  const previewIsVideo = previewAttachment
    ? isVideoAttachment(previewAttachment, previewUrl || attachmentFile?.name)
    : false;

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
      message.error('Add a description or attach an image or video');
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
            <Field label="Attachment">
              {previewAttachment && (previewUrl || attachmentFile) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <BugReportAttachmentPreview
                    attachment={previewAttachment}
                    url={previewUrl}
                    width={120}
                    height={120}
                    alt={existingAttachment?.name || 'Bug report attachment'}
                  />
                  {(existingAttachmentUrl || attachmentFile) ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (attachmentFile) {
                          setAttachmentFile(null);
                          return;
                        }
                        handleRemoveExistingAttachment();
                      }}
                    >
                      {previewIsVideo ? 'Remove video' : 'Remove image'}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <Upload
                accept="image/*,video/*"
                maxCount={1}
                beforeUpload={(file) => {
                  const isImage = file.type?.startsWith('image/');
                  const isVideo = file.type?.startsWith('video/');

                  if (!isImage && !isVideo) {
                    message.error('Only image or video files are allowed');
                    return Upload.LIST_IGNORE;
                  }

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
                  {existingAttachmentUrl || attachmentFile
                    ? previewIsVideo
                      ? 'Replace video'
                      : 'Replace image'
                    : 'Select image or video'}
                </Button>
              </Upload>
            </Field>
          </div>
        </div>
      </section>
    </Form>
  );
}
