import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { formatApiError } from '@/src/utils/formError';
import { getEntityId } from '@/src/utils/entityId';

const resolve = (invoice) => ({
  id: typeof invoice === 'string' ? invoice : getEntityId(invoice),
  number: typeof invoice === 'object' ? invoice?.invoiceNumber : undefined,
});

async function fetchPdfUrl(id) {
  const res = await apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  return window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
}

// Download the invoice PDF as invoice-<number>.pdf.
export async function downloadInvoicePdf(invoice) {
  const { id, number } = resolve(invoice);
  if (!id) return;
  try {
    const url = await fetchPdfUrl(id);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${number || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    appMessage.error(formatApiError(err, 'Failed to download invoice PDF'));
  }
}

// Open the invoice PDF in a new browser tab for preview.
export async function previewInvoicePdf(invoice) {
  const { id } = resolve(invoice);
  if (!id) return;
  try {
    const url = await fetchPdfUrl(id);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  } catch (err) {
    appMessage.error(formatApiError(err, 'Failed to open invoice PDF'));
  }
}
