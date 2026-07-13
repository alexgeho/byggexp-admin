import { Image } from 'antd';
import { getToolPhotoUrls, resolveToolPhotoUrl } from '@/src/utils/toolPhotos';

const VISIBLE_PHOTO_COUNT = 4;

export default function ToolPhotoStrip({ tool, alt = 'Tool photo' }) {
  const photoUrls = getToolPhotoUrls(tool).map(resolveToolPhotoUrl).filter(Boolean);

  if (!photoUrls.length) {
    return '-';
  }

  const hasOverflow = photoUrls.length > VISIBLE_PHOTO_COUNT;
  const overflowCount = photoUrls.length - VISIBLE_PHOTO_COUNT;

  return (
    <Image.PreviewGroup>
      <div className="tool-photo-strip">
        {photoUrls.map((photoUrl, index) => {
          if (index < VISIBLE_PHOTO_COUNT) {
            return (
              <Image
                key={`${photoUrl}-${index}`}
                src={photoUrl}
                alt={alt}
                rootClassName="tool-photo-strip__item"
                className="tool-photo-strip__image"
                preview={{ mask: false }}
              />
            );
          }

          if (index === VISIBLE_PHOTO_COUNT && hasOverflow) {
            return (
              <div
                key={`${photoUrl}-${index}`}
                className="tool-photo-strip__item tool-photo-strip__item--overflow"
              >
                <Image
                  src={photoUrl}
                  alt={alt}
                  rootClassName="tool-photo-strip__image-wrap"
                  className="tool-photo-strip__image"
                  preview={{ mask: false }}
                />
                <span className="tool-photo-strip__overlay">{`+${overflowCount}`}</span>
              </div>
            );
          }

          if (hasOverflow && index > VISIBLE_PHOTO_COUNT) {
            return (
              <Image
                key={`${photoUrl}-${index}`}
                src={photoUrl}
                alt={alt}
                rootClassName="tool-photo-strip__preview-hidden"
                preview={{ mask: false }}
              />
            );
          }

          return null;
        })}
      </div>
    </Image.PreviewGroup>
  );
}
