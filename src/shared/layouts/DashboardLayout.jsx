'use client';

import { Drawer, Grid, Layout } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import ProtectedRoute from '@/src/shared/auth/ProtectedRoute';
import DashboardHeader from '@/src/shared/layouts/DashboardHeader';
import SubscriptionBanner from '@/src/shared/components/SubscriptionBanner';
import LegalFooter from '@/src/shared/components/LegalFooter';
import QuickTask from '@/src/shared/components/QuickTask';
import CommandPalette from '@/src/shared/components/CommandPalette';
import ModuleGuard from '@/src/shared/components/ModuleGuard';
import { DashboardActionsProvider } from '@/src/shared/layouts/DashboardActionsContext';
import DashboardPageHeader from '@/src/shared/layouts/DashboardPageHeader';
import DashboardSidebar from '@/src/shared/layouts/DashboardSidebar';

const { Content, Header, Sider } = Layout;

export default function DashboardLayout({ allowedRoles, children, section }) {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.lg === false;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    if (isMobile) {
      setMobileMenuOpen((open) => !open);
      return;
    }

    setSidebarCollapsed((collapsed) => !collapsed);
  }, [isMobile]);

  const isMenuOpen = isMobile ? mobileMenuOpen : !sidebarCollapsed;

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardActionsProvider>
        <Layout className="dashboard-shell">
          {isMobile ? (
            <Drawer
              className="dashboard-sidebar-drawer"
              placement="left"
              open={mobileMenuOpen}
              onClose={closeMobileMenu}
              width={264}
              closable={false}
              styles={{ body: { padding: 0, background: '#061c32' } }}
            >
              <DashboardSidebar section={section} onNavigate={closeMobileMenu} />
            </Drawer>
          ) : (
            <Sider
              className="dashboard-sidebar"
              width={264}
              collapsed={sidebarCollapsed}
              collapsedWidth={0}
              trigger={null}
            >
              <DashboardSidebar section={section} />
            </Sider>
          )}

          <Layout className="dashboard-main">
            <Header className="dashboard-header">
              <DashboardHeader isMenuOpen={isMenuOpen} onMenuToggle={toggleMenu} />
            </Header>

            <Content className="dashboard-content">
              {section === 'company' ? <SubscriptionBanner /> : null}
              <DashboardPageHeader section={section} />
              {children}
              <LegalFooter />
            </Content>
            <QuickTask />
            <CommandPalette />
            {section === 'company' ? <ModuleGuard /> : null}
          </Layout>
        </Layout>
      </DashboardActionsProvider>
    </ProtectedRoute>
  );
}
