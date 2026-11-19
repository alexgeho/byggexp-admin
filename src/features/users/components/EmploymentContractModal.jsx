import { useEffect, useState } from 'react';
import { Checkbox, Form, Radio } from 'antd';
import dayjs from 'dayjs';
import { Field, Input } from '@/src/ui-kit';
import AdminModal from '@/src/shared/components/AdminModal';
import { useCompanyStore } from '@/src/store/companyStore';
import { useAuthStore } from '@/src/store/authStore';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { downloadEmploymentContractPdf } from '@/src/features/users/employmentContractPdf';

const FORM_ID = 'employment-contract-form';

// Swedish salary line from the worker's hourly rate: "216,34 kr/t brutto".
const salaryFrom = (rate) => {
  const n = Number(rate);
  return n > 0 ? `${String(Math.round(n * 100) / 100).replace('.', ',')} kr/t brutto` : '';
};

// «Anställningsavtal» (owner 19.11, client's paper template): the contract of
// a worker, filled from the company and the worker, every field editable, and
// downloaded as a two-page PDF. Nothing is stored — the PDF is the result.
export default function EmploymentContractModal({ open, worker, onClose }) {
  const t = useT();
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const company = useCompanyStore((state) => state.currentCompany);
  const fetchMy = useCompanyStore((state) => state.fetchMy);
  const me = useAuthStore((state) => state.user);
  const employmentForm = Form.useWatch('employmentForm', form);
  const overtime = Form.useWatch('overtime', form);
  const collectiveAgreement = Form.useWatch('collectiveAgreement', form);

  useEffect(() => {
    if (open && !company) fetchMy().catch(() => {});
  }, [open, company, fetchMy]);

  useEffect(() => {
    if (!open) return;
    const today = dayjs().format('YYYY-MM-DD');
    // The company card keeps "168 32 Bromma" in one field — split it.
    const cityLine = String(company?.city || '').trim();
    const postal = cityLine.match(/^(\d{3}\s?\d{2})\s+(.*)$/);
    const city = postal ? postal[2] : cityLine;
    form.setFieldsValue({
      employerName: company?.name || '',
      employerOrgNumber: company?.orgNumber || '',
      employerAddress: String(company?.address || '').trim().replace(/,$/, ''),
      employerPostalCode: postal ? postal[1] : (company?.postalCode || ''),
      employerCity: city,
      employerPhone: company?.phone || '',
      employeeName: worker?.name || '',
      employeePersonalNumber: worker?.personalNumber || '',
      employeeAddress: worker?.address || '',
      employeePostalCode: worker?.postalCode || '',
      employeeCity: worker?.city || '',
      employeePhone: worker?.phone || '',
      position: worker?.profession || '',
      workplace: city,
      duties: '',
      startDate: today,
      hoursPerWeek: '40',
      vacationDays: '25',
      salary: salaryFrom(worker?.hourlyRate),
      payday: '25:e',
      benefits: '',
      collectiveAgreement: false,
      collectiveAgreementName: '',
      employmentForm: 'prov',
      probationUntil: '',
      endDate: '',
      employmentFormOther: '',
      workingTime: 'heltid',
      overtime: 'kollektivavtal',
      overtimeOther: '',
      otherTerms: '',
      employerPlaceDate: [city, today].filter(Boolean).join(' '),
      employerSigner: me?.name || '',
      employeePlaceDate: [city, today].filter(Boolean).join(' '),
    });
  }, [open, worker, company, me, form]);

  const onFinish = async (values) => {
    setBusy(true);
    try {
      const base = `anstallningsavtal-${String(values.employeeName || 'arbetstagare').trim().replace(/\s+/g, '-')}`;
      await downloadEmploymentContractPdf(values, base);
    } catch {
      appMessage.error(t('Could not create the PDF'));
    } finally {
      setBusy(false);
    }
  };

  const text = (name, label) => (
    <Field name={name} label={t(label)}>
      <Input />
    </Field>
  );

  return (
    <AdminModal
      title={t('Employment contract')}
      saveText={t('Download PDF')}
      saveForm={FORM_ID}
      saveLoading={busy}
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={920}
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
