import { useEffect, useMemo, useState } from 'react';
import { Image, Modal } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';

const VIDEO_EXTENSION_PATTERN = /\.(mp4|mov|m4v|webm|avi|mkv)(\?|$)/i;

export function isVideoAttachment(attachment, url = '') {
  const mimeType = attachment?.mimeType || attachment?.type || '';

  if (typeof mimeType === 'string' && mimeType.startsWith('video/')) {
    return true;
  }

  const name = attachment?.name || url || '';
  return VIDEO_EXTENSION_PATTERN.test(name);
}

/**
 * Image or video preview for bug report attachments.
 * Videos open in a modal player; images use Ant Design lightbox.
 */
export default function BugReportAttachmentPreview({
  attachment,
  url,
  width = 56,
  height = 56,
  alt = 'Bug report attachment',
}) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null);

  const resolvedUrl = useMemo(() => {
    if (url) {
      return url;
    }

    if (attachment instanceof File || attachment instanceof Blob) {
      return objectUrl;
    }

    return null;
  }, [attachment, objectUrl, url]);

  useEffect(() => {
    if (!(attachment instanceof File || attachment instanceof Blob)) {
      setObjectUrl(null);
      return undefined;
    }

    const nextUrl = URL.createObjectURL(attachment);
    setObjectUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [attachment]);

  if (!resolvedUrl) {
    return null;
  }

  const video = isVideoAttachment(attachment, resolvedUrl);

  if (video) {
    return (
      <>
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          aria-label="Play video attachment"
          style={{
            position: 'relative',
            width,
            height,
            padding: 0,
            border: 'none',
            borderRadius: 8,
            overflow: 'hidden',
            cursor: 'pointer',
            background: '#0f172a',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video
            src={resolvedUrl}
            muted
            preload="metadata"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
          />
          <PlayCircleOutlined
            style={{
              position: 'absolute',
              fontSize: Math.max(18, Math.min(width, height) * 0.4),
              color: '#ffffff',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))',
            }}
          />
        </button>

        <Modal
          title={attachment?.name || 'Screen recording'}
          open={videoOpen}
          onCancel={() => setVideoOpen(false)}
          footer={null}
          width={720}
          destroyOnHidden
          centered
        >
          <video
            key={resolvedUrl}
            src={resolvedUrl}
            controls
            autoPlay
            style={{
              width: '100%',
              maxHeight: '70vh',
              borderRadius: 8,
              background: '#000',
            }}
          />
        </Modal>
      </>
    );
  }

  return (
    <Image
      src={resolvedUrl}
      alt={attachment?.name || alt}
      width={width}
      height={height}
      style={{ borderRadius: 8, objectFit: 'cover' }}
    />
  );
}
