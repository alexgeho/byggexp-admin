import { useEffect, useMemo, useState } from 'react';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Badge, Button, Popover } from 'antd';
import { Select } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useCompanyStore } from '@/src/store/companyStore';
import { getEntityId, matchesEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import companiesIcon from '@/src/assets/icons/companies.svg';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

export default function UserListFilters({
  selectedProjectId,
  selectedCompanyId,
  selectedCertStatus,
  onProjectChange,
  onCompanyChange,
  onCertStatusChange,
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

  const certStatusOptions = useMemo(() => [
    { value: 'attention', label: t('Needs attention') },
    { value: 'expired', label: t('Expired') },
    { value: 'expiring', label: t('Expiring soon') },
    { value: 'valid', label: t('Valid') },
    { value: 'none', label: t('No certificate') },
  ], [t]);

  return (
    <div className="admin-table-toolbar-filters">
      <ProjectFilterSelect
        value={selectedProjectId}
        onChange={onProjectChange}
      />
      {/* Certificate status is a secondary filter, tucked behind an icon button
          so it doesn't crowd the main toolbar. A dot marks an active filter. */}
      <Popover
        trigger="click"
        placement="bottomLeft"
        content={(
          <div style={{ width: 220 }}>
            <Select
              className="admin-table-filter-select"
              style={{ width: '100%' }}
              allowClear
              placeholder={t('Certificate status')}
              value={selectedCertStatus}
              onChange={onCertStatusChange}
              options={certStatusOptions}
            />
          </div>
        )}
      >
        <Badge dot={Boolean(selectedCertStatus)}>
          <Button icon={<SafetyCertificateOutlined />}>
            {t('Certificate')}
          </Button>
        </Badge>
      </Popover>
      {/* Only superadmin manages multiple companies; company admins have a
          single company, so the "All companies" filter is noise for them. */}
      {isSuperAdmin ? (
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
