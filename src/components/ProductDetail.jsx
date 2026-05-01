import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCart } from '../context/CartContext';
import ProductReviews from './ProductReviews';
import ProductQnA from './ProductQnA';

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

export default function ProductDetail({ product, onBack }) {
  const { t } = useLanguage();
  const { addToCart, setIsCartOpen } = useCart();
  const [mainImageIndex, setMainImageIndex] = useState(0);
  
  const hasOptions = product.options && product.options.length > 0;

  // Prepare media items (Video first, then images)
  const mediaItems = [];
  if (product?.youtubeUrl) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = product.youtubeUrl.match(regExp);
    if (match && match[2].length === 11) {
      const youtubeId = match[2];
      mediaItems.push({
        type: 'video',
        url: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&playsinline=1`,
        thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      });
    }
  }
  
  if (product?.images?.length > 0) {
    product.images.forEach(img => {
      mediaItems.push({ type: 'image', url: img, thumbnail: img });
    });
  }
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(hasOptions ? 0 : -1);
  const [activeTab, setActiveTab] = useState('details'); // details, reviews, qna

  const handleAddToCart = () => {
    if (hasOptions && selectedOptionIdx === -1) {
      alert('옵션을 선택해주세요.');
      return false;
    }
    
    const option = hasOptions ? product.options[selectedOptionIdx] : { name: '기본', stock: 999 };
    
    if (option.stock <= 0) {
      alert('해당 옵션은 품절되었습니다.');
      return false;
    }

    addToCart(product, option, 1);
    return true;
  };


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!product) return null;

  return (
    <>
      <div className="product-detail-view fade-in">
      <div className="container" style={{ padding: '4rem 5%' }}>
        <button className="back-btn" onClick={onBack}>
          {t('products.back')}
        </button>
        
        <div className="detail-layout">
          <div className="detail-image-gallery-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mediaItems.length > 0 && (
              <div 
                className="detail-main-image-wrapper" 
                style={{ 
                  position: 'relative', 
                  backgroundColor: '#ffffff', 
                  borderRadius: '8px', 
                  overflow: 'hidden', 
                  aspectRatio: mediaItems[mainImageIndex].type === 'video' ? '9/16' : '3/4', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  maxHeight: '80vh'
                }}
              >
                {mediaItems[mainImageIndex].type === 'video' ? (
                  <iframe 
                    src={mediaItems[mainImageIndex].url}
                    style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                    allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                    title="Product Video"
                  />
                ) : (
                  <img 
                    src={mediaItems[mainImageIndex].url} 
                    alt={`${product.name} - main view`} 
                    style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} 
                  />
                )}
                
                {mediaItems.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMainImageIndex(prev => prev === 0 ? mediaItems.length - 1 : prev - 1); }}
                      style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', zIndex: 10, transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                    >
                      &#10094;
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMainImageIndex(prev => prev === mediaItems.length - 1 ? 0 : prev + 1); }}
                      style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', zIndex: 10, transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                    >
                      &#10095;
                    </button>
                    <div style={{ position: 'absolute', bottom: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.85rem', zIndex: 10, fontWeight: 'bold', letterSpacing: '1px' }}>
                      {mainImageIndex + 1} / {mediaItems.length}
                    </div>
                  </>
                )}
              </div>
            )}
            
            {mediaItems.length > 1 && (
              <div className="detail-thumbnails" style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {mediaItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setMainImageIndex(idx)}
                    style={{ 
                      position: 'relative',
                      width: '80px', 
                      height: '80px', 
                      flexShrink: 0, 
                      cursor: 'pointer', 
                      opacity: mainImageIndex === idx ? 1 : 0.4,
                      border: mainImageIndex === idx ? '2px solid var(--text-color)' : '2px solid transparent',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <img src={item.thumbnail} alt={`thumbnail-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {item.type === 'video' && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '1.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ▶
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="detail-info" style={{ position: 'sticky', top: '100px' }}>
            <p className="detail-category">{product.category}</p>
            <h1 className="detail-title">{product.name}</h1>
            <p className="detail-price">{product.price}</p>
            
            <div className="detail-divider"></div>
            
            <div className="detail-specs" style={{ marginBottom: '2rem' }}>
              {product.fabric && (
                <>
                  <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{t('products.fabricInfoTitle')}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{product.fabric}</p>
                </>
              )}
              
              {product.sizeGuide && (
                <>
                  <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{t('products.sizeInfoTitle')}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{product.sizeGuide}</p>
                </>
              )}
            </div>

            {hasOptions && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>옵션 선택</h4>
                <select 
                  value={selectedOptionIdx} 
                  onChange={e => setSelectedOptionIdx(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '1rem' }}
                >
                  {product.options.map((opt, idx) => (
                    <option key={idx} value={idx} disabled={opt.stock <= 0}>
                      {opt.name} {opt.stock <= 0 ? '(품절)' : `(남은 수량: ${opt.stock}개)`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mobile-sticky-action-bar">
              <button 
                onClick={handleAddToCart}
                className="btn-secondary detail-action-btn"
                style={{ flex: 1, margin: 0 }}
              >
                장바구니 담기
              </button>
              <button 
                onClick={() => {
                  const success = handleAddToCart();
                  if (success) setIsCartOpen(true);
                }}
                className="btn-primary detail-action-btn"
                style={{ flex: 1, margin: 0 }}
              >
                {t('products.buyNow')}
              </button>
            </div>



            <div className="detail-shipping">
              <p>✓ 전 상품 무료 배송</p>
              <p>✓ 14일 이내 무료 반품 가능</p>
            </div>
          </div>
        </div>

        {/* Tabs for Details / Reviews / QnA */}
        <div style={{ marginTop: '4rem' }}>
          <div className="detail-tabs-container">
            <button 
              onClick={() => setActiveTab('details')}
              className={`detail-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            >
              상품 정보
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`detail-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            >
              고객 리뷰
            </button>
            <button 
              onClick={() => setActiveTab('qna')}
              className={`detail-tab-btn ${activeTab === 'qna' ? 'active' : ''}`}
            >
              상품 Q&A
            </button>
          </div>

          <div style={{ padding: '2rem 0' }}>
            {activeTab === 'details' && (
              <div className="detail-tab-content">
                <h3 className="detail-tab-title">상품 설명</h3>
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
    </div>
    </>
  );
}
