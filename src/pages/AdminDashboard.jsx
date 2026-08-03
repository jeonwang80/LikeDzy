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
  const [heroTitle, setHeroTitle] = useState('');
  const [heroTitleSize, setHeroTitleSize] = useState('md');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroSubtitleSize, setHeroSubtitleSize] = useState('md');
  const [heroTextLoading, setHeroTextLoading] = useState(false);

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
        if (data.heroTitle !== undefined) setHeroTitle(data.heroTitle);
        if (data.heroTitleSize) setHeroTitleSize(data.heroTitleSize);
        if (data.heroSubtitle !== undefined) setHeroSubtitle(data.heroSubtitle);
        if (data.heroSubtitleSize) setHeroSubtitleSize(data.heroSubtitleSize);
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
        await setDoc(doc(db, 'settings', 'main'), { heroImageUrls: updatedUrls, heroImageUrl: null }, { merge: true });
        setHeroImageUrls(updatedUrls);
      } catch (error) {
        console.error("Error deleting hero image:", error);
        alert("삭제에 실패했습니다.");
      }
    }
  };

  const handleHeroTextSave = async () => {
    setHeroTextLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'main'), { 
        heroTitle, 
        heroTitleSize,
        heroSubtitle,
        heroSubtitleSize
      }, { merge: true });
      alert("하단 텍스트가 저장되었습니다.");
    } catch (error) {
      console.error("Error saving hero text:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setHeroTextLoading(false);
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
      <div className="admin-header">
        <h1 className="admin-title">대시보드 & 메인 관리</h1>
      </div>

      {/* Hero Banner Management */}
      <div className="admin-card">
        <h2 className="admin-card-title">
          <span>메인 배너 이미지 관리</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {heroImageUrls.length > 0 ? (
              heroImageUrls.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={url} alt={`Hero ${idx}`} style={{ width: '200px', height: '110px', objectFit: 'cover', border: '1px solid #e5e5e5' }} />
                  <button 
                    onClick={() => handleHeroDelete(url)}
                    style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#d30005', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <div style={{ width: '100%', maxWidth: '200px', height: '110px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cacacb', color: '#707072', fontSize: '0.9rem' }}>기본 배너 사용 중</div>
            )}
          </div>
          <div>
            <input type="file" accept="image/*" multiple onChange={handleHeroUpload} disabled={heroLoading} id="hero-upload" style={{ display: 'none' }} />
            <label htmlFor="hero-upload" className="admin-btn-primary" style={{ cursor: heroLoading ? 'not-allowed' : 'pointer' }}>
              {heroLoading ? '업로드 중...' : '새 배너 사진 추가 (다중 선택)'}
            </label>
            <p style={{ fontSize: '0.85rem', color: '#707072', marginTop: '0.75rem' }}>* 가로가 넓은 고화질 이미지를 권장합니다. 여러 장 등록 시 자동으로 슬라이딩됩니다.</p>
          </div>
        </div>
        
        <div style={{ marginTop: '2rem', borderTop: '1px solid #e5e5e5', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111111', marginBottom: '1.25rem' }}>메인 텍스트 설정</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#39393b', marginBottom: '0.4rem' }}>메인 제목</label>
                <input 
                  value={heroTitle} 
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="예: 프리미엄 스포츠웨어의 새로운 기준"
                  className="admin-input"
                />
              </div>
              <div style={{ width: '130px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#39393b', marginBottom: '0.4rem' }}>크기</label>
                <select value={heroTitleSize} onChange={e => setHeroTitleSize(e.target.value)} className="admin-select">
                  <option value="sm">작게</option>
                  <option value="md">보통</option>
                  <option value="lg">크게</option>
                  <option value="xl">아주 크게</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#39393b', marginBottom: '0.4rem' }}>서브 내용</label>
                <textarea 
                  value={heroSubtitle} 
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  placeholder="예: LikeDzy는 최고의 퍼포먼스와 완벽한 핏을 선사합니다."
                  className="admin-textarea"
                  style={{ minHeight: '80px', borderRadius: '16px' }}
                />
              </div>
              <div style={{ width: '130px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#39393b', marginBottom: '0.4rem' }}>크기</label>
                <select value={heroSubtitleSize} onChange={e => setHeroSubtitleSize(e.target.value)} className="admin-select">
                  <option value="sm">작게</option>
                  <option value="md">보통</option>
                  <option value="lg">크게</option>
                  <option value="xl">아주 크게</option>
                </select>
              </div>
            </div>
            <button 
              onClick={handleHeroTextSave} 
              disabled={heroTextLoading}
              className="admin-btn-primary"
              style={{ alignSelf: 'flex-start' }}
            >
              {heroTextLoading ? '저장 중...' : '텍스트 저장'}
            </button>
          </div>
        </div>
      </div>

      {/* Intro Splash Management */}
      <div className="admin-card">
        <h2 className="admin-card-title">진입 인트로 (스플래시) 비주얼 관리</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {splashImageUrl ? (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={splashImageUrl} alt="Splash Screen" style={{ width: '200px', height: '110px', objectFit: 'cover', border: '1px solid #e5e5e5' }} />
                <button 
                  onClick={handleSplashDelete}
                  style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#d30005', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: '200px', height: '110px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cacacb', color: '#707072', fontSize: '0.9rem' }}>기본 이미지 사용 중</div>
            )}
          </div>
          <div>
            <input type="file" accept="image/*" onChange={handleSplashUpload} disabled={splashLoading} id="splash-upload" style={{ display: 'none' }} />
            <label htmlFor="splash-upload" className="admin-btn-secondary" style={{ cursor: splashLoading ? 'not-allowed' : 'pointer' }}>
              {splashLoading ? '업로드 중...' : '인트로 사진 변경 (1장 선택)'}
            </label>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="admin-card">
        <div className="admin-card-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '1.5rem' }}>
          <span>상품 목록</span>
          <button onClick={handleAddNew} className="admin-btn-primary">
            + 새 상품 추가
          </button>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>상품명 (KO)</th>
                <th>카테고리</th>
                <th>메인 룩북 컷 (9:16)</th>
                <th>가격</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#707072' }}>등록된 상품이 없습니다.</td>
                </tr>
              ) : (
                products.map(product => {
                  const displayImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : product.imageUrl;
                  return (
                    <tr key={product.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: '600' }}>
                          {displayImage && <img src={displayImage} alt={product.ko?.name} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', backgroundColor: '#f5f5f5' }} />}
                          {product.ko?.name || '이름 없음'}
                        </div>
                      </td>
                      <td>{product.ko?.category || '-'}</td>
                      <td>
                        {product.lookbookFitImageUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <img 
                              src={product.lookbookFitImageUrl} 
                              alt="lookbook-fit" 
                              style={{ width: '30px', height: '53px', objectFit: 'cover', borderRadius: '4px', border: '1.5px solid #2563eb' }} 
                            />
                            <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 'bold' }}>✓ 세로 룩북 등록됨</span>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleEdit(product)} 
                            style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                          >
                            + 9:16 룩북사진 추가
                          </button>
                        )}
                      </td>
                      <td style={{ fontWeight: '600' }}>{product.price || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEdit(product)} className="admin-btn-secondary" style={{ height: '36px', padding: '6px 16px', fontSize: '0.85rem' }}>수정 & 이미지 변경</button>
                          <button onClick={() => handleDelete(product.id)} className="admin-btn-danger" style={{ height: '36px', padding: '6px 16px', fontSize: '0.85rem' }}>삭제</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

