import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './CollectionList.css';

export default function CollectionList({ onProductSelect }) {
  const { t, language } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 스크롤 맨 위로 초기화
    window.scrollTo(0, 0);
    
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
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();

    // 페이지 진입 시 세로 스크롤 스냅(자석 효과) 활성화
    document.documentElement.style.scrollSnapType = 'y mandatory';
    return () => {
      document.documentElement.style.scrollSnapType = ''; // 언마운트 시 원상복구
    };
  }, []);

  const translatedProducts = products.map(product => {
    const langData = product[language] || product.ko || {};
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
      price: displayPrice,
      images: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
    };
  });

  return (
    <div className="collection-view-container">
      <div className="collection-header">
        <h2 className="collection-title">COLLECTION</h2>
        <p className="collection-subtitle">새롭게 공개된 라인업을 만나보세요.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#666' }}>Loading...</div>
      ) : (
        <div className="collection-list">
          {translatedProducts.map(product => (
            <CollectionItem key={product.id} product={product} onProductSelect={onProductSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

const CollectionItem = ({ product, onProductSelect }) => {
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    const newActiveSlide = Math.round(scrollLeft / width);
    setActiveSlide(newActiveSlide);
  };

  return (
    <div className="collection-item" onClick={() => onProductSelect(product)}>
      <div className="collection-image-container">
        <div className="collection-image-wrapper" onScroll={handleScroll}>
          {product.images.map((img, idx) => (
            <img key={idx} src={img} alt={`${product.name} ${idx + 1}`} className="collection-slide-img" />
          ))}
        </div>
        {product.images.length > 1 && (
          <div className="collection-slide-dots">
            {product.images.map((_, idx) => (
              <span key={idx} className={`collection-dot ${activeSlide === idx ? 'active' : ''}`} />
            ))}
          </div>
        )}
      </div>
      <div className="collection-item-info">
        <p className="collection-item-category">{product.category}</p>
        <h3 className="collection-item-name">{product.name}</h3>
        <p className="collection-item-price">{product.price}</p>
      </div>
    </div>
  );
};
