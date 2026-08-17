import { useState } from 'react';
import { Form, Input, Upload, Button, message, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useT } from '@/src/i18n/LanguageProvider';

export default function UploadPage() {
  const t = useT();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);

  const onFinish = async () => {
    setLoading(true);
    try {
      if (!fileList.length) {
        message.warning(t('Please select files to upload'));
        setLoading(false);
        return;
      }

      message.success(t('Photos uploaded'));
      setFileList([]);
      form.resetFields();
    } catch {
      message.error(t('Failed to upload files'));
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    fileList,
    onChange: ({ fileList: newFileList }) => setFileList(newFileList),
    multiple: true,
    accept: 'image/*',
    maxCount: 10,
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title={t('Upload photos')} style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          disabled={loading}
        >
          <Form.Item
            name="projectId"
            label={t('Project')}
            rules={[{ required: true, message: t('Please select a project') }]}
          >
            <Input placeholder={t('Project ID (will be replaced with a selector)')} />
          </Form.Item>

          <Form.Item name="comment" label={t('Comment')}>
            <Input.TextArea rows={3} placeholder={t('Comment for the uploaded photos')} />
          </Form.Item>

          <Form.Item label={t('Photos')} required>
            <Upload {...uploadProps} listType="picture">
              <Button icon={<UploadOutlined />}>{t('Select files')}</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('Upload')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
