import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import OrderQuickModal from '@/src/features/schedule/components/OrderQuickModal';
import { createOrderFromBooking } from '@/src/features/schedule/orderCreate';
import { useAuthStore } from '@/src/store/authStore';
import { useUserStore } from '@/src/store/userStore';
import { useProjectStore } from '@/src/store/projectStore';
import { useAssignmentStore } from '@/src/store/assignmentStore';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';

const idOf = (x) => String(x?._id || x?.id || '');

// «Ny bokning» outside Planering (owner 19.11: the order is created with the
// same fields everywhere, the calendar window is the base) — the Order list's
// «Lägg till order» and the onboarding step open exactly this window.
export default function NewOrderModal({ open, onClose, onCreated }) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const users = useUserStore((s) => s.users);
  const fetchUsersByCompany = useUserStore((s) => s.fetchByCompany);
  const projects = useProjectStore((s) => s.projects);
  const fetchProjectsByCompany = useProjectStore((s) => s.fetchByCompany);
  const createAssignment = useAssignmentStore((s) => s.create);
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (!open) return;
    const today = dayjs().format('YYYY-MM-DD');
    setInitial({ date: today, dateTo: today, start: '08:00', end: '10:00', workerIds: [] });
    if (user?.companyId) {
      fetchUsersByCompany(user.companyId, { silent: true })?.catch?.(() => {});
      fetchProjectsByCompany(user.companyId)?.catch?.(() => {});
    }
  }, [open, user?.companyId, fetchUsersByCompany, fetchProjectsByCompany]);

  const employees = useMemo(() => (users || [])
    .filter((u) => u.role === 'worker')
    .map((u) => ({ value: idOf(u), label: u.name || u.email || '—', profession: u.profession || '', firm: '' })), [users]);

  const handleSave = async (values) => {
    try {
      const made = await createOrderFromBooking(values, { orders: projects || [], createAssignment });
      appMessage.success(t(made.added ? 'Saved' : 'Order created'));
      if (user?.companyId) fetchProjectsByCompany(user.companyId)?.catch?.(() => {});
      onCreated?.(made);
      onClose?.();
    } catch (err) {
      appMessage.error(err?.response?.data?.message || t('Could not save'));
    }
  };

  return (
    <OrderQuickModal
      open={open && Boolean(initial)}
      initial={initial}
      employees={employees}
      orders={(projects || []).filter((p) => !p.internal)}
      onEmployeeAdded={() => (user?.companyId ? fetchUsersByCompany(user.companyId) : null)}
      onCancel={onClose}
      onSave={handleSave}
    />
  );
}
