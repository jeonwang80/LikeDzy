import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../i18n/LanguageContext';
import { presentProduct, sortProducts } from '../utils/productPresentation';
import ProductCard from './ProductCard';
import './CollectionList.css';

const CATEGORIES = ['ALL', 'TOPS', 'BOTTOMS', 'OUTERWEAR', 'ACC'];

export default function CollectionList({ onProductSelect }) {
  const { language, t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('likedzy_wishlist') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.scrollTo(0, 0);
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
        console.error('Error listening to collection:', error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const filteredProducts = useMemo(() => {
    const presented = products.map((product) => presentProduct(product, language));
    return presented
      .filter((product) => {
        if (selectedCategory === 'ALL') return true;
        return product.category.toUpperCase().includes(selectedCategory);
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.numericPrice - b.numericPrice;
        if (sortBy === 'price-desc') return b.numericPrice - a.numericPrice;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [language, products, selectedCategory, sortBy]);

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

  const sortLabel = {
    newest: t('collection.sortNewest'),
    'price-asc': t('collection.sortLow'),
    'price-desc': t('collection.sortHigh'),
    name: t('collection.sortName'),
  }[sortBy];

  return (
    <section id="collection" className="collection-view-container">
      <header className="collection-header collection-page-header">
        <p className="outdoor-section-kicker">LIKEDZY / ALL TERRAIN</p>
        <h1 className="collection-title">
          {selectedCategory === 'ALL' ? t('collection.title') : selectedCategory}
        </h1>
        <p className="collection-subtitle">{t('collection.subtitle')}</p>
      </header>

      <div className="collection-filter-section">
        <div className="collection-filter-bar" aria-label="상품 카테고리">
          {CATEGORIES.map((category) => (
            <button
              type="button"
              key={category}
              className={`pill-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'ALL' ? t('collection.all') : category}
            </button>
          ))}

          <div className="sort-pill-container">
            <button
              type="button"
              className="pill-btn sort-pill"
              onClick={() => setShowSortDropdown((open) => !open)}
              aria-expanded={showSortDropdown}
            >
              {t('collection.sort')}: {sortLabel} ▾
            </button>
            {showSortDropdown && (
              <div className="sort-dropdown-menu">
                {[
                  ['newest', t('collection.sortNewest')],
                  ['price-asc', t('collection.sortLow')],
                  ['price-desc', t('collection.sortHigh')],
                  ['name', t('collection.sortName')],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => {
                      setSortBy(value);
                      setShowSortDropdown(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="collection-count-badge">
          {filteredProducts.length} {t('collection.products')}
        </div>
      </div>

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
          {filteredProducts.map((product, index) => (
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
    </section>
  );
}
