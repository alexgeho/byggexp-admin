import DashboardLayout from '../../src/layouts/DashboardLayout';

export default function WorkerRouteLayout({ children }) {
  return (
    <DashboardLayout section="worker" allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin', 'worker']}>
      {children}
    </DashboardLayout>
  );
}
