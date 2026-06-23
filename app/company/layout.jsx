import DashboardLayout from '../../src/layouts/DashboardLayout';

export default function CompanyRouteLayout({ children }) {
  return (
    <DashboardLayout section="company" allowedRoles={['superadmin', 'companyAdmin']}>
      {children}
    </DashboardLayout>
  );
}
