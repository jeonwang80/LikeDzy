import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../i18n/LanguageContext';
import { presentProduct, sortProducts } from '../utils/productPresentation';
import ProductCard from './ProductCard';
import './FeaturedProducts.css';
import './CollectionList.css';

const FEATURED_LIMIT = 8;

export default function FeaturedProducts({ onProductSelect, onViewAll }) {
  const { language, t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('likedzy_wishlist') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const nextProducts = snapshot.docs.map((productDoc) => ({
          id: productDoc.id,
          ...productDoc.data(),
        }));
        setProducts(sortProducts(nextProducts));
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to products:', error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const featuredProducts = useMemo(() => {
    const presented = products.map((product) => presentProduct(product, language));
    const selected = presented.filter((product) => product.isFeatured || product.isBestSeller);
    const selectedIds = new Set(selected.map((product) => product.id));
    const fallback = presented.filter((product) => !selectedIds.has(product.id));
    return [...selected, ...fallback].slice(0, FEATURED_LIMIT);
  }, [language, products]);

  const toggleWishlist = (productId, event) => {
    event.stopPropagation();
    setWishlist((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      localStorage.setItem('likedzy_wishlist', JSON.stringify(next));
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
      ) : (
        <div className="collection-grid-alo">
          {featuredProducts.map((product, index) => (
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
