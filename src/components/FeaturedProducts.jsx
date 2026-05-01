import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './FeaturedProducts.css'; // 새 스타일 파일 연결

export default function FeaturedProducts({ onProductSelect, onViewAll }) {
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
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', padding: '0 10px' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>NEW IN</h2>
        <button onClick={onViewAll} className="view-all" style={{ fontSize: '0.9rem', color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>더 보러가기 {'>'}</button>
      </div>
      <p style={{ margin: '0 0 1.5rem 10px', color: '#aaa', fontSize: '0.9rem' }}>새롭게 공개된 LikeDzy 컬렉션을 지금 바로 확인하세요.</p>
      
      <div className="product-swipe-container" ref={sectionRef}>
        {translatedProducts.map((product) => (
          <div key={product.id} className="product-swipe-card" onClick={() => onProductSelect(product)}>
            <div className="product-image-wrapper borderless">
              <img src={product.images[0]} alt={product.name} className="product-image" />
            </div>
            <div className="product-info-minimal">
              <p className="product-category-minimal">{product.category}</p>
              <h3 className="product-name-minimal">{product.name}</h3>
              <p className="product-price-minimal">{product.price}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
