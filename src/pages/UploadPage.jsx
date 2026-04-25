import { useState } from 'react';
import { Form, Input, Upload, Button, message, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

export default function UploadPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);

  const onFinish = async () => {
    setLoading(true);
    try {
      if (!fileList.length) {
        message.warning('Please select files to upload');
        setLoading(false);
        return;
      }

      message.success('Photos uploaded');
      setFileList([]);
      form.resetFields();
    } catch {
      message.error('Failed to upload files');
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
      <Card title="Upload photos" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          disabled={loading}
        >
          <Form.Item
            name="projectId"
            label="Project"
            rules={[{ required: true, message: 'Please select a project' }]}
          >
            <Input placeholder="Project ID (will be replaced with a selector)" />
          </Form.Item>

          <Form.Item name="comment" label="Comment">
            <Input.TextArea rows={3} placeholder="Comment for the uploaded photos" />
          </Form.Item>

          <Form.Item label="Photos" required>
            <Upload {...uploadProps} listType="picture">
              <Button icon={<UploadOutlined />}>Select files</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Upload
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
