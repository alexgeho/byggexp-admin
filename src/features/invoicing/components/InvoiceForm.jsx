import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Divider, Form, Input, InputNumber, Select, Space, Switch, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { formatClientAddress, getClientDisplayName } from '@/src/features/clients/clientUtils';
import { getEntityId } from '@/src/utils/entityId';
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
  const [clients, setClients] = useState([]);
  const [articles, setArticles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(undefined);
  const prefillAppliedRef = useRef(false);
  const createInvoice = useInvoiceStore((state) => state.create);
  const updateInvoice = useInvoiceStore((state) => state.update);
  const user = useAuthStore((state) => state.user);
  const watchedItems = Form.useWatch('items', form);
  const watchedReverseVAT = Form.useWatch('reverseVAT', form);
  const watchedCompanyId = Form.useWatch('companyId', form);
  const totals = useMemo(
    () => calculateTotals(watchedItems || [], Boolean(watchedReverseVAT)),
    [watchedItems, watchedReverseVAT],
  );

  const effectiveCompanyId = watchedCompanyId || user?.companyId;

  const filteredClients = useMemo(() => {
    if (!effectiveCompanyId) {
      return clients;
    }

    return clients.filter((client) => String(client.companyId) === String(effectiveCompanyId));
  }, [clients, effectiveCompanyId]);

  const filteredArticles = useMemo(() => {
    if (!effectiveCompanyId) {
      return articles;
    }

    return articles.filter((article) => String(article.companyId) === String(effectiveCompanyId));
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
        message.warning(formatApiError(failed.reason, 'Some data could not be loaded'));
      }
    };

    loadCatalogs();
  }, [user?.role]);

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

  const handleClientSelect = (clientId) => {
    if (!clientId) {
      return;
    }

    const client = filteredClients.find((item) => getEntityId(item) === clientId);
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

  const onFinish = async (values) => {
    const companyId = invoiceToEdit?.companyId || values.companyId || user?.companyId;

    if (!companyId) {
      message.error('Company is not available for this invoice');
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
      if (invoiceToEdit) {
        await updateInvoice(getEntityId(invoiceToEdit), payload);
      } else {
        await createInvoice(payload);
      }

      onClose();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, 'Failed to save invoice'));
    }
  };

  return (
    <Form
      id="invoice-form"
      className="invoice-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <div className="invoice-form__grid">
        <Form.Item label="Select customer">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Select customer"
            value={selectedClientId}
            onChange={(clientId) => { setSelectedClientId(clientId); handleClientSelect(clientId); }}
            options={filteredClients.map((client) => ({
              value: getEntityId(client),
              label: `${client.customerNumber || '-'} · ${getClientDisplayName(client)}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="projectId" label="Project">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Link to a project (optional)"
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

        <Form.Item name="date" label="Invoice date">
          <Input type="date" />
        </Form.Item>

        <Form.Item name="dueDate" label="Due date">
          <Input type="date" />
        </Form.Item>

        <Form.Item name="deliveryDate" label="Delivery date">
          <Input type="date" />
        </Form.Item>

        <Form.Item name="ourReference" label="Our reference">
          <Input />
        </Form.Item>

        <Form.Item name="yourReference" label="Your reference">
          <Input />
        </Form.Item>

        <Form.Item name="orderReference" label="Order reference">
          <Input />
        </Form.Item>

        <Form.Item name="lateInterest" hidden>
          <Input placeholder="Dröjsmålsränta enligt räntelagen" />
        </Form.Item>

        <Form.Item name="reverseVAT" hidden valuePropName="checked">
          <Switch checkedChildren="On" unCheckedChildren="Off" />
        </Form.Item>
      </div>

      <Divider orientation="left">Invoice rows</Divider>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <div className="invoice-form__items">
            <div className="invoice-form__items-scroll">
              {fields.map(({ key, name, ...restField }) => (
                <div className="invoice-form__item" key={key}>
                  <Form.Item
                    {...restField}
                    name={[name, 'articleNumber']}
                    label="Art.nr"
                    rules={[{ required: true, message: 'Select an article' }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Select"
                      notFoundContent="No articles — add one under Articles"
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
                    label="Description"
                    rules={[{ required: true, message: 'Please enter description' }]}
                  >
                    <Input.TextArea rows={1} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'quantity']} label="Qty">
                    <InputNumber min={0} precision={2} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'unit']} label="Unit">
                    <Input />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'price']} label="À-price">
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
                  <Form.Item label="Amount">
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
              Add row
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

      <div className="invoice-form__totals">
        <Space size="large" wrap className="invoice-form__totals-content">
          <strong>Excl. VAT: {formatAmount(totals.subtotal)}</strong>
          <strong>VAT: {formatAmount(totals.vat)}</strong>
          <strong>Total: {formatAmount(totals.total)}</strong>
        </Space>
        {submitLabel ? (
          <Button type="primary" htmlType="submit" form="invoice-form">
            {submitLabel}
          </Button>
        ) : null}
      </div>
    </Form>
  );
}
