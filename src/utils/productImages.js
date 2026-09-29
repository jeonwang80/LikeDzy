// imageUrls is authoritative for modern products, including an empty list.
export function normalizeProductImages(product) {
  if (!product || !Array.isArray(product.imageUrls)) return product;
  const imageUrls = [...new Set(product.imageUrls.filter((url) => typeof url === 'string' && url))];
  const allowed = new Set(imageUrls);
  const normalizeSwatches = (swatches) => swatches.map((swatch, index) => {
    let group = [...new Set([swatch.imageUrl, swatch.hoverImageUrl, ...(swatch.imageUrls || []), ...(swatch.images || [])].filter((url) => allowed.has(url)))];
    if (!group.length && imageUrls.length) group = swatches.length === 1 ? [...imageUrls] : [imageUrls[index % imageUrls.length]];
    const primary = allowed.has(swatch.imageUrl) ? swatch.imageUrl : group[0] || '';
    const hover = allowed.has(swatch.hoverImageUrl) ? swatch.hoverImageUrl : group.find((url) => url !== primary) || primary;
    return { ...swatch, imageUrl: primary, hoverImageUrl: hover, imageUrls: group,
      ...(Array.isArray(swatch.images) ? { images: swatch.images.filter((url) => allowed.has(url)) } : {}) };
  });
  return { ...product, imageUrls,
    ...(product.imageUrl !== undefined ? { imageUrl: allowed.has(product.imageUrl) ? product.imageUrl : '' } : {}),
    ...(Array.isArray(product.images) ? { images: product.images.filter((url) => allowed.has(url)) } : {}),
    ...(Array.isArray(product.imageVariants) ? { imageVariants: product.imageVariants.filter((variant) => allowed.has(variant.imageUrl)) } : {}),
    ...(Array.isArray(product.colorSwatches) ? { colorSwatches: normalizeSwatches(product.colorSwatches) } : {}),
    ...(Array.isArray(product.colors) ? { colors: normalizeSwatches(product.colors) } : {}),
  };
}

export function removeProductImage(product, url) {
  return normalizeProductImages({ ...product, imageUrls: (product.imageUrls || []).filter((image) => image !== url) });
}
