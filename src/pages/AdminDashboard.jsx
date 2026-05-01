import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import ProductEditor from './ProductEditor';

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [heroImageUrls, setHeroImageUrls] = useState([]);
  const [heroLoading, setHeroLoading] = useState(false);
  const [splashImageUrl, setSplashImageUrl] = useState(null);
  const [splashLoading, setSplashLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsList.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchHeroImage = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'main'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.heroImageUrls && Array.isArray(data.heroImageUrls)) {
          setHeroImageUrls(data.heroImageUrls);
        } else if (data.heroImageUrl) {
          // Backward compatibility
          setHeroImageUrls([data.heroImageUrl]);
        }
      }
    } catch (error) {
      console.error("Error fetching hero image:", error);
    }
  };

  const fetchSplashImage = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'main'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.splashImageUrl) {
          setSplashImageUrl(data.splashImageUrl);
        }
      }
    } catch (error) {
      console.error("Error fetching splash image:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchHeroImage();
    fetchSplashImage();
  }, []);

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsEditorOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsEditorOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("정말 이 상품을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, 'products', id));
        fetchProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("삭제에 실패했습니다.");
      }
    }
  };

  const handleHeroUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setHeroLoading(true);
    try {
      const newUrls = [];
      for (const file of files) {
        const imageRef = ref(storage, `settings/hero_${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(imageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        newUrls.push(url);
      }

      const updatedUrls = [...heroImageUrls, ...newUrls];
      await setDoc(doc(db, 'settings', 'main'), { heroImageUrls: updatedUrls }, { merge: true });
      setHeroImageUrls(updatedUrls);
      alert("배너 사진이 추가되었습니다.");
    } catch (error) {
      console.error("Error uploading hero images:", error);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setHeroLoading(false);
    }
  };

  const handleHeroDelete = async (urlToDelete) => {
    if (window.confirm("이 배너 사진을 삭제하시겠습니까?")) {
      try {
        const updatedUrls = heroImageUrls.filter(url => url !== urlToDelete);
        await setDoc(doc(db, 'settings', 'main'), { heroImageUrls: updatedUrls }, { merge: true });
        setHeroImageUrls(updatedUrls);
      } catch (error) {
        console.error("Error deleting hero image:", error);
        alert("삭제에 실패했습니다.");
      }
    }
  };

  const handleSplashUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSplashLoading(true);
    try {
      const imageRef = ref(storage, `settings/splash_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(imageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      await setDoc(doc(db, 'settings', 'main'), { splashImageUrl: url }, { merge: true });
      setSplashImageUrl(url);
      alert("인트로 애니메이션 이미지가 변경되었습니다.");
    } catch (error) {
      console.error("Error uploading splash image:", error);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setSplashLoading(false);
    }
  };

  const handleSplashDelete = async () => {
    if (window.confirm("인트로 애니메이션 이미지를 삭제하시겠습니까? (기본 이미지로 돌아갑니다)")) {
      try {
        await setDoc(doc(db, 'settings', 'main'), { splashImageUrl: null }, { merge: true });
        setSplashImageUrl(null);
      } catch (error) {
        console.error("Error deleting splash image:", error);
        alert("삭제에 실패했습니다.");
      }
    }
  };

  return (
    <div>
      {/* Hero Banner Management */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>메인 배너 관리</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {heroImageUrls.length > 0 ? (
              heroImageUrls.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={url} alt={`Hero ${idx}`} style={{ width: '200px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                  <button 
                    onClick={() => handleHeroDelete(url)}
                    style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                  >
                    X
                  </button>
                </div>
              ))
            ) : (
              <div style={{ width: '100%', maxWidth: '200px', height: '100px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: '1px dashed #cbd5e1', color: '#64748b' }}>기본 배너 사용 중</div>
            )}
          </div>
          <div>
            <input type="file" accept="image/*" multiple onChange={handleHeroUpload} disabled={heroLoading} id="hero-upload" style={{ display: 'none' }} />
            <label htmlFor="hero-upload" style={{ background: '#0f172a', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: heroLoading ? 'not-allowed' : 'pointer', display: 'inline-block', fontWeight: '500' }}>
              {heroLoading ? '업로드 중...' : '새 배너 사진 추가 (다중 선택 가능)'}
            </label>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>* 가로가 넓은 고화질 이미지(PC/모바일 공용)를 권장합니다. (여러 장 업로드 시 슬라이드로 자동 전환됩니다)</p>
          </div>
        </div>
      </div>

      {/* Intro Splash Management */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>진입 인트로(스플래시) 사진 관리</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {splashImageUrl ? (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={splashImageUrl} alt="Splash Screen" style={{ width: '200px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                <button 
                  onClick={handleSplashDelete}
                  style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                >
                  X
                </button>
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: '200px', height: '100px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: '1px dashed #cbd5e1', color: '#64748b' }}>기본 이미지 사용 중</div>
            )}
          </div>
          <div>
            <input type="file" accept="image/*" onChange={handleSplashUpload} disabled={splashLoading} id="splash-upload" style={{ display: 'none' }} />
            <label htmlFor="splash-upload" style={{ background: '#ec4899', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: splashLoading ? 'not-allowed' : 'pointer', display: 'inline-block', fontWeight: '500' }}>
              {splashLoading ? '업로드 중...' : '인트로 사진 변경 (1장만 가능)'}
            </label>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>* 웹사이트 접속 시 줌인(Zoom-in) 되는 사진입니다.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>상품 관리</h2>
        <button onClick={handleAddNew} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          + 새 상품 추가
        </button>
      </div>

      <div className="admin-table-container">
        <table style={{ minWidth: '600px', width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold' }}>상품명 (KO)</th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold' }}>카테고리</th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold' }}>가격</th>
              <th style={{ padding: '1rem', color: '#475569', fontWeight: 'bold' }}>관리</th>
            </tr>
          </thead>
          <tbody style={{ color: '#1e293b' }}>
            {products.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>등록된 상품이 없습니다.</td>
              </tr>
            ) : (
              products.map(product => {
                const displayImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : product.imageUrl;
                return (
                  <tr key={product.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {displayImage && <img src={displayImage} alt={product.ko?.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                        {product.ko?.name || '이름 없음'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>{product.ko?.category || '-'}</td>
                    <td style={{ padding: '1rem' }}>{product.price || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      <button onClick={() => handleEdit(product)} style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', marginRight: '0.5rem' }}>수정</button>
                      <button onClick={() => handleDelete(product.id)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>삭제</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {isEditorOpen && (
        <ProductEditor 
          product={editingProduct} 
          onClose={() => setIsEditorOpen(false)} 
          onSaved={() => {
            setIsEditorOpen(false);
            fetchProducts();
          }} 
        />
      )}
    </div>
  );
}
