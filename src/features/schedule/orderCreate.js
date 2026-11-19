import dayjs from 'dayjs';
import apiClient from '@/src/api/apiClient';
import { enumerateDays } from '@/src/features/schedule/scheduleUtils';

// Creating an order from the «Ny bokning» window (owner 19.11: one way to
// create an order everywhere — Planering, Order list, onboarding — based on
// the calendar one). Returns what the caller needs for Ångra / reloads.
//   values: what OrderQuickModal passes to onSave
//   orders: the company's orders (for «Lägg till i befintlig order»)
//   createAssignment: the assignment store's create()
export async function createOrderFromBooking(values, { orders = [], createAssignment }) {
  const {
    existingId, title, order = {}, clientId, newClient, from, to, weekdaysOnly, start, hours,
    workerIds = [], address, rows = [], note = '', files = [],
  } = values;
  const noteField = note ? { note } : {};
  const days = enumerateDays(from, to).filter((d) => !weekdaysOnly || ![0, 6].includes(dayjs(d).day()));
  const book = (projectId) => Promise.all(workerIds.flatMap((userId) => days.map((date) => (
    createAssignment({ userId, projectId, date, hours, startTime: start, ...noteField }).catch(() => null)
  ))));
  // Documents / photos from the window go to the order's documents (owner 12.11).
  const uploadFiles = async (pid) => {
    if (!pid || !files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append('documents', f));
    await apiClient.post(`/projects/${pid}/documents`, fd);
  };
  const idsOf = (made) => made.filter(Boolean).map((c) => c._id || c.id);

  // Add this booking (time, crew, articles) to an order that already exists.
  if (existingId) {
    const existing = orders.find((p) => String(p._id || p.id) === String(existingId));
    const upd = {};
    if (rows.length) upd.orderRows = [...(existing?.orderRows || []), ...rows];
    if ((order.littera || '') !== (existing?.littera || '')) upd.littera = order.littera || '';
    if (Object.keys(upd).length) await apiClient.put(`/projects/${existingId}`, upd);
    const made = await book(existingId);
    await uploadFiles(existingId);
    return { projectId: existingId, createdIds: idsOf(made), clientId: null, added: true };
  }

  let cid = clientId;
  if (newClient) {
    // Same fields as the Kunder create form; empty ones are left out.
    const body = Object.fromEntries(Object.entries(newClient).filter(([, v]) => v !== '' && v !== null && v !== undefined));
    if (newClient.clientType === 'private') { delete body.companyName; delete body.orgNumber; delete body.vatNumber; delete body.contactPerson; }
    else { delete body.firstName; delete body.lastName; delete body.personalNumber; }
    const { data: c } = await apiClient.post('/clients', body);
    cid = c?._id || c?.id || null;
  }
  const { toolIds = [], ...orderFields } = order;
  const cleanOrder = Object.fromEntries(Object.entries(orderFields).filter(([, v]) => v !== '' && v !== null && v !== undefined));
  const { data: project } = await apiClient.post('/projects', {
    orderType: 'service',
    ...cleanOrder,
    name: title,
    beginningDate: from,
    endDate: to,
    workers: workerIds,
    location: address,
    orderRows: rows,
    clientId: cid || null,
  });
  const projectId = project?._id || project?.id;
  const made = await book(projectId);
  await uploadFiles(projectId);
  if (toolIds.length && projectId) {
    await apiClient.post('/tools/attach-to-project', { projectId, toolIds }).catch(() => null);
  }
  return { projectId, createdIds: idsOf(made), clientId: newClient ? cid : null, added: false };
}
