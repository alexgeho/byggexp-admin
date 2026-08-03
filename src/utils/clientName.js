// Human-readable name for a client, handling both company and
// private client types plus common fallbacks. Accepts a populated client
// object; returns an empty string when nothing usable is present.
export function formatClientName(client) {
  if (!client || typeof client !== 'object') {
    return '';
  }

  const name =
    client.clientType === 'private'
      ? [client.firstName, client.lastName].filter(Boolean).join(' ')
      : client.companyName;

  return (name || client.contactPerson || client.email || '').trim();
}
