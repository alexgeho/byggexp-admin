import DashboardLayout from '../../src/layouts/DashboardLayout';

export default function AdminRouteLayout({ children }) {
  return (
    <DashboardLayout section="admin" allowedRoles={['superadmin']}>
      {children}
    </DashboardLayout>
  );
}
