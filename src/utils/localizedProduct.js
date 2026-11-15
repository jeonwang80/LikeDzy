const nonEmpty = value => Object.fromEntries(Object.entries(value || {}).filter(([, text]) => typeof text === 'string' && text.trim()));

export function localizedProduct(product, language) {
  return { ...nonEmpty(product?.ko), ...(language !== 'ko' ? nonEmpty(product?.en) : {}), ...nonEmpty(product?.[language]) };
}
