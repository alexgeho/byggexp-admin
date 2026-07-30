import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Radio, Select, Space, Tabs, Tag, Timeline, message } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useToolStore } from '@/src/store/toolStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const EVENT_LABELS = {
  created: 'Created',
  handoff: 'Handed over',
  returned: 'Returned to storage',
  inspection: 'Inspection',
  repair: 'Repair',
  status_change: 'Status changed',
  note: 'Note',
};
const CONDITION_LABELS = { ok: 'OK', needs_service: 'Needs service', broken: 'Broken' };

export default function ToolManageModal({ open, tool, onClose, onPrintLabel }) {
  const { handoff, inspect, ensureQr, fetchHistory } = useToolStore();
  const user = useAuthStore((s) => s.user);
  const [handoffForm] = Form.useForm();
  const [inspectForm] = Form.useForm();
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);

  const toolId = tool ? getEntityId(tool) : null;

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const [w, p] = await Promise.all([
          apiClient.get('/users/role/worker'),
          apiClient.get(user?.role === 'superadmin' ? '/projects' : '/projects/my'),
        ]);
        setWorkers(w.data || []);
        setProjects(p.data || []);
      } catch { /* ignore */ }
    };
    load();
  }, [open, user?.role]);

  const loadHistory = async () => {
    if (toolId) setHistory(await fetchHistory(toolId));
  };

  useEffect(() => {
    if (open && toolId) {
      loadHistory();
      handoffForm.resetFields();
      inspectForm.resetFields();
      inspectForm.setFieldsValue({ condition: 'ok' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, toolId]);

  const workerName = useMemo(() => {
    const map = Object.fromEntries(workers.map((w) => [getEntityId(w), w.name]));
    return (id) => map[String(id)] || '—';
  }, [workers]);
  const projectName = useMemo(() => {
    const map = Object.fromEntries(projects.map((p) => [getEntityId(p), p.name]));
    return (id) => map[String(id)] || '—';
  }, [projects]);

  const submitHandoff = async (values) => {
    setBusy(true);
    try {
      await handoff(toolId, values);
      handoffForm.resetFields();
      await loadHistory();
    } finally {
      setBusy(false);
    }
  };

  const submitInspection = async (values) => {
    setBusy(true);
    try {
      await inspect(toolId, values);
      inspectForm.resetFields();
      inspectForm.setFieldsValue({ condition: 'ok' });
      await loadHistory();
    } finally {
      setBusy(false);
    }
  };

  const generateQr = async () => {
    try {
      await ensureQr(toolId);
      message.success('QR code generated');
    } catch { /* store surfaces errors */ }
  };

  if (!tool) return null;
  const qrValue = tool.qrId || '';

  const overview = (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        {qrValue ? (
          <>
            <QRCodeSVG value={qrValue} size={220} includeMargin />
            <div style={{ fontFamily: 'monospace', fontWeight: 600, marginTop: 6 }}>{qrValue}</div>
            <Button
              size="small"
              style={{ marginTop: 6 }}
              onClick={() => (onPrintLabel ? onPrintLabel(tool) : window.print())}
            >
              Print label
            </Button>
          </>
        ) : (
          <Button onClick={generateQr}>Generate QR code</Button>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 220 }}>
        <p><strong>Status:</strong> {tool.status || '—'}</p>
        <p><strong>Held by:</strong> {tool.currentHolderId ? workerName(tool.currentHolderId) : 'Storage'}</p>
        <p><strong>Location:</strong> {tool.location || '—'}</p>
        <p><strong>Last inspection:</strong> {tool.lastInspectionDate ? formatAdminDate(tool.lastInspectionDate) : '—'}</p>
        <p><strong>Next inspection:</strong> {tool.nextInspectionDate ? formatAdminDate(tool.nextInspectionDate) : '—'}</p>
      </div>
    </div>
  );

  const handoffTab = (
    <Form form={handoffForm} layout="vertical" onFinish={submitHandoff}>
      <Form.Item name="toUserId" label="Hand over to" extra="Leave empty to return the tool to storage">
        <Select allowClear showSearch optionFilterProp="label" placeholder="Worker"
          options={workers.map((w) => ({ value: getEntityId(w), label: w.name }))} />
      </Form.Item>
      <Form.Item name="projectId" label="Project">
        <Select allowClear showSearch optionFilterProp="label" placeholder="Project"
          options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))} />
      </Form.Item>
      <Form.Item name="location" label="Location"><Input placeholder="e.g. Site container, Van 3" /></Form.Item>
      <Form.Item name="note" label="Note"><Input.TextArea rows={2} /></Form.Item>
      <Button type="primary" htmlType="submit" loading={busy}>Register hand-off</Button>
    </Form>
  );

  const inspectionTab = (
    <Form form={inspectForm} layout="vertical" onFinish={submitInspection}>
      <Form.Item name="condition" label="Condition">
        <Radio.Group optionType="button" buttonStyle="solid">
          <Radio.Button value="ok">OK</Radio.Button>
          <Radio.Button value="needs_service">Needs service</Radio.Button>
          <Radio.Button value="broken">Broken</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item name="nextInspectionDate" label="Next inspection"><Input type="date" /></Form.Item>
      <Form.Item name="note" label="Note"><Input.TextArea rows={2} /></Form.Item>
      <Button type="primary" htmlType="submit" loading={busy}>Save inspection</Button>
    </Form>
  );

  const historyTab = (
    history.length ? (
      <Timeline
        items={history.map((e) => ({
          color: e.type === 'inspection' ? (e.condition === 'broken' ? 'red' : 'blue') : 'gray',
          children: (
            <div>
              <Space>
                <strong>{EVENT_LABELS[e.type] || e.type}</strong>
                {e.condition ? <Tag>{CONDITION_LABELS[e.condition] || e.condition}</Tag> : null}
              </Space>
              <div style={{ color: '#64748b', fontSize: 12 }}>
                {e.createdAt ? formatAdminDate(e.createdAt) : ''}
                {e.toUserId ? ` · → ${workerName(e.toUserId)}` : ''}
                {e.projectId ? ` · ${projectName(e.projectId)}` : ''}
              </div>
              {e.note ? <div style={{ marginTop: 2 }}>{e.note}</div> : null}
            </div>
          ),
        }))}
      />
    ) : <div style={{ color: '#64748b' }}>No history yet.</div>
  );

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={640} title={`Manage · ${tool.name}`} destroyOnHidden>
      <Tabs
        items={[
          { key: 'overview', label: 'QR & status', children: overview },
          { key: 'handoff', label: 'Hand-off', children: handoffTab },
          { key: 'inspection', label: 'Inspection', children: inspectionTab },
          { key: 'history', label: 'History', children: historyTab },
        ]}
      />
    </Modal>
  );
}
