export const getClientDisplayName = (client) => {
  if (!client) {
    return '-';
  }

  if (client.clientType === 'private') {
    const name = `${client.firstName || ''} ${client.lastName || ''}`.trim();
    return name || 'Unnamed';
  }

  return client.companyName || 'Unnamed';
};

export const formatClientAddress = (client) => {
  if (!client) {
    return '';
  }

  const parts = [client.postalCode, client.city, client.country].filter(Boolean);
  return parts.join(' ');
};
