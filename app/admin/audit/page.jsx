'use client';

import AuditLogPage from '@/src/features/audit/AuditLogPage';

// Superadmin: every company's log — the support view.
export default function AdminAuditPage() {
  return <AuditLogPage all />;
}
