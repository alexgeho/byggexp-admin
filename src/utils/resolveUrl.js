import apiClient from '@/src/api/apiClient';

// Resolve a possibly-relative asset path (avatar, document, photo) against the
// API base URL. Returns null for empty input, and the original string if it
// can't be parsed as a URL. Single source — was copy-pasted in ~9 files.
export const resolveUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
};
