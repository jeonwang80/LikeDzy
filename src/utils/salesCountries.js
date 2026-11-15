export const getSalesCountries = product => product?.salesCountries === undefined
  ? ['VN']
  : Array.isArray(product.salesCountries) ? [...new Set(product.salesCountries.filter(code => ['KR', 'VN', 'HU'].includes(code)))] : [];

export const isSoldInCountry = (product, country) => Boolean(country && getSalesCountries(product).includes(country));
