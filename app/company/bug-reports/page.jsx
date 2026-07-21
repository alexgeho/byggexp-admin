'use client';

import ProtectedRoute from '@/src/shared/auth/ProtectedRoute';
import BugReportListPage from '@/src/features/bug-reports/BugReportListPage';

export default function CompanyBugReportsPage() {
  return (
    <ProtectedRoute allowedRoles={['superadmin']}>
      <BugReportListPage />
    </ProtectedRoute>
  );
}
