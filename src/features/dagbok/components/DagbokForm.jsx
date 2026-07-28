import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Select, Space, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useDagbokStore } from '@/src/store/dagbokStore';
import { getEntityId } from '@/src/utils/entityId';
import { resolveToolPhotoUrl } from '@/src/utils/toolPhotos';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';

const today = () => new Date().toISOString().slice(0, 10);

export default function DagbokForm({ onClose, entryToEdit = null, defaultProjectId = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const [projects, setProjects] = useState([]);
  const [photos, setPhotos] = useState(entryToEdit?.photoUrls || []);
  const [uploading, setUploading] = useState(false);
  const create = useDagbokStore((s) => s.create);
  const update = useDagbokStore((s) => s.update);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const load = async () => {
      const url = user?.role === 'superadmin' ? '/projects' : '/projects/my';
      try {
        const { data } = await apiClient.get(url);
        setProjects(data || []);
      } catch {
        setProjects([]);
      }
    };
    load();
  }, [user?.role]);

  useEffect(() => {
    if (entryToEdit) {
      form.setFieldsValue({ ...entryToEdit, projectId: entryToEdit.projectId || undefined });
      setPhotos(entryToEdit.photoUrls || []);
      return;
    }
    form.resetFields();
    form.setFieldsValue({ date: today(), crewCount: 0, projectId: defaultProjectId || undefined });
    setPhotos([]);
  }, [form, entryToEdit, defaultProjectId]);

  const uploadPhoto = async (file) => {
    if (!entryToEdit) {
      message.info(t('Save the entry first, then attach photos'));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post(`/dagbok/${getEntityId(entryToEdit)}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotos(data?.photoUrls || []);
      message.success(t('Photo uploaded'));
    } catch (err) {
      message.error(formatApiError(err, 'Failed to upload photo'));
    } finally {
      setUploading(false);
    }
  };

  const onFinish = async (values) => {
    const payload = { ...values, crewCount: Number(values.crewCount) || 0 };
    try {
      if (entryToEdit) {
        await update(getEntityId(entryToEdit), payload);
      } else {
        await create(payload);
      }
      onClose?.();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, 'Failed to save diary entry'));
    }
  };

  return (
    <Form id="dagbok-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish}>
      <div className="invoice-form__grid">
        <Form.Item
          name="projectId"
          label={t('Project')}
          rules={[{ required: true, message: t('Select a project') }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            disabled={!!entryToEdit}
            placeholder={t('Select a project')}
            options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
          />
        </Form.Item>

        <Form.Item name="date" label={t('Date')}>
          <Input type="date" />
        </Form.Item>

        <Form.Item name="weather" label={t('Weather')}>
          <Input placeholder={t('e.g. Cloudy, light rain')} />
        </Form.Item>

        <Form.Item name="temperature" label={t('Temperature')}>
          <Input placeholder="+18°C" />
        </Form.Item>

        <Form.Item name="crewCount" label={t('Crew on site')}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="personnel" label={t('Personnel')}>
          <Input placeholder={t('Who was on site')} />
        </Form.Item>
      </div>

      <Form.Item name="workPerformed" label={t('Work performed')}>
        <Input.TextArea rows={3} />
      </Form.Item>

      <Form.Item name="deviations" label={t('Deviations / obstacles')}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <Form.Item name="materials" label={t('Deliveries / materials')}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <Form.Item name="notes" label={t('Notes')}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <Form.Item label={t('Photos')}>
        {photos.length ? (
          <Space wrap style={{ marginBottom: 8 }}>
            {photos.map((url) => (
              <a key={url} href={resolveToolPhotoUrl(url)} target="_blank" rel="noreferrer">
                <img
                  src={resolveToolPhotoUrl(url)}
                  alt="foto"
                  style={{ height: 72, width: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
              </a>
            ))}
          </Space>
        ) : (
          <div style={{ color: 'var(--muted, #64748b)', fontSize: 13, marginBottom: 8 }}>
            {t('No photos yet')}
          </div>
        )}
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => { void uploadPhoto(file); return false; }}
        >
          <Button icon={<UploadOutlined />} loading={uploading} disabled={!entryToEdit}>
            {t('Add photo')}
          </Button>
        </Upload>
      </Form.Item>
    </Form>
  );
}
