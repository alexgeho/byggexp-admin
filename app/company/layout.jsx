import DashboardLayout from '@/src/shared/layouts/DashboardLayout';

export default function CompanyRouteLayout({ children }) {
  return (
    <DashboardLayout section="company" allowedRoles={['superadmin', 'companyAdmin']}>
      {children}
    </DashboardLayout>
  );
}
