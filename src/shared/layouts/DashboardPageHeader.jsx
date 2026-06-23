'use client';

import { Button } from 'antd';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
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
  },
  company: {
    dashboard: 'Dashboard',
    projects: 'Projects',
    tasks: 'Tasks',
    tools: 'Tools',
    shifts: 'Shifts',
    schedule: 'Calendar',
    users: 'Employees',
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

const DETAIL_TITLES = {
  users: 'User Details',
  shifts: 'Shift Details',
  projects: 'Project Details',
};

const getPageTitle = (section, pathname) => {
  const segments = pathname.split('/').filter(Boolean);
  const pageKey = segments[1] || 'dashboard';
  const detailKey = segments.length > 2 ? pageKey : '';

  if (section === 'projects' && segments[1] && segments[1] !== 'my') {
    return DETAIL_TITLES.projects;
  }

  if (detailKey && DETAIL_TITLES[detailKey]) {
    return DETAIL_TITLES[detailKey];
  }

  return PAGE_TITLES[section]?.[pageKey] || 'Dashboard';
};

export default function DashboardPageHeader({ section }) {
  const pathname = usePathname();
  const {
    addBtnText,
    addClickHandler,
    headerActionsVisible,
  } = useDashboardActions();

  const title = useMemo(() => getPageTitle(section, pathname), [pathname, section]);
  const canShowCreateActions = section !== 'worker' && headerActionsVisible && Boolean(addClickHandler);
  const canShowBulkAction = section === 'admin' || section === 'company';

  return (
    <div className="dashboard-page-header">
      <div>
        <h1 className="dashboard-page-header__title">{title}</h1>
      </div>

      {canShowCreateActions ? (
        <div className="dashboard-page-header__actions">
          {canShowBulkAction ? (
            <Button className="btn-light" disabled={!addClickHandler}>Add in bulk</Button>
          ) : null}
          <Button type="primary" onClick={addClickHandler} disabled={!addClickHandler}>
            {addBtnText}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
