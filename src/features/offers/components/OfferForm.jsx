import { useEffect, useMemo, useState } from 'react';
import { AutoComplete, Button, DatePicker, Divider, Form, Input, InputNumber, Select, Space, message } from 'antd';
import dayjs from 'dayjs';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useOfferStore } from '@/src/store/offerStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';
import RichTextEditor from '@/src/shared/components/RichTextEditor';
import { useCompanyCountry, useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { documentCurrency } from '@/src/config/markets';
import { formatAmountIn } from '@/src/features/invoicing/components/invoiceFormUtils';

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
const CUSTOMER_FIELDS = ['contactPerson', 'phone', 'address', 'orgNumber', 'postalCode', 'city'];

export default function OfferForm({ onClose, offerToEdit = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const activeCurrency = useCompanyCurrency();
  const activeCountry = useCompanyCountry();
  // Saved offers keep their own currency; new ones follow the company (NO = NOK).
  const fmt = (value) => formatAmountIn(value, documentCurrency(offerToEdit, activeCountry, activeCurrency));
  const [companies, setCompanies] = useState([]);
  const createOffer = useOfferStore((state) => state.create);
  const updateOffer = useOfferStore((state) => state.update);
  const fetchNextNumber = useOfferStore((state) => state.fetchNextNumber);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const watchedCompanyId = Form.useWatch('companyId', form);
  const watchedItems = Form.useWatch('items', form);
  const isPrivateCustomer = Form.useWatch('clientType', form) === 'private';
  const totals = useMemo(() => calculateTotals(watchedItems || []), [watchedItems]);
  const [articles, setArticles] = useState([]);
  const [clients, setClients] = useState([]);

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

  // Existing clients — so "Kund / företag" is a picker of created customers
  // (free text is still allowed for a one-off customer).
  useEffect(() => {
    let active = true;
    apiClient
      .get('/clients')
      .then(({ data }) => { if (active) setClients(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setClients([]); });
    return () => { active = false; };
  }, []);

  // A client's display name: company name for businesses, first name for private
  // persons, with sensible fallbacks.
  const clientLabel = (c) => {
    const person = `${c?.firstName || ''} ${c?.lastName || ''}`.trim();
    const names = c?.clientType === 'private'
      ? [person, c?.companyName]
      : [c?.companyName, person];
    return (names.find(Boolean) || c?.name || c?.email || '').trim();
  };

  // Options for the customer AutoComplete, de-duplicated by label.
  const clientOptions = useMemo(() => {
    const seen = new Set();
    return clients
      .map((c) => ({ label: clientLabel(c), email: c.email || '' }))
      .filter((o) => o.label && !seen.has(o.label) && seen.add(o.label))
      .map((o) => ({ value: o.label, email: o.email }));
  }, [clients]);

  // Picking an existing client fills all its details straight away.
  const handleClientSelect = (value) => {
    const match = clients.find((c) => clientLabel(c) === value);
    if (!match) return;
    const isPrivate = match.clientType === 'private';
    form.setFieldsValue({
      clientType: isPrivate ? 'private' : 'company',
      email: match.email || '',
      contactPerson: isPrivate ? '' : (match.contactPerson || ''),
      phone: match.phone || match.mobile || '',
      address: match.address || '',
      orgNumber: (isPrivate ? match.personalNumber : match.orgNumber) || '',
      postalCode: match.postalCode || '',
      city: match.city || '',
    });
  };

  // A customer typed by hand (not in the register) is saved as a client along
  // with the offer, so it never has to be created separately first. Best
  // effort: the offer is saved even if this fails.
  const saveNewClient = async (values) => {
    const { companyName: name, email, companyId } = values;
    const typed = String(name || '').trim();
    if (!typed) return;
    const known = clients.some((c) => clientLabel(c).toLowerCase() === typed.toLowerCase());
    if (known) return;
    try {
      const details = Object.fromEntries(
        CUSTOMER_FIELDS.map((key) => [key, String(values[key] || '').trim()]),
      );
      const isPrivate = values.clientType === 'private';
      if (isPrivate) {
        // A private person is stored by first / last name and personal number.
        const [firstName, ...rest] = typed.split(/\s+/);
        Object.assign(details, {
          firstName,
          lastName: rest.join(' '),
          personalNumber: details.orgNumber,
          orgNumber: '',
          contactPerson: '',
        });
      }
      const { data } = await apiClient.post('/clients', {
        clientType: isPrivate ? 'private' : 'company',
        ...(isPrivate ? {} : { companyName: typed }),
        email: String(email || '').trim(),
        ...details,
        ...(companyId ? { companyId } : {}),
      });
      if (data) setClients((list) => [data, ...list]);
    } catch {
      // ignore — the customer can still be added from the register
    }
  };

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

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    const fetchCompanies = async () => {
      try {
        const res = await apiClient.get('/company');
        setCompanies(res.data || []);
      } catch (err) {
        message.warning(formatApiError(err, t('Failed to load companies')));
      }
    };

    fetchCompanies();
  }, [isSuperAdmin, t]);

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
        contactPersons: [DEFAULT_CONTACT],
      });

      const companyId = user?.companyId;
      if (!isSuperAdmin || companyId) {
        const nextNumber = await fetchNextNumber(isSuperAdmin ? companyId : undefined);
        form.setFieldValue('offerNumber', nextNumber);
      }
    };

    initForm();
  }, [fetchNextNumber, form, isSuperAdmin, offerToEdit, user]);

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
        unit: emptyToUndefined(item?.unit) || 'st',
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
    >
      <div className="invoice-form__grid">
        {isSuperAdmin ? (
          <Form.Item
            name="companyId"
            label={t('Company')}
            rules={[{ required: true, message: t('Please select company') }]}
          >
            <Select placeholder={t('Select company')}>
              {companies.map((company) => (
                <Select.Option key={getEntityId(company)} value={getEntityId(company)}>
                  {company.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ) : null}

        <Form.Item name="offerNumber" label={t('Offer no.')}>
          <Input readOnly placeholder={t('Generated on save')} />
        </Form.Item>

        <Form.Item name="status" label={t('Status')}>
          <Select options={STATUS_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))} />
        </Form.Item>

        <Form.Item name="date" label={t('Offer date')} {...isoDateProps}>
          <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="validUntil" label={t('Valid until')} {...isoDateProps}>
          <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
        </Form.Item>

        {/* Customer: company or private person — the type decides the fields.
            All details are optional and printed on the offer when filled in. */}
        <Form.Item name="clientType" label={t('Client type')}>
          <Select
            options={[
              { value: 'company', label: t('Business') },
              { value: 'private', label: t('Private person') },
            ]}
          />
        </Form.Item>

        <Form.Item name="companyName" label={isPrivateCustomer ? t('Name') : t('Customer / company')}>
          <AutoComplete
            options={clientOptions}
            onSelect={handleClientSelect}
            filterOption={(input, option) => (
              (option?.value || '').toLowerCase().includes((input || '').toLowerCase())
            )}
            placeholder={t('Choose a customer or type a new one')}
          />
        </Form.Item>

        <Form.Item name="orgNumber" label={isPrivateCustomer ? t('Personnummer') : t('Org no.')}>
          <Input />
        </Form.Item>

        {isPrivateCustomer ? null : (
          <Form.Item name="contactPerson" label={t('Contact person')}>
            <Input />
          </Form.Item>
        )}

        <Form.Item name="email" label={t('Email')}>
          <Input type="email" placeholder="customer@example.com" />
        </Form.Item>

        <Form.Item name="phone" label={t('Phone')}>
          <Input />
        </Form.Item>

        <Form.Item name="address" label={t('Address')}>
          <Input />
        </Form.Item>

        <Form.Item name="postalCode" label={t('Postal code')}>
          <Input />
        </Form.Item>

        <Form.Item name="city" label={t('City')}>
          <Input />
        </Form.Item>

        <Form.Item name="subtitle" label={t('Title')}>
          <Input placeholder={t('Offer title')} />
        </Form.Item>
      </div>

      <Form.Item name="description" label={t('Description')}>
        <RichTextEditor placeholder={t('Describe the work included in the offer')} />
      </Form.Item>

      <Divider orientation="left">{t('Offer rows')}</Divider>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <div className="invoice-form__items">
            <div className="invoice-form__items-scroll">
              {fields.map(({ key, name, ...restField }) => (
                <div className="invoice-form__item offer-form__item" key={key}>
                  <Form.Item {...restField} name={[name, 'articleNumber']} label={t('Art.nr')}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      // the list is as wide as the article names, not as the narrow field
                      popupMatchSelectWidth={false}
                      placeholder={t('Select')}
                      notFoundContent={t('No articles — add one under Articles')}
                      options={articles.map((article) => ({
                        value: article.articleNumber || getEntityId(article),
                        label: [article.articleNumber, article.name].filter(Boolean).join(' ') || '—',
                      }))}
                      onChange={(value) => applyArticleToRow(name, value)}
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    className="invoice-form__description"
                    name={[name, 'description']}
                    label={t('Description')}
                    rules={[{ required: true, message: t('Please enter description') }]}
                  >
                    <Input.TextArea rows={1} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'quantity']} label={t('Qty')}>
                    <InputNumber min={0} precision={2} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'unit']} label={t('Unit')}>
                    <Input />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'price']} label={t('À-price')}>
                    <InputNumber min={0} precision={2} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'discount']} hidden>
                    <InputNumber min={0} max={100} precision={2} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'vatRate']} hidden>
                    <InputNumber />
                  </Form.Item>
                  <Form.Item label={t('Amount')}>
                    <InputNumber
                      value={getRowAmount(watchedItems?.[name])}
                      precision={2}
                      disabled
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => remove(name)}
                    disabled={fields.length === 1}
                    aria-label={t('Remove offer row')}
                  />
                </div>
              ))}
            </div>
            <Button icon={<PlusOutlined />} onClick={() => add(DEFAULT_ITEM)}>
              {t('Add row')}
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
      </div>

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
    </Form>
  );
}
