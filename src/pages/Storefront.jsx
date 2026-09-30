import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import FeaturedProducts from '../components/FeaturedProducts';
import BrandStory from '../components/BrandStory';
import Footer from '../components/Footer';
import ProductDetail from '../components/ProductDetail';
import CollectionList from '../components/CollectionList'; 
import { useLanguage } from '../i18n/LanguageContext';
import { presentProduct } from '../utils/productPresentation';
import { buildProductUrl, readProductRoute } from '../utils/productRoutes';
import '../storefront-theme.css';

export default function Storefront() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  // URL에서 view 파라미터 추출
  const searchParams = new URLSearchParams(location.search);
  const viewMode = searchParams.get('view') || 'home'; 
  const selectedCategoryCode = searchParams.get('category') || '';
  const { productId } = readProductRoute(location.search);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productState, setProductState] = useState({ id: '', loading: false, error: '' });
  const [productRetry, setProductRetry] = useState(0);

  useLayoutEffect(() => {
    document.body.classList.remove('storefront-theme');
    document.body.classList.add('storefront-light');
    document.documentElement.dataset.storefrontTheme = 'light';
    document.documentElement.style.colorScheme = 'light';

    return () => {
      document.body.classList.remove('storefront-theme', 'storefront-light');
      delete document.documentElement.dataset.storefrontTheme;
      document.documentElement.style.removeProperty('color-scheme');
    };
  }, []);

  useEffect(() => {
    if (viewMode !== 'product' || !productId) return undefined;
    return onSnapshot(doc(db, 'products', productId), (snapshot) => {
        if (!snapshot.exists() || snapshot.data().isActive === false) {
          setProductState({ id: productId, loading: false, error: '이 상품을 찾을 수 없습니다. 판매가 종료되었을 수 있습니다.' });
          return;
        }
        setSelectedProduct({ id: snapshot.id, ...snapshot.data() });
        setProductState({ id: productId, loading: false, error: '' });
      }, (error) => {
        console.error('Product load failed:', error);
        setProductState({ id: productId, loading: false, error: '상품을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.' });
      });
  }, [viewMode, productId, productRetry]);

  const navigateToHome = () => {
    setSelectedProduct(null);
    navigate('/');
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    navigate(buildProductUrl(product.id, product.fromCategory));
  };

  const handleBackFromProduct = () => {
    if (selectedCategoryCode || selectedProduct?.fromCollection) {
      const categoryQuery = selectedCategoryCode ? `&category=${encodeURIComponent(selectedCategoryCode)}` : '';
      navigate(`/?view=collection${categoryQuery}`);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <Header onNavigateHome={navigateToHome} />
      <main style={{ paddingTop: viewMode === 'product' ? '80px' : '0' }}>
        {viewMode === 'product' && (!productId || (productState.id === productId && productState.error)) && (
          <section role="alert" style={{ padding: '5rem 5%', textAlign: 'center' }}>
            <p>{!productId ? '상품 정보가 없는 링크입니다. 상품 목록에서 다시 선택해 주세요.' : productState.error}</p>
            {productId && <button type="button" onClick={() => setProductRetry((attempt) => attempt + 1)}>다시 시도</button>}
            <button type="button" onClick={() => navigate('/?view=collection')}>상품 목록 보기</button>
          </section>
        )}
        {viewMode === 'product' && productId && (productState.id !== productId || (!productState.error && productState.loading)) && (
          <div role="status" style={{ padding: '5rem 5%', textAlign: 'center' }}>상품을 불러오는 중입니다.</div>
        )}
        {viewMode === 'product' && productId && !productState.loading && !productState.error && productState.id === productId && selectedProduct?.id === productId && (
          <ProductDetail key={productId} product={presentProduct(selectedProduct, language)} onBack={handleBackFromProduct} />
        )}
        
        {viewMode === 'collection' && (
          <CollectionList onProductSelect={(product) => handleProductSelect({ ...product, fromCollection: true, fromCategory: selectedCategoryCode })} />
        )}

        {viewMode === 'home' && (
          <>
            <HeroSection />
            <FeaturedProducts 
              onProductSelect={handleProductSelect} 
              onViewAll={() => navigate('/?view=collection')}
            />
            <BrandStory />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
