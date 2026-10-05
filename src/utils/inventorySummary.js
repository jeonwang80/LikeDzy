import { sortSizeOptions } from './sizeOrder.js';

// The inventory table and its totals must use the same current product options.
export function getInventoryAxes(product) {
  const colors = product.colorSwatches?.length ? product.colorSwatches
    : product.colors?.length ? product.colors : [{ name: '기본' }];
  const options = product.sizeOptions || product.options;
  return {
    colors: [...new Set(colors.map(color => color.name || '기본'))],
    sizes: [...new Set(sortSizeOptions(options?.length ? options : [{ name: '기본' }]).map(size => size.name || '기본'))],
  };
}

export function getCurrentInventoryStock(product, records) {
  const { colors, sizes } = getInventoryAxes(product);
  return records.reduce((total, record) => total + (
    record.productId === product.id && colors.includes(record.colorName) && sizes.includes(record.optionName)
      ? Number(record.stock) || 0 : 0
  ), 0);
}
