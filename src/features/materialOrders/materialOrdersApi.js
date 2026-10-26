import apiClient from '@/src/api/apiClient';

// Backend: ByggExp-BackEnd src/material-orders.
export const materialOrdersApi = {
  list: (projectId) => apiClient.get('/material-orders', { params: { projectId } }).then((r) => r.data),
  create: (body) => apiClient.post('/material-orders', body).then((r) => r.data),
  update: (id, body) => apiClient.put(`/material-orders/${id}`, body).then((r) => r.data),
  remove: (id) => apiClient.delete(`/material-orders/${id}`).then((r) => r.data),
  send: (id) => apiClient.post(`/material-orders/${id}/send`).then((r) => r.data),
  articles: (supplier, q) => apiClient
    .get('/material-orders/articles', { params: { supplier: supplier || undefined, q: q || undefined } })
    .then((r) => r.data),
  suppliers: () => apiClient.get('/material-orders/suppliers').then((r) => r.data),
  saveSupplier: (supplier, body) => apiClient
    .put(`/material-orders/suppliers/${encodeURIComponent(supplier)}`, body)
    .then((r) => r.data),
};

// Order rows → API payload (quantity > 0 only).
export const rowsPayload = (rows) => rows
  .filter((r) => Number(r.quantity) > 0)
  .map(({ articleId, articleNumber, name, unit, quantity }) => ({
    ...(articleId ? { articleId } : {}),
    articleNumber,
    name,
    unit,
    quantity: Number(quantity),
  }));

// Adding an article that is already in the order bumps its quantity instead.
export const addArticleRow = (rows, article) => {
  const id = String(article._id);
  if (rows.some((r) => r.articleId === id)) {
    return rows.map((r) => (r.articleId === id ? { ...r, quantity: (Number(r.quantity) || 0) + 1 } : r));
  }
  return [...rows, {
    articleId: id,
    articleNumber: article.articleNumber || '',
    name: article.name || '',
    unit: article.unit || 'st',
    quantity: 1,
  }];
};
