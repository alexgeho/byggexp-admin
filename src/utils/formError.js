export function formatApiError(error, fallback = 'Request failed') {
  const apiMessage = error?.response?.data?.message;

  if (Array.isArray(apiMessage)) {
    return apiMessage.join(', ');
  }

  if (typeof apiMessage === 'string' && apiMessage) {
    return apiMessage;
  }

  return error?.message || fallback;
}
