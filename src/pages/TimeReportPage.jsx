import { useState } from 'react';
import { Form, Input, DatePicker, InputNumber, Button, Upload, message, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { TextArea } = Input;

export default function TimeReportPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async () => {
    setLoading(true);
    try {
      message.success('Отчёт по времени сохранён');
      form.resetFields();
    } catch {
      message.error('Ошибка сохранения отчёта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="Отчёт по времени" style={{ maxWidth: '600px', margin: '0 auto' }}>
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

          <Form.Item
            name="date"
            label="Дата"
            rules={[{ required: true, message: 'Выберите дату' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="hours"
            label="Количество часов"
            rules={[
              { required: true, message: 'Введите количество часов' },
              { type: 'number', min: 0.5, max: 24, message: 'Часы должны быть от 0.5 до 24' },
            ]}
          >
            <InputNumber min={0.5} max={24} step={0.5} style={{ width: '100%' }} placeholder="8" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание работ"
            rules={[{ required: true, message: 'Введите описание' }]}
          >
            <TextArea rows={4} placeholder="Что было сделано?" />
          </Form.Item>

          <Form.Item name="photos" label="Фотографии">
            <Upload listType="picture">
              <Button icon={<UploadOutlined />}>Загрузить фото</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Сохранить отчёт
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
