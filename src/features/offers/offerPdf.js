import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { formatApiError } from '@/src/utils/formError';
import { getEntityId } from '@/src/utils/entityId';

const resolve = (offer) => ({
  id: typeof offer === 'string' ? offer : getEntityId(offer),
  number: typeof offer === 'object' ? offer?.offerNumber : undefined,
});

async function fetchPdfUrl(id) {
  const res = await apiClient.get(`/offers/${id}/pdf`, { responseType: 'blob' });
  return window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
}

// Download the offer PDF as offer-<number>.pdf.
export async function downloadOfferPdf(offer) {
  const { id, number } = resolve(offer);
  if (!id) return;
  try {
    const url = await fetchPdfUrl(id);
    const link = document.createElement('a');
    link.href = url;
    link.download = `offer-${number || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    appMessage.error(formatApiError(err, 'Failed to download offer PDF'));
  }
}

// Open the offer PDF in a new browser tab for preview.
export async function previewOfferPdf(offer) {
  const { id } = resolve(offer);
  if (!id) return;
  try {
    const url = await fetchPdfUrl(id);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  } catch (err) {
    appMessage.error(formatApiError(err, 'Failed to open offer PDF'));
  }
}
