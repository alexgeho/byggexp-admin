import { useEffect, useMemo, useRef, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Card, Empty, Image, Pagination, Spin, message } from 'antd';
import { Button } from '@/src/ui-kit';
import ProjectPhotoSortSelect from '@/src/features/projects/components/ProjectPhotoSortSelect';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import { useShiftStore } from '@/src/store/shiftStore';
import { getEntityId } from '@/src/utils/entityId';
import { resolveDocumentUrl } from '@/src/features/projects/utils/projectDetailUtils';

const PHOTOS_PAGE_SIZE = 12;

const isImageFile = (file) => {
  const mimeType = file?.mimeType || '';
  const url = file?.url || '';
  return mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(url);
};

const getPhotoSortTime = (photo) => new Date(
  photo.uploadedAt || photo.shiftStartedAt || photo.shiftDate || 0,
).getTime();

const getUploadShiftId = (shifts) => {
  const activeShift = shifts.find((shift) => (
    ['active', 'paused'].includes(String(shift.status || '').toLowerCase())
  ));

  if (activeShift) {
    return getEntityId(activeShift);
  }

  const sortedShifts = [...shifts].sort(
    (left, right) => getPhotoSortTime({
      shiftStartedAt: right.startedAt,
      shiftDate: right.shiftDate,
    }) - getPhotoSortTime({
      shiftStartedAt: left.startedAt,
      shiftDate: left.shiftDate,
    }),
  );

  return sortedShifts[0] ? getEntityId(sortedShifts[0]) : null;
};

export default function ProjectPhotosTab({ projectId }) {
  const { shifts, loading, fetchAllAccessible, uploadPhotos } = useShiftStore();
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    void fetchAllAccessible({ projectId });
  }, [fetchAllAccessible, projectId]);

  const photos = useMemo(
    () => shifts.flatMap((shift) => (
      (shift.photos || [])
        .filter(isImageFile)
        .map((photo, index) => ({
          key: `${getEntityId(shift) || shift.id}-${photo.url || index}`,
          url: resolveDocumentUrl(photo.url),
          shiftDate: shift.shiftDate,
          shiftStartedAt: shift.startedAt,
          workerName: shift.workerName,
          uploadedAt: photo.uploadedAt,
        }))
    )).filter((photo) => photo.url),
    [shifts],
  );

  const sortedPhotos = useMemo(() => {
    const nextPhotos = [...photos];

    nextPhotos.sort((left, right) => {
      const diff = getPhotoSortTime(right) - getPhotoSortTime(left);
      return sortOrder === 'newest' ? diff : -diff;
    });

    return nextPhotos;
  }, [photos, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortOrder, photos.length]);

  const totalPhotos = sortedPhotos.length;
  const paginatedPhotos = useMemo(() => {
    const startIndex = (currentPage - 1) * PHOTOS_PAGE_SIZE;
    return sortedPhotos.slice(startIndex, startIndex + PHOTOS_PAGE_SIZE);
  }, [currentPage, sortedPhotos]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    const shiftId = getUploadShiftId(shifts);

    if (!shiftId) {
      message.warning('Create a shift before uploading photos');
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      await uploadPhotos(shiftId, files);
      await fetchAllAccessible({ projectId });
    } catch {
      // Store handles error message.
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleFileChange}
      />

      <div className="admin-table-container project-photos-tab">
        <Card className="admin-table-card project-photos-card">
          <div className="admin-table-toolbar">
            <div className="admin-table-toolbar__leading">
              <div className="admin-table-toolbar-filters">
                <ProjectPhotoSortSelect
                  value={sortOrder}
                  onChange={setSortOrder}
                />
              </div>
            </div>

            <div className="admin-table-toolbar__trailing">
              <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin', 'worker']}>
                <Button
                  icon={<PlusOutlined />}
                  loading={uploading}
                  onClick={handleUploadClick}
                >
                  Upload photo
                </Button>
              </RoleBasedAccess>
            </div>
          </div>

          <div className="project-photos-panel">
            {loading ? (
              <div className="project-photos-panel__loading">
                <Spin size="large" tip="Loading photos..." />
              </div>
            ) : !totalPhotos ? (
              <Empty
                description="No photos for this project yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <>
                <Image.PreviewGroup>
                  <div className="project-photos-grid">
                    {paginatedPhotos.map((photo) => (
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
                </Image.PreviewGroup>

                {totalPhotos > PHOTOS_PAGE_SIZE ? (
                  <div className="project-photos-pagination">
                    <Pagination
                      current={currentPage}
                      pageSize={PHOTOS_PAGE_SIZE}
                      total={totalPhotos}
                      showSizeChanger={false}
                      onChange={setCurrentPage}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
