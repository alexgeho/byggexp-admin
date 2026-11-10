'use client';

import { useEffect, useState } from 'react';
import { Input, Select, Popconfirm, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import { Button } from '@/src/ui-kit';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';

// Manage reusable work-teams (arbetslag): a named crew of workers that can be
// planned onto a project as a unit from the staffing board.
export default function TeamManagerModal({ open, onClose, teams, workers, onChanged }) {
  const t = useT();
  const [drafts, setDrafts] = useState({});
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState([]);
  const [busy, setBusy] = useState(false);

  // Seed editable drafts from the current teams whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    const seed = {};
    teams.forEach((tm) => {
      seed[getEntityId(tm)] = { name: tm.name || '', memberIds: (tm.memberIds || []).map(String) };
    });
    setDrafts(seed);
    setNewName('');
    setNewMembers([]);
  }, [open, teams]);

  const workerOptions = workers.map((w) => ({ value: getEntityId(w), label: w.name || w.email }));
  const setDraft = (id, patch) => setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const saveTeam = async (id) => {
    const d = drafts[id];
    if (!d || !d.name.trim()) return;
    setBusy(true);
    try {
      await apiClient.put(`/teams/${id}`, { name: d.name.trim(), memberIds: d.memberIds });
      message.success(t('Team saved'));
      onChanged?.();
    } catch {
      message.error(t('Failed to save team'));
    } finally {
      setBusy(false);
    }
  };

  const removeTeam = async (id) => {
    setBusy(true);
    try {
      await apiClient.delete(`/teams/${id}`);
      onChanged?.();
    } catch {
      message.error(t('Failed to save team'));
    } finally {
      setBusy(false);
    }
  };

  const addTeam = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await apiClient.post('/teams', { name: newName.trim(), memberIds: newMembers });
      setNewName('');
      setNewMembers([]);
      message.success(t('Team saved'));
      onChanged?.();
    } catch {
      message.error(t('Failed to save team'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminModal
      title={t('Teams')}
      open={open}
      onCancel={onClose}
      onSave={onClose}
      saveText={t('Done')}
      width={560}
      destroyOnHidden
    >
      <div className="teammgr">
        {teams.map((tm) => {
          const id = getEntityId(tm);
          const d = drafts[id] || { name: '', memberIds: [] };
          return (
            <div key={id} className="teammgr__row">
              <Input
                value={d.name}
                onChange={(e) => setDraft(id, { name: e.target.value })}
                placeholder={t('Team name')}
                style={{ maxWidth: 160 }}
              />
              <Select
                mode="multiple"
                allowClear
                value={d.memberIds}
                onChange={(v) => setDraft(id, { memberIds: v })}
                options={workerOptions}
                optionFilterProp="label"
                placeholder={t('Members')}
                style={{ flex: 1, minWidth: 160 }}
                maxTagCount="responsive"
              />
              <Button variant="secondary" onClick={() => saveTeam(id)} disabled={busy || !d.name.trim()}>{t('Save')}</Button>
              <Popconfirm title={t('Remove team?')} okText={t('Remove')} cancelText={t('Cancel')} onConfirm={() => removeTeam(id)}>
                <button type="button" className="teammgr__del" aria-label={t('Remove')}><DeleteOutlined /></button>
              </Popconfirm>
            </div>
          );
        })}

        <div className="teammgr__row teammgr__row--new">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('New team name')}
            style={{ maxWidth: 160 }}
          />
          <Select
            mode="multiple"
            allowClear
            value={newMembers}
            onChange={setNewMembers}
            options={workerOptions}
            optionFilterProp="label"
            placeholder={t('Members')}
            style={{ flex: 1, minWidth: 160 }}
            maxTagCount="responsive"
          />
          <Button icon={<PlusOutlined />} onClick={addTeam} disabled={busy || !newName.trim()}>{t('Add')}</Button>
        </div>
      </div>
    </AdminModal>
  );
}
