'use client';

import { UploadOutlined, WalletOutlined, ShoppingOutlined, FileImageOutlined, BookOutlined, SafetyCertificateOutlined, CalendarOutlined, FolderOutlined, TeamOutlined, DatabaseOutlined, SettingOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import Link from 'next/link';
import { useT } from '@/src/i18n/LanguageProvider';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/src/store/authStore';
import logo from '@/src/assets/byggexp-logo.svg';
import articlesIcon from '@/src/assets/menu/articles.svg';
import bugReportsIcon from '@/src/assets/menu/bug-reports.svg';
import calendarIcon from '@/src/assets/menu/calendar.svg';
import clientsIcon from '@/src/assets/menu/clients.svg';
import companiesIcon from '@/src/assets/menu/companies.svg';
import dashboardIcon from '@/src/assets/menu/dashboard.svg';
import instrumentsIcon from '@/src/assets/menu/instruments.svg';
import invoicesIcon from '@/src/assets/menu/invoices.svg';
import offersIcon from '@/src/assets/menu/offers.svg';
import projectsIcon from '@/src/assets/menu/projects.svg';
import shiftsIcon from '@/src/assets/menu/shifts.svg';
import tasksIcon from '@/src/assets/menu/tasks.svg';
import usersIcon from '@/src/assets/menu/users.svg';

const logoSrc = typeof logo === 'string' ? logo : logo.src;

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

const MENU_ICONS = {
  dashboard: dashboardIcon,
  users: usersIcon,
  companies: companiesIcon,
  instruments: instrumentsIcon,
  projects: projectsIcon,
  tasks: tasksIcon,
  shifts: shiftsIcon,
  calendar: calendarIcon,
  invoices: invoicesIcon,
  offers: offersIcon,
  clients: clientsIcon,
  articles: articlesIcon,
  'bug-reports': bugReportsIcon,
};

const renderMenuIcon = (iconKey) => (
  <img
    src={resolveSvgSrc(MENU_ICONS[iconKey])}
    width={20}
    height={20}
    alt=""
    aria-hidden="true"
    className="dashboard-sidebar__icon"
  />
);

const NAVIGATION = {
  admin: {
    homePath: '/admin',
    items: [
      { key: 'dashboard', href: '/admin', label: 'Dashboard', iconKey: 'dashboard', roles: ['superadmin'] },
      {
        key: 'produktion',
        label: 'Production',
        icon: <FolderOutlined />,
        children: [
          { key: 'projects', href: '/admin/projects', label: 'Projects', iconKey: 'projects', roles: ['superadmin'] },
          { key: 'tasks', href: '/admin/tasks', label: 'Tasks', iconKey: 'tasks', roles: ['superadmin'] },
          { key: 'dagbok', href: '/admin/dagbok', label: 'Dagbok', icon: <BookOutlined />, roles: ['superadmin'] },
          { key: 'kma', href: '/admin/kma', label: 'KMA', icon: <SafetyCertificateOutlined />, roles: ['superadmin'] },
        ],
      },
      {
        key: 'personal',
        label: 'Time & staff',
        icon: <TeamOutlined />,
        children: [
          { key: 'shifts', href: '/admin/shifts', label: 'Shifts', iconKey: 'shifts', roles: ['superadmin'] },
          { key: 'schedule', href: '/admin/schedule', label: 'Calendar', iconKey: 'calendar', roles: ['superadmin'] },
          { key: 'leave', href: '/admin/leave', label: 'Leave', icon: <CalendarOutlined />, roles: ['superadmin'] },
          { key: 'users', href: '/admin/users', label: 'Users', iconKey: 'users', roles: ['superadmin'] },
        ],
      },
      {
        key: 'ekonomi',
        label: 'Economy',
        icon: <WalletOutlined />,
        children: [
          { key: 'offers', href: '/admin/invoicing/offers', label: 'Offers', iconKey: 'offers', roles: ['superadmin'] },
          { key: 'invoices', href: '/admin/invoicing/invoices', label: 'Invoices', iconKey: 'invoices', roles: ['superadmin'] },
          { key: 'supplier-invoices', href: '/admin/invoicing/supplier-invoices', label: 'Supplier invoices', icon: <ShoppingOutlined />, roles: ['superadmin'] },
          { key: 'expenses', href: '/admin/invoicing/expenses', label: 'Expenses', icon: <FileImageOutlined />, roles: ['superadmin'] },
          { key: 'payroll', href: '/admin/invoicing/payroll', label: 'Payroll', icon: <WalletOutlined />, roles: ['superadmin'] },
        ],
      },
      {
        key: 'register',
        label: 'Register',
        icon: <DatabaseOutlined />,
        children: [
          { key: 'clients', href: '/admin/invoicing/clients', label: 'Clients', iconKey: 'clients', roles: ['superadmin'] },
          { key: 'articles', href: '/admin/invoicing/articles', label: 'Articles', iconKey: 'articles', roles: ['superadmin'] },
          { key: 'tools', href: '/admin/tools', label: 'Instruments', iconKey: 'instruments', roles: ['superadmin'] },
        ],
      },
      {
        key: 'system',
        label: 'System',
        icon: <SettingOutlined />,
        children: [
          { key: 'companies', href: '/admin/companies', label: 'Companies', iconKey: 'companies', roles: ['superadmin'] },
          { key: 'bug-reports', href: '/admin/bug-reports', label: 'Bug Reports', iconKey: 'bug-reports', roles: ['superadmin'] },
        ],
      },
    ],
  },
  company: {
    homePath: '/company',
    items: [
      { key: 'dashboard', href: '/company', label: 'Dashboard', iconKey: 'dashboard' },
      {
        key: 'produktion',
        label: 'Production',
        icon: <FolderOutlined />,
        children: [
          { key: 'projects', href: '/company/projects', label: 'Projects', iconKey: 'projects' },
          { key: 'tasks', href: '/company/tasks', label: 'Tasks', iconKey: 'tasks' },
          { key: 'dagbok', href: '/company/dagbok', label: 'Dagbok', icon: <BookOutlined /> },
          { key: 'kma', href: '/company/kma', label: 'KMA', icon: <SafetyCertificateOutlined /> },
        ],
      },
      {
        key: 'personal',
        label: 'Time & staff',
        icon: <TeamOutlined />,
        children: [
          { key: 'shifts', href: '/company/shifts', label: 'Shifts', iconKey: 'shifts' },
          { key: 'schedule', href: '/company/schedule', label: 'Calendar', iconKey: 'calendar' },
          { key: 'leave', href: '/company/leave', label: 'Leave', icon: <CalendarOutlined /> },
          { key: 'users', href: '/company/users', label: 'Users', iconKey: 'users' },
        ],
      },
      {
        key: 'ekonomi',
        label: 'Economy',
        icon: <WalletOutlined />,
        children: [
          { key: 'offers', href: '/company/invoicing/offers', label: 'Offers', iconKey: 'offers' },
          { key: 'invoices', href: '/company/invoicing/invoices', label: 'Invoices', iconKey: 'invoices' },
          { key: 'supplier-invoices', href: '/company/invoicing/supplier-invoices', label: 'Supplier invoices', icon: <ShoppingOutlined /> },
          { key: 'expenses', href: '/company/invoicing/expenses', label: 'Expenses', icon: <FileImageOutlined /> },
          { key: 'payroll', href: '/company/invoicing/payroll', label: 'Payroll', icon: <WalletOutlined /> },
        ],
      },
      {
        key: 'register',
        label: 'Register',
        icon: <DatabaseOutlined />,
        children: [
          { key: 'clients', href: '/company/invoicing/clients', label: 'Clients', iconKey: 'clients' },
          { key: 'articles', href: '/company/invoicing/articles', label: 'Articles', iconKey: 'articles' },
          { key: 'tools', href: '/company/tools', label: 'Instruments', iconKey: 'instruments' },
        ],
      },
    ],
  },
  projects: {
    homePath: '/projects',
    items: [
      { key: 'dashboard', href: '/projects', label: 'Dashboard', iconKey: 'dashboard' },
      {
        key: 'others',
        label: 'Others',
        children: [
          { key: 'my', href: '/projects/my', label: 'My Projects', iconKey: 'projects' },
        ],
      },
    ],
  },
  worker: {
    homePath: '/worker',
    items: [
      { key: 'dashboard', href: '/worker', label: 'Dashboard', iconKey: 'dashboard' },
      {
        key: 'others',
        label: 'Others',
        children: [
          { key: 'my', href: '/worker/my', label: 'Projects', iconKey: 'projects' },
          { key: 'tools', href: '/worker/tools', label: 'Instruments', iconKey: 'instruments' },
          { key: 'tasks', href: '/worker/tasks', label: 'Tasks', iconKey: 'tasks' },
          { key: 'shifts', href: '/worker/shifts', label: 'Shifts', iconKey: 'shifts' },
          { key: 'schedule', href: '/worker/schedule', label: 'Calendar', iconKey: 'calendar' },
          { key: 'time-report', href: '/worker/time-report', label: 'Log Time', iconKey: 'shifts' },
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

// Categories render as collapsible inline submenus (not static groups) so the
// user can fold away sections they don't need.
const toMenuItems = (items, t) => items.map((item) => {
  if (item.children) {
    return {
      key: item.key,
      icon: item.icon,
      label: t(item.label),
      children: toMenuItems(item.children, t),
    };
  }

  return {
    key: item.key,
    icon: item.iconKey ? renderMenuIcon(item.iconKey) : item.icon,
    label: <Link href={item.href}>{t(item.label)}</Link>,
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
  const t = useT();

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

  const items = useMemo(() => toMenuItems(visibleNavigationItems, t), [visibleNavigationItems, t]);

  const selectedKey = useMemo(() => {
    const activeItem = flattenNavigationItems(visibleNavigationItems)
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => pathname === item.href || (item.href !== config.homePath && pathname.startsWith(`${item.href}/`)));
    return activeItem ? [activeItem.key] : [];
  }, [config.homePath, pathname, visibleNavigationItems]);

  // Collapsible categories: remember which are open per section, and always
  // keep the category holding the current page expanded.
  const groupKeys = useMemo(
    () => visibleNavigationItems.filter((item) => item.children).map((item) => item.key),
    [visibleNavigationItems],
  );

  const activeGroupKey = useMemo(() => {
    const sel = selectedKey[0];
    const group = visibleNavigationItems.find(
      (item) => item.children && item.children.some((child) => child.key === sel),
    );
    return group?.key || null;
  }, [visibleNavigationItems, selectedKey]);

  const storageKey = `byggexp.sidebar.open.${section}`;
  const [openKeys, setOpenKeys] = useState(null);

  useEffect(() => {
    let stored = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) stored = JSON.parse(raw);
    } catch { /* ignore */ }
    setOpenKeys(Array.isArray(stored) ? stored : groupKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const effectiveOpenKeys = useMemo(() => {
    const base = openKeys || groupKeys;
    return activeGroupKey && !base.includes(activeGroupKey) ? [...base, activeGroupKey] : base;
  }, [openKeys, groupKeys, activeGroupKey]);

  const handleOpenChange = useCallback((keys) => {
    setOpenKeys(keys);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(keys));
    } catch { /* ignore */ }
  }, [storageKey]);

  return (
    <aside className="dashboard-sidebar__inner">
      <Link href={config.homePath} className="dashboard-sidebar__brand" aria-label="Go to dashboard home">
        <img src={logoSrc} alt="ByggExp" className="dashboard-sidebar__logo" />
      </Link>

      <Menu
        className="dashboard-sidebar__menu"
        mode="inline"
        selectedKeys={selectedKey}
        openKeys={effectiveOpenKeys}
        onOpenChange={handleOpenChange}
        items={items}
      />
    </aside>
  );
}
