import { useEffect, useRef, useState } from 'react';
import { DatePicker, Form, Typography, Spin, message } from 'antd';
import { ScanOutlined, PaperClipOutlined, FilePdfOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Field, Input, Textarea, Button } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';

// Common Swedish construction certificates/behörigheter offered as suggestions;
// the name field stays free-text so anything else can be typed in.
const COMMON_CERTIFICATES = [
  'Heta arbeten', 'ID06', 'Truckkort', 'Liftkort', 'Ställningsbyggnad',
  'Säkra lyft', 'BAS-U', 'BAS-P', 'Första hjälpen / HLR', 'ESA', 'APD-plan', 'Asbest',
];

const FORM_ID = 'certificate-form';
export { FORM_ID as CERTIFICATE_FORM_ID };

const fileNameFromUrl = (url) => {
  if (!url) return '';
  try {
    return decodeURIComponent(url.split('/').pop() || url);
  } catch {
    return url;
  }
};

const isPdf = (url) => /\.pdf($|\?)/i.test(url || '');
const toDate = (value) => {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d : null;
};

export default function CertificateForm({ userId, certificate = null, onSubmit }) {
  const t = useT();
  const [form] = Form.useForm();
  const fileInputRef = useRef(null);
  const [fileUrl, setFileUrl] = useState(certificate?.fileUrl || '');
  const [scanEnabled, setScanEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  // Fields OCR could not read on the last scan — nudge the user to fill them in.
  const [missing, setMissing] = useState([]);

  const name = Form.useWatch('name', form);
  const expiresAt = Form.useWatch('expiresAt', form);

  useEffect(() => {
    apiClient.get('/scan/status')
      .then(({ data }) => setScanEnabled(Boolean(data?.enabled)))
      .catch(() => setScanEnabled(false));
  }, []);

  useEffect(() => {
    setFileUrl(certificate?.fileUrl || '');
    setMissing([]);
    if (certificate) {
      form.setFieldsValue({
        name: certificate.name || '',
        number: certificate.number || '',
        issuer: certificate.issuer || '',
        issuedAt: toDate(certificate.issuedAt),
        expiresAt: toDate(certificate.expiresAt),
        notes: certificate.notes || '',
      });
    } else {
      form.resetFields();
    }
  }, [certificate, form]);

  // One gesture: the picked photo/PDF is stored as the document AND read by OCR.
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setMissing([]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // When OCR is on, this endpoint stores the file AND returns read fields;
      // otherwise it just stores the file and returns { fileUrl }.
      const endpoint = scanEnabled
        ? `/users/${userId}/certificates/scan`
        : `/users/${userId}/certificates/upload`;
      const { data } = await apiClient.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data?.fileUrl) setFileUrl(data.fileUrl);

      if (scanEnabled) {
        const patch = {};
        if (data?.name) patch.name = data.name;
        if (data?.number) patch.number = data.number;
        if (data?.issuer) patch.issuer = data.issuer;
        if (toDate(data?.issuedAt)) patch.issuedAt = toDate(data.issuedAt);
        if (toDate(data?.expiresAt)) patch.expiresAt = toDate(data.expiresAt);
        form.setFieldsValue(patch);

        const gaps = [];
        if (!form.getFieldValue('name')) gaps.push('name');
        if (!form.getFieldValue('expiresAt')) gaps.push('expiresAt');
        setMissing(gaps);

        message.success(gaps.length ? t('Scanned — please fill the rest') : t('Scanned — check the fields'));
      } else {
        message.success(t('File uploaded'));
      }
    } catch (error) {
      message.error(error?.response?.data?.message || t('Could not scan the document'));
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = (values) => {
    onSubmit({
      name: values.name?.trim(),
      number: values.number?.trim() || undefined,
      issuer: values.issuer?.trim() || undefined,
      issuedAt: values.issuedAt ? values.issuedAt.format('YYYY-MM-DD') : undefined,
      expiresAt: values.expiresAt ? values.expiresAt.format('YYYY-MM-DD') : undefined,
      fileUrl: fileUrl || undefined,
      notes: values.notes?.trim() || undefined,
    });
  };

  const nameMissing = missing.includes('name') && !name;
  const expiryMissing = missing.includes('expiresAt') && !expiresAt;

  return (
    <Form
      className="admin-modal-form"
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      id={FORM_ID}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Scan-first: photograph the certificate, dates read automatically. */}
      <div className="cert-scan">
        {fileUrl ? (
          <div className="cert-scan__file">
            {isPdf(fileUrl) ? (
              <div className="cert-scan__thumb cert-scan__thumb--pdf"><FilePdfOutlined /></div>
            ) : (
              <img className="cert-scan__thumb" src={fileUrl} alt="" />
            )}
            <div className="cert-scan__file-meta">
              <Typography.Link href={fileUrl} target="_blank" rel="noreferrer" className="cert-scan__file-name">
                <PaperClipOutlined /> {fileNameFromUrl(fileUrl)}
              </Typography.Link>
              <div className="cert-scan__file-actions">
                <Button variant="secondary" size="small" loading={busy} onClick={() => fileInputRef.current?.click()}>
                  {t('Replace')}
                </Button>
                <Button variant="secondary" size="small" icon={<CloseOutlined />} onClick={() => setFileUrl('')}>
                  {t('Remove')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" className="cert-scan__drop" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            {busy ? (
              <><Spin /> <span>{t('Reading the certificate…')}</span></>
            ) : (
              <>
                <ScanOutlined className="cert-scan__icon" />
                <span className="cert-scan__title">
                  {scanEnabled ? t('Scan certificate') : t('Upload certificate')}
                </span>
                <span className="cert-scan__hint">
                  {scanEnabled
                    ? t('Photo or PDF — we read the dates automatically')
                    : t('Photo or PDF — attached to the certificate')}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <Field
            name="name"
            label={t('Certificate')}
            rules={[{ required: true, message: t('Enter a certificate name') }]}
            validateStatus={nameMissing ? 'warning' : undefined}
            help={nameMissing ? t("Couldn't be read — please fill in") : undefined}
          >
            <Input placeholder={t('e.g. Heta arbeten, ID06')} list="certificate-suggestions" />
          </Field>
          <datalist id="certificate-suggestions">
            {COMMON_CERTIFICATES.map((n) => <option key={n} value={n} />)}
          </datalist>

          <Field name="number" label={t('Certificate no.')}>
            <Input placeholder={t('Certificate no.')} />
          </Field>

          <Field name="issuer" label={t('Issuer')}>
            <Input placeholder={t('Issuer')} />
          </Field>

          <Field name="issuedAt" label={t('Issued')}>
            <DatePicker format="YYYY-MM-DD" placeholder={t('Select date')} style={{ width: '100%' }} />
          </Field>

          <Field
            name="expiresAt"
            label={t('Expires')}
            rules={[{ required: true, message: t('Select an expiry date') }]}
            validateStatus={expiryMissing ? 'warning' : undefined}
            help={expiryMissing ? t("Couldn't be read — please fill in") : undefined}
          >
            <DatePicker format="YYYY-MM-DD" placeholder={t('Select date')} style={{ width: '100%' }} />
          </Field>

          <Field name="notes" label={t('Notes')} className="admin-modal-form__grid-item--full">
            <Textarea rows={2} placeholder={t('Notes')} />
          </Field>
        </div>
      </section>
    </Form>
  );
}
