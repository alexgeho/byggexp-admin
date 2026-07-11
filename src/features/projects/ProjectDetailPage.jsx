import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useOutletContext } from '@/src/shared/routing/routerCompat';
import {
  Empty,
  Spin,
  Tabs,
} from 'antd';
import { useProjectStore } from '@/src/store/projectStore';
import { useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import ProjectDetailHeader from '@/src/features/projects/components/ProjectDetailHeader';
import ProjectOverviewTab from '@/src/features/projects/components/tabs/ProjectOverviewTab';
import ProjectTeamTab from '@/src/features/projects/components/tabs/ProjectTeamTab';
import ProjectTasksTab from '@/src/features/projects/components/tabs/ProjectTasksTab';
import ProjectShiftsTab from '@/src/features/projects/components/tabs/ProjectShiftsTab';
import ProjectPhotosTab from '@/src/features/projects/components/tabs/ProjectPhotosTab';
import ProjectDocumentsTab from '@/src/features/projects/components/tabs/ProjectDocumentsTab';
import ProjectSettingsTab from '@/src/features/projects/components/tabs/ProjectSettingsTab';
import { resolveProjectPerson } from '@/src/features/projects/utils/projectDetailUtils';

export default function ProjectDetailPage() {
  const { id } = useParams();
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

  useEffect(() => {
    outletContext?.hideHeaderActions?.();
    outletContext?.unregisterAddButton?.();

    return () => {
      outletContext?.showHeaderActions?.();
      outletContext?.unregisterAddButton?.();
    };
  }, [outletContext]);

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
        label: 'Overview',
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
        key: 'team',
        label: 'Team',
        children: <ProjectTeamTab projectId={id} onRefresh={refreshProject} />,
      },
      {
        key: 'tasks',
        label: 'Tasks',
        children: <ProjectTasksTab project={currentProject} projectId={id} onRefresh={refreshProject} />,
      },
      {
        key: 'shifts',
        label: 'Shifts',
        children: <ProjectShiftsTab projectId={id} />,
      },
      {
        key: 'photos',
        label: 'Photos',
        children: <ProjectPhotosTab projectId={id} />,
      },
      {
        key: 'documents',
        label: 'Documents',
        children: <ProjectDocumentsTab project={currentProject} projectId={id} onRefresh={refreshProject} />,
      },
      {
        key: 'settings',
        label: 'Settings',
        children: (
          <ProjectSettingsTab
            project={currentProject}
            onSaved={refreshProject}
          />
        ),
      },
    ];
  }, [currentProject, id, manager, owner, refreshProject]);

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
        items={tabItems}
        destroyOnHidden={false}
      />
    </div>
  );
}
