import { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Divider, Form, Input, Select, Space, message } from 'antd';
import dayjs from 'dayjs';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import DocumentCustomerFields, { CUSTOMER_FIELDS, useDocumentCustomer } from '@/src/features/clients/components/DocumentCustomerFields';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useOfferStore } from '@/src/store/offerStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';
import RichTextEditor from '@/src/shared/components/RichTextEditor';
import { useCompanyCountry, useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { documentCurrency } from '@/src/config/markets';
import useWizardDraft from '@/src/shared/hooks/useWizardDraft';
import { formatAmountIn, vatRateOptionsFor } from '@/src/features/invoicing/components/invoiceFormUtils';
import InvoiceRows from '@/src/features/invoicing/components/InvoiceRows';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const DEFAULT_CONTACT = {
  role: 'Projektledare',
  name: '',
};

const DEFAULT_ITEM = {
  articleNumber: '',
  description: '',
  quantity: 1,
  unit: 'st',
  price: 0,
  discount: 0,
  vatRate: 25,
};

const getRowAmount = (item) => {
  const quantity = Number(item?.quantity || 0);
  const price = Number(item?.price || 0);
  const discount = Number(item?.discount || 0);
  return quantity * price * (1 - discount / 100);
};

const calculateTotals = (items = []) => {
  let subtotal = 0;
  let vat = 0;
  items.forEach((item) => {
    const net = getRowAmount(item);
    subtotal += net;
    vat += net * (Number(item?.vatRate ?? 25) / 100);
  });
  return { subtotal, vat, total: subtotal + vat };
};

const emptyToUndefined = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const today = () => new Date().toISOString().slice(0, 10);

// Form keeps dates as 'YYYY-MM-DD' strings (payload unchanged); the picker shows them in the same format.
const isoDateProps = {
  getValueProps: (value) => ({ value: value ? dayjs(value) : null }),
  normalize: (value) => (value ? value.format('YYYY-MM-DD') : undefined),
};

// Optional customer details stored on the offer and printed on its PDF.

export default function OfferForm({ onClose, offerToEdit = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const activeCurrency = useCompanyCurrency();
  const activeCountry = useCompanyCountry();
  // Saved offers keep their own currency; new ones follow the company (NO = NOK).
  const fmt = (value) => formatAmountIn(value, documentCurrency(offerToEdit, activeCountry, activeCurrency));
  const createOffer = useOfferStore((state) => state.create);
  const updateOffer = useOfferStore((state) => state.update);
  const fetchNextNumber = useOfferStore((state) => state.fetchNextNumber);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const watchedCompanyId = Form.useWatch('companyId', form);
  const watchedItems = Form.useWatch('items', form);
  const totals = useMemo(() => calculateTotals(watchedItems || []), [watchedItems]);
  const [articles, setArticles] = useState([]);

  // Articles catalog — same source the invoice form uses. Picking an article
  // fills the row (description, price, unit) and its VAT rate, which drives moms.
  useEffect(() => {
    let active = true;
    apiClient
      .get('/articles')
      .then(({ data }) => { if (active) setArticles(data || []); })
      .catch(() => { if (active) setArticles([]); });
    return () => { active = false; };
  }, []);

  // Customer block (shared with the invoice form): new or existing customer,
  // details, and saving a hand-typed customer to the register on save.
  const customer = useDocumentCustomer(form);
  const { saveNewClient } = customer;

  // Fill a row from the chosen article, keeping anything already typed. Mirrors
  // the invoice form's applyArticleToRow so offers and invoices behave the same.
  const applyArticleToRow = (rowIndex, articleNumber) => {
    if (!articleNumber) return;
    const article = articles.find((item) => (
      String(item.articleNumber || '') === String(articleNumber)
      || getEntityId(item) === articleNumber
    ));
    if (!article) return;

    const items = [...(form.getFieldValue('items') || [])];
    const current = items[rowIndex] || {};
    const hasDescription = current.description && String(current.description).trim();
    const hasPrice = current.price !== undefined && current.price !== null
      && current.price !== '' && Number(current.price) !== 0;
    items[rowIndex] = {
      ...current,
      articleNumber: article.articleNumber || '',
      description: hasDescription ? current.description : (article.name || ''),
      price: hasPrice ? current.price : (article.priceExclMoms ?? 0),
      vatRate: article.momsPercent ?? current.vatRate ?? 25,
      unit: current.unit || 'st',
      quantity: current.quantity ?? 1,
      discount: current.discount ?? 0,
    };
    form.setFieldsValue({ items });
  };

  // Autosave (19.11): what is typed is kept in this browser and comes back after
  // a reload or a closed tab; cleared once the offer is saved. Restored at the
  // end of the init below so the defaults never overwrite it.
  const draft = useWizardDraft({
    storageKey: `byggexp.draft.offer.${user?.companyId || 'none'}.${offerToEdit ? getEntityId(offerToEdit) : 'new'}`,
    form,
    enabled: true,
    autoRestore: false,
  });

  useEffect(() => {
    const initForm = async () => {
      if (offerToEdit) {
        form.setFieldsValue({
          ...offerToEdit,
          clientType: offerToEdit.clientType === 'private' ? 'private' : 'company',
          items: offerToEdit.items?.length ? offerToEdit.items : [DEFAULT_ITEM],
          contactPersons: offerToEdit.contactPersons?.length
            ? offerToEdit.contactPersons
            : [DEFAULT_CONTACT],
        });
        draft.restore();
        return;
      }

      form.resetFields();
      form.setFieldsValue({
        companyId: user?.companyId,
        date: today(),
        // Valid for 30 days by default (owner, 17.11); still editable.
        validUntil: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        status: 'draft',
        clientType: 'company',
        items: [DEFAULT_ITEM],
        // The first contact person is the signed-in user (the name shown in
        // the header), still editable.
        contactPersons: [{ ...DEFAULT_CONTACT, name: user?.name || '' }],
      });
      draft.restore();

      const companyId = user?.companyId;
      if (!isSuperAdmin || companyId) {
        const nextNumber = await fetchNextNumber(isSuperAdmin ? companyId : undefined);
        form.setFieldValue('offerNumber', nextNumber);
      }
    };

    initForm();
  }, [draft, fetchNextNumber, form, isSuperAdmin, offerToEdit, user]);

  useEffect(() => {
    if (offerToEdit || !isSuperAdmin || !watchedCompanyId) {
      return;
    }

    fetchNextNumber(watchedCompanyId)
      .then((nextNumber) => {
        if (nextNumber) {
          form.setFieldValue('offerNumber', nextNumber);
        }
      })
      .catch(() => {});
  }, [fetchNextNumber, form, isSuperAdmin, offerToEdit, watchedCompanyId]);

  const onFinish = async (values) => {
    const payload = {
      ...values,
      companyName: emptyToUndefined(values.companyName),
      email: emptyToUndefined(values.email),
      ...Object.fromEntries(CUSTOMER_FIELDS.map((key) => [key, String(values[key] || '').trim()])),
      clientType: values.clientType === 'private' ? 'private' : 'company',
      // A private customer has no contact person line.
      ...(values.clientType === 'private' ? { contactPerson: '' } : {}),
      subtitle: emptyToUndefined(values.subtitle),
      description: emptyToUndefined(values.description),
      clarifications: emptyToUndefined(values.clarifications),
      contactPersons: (values.contactPersons || [])
        .map((contact) => ({
          role: emptyToUndefined(contact.role) || '',
          name: emptyToUndefined(contact.name) || '',
        }))
        .filter((contact) => contact.role || contact.name),
      items: (values.items || []).map((item) => ({
        ...DEFAULT_ITEM,
        ...item,
        description: emptyToUndefined(item?.description) || '',
        unit: item?.isText ? '' : (emptyToUndefined(item?.unit) || 'st'),
      })),
      subtotal: totals.subtotal,
      vat: totals.vat,
      total: totals.total,
    };

    delete payload.offerNumber;

    try {
      await saveNewClient(values);
      if (offerToEdit) {
        await updateOffer(getEntityId(offerToEdit), payload);
      } else {
        await createOffer(payload);
      }

      draft.clear();
      onClose?.();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, t('Failed to save offer')));
    }
  };

  return (
    <Form
      id="offer-form"
      className="invoice-form offer-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
      onValuesChange={() => draft.save()}
    >
      <div className="invoice-form__grid">
        {/* Company: always the signed-in company (as on the invoice form), no picker. */}
        <Form.Item name="companyId" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="offerNumber" label={t('Offer no.')}>
          <Input readOnly placeholder={t('Generated on save')} />
        </Form.Item>

        <Form.Item name="subtitle" label={t('Title')}>
          <Input placeholder={t('Offer title')} />
        </Form.Item>

        <Form.Item name="date" label={t('Offer date')} {...isoDateProps}>
          <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="validUntil" label={t('Valid until')} {...isoDateProps}>
          <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
        </Form.Item>

        {/* Customer: the block shared with the invoice form. */}
        <DocumentCustomerFields customer={customer} />

        {offerToEdit ? (
          <Form.Item name="status" label={t('Status')}>
            <Select options={STATUS_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))} />
          </Form.Item>
        ) : null}
      </div>

      <Form.Item name="description" label={t('Description')}>
        <RichTextEditor placeholder={t('Describe the work included in the offer')} />
      </Form.Item>

      <Divider orientation="left">{t('Offer rows')}</Divider>

      {/* Rows: the same component as the invoice form (article, text rows). */}
      <InvoiceRows
        articles={articles}
        watchedItems={watchedItems}
        onApplyArticle={applyArticleToRow}
        vatRateOptions={vatRateOptionsFor(activeCountry)}
      />

      <Form.Item name="clarifications" label={t('Clarifications')}>
        <RichTextEditor placeholder={t('Clarifications, assumptions, exclusions')} />
      </Form.Item>

      <Divider orientation="left">{t('Contact persons')}</Divider>

      <Form.List name="contactPersons">
        {(fields, { add, remove }) => (
          <div className="offer-form__contacts">
            {fields.map(({ key, name, ...restField }) => (
              <Space key={key} className="offer-form__contact" align="start">
                <Form.Item {...restField} name={[name, 'role']} label={t('Role')}>
                  <Input placeholder={t('Project manager')} />
                </Form.Item>
                <Form.Item {...restField} name={[name, 'name']} label={t('Name')}>
                  <Input placeholder={t('Name')} />
                </Form.Item>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(name)}
                  disabled={fields.length === 1}
                  aria-label={t('Remove contact person')}
                />
              </Space>
            ))}
            <Button icon={<PlusOutlined />} onClick={() => add(DEFAULT_CONTACT)}>
              {t('Add contact person')}
            </Button>
          </div>
        )}
      </Form.List>

      <div className="invoice-form__totals">
        <Space size="large" wrap className="invoice-form__totals-content">
          <strong>{t('Excl. VAT')}: {fmt(totals.subtotal)}</strong>
          <strong>{t('VAT')}: {fmt(totals.vat)}</strong>
          <strong>{t('Total')}: {fmt(totals.total)}</strong>
        </Space>
        {/* The save button travels with the sticky totals bar (same as the
            invoice form), so it is reachable from anywhere in the form. */}
        <Space className="invoice-form__actions">
          <Button
            type="primary"
            size="large"
            className="invoice-form__save"
            onClick={() => form.submit()}
          >
            {offerToEdit ? t('Save offer') : t('Create offer')}
          </Button>
        </Space>
      </div>
    </Form>
  );
}
