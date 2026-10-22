'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
} from 'antd';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { useLocation, useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { getEntityId } from '@/src/utils/entityId';

// Avtalsregler: dated versions of Byggavtalet's pay rules, shared by every
// company. Figures are typed in from the agreement text by a superadmin and are
// locked once published, so past payroll periods never change underneath.

const CATEGORY_OPTIONS = [
  { value: 'yrkesarbetare', label: 'Skilled worker' },
  { value: 'ny_i_branschen', label: 'New in the industry' },
  { value: 'larling', label: 'Apprentice' },
];

const HOUR_TYPE_OPTIONS = [
  { value: 'overtime', label: 'Overtime' },
  { value: 'ob', label: 'OB (inconvenient hours)' },
];

const EMPTY_RULE_SET = {
  agreement: 'byggavtalet',
  name: '',
  validFrom: '',
  validTo: '',
  sourceNote: '',
  minimumWages: [],
  hourTypeSupplements: [],
  vacationPayPercent: null,
  atkPercent: null,
  mileageRatePerKm: 0,
  mileageTaxFreePerKm: 0,
  travelTimeRatePerHour: 0,
  perDiemFull: 0,
  perDiemHalf: 0,
  perDiemTaxFreeFull: 0,
  perDiemTaxFreeHalf: 0,
};

export default function AgreementRulesPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();
  const { t } = useLanguage();
  const [ruleSets, setRuleSets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // rule set being edited, {} = new
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    hideHeaderActions();
    return () => showHeaderActions();
  }, [hideHeaderActions, showHeaderActions]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/payroll-basis/rules');
      setRuleSets(res.data || []);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to load agreement versions'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const run = async (fn, okText) => {
    try {
      await fn();
      if (okText) appMessage.success(okText);
      await load();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Something went wrong'));
    }
  };

  const openEditor = (ruleSet) => {
    setEditing(ruleSet || {});
    form.setFieldsValue({ ...EMPTY_RULE_SET, ...(ruleSet || {}) });
  };

  const isLocked = editing?.status === 'published';

  const save = async () => {
    const values = await form.validateFields();
    // A published version only accepts a new end date and source note.
    const payload = isLocked
      ? { validTo: values.validTo || '', sourceNote: values.sourceNote || '' }
      : { ...values, validTo: values.validTo || '' };
    setSaving(true);
    try {
      const id = getEntityId(editing);
      if (id) await apiClient.patch(`/payroll-basis/rules/${id}`, payload);
      else await apiClient.post('/payroll-basis/rules', payload);
      appMessage.success(t('Saved'));
      setEditing(null);
      await load();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: t('Name'), dataIndex: 'name', key: 'name' },
    {
      title: t('Valid'),
      key: 'valid',
      render: (_, r) => `${formatAdminDate(r.validFrom)} – ${r.validTo ? formatAdminDate(r.validTo) : '…'}`,
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (v) => (v === 'published' ? <Tag color="green">{t('Published')}</Tag> : <Tag>{t('Draft')}</Tag>),
    },
    { title: t('Source'), dataIndex: 'sourceNote', key: 'sourceNote', ellipsis: true },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, r) => {
        const id = getEntityId(r);
        return (
          <Space size={4}>
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditor(r)}>
              {r.status === 'published' ? t('View') : t('Edit')}
            </Button>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => run(() => apiClient.post(`/payroll-basis/rules/${id}/duplicate`), t('Copy created as draft'))}
            >
              {t('Duplicate')}
            </Button>
            {r.status !== 'published' ? (
              <>
                <Popconfirm
                  title={t('Publish this version?')}
                  description={t('Every company’s payroll basis will use it, and its figures get locked.')}
                  okText={t('Publish')}
                  cancelText={t('Cancel')}
                  onConfirm={() => run(() => apiClient.post(`/payroll-basis/rules/${id}/publish`), t('Published'))}
                >
                  <Button size="small" type="primary" icon={<CheckCircleOutlined />}>{t('Publish')}</Button>
                </Popconfirm>
                <Popconfirm
                  title={t('Delete this draft?')}
                  okText={t('Delete')}
                  cancelText={t('Cancel')}
                  onConfirm={() => run(() => apiClient.delete(`/payroll-basis/rules/${id}`), t('Deleted'))}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </>
            ) : null}
          </Space>
        );
      },
    },
  ];

  const money = (name, label) => (
    <Col xs={24} sm={12}>
      <Form.Item name={name} label={label}>
        <InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={isLocked} />
      </Form.Item>
    </Col>
  );

  return (
    <div className="invoice-create-page">
      <Space className="invoice-create-page__toolbar" align="center" wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(pathname.replace(/\/[^/]+$/, ''))}>
          {t('Back to payroll')}
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor(null)}>
          {t('New agreement version')}
        </Button>
      </Space>

      <Card className="invoice-create-page__card" title={t('Agreement rules (Byggavtalet)')}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('When a new Byggavtalet is signed: duplicate the current version, set the new dates and figures from the agreement text, close the old version with an end date, then publish.')}
        />
        <Table
          dataSource={ruleSets.map((r) => ({ ...r, key: getEntityId(r) }))}
          columns={columns}
          loading={loading}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>

      <Drawer
        title={getEntityId(editing) ? editing.name : t('New agreement version')}
        open={!!editing}
        width={720}
        onClose={() => setEditing(null)}
        destroyOnHidden
        extra={<Button type="primary" onClick={save} loading={saving}>{t('Save')}</Button>}
      >
        {isLocked ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={t('Published versions are locked. Only the end date and source can change — duplicate to make a new version.')}
          />
        ) : null}
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col xs={24}>
              <Form.Item name="name" label={t('Name')} rules={[{ required: true }]}>
                <Input placeholder="Byggavtalet 2025–2027" disabled={isLocked} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="validFrom" label={t('Valid from')} rules={[{ required: true }]}>
                <Input type="date" disabled={isLocked} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="validTo" label={t('Valid to (empty = until next version)')}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                name="sourceNote"
                label={t('Source')}
                extra={t('Agreement section, BI/Byggnads circular or Skatteverket page the figures come from. Required to publish.')}
              >
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <h4>{t('Minimum wages (SEK/h)')}</h4>
          <Form.List name="minimumWages">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex' }}>
                    <Form.Item name={[name, 'category']} rules={[{ required: true }]}>
                      <Select
                        style={{ width: 220 }}
                        options={CATEGORY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
                        disabled={isLocked}
                      />
                    </Form.Item>
                    <Form.Item name={[name, 'hourly']} rules={[{ required: true }]}>
                      <InputNumber min={0} step={0.01} placeholder="kr/h" disabled={isLocked} />
                    </Form.Item>
                    {!isLocked ? <MinusCircleOutlined onClick={() => remove(name)} /> : null}
                  </Space>
                ))}
                {!isLocked ? (
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ category: 'yrkesarbetare' })}>
                    {t('Add minimum wage')}
                  </Button>
                ) : null}
              </>
            )}
          </Form.List>

          <h4 style={{ marginTop: 20 }}>{t('Supplements per hour type')}</h4>
          <Form.List name="hourTypeSupplements">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" wrap style={{ display: 'flex' }}>
                    <Form.Item name={[name, 'hourType']} rules={[{ required: true }]}>
                      <Select
                        style={{ width: 200 }}
                        options={HOUR_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
                        disabled={isLocked}
                      />
                    </Form.Item>
                    <Form.Item name={[name, 'label']}>
                      <Input placeholder={t('Label on payslip')} style={{ width: 180 }} disabled={isLocked} />
                    </Form.Item>
                    <Form.Item name={[name, 'kind']} initialValue="percent">
                      <Select
                        style={{ width: 150 }}
                        options={[
                          { value: 'percent', label: t('% of hourly wage') },
                          { value: 'fixed', label: t('SEK per hour') },
                        ]}
                        disabled={isLocked}
                      />
                    </Form.Item>
                    <Form.Item name={[name, 'value']} rules={[{ required: true }]}>
                      <InputNumber min={0} step={0.01} disabled={isLocked} />
                    </Form.Item>
                    {!isLocked ? <MinusCircleOutlined onClick={() => remove(name)} /> : null}
                  </Space>
                ))}
                {!isLocked ? (
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ kind: 'percent' })}>
                    {t('Add supplement')}
                  </Button>
                ) : null}
              </>
            )}
          </Form.List>

          <h4 style={{ marginTop: 20 }}>{t('Vacation pay and ATK')}</h4>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="vacationPayPercent"
                label={t('Vacation pay %')}
                extra={t('Empty = the payroll system calculates it')}
              >
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={isLocked} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="atkPercent" label={t('ATK %')} extra={t('Empty = not accrued')}>
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled={isLocked} />
              </Form.Item>
            </Col>
          </Row>

          <h4>{t('Travel')}</h4>
          <Row gutter={12}>
            {money('mileageRatePerKm', t('Mileage allowance, SEK/km'))}
            {money('mileageTaxFreePerKm', t('Of which tax-free, SEK/km'))}
            {money('travelTimeRatePerHour', t('Travel time pay, SEK/h'))}
          </Row>

          <h4>{t('Per diem (traktamente)')}</h4>
          <Row gutter={12}>
            {money('perDiemFull', t('Full day, SEK'))}
            {money('perDiemTaxFreeFull', t('Full day tax-free, SEK'))}
            {money('perDiemHalf', t('Half day, SEK'))}
            {money('perDiemTaxFreeHalf', t('Half day tax-free, SEK'))}
          </Row>
        </Form>
      </Drawer>
    </div>
  );
}
