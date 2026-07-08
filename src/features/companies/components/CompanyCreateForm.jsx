import { Form, message } from 'antd';
import { useEffect, useState } from 'react';
import { Field, Input, Select } from '@/src/ui-kit';
import { useCompanyStore } from '@/src/store/companyStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const CREATION_MODE_OPTIONS = [
  { value: 'simple', label: 'Company only' },
  { value: 'withAdmin', label: 'Company + Administrator' },
];

export default function CompanyCreateForm({ onClose, companyToEdit = null }) {
  const [form] = Form.useForm();
  const createCompany = useCompanyStore((state) => state.create);
  const updateCompany = useCompanyStore((state) => state.update);
  const registerWithAdmin = useCompanyStore((state) => state.registerWithAdmin);

  const [mode, setMode] = useState('simple');

  useEffect(() => {
    if (companyToEdit) {
      form.setFieldsValue({
        name: companyToEdit.name,
        address: companyToEdit.address,
        email: companyToEdit.email,
      });
      setMode('simple');
      return;
    }

    form.resetFields();
    setMode('simple');
  }, [companyToEdit, form]);

  const onFinish = async (values) => {
    try {
      if (companyToEdit) {
        const companyId = getEntityId(companyToEdit);
        if (!companyId) {
          throw new Error('Company id is missing');
        }
        await updateCompany(companyId, {
          name: values.name,
          address: values.address,
          email: values.email,
        });
        message.success('Company updated');
      } else if (mode === 'withAdmin') {
        await registerWithAdmin(values);
        message.success('Company and administrator created');
      } else {
        await createCompany(values);
        message.success('Company created');
      }
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(formatApiError(error, 'Failed to save company'));
    }
  };

  return (
    <Form
      className="admin-modal-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
      id="company-create-form"
    >
      {!companyToEdit ? (
        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">Mode</h3>
          <div className="admin-modal-form__grid">
            <div className="admin-modal-form__grid-item--full">
              <Field label="Creation mode">
                <Select
                  value={mode}
                  onChange={setMode}
                  options={CREATION_MODE_OPTIONS}
                  style={{ width: '100%' }}
                />
              </Field>
            </div>
          </div>
        </section>
      ) : null}

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Company</h3>
        <div className="admin-modal-form__grid">
          <Field
            name="name"
            label="Company name"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <Input placeholder="Company name" />
          </Field>

          <Field
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="Company email" />
          </Field>

          <div className="admin-modal-form__grid-item--full">
            <Field
              name="address"
              label="Address"
              rules={[{ required: true, message: 'Please enter address' }]}
            >
              <Input placeholder="Address" />
            </Field>
          </div>
        </div>
      </section>

      {!companyToEdit && mode === 'withAdmin' ? (
        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">Administrator</h3>
          <div className="admin-modal-form__grid">
            <Field
              name="adminName"
              label="Admin name"
              rules={[{ required: true, message: 'Please enter admin name' }]}
            >
              <Input placeholder="Administrator full name" />
            </Field>

            <Field
              name="adminEmail"
              label="Admin email"
              rules={[
                { required: true, message: 'Please enter admin email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input placeholder="Administrator email" />
            </Field>

            <div className="admin-modal-form__grid-item--full">
              <Field
                name="adminPassword"
                label="Admin password"
                rules={[
                  { required: true, message: 'Please enter password' },
                  { min: 6, message: 'Password must be at least 6 characters' },
                ]}
              >
                <Input.Password placeholder="Administrator password" />
              </Field>
            </div>

            <Field
              name="adminPhoneAreaCode"
              label="Admin phone area code"
              rules={[{ required: true, message: 'Please enter area code' }]}
            >
              <Input type="number" placeholder="7" />
            </Field>

            <Field
              name="adminPhoneNumber"
              label="Admin phone number"
              rules={[{ required: true, message: 'Please enter phone number' }]}
            >
              <Input type="number" placeholder="1234567890" />
            </Field>
          </div>
        </section>
      ) : null}
    </Form>
  );
}
