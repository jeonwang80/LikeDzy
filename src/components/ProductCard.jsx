import React, { useState } from 'react';
import {
  FALLBACK_PRODUCT_IMAGE,
  resolveProductCardImages,
} from '../utils/productPresentation';

export default function ProductCard({
  product,
  onProductSelect,
  isWishlisted,
  onToggleWishlist,
  priority = false,
}) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { activeColor, primary, hover } = resolveProductCardImages(product, selectedColorIndex);
  const hasHoverImage = hover !== primary;

  const openProduct = () => onProductSelect(product);

  return (
    <article
      className="alo-product-card"
      onClick={openProduct}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openProduct();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${product.name} 상품 보기`}
    >
      <div className="alo-card-media">
        <img
          src={primary}
          alt={product.name}
          className="alo-card-img"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          style={{ opacity: isHovered && hasHoverImage ? 0 : 1 }}
          onError={(event) => {
            const image = event.currentTarget;

            if (hasHoverImage && image.dataset.fallbackStep !== 'hover') {
              image.dataset.fallbackStep = 'hover';
              image.src = hover;
              return;
            }

            image.onerror = null;
            image.src = FALLBACK_PRODUCT_IMAGE;
          }}
        />

        {hasHoverImage && (
          <img
            src={hover}
            alt=""
            aria-hidden="true"
            className="alo-card-img alo-card-img-hover"
            loading="lazy"
            style={{ opacity: isHovered ? 1 : 0 }}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}

        <button
          type="button"
          className={`alo-wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={onToggleWishlist}
          aria-label={isWishlisted ? '위시리스트에서 삭제' : '위시리스트에 추가'}
        >
          {isWishlisted ? '♥' : '♡'}
        </button>

        <button
          type="button"
          className="alo-quick-bag-btn"
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

      {product.colorSwatches?.length > 0 && (
        <div className="alo-color-swatches" onClick={(event) => event.stopPropagation()}>
          {product.colorSwatches.slice(0, 4).map((swatch, index) => (
            <button
              type="button"
              key={`${swatch.name || 'color'}-${index}`}
              className={`alo-swatch-circle ${selectedColorIndex === index ? 'selected' : ''}`}
              style={{ backgroundColor: swatch.colorHex || '#ccc' }}
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

      {product.badgeText && (
        <div className="alo-badge-wrapper">
          <span className="alo-badge-pill">{product.badgeText}</span>
        </div>
      )}

      <div className="alo-card-details">
        <h3 className="alo-product-title">{product.name}</h3>
        {activeColor?.name && <p className="alo-color-title">{activeColor.name}</p>}
        <p className="alo-product-price">{product.displayPrice}</p>
      </div>
    </article>
  );
}
