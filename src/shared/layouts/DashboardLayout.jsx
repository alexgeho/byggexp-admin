'use client';

import { Layout } from 'antd';
import ProtectedRoute from '@/src/shared/auth/ProtectedRoute';
import DashboardHeader from '@/src/shared/layouts/DashboardHeader';
import { DashboardActionsProvider } from '@/src/shared/layouts/DashboardActionsContext';
import DashboardPageHeader from '@/src/shared/layouts/DashboardPageHeader';
import DashboardSidebar from '@/src/shared/layouts/DashboardSidebar';

const { Content, Header, Sider } = Layout;

export default function DashboardLayout({ allowedRoles, children, section }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardActionsProvider>
        <Layout className="dashboard-shell">
          <Sider className="dashboard-sidebar" width={264} breakpoint="lg" collapsedWidth={0}>
            <DashboardSidebar section={section} />
          </Sider>

          <Layout className="dashboard-main">
            <Header className="dashboard-header">
              <DashboardHeader />
            </Header>

            <Content className="dashboard-content">
              <DashboardPageHeader section={section} />
              {children}
            </Content>
          </Layout>
        </Layout>
      </DashboardActionsProvider>
    </ProtectedRoute>
  );
}
