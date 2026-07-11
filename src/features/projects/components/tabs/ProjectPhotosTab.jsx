import { useEffect, useMemo } from 'react';
import { Empty, Image, Spin } from 'antd';
import { useShiftStore } from '@/src/store/shiftStore';
import { resolveDocumentUrl } from '@/src/features/projects/utils/projectDetailUtils';

const isImageFile = (file) => {
  const mimeType = file?.mimeType || '';
  const url = file?.url || '';
  return mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(url);
};

export default function ProjectPhotosTab({ projectId }) {
  const { shifts, loading, fetchAllAccessible } = useShiftStore();

  useEffect(() => {
    void fetchAllAccessible({ projectId });
  }, [fetchAllAccessible, projectId]);

  const photos = useMemo(
    () => shifts.flatMap((shift) => (
      (shift.photos || [])
        .filter(isImageFile)
        .map((photo, index) => ({
          key: `${shift.id}-${photo.url || index}`,
          url: resolveDocumentUrl(photo.url),
          shiftDate: shift.shiftDate,
          workerName: shift.workerName,
        }))
    )).filter((photo) => photo.url),
    [shifts],
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" tip="Loading photos..." />
      </div>
    );
  }

  if (!photos.length) {
    return (
      <Empty
        description="No photos for this project yet"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="project-photos-grid">
      {photos.map((photo) => (
        <article key={photo.key} className="project-photo-card">
          <Image
            src={photo.url}
            alt="Project shift photo"
            className="project-photo-card__image"
            rootClassName="project-photo-card__image"
          />
          <div className="project-photo-card__meta">
            {photo.shiftDate || 'Shift photo'}
            {photo.workerName ? ` · ${photo.workerName}` : ''}
          </div>
        </article>
      ))}
    </div>
  );
}
