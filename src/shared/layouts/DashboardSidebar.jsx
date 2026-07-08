'use client';

import { AppstoreOutlined, CalendarOutlined, ClockCircleOutlined, DashboardOutlined, FileTextOutlined, FolderOpenOutlined, HomeOutlined, ProjectOutlined, TeamOutlined, ToolOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useAuthStore } from '@/src/store/authStore';
import logo from '@/src/assets/byggexp-logo.png';

const logoSrc = typeof logo === 'string' ? logo : logo.src;

const NAVIGATION = {
  admin: {
    homePath: '/admin',
    items: [
      { key: 'dashboard', href: '/admin', label: 'Dashboard', icon: <DashboardOutlined />, roles: ['superadmin'] },
      {
        key: 'data',
        label: 'Data',
        children: [
          { key: 'users', href: '/admin/users', label: 'Users', icon: <TeamOutlined />, roles: ['superadmin'] },
          { key: 'companies', href: '/admin/companies', label: 'Companies', icon: <HomeOutlined />, roles: ['superadmin'] },
          { key: 'tools', href: '/admin/tools', label: 'Instruments', icon: <ToolOutlined />, roles: ['superadmin'] },
        ],
      },
      {
        key: 'others',
        label: 'Others',
        children: [
          { key: 'projects', href: '/admin/projects', label: 'Projects', icon: <ProjectOutlined />, roles: ['superadmin'] },
          { key: 'tasks', href: '/admin/tasks', label: 'Tasks', icon: <FolderOpenOutlined />, roles: ['superadmin'] },
          { key: 'shifts', href: '/admin/shifts', label: 'Shifts', icon: <ClockCircleOutlined />, roles: ['superadmin'] },
          { key: 'schedule', href: '/admin/schedule', label: 'Calendar', icon: <CalendarOutlined />, roles: ['superadmin'] },
        ],
      },
      {
        key: 'invoicing',
        label: 'Invoicing',
        children: [
          { key: 'invoices', href: '/admin/invoicing/invoices', label: 'Invoices', icon: <FileTextOutlined />, roles: ['superadmin'] },
          { key: 'offers', href: '/admin/invoicing/offers', label: 'Offers', icon: <FileTextOutlined />, roles: ['superadmin'] },
          { key: 'clients', href: '/admin/invoicing/clients', label: 'Clients', icon: <TeamOutlined />, roles: ['superadmin'] },
          { key: 'articles', href: '/admin/invoicing/articles', label: 'Articles', icon: <AppstoreOutlined />, roles: ['superadmin'] },
        ],
      },
    ],
  },
  company: {
    homePath: '/company',
    items: [
      { key: 'dashboard', href: '/company', label: 'Dashboard', icon: <DashboardOutlined /> },
      {
        key: 'data',
        label: 'Data',
        children: [
          { key: 'users', href: '/company/users', label: 'Users', icon: <TeamOutlined /> },
          { key: 'tools', href: '/company/tools', label: 'Instruments', icon: <ToolOutlined /> },
        ],
      },
      {
        key: 'others',
        label: 'Others',
        children: [
          { key: 'projects', href: '/company/projects', label: 'Projects', icon: <ProjectOutlined /> },
          { key: 'tasks', href: '/company/tasks', label: 'Tasks', icon: <FolderOpenOutlined /> },
          { key: 'shifts', href: '/company/shifts', label: 'Shifts', icon: <ClockCircleOutlined /> },
          { key: 'schedule', href: '/company/schedule', label: 'Calendar', icon: <CalendarOutlined /> },
        ],
      },
      {
        key: 'invoicing',
        label: 'Invoicing',
        children: [
          { key: 'invoices', href: '/company/invoicing/invoices', label: 'Invoices', icon: <FileTextOutlined /> },
          { key: 'offers', href: '/company/invoicing/offers', label: 'Offers', icon: <FileTextOutlined /> },
          { key: 'clients', href: '/company/invoicing/clients', label: 'Clients', icon: <TeamOutlined /> },
          { key: 'articles', href: '/company/invoicing/articles', label: 'Articles', icon: <AppstoreOutlined /> },
        ],
      },
    ],
  },
  projects: {
    homePath: '/projects',
    items: [
      { key: 'dashboard', href: '/projects', label: 'Dashboard', icon: <DashboardOutlined /> },
      {
        key: 'others',
        label: 'Others',
        children: [
          { key: 'my', href: '/projects/my', label: 'My Projects', icon: <ProjectOutlined /> },
        ],
      },
    ],
  },
  worker: {
    homePath: '/worker',
    items: [
      { key: 'dashboard', href: '/worker', label: 'Dashboard', icon: <DashboardOutlined /> },
      {
        key: 'others',
        label: 'Others',
        children: [
          { key: 'my', href: '/worker/my', label: 'My Projects', icon: <UserOutlined /> },
          { key: 'time-report', href: '/worker/time-report', label: 'Log Time', icon: <ClockCircleOutlined /> },
          { key: 'upload', href: '/worker/upload', label: 'Upload Photos', icon: <UploadOutlined /> },
        ],
      },
    ],
  },
};

const canShowItem = (item, userRole) => !item.roles || (userRole && item.roles.includes(userRole));

const getVisibleNavigationItems = (items, userRole) => items
  .map((item) => {
    if (!item.children) {
      return canShowItem(item, userRole) ? item : null;
    }

    const children = getVisibleNavigationItems(item.children, userRole);
    return children.length ? { ...item, children } : null;
  })
  .filter(Boolean);

const toMenuItems = (items) => items.map((item) => {
  if (item.children) {
    return {
      key: item.key,
      type: 'group',
      label: item.label,
      children: toMenuItems(item.children),
    };
  }

  return {
    key: item.key,
    icon: item.icon,
    label: <Link href={item.href}>{item.label}</Link>,
  };
});

const flattenNavigationItems = (items) => items.flatMap((item) => (
  item.children ? flattenNavigationItems(item.children) : item
));

export function getDashboardHomePath(section) {
  return NAVIGATION[section]?.homePath || '/login';
}

export default function DashboardSidebar({ onNavigate, section }) {
  const pathname = usePathname();

  useEffect(() => {
    onNavigate?.();
  }, [onNavigate, pathname]);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const config = NAVIGATION[section] || NAVIGATION.admin;

  const visibleNavigationItems = useMemo(
    () => getVisibleNavigationItems(config.items, userRole),
    [config.items, userRole],
  );

  const items = useMemo(() => toMenuItems(visibleNavigationItems), [visibleNavigationItems]);

  const selectedKey = useMemo(() => {
    const activeItem = flattenNavigationItems(visibleNavigationItems)
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => pathname === item.href || (item.href !== config.homePath && pathname.startsWith(`${item.href}/`)));
    return activeItem ? [activeItem.key] : [];
  }, [config.homePath, pathname, visibleNavigationItems]);

  return (
    <aside className="dashboard-sidebar__inner">
      <Link href={config.homePath} className="dashboard-sidebar__brand" aria-label="Go to dashboard home">
        <img src={logoSrc} alt="ByggExp" className="dashboard-sidebar__logo" />
      </Link>

      <Menu
        className="dashboard-sidebar__menu"
        mode="inline"
        selectedKeys={selectedKey}
        items={items}
      />
    </aside>
  );
}
