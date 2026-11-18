import { useEffect, useMemo, useState } from 'react';
import { Select } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useCompanyStore } from '@/src/store/companyStore';
import { getEntityId, matchesEntityId } from '@/src/utils/entityId';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import companiesIcon from '@/src/assets/icons/companies.svg';

import { resolveSvgSrc } from '@/src/utils/assets';
import { useT } from '@/src/i18n/LanguageProvider';

export default function UserListFilters({
  selectedProjectId,
  selectedCompanyId,
  onProjectChange,
  onCompanyChange,
  selectedFirm,
  onFirmChange,
  subcontractors = [],
}) {
  const t = useT();
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
      const companyName = matchingCompany?.name || currentCompany?.name || t('My company');

      return [{
        value: user.companyId,
        label: companyName,
      }];
    }

    return companies.map((company) => ({
      value: getEntityId(company),
      label: company.name,
    }));
  }, [companies, currentCompany?.name, isSuperAdmin, user?.companyId, t]);

  // «Alla företag»: own staff or one subcontractor firm. Shown to the company's
  // people only once the company has a subcontractor (no empty filter).
  const firmOptions = useMemo(() => [
    { value: 'all', label: t('All firms') },
    { value: 'own', label: t('Own staff') },
    ...subcontractors.map((firm) => ({ value: String(getEntityId(firm)), label: firm.name })),
  ], [subcontractors, t]);
  const showFirmFilter = subcontractors.length > 0 && user?.role !== 'subcontractor';

  return (
    <div className="admin-table-toolbar-filters">
      <ProjectFilterSelect
        value={selectedProjectId}
        onChange={onProjectChange}
      />
      {showFirmFilter ? (
        <Select
          className="admin-table-filter-select"
          placeholder={t('All firms')}
          value={selectedFirm}
          onChange={(next) => onFirmChange?.(next === 'all' ? undefined : next)}
          options={firmOptions}
        />
      ) : null}
      {/* Only superadmin manages multiple companies; company admins have a
          single company, so the "All companies" filter is noise for them. */}
      {isSuperAdmin ? (
        <Select
          className="admin-table-filter-select"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t('All companies')}
          value={selectedCompanyId}
          onChange={onCompanyChange}
          options={companyOptions}
          loading={optionsLoading}
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
      ) : null}
    </div>
  );
}
