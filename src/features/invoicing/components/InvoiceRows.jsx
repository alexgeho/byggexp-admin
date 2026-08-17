import { Button, Form, Input, InputNumber, Select } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useT } from '@/src/i18n/LanguageProvider';
import { getEntityId } from '@/src/utils/entityId';
import { DEFAULT_ITEM, VAT_RATE_OPTIONS, getRowAmount } from '@/src/features/invoicing/components/invoiceFormUtils';

// The editable invoice-line rows (a Form.List, so it must render inside the
// parent Form). Article pick, description, qty/unit/price and the computed
// amount; discount/VAT are hidden fields driven by the article/reverse-VAT.
export default function InvoiceRows({ articles, watchedItems, watchedReverseVAT, onApplyArticle }) {
  const t = useT();
  return (
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
                    options={articles.map((article) => ({
                      value: article.articleNumber || getEntityId(article),
                      label: article.name
                        ? `${article.articleNumber || '—'} — ${article.name}`
                        : (article.articleNumber || '—'),
                    }))}
                    onChange={(value) => onApplyArticle(name, value)}
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
  );
}
