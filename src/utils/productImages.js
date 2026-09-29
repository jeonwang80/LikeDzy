// imageUrls is authoritative for modern products, including an empty list.
export function normalizeProductImages(product) {
  if (!product || !Array.isArray(product.imageUrls)) return product;
  const imageUrls = [...new Set(product.imageUrls.filter((url) => typeof url === 'string' && url))];
  const allowed = new Set(imageUrls);
  const commonImageUrls = imageUrls.filter(url => (product.commonImageUrls || []).includes(url));
  const specificImages = imageUrls.filter(url => !commonImageUrls.includes(url));
  const specific = new Set(specificImages);
  const normalizeSwatches = (swatches) => swatches.map((swatch, index) => {
    let group = [...new Set([swatch.imageUrl, swatch.hoverImageUrl, ...(swatch.imageUrls || []), ...(swatch.images || [])].filter((url) => specific.has(url)))];
    if (!group.length && specificImages.length) group = swatches.length === 1 ? [...specificImages] : [specificImages[index % specificImages.length]];
    const primary = specific.has(swatch.imageUrl) ? swatch.imageUrl : group[0] || '';
    const hover = specific.has(swatch.hoverImageUrl) ? swatch.hoverImageUrl : group.find((url) => url !== primary) || primary;
    return { ...swatch, imageUrl: primary, hoverImageUrl: hover, imageUrls: group,
      ...(Array.isArray(swatch.images) ? { images: swatch.images.filter((url) => specific.has(url)) } : {}) };
  });
  return { ...product, imageUrls,
    ...(Array.isArray(product.commonImageUrls) ? { commonImageUrls } : {}),
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
