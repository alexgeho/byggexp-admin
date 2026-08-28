import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useOutletContext } from '@/src/shared/routing/routerCompat';
import { ArrowLeftOutlined, FileImageOutlined, FileTextOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Empty, Image, List, Spin, Tag, Timeline, Typography } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useProjectsInfo, useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useShiftStore } from '@/src/store/shiftStore';
import { getShiftStatusColor, getShiftStatusLabel } from '@/src/utils/shiftStatus';
import { formatAdminDate, formatAdminDateTime } from '@/src/utils/formatDateTime';

import { formatDuration } from '@/src/utils/formatDuration';
import { useT } from '@/src/i18n/LanguageProvider';

const resolveFileUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
};

import { isImageFile } from '@/src/utils/assets';

// Colored dot per event type. Green = at work / back at work, gold = paused /
// left the area, blue = shift ended, default (grey) for everything else.
const EVENT_DOT_COLORS = {
  checked_in: 'green',
  resumed: 'green',
  auto_resumed_geofence_return: 'green',
  paused: 'gold',
  auto_paused_geofence_exit: 'gold',
  auto_paused_offline: 'gold',
  completed: 'blue',
  manual_hours_set: 'gray',
};

// English fallback labels; passed through useT so translated strings win when a
// key exists, and the readable English shows otherwise.
const EVENT_LABELS = {
  checked_in: 'Checked in',
  resumed: 'Resumed',
  auto_resumed_geofence_return: 'Returned to area',
  paused: 'Paused',
  auto_paused_geofence_exit: 'Left project area',
  auto_paused_offline: 'Paused (offline)',
  completed: 'Checked out',
  manual_hours_set: 'Manual hours set',
};

const getEventDotColor = (type) => EVENT_DOT_COLORS[type] || 'gray';
const getEventTimestamp = (event) => event?.occurredAt || event?.createdAt;

export default function ShiftDetailPage() {
  const { id } = useParams();
  const t = useT();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const { currentShift, loading, timeline, fetchOne, fetchTimeline, clearCurrentShift } = useShiftStore();

  const workerIds = useMemo(
    () => [currentShift?.workerId].filter(Boolean),
    [currentShift?.workerId],
  );

  const projectIds = useMemo(
    () => [currentShift?.projectId].filter(Boolean),
    [currentShift?.projectId],
  );

  const { users } = useUsersInfo(workerIds);
  const { projects } = useProjectsInfo(projectIds);

  useEffect(() => {
    fetchOne(id);
    // Best-effort: the timeline endpoint may not be deployed yet. The store
    // swallows 404/empty so this never blocks the page from rendering.
    fetchTimeline(id);

    return () => {
      clearCurrentShift();
    };
  }, [clearCurrentShift, fetchOne, fetchTimeline, id]);

  const timelineItems = useMemo(
    () =>
      (timeline || []).map((event, index) => {
        const label = t(EVENT_LABELS[event.type] || event.type || 'Event');
        const noteParts = [event.source, event.reason].filter(Boolean);

        return {
          key: event._id || `${event.type}-${index}`,
          color: getEventDotColor(event.type),
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography.Text strong>{label}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {formatAdminDateTime(getEventTimestamp(event))}
              </Typography.Text>
              {noteParts.length ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {noteParts.join(' · ')}
                </Typography.Text>
              ) : null}
            </div>
          ),
        };
      }),
    [timeline, t],
  );

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" tip={t('Loading shift...')} />
      </div>
    );
  }

  if (!currentShift) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description={t('Shift not found')} />
        <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />}>
          {t('Back')}
        </Button>
      </div>
    );
  }

  const worker = users[currentShift.workerId];
  const project = projects[currentShift.projectId];
  const files = (currentShift.photos || []).map((photo) => ({
    ...photo,
    resolvedUrl: resolveFileUrl(photo.url),
  }));

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />}>
          {t('Back')}
        </Button>
      </div>

      <Card
        title={`${t('Shift')} ${formatAdminDate(currentShift.shiftDate)}`}
        extra={
          <Tag className="status-tag" color={getShiftStatusColor(currentShift.status)}>
            {getShiftStatusLabel(currentShift.status)}
          </Tag>
        }
      >
        <Descriptions column={2} bordered size="middle">
          <Descriptions.Item label={t('Worker')}>
            {worker?.name || currentShift.workerId}
          </Descriptions.Item>
          <Descriptions.Item label={t('Project')}>
            {project?.name || currentShift.projectName || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('Location')}>
            {currentShift.location || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('Duration')}>
            {formatDuration(currentShift.durationMs)}
          </Descriptions.Item>
          <Descriptions.Item label={t('Started')}>
            {formatAdminDateTime(currentShift.startedAt)}
          </Descriptions.Item>
          <Descriptions.Item label={t('Ended')}>
            {formatAdminDateTime(currentShift.endedAt)}
          </Descriptions.Item>
          <Descriptions.Item label={t('Last resumed')}>
            {formatAdminDateTime(currentShift.lastResumedAt)}
          </Descriptions.Item>
          <Descriptions.Item label={t('Photos count')}>
            {files.length}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t('Timeline')} style={{ marginTop: 16 }}>
        {timelineItems.length ? (
          <Timeline items={timelineItems} />
        ) : (
          <Empty description={t('No timeline events')} />
        )}
      </Card>

      <Card title={t('Segments')} style={{ marginTop: 16 }}>
        <List
          locale={{ emptyText: t('No segments') }}
          dataSource={currentShift.segments || []}
          renderItem={(segment, index) => (
            <List.Item key={`${segment.startedAt}-${index}`}>
              <Descriptions size="small" column={3} style={{ width: '100%' }}>
                <Descriptions.Item label={t('Started')}>{formatAdminDateTime(segment.startedAt)}</Descriptions.Item>
                <Descriptions.Item label={t('Ended')}>{formatAdminDateTime(segment.endedAt)}</Descriptions.Item>
                <Descriptions.Item label={t('Duration')}>{formatDuration(segment.durationMs)}</Descriptions.Item>
              </Descriptions>
            </List.Item>
          )}
        />
      </Card>

      <Card title={t('Files')} style={{ marginTop: 16 }}>
        {files.length ? (
          <List
            dataSource={files}
            renderItem={(file, index) => (
              <List.Item key={`${file.name}-${index}`}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isImageFile(file) ? <FileImageOutlined /> : <FileTextOutlined />}
                    {file.resolvedUrl ? (
                      <Typography.Link href={file.resolvedUrl} target="_blank" rel="noreferrer">
                        {file.name || `File ${index + 1}`}
                      </Typography.Link>
                    ) : (
                      <span>{file.name || `File ${index + 1}`}</span>
                    )}
                  </div>

                  {isImageFile(file) && file.resolvedUrl ? (
                    <Image
                      src={file.resolvedUrl}
                      alt={file.name || `Shift file ${index + 1}`}
                      style={{ maxWidth: 320, borderRadius: 8 }}
                    />
                  ) : null}
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty description={t('No files attached')} />
        )}
      </Card>
    </div>
  );
}
