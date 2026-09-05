import React, { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { presentProduct } from '../utils/productPresentation';
import { useProductCatalog } from '../hooks/useProductCatalog';
import ProductCard from './ProductCard';
import './FeaturedProducts.css';
import './CollectionList.css';

const FEATURED_LIMIT = 8;

export default function FeaturedProducts({ onProductSelect, onViewAll }) {
  const { language, t } = useLanguage();
  const { products, loading, error, reload } = useProductCatalog({ pageSize: FEATURED_LIMIT, featured: true, language });
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('likedzy_wishlist') || '[]');
    } catch {
      return [];
    }
  });

  const visibleProducts = useMemo(() => {
    return products
      .map((product) => presentProduct(product, language))
      .slice(0, FEATURED_LIMIT);
  }, [language, products]);

  const toggleWishlist = (productId, event) => {
    event.stopPropagation();
    setWishlist((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      try { localStorage.setItem('likedzy_wishlist', JSON.stringify(next)); } catch { /* Keep the current selection. */ }
      return next;
    });
  };

  return (
    <section id="featured-products" className="editorial-section outdoor-featured-section">
      {loading ? (
        <div className="collection-loading-skeleton">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="skeleton-card">
              <div className="skeleton-img" />
              <div className="skeleton-line short" />
              <div className="skeleton-line long" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="collection-empty-state"><p>{error}</p><button type="button" onClick={reload}>다시 시도</button></div>
      ) : (
        <div className="collection-grid-alo">
          {visibleProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onProductSelect={onProductSelect}
              isWishlisted={wishlist.includes(product.id)}
              onToggleWishlist={(event) => toggleWishlist(product.id, event)}
              priority={index < 4}
            />
          ))}
        </div>
      )}

      {onViewAll && (
        <div className="outdoor-view-all-wrap">
          <button type="button" className="outdoor-view-all-btn" onClick={onViewAll}>
            {t('home.viewCollection')} <span aria-hidden="true">↗</span>
          </button>
        </div>
      )}
    </section>
  );
}
