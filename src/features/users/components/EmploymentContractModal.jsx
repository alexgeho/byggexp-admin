import { useEffect, useState } from 'react';
import { Checkbox, Form, Radio } from 'antd';
import { DownloadOutlined, MailOutlined } from '@ant-design/icons';
import { Button, Field, Input } from '@/src/ui-kit';
import AdminModal from '@/src/shared/components/AdminModal';
import { appMessage } from '@/src/utils/appMessage';
import { formatApiError } from '@/src/utils/formError';
import { useT } from '@/src/i18n/LanguageProvider';
import useEmploymentContract from '@/src/features/users/useEmploymentContract';

const FORM_ID = 'employment-contract-form';

// «Redigera anställningsavtal» (owner 19.11: "make it possible to change"):
// opened only from the menu, never by itself. Every field of the contract,
// filled from the company and worker cards or from the last saved edit. Save
// keeps it on the worker; download / e-mail save first and then use it.
export default function EmploymentContractModal({ open, worker, onClose, onSaved }) {
  const t = useT();
  const [form] = Form.useForm();
  const contract = useEmploymentContract();
  const [saving, setSaving] = useState(false);
  const employmentForm = Form.useWatch('employmentForm', form);
  const overtime = Form.useWatch('overtime', form);
  const collectiveAgreement = Form.useWatch('collectiveAgreement', form);

  useEffect(() => {
    if (!open || !worker) return;
    let active = true;
    contract.defaults(worker).then((values) => { if (active) form.setFieldsValue(values); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per opening
  }, [open, worker, form]);

  const saveValues = async () => {
    const values = { ...form.getFieldsValue(true) };
    setSaving(true);
    try {
      const saved = await contract.save(worker, values);
      onSaved?.(saved);
      return saved;
    } catch (err) {
      appMessage.error(formatApiError(err, t('Could not save')));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const onFinish = async () => {
    if (await saveValues()) {
      appMessage.success(t('Saved'));
      onClose?.();
    }
  };

  const saveAnd = async (mode) => {
    const saved = await saveValues();
    if (saved) await contract.run(mode, [worker], saved);
  };

  const text = (name, label) => (
    <Field name={name} label={t(label)}>
      <Input />
    </Field>
  );

  const footer = (
    <div className="admin-modal__footer-inner">
      <Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button>
      <Button variant="secondary" icon={<DownloadOutlined />} loading={contract.busy} onClick={() => saveAnd('download')}>
        {t('Download PDF')}
      </Button>
      <Button variant="secondary" icon={<MailOutlined />} loading={contract.busy} onClick={() => saveAnd('mail')}>
        {t('Send by e-mail')}
      </Button>
      <Button variant="primary" htmlType="submit" form={FORM_ID} loading={saving}>{t('Save')}</Button>
    </div>
  );

  return (
    <AdminModal
      title={t('Employment contract')}
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={920}
      footer={footer}
    >
      <Form className="admin-modal-form" form={form} layout="vertical" onFinish={onFinish} id={FORM_ID}>
        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Employer')}</h3>
          <div className="admin-modal-form__grid">
            {text('employerName', 'Company')}
            {text('employerOrgNumber', 'Org. number')}
            {text('employerAddress', 'Address')}
            {text('employerPhone', 'Phone')}
            {text('employerPostalCode', 'Postal code')}
            {text('employerCity', 'City')}
          </div>
        </section>

        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Employee')}</h3>
          <div className="admin-modal-form__grid">
            {text('employeeName', 'Name')}
            {text('employeePersonalNumber', 'Personal number')}
            {text('employeeAddress', 'Address')}
            {text('employeePhone', 'Phone')}
            {text('employeePostalCode', 'Postal code')}
            {text('employeeCity', 'City')}
          </div>
        </section>

        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Employment details')}</h3>
          <div className="admin-modal-form__grid">
            {text('position', 'Position')}
            {text('workplace', 'Workplace')}
            <div className="admin-modal-form__grid-item--full">{text('duties', 'Duties')}</div>
            {text('startDate', 'Start date')}
            {text('hoursPerWeek', 'Hours per week')}
            {text('vacationDays', 'Vacation days per year')}
            {text('salary', 'Salary')}
            {text('payday', 'Salary payment day')}
            {text('benefits', 'Other benefits')}
            <Field name="collectiveAgreement" valuePropName="checked" label=" ">
              <Checkbox>{t('Covered by a collective agreement')}</Checkbox>
            </Field>
            {collectiveAgreement ? text('collectiveAgreementName', 'Collective agreement') : null}
          </div>
        </section>

        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Form of employment')}</h3>
          <div className="admin-modal-form__grid">
            <Field name="employmentForm" label={t('Form of employment')}>
              <Radio.Group
                options={[
                  { value: 'tillsvidare', label: t('Permanent employment') },
                  { value: 'prov', label: t('Probationary employment') },
                  { value: 'tidsbegransad', label: t('Fixed-term employment') },
                  { value: 'behov', label: t('Intermittent employment (as needed)') },
                  { value: 'annan', label: t('Other') },
                ]}
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              />
            </Field>
            <div>
              {employmentForm === 'prov' ? text('probationUntil', 'Probation until (e.g. 6 months)') : null}
              {employmentForm === 'tidsbegransad' ? text('endDate', 'Agreed end date') : null}
              {employmentForm === 'annan' ? text('employmentFormOther', 'Other form of employment') : null}
            </div>
          </div>
        </section>

        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Working hours')}</h3>
          <div className="admin-modal-form__grid">
            <Field name="workingTime" label={t('Working hours')}>
              <Radio.Group
                options={[
                  { value: 'heltid', label: t('Full time') },
                  { value: 'deltid', label: t('Part time') },
                  { value: 'varierande', label: t('Varying working hours') },
                ]}
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              />
            </Field>
          </div>
        </section>

        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Overtime compensation')}</h3>
          <div className="admin-modal-form__grid">
            <Field name="overtime" label={t('Overtime compensation')}>
              <Radio.Group
                options={[
                  { value: 'kollektivavtal', label: t('According to the collective agreement in force') },
                  { value: 'sarskildKollektivavtal', label: t('Special agreement based on the collective agreement') },
                  { value: 'sarskild', label: t('Special agreement') },
                ]}
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              />
            </Field>
            <div>{overtime === 'sarskild' ? text('overtimeOther', 'The special agreement means') : null}</div>
            <div className="admin-modal-form__grid-item--full">{text('otherTerms', 'Other terms')}</div>
          </div>
        </section>

        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Signatures')}</h3>
          <div className="admin-modal-form__grid">
            {text('employerPlaceDate', 'Employer: place and date')}
            {text('employeePlaceDate', 'Employee: place and date')}
            {text('employerSigner', 'Employer: name')}
          </div>
        </section>
      </Form>
    </AdminModal>
  );
}
