export function hasAvailableProductStock(product, variants) {
  const colors = product.colorSwatches?.length ? product.colorSwatches : product.colors?.length ? product.colors : [{ name: '기본' }];
  const sizes = product.sizeOptions?.length ? product.sizeOptions : product.options?.length ? product.options : [{ name: '기본' }];
  return variants.some((variant) => colors.some((color) => (color.name || '기본') === variant.colorName)
    && sizes.some((size) => size.name === variant.optionName) && Number(variant.available) > 0);
}
