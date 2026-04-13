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
        message.warning('Выберите файлы для загрузки');
        setLoading(false);
        return;
      }

      message.success('Фотографии загружены');
      setFileList([]);
      form.resetFields();
    } catch {
      message.error('Ошибка загрузки файлов');
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
      <Card title="Загрузка фотографий" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          disabled={loading}
        >
          <Form.Item
            name="projectId"
            label="Проект"
            rules={[{ required: true, message: 'Выберите проект' }]}
          >
            <Input placeholder="ID проекта (будет выбор из списка)" />
          </Form.Item>

          <Form.Item name="comment" label="Комментарий">
            <Input.TextArea rows={3} placeholder="Комментарий к фотографиям" />
          </Form.Item>

          <Form.Item label="Фотографии" required>
            <Upload {...uploadProps} listType="picture">
              <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Загрузить
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
