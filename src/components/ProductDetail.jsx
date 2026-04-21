import React, { useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function ProductDetail({ product, onBack }) {
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!product) return null;

  return (
    <div className="product-detail-view fade-in">
      <div className="container" style={{ padding: '4rem 5%' }}>
        <button className="back-btn" onClick={onBack}>
          {t('products.back')}
        </button>
        
        <div className="detail-layout">
          <div className="detail-image-gallery">
            {product.images && product.images.map((imgSrc, idx) => (
              <div key={idx} className="detail-image-wrapper">
                <img src={imgSrc} alt={`${product.name} - view ${idx + 1}`} className="detail-image" />
              </div>
            ))}
          </div>
          
          <div className="detail-info" style={{ position: 'sticky', top: '100px' }}>
            <p className="detail-category">{product.category}</p>
            <h1 className="detail-title">{product.name}</h1>
            <p className="detail-price">{product.price}</p>
            
            <div className="detail-divider"></div>
            
            <p className="detail-description">{product.description}</p>
            
            <div className="detail-specs" style={{ marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{t('products.fabricInfoTitle')}</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>{t('products.fabricInfo')}</p>
              
              <h4 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{t('products.sizeInfoTitle')}</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{t('products.sizeInfo')}</p>
            </div>

            <button 
              className="btn-primary detail-buy-btn"
              onClick={() => alert(`결제 링크(${product.checkoutUrl || '등록 안됨'})로 이동합니다.`)}
            >
              {t('products.buyNow')}
            </button>

            <div className="detail-shipping">
              <p>✓ 전 상품 무료 배송</p>
              <p>✓ 14일 이내 무료 반품 가능</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
