import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './FeaturedProducts.css';

// 상단 MAIN SELECTION 전용 깔끔한 배경의 룩북 전신 모델 피팅 이미지
const MODEL_FIT_IMAGES = [
  '/models/model_1.png?v=20260804_v2',
  '/models/model_2.png?v=20260804_v2',
  '/models/model_3.png?v=20260804_v2',
  '/models/model_4.png?v=20260804_v2'
];

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export default function FeaturedProducts({ onProductSelect, onViewAll }) {
  const { language } = useLanguage();
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

  // 상위 4개 상품 매핑
  const spotlightProducts = products.slice(0, 4).map(product => {
    const langData = product[language] || product.ko || {};
    const rawDesc = langData.description || product.description || '';
    const cleanDesc = stripHtml(rawDesc);

    let displayPrice = product.price;
    if (product.prices) {
      if (language === 'ko') displayPrice = `₩${product.prices.KRW?.toLocaleString()}`;
      else if (language === 'en') displayPrice = `$${product.prices.USD?.toLocaleString()}`;
      else if (language === 'vi') displayPrice = `₫${product.prices.VND?.toLocaleString()}`;
    }

    return {
      ...product,
      name: langData.name || product.name || 'LikeDzy Selection',
      category: langData.category || product.category || 'COLLECTION',
      descriptionText: cleanDesc,
      displayPrice,
      images: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
    };
  });

  useEffect(() => {
    if (spotlightProducts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.1 }
    );

    const cards = document.querySelectorAll('.editorial-spotlight-row, .drop-card');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [products]);

  return (
    <section className="editorial-section container" ref={sectionRef}>
      {/* ========================================================
          1. 상단 섹션: MAIN SELECTION
          - 한 줄에 모델 1명씩 배치 (1열 롱-핏 모델)
          - 우측 남는 공간에 포인트 연관 선(Pointer Lines) 및 설명 가이드 표시
         ======================================================== */}
      <div className="editorial-header">
        <h2 className="editorial-main-title">MAIN SELECTION</h2>
      </div>

      <div className="editorial-spotlight-list">
        {spotlightProducts.map((product, index) => (
          <div 
            key={`spotlight-${product.id}`} 
            className={`editorial-spotlight-row ${index % 2 === 1 ? 'reverse' : ''}`}
            onClick={() => onProductSelect(product)}
          >
            {/* 좌측 (또는 지그재그): 9:16 롱-핏 전신 모델 피팅 카드 */}
            <div className="spotlight-photo-col">
              <div className="spotlight-image-frame">
                <img 
                  src={product.lookbookFitImageUrl || MODEL_FIT_IMAGES[index % MODEL_FIT_IMAGES.length]} 
                  alt={product.name} 
                  className="spotlight-image" 
                  loading="lazy"
                />
                <span className="spotlight-index-tag">LOOK 0{index + 1}</span>
              </div>
            </div>

            {/* 우측 (또는 지그재그): 포인터 선 & 카드가 설명하는 독특한 에디토리얼 패널 */}
            <div className="spotlight-info-col">
              <div className="spotlight-info-header">
                <span className="spotlight-cat-badge">{product.category}</span>
                <h3 className="spotlight-title">{product.name}</h3>
                {product.displayPrice && (
                  <span className="spotlight-price">{product.displayPrice}</span>
                )}
              </div>

              {/* 제품 포인트 연관 지시선 & 가이드 설명 */}
              <div className="spotlight-pointers">
                <div className="pointer-row">
                  <div className="pointer-indicator">
                    <span className="pointer-dot"></span>
                    <span className="pointer-line"></span>
                  </div>
                  <div className="pointer-content">
                    <h4 className="pointer-title">FIT & SILHOUETTE</h4>
                    <p className="pointer-desc">
                      체형에 자연스럽게 떨어지는 9:16 세로형 하이엔드 오버핏 실루엣.
                    </p>
                  </div>
                </div>

                <div className="pointer-row">
                  <div className="pointer-indicator">
                    <span className="pointer-dot"></span>
                    <span className="pointer-line"></span>
                  </div>
                  <div className="pointer-content">
                    <h4 className="pointer-title">CRAFT & MATERIAL</h4>
                    <p className="pointer-desc">
                      {product.descriptionText ? product.descriptionText.slice(0, 75) + '...' : '활동성과 통기성을 극대화한 프리미엄 수작업 우분 원단 적용.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="spotlight-action">
                <button className="spotlight-cta-btn">
                  자세히 보기 & 옵션 선택 &rarr;
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================
          2. 하단 섹션: 오버레이 카드 뷰
         ======================================================== */}
      <div className="drop-grid" style={{ marginTop: '64px' }}>
        {spotlightProducts.map((product, index) => (
          <div 
            key={`drop-${product.id}`} 
            className="drop-card"
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => onProductSelect(product)}
          >
            <div className="drop-image-frame">
              <img 
                src={product.images[0]} 
                alt={product.name} 
                className="drop-image" 
                loading="lazy"
              />
              <div className="drop-overlay">
                <div className="drop-info">
                  <span className="drop-category">{product.category}</span>
                  <h3 className="drop-name">{product.name}</h3>
                  {product.displayPrice && (
                    <span className="drop-price">{product.displayPrice}</span>
                  )}
                  <span className="drop-cta">자세히 보기 &rarr;</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
