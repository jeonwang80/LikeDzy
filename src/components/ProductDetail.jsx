import React, { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCart } from '../context/CartContext';
import ProductReviews from './ProductReviews';
import ProductQnA from './ProductQnA';
import './CollectionList.css';

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
  ]
];

export default function ProductDetail({ product, onBack }) {
  const { t, language } = useLanguage();
  const { addToCart, setIsCartOpen } = useCart();
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);
  const [zoomImage, setZoomImage] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('likedzy_wishlist') || '[]');
      return saved.includes(product?.id);
    } catch (e) {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!product) return null;

  // Prepare images array
  const images = product.imageUrls && product.imageUrls.length > 0 
    ? product.imageUrls 
    : (product.images && product.images.length > 0 ? product.images : [product.imageUrl || '/models/model_1.png']);

  // Options & Swatches
  const hasOptions = product.options && product.options.length > 0;
  const colorSwatches = product.colorSwatches && product.colorSwatches.length > 0
    ? product.colorSwatches
    : (product.colors && product.colors.length > 0 ? product.colors : DEFAULT_COLOR_PALETTES[0]);

  const activeColor = colorSwatches[selectedColorIdx] || colorSwatches[0];
  const activeColorImg = activeColor?.imageUrl || images[selectedColorIdx];

  // Reorder images so selected color image is displayed first in gallery
  const displayImages = useMemo(() => {
    if (!activeColorImg || !images.includes(activeColorImg)) return images;
    return [activeColorImg, ...images.filter(img => img !== activeColorImg)];
  }, [images, activeColorImg]);

  // Sizes pill array (from product options or default Alo Yoga sizes)
  const sizes = hasOptions 
    ? product.options.map(opt => ({ name: opt.name, stock: opt.stock }))
    : [
        { name: 'S', stock: 10 },
        { name: 'M', stock: 10 },
        { name: 'L', stock: 10 },
        { name: 'XL', stock: 10 },
        { name: '2XL', stock: 5 }
      ];

  // Prices formatting
  let displayPrice = product.price;
  if (product.prices) {
    if (language === 'ko') displayPrice = `₩${product.prices.KRW?.toLocaleString()}`;
    else if (language === 'en') displayPrice = `$${product.prices.USD?.toLocaleString()}`;
    else if (language === 'vi') displayPrice = `₫${product.prices.VND?.toLocaleString()}`;
  } else if (typeof product.price === 'number') {
    displayPrice = `₩${product.price.toLocaleString()}`;
  }

  const toggleWishlist = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('likedzy_wishlist') || '[]');
      const exists = saved.includes(product.id);
      const updated = exists ? saved.filter(id => id !== product.id) : [...saved, product.id];
      localStorage.setItem('likedzy_wishlist', JSON.stringify(updated));
      setIsWishlisted(!exists);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddToCart = () => {
    const selectedOpt = hasOptions 
      ? product.options[selectedOptionIdx] 
      : { name: sizes[selectedSizeIdx]?.name || '기본', stock: 999 };
    
    if (selectedOpt.stock <= 0) {
      alert('해당 옵션은 품절되었습니다.');
      return false;
    }

    addToCart(product, selectedOpt, 1);
    return true;
  };

  return (
    <div className="product-detail-alo-page fade-in">
      <div className="alo-detail-container">
        {/* Top Back Navigation */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="alo-back-link-btn" onClick={onBack}>
            ← COLLECTION
          </button>
        </div>

        {/* Alo Yoga 2-Column Main Layout: Left Multiple Photos Grid + Right Sticky Panel */}
        <div className="alo-detail-layout">
          
          {/* ========================================================
              LEFT COLUMN: Multiple Product Photos Grid (Alo Yoga Style)
             ======================================================== */}
          <div className="alo-detail-gallery">
            {displayImages.map((imgUrl, idx) => (
              <div 
                key={idx} 
                className="alo-detail-img-frame"
                onClick={() => setZoomImage(imgUrl)}
              >
                <img 
                  src={imgUrl} 
                  alt={`${product.name} - view ${idx + 1}`} 
                  className="alo-detail-img" 
                  loading={idx === 0 ? "eager" : "lazy"}
                />
                {idx === 0 && (
                  <span className="alo-model-tag">Model is wearing size M</span>
                )}
              </div>
            ))}
          </div>

          {/* ========================================================
              RIGHT COLUMN: Sticky Specs & Purchase Panel (Alo Yoga Style)
             ======================================================== */}
          <div className="alo-detail-buy-panel">
            {/* 1. Badge & Title */}
            <div className="alo-detail-header-meta">
              {product.isBestSeller && (
                <span className="alo-badge-pill" style={{ marginBottom: '8px' }}>BEST SELLER</span>
              )}
              <h1 className="alo-detail-title">{product.name}</h1>
              <div className="alo-detail-price-rating-row">
                <span className="alo-detail-price-text">{displayPrice}</span>
                <span className="alo-detail-rating">★★★★★ <small>(182 Reviews)</small></span>
              </div>
            </div>

            <div className="alo-detail-divider" />

            {/* 2. Color Swatches Section */}
            <div className="alo-detail-option-group">
              <div className="alo-option-label">
                <strong>Color:</strong> <span style={{ color: '#555' }}>{activeColor?.name || 'Gravel'}</span>
              </div>
              <div className="alo-color-swatches-lg">
                {colorSwatches.map((swatch, idx) => (
                  <button
                    key={idx}
                    className={`alo-swatch-lg-circle ${selectedColorIdx === idx ? 'selected' : ''}`}
                    style={{ backgroundColor: swatch.colorHex || '#ccc' }}
                    onClick={() => setSelectedColorIdx(idx)}
                    title={swatch.name}
                  />
                ))}
              </div>
            </div>

            {/* 3. Fit Note Box */}
            <div className="alo-fit-note-box">
              <strong>Fit:</strong> Designed for a boxy, relaxed oversized silhouette — size down for a more tailored fit.
            </div>

            {/* 4. Size Pill Selector Buttons */}
            <div className="alo-detail-option-group">
              <div className="alo-option-label" style={{ justifyContent: 'space-between' }}>
                <span><strong>Size:</strong> {sizes[selectedSizeIdx]?.name}</span>
                <span className="alo-size-guide-link">Size Guide</span>
              </div>
              <div className="alo-size-pill-grid">
                {sizes.map((sz, idx) => (
                  <button
                    key={idx}
                    className={`alo-size-pill-btn ${selectedSizeIdx === idx ? 'selected' : ''} ${sz.stock <= 0 ? 'disabled' : ''}`}
                    onClick={() => {
                      setSelectedSizeIdx(idx);
                      setSelectedOptionIdx(idx);
                    }}
                    disabled={sz.stock <= 0}
                  >
                    {sz.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. CTA Buttons: ADD TO BAG & ADD TO WISHLIST */}
            <div className="alo-cta-group">
              <button 
                className="alo-add-to-bag-btn"
                onClick={() => {
                  const success = handleAddToCart();
                  if (success) setIsCartOpen(true);
                }}
              >
                ADD TO BAG
              </button>
              
              <button 
                className={`alo-add-to-wishlist-btn ${isWishlisted ? 'active' : ''}`}
                onClick={toggleWishlist}
              >
                {isWishlisted ? '♥ WISHLISTED' : '♡ ADD TO WISHLIST'}
              </button>
            </div>

            {/* 6. Shipping & Return Info */}
            <div className="alo-shipping-perks">
              <p>✓ Complimentary Shipping Over ₩50,000 & Free Returns</p>
              <p>✓ Premium 手作業 Organic Cotton Blend</p>
            </div>

          </div>
        </div>

        {/* Bottom Section: Tabs for Details, Reviews, QnA */}
        <div style={{ marginTop: '5rem', borderTop: '1px solid #E5E5E5', paddingTop: '3rem' }}>
          <div className="detail-tabs-container">
            <button 
              onClick={() => setActiveTab('details')}
              className={`detail-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            >
              상품 상세정보
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`detail-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            >
              고객 리뷰 (182)
            </button>
            <button 
              onClick={() => setActiveTab('qna')}
              className={`detail-tab-btn ${activeTab === 'qna' ? 'active' : ''}`}
            >
              Q&A 문의
            </button>
          </div>

          <div style={{ padding: '2rem 0' }}>
            {activeTab === 'details' && (
              <div className="detail-tab-content">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>PRODUCT DETAILS & FABRIC</h3>
                {product.fabric && (
                  <p style={{ color: '#444', lineHeight: 1.7, marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
                    {product.fabric}
                  </p>
                )}
                <div 
                  className="quill-content"
                  dangerouslySetInnerHTML={{ __html: product.description }} 
                />
              </div>
            )}
            
            {activeTab === 'reviews' && <ProductReviews productId={product.id} />}
            {activeTab === 'qna' && <ProductQnA productId={product.id} />}
          </div>
        </div>
      </div>

      {/* Lightbox Image Modal */}
      {zoomImage && (
        <div className="alo-lightbox-modal" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} alt="Zoomed view" className="alo-lightbox-img" />
          <button className="alo-lightbox-close">✕</button>
        </div>
      )}
    </div>
  );
}
