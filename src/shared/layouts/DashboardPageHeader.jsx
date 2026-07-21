'use client';

import { PlusOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { Button } from '@/src/ui-kit';
import { useDashboardActions } from '@/src/shared/layouts/DashboardActionsContext';

const PAGE_TITLES = {
  admin: {
    dashboard: 'Dashboard',
    companies: 'Companies',
    users: 'Users',
    projects: 'Projects',
    tasks: 'Tasks',
    tools: 'Tools',
    shifts: 'Shifts',
    schedule: 'Calendar',
    invoicing: 'Invoicing',
    invoices: 'Invoices',
    offers: 'Offers',
    clients: 'Clients',
    articles: 'Articles',
    'bug-reports': 'Bug Reports',
  },
  company: {
    dashboard: 'Dashboard',
    projects: 'Projects',
    tasks: 'Tasks',
    tools: 'Tools',
    shifts: 'Shifts',
    schedule: 'Calendar',
    users: 'Employees',
    invoicing: 'Invoicing',
    invoices: 'Invoices',
    offers: 'Offers',
    clients: 'Clients',
    articles: 'Articles',
  },
  projects: {
    dashboard: 'Dashboard',
    my: 'My Projects',
  },
  worker: {
    dashboard: 'Dashboard',
    my: 'My Projects',
    'time-report': 'Log Time',
    upload: 'Upload Photos',
  },
};

const PAGE_SUBTITLES = {
  admin: {
    users: 'Manage your team members and their access',
    companies: 'Manage your companies',
    tools: 'Manage your instruments',
    projects: 'Manage and track all projects',
    tasks: 'Manage and track all worker shifts',
    shifts: 'Manage and track all worker shifts',
    schedule: 'View employee schedules and project assignments',
    offers: 'Manage and track all offers',
    invoices: 'Manage and track all offers',
    clients: 'Manage your clients',
    articles: 'Manage your articles',
  },
  company: {
    users: 'Manage your team members and their access',
    tools: 'Manage your instruments',
    projects: 'Manage and track all projects',
    tasks: 'Manage and track all worker shifts',
    shifts: 'Manage and track all worker shifts',
    schedule: 'View employee schedules and project assignments',
    offers: 'Manage and track all offers',
    invoices: 'Manage and track all offers',
    clients: 'Manage your clients',
    articles: 'Manage your articles',
  },
};

const DETAIL_TITLES = {
  users: 'User Details',
  shifts: 'Shift Details',
  projects: 'Project Details',
};

const getPageMeta = (section, pathname) => {
  const segments = pathname.split('/').filter(Boolean);
  const projectsIndex = segments.indexOf('projects');
  const projectDetailId = projectsIndex >= 0 ? segments[projectsIndex + 1] : null;
  const isProjectDetailPage = Boolean(projectDetailId) && projectDetailId !== 'my';

  if (isProjectDetailPage) {
    return { title: null, subtitle: null, hidden: true };
  }

  const isNestedInvoicing = segments[1] === 'invoicing' && segments[2];
  const pageKey = isNestedInvoicing ? segments[2] : (segments[1] || 'dashboard');
  const detailKey = !isNestedInvoicing && segments.length > 2 ? pageKey : '';

  if (section === 'projects' && segments[1] && segments[1] !== 'my') {
    return { title: DETAIL_TITLES.projects, subtitle: null, hidden: false };
  }

  if (detailKey && DETAIL_TITLES[detailKey]) {
    return { title: DETAIL_TITLES[detailKey], subtitle: null, hidden: false };
  }

  return {
    title: PAGE_TITLES[section]?.[pageKey] || 'Dashboard',
    subtitle: PAGE_SUBTITLES[section]?.[pageKey] || null,
    hidden: false,
  };
};

export default function DashboardPageHeader({ section }) {
  const pathname = usePathname();
  const {
    addBtnText,
    addClickHandler,
    headerActionsVisible,
  } = useDashboardActions();

  const { title, subtitle, hidden } = useMemo(() => getPageMeta(section, pathname), [pathname, section]);
  const isDashboardPage = pathname === `/${section}`;
  const canShowCreateActions = section !== 'worker' && headerActionsVisible && Boolean(addClickHandler);
  const canShowBulkAction = section === 'admin' || section === 'company';

  if (isDashboardPage || hidden) {
    return null;
  }

  return (
    <div className="dashboard-page-header">
      <div>
        <h1 className="dashboard-page-header__title">{title}</h1>
        {subtitle ? (
          <p className="dashboard-page-header__subtitle">{subtitle}</p>
        ) : null}
      </div>

      {canShowCreateActions ? (
        <div className="dashboard-page-header__actions">
          {canShowBulkAction ? (
            <Button className="btn-light" disabled={!addClickHandler}>Add in bulk</Button>
          ) : null}
          <Button icon={<PlusOutlined />} onClick={addClickHandler} disabled={!addClickHandler}>
            {addBtnText}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
