import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Divider, Form, Input, InputNumber, Select, Space, Switch, message } from 'antd';
import { DeleteOutlined, MailOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import SendInvoiceModal from '@/src/features/invoicing/components/SendInvoiceModal';
import { formatClientAddress, getClientDisplayName } from '@/src/features/clients/clientUtils';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const VAT_RATE_OPTIONS = [25, 12, 6, 0].map((value) => ({
  value,
  label: `${value}%`,
}));

const DEFAULT_ITEM = {
  articleNumber: '',
  description: '',
  quantity: 1,
  unit: 'st',
  price: 0,
  discount: 0,
  vatRate: 25,
};

// Units that mark a row as labour/hours — used to remember which article the
// client bills labour under, and to pre-fill it on repeat invoices.
const HOUR_UNITS = new Set(['tim', 'timme', 'timmar', 'timma', 'h', 'hr', 'hrs', 'hour', 'hours', 't']);
const isHourRow = (item) => HOUR_UNITS.has(String(item?.unit || '').trim().toLowerCase());

const emptyToUndefined = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const today = () => new Date().toISOString().slice(0, 10);

const calculateTotals = (items = [], reverseVAT = false) => {
  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item?.quantity || 0);
    const price = Number(item?.price || 0);
    const discount = Number(item?.discount || 0);
    return sum + quantity * price * (1 - discount / 100);
  }, 0);
  const vat = reverseVAT
    ? 0
    : items.reduce((sum, item) => {
      const quantity = Number(item?.quantity || 0);
      const price = Number(item?.price || 0);
      const discount = Number(item?.discount || 0);
      const vatRate = Number(item?.vatRate ?? 25);
      return sum + quantity * price * (1 - discount / 100) * (vatRate / 100);
    }, 0);

  return {
    subtotal,
    vat,
    total: subtotal + vat,
  };
};

const formatAmount = (value) => new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value || 0);

const getRowAmount = (item) => {
  const quantity = Number(item?.quantity || 0);
  const price = Number(item?.price || 0);
  const discount = Number(item?.discount || 0);
  return quantity * price * (1 - discount / 100);
};

const addDaysToDate = (days) => {
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due.toISOString().slice(0, 10);
};

export default function InvoiceForm({ onClose, invoiceToEdit = null, submitLabel = '', prefill = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const [clients, setClients] = useState([]);
  const [articles, setArticles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendInvoice, setSendInvoice] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(undefined);
  const prefillAppliedRef = useRef(false);
  const createInvoice = useInvoiceStore((state) => state.create);
  const updateInvoice = useInvoiceStore((state) => state.update);
  const user = useAuthStore((state) => state.user);
  const watchedItems = Form.useWatch('items', form);
  const watchedReverseVAT = Form.useWatch('reverseVAT', form);
  const watchedCompanyId = Form.useWatch('companyId', form);
  const watchedRotEnabled = Form.useWatch('rotEnabled', form);
  const watchedRotLabor = Form.useWatch('rotLaborAmount', form);
  const totals = useMemo(
    () => calculateTotals(watchedItems || [], Boolean(watchedReverseVAT)),
    [watchedItems, watchedReverseVAT],
  );

  // Preview of ROT deduction + öresavrundning (the backend recomputes these
  // authoritatively on save). ROT = 30% of labour, capped at 50 000 kr.
  const settlement = useMemo(() => {
    const rotDeduction = watchedRotEnabled
      ? Math.min(0.3 * (Number(watchedRotLabor) || 0), 50000)
      : 0;
    const payable = totals.total - rotDeduction;
    const roundedTotal = Math.round(payable);
    return { rotDeduction, rounding: roundedTotal - payable, roundedTotal };
  }, [watchedRotEnabled, watchedRotLabor, totals.total]);

  const effectiveCompanyId = watchedCompanyId || user?.companyId;

  // companyId can arrive as a raw id or a populated { _id } object — normalize
  // before comparing, otherwise every client/article gets filtered out and the
  // dropdowns look empty.
  const sameCompany = (value) => {
    const id = value && typeof value === 'object' ? (value._id || value.id) : value;
    return String(id) === String(effectiveCompanyId);
  };

  const filteredClients = useMemo(() => {
    if (!effectiveCompanyId) {
      return clients;
    }

    return clients.filter((client) => sameCompany(client.companyId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, effectiveCompanyId]);

  const filteredArticles = useMemo(() => {
    if (!effectiveCompanyId) {
      return articles;
    }

    return articles.filter((article) => sameCompany(article.companyId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, effectiveCompanyId]);

  const filteredProjects = useMemo(() => {
    if (!effectiveCompanyId) {
      return projects;
    }

    return projects.filter((project) => {
      const projectCompanyId = project.companyId || project.clientCompanyId;
      return String(projectCompanyId) === String(effectiveCompanyId);
    });
  }, [projects, effectiveCompanyId]);

  useEffect(() => {
    if (invoiceToEdit || !effectiveCompanyId) {
      return;
    }

    const loadCompanyFooter = async () => {
      try {
        const { data: company } = await apiClient.get(`/company/${effectiveCompanyId}`);

        form.setFieldsValue({
          companyFooter: {
            name: company.name || '',
            address: company.address || '',
            city: company.city || '',
            phone: company.phone || '',
            email: company.email || '',
            website: company.website || '',
            orgNumber: company.orgNumber || '',
            vatNumber: company.vatNumber || '',
            vatStatus: company.vatStatus || '',
          },
        });
      } catch (err) {
        console.error('Failed to load company footer info:', err);
      }
    };

    loadCompanyFooter();
  }, [effectiveCompanyId, form, invoiceToEdit]);

  useEffect(() => {
    const loadCatalogs = async () => {
      // GET /projects is superadmin-only; company/project admins list their own
      // company's projects via /projects/my.
      const projectsUrl = user?.role === 'superadmin' ? '/projects' : '/projects/my';
      const [clientsRes, articlesRes, projectsRes] = await Promise.allSettled([
        apiClient.get('/clients'),
        apiClient.get('/articles'),
        apiClient.get(projectsUrl),
      ]);

      if (clientsRes.status === 'fulfilled') setClients(clientsRes.value.data || []);
      if (articlesRes.status === 'fulfilled') setArticles(articlesRes.value.data || []);
      if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data || []);

      const failed = [clientsRes, articlesRes, projectsRes].find((r) => r.status === 'rejected');
      if (failed) {
        message.warning(formatApiError(failed.reason, t('Some data could not be loaded')));
      }
    };

    loadCatalogs();
  }, [user?.role, t]);

  useEffect(() => {
    if (invoiceToEdit) {
      form.setFieldsValue({
        ...invoiceToEdit,
        reverseVAT: invoiceToEdit.reverseVAT === 'true',
        items: invoiceToEdit.items?.length ? invoiceToEdit.items : [DEFAULT_ITEM],
        companyFooter: invoiceToEdit.companyFooter || {},
      });
      return;
    }

    form.resetFields();
    form.setFieldsValue({
      companyId: user?.companyId,
      date: today(),
      dueDate: today(),
      deliveryDate: today(),
      status: 'draft',
      reverseVAT: false,
      items: [DEFAULT_ITEM],
      companyFooter: {},
    });
  }, [form, invoiceToEdit, user]);

  // Add a labour row priced at the project's bill rate (or the client's default
  // hourly rate) — so worked-hour billing flows straight onto the invoice.
  const addLabourRow = () => {
    const projectId = form.getFieldValue('projectId');
    const project = projects.find((p) => getEntityId(p) === projectId);
    const client = clients.find((c) => getEntityId(c) === selectedClientId);
    const rate = Number(project?.billRatePerHour) || Number(client?.hourlyRate) || 0;
    const current = form.getFieldValue('items') || [];
    const newIndex = current.length;
    // Leave the article empty so you pick a real labour article in the row —
    // applyArticleToRow keeps this rate & description when you choose one.
    form.setFieldValue('items', [
      ...current,
      { ...DEFAULT_ITEM, articleNumber: '', description: t('Labour'), quantity: 1, unit: 'tim', price: rate },
    ]);
    // If this client already has a remembered labour article, pre-fill it.
    if (client?.labourArticleNumber) {
      applyArticleToRow(newIndex, client.labourArticleNumber);
    }
    message.info(rate === 0
      ? t('Set an hourly rate on the client or project to price labour automatically.')
      : t('Labour row added — pick an article for it.'));
  };

  const handleClientSelect = (clientId) => {
    if (!clientId) {
      return;
    }

    const client = filteredClients.find((item) => getEntityId(item) === clientId)
      || clients.find((item) => getEntityId(item) === clientId);
    if (!client) {
      return;
    }

    const paymentDays = parseInt(client.paymentTerms, 10) || 20;

    form.setFieldsValue({
      companyId: client.companyId || form.getFieldValue('companyId') || user?.companyId,
      companyName: getClientDisplayName(client),
      customerNumber: client.customerNumber || '',
      vatNumber: client.vatNumber || '',
      address: client.address || '',
      postalCode: formatClientAddress(client),
      representative: client.contactPerson || `${client.firstName || ''} ${client.lastName || ''}`.trim(),
      email: client.email || '',
      phone: client.phone || client.mobile || '',
      paymentTerms: client.paymentTerms || '',
      reverseVAT: Boolean(client.reverseVAT),
      yourReference: client.contactPerson || form.getFieldValue('yourReference') || '',
      dueDate: addDaysToDate(Number.isNaN(paymentDays) ? 20 : paymentDays),
      deliveryDate: today(),
    });

    // Pre-fill the remembered labour article onto any hours row that has none,
    // so repeat invoices to this client already carry the right article.
    if (client.labourArticleNumber) {
      (form.getFieldValue('items') || []).forEach((item, index) => {
        if (isHourRow(item) && !emptyToUndefined(item.articleNumber)) {
          applyArticleToRow(index, client.labourArticleNumber);
        }
      });
    }
  };

  // Apply a one-shot prefill (e.g. hours from the Shifts → Hours grid) once the
  // catalogs are available, so the customer/project/lines land on a fresh draft.
  useEffect(() => {
    if (invoiceToEdit || !prefill || prefillAppliedRef.current) return;
    if (prefill.clientId && !clients.length) return;
    prefillAppliedRef.current = true;

    if (Array.isArray(prefill.items) && prefill.items.length) {
      form.setFieldsValue({ items: prefill.items.map((item) => ({ ...DEFAULT_ITEM, ...item })) });
    }
    if (prefill.projectId) {
      form.setFieldsValue({ projectId: prefill.projectId });
    }
    if (prefill.orderReference) {
      form.setFieldsValue({ orderReference: prefill.orderReference });
    }
    if (prefill.clientId) {
      setSelectedClientId(prefill.clientId);
      handleClientSelect(prefill.clientId);
      // If the project's client isn't in the loaded list (e.g. a different
      // company scope), fetch it by id so its name/details still fill the
      // invoice instead of showing "Unnamed".
      const known = clients.find((c) => getEntityId(c) === prefill.clientId);
      if (!known) {
        apiClient.get(`/clients/${prefill.clientId}`)
          .then(({ data }) => {
            if (!data) return;
            form.setFieldsValue({
              companyName: getClientDisplayName(data) || undefined,
              email: data.email || form.getFieldValue('email') || undefined,
              address: data.address || undefined,
              postalCode: formatClientAddress(data) || undefined,
              representative: data.contactPerson || undefined,
            });
          })
          .catch(() => {});
      }
    }
    // Free-text customer (e.g. converted from an offer that has no linked client).
    if (prefill.customer) {
      form.setFieldsValue({
        companyName: prefill.customer.companyName || undefined,
        email: prefill.customer.email || undefined,
        address: prefill.customer.address || undefined,
        postalCode: prefill.customer.postalCode || undefined,
        representative: prefill.customer.representative || undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, clients, invoiceToEdit]);

  const applyArticleToRow = (rowIndex, articleNumber) => {
    if (!articleNumber) {
      return;
    }

    const article = filteredArticles.find((item) => (
      String(item.articleNumber || '') === String(articleNumber)
      || getEntityId(item) === articleNumber
    ));
    if (!article) {
      return;
    }

    const items = [...(form.getFieldValue('items') || [])];
    const current = items[rowIndex] || {};
    const hasDescription = current.description && String(current.description).trim();
    const hasPrice = current.price !== undefined && current.price !== null
      && current.price !== '' && Number(current.price) !== 0;
    items[rowIndex] = {
      ...current,
      articleNumber: article.articleNumber || '',
      // Keep an existing description/price (e.g. hours draft) and only fill from
      // the article when the row hasn't been filled yet.
      description: hasDescription ? current.description : (article.name || ''),
      price: hasPrice ? current.price : (article.priceExclMoms ?? 0),
      vatRate: article.momsPercent ?? current.vatRate ?? 25,
      unit: current.unit || 'st',
      quantity: current.quantity ?? 1,
      discount: current.discount ?? 0,
    };

    form.setFieldsValue({ items });
  };

  // Persist the (already validated) form values, then either navigate away or —
  // when the "…and send by email" action was used — keep the form and open the
  // send modal on the just-saved invoice.
  const finalizeInvoice = async (values, { sendAfter = false } = {}) => {
    const companyId = invoiceToEdit?.companyId || values.companyId || user?.companyId;

    if (!companyId) {
      message.error(t('Company is not available for this invoice'));
      return;
    }

    const payload = {
      ...values,
      companyId,
      projectId: values.projectId || null,
      companyName: emptyToUndefined(values.companyName),
      customerNumber: emptyToUndefined(values.customerNumber),
      vatNumber: emptyToUndefined(values.vatNumber),
      address: emptyToUndefined(values.address),
      postalCode: emptyToUndefined(values.postalCode),
      representative: emptyToUndefined(values.representative),
      email: emptyToUndefined(values.email),
      phone: emptyToUndefined(values.phone),
      orderReference: emptyToUndefined(values.orderReference),
      ourReference: emptyToUndefined(values.ourReference),
      yourReference: emptyToUndefined(values.yourReference),
      lateInterest: emptyToUndefined(values.lateInterest),
      paymentTerms: emptyToUndefined(values.paymentTerms),
      reverseVAT: values.reverseVAT ? 'true' : 'false',
      items: (values.items || []).map((item) => ({
        ...DEFAULT_ITEM,
        ...item,
        description: emptyToUndefined(item.description),
        articleNumber: emptyToUndefined(item.articleNumber),
        unit: emptyToUndefined(item.unit) || 'st',
      })),
      subtotal: totals.subtotal,
      vat: totals.vat,
      total: totals.total,
    };

    try {
      const saved = invoiceToEdit
        ? await updateInvoice(getEntityId(invoiceToEdit), payload)
        : await createInvoice(payload);

      // Remember which article this client's labour/hours was billed under, so
      // the next invoice pre-fills it. Best-effort — never blocks the save.
      try {
        const client = clients.find((c) => getEntityId(c) === selectedClientId);
        const hourRow = (values.items || []).find(
          (it) => isHourRow(it) && emptyToUndefined(it.articleNumber),
        );
        const artNo = hourRow ? String(hourRow.articleNumber).trim() : '';
        if (client && artNo && String(client.labourArticleNumber || '') !== artNo) {
          await apiClient.put(`/clients/${getEntityId(client)}`, { labourArticleNumber: artNo });
        }
      } catch { /* non-critical */ }

      if (sendAfter) {
        setSendInvoice(saved);
        setSendModalOpen(true);
        return;
      }

      onClose();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, t('Failed to save invoice')));
    }
  };

  // Plain save path — triggered by the primary button and by Enter (form.submit()).
  const onFinish = (values) => finalizeInvoice(values, { sendAfter: false });

  // Save-and-email path — the secondary "Create & send" button. It isn't the
  // form's submit button, so validate explicitly before saving.
  const handleSaveAndSend = async () => {
    try {
      const values = await form.validateFields();
      await finalizeInvoice(values, { sendAfter: true });
    } catch {
      // validateFields rejects on invalid input; antd highlights the fields.
    }
  };

  const primaryLabel = submitLabel || t(invoiceToEdit ? 'Save invoice' : 'Create invoice');
  const sendLabel = t('Create & send');

  return (
    <>
    <Form
      id="invoice-form"
      className="invoice-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <div className="invoice-form__grid">
        <Form.Item label={t('Select customer')}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t('Select customer')}
            value={selectedClientId}
            onChange={(clientId) => { setSelectedClientId(clientId); handleClientSelect(clientId); }}
            options={filteredClients.map((client) => ({
              value: getEntityId(client),
              label: `${client.customerNumber || '-'} · ${getClientDisplayName(client)}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="projectId" label={t('Project')}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t('Link to a project (optional)')}
            options={filteredProjects.map((project) => ({
              value: getEntityId(project),
              label: project.name,
            }))}
          />
        </Form.Item>

        <Form.Item name="status" hidden>
          <Select options={STATUS_OPTIONS} />
        </Form.Item>

        <Form.Item name="companyName" hidden>
          <Input placeholder="Customer company" />
        </Form.Item>

        <Form.Item name="customerNumber" hidden>
          <Input placeholder="Kundnr" />
        </Form.Item>

        <Form.Item name="vatNumber" hidden>
          <Input placeholder="VAT no." />
        </Form.Item>

        <Form.Item name="address" hidden>
          <Input placeholder="Street address" />
        </Form.Item>

        <Form.Item name="postalCode" hidden>
          <Input placeholder="116 31 Stockholm" />
        </Form.Item>

        <Form.Item name="email" hidden>
          <Input type="email" placeholder="customer@example.com" />
        </Form.Item>

        <Form.Item name="phone" hidden>
          <Input placeholder="+46..." />
        </Form.Item>

        <Form.Item name="date" label={t('Invoice date')}>
          <Input type="date" />
        </Form.Item>

        <Form.Item name="dueDate" label={t('Due date')}>
          <Input type="date" />
        </Form.Item>

        <Form.Item name="deliveryDate" label={t('Delivery date')}>
          <Input type="date" />
        </Form.Item>

        <Form.Item name="ourReference" label={t('Our reference')}>
          <Input />
        </Form.Item>

        <Form.Item name="yourReference" label={t('Your reference')}>
          <Input />
        </Form.Item>

        <Form.Item name="orderReference" label={t('Order reference')}>
          <Input />
        </Form.Item>

        <Form.Item name="lateInterest" hidden>
          <Input placeholder="Dröjsmålsränta enligt räntelagen" />
        </Form.Item>

        <Form.Item name="reverseVAT" hidden valuePropName="checked">
          <Switch checkedChildren="On" unCheckedChildren="Off" />
        </Form.Item>
      </div>

      <Divider orientation="left">{t('Invoice rows')}</Divider>

      <div style={{ marginBottom: 12 }}>
        <Button onClick={addLabourRow}>{t('Add labour (hours × rate)')}</Button>
      </div>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <div className="invoice-form__items">
            <div className="invoice-form__items-scroll">
              {fields.map(({ key, name, ...restField }) => (
                <div className="invoice-form__item" key={key}>
                  <Form.Item
                    {...restField}
                    name={[name, 'articleNumber']}
                    label={t('Art.nr')}
                    rules={[{ required: true, message: t('Select an article') }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder={t('Select')}
                      notFoundContent={t('No articles — add one under Articles')}
                      options={filteredArticles.map((article) => ({
                        value: article.articleNumber || getEntityId(article),
                        label: article.name
                          ? `${article.articleNumber || '—'} — ${article.name}`
                          : (article.articleNumber || '—'),
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
                    <Select
                      options={VAT_RATE_OPTIONS}
                      disabled={Boolean(watchedReverseVAT)}
                    />
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
                    aria-label="Remove invoice row"
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

      <Form.Item name={['companyFooter', 'name']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['companyFooter', 'address']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['companyFooter', 'city']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['companyFooter', 'phone']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['companyFooter', 'email']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['companyFooter', 'website']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['companyFooter', 'orgNumber']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['companyFooter', 'vatNumber']} hidden>
        <Input />
      </Form.Item>
      <Form.Item name={['companyFooter', 'vatStatus']} hidden valuePropName="checked">
        <Switch />
      </Form.Item>

      <Divider orientation="left">{t('ROT-avdrag')}</Divider>
      <div className="invoice-form__rot">
        <Form.Item name="rotEnabled" label={t('Apply ROT deduction')} valuePropName="checked">
          <Switch />
        </Form.Item>
        {watchedRotEnabled ? (
          <div className="invoice-form__grid">
            <Form.Item name="rotPersonalNumber" label={t('Personnummer (buyer)')}>
              <Input placeholder="YYYYMMDD-XXXX" />
            </Form.Item>
            <Form.Item name="rotProperty" label={t('Fastighetsbeteckning / BRF')}>
              <Input placeholder="Kommun Gård 1:23 · or BRF org.nr + lgh no." />
            </Form.Item>
            <Form.Item name="rotLaborAmount" label={t('Labour amount incl. VAT (SEK)')}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        ) : null}
      </div>

      <div className="invoice-form__totals">
        <Space size="large" wrap className="invoice-form__totals-content">
          <strong>{t('Excl. VAT')}: {formatAmount(totals.subtotal)}</strong>
          <strong>{t('VAT')}: {formatAmount(totals.vat)}</strong>
          <strong>{t('Total')}: {formatAmount(totals.total)}</strong>
          {settlement.rotDeduction ? <strong>{t('ROT-avdrag')}: {formatAmount(-settlement.rotDeduction)}</strong> : null}
          {settlement.rounding ? <strong>{t('Rounding')}: {formatAmount(settlement.rounding)}</strong> : null}
          {(settlement.rotDeduction || settlement.rounding)
            ? <strong>{t('Att betala')}: {formatAmount(settlement.roundedTotal)}</strong>
            : null}
        </Space>
        <Space className="invoice-form__actions">
          <Button
            size="large"
            icon={<MailOutlined />}
            onClick={handleSaveAndSend}
          >
            {sendLabel}
          </Button>
          <Button
            type="primary"
            size="large"
            className="invoice-form__save"
            onClick={() => form.submit()}
          >
            {primaryLabel}
          </Button>
        </Space>
      </div>
    </Form>

    <SendInvoiceModal
      invoice={sendInvoice}
      open={sendModalOpen}
      onClose={() => { setSendModalOpen(false); onClose(); form.resetFields(); }}
      onSent={() => { setSendModalOpen(false); onClose(); form.resetFields(); }}
    />
    </>
  );
}
