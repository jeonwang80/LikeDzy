import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './FeaturedProducts.css';
import './CollectionList.css'; // Shared Alo Yoga styles

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

export default function FeaturedProducts({ onProductSelect, onViewAll }) {
  const { language } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsList.sort((a, b) => {
          const orderA = a.orderIndex !== undefined ? a.orderIndex : 999;
          const orderB = b.orderIndex !== undefined ? b.orderIndex : 999;
          if (orderA !== orderB) return orderA - orderB;
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        }));
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const formattedProducts = products.map((product, idx) => {
    const langData = product[language] || product.ko || {};
    let displayPrice = product.price;
    if (product.prices) {
      if (language === 'ko') displayPrice = `₩${product.prices.KRW?.toLocaleString()}`;
      else if (language === 'en') displayPrice = `$${product.prices.USD?.toLocaleString()}`;
      else if (language === 'vi') displayPrice = `₫${product.prices.VND?.toLocaleString()}`;
    } else if (typeof product.price === 'number') {
      displayPrice = `₩${product.price.toLocaleString()}`;
    }

    const colorSwatches = product.colors && product.colors.length > 0 
      ? product.colors 
      : DEFAULT_COLOR_PALETTES[idx % DEFAULT_COLOR_PALETTES.length];

    const isBestSeller = product.isBestSeller || idx % 2 === 0;

    return {
      ...product,
      name: langData.name || product.name || 'LikeDzy Selection',
      category: langData.category || product.category || 'COLLECTION',
      displayPrice,
      images: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
      colorSwatches,
      isBestSeller,
      badgeText: isBestSeller ? 'BEST SELLER' : (idx % 3 === 0 ? 'NEW' : null)
    };
  });

  return (
    <section id="featured-products" className="editorial-section" style={{ padding: '4rem 2.5rem 5rem 2.5rem', maxWidth: '1800px', margin: '0 auto', width: '100%' }}>
      <div className="collection-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 className="collection-title">FEATURED SELECTION</h2>
        <p className="collection-subtitle">Discover our signature line-up designed for movement & style.</p>
      </div>

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
          {formattedProducts.map(product => (
            <AloProductCard 
              key={product.id} 
              product={product} 
              onProductSelect={onProductSelect}
              isWishlisted={wishlist.includes(product.id)}
              onToggleWishlist={(e) => toggleWishlist(product.id, e)}
            />
          ))}
        </div>
      )}

      {onViewAll && (
        <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
          <button className="pill-btn active" style={{ padding: '12px 32px', fontSize: '0.85rem' }} onClick={onViewAll}>
            VIEW ALL COLLECTION &rarr;
          </button>
        </div>
      )}
    </section>
  );
}

const AloProductCard = ({ product, onProductSelect, isWishlisted, onToggleWishlist }) => {
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const activeColor = product.colorSwatches[selectedColorIdx] || product.colorSwatches[0];
  const mainImage = (isHovered && product.images.length > 1) 
    ? product.images[1] 
    : (product.images[selectedColorIdx] || product.images[0] || '/models/model_1.png');

  return (
    <div 
      className="alo-product-card" 
      onClick={() => onProductSelect(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="alo-card-media">
        <img 
          src={mainImage} 
          alt={product.name} 
          className="alo-card-img" 
          loading="lazy" 
        />

        <button 
          className={`alo-wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={onToggleWishlist}
          aria-label="Wishlist"
        >
          {isWishlisted ? '♥' : '♡'}
        </button>

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

      {product.badgeText && (
        <div className="alo-badge-wrapper">
          <span className="alo-badge-pill">{product.badgeText}</span>
        </div>
      )}

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
