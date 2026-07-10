import { API_BASE_URL } from '@/src/config/apiConfig';

export function getToolPhotoUrls(tool) {
  if (Array.isArray(tool?.photoUrls) && tool.photoUrls.length) {
    return tool.photoUrls.filter(Boolean);
  }

  if (tool?.photoUrl) {
    return [tool.photoUrl];
  }

  return [];
}

export function resolveToolPhotoUrl(value) {
  if (!value) {
    return null;
  }

  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}
