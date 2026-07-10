import { getToolPhotoUrls, resolveToolPhotoUrl } from '@/src/utils/toolPhotos';

const VISIBLE_PHOTO_COUNT = 4;

export default function ToolPhotoStrip({ tool, alt = 'Tool photo' }) {
  const photoUrls = getToolPhotoUrls(tool).map(resolveToolPhotoUrl).filter(Boolean);

  if (!photoUrls.length) {
    return '-';
  }

  const visiblePhotos = photoUrls.slice(0, VISIBLE_PHOTO_COUNT);
  const overflowPhoto = photoUrls.length > VISIBLE_PHOTO_COUNT ? photoUrls[VISIBLE_PHOTO_COUNT] : null;
  const overflowCount = photoUrls.length - VISIBLE_PHOTO_COUNT;

  return (
    <div className="tool-photo-strip">
      {visiblePhotos.map((photoUrl, index) => (
        <img
          key={`${photoUrl}-${index}`}
          src={photoUrl}
          alt={alt}
          className="tool-photo-strip__item"
        />
      ))}

      {overflowPhoto ? (
        <div className="tool-photo-strip__item tool-photo-strip__item--overflow">
          <img
            src={overflowPhoto}
            alt={alt}
            className="tool-photo-strip__image"
          />
          <span className="tool-photo-strip__overlay">{`+${overflowCount}`}</span>
        </div>
      ) : null}
    </div>
  );
}
