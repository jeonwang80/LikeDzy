export const normalizeCategoryCode = (value) => (
  typeof value === 'string'
    ? value.trim().toUpperCase().replace(/[\s_/]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : ''
);

const isSameOrDescendantCode = (candidateCode, selectedCode) => (
  candidateCode === selectedCode || candidateCode.startsWith(`${selectedCode}-`)
);

const collectProductCategoryCodes = (product) => {
  const values = [
    product?.category,
    product?.categoryCode,
    product?.ko?.category,
    product?.en?.category,
    product?.vi?.category,
  ];

  if (Array.isArray(product?.categories)) {
    product.categories.forEach((category) => {
      values.push(typeof category === 'string' ? category : category?.code);
    });
  }

  return [...new Set(values.map(normalizeCategoryCode).filter(Boolean))];
};

export function productMatchesCategory(product, selectedCategory, categoryMasters = []) {
  const selectedCode = normalizeCategoryCode(selectedCategory);
  if (!selectedCode || selectedCode === 'ALL') return true;

  const productCodes = collectProductCategoryCodes(product);
  if (productCodes.some((productCode) => isSameOrDescendantCode(productCode, selectedCode))) {
    return true;
  }

  const productMasterId = String(product?.categoryMasterId || '').trim();
  if (!productMasterId) return false;

  return categoryMasters.some((category) => {
    if (String(category?.id || '').trim() !== productMasterId) return false;
    const masterCode = normalizeCategoryCode(category?.code);
    return Boolean(masterCode && isSameOrDescendantCode(masterCode, selectedCode));
  });
}

