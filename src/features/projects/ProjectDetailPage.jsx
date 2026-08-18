import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useOutletContext } from '@/src/shared/routing/routerCompat';
import {
  Dropdown,
  Empty,
  Spin,
  Tabs,
} from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useProjectStore } from '@/src/store/projectStore';
import { useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useT } from '@/src/i18n/LanguageProvider';
import ProjectDetailHeader from '@/src/features/projects/components/ProjectDetailHeader';
import ProjectOverviewTab from '@/src/features/projects/components/tabs/ProjectOverviewTab';
import ProjectFinanceTab from '@/src/features/projects/components/tabs/ProjectFinanceTab';
import ProjectTeamTab from '@/src/features/projects/components/tabs/ProjectTeamTab';
import ProjectTasksTab from '@/src/features/projects/components/tabs/ProjectTasksTab';
import ProjectGoalsTab from '@/src/features/projects/components/tabs/ProjectGoalsTab';
import ProjectShiftsTab from '@/src/features/projects/components/tabs/ProjectShiftsTab';
import ProjectPersonalliggareTab from '@/src/features/projects/components/tabs/ProjectPersonalliggareTab';
import ProjectAtaTab from '@/src/features/projects/components/tabs/ProjectAtaTab';
import ProjectExpensesTab from '@/src/features/projects/components/tabs/ProjectExpensesTab';
import ProjectPaymentPlanTab from '@/src/features/projects/components/tabs/ProjectPaymentPlanTab';
import ProjectPhotosTab from '@/src/features/projects/components/tabs/ProjectPhotosTab';
import ProjectDocumentsTab from '@/src/features/projects/components/tabs/ProjectDocumentsTab';
import ProjectSettingsTab from '@/src/features/projects/components/tabs/ProjectSettingsTab';
import { resolveProjectPerson } from '@/src/features/projects/utils/projectDetailUtils';

// Tabs grouped by theme. Each group is a menubar entry: multi-tab groups open
// a dropdown of their tabs, single-tab groups act as a direct tab. `labelKey`
// is translated at render; `tabs` keys must match the tab item keys built below.
const TAB_GROUPS = [
  { key: 'general', labelKey: 'General', tabs: ['overview', 'team', 'tasks', 'goals'] },
  { key: 'economy', labelKey: 'Economy', tabs: ['finance', 'expenses', 'ata', 'payment-plan'] },
  { key: 'time', labelKey: 'Time & staff', tabs: ['shifts', 'personalliggare'] },
  { key: 'files', labelKey: 'Files', tabs: ['photos', 'documents'] },
  { key: 'settings', labelKey: 'Settings', tabs: ['settings'] },
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const t = useT();
  const outletContext = useOutletContext();
  const { currentProject, loading, fetchOne } = useProjectStore();
  const [activeTab, setActiveTab] = useState('overview');

  const ownerId = typeof currentProject?.ownerId === 'object'
    ? currentProject?.ownerId?._id
    : currentProject?.ownerId;
  const managerId = typeof currentProject?.projectManagerId === 'object'
    ? currentProject?.projectManagerId?._id
    : currentProject?.projectManagerId;

  const { users } = useUsersInfo([ownerId, managerId].filter(Boolean));

  const refreshProject = useCallback(async () => {
    if (!id) {
      return;
    }

    await fetchOne(id);
  }, [fetchOne, id]);

  useEffect(() => {
    void refreshProject();
  }, [refreshProject]);

  // Stable callbacks only — keying on the whole `outletContext` re-fires this
  // effect every time the context value changes and loops setState forever,
  // which freezes client-side navigation.
  const hideHeaderActions = outletContext?.hideHeaderActions;
  const showHeaderActions = outletContext?.showHeaderActions;
  const unregisterAddButton = outletContext?.unregisterAddButton;

  useEffect(() => {
    hideHeaderActions?.();
    unregisterAddButton?.();

    return () => {
      showHeaderActions?.();
      unregisterAddButton?.();
    };
  }, [hideHeaderActions, showHeaderActions, unregisterAddButton]);

  const owner = useMemo(() => {
    const person = resolveProjectPerson(currentProject?.ownerId);
    if (person?.name) {
      return person;
    }

    return ownerId ? { ...person, name: users[ownerId]?.name } : person;
  }, [currentProject?.ownerId, ownerId, users]);

  const manager = useMemo(() => {
    const person = resolveProjectPerson(currentProject?.projectManagerId);
    if (person?.name) {
      return {
        ...person,
        avatarUrl: person.avatarUrl || users[managerId]?.avatarUrl,
      };
    }

    return managerId
      ? {
        ...person,
        name: users[managerId]?.name,
        avatarUrl: users[managerId]?.avatarUrl,
      }
      : person;
  }, [currentProject?.projectManagerId, managerId, users]);

  const tabItems = useMemo(() => {
    if (!currentProject) {
      return [];
    }

    return [
      {
        key: 'overview',
        label: t('Overview'),
        children: (
          <ProjectOverviewTab
            project={currentProject}
            projectId={id}
            owner={owner}
            manager={manager}
            onEditInformation={() => setActiveTab('settings')}
            onNavigateTab={setActiveTab}
          />
        ),
      },
      {
        key: 'finance',
        label: t('Finance'),
        children: <ProjectFinanceTab project={currentProject} projectId={id} onRefresh={refreshProject} onNavigateTab={setActiveTab} />,
      },
      {
        key: 'expenses',
        label: t('Expenses'),
        children: <ProjectExpensesTab projectId={id} />,
      },
      {
        key: 'team',
        label: t('Team'),
        children: <ProjectTeamTab projectId={id} onRefresh={refreshProject} />,
      },
      {
        key: 'tasks',
        label: t('Tasks'),
        children: <ProjectTasksTab project={currentProject} projectId={id} onRefresh={refreshProject} />,
      },
      {
        key: 'goals',
        label: t('Goals'),
        children: <ProjectGoalsTab projectId={id} />,
      },
      {
        key: 'shifts',
        label: t('Shifts'),
        children: <ProjectShiftsTab projectId={id} />,
      },
      {
        key: 'personalliggare',
        label: t('Personalliggare'),
        children: <ProjectPersonalliggareTab projectId={id} />,
      },
      {
        key: 'ata',
        label: t('ÄTA'),
        children: <ProjectAtaTab projectId={id} />,
      },
      {
        key: 'payment-plan',
        label: t('Payment plan'),
        children: <ProjectPaymentPlanTab projectId={id} project={currentProject} />,
      },
      {
        key: 'photos',
        label: t('Photos'),
        children: <ProjectPhotosTab projectId={id} />,
      },
      {
        key: 'documents',
        label: t('Documents'),
        children: <ProjectDocumentsTab project={currentProject} projectId={id} onRefresh={refreshProject} />,
      },
      {
        key: 'settings',
        label: t('Settings'),
        children: (
          <ProjectSettingsTab
            project={currentProject}
            onSaved={async () => {
              await refreshProject();
              setActiveTab('overview');
            }}
          />
        ),
      },
    ];
  }, [currentProject, id, manager, owner, refreshProject, t]);

  // Grouped navigation: a compact menubar of group names where multi-tab groups
  // open a dropdown of their tabs and single-tab groups act as a direct tab.
  // The tab content itself stays on antd Tabs (with its own bar hidden).
  const tabLabelByKey = useMemo(
    () => new Map(tabItems.map((item) => [item.key, item.label])),
    [tabItems],
  );
  const activeTabLabel = tabLabelByKey.get(activeTab);

  if (loading && !currentProject) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" tip="Loading project..." />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="project-detail-page">
        <Empty description="Project not found" />
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      <ProjectDetailHeader
        project={currentProject}
        owner={owner}
        manager={manager}
      />

      <div className="project-tab-menubar">
        {TAB_GROUPS.map((group) => {
          const groupTabs = group.tabs.filter((key) => tabLabelByKey.has(key));
          if (groupTabs.length === 0) {
            return null;
          }

          const isActiveGroup = groupTabs.includes(activeTab);
          const itemClass = `project-tab-menubar__item${isActiveGroup ? ' is-active' : ''}`;

          if (groupTabs.length === 1) {
            const only = groupTabs[0];
            return (
              <button
                key={group.key}
                type="button"
                className={itemClass}
                onClick={() => setActiveTab(only)}
              >
                {t(group.labelKey)}
              </button>
            );
          }

          return (
            <Dropdown
              key={group.key}
              trigger={['click']}
              menu={{
                selectedKeys: isActiveGroup ? [activeTab] : [],
                onClick: ({ key }) => setActiveTab(key),
                items: groupTabs.map((key) => ({ key, label: tabLabelByKey.get(key) })),
              }}
            >
              <button type="button" className={itemClass}>
                {t(group.labelKey)}
                {isActiveGroup ? (
                  <span className="project-tab-menubar__current">· {activeTabLabel}</span>
                ) : null}
                <DownOutlined className="project-tab-menubar__caret" />
              </button>
            </Dropdown>
          );
        })}
      </div>

      <Tabs
        className="project-detail-tabs project-detail-tabs--headless"
        activeKey={activeTab}
        items={tabItems}
        renderTabBar={() => null}
        destroyOnHidden={false}
      />
    </div>
  );
}
