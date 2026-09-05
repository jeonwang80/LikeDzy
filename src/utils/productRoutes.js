export function readProductRoute(search = '') {
  const params = new URLSearchParams(search);
  const productId = params.get('productId') || '';
  return {
    productId: productId && productId.length <= 120 && !productId.includes('/') ? productId : '',
    category: params.get('category') || '',
  };
}

export function buildProductUrl(productId, category = '') {
  if (!productId || String(productId).includes('/')) return '/?view=collection';
  const params = new URLSearchParams({ view: 'product', productId: String(productId) });
  if (category) params.set('category', category);
  return `/?${params.toString()}`;
}
