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
      message.success('Time report saved');
      form.resetFields();
    } catch {
      message.error('Failed to save time report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="Time Report" style={{ maxWidth: '600px', margin: '0 auto' }}>
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

          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select a date' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="hours"
            label="Hours"
            rules={[
              { required: true, message: 'Please enter the number of hours' },
              { type: 'number', min: 0.5, max: 24, message: 'Hours must be between 0.5 and 24' },
            ]}
          >
            <InputNumber min={0.5} max={24} step={0.5} style={{ width: '100%' }} placeholder="8" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Work description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <TextArea rows={4} placeholder="What was done?" />
          </Form.Item>

          <Form.Item name="photos" label="Photos">
            <Upload listType="picture">
              <Button icon={<UploadOutlined />}>Upload photos</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Save report
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
