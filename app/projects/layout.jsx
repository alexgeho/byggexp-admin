import DashboardLayout from '@/src/shared/layouts/DashboardLayout';

export default function ProjectsRouteLayout({ children }) {
  return (
    <DashboardLayout section="projects" allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin', 'worker']}>
      {children}
    </DashboardLayout>
  );
}
