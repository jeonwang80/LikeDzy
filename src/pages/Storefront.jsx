import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import FeaturedProducts from '../components/FeaturedProducts';
import BrandStory from '../components/BrandStory';
import Footer from '../components/Footer';
import ProductDetail from '../components/ProductDetail';

export default function Storefront() {
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

  return (
    <>
      <Header onNavigateHome={() => setSelectedProduct(null)} />
      <main style={{ paddingTop: selectedProduct ? '80px' : '0' }}>
        {selectedProduct ? (
          <ProductDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} />
        ) : (
          <>
            <HeroSection />
            <FeaturedProducts onProductSelect={setSelectedProduct} />
            <BrandStory />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
