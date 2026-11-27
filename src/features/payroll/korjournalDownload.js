import apiClient from '@/src/api/apiClient';

// The filename the backend chose (Content-Disposition, RFC 5987), or a
// fallback — the header is not readable cross-origin unless CORS exposes it.
export function filenameFrom(disposition, fallback) {
  const match = /filename\*=UTF-8''([^;]+)/i.exec(disposition || '');
  if (!match) return fallback;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return fallback;
  }
}

// Körjournal (business trips) of one worker for a period, as PDF or Excel —
// built by the backend from the same km that go to Bilersättning.
export async function downloadKorjournal({
  workerId, name = '', from, to, format,
}) {
  const res = await apiClient.get(`/shifts/korjournal/${format}`, {
    params: { workerId, from, to },
    responseType: 'blob',
  });
  const fallback = ['korjournal', String(name || '').trim().replace(/\s+/g, '-'), from, to]
    .filter(Boolean).join('_');
  const filename = filenameFrom(res.headers?.['content-disposition'], `${fallback}.${format}`);
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
