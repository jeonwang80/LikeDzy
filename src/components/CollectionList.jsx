import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../i18n/LanguageContext';
import { presentProduct, sortProducts } from '../utils/productPresentation';
import ProductCard from './ProductCard';
import { formatCategoryPath, useCategoryMasters } from '../hooks/useCategoryMasters';
import './CollectionList.css';

const LEGACY_CATEGORIES = ['TOPS', 'BOTTOMS', 'OUTERWEAR', 'ACC'];

export default function CollectionList({ onProductSelect }) {
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { categories: categoryMasters } = useCategoryMasters({ activeOnly: true });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('likedzy_wishlist') || '[]');
    } catch {
      return [];
    }
  });

  const selectedCategory = new URLSearchParams(location.search).get('category') || 'ALL';

  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategory === 'ALL') return t('collection.title');
    const exactCategory = categoryMasters.find((category) => category.code === selectedCategory);
    if (exactCategory) return formatCategoryPath(exactCategory);

    const codeParts = selectedCategory.split('-');
    const matchingCategory = categoryMasters.find((category) => category.code?.startsWith(`${selectedCategory}-`));
    if (!matchingCategory) return selectedCategory;
    if (codeParts.length === 1) return matchingCategory.level1Name || selectedCategory;
    if (codeParts.length === 2) return [matchingCategory.level1Name, matchingCategory.level2Name].filter(Boolean).join(' / ');
    return selectedCategory;
  }, [categoryMasters, selectedCategory, t]);

  const categoryFilters = useMemo(() => {
    const topLevelCategories = [];
    const registeredCodes = new Set();
    categoryMasters.forEach((category) => {
      if (!category.level1Code || registeredCodes.has(category.level1Code)) return;
      registeredCodes.add(category.level1Code);
      topLevelCategories.push({ code: category.level1Code, label: category.level1Name || category.level1Code });
    });

    const baseFilters = topLevelCategories.length > 0
      ? topLevelCategories
      : LEGACY_CATEGORIES.map((category) => ({ code: category, label: category }));

    if (selectedCategory !== 'ALL' && !baseFilters.some((category) => category.code === selectedCategory)) {
      return [{ code: selectedCategory, label: selectedCategoryLabel }, ...baseFilters];
    }
    return baseFilters;
  }, [categoryMasters, selectedCategory, selectedCategoryLabel]);

  const handleCategoryFilter = (categoryCode) => {
    const params = new URLSearchParams(location.search);
    params.set('view', 'collection');
    if (categoryCode === 'ALL') params.delete('category');
    else params.set('category', categoryCode);
    navigate(`/?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        <h1 className="collection-title">{selectedCategoryLabel}</h1>
        <p className="collection-subtitle">{t('collection.subtitle')}</p>
      </header>

      <div className="collection-filter-section">
        <div className="collection-filter-bar" aria-label="상품 카테고리">
          <button
            type="button"
            className={`pill-btn ${selectedCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => handleCategoryFilter('ALL')}
          >
            {t('collection.all')}
          </button>
          {categoryFilters.map((category) => (
            <button
              type="button"
              key={category.code}
              className={`pill-btn ${selectedCategory === category.code ? 'active' : ''}`}
              onClick={() => handleCategoryFilter(category.code)}
            >
              {category.label}
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
      ) : filteredProducts.length === 0 ? (
        <div className="collection-empty-state">
          <span>NO PRODUCTS YET</span>
          <strong>이 카테고리에 등록된 상품이 없습니다.</strong>
          <p>상품 관리에서 해당 기준정보 카테고리를 선택하면 이곳에 자동으로 표시됩니다.</p>
          <button type="button" onClick={() => handleCategoryFilter('ALL')}>전체 상품 보기</button>
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
