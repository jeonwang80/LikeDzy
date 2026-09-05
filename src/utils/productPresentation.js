export const FALLBACK_PRODUCT_IMAGE = '/images/product-placeholder.svg';

export function getColorSwatchBackground(swatch, fallback = '#cccccc') {
  const primary = swatch?.colorHex || fallback;
  const secondary = swatch?.secondaryColorHex;

  if (!secondary) return primary;
  return `linear-gradient(135deg, ${primary} 0%, ${primary} 50%, ${secondary} 50%, ${secondary} 100%)`;
}

const isLegacyModelImage = (url) =>
  typeof url === 'string' && url.toLowerCase().includes('model_1.png');

export function formatProductPrice(product, language = 'ko') {
  const currencyByLanguage = {
    ko: { key: 'KRW', symbol: '₩' },
    en: { key: 'USD', symbol: '$' },
    vi: { key: 'VND', symbol: '₫' },
  };

  const currency = currencyByLanguage[language] || currencyByLanguage.ko;
  const localizedPrice = product?.prices?.[currency.key];

  if (typeof localizedPrice === 'number') {
    return `${currency.symbol}${localizedPrice.toLocaleString()}`;
  }

  if (typeof product?.price === 'number') {
    return `₩${product.price.toLocaleString()}`;
  }

  return product?.price || '';
}

export function normalizeProductBadge(value) {
  const badge = value?.trim();
  if (!badge) return '';

  const normalized = badge.toUpperCase().replace(/\s+/g, ' ');
  if (['추천', 'RECOMMEND', 'RECOMMENDED', 'FEATURED'].includes(normalized)) return 'RECOMMENDED';
  if (['BEST', 'BESTSELLER', 'BEST SELLER', '베스트', '베스트셀러'].includes(normalized)) return 'BEST SELLER';
  if (['NEW', '신규', '신상품'].includes(normalized)) return 'NEW';
  return badge;
}

export function getProductBadge(product) {
  if (product?.badgeText?.trim()) return normalizeProductBadge(product.badgeText);
  if (product?.isBestSeller) return 'BEST SELLER';
  if (product?.isNew) return 'NEW';
  if (product?.isFeatured) return 'RECOMMENDED';
  return '';
}

export function presentProduct(product, language = 'ko') {
  const localized = product?.[language] || product?.ko || {};
  const images = product?.imageUrls?.length
    ? product.imageUrls
    : product?.images?.length
      ? product.images
      : product?.imageUrl
        ? [product.imageUrl]
        : [];

  return {
    ...product,
    name: localized.name || product?.name || 'LikeDzy Outdoor Item',
    category: localized.category || product?.category || 'OUTDOOR',
    displayPrice: formatProductPrice(product, language),
    numericPrice:
      product?.prices?.[language === 'en' ? 'USD' : language === 'vi' ? 'VND' : 'KRW']
      ?? (typeof product?.price === 'number' ? product.price : 0),
    images,
    colorSwatches: product?.colorSwatches?.length
      ? product.colorSwatches
      : product?.colors || [],
    badgeText: getProductBadge(product),
  };
}

export function sortProducts(products) {
  return [...products].sort((a, b) => {
    const orderA = a.orderIndex ?? 999;
    const orderB = b.orderIndex ?? 999;
    if (orderA !== orderB) return orderA - orderB;

    const toMillis = (value) => {
      if (value?.toMillis) return value.toMillis();
      if (value instanceof Date) return value.getTime();
      return 0;
    };

    return toMillis(b.createdAt) - toMillis(a.createdAt);
  });
}

export function getSafeImageUrl(url, fallback = FALLBACK_PRODUCT_IMAGE) {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('blob:') || isLegacyModelImage(trimmed)) return fallback;
  if (/^(https?:\/\/|data:|\/)/.test(trimmed)) return trimmed;
  return fallback;
}

export function resolveProductCardImages(product, colorIndex = 0) {
  const activeColor = product?.colorSwatches?.[colorIndex] || product?.colorSwatches?.[0];
  const thumbnailByImageUrl = new Map((product?.imageVariants || [])
    .filter((variant) => variant?.imageUrl && variant?.thumbnailUrl)
    .map((variant) => [variant.imageUrl, variant.thumbnailUrl]));
  const candidates = [
    ...(activeColor?.imageUrls || []),
    ...(product?.images || []),
    product?.imageUrl,
  ].filter((url) =>
    typeof url === 'string'
    && url
    && !url.startsWith('blob:')
    && !isLegacyModelImage(url)
  );

  const productImages = candidates;
  const primary =
    (activeColor?.imageUrl && !isLegacyModelImage(activeColor.imageUrl) && activeColor.imageUrl)
    || (activeColor?.hoverImageUrl && !isLegacyModelImage(activeColor.hoverImageUrl) && activeColor.hoverImageUrl)
    || productImages[0]
    || FALLBACK_PRODUCT_IMAGE;

  const hover =
    (activeColor?.hoverImageUrl
      && activeColor.hoverImageUrl !== primary
      && !isLegacyModelImage(activeColor.hoverImageUrl)
      && activeColor.hoverImageUrl)
    || productImages.find((image) => image !== primary)
    || primary;

  const safePrimaryOriginal = getSafeImageUrl(primary);
  const safeHoverOriginal = getSafeImageUrl(hover);
  const safePrimary = getSafeImageUrl(thumbnailByImageUrl.get(primary) || primary);
  const safeHover = getSafeImageUrl(thumbnailByImageUrl.get(hover) || hover);

  if (safePrimary === FALLBACK_PRODUCT_IMAGE && safeHover !== FALLBACK_PRODUCT_IMAGE) {
    return {
      activeColor,
      primary: safeHover,
      hover: safeHover,
      primaryOriginal: safeHoverOriginal,
      hoverOriginal: safeHoverOriginal,
    };
  }

  return {
    activeColor,
    primary: safePrimary,
    hover: safeHover,
    primaryOriginal: safePrimaryOriginal,
    hoverOriginal: safeHoverOriginal,
  };
}
