'use client';

import { Layout } from 'antd';
import ProtectedRoute from '../components/ProtectedRoute';
import DashboardHeader from './DashboardHeader';
import { DashboardActionsProvider } from './DashboardActionsContext';
import DashboardPageHeader from './DashboardPageHeader';
import DashboardSidebar from './DashboardSidebar';

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
