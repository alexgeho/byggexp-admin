import { useEffect, useMemo, useState } from 'react';
import { Select } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useCompanyStore } from '@/src/store/companyStore';
import { getEntityId, matchesEntityId } from '@/src/utils/entityId';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import companiesIcon from '@/src/assets/icons/companies.svg';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

export default function UserListFilters({
  selectedProjectId,
  selectedCompanyId,
  onProjectChange,
  onCompanyChange,
}) {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const {
    companies,
    currentCompany,
    fetchAll: fetchCompanies,
    fetchMy: fetchMyCompany,
  } = useCompanyStore();
  const [optionsLoading, setOptionsLoading] = useState(false);

  useEffect(() => {
    const loadCompanyOptions = async () => {
      setOptionsLoading(true);
      try {
        if (isSuperAdmin) {
          await fetchCompanies();
        } else if (user?.companyId) {
          await fetchMyCompany();
        }
      } catch (error) {
        console.error('Failed to load company filter options:', error);
      } finally {
        setOptionsLoading(false);
      }
    };

    loadCompanyOptions();
  }, [fetchCompanies, fetchMyCompany, isSuperAdmin, user?.companyId]);

  const companyOptions = useMemo(() => {
    if (!isSuperAdmin) {
      if (!user?.companyId) {
        return [];
      }

      const matchingCompany = companies.find((company) =>
        matchesEntityId(company, user.companyId),
      );
      const companyName = matchingCompany?.name || currentCompany?.name || 'My company';

      return [{
        value: user.companyId,
        label: companyName,
      }];
    }

    return companies.map((company) => ({
      value: getEntityId(company),
      label: company.name,
    }));
  }, [companies, currentCompany?.name, isSuperAdmin, user?.companyId]);

  return (
    <div className="admin-table-toolbar-filters">
      <ProjectFilterSelect
        value={selectedProjectId}
        onChange={onProjectChange}
      />
      <Select
        className="admin-table-filter-select"
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder="All companies"
        value={selectedCompanyId}
        onChange={onCompanyChange}
        options={companyOptions}
        loading={optionsLoading}
        disabled={!isSuperAdmin && companyOptions.length <= 1}
        prefix={(
          <img
            src={resolveSvgSrc(companiesIcon)}
            width={20}
            height={20}
            alt=""
            aria-hidden="true"
          />
        )}
      />
    </div>
  );
}
