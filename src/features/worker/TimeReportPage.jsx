import { useState } from 'react';
import { Form, Input, DatePicker, InputNumber, Button, Upload, message, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useT } from '@/src/i18n/LanguageProvider';

const { TextArea } = Input;

export default function TimeReportPage() {
  const t = useT();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async () => {
    setLoading(true);
    try {
      message.success(t('Time report saved'));
      form.resetFields();
    } catch {
      message.error(t('Failed to save time report'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title={t('Time Report')} style={{ maxWidth: '600px', margin: '0 auto' }}>
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

          <Form.Item
            name="date"
            label={t('Date')}
            rules={[{ required: true, message: t('Please select a date') }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="hours"
            label={t('Hours')}
            rules={[
              { required: true, message: t('Please enter the number of hours') },
              { type: 'number', min: 0.5, max: 24, message: t('Hours must be between 0.5 and 24') },
            ]}
          >
            <InputNumber min={0.5} max={24} step={0.5} style={{ width: '100%' }} placeholder="8" />
          </Form.Item>

          <Form.Item
            name="description"
            label={t('Work description')}
            rules={[{ required: true, message: t('Please enter a description') }]}
          >
            <TextArea rows={4} placeholder={t('What was done?')} />
          </Form.Item>

          <Form.Item name="photos" label={t('Photos')}>
            <Upload listType="picture">
              <Button icon={<UploadOutlined />}>{t('Upload photos')}</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('Save report')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
