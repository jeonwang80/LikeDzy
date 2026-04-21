import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function FeaturedProducts({ onProductSelect }) {
  const { t } = useLanguage();
  const sectionRef = useRef(null);

  const products = [
    { 
      id: 1, 
      images: [
        './product_pants_1776726381627.png', 
        './hero_woven_golf_1776726365621.png', 
        './product_jacket_1776726540377.png'
      ] 
    },
    { 
      id: 2, 
      images: [
        './product_hat_1776726393074.png', 
        './product_pants_1776726381627.png', 
        './product_jacket_1776726540377.png'
      ] 
    },
    { 
      id: 3, 
      images: [
        './product_jacket_1776726540377.png', 
        './hero_woven_golf_1776726365621.png', 
        './product_pants_1776726381627.png'
      ] 
    }
  ];

  // Map translations to products
  const translatedProducts = products.map((product, index) => ({
    ...product,
    name: t(`products.items.${index}.name`),
    category: t(`products.items.${index}.category`),
    price: t(`products.items.${index}.price`),
    description: t(`products.items.${index}.description`),
    checkoutUrl: t(`products.items.${index}.checkoutUrl`)
  }));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const cards = document.querySelectorAll('.product-card');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="collection" className="products-section container">
      <div className="section-header">
        <h2 className="section-title">{t('products.title')}</h2>
        <a href="#shop" className="view-all">{t('products.viewAll')}</a>
      </div>
      <div className="product-grid" ref={sectionRef}>
        {translatedProducts.map((product) => (
          <div key={product.id} className="product-card" style={{ opacity: 0, transform: 'translateY(20px)' }} onClick={() => onProductSelect(product)}>
            <div className="product-image-wrapper">
              <img src={product.images[0]} alt={product.name} className="product-image" />
            </div>
            <div className="product-info" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p className="product-category" style={{ margin: 0 }}>{product.category}</p>
              <h3 className="product-name" style={{ margin: 0 }}>{product.name}</h3>
              <p className="product-price" style={{ fontWeight: 600, fontSize: '1.2rem', color: 'var(--text-color)' }}>{product.price}</p>
              <button 
                className="btn-primary" 
                style={{ padding: '0.8rem', marginTop: '0.5rem', fontSize: '0.9rem', width: '100%', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                onClick={(e) => { e.stopPropagation(); onProductSelect(product); }}
              >
                {t('products.viewDetails')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
