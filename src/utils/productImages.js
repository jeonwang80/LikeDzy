// imageUrls is authoritative for modern products, including an empty list.
export function normalizeProductImages(product) {
  if (!product || !Array.isArray(product.imageUrls)) return product;
  const imageUrls = [...new Set(product.imageUrls.filter((url) => typeof url === 'string' && url))];
  const allowed = new Set(imageUrls);
  const commonImageUrls = imageUrls.filter(url => (product.commonImageUrls || []).includes(url));
  const specificImages = imageUrls.filter(url => !commonImageUrls.includes(url));
  const specific = new Set(specificImages);
  const normalizeSwatches = (swatches) => swatches.map((swatch, index) => {
    // A primary/hover role owns the photo. Stale secondary links in another
    // color must not display it there; intentionally shared photos use ALL.
    const belongsHere = (url) => specific.has(url) && !swatches.some((other) =>
      other !== swatch && (other.imageUrl === url || other.hoverImageUrl === url)
      && swatch.imageUrl !== url && swatch.hoverImageUrl !== url);
    let group = [...new Set([swatch.imageUrl, swatch.hoverImageUrl, ...(swatch.imageUrls || []), ...(swatch.images || [])].filter(belongsHere))];
    // Only old records without an explicit group need inferred membership.
    if (!Array.isArray(swatch.imageUrls) && !group.length && specificImages.length) group = swatches.length === 1 ? [...specificImages] : [specificImages[index % specificImages.length]];
    const primary = specific.has(swatch.imageUrl) ? swatch.imageUrl : group[0] || '';
    const hover = specific.has(swatch.hoverImageUrl) ? swatch.hoverImageUrl : group.find((url) => url !== primary) || primary;
    return { ...swatch, imageUrl: primary, hoverImageUrl: hover, imageUrls: group,
      ...(Array.isArray(swatch.images) ? { images: swatch.images.filter(belongsHere) } : {}) };
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

// Keep both current and legacy color links synchronized when moving a photo.
export function assignProductImage(product, url, colorName, role) {
  const update = (swatches) => swatches.map((swatch) => {
    const selected = colorName !== '__ALL__' && swatch.name === colorName;
    const group = [...new Set([swatch.imageUrl, swatch.hoverImageUrl, ...(swatch.imageUrls || []), ...(swatch.images || [])].filter(Boolean))].filter(image => image !== url);
    let imageUrl = swatch.imageUrl === url ? '' : swatch.imageUrl || '';
    let hoverImageUrl = swatch.hoverImageUrl === url ? '' : swatch.hoverImageUrl || '';
    if (selected) {
      group.push(url);
      if (role === 'primary' || (role === undefined && !imageUrl)) imageUrl = url;
      if (role === 'hover') hoverImageUrl = url;
      if (role === undefined && swatch.imageUrl === url) imageUrl = url;
      if (role === undefined && swatch.hoverImageUrl === url) hoverImageUrl = url;
    }
    return { ...swatch, imageUrl, hoverImageUrl, imageUrls: group,
      ...(Array.isArray(swatch.images) ? { images: swatch.images.filter(image => image !== url) } : {}) };
  });
  return { ...product,
    colorSwatches: update(product.colorSwatches || product.colors || []),
    ...(Array.isArray(product.colors) ? { colors: update(product.colors) } : {}),
    commonImageUrls: colorName === '__ALL__'
      ? [...new Set([...(product.commonImageUrls || []), url])]
      : (product.commonImageUrls || []).filter(image => image !== url),
  };
}

export function removeProductImage(product, url) {
  return normalizeProductImages({ ...product, imageUrls: (product.imageUrls || []).filter((image) => image !== url) });
}
