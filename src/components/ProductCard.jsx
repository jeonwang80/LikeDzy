import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import {
  FALLBACK_PRODUCT_IMAGE,
  getColorSwatchBackground,
  resolveProductCardImages,
} from '../utils/productPresentation';
import { getProductImageSources } from '../utils/productImageSources';
import { buildProductUrl } from '../utils/productRoutes';

function applyNextImageFallback(image, candidates) {
  image.removeAttribute('srcset');
  image.removeAttribute('sizes');
  const urls = [...new Set(candidates)];
  let index = Number(image.dataset.fallbackIndex || 0);
  while (index < urls.length) {
    const candidate = urls[index++];
    image.dataset.fallbackIndex = String(index);
    if (new URL(candidate, document.baseURI).href === image.currentSrc) continue;
    image.src = candidate;
    return;
  }
  image.style.display = 'none';
}

export default function ProductCard({
  product,
  onProductSelect,
  isWishlisted,
  onToggleWishlist,
  priority = false,
}) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [requestedHoverUrls, setRequestedHoverUrls] = useState(() => new Set());
  const [loadedHoverUrl, setLoadedHoverUrl] = useState('');
  const {
    activeColor,
    primary,
    hover,
    primaryOriginal,
    hoverOriginal,
  } = resolveProductCardImages(product, selectedColorIndex);
  const cardPrimary = primaryOriginal === FALLBACK_PRODUCT_IMAGE ? primary : primaryOriginal;
  const cardHover = hoverOriginal === FALLBACK_PRODUCT_IMAGE ? hover : hoverOriginal;
  const hasHoverImage = cardHover !== cardPrimary;
  const primarySources = getProductImageSources(product, cardPrimary);
  const hoverSources = getProductImageSources(product, cardHover);
  const showHover = isHovered && hasHoverImage && loadedHoverUrl === cardHover;
  const badgeVariant = {
    'BEST SELLER': 'badge-best-seller',
    NEW: 'badge-new',
    RECOMMENDED: 'badge-recommended',
  }[product.badgeText] || 'badge-default';

  const openProduct = () => onProductSelect(product);
  const requestHover = () => {
    setIsHovered(true);
    if (hasHoverImage) setRequestedHoverUrls((current) => new Set([...current, cardHover]));
  };

  return (
    <article
      className="alo-product-card"
      onClick={openProduct}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openProduct();
        }
      }}
      onFocus={(event) => { if (event.target === event.currentTarget) requestHover(); }}
      onBlur={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${product.name} 상품 보기`}
    >
      <div
        className="alo-card-media"
        onMouseEnter={requestHover}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          key={cardPrimary}
          {...primarySources}
          alt={product.name}
          className="alo-card-img"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          style={{ opacity: showHover ? 0 : 1 }}
          onError={(event) => {
            applyNextImageFallback(event.currentTarget, [cardPrimary, primary, cardHover, FALLBACK_PRODUCT_IMAGE]);
          }}
        />

        {hasHoverImage && requestedHoverUrls.has(cardHover) && (
          <img
            key={cardHover}
            {...hoverSources}
            alt=""
            aria-hidden="true"
            className="alo-card-img alo-card-img-hover"
            decoding="async"
            onLoad={() => setLoadedHoverUrl(cardHover)}
            style={{ opacity: showHover ? 1 : 0 }}
            onError={(event) => {
              applyNextImageFallback(event.currentTarget, [cardHover, hover]);
            }}
          />
        )}

        <button
          type="button"
          className={`alo-wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={onToggleWishlist}
          aria-label={isWishlisted ? '위시리스트에서 삭제' : '위시리스트에 추가'}
        >
          <Heart
            className="alo-heart-icon"
            aria-hidden="true"
            fill={isWishlisted ? 'currentColor' : 'none'}
            strokeWidth={1.6}
          />
        </button>

        <button
          type="button"
          className="alo-quick-bag-btn alo-quick-bag-btn-overlay"
          onClick={(event) => {
            event.stopPropagation();
            openProduct();
          }}
          aria-label={`${product.name} 빠른 보기`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </button>
      </div>

      <div className="alo-card-tools-row" onClick={(event) => event.stopPropagation()}>
        {product.colorSwatches?.length > 0 && (
          <div className="alo-color-swatches">
          {product.colorSwatches.slice(0, 4).map((swatch, index) => (
            <button
              type="button"
              key={`${swatch.name || 'color'}-${index}`}
              className={`alo-swatch-circle ${selectedColorIndex === index ? 'selected' : ''}`}
              style={{ background: getColorSwatchBackground(swatch) }}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedColorIndex(index);
              }}
              aria-label={`${swatch.name || `색상 ${index + 1}`} 선택`}
              title={swatch.name}
            />
          ))}
          {product.colorSwatches.length > 4 && (
            <span className="alo-swatch-more">+{product.colorSwatches.length - 4}</span>
          )}
          </div>
        )}

        <button
          type="button"
          className="alo-quick-bag-btn alo-quick-bag-btn-tools"
          onClick={openProduct}
          aria-label={`${product.name} quick view`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </button>
      </div>

      <div
        className={`alo-badge-wrapper ${product.badgeText ? 'has-badge' : 'is-empty'}`}
        aria-hidden={!product.badgeText}
      >
        {product.badgeText && (
          <span className={`alo-badge-pill ${badgeVariant}`}>{product.badgeText}</span>
        )}
      </div>

      <div className="alo-card-details">
        <h3 className="alo-product-title"><a href={`#${buildProductUrl(product.id, product.fromCategory)}`} style={{ color: 'inherit', textDecoration: 'none' }} onClick={(event) => {
          event.stopPropagation();
          if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); openProduct(); }
        }}>{product.name}</a></h3>
        {activeColor?.name && <p className="alo-color-title">{activeColor.name}</p>}
        <p className="alo-product-price">{product.displayPrice}</p>
      </div>
    </article>
  );
}
