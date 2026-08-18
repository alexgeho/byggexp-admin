import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useOutletContext } from '@/src/shared/routing/routerCompat';
import {
  Empty,
  Spin,
  Tabs,
} from 'antd';
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

// Tab order grouped by theme; a divider is drawn between each group. Keys must
// match the tab item keys built below.
const TAB_GROUPS = [
  ['overview', 'team', 'tasks', 'goals'],
  ['finance', 'expenses', 'ata', 'payment-plan'],
  ['shifts', 'personalliggare'],
  ['photos', 'documents'],
  ['settings'],
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

  // Keep the tabs in one row but grouped: order them by theme and drop a thin
  // divider between groups so the bar reads as sections without a second nav
  // row. Dividers are rendered as disabled tabs (never selectable).
  const orderedTabItems = useMemo(() => {
    const byKey = new Map(tabItems.map((item) => [item.key, item]));
    const out = [];
    TAB_GROUPS.forEach((group, groupIndex) => {
      if (groupIndex > 0) {
        out.push({
          key: `tab-divider-${groupIndex}`,
          disabled: true,
          label: <span className="project-tab-divider" aria-hidden="true" />,
        });
      }
      group.forEach((key) => {
        const item = byKey.get(key);
        if (item) {
          out.push(item);
        }
      });
    });
    return out;
  }, [tabItems]);

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

      <Tabs
        className="project-detail-tabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={orderedTabItems}
        destroyOnHidden={false}
      />
    </div>
  );
}
