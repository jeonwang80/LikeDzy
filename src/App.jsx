import React, { useState } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturedProducts from './components/FeaturedProducts';
import BrandStory from './components/BrandStory';
import Footer from './components/Footer';
import ProductDetail from './components/ProductDetail';

function App() {
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <>
      <Header />
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

export default App;
