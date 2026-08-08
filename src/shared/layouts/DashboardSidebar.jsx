'use client';

import { AppstoreOutlined, BankOutlined, BookOutlined, BugOutlined, CalendarOutlined, CheckCircleOutlined, CheckSquareOutlined, ClockCircleOutlined, CoffeeOutlined, ContactsOutlined, CreditCardOutlined, DatabaseOutlined, FieldTimeOutlined, FileImageOutlined, FileTextOutlined, FolderOutlined, HistoryOutlined, HomeOutlined, ProfileOutlined, QuestionCircleOutlined, RiseOutlined, SafetyCertificateOutlined, SettingOutlined, ShoppingOutlined, SolutionOutlined, TagsOutlined, TeamOutlined, ThunderboltOutlined, ToolOutlined, UploadOutlined, UsergroupAddOutlined, WalletOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import Link from 'next/link';
import { useT } from '@/src/i18n/LanguageProvider';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/src/store/authStore';
import { useModuleStore } from '@/src/store/moduleStore';
import logo from '@/src/assets/byggexp-logo.svg';

const logoSrc = typeof logo === 'string' ? logo : logo.src;

// One antd icon per menu key: a single library, a single (inherited) colour and
// a unique glyph for every item — no icon is reused across two entries.
const ICONS = {
  dashboard: <HomeOutlined />,
  approvals: <CheckSquareOutlined />,
  my: <ProfileOutlined />,
  projects: <FolderOutlined />,
  tasks: <CheckCircleOutlined />,
  dagbok: <BookOutlined />,
  kma: <SafetyCertificateOutlined />,
  bemanning: <TeamOutlined />,
  tools: <ToolOutlined />,
  users: <UsergroupAddOutlined />,
  shifts: <ClockCircleOutlined />,
  schedule: <CalendarOutlined />,
  leave: <CoffeeOutlined />,
  offers: <SolutionOutlined />,
  invoices: <FileTextOutlined />,
  'supplier-invoices': <ShoppingOutlined />,
  expenses: <FileImageOutlined />,
  payroll: <WalletOutlined />,
  profitability: <RiseOutlined />,
  clients: <ContactsOutlined />,
  articles: <TagsOutlined />,
  audit: <HistoryOutlined />,
  billing: <CreditCardOutlined />,
  modules: <AppstoreOutlined />,
  help: <QuestionCircleOutlined />,
  companies: <BankOutlined />,
  'system-status': <ThunderboltOutlined />,
  'bug-reports': <BugOutlined />,
  'time-report': <FieldTimeOutlined />,
  upload: <UploadOutlined />,
};

export const NAVIGATION = {
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
          { key: 'users', href: '/admin/users', label: 'Staff', iconKey: 'users', roles: ['superadmin'] },
        ],
      },
      {
        key: 'ekonomi',
        label: 'Economy',
        icon: <WalletOutlined />,
        children: [
          { key: 'offers', href: '/admin/invoicing/offers', label: 'Offers', iconKey: 'offers', roles: ['superadmin'] },
          { key: 'invoices', href: '/admin/invoicing/invoices', label: 'Invoices', iconKey: 'invoices', roles: ['superadmin'] },
          { key: 'supplier-invoices', href: '/admin/invoicing/supplier-invoices', label: 'Purchase invoices', icon: <ShoppingOutlined />, roles: ['superadmin'] },
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
          { key: 'tools', href: '/admin/tools', label: 'Tools', iconKey: 'instruments', roles: ['superadmin'] },
        ],
      },
      {
        key: 'system',
        label: 'System',
        icon: <SettingOutlined />,
        children: [
          { key: 'companies', href: '/admin/companies', label: 'Companies', iconKey: 'companies', roles: ['superadmin'] },
          { key: 'system-status', href: '/admin/system', label: 'System status', icon: <ThunderboltOutlined />, roles: ['superadmin'] },
          { key: 'bug-reports', href: '/admin/bug-reports', label: 'Bug Reports', iconKey: 'bug-reports', roles: ['superadmin'] },
        ],
      },
    ],
  },
  company: {
    homePath: '/company',
    items: [
      { key: 'dashboard', href: '/company', label: 'Dashboard', iconKey: 'dashboard' },
      // Unified "Mitt arbete" surface (approvals + personal tasks). Keeps the
      // `approvals` key so per-company module visibility behaves exactly as the
      // old "To do" entry did.
      { key: 'approvals', href: '/company/my-work', label: 'My work', icon: <CheckSquareOutlined /> },
      {
        key: 'produktion',
        label: 'Production',
        icon: <FolderOutlined />,
        children: [
          { key: 'projects', href: '/company/projects', label: 'Projects', iconKey: 'projects' },
          { key: 'tasks', href: '/company/tasks', label: 'Tasks', iconKey: 'tasks' },
          { key: 'dagbok', href: '/company/dagbok', label: 'Dagbok', icon: <BookOutlined /> },
          { key: 'kma', href: '/company/kma', label: 'KMA', icon: <SafetyCertificateOutlined /> },
          { key: 'bemanning', href: '/company/bemanning', label: 'Staffing', icon: <TeamOutlined /> },
          { key: 'tools', href: '/company/tools', label: 'Tools', iconKey: 'instruments' },
          { key: 'users', href: '/company/users', label: 'Staff', iconKey: 'users' },
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
        ],
      },
      {
        key: 'ekonomi',
        label: 'Economy',
        icon: <WalletOutlined />,
        children: [
          { key: 'offers', href: '/company/invoicing/offers', label: 'Offers', iconKey: 'offers' },
          { key: 'invoices', href: '/company/invoicing/invoices', label: 'Invoices', iconKey: 'invoices' },
          { key: 'supplier-invoices', href: '/company/invoicing/supplier-invoices', label: 'Purchase invoices', icon: <ShoppingOutlined /> },
          { key: 'expenses', href: '/company/invoicing/expenses', label: 'Expenses', icon: <FileImageOutlined /> },
          { key: 'payroll', href: '/company/invoicing/payroll', label: 'Payroll', icon: <WalletOutlined /> },
          { key: 'profitability', href: '/company/profitability', label: 'Profitability', icon: <RiseOutlined /> },
        ],
      },
      {
        key: 'register',
        label: 'Register',
        icon: <DatabaseOutlined />,
        children: [
          { key: 'clients', href: '/company/invoicing/clients', label: 'Clients', iconKey: 'clients' },
          { key: 'articles', href: '/company/invoicing/articles', label: 'Articles', iconKey: 'articles' },
          { key: 'audit', href: '/company/audit', label: 'Audit log', icon: <HistoryOutlined /> },
          { key: 'billing', href: '/company/billing', label: 'Subscription', icon: <CreditCardOutlined /> },
          { key: 'modules', href: '/company/modules', label: 'Customize menu', icon: <AppstoreOutlined /> },
        ],
      },
      { key: 'help', href: '/company/help', label: 'Help', icon: <QuestionCircleOutlined /> },
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
          { key: 'tools', href: '/worker/tools', label: 'Tools', iconKey: 'instruments' },
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

// Drop any leaf whose module has been hidden for this company. `enabled` null
// (superadmin / not loaded) means show everything.
const filterByEnabledModules = (items, enabled) => {
  if (!enabled) return items;
  return items
    .map((item) => {
      if (!item.children) {
        return enabled.includes(item.key) ? item : null;
      }
      const children = filterByEnabledModules(item.children, enabled);
      return children.length ? { ...item, children } : null;
    })
    .filter(Boolean);
};

// Categories render as collapsible inline submenus (not static groups) so the
// user can fold away sections they don't need.
const toMenuItems = (items, t) => items.map((item) => {
  if (item.children) {
    return {
      key: item.key,
      label: t(item.label),
      children: toMenuItems(item.children, t),
    };
  }

  return {
    key: item.key,
    icon: ICONS[item.key] || item.icon,
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

  const enabledModules = useModuleStore((state) => state.enabled);

  const visibleNavigationItems = useMemo(() => {
    const byRole = getVisibleNavigationItems(config.items, userRole);
    // Module hiding only applies to the company panel; superadmin sees all.
    if (section !== 'company' || userRole === 'superadmin') return byRole;
    return filterByEnabledModules(byRole, enabledModules);
  }, [config.items, userRole, section, enabledModules]);

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

  // v2: reset any stored state so everyone starts with all categories collapsed.
  const storageKey = `byggexp.sidebar.open.v2.${section}`;
  const [openKeys, setOpenKeys] = useState(null);

  useEffect(() => {
    let stored = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) stored = JSON.parse(raw);
    } catch { /* ignore */ }
    // Default: everything collapsed (the active category still auto-opens via
    // effectiveOpenKeys) so the menu stays compact until the user expands.
    setOpenKeys(Array.isArray(stored) ? stored : []);
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
