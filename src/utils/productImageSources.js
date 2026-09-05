import { FALLBACK_PRODUCT_IMAGE, getSafeImageUrl } from './productPresentation.js';

export const PRODUCT_CARD_SIZES = '(min-width: 1800px) 430px, (min-width: 1024px) 24vw, (min-width: 640px) 32vw, 48vw';
const srcSetUrl = (value) => value.replace(/\s|,/g, (character) => encodeURIComponent(character));

// Width descriptors describe the actual encoded width, not the upload preset's
// maximum side. Older images without dimensions retain the original quality.
export function getProductImageSources(product, originalUrl) {
  const src = getSafeImageUrl(originalUrl);
  const variant = (product?.imageVariants || []).find((item) => item.imageUrl === originalUrl);
  const width = Number(variant?.width);
  const thumbnailWidth = Number(variant?.thumbnailWidth);
  const thumbnail = getSafeImageUrl(variant?.thumbnailUrl);
  const responsive = src !== FALLBACK_PRODUCT_IMAGE && thumbnail !== FALLBACK_PRODUCT_IMAGE && thumbnail !== src
    && Number.isInteger(width) && Number.isInteger(thumbnailWidth)
    && thumbnailWidth > 0 && width > thumbnailWidth;
  return {
    src,
    srcSet: responsive ? `${srcSetUrl(thumbnail)} ${thumbnailWidth}w, ${srcSetUrl(src)} ${width}w` : undefined,
    sizes: responsive ? PRODUCT_CARD_SIZES : undefined,
  };
}
