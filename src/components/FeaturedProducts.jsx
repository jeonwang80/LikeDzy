import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function FeaturedProducts({ onProductSelect }) {
  const { t, language } = useLanguage();
  const sectionRef = useRef(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsList.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA; // 최신순 정렬
        }));
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  // Map translations to products based on current language
  const translatedProducts = products.map(product => {
    const langData = product[language] || product.ko || {};
    
    // Format price based on language if prices object exists
    let displayPrice = product.price;
    if (product.prices) {
      if (language === 'ko') displayPrice = `₩${product.prices.KRW?.toLocaleString()}`;
      else if (language === 'en') displayPrice = `$${product.prices.USD?.toLocaleString()}`;
      else if (language === 'vi') displayPrice = `₫${product.prices.VND?.toLocaleString()}`;
    }

    return {
      ...product,
      name: langData.name || '',
      category: langData.category || '',
      description: langData.description || '',
      fabric: langData.fabric || '',
      sizeGuide: langData.sizeGuide || '',
      price: displayPrice,
      images: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
    };
  });

  useEffect(() => {
    if (products.length === 0) return;

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
  }, [products]);

  return (
    <section id="collection" className="products-section container">
      <div className="section-header">
        <h2 className="section-title">{t('products.title')}</h2>
        <a href="#collection" className="view-all">{t('products.viewAll')}</a>
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
