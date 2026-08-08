import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './CollectionList.css';

// Alo Yoga style default color palette mapping helper for products
const DEFAULT_COLOR_PALETTES = [
  [
    { name: 'Gravel', colorHex: '#C5B49F' },
    { name: 'Ivory', colorHex: '#F3EFEA' },
    { name: 'Navy', colorHex: '#1B2A4A' },
    { name: 'Black', colorHex: '#111111' }
  ],
  [
    { name: 'Dune Grass', colorHex: '#A3B18A' },
    { name: 'Black', colorHex: '#111111' },
    { name: 'Cherry', colorHex: '#721B24' },
    { name: 'Heather Gray', colorHex: '#9E9E9E' }
  ],
  [
    { name: 'White Heather', colorHex: '#EAEAEA' },
    { name: 'Espresso', colorHex: '#3D2314' },
    { name: 'Midnight', colorHex: '#141E30' }
  ]
];

export default function CollectionList({ onProductSelect }) {
  const { t, language } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort States
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest'); // newest, price-asc, price-desc, name
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('likedzy_wishlist') || '[]');
    } catch (e) {
      return [];
    }
  });

  const toggleWishlist = (productId, e) => {
    e.stopPropagation();
    setWishlist(prev => {
      const exists = prev.includes(productId);
      const updated = exists ? prev.filter(id => id !== productId) : [...prev, productId];
      localStorage.setItem('likedzy_wishlist', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsList);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Format and process products
  const formattedProducts = products.map((product, idx) => {
    const langData = product[language] || product.ko || {};
    let displayPrice = product.price;
    let numericPrice = typeof product.price === 'number' ? product.price : 0;
    
    if (product.prices) {
      if (language === 'ko') {
        numericPrice = product.prices.KRW || numericPrice;
        displayPrice = `₩${numericPrice.toLocaleString()}`;
      } else if (language === 'en') {
        numericPrice = product.prices.USD || numericPrice;
        displayPrice = `$${numericPrice.toLocaleString()}`;
      } else if (language === 'vi') {
        numericPrice = product.prices.VND || numericPrice;
        displayPrice = `₫${numericPrice.toLocaleString()}`;
      }
    } else if (typeof product.price === 'number') {
      displayPrice = `₩${product.price.toLocaleString()}`;
    }

    // Default swatches if product doesn't have custom color objects
    const colorSwatches = (product.colorSwatches && product.colorSwatches.length > 0)
      ? product.colorSwatches 
      : (product.colors && product.colors.length > 0 ? product.colors : []);

    const isBestSeller = product.isBestSeller || idx % 2 === 0;

    return {
      ...product,
      name: langData.name || product.name || 'LikeDzy Collection Item',
      category: langData.category || product.category || 'COLLECTION',
      displayPrice,
      numericPrice,
      images: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
      colorSwatches,
      isBestSeller,
      badgeText: isBestSeller ? 'BEST SELLER' : (idx % 3 === 0 ? 'NEW' : null)
    };
  });

  // Filter Categories
  const categories = ['ALL', 'SWEATSHIRTS & HOODIES', 'TOPS', 'BOTTOMS', 'OUTERWEAR', 'ACC'];

  const filteredProducts = formattedProducts
    .filter(item => {
      if (selectedCategory !== 'ALL' && item.category.toUpperCase() !== selectedCategory) {
        if (!item.category.toUpperCase().includes(selectedCategory.split(' ')[0])) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.numericPrice - b.numericPrice;
      if (sortBy === 'price-desc') return b.numericPrice - a.numericPrice;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      // default: custom orderIndex first, then newest
      const orderA = a.orderIndex !== undefined ? a.orderIndex : 999;
      const orderB = b.orderIndex !== undefined ? b.orderIndex : 999;
      if (orderA !== orderB) return orderA - orderB;
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

  return (
    <div id="collection" className="collection-view-container">
      {/* 1. Header Title & Subtitle */}
      <div className="collection-header">
        <h1 className="collection-title">
          {selectedCategory === 'ALL' ? "MEN'S SWEATSHIRTS & HOODIES" : selectedCategory}
        </h1>
        <p className="collection-subtitle">
          Layering is always in season — consider these sweatshirts & hoodies a year-round must-have.
        </p>
      </div>

      {/* 2. Horizontal Scroll Pill Filter & Sort Bar (Alo Yoga Mobile & Desktop Style) */}
      <div className="collection-filter-section">
        <div className="collection-filter-bar">
          <button 
            className={`pill-btn ${selectedCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
          >
            ALL FILTERS 🎛️
          </button>

          {categories.slice(1).map(cat => (
            <button 
              key={cat} 
              className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}

          {/* Sort Dropdown Pill */}
          <div className="sort-pill-container">
            <button 
              className="pill-btn sort-pill"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
            >
              SORT: {sortBy === 'newest' ? 'Newest' : sortBy === 'price-asc' ? 'Price: Low to High' : sortBy === 'price-desc' ? 'Price: High to Low' : 'Name'} ▾
            </button>
            {showSortDropdown && (
              <div className="sort-dropdown-menu">
                <button onClick={() => { setSortBy('newest'); setShowSortDropdown(false); }}>Newest</button>
                <button onClick={() => { setSortBy('price-asc'); setShowSortDropdown(false); }}>Price: Low to High</button>
                <button onClick={() => { setSortBy('price-desc'); setShowSortDropdown(false); }}>Price: High to Low</button>
                <button onClick={() => { setSortBy('name'); setShowSortDropdown(false); }}>Name A-Z</button>
              </div>
            )}
          </div>
        </div>

        <div className="collection-count-badge">
          {filteredProducts.length} Products
        </div>
      </div>

      {/* 3. Product Cards Grid */}
      {loading ? (
        <div className="collection-loading-skeleton">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="skeleton-card">
              <div className="skeleton-img"></div>
              <div className="skeleton-line short"></div>
              <div className="skeleton-line long"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="collection-grid-alo">
          {filteredProducts.map(product => (
            <CollectionItem 
              key={product.id} 
              product={product} 
              onProductSelect={onProductSelect}
              isWishlisted={wishlist.includes(product.id)}
              onToggleWishlist={(e) => toggleWishlist(product.id, e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const getSafeImageUrl = (url, fallback = '/models/model_1.png') => {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return fallback;
};

// Alo Yoga Product Card Component
const CollectionItem = ({ product, onProductSelect, isWishlisted, onToggleWishlist }) => {
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const activeColor = product.colorSwatches?.[selectedColorIdx] || product.colorSwatches?.[0];
  const primaryImg = activeColor?.imageUrl 
    || (activeColor?.imageUrls && activeColor.imageUrls[0]) 
    || product.images?.[selectedColorIdx] 
    || product.images?.[0] 
    || '/models/model_1.png';

  const hoverImg = activeColor?.hoverImageUrl 
    || (activeColor?.imageUrls && activeColor.imageUrls[1]) 
    || (product.images?.length > 1 ? (product.images.find(img => img !== primaryImg) || product.images[1]) : primaryImg);

  const mainImage = getSafeImageUrl(isHovered ? hoverImg : primaryImg);

  return (
    <div 
      className="alo-product-card" 
      onClick={() => onProductSelect(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Tall 3:4 Aspect Ratio Image Container */}
      <div className="alo-card-media">
        <img 
          src={mainImage} 
          alt={product.name} 
          className="alo-card-img" 
          loading="lazy" 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/models/model_1.png';
          }}
        />

        {/* Wishlist Heart Icon */}
        <button 
          className={`alo-wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={onToggleWishlist}
          aria-label="Wishlist"
        >
          {isWishlisted ? '♥' : '♡'}
        </button>

        {/* Floating Quick Shop Bag Icon (Mobile & Desktop) */}
        <button 
          className="alo-quick-bag-btn"
          onClick={(e) => {
            e.stopPropagation();
            onProductSelect(product);
          }}
          aria-label="Quick Shop"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </button>
      </div>

      {/* 2. Color Swatches */}
      {product.colorSwatches && product.colorSwatches.length > 0 && (
        <div className="alo-color-swatches" onClick={(e) => e.stopPropagation()}>
          {product.colorSwatches.slice(0, 4).map((swatch, idx) => (
            <button
              key={idx}
              className={`alo-swatch-circle ${selectedColorIdx === idx ? 'selected' : ''}`}
              style={{ backgroundColor: swatch.colorHex || '#ccc' }}
              onClick={() => setSelectedColorIdx(idx)}
              onMouseEnter={() => setSelectedColorIdx(idx)}
              title={swatch.name}
            />
          ))}
          {product.colorSwatches.length > 4 && (
            <span className="alo-swatch-more">+{product.colorSwatches.length - 4}</span>
          )}
        </div>
      )}

      {/* 3. Badge (BEST SELLER / NEW) */}
      {product.badgeText && (
        <div className="alo-badge-wrapper">
          <span className="alo-badge-pill">{product.badgeText}</span>
        </div>
      )}

      {/* 4. Product Info */}
      <div className="alo-card-details">
        <h3 className="alo-product-title">{product.name}</h3>
        {activeColor?.name && (
          <p className="alo-color-title">{activeColor.name}</p>
        )}
        <p className="alo-product-price">{product.displayPrice}</p>
      </div>
    </div>
  );
};
