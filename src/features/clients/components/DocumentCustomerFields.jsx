import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Input, Select } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';

// The customer block of a customer document — one component for the offer and
// the invoice (owner 18.11: "the invoice is created exactly like the offer").
// Left half: a new customer (type at half width + name). Right half: pick an
// existing one (choice only, no typing). Below: the customer's details, all
// optional. A customer typed by hand is saved to the register together with the
// document, so it never has to be created separately first.
//
// Form field names: clientType, companyName, orgNumber, contactPerson, email,
// phone, address, postalCode, city.

export const CUSTOMER_FIELDS = ['contactPerson', 'phone', 'address', 'orgNumber', 'postalCode', 'city'];

// A client's display name: company name for businesses, the person's name for
// private persons, with sensible fallbacks.
export const clientLabel = (c) => {
  const person = `${c?.firstName || ''} ${c?.lastName || ''}`.trim();
  const names = c?.clientType === 'private'
    ? [person, c?.companyName]
    : [c?.companyName, person];
  return (names.find(Boolean) || c?.name || c?.email || '').trim();
};

// The form values a register client fills in.
export const clientToCustomerFields = (client) => {
  const isPrivate = client?.clientType === 'private';
  return {
    clientType: isPrivate ? 'private' : 'company',
    companyName: clientLabel(client),
    email: client?.email || '',
    contactPerson: isPrivate ? '' : (client?.contactPerson || ''),
    phone: client?.phone || client?.mobile || '',
    address: client?.address || '',
    orgNumber: (isPrivate ? client?.personalNumber : client?.orgNumber) || '',
    postalCode: client?.postalCode || '',
    city: client?.city || '',
  };
};

const EMPTY_CUSTOMER = {
  companyName: '',
  email: '',
  ...Object.fromEntries(CUSTOMER_FIELDS.map((key) => [key, ''])),
};

// State and actions of the block. `clients` may be handed in by a form that
// already loads the register (the invoice); otherwise it is loaded here.
export function useDocumentCustomer(form, { clients: givenClients, onPick, onClear } = {}) {
  const [loadedClients, setLoadedClients] = useState([]);
  const [createdClients, setCreatedClients] = useState([]);
  // Name of the customer picked from the register: while the name field still
  // holds it, the field is hidden (the picker already shows it).
  const [pickedName, setPickedName] = useState('');
  const watchedCustomerName = Form.useWatch('companyName', form);
  const isPrivateCustomer = Form.useWatch('clientType', form) === 'private';

  useEffect(() => {
    if (givenClients) return undefined;
    let active = true;
    apiClient
      .get('/clients')
      .then(({ data }) => { if (active) setLoadedClients(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setLoadedClients([]); });
    return () => { active = false; };
  }, [givenClients]);

  const clients = useMemo(
    () => [...createdClients, ...(givenClients || loadedClients)],
    [createdClients, givenClients, loadedClients],
  );

  // Options for the existing-customer picker, de-duplicated by label.
  const clientOptions = useMemo(() => {
    const seen = new Set();
    return clients
      .map((c) => ({ label: clientLabel(c), email: c.email || '' }))
      .filter((o) => o.label && !seen.has(o.label) && seen.add(o.label))
      .map((o) => ({ value: o.label, email: o.email }));
  }, [clients]);

  // Fill the block from a register client (picker, hand-off from another page).
  const applyClient = useCallback((client) => {
    if (!client) return;
    const fields = clientToCustomerFields(client);
    setPickedName(fields.companyName);
    form.setFieldsValue(fields);
    onPick?.(client);
  }, [form, onPick]);

  // Picking an existing client fills its name and all details straight away;
  // clearing the choice empties them again.
  const handleClientPick = (value) => {
    if (!value) {
      setPickedName('');
      form.setFieldsValue(EMPTY_CUSTOMER);
      onClear?.();
      return;
    }
    const match = clients.find((c) => clientLabel(c) === value);
    if (match) applyClient(match);
  };

  // The picker shows a client only while the name field still holds its name.
  const pickedClient = clientOptions.some((o) => o.value === watchedCustomerName)
    ? watchedCustomerName
    : undefined;

  // The register client behind the current name, if any.
  const findClientByName = useCallback((name) => {
    const typed = String(name || '').trim().toLowerCase();
    if (!typed) return null;
    return clients.find((c) => clientLabel(c).toLowerCase() === typed) || null;
  }, [clients]);

  // A customer typed by hand (not in the register) is saved as a client along
  // with the document. Best effort: the document is saved even if this fails.
  // Returns the created client, or null when nothing was created.
  const saveNewClient = async (values) => {
    const { companyName: name, email, companyId } = values;
    const typed = String(name || '').trim();
    if (!typed || findClientByName(typed)) return null;
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
      if (data) setCreatedClients((list) => [data, ...list]);
      return data || null;
    } catch {
      // ignore — the customer can still be added from the register
      return null;
    }
  };

  return {
    clients,
    clientOptions,
    pickedClient,
    pickedName,
    watchedCustomerName,
    isPrivateCustomer,
    handleClientPick,
    applyClient,
    findClientByName,
    saveNewClient,
  };
}

// The block itself: put it inside the document form's two-column grid.
// `showContact={false}` leaves the contact person out (the invoice has its own
// "Er referens" field for it).
export default function DocumentCustomerFields({ customer, showContact = true }) {
  const t = useT();
  const {
    clientOptions, pickedClient, pickedName, watchedCustomerName, isPrivateCustomer, handleClientPick,
  } = customer;

  return (
    <>
      <div className="offer-form__customer">
        <div className="offer-form__customer-title">{t('Create client')}</div>
        <div className="offer-form__customer-new">
          <Form.Item name="clientType" label={t('Client type')}>
            <Select
              options={[
                { value: 'company', label: t('Business') },
                { value: 'private', label: t('Private person') },
              ]}
            />
          </Form.Item>

          {/* Hidden, not unmounted: the name still has to be submitted. */}
          <Form.Item
            name="companyName"
            label={isPrivateCustomer ? t('Name') : t('Company name')}
            hidden={Boolean(pickedName) && pickedName === watchedCustomerName}
          >
            <Input />
          </Form.Item>
        </div>
      </div>

      <div className="offer-form__customer">
        <div className="offer-form__customer-title">{t('Choose existing client')}</div>
        <Form.Item label={t('Current clients list')}>
          <Select
            value={pickedClient}
            onChange={handleClientPick}
            options={clientOptions}
            allowClear
          />
        </Form.Item>
      </div>

      <Form.Item name="orgNumber" label={isPrivateCustomer ? t('Personnummer') : t('Org no.')}>
        <Input />
      </Form.Item>

      {showContact && !isPrivateCustomer ? (
        <Form.Item name="contactPerson" label={t('Contact person')}>
          <Input />
        </Form.Item>
      ) : null}

      <Form.Item name="email" label={t('Email')}>
        <Input type="email" placeholder="customer@example.com" />
      </Form.Item>

      <Form.Item name="phone" label={t('Phone')}>
        <Input />
      </Form.Item>

      <Form.Item name="address" label={t('Address')}>
        <Input />
      </Form.Item>

      {/* Postal code and city share one cell, so no field is left alone. */}
      <div className="offer-form__postal">
        <Form.Item name="postalCode" label={t('Postal code')}>
          <Input />
        </Form.Item>

        <Form.Item name="city" label={t('City')}>
          <Input />
        </Form.Item>
      </div>
    </>
  );
}
