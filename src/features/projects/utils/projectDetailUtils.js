import apiClient from '@/src/api/apiClient';
import { formatAdminDate, formatAdminDateRange } from '@/src/utils/formatDateTime';

export const formatProjectDate = (value) => formatAdminDate(value, null);

export const formatProjectOverviewDate = formatProjectDate;

export const formatProjectDateRange = formatAdminDateRange;

export const resolveProjectPerson = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return {
      id: value._id || value.id,
      name: value.name || value.email || 'Unknown',
      avatarUrl: value.avatarUrl || null,
    };
  }

  return { id: value, name: null, avatarUrl: null };
};

export const resolveDocumentUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
};

export const normalizeProjectDocuments = (documents = []) => (
  documents
    .map((document, index) => {
      if (typeof document === 'string') {
        const isLink = document.startsWith('http://')
          || document.startsWith('https://')
          || document.startsWith('/');

        return {
          key: `${document}-${index}`,
          name: isLink
            ? decodeURIComponent(document.split('/').pop() || 'Document')
            : document,
          url: isLink ? resolveDocumentUrl(document) : null,
          uploadedByName: null,
          uploadedAt: null,
          size: null,
        };
      }

      if (document && typeof document === 'object') {
        return {
          key: document.url || `${document.name || 'document'}-${index}`,
          name: document.name
            || document.fileName
            || document.originalName
            || document.url
            || 'Document',
          url: resolveDocumentUrl(document.url || null),
          uploadedByName: document.uploadedByName || null,
          uploadedAt: document.uploadedAt || null,
          size: document.size ?? null,
        };
      }

      return null;
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = left.uploadedAt ? new Date(left.uploadedAt).getTime() : 0;
      const rightTime = right.uploadedAt ? new Date(right.uploadedAt).getTime() : 0;
      return rightTime - leftTime;
    })
);

export const formatDocumentSize = (size) => {
  if (!size && size !== 0) {
    return '-';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const isNewProjectDocument = (document, days = 7) => {
  if (!document?.uploadedAt) {
    return false;
  }

  const uploadedAt = new Date(document.uploadedAt).getTime();
  if (Number.isNaN(uploadedAt)) {
    return false;
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return uploadedAt >= cutoff;
};

export function getShiftDetailPath(pathname, shiftId) {
  const id = String(shiftId);

  if (pathname.startsWith('/admin')) {
    return `/admin/shifts/${id}`;
  }

  if (pathname.startsWith('/company')) {
    return `/company/shifts/${id}`;
  }

  return `/shifts/${id}`;
}
