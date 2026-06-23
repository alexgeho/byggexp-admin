'use client';

import { CalendarOutlined, ClockCircleOutlined, FolderOpenOutlined, HomeOutlined, ProjectOutlined, TeamOutlined, ToolOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import logo from '../assets/byggexp-logo.png';

const logoSrc = typeof logo === 'string' ? logo : logo.src;

const NAVIGATION = {
  admin: {
    homePath: '/admin/companies',
    items: [
      { key: 'companies', href: '/admin/companies', label: 'Companies', icon: <HomeOutlined />, roles: ['superadmin'] },
      { key: 'users', href: '/admin/users', label: 'Users', icon: <TeamOutlined />, roles: ['superadmin'] },
      { key: 'projects', href: '/admin/projects', label: 'Projects', icon: <ProjectOutlined />, roles: ['superadmin'] },
      { key: 'tasks', href: '/admin/tasks', label: 'Tasks', icon: <FolderOpenOutlined />, roles: ['superadmin'] },
      { key: 'tools', href: '/admin/tools', label: 'Tools', icon: <ToolOutlined />, roles: ['superadmin'] },
      { key: 'shifts', href: '/admin/shifts', label: 'Shifts', icon: <ClockCircleOutlined />, roles: ['superadmin'] },
      { key: 'schedule', href: '/admin/schedule', label: 'Calendar', icon: <CalendarOutlined />, roles: ['superadmin'] },
      { key: 'profile', href: '/admin/profile', label: 'Profile', icon: <UserOutlined />, roles: ['superadmin'] },
    ],
  },
  company: {
    homePath: '/company/projects',
    items: [
      { key: 'projects', href: '/company/projects', label: 'Projects', icon: <ProjectOutlined /> },
      { key: 'tasks', href: '/company/tasks', label: 'Tasks', icon: <FolderOpenOutlined /> },
      { key: 'tools', href: '/company/tools', label: 'Tools', icon: <ToolOutlined /> },
      { key: 'shifts', href: '/company/shifts', label: 'Shifts', icon: <ClockCircleOutlined /> },
      { key: 'schedule', href: '/company/schedule', label: 'Calendar', icon: <CalendarOutlined /> },
      { key: 'users', href: '/company/users', label: 'Employees', icon: <TeamOutlined /> },
      { key: 'profile', href: '/company/profile', label: 'Profile', icon: <UserOutlined /> },
    ],
  },
  projects: {
    homePath: '/projects/my',
    items: [
      { key: 'my', href: '/projects/my', label: 'My Projects', icon: <ProjectOutlined /> },
    ],
  },
  worker: {
    homePath: '/worker/my',
    items: [
      { key: 'my', href: '/worker/my', label: 'My Projects', icon: <UserOutlined /> },
      { key: 'time-report', href: '/worker/time-report', label: 'Log Time', icon: <ClockCircleOutlined /> },
      { key: 'upload', href: '/worker/upload', label: 'Upload Photos', icon: <UploadOutlined /> },
    ],
  },
};

export function getDashboardHomePath(section) {
  return NAVIGATION[section]?.homePath || '/login';
}

export default function DashboardSidebar({ section }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const config = NAVIGATION[section] || NAVIGATION.admin;

  const items = useMemo(() => config.items
    .filter((item) => !item.roles || (userRole && item.roles.includes(userRole)))
    .map((item) => ({
      key: item.key,
      icon: item.icon,
      label: <Link href={item.href}>{item.label}</Link>,
    })), [config.items, userRole]);

  const selectedKey = useMemo(() => {
    const activeItem = config.items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    return activeItem ? [activeItem.key] : [];
  }, [config.items, pathname]);

  return (
    <aside className="dashboard-sidebar__inner">
      <Link href={config.homePath} className="dashboard-sidebar__brand" aria-label="Go to dashboard home">
        <img src={logoSrc} alt="ByggHub" className="dashboard-sidebar__logo" />
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
