import { useEffect, useMemo, useState } from 'react';
import { Select } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useProjectStore } from '@/src/store/projectStore';
import { getEntityId } from '@/src/utils/entityId';
import projectsIcon from '@/src/assets/icons/projects.svg';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

export default function ProjectFilterSelect({
  value,
  onChange,
  className = 'admin-table-filter-select',
  placeholder = 'All projects',
}) {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const { projects, fetchAll: fetchProjects, fetchByCompany: fetchProjectsByCompany } = useProjectStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        if (isSuperAdmin) {
          await fetchProjects();
        } else if (user?.companyId) {
          await fetchProjectsByCompany(user.companyId);
        }
      } catch (error) {
        console.error('Failed to load project filter options:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [fetchProjects, fetchProjectsByCompany, isSuperAdmin, user?.companyId]);

  const projectOptions = useMemo(
    () => projects.map((project) => ({
      value: getEntityId(project),
      label: project.name,
    })),
    [projects],
  );

  return (
    <Select
      className={className}
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      options={projectOptions}
      loading={loading}
      prefix={(
        <img
          src={resolveSvgSrc(projectsIcon)}
          width={20}
          height={20}
          alt=""
          aria-hidden="true"
        />
      )}
    />
  );
}
