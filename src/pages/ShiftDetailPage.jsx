import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { ArrowLeftOutlined, FileImageOutlined, FileTextOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Empty, Image, List, Spin, Tag, Typography } from 'antd';
import apiClient from '../api/apiClient';
import { useProjectsInfo, useUsersInfo } from '../hooks/useEntitiesInfo';
import { useShiftStore } from '../store/shiftStore';

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const formatDuration = (durationMs = 0) => {
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours}h ${minutes}m`;
  }

  if (hours) {
    return `${hours}h`;
  }

  return `${minutes}m`;
};

const getStatusColor = (status) => ({
  active: 'green',
  paused: 'gold',
  completed: 'blue',
}[status] || 'default');

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

const isImageFile = (file) => {
  const mimeType = file?.mimeType || '';
  const url = file?.url || '';
  return mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(url);
};

export default function ShiftDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const { currentShift, loading, fetchOne, clearCurrentShift } = useShiftStore();

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

    return () => {
      clearCurrentShift();
    };
  }, [clearCurrentShift, fetchOne, id]);

  useEffect(() => {
    outletContext?.hideHeaderActions?.();
    outletContext?.unregisterAddButton?.();

    return () => {
      outletContext?.showHeaderActions?.();
      outletContext?.unregisterAddButton?.();
    };
  }, [outletContext]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" tip="Loading shift..." />
      </div>
    );
  }

  if (!currentShift) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="Shift not found" />
        <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />}>
          Back
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
          Back
        </Button>
      </div>

      <Card
        title={`Shift ${currentShift.shiftDate}`}
        extra={<Tag color={getStatusColor(currentShift.status)}>{currentShift.status}</Tag>}
      >
        <Descriptions column={2} bordered size="middle">
          <Descriptions.Item label="Worker">
            {worker?.name || currentShift.workerId}
          </Descriptions.Item>
          <Descriptions.Item label="Project">
            {project?.name || currentShift.projectName || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Location">
            {currentShift.location || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Duration">
            {formatDuration(currentShift.durationMs)}
          </Descriptions.Item>
          <Descriptions.Item label="Started">
            {formatDateTime(currentShift.startedAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Ended">
            {formatDateTime(currentShift.endedAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Last resumed">
            {formatDateTime(currentShift.lastResumedAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Photos count">
            {files.length}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Segments" style={{ marginTop: 16 }}>
        <List
          locale={{ emptyText: 'No segments' }}
          dataSource={currentShift.segments || []}
          renderItem={(segment, index) => (
            <List.Item key={`${segment.startedAt}-${index}`}>
              <Descriptions size="small" column={3} style={{ width: '100%' }}>
                <Descriptions.Item label="Started">{formatDateTime(segment.startedAt)}</Descriptions.Item>
                <Descriptions.Item label="Ended">{formatDateTime(segment.endedAt)}</Descriptions.Item>
                <Descriptions.Item label="Duration">{formatDuration(segment.durationMs)}</Descriptions.Item>
              </Descriptions>
            </List.Item>
          )}
        />
      </Card>

      <Card title="Files" style={{ marginTop: 16 }}>
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
          <Empty description="No files attached" />
        )}
      </Card>
    </div>
  );
}
