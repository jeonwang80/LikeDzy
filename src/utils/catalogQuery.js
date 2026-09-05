import { normalizeCategoryCode } from './categoryMatching.js';

export const CATALOG_QUERY_VERSION = 1;
export const CATALOG_PAGE_SIZE = 24;
export const LEGACY_SCAN_PAGE_SIZE = 48;

const numericPrice = (value) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
export const catalogDate = (value) => {
  const date = typeof value?.toDate === 'function' ? value.toDate() : value instanceof Date ? value : new Date(typeof value === 'string' || typeof value === 'number' ? value : 0);
  return Number.isFinite(date.getTime()) ? date : new Date(0);
};

// Materialize every category alias the existing category matcher accepts.
// This field must be backfilled before enabling settings/catalog.queryVersion.
export function buildCatalogFields(product = {}, categoryMasters = []) {
  const categories = [product.category, product.categoryCode, product.ko?.category, product.en?.category, product.vi?.category];
  for (const category of product.categories || []) categories.push(typeof category === 'string' ? category : category?.code);
  const master = categoryMasters.find((category) => String(category.id) === String(product.categoryMasterId || ''));
  if (master) categories.push(master.code);
  const ancestors = new Set();
  for (const code of categories.map(normalizeCategoryCode).filter(Boolean)) {
    const parts = code.split('-');
    for (let index = 1; index <= parts.length; index += 1) ancestors.add(parts.slice(0, index).join('-'));
  }
  const fields = {
    catalogVersion: CATALOG_QUERY_VERSION,
    isActive: product.isActive !== false,
    categoryAncestors: [...ancestors].sort(),
    orderIndex: Number.isFinite(product.orderIndex) ? product.orderIndex : 999,
    createdAt: catalogDate(product.createdAt),
  };
  for (const [language, suffix, currency] of [['ko', 'Ko', 'KRW'], ['en', 'En', 'USD'], ['vi', 'Vi', 'VND']]) {
    fields[`sortName${suffix}`] = String(product[language]?.name || product.ko?.name || product.name || '').normalize('NFKC').toLowerCase();
    fields[`price${currency}`] = numericPrice(product.prices?.[currency] ?? product.price);
  }
  return fields;
}

export function getCatalogOrdering(sortBy = 'display', language = 'ko') {
  if (sortBy === 'newest') return [['createdAt', 'desc']];
  if (sortBy === 'name') return [[`sortName${language === 'en' ? 'En' : language === 'vi' ? 'Vi' : 'Ko'}`, 'asc']];
  if (sortBy === 'price-asc' || sortBy === 'price-desc') {
    return [[`price${language === 'en' ? 'USD' : language === 'vi' ? 'VND' : 'KRW'}`, sortBy === 'price-desc' ? 'desc' : 'asc']];
  }
  return [['orderIndex', 'asc'], ['createdAt', 'desc']];
}

export function sortCatalogProducts(products, sortBy = 'display', language = 'ko') {
  const keys = getCatalogOrdering(sortBy, language);
  return [...products].sort((first, second) => {
    const firstFields = buildCatalogFields(first);
    const secondFields = buildCatalogFields(second);
    for (const [field, direction] of keys) {
      const a = field === 'createdAt' ? firstFields[field].getTime() : firstFields[field];
      const b = field === 'createdAt' ? secondFields[field].getTime() : secondFields[field];
      const difference = a < b ? -1 : a > b ? 1 : 0;
      if (difference) return direction === 'desc' ? -difference : difference;
    }
    return String(first.id).localeCompare(String(second.id));
  });
}
