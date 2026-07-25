import { Form, Switch, message } from 'antd';
import { useEffect } from 'react';
import { Field, Input } from '@/src/ui-kit';
import { useCompanyStore } from '@/src/store/companyStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

export default function CompanyCreateForm({ onClose, companyToEdit = null }) {
  const [form] = Form.useForm();
  const createCompany = useCompanyStore((state) => state.create);
  const updateCompany = useCompanyStore((state) => state.update);

  useEffect(() => {
    if (companyToEdit) {
      form.setFieldsValue({
        name: companyToEdit.name,
        address: companyToEdit.address,
        email: companyToEdit.email,
        city: companyToEdit.city,
        phone: companyToEdit.phone,
        website: companyToEdit.website,
        orgNumber: companyToEdit.orgNumber,
        vatNumber: companyToEdit.vatNumber,
        vatStatus: companyToEdit.vatStatus,
      });
      return;
    }

    form.resetFields();
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
          city: values.city,
          phone: values.phone,
          website: values.website,
          orgNumber: values.orgNumber,
          vatNumber: values.vatNumber,
          vatStatus: values.vatStatus,
        });
        message.success('Company updated');
      } else {
        await createCompany(values);
        message.success(`Company created — login details emailed to ${values.email}`);
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
      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <Field
            name="email"
            label="Email (login)"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="Company email" />
          </Field>

          <Field name="name" label="Company name">
            <Input placeholder="Company name" />
          </Field>

          <div className="admin-modal-form__grid-item--full">
            <Field name="address" label="Address">
              <Input placeholder="Address" />
            </Field>
          </div>

          <Field name="city" label="Postal code / city">
            <Input placeholder="116 31 Stockholm" />
          </Field>

          <Field name="phone" label="Phone">
            <Input placeholder="+46..." />
          </Field>

          <Field name="website" label="Website">
            <Input placeholder="https://..." />
          </Field>

          <Field name="orgNumber" label="Org no.">
            <Input placeholder="Org no." />
          </Field>

          <Field name="vatNumber" label="VAT reg no.">
            <Input placeholder="VAT reg no." />
          </Field>

          <Field name="vatStatus" label="F-skatt" valuePropName="checked">
            <Switch checkedChildren="On" unCheckedChildren="Off" />
          </Field>
        </div>
      </section>
    </Form>
  );
}
