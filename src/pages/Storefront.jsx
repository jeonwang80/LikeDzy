import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import FeaturedProducts from '../components/FeaturedProducts';
import BrandStory from '../components/BrandStory';
import Footer from '../components/Footer';
import ProductDetail from '../components/ProductDetail';
import CollectionList from '../components/CollectionList'; 

export default function Storefront() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // URL에서 view 파라미터 추출
  const searchParams = new URLSearchParams(location.search);
  const viewMode = searchParams.get('view') || 'home'; 
  const selectedCategoryCode = searchParams.get('category') || '';
  
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const trackVisit = async () => {
      if (!sessionStorage.getItem('visited')) {
        const todayObj = new Date();
        const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
        const statsRef = doc(db, 'visitorStats', today);
        
        try {
          const snap = await getDoc(statsRef);
          if (snap.exists()) {
            await updateDoc(statsRef, { count: increment(1) });
          } else {
            await setDoc(statsRef, { count: 1 });
          }
          sessionStorage.setItem('visited', 'true');
        } catch (e) {
          console.error('Failed to log visit', e);
        }
      }
    };
    trackVisit();
  }, []);

  // 새로고침 등으로 product 뷰인데 상품 데이터가 없는 경우 홈으로 돌려보냄
  useEffect(() => {
    if (viewMode === 'product' && !selectedProduct) {
      navigate('/', { replace: true });
    }
  }, [viewMode, selectedProduct, navigate]);

  const navigateToHome = () => {
    setSelectedProduct(null);
    navigate('/');
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    const categoryQuery = product.fromCategory ? `&category=${encodeURIComponent(product.fromCategory)}` : '';
    navigate(`/?view=product${categoryQuery}`);
  };

  const handleBackFromProduct = () => {
    if (selectedProduct?.fromCollection) {
      const categoryQuery = selectedProduct.fromCategory ? `&category=${encodeURIComponent(selectedProduct.fromCategory)}` : '';
      navigate(`/?view=collection${categoryQuery}`);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <Header onNavigateHome={navigateToHome} />
      <main style={{ paddingTop: viewMode === 'product' ? '80px' : '0' }}>
        {viewMode === 'product' && selectedProduct && (
          <ProductDetail product={selectedProduct} onBack={handleBackFromProduct} />
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
