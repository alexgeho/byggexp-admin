import { useEffect, useMemo, useState } from 'react';
import { Select } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useProjectStore } from '@/src/store/projectStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import projectsIcon from '@/src/assets/icons/projects.svg';

import { resolveSvgSrc } from '@/src/utils/assets';

// Sentinel value for the "All projects" reset row (maps back to undefined).
const ALL_PROJECTS = '__all_projects__';

export default function ProjectFilterSelect({
  value,
  onChange,
  className = 'admin-table-filter-select',
  placeholder = 'All projects',
}) {
  const t = useT();
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

  // A first "All projects" row lets the user step back to the unfiltered view
  // from inside the dropdown (not only via the small clear ✕). Selecting it
  // resets the value to undefined, exactly like clearing.
  const projectOptions = useMemo(
    () => [
      { value: ALL_PROJECTS, label: t('All projects') },
      ...projects.map((project) => ({
        value: getEntityId(project),
        label: project.name,
      })),
    ],
    [projects, t],
  );

  const handleChange = (next) => onChange(next === ALL_PROJECTS ? undefined : next);

  return (
    <Select
      className={className}
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder={t(placeholder)}
      value={value}
      onChange={handleChange}
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
