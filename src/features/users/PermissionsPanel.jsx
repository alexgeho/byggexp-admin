import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Space, Spin, Tag, Typography, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import { useT } from '@/src/i18n/LanguageProvider';

// Per-user capability editor. The admin toggles the *effective* capabilities;
// we derive the minimal granted/revoked overrides against the role defaults so
// a role change later still carries its baseline. Backend: PUT
// /users/permissions/:id, catalog from GET /users/permissions/catalog.
export default function PermissionsPanel({ userId, role, capabilities, onChanged }) {
  const t = useT();
  const [catalog, setCatalog] = useState(null);
  const [defaultsByRole, setDefaultsByRole] = useState({});
  const [checked, setChecked] = useState(() => new Set(capabilities?.effective || []));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await apiClient.get('/users/permissions/catalog');
        if (!alive) return;
        setCatalog(data.permissions || []);
        setDefaultsByRole(data.defaultsByRole || {});
      } catch {
        if (alive) message.error(t('Failed to load permissions'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [t]);

  // Reset the checkboxes whenever the loaded user's effective set changes.
  useEffect(() => {
    setChecked(new Set(capabilities?.effective || []));
  }, [capabilities]);

  const roleDefaults = useMemo(
    () => new Set(defaultsByRole[role] || []),
    [defaultsByRole, role],
  );

  const initialEffective = useMemo(
    () => new Set(capabilities?.effective || []),
    [capabilities],
  );

  const dirty = useMemo(() => {
    if (checked.size !== initialEffective.size) return true;
    for (const key of checked) if (!initialEffective.has(key)) return true;
    return false;
  }, [checked, initialEffective]);

  const toggle = (key) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSuperadmin = role === 'superadmin';

  const save = async () => {
    // Minimal overrides vs the role baseline.
    const granted = [];
    const revoked = [];
    for (const { key } of catalog || []) {
      const isDefault = roleDefaults.has(key);
      const want = checked.has(key);
      if (want && !isDefault) granted.push(key);
      if (!want && isDefault) revoked.push(key);
    }
    try {
      setSaving(true);
      await apiClient.put(`/users/permissions/${userId}`, { granted, revoked });
      message.success(t('Permissions updated'));
      await onChanged?.();
    } catch {
      message.error(t('Failed to update permissions'));
    } finally {
      setSaving(false);
    }
  };

  const resetToRole = () => setChecked(new Set(roleDefaults));

  if (loading) {
    return (
      <Card title={t('Permissions')}>
        <Spin />
      </Card>
    );
  }

  return (
    <Card
      title={t('Permissions')}
      extra={(
        <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
          <Space>
            <Button onClick={resetToRole} disabled={saving || isSuperadmin}>
              {t('Reset to role defaults')}
            </Button>
            <Button type="primary" onClick={save} loading={saving} disabled={!dirty || isSuperadmin}>
              {t('Save')}
            </Button>
          </Space>
        </RoleBasedAccess>
      )}
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {t('Grant capabilities beyond this user’s role — e.g. let an office user handle invoicing without making them an admin. The role’s default capabilities are marked.')}
      </Typography.Paragraph>

      {isSuperadmin ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('Superadmin has every capability; overrides do not apply.')}
        />
      ) : null}

      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {(catalog || []).map(({ key, label }) => {
          const isDefault = roleDefaults.has(key);
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Checkbox
                checked={checked.has(key)}
                disabled={isSuperadmin}
                onChange={() => toggle(key)}
              >
                {t(label)}
              </Checkbox>
              {isDefault ? (
                <Tag className="pill-tag" color="blue">{t('role default')}</Tag>
              ) : null}
            </div>
          );
        })}
      </Space>
    </Card>
  );
}
