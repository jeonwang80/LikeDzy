import React, { useState, useRef, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import imageCompression from 'browser-image-compression';
import { db, storage } from '../firebase';
import '../admin.css';

export default function ProductEditor({ product, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [lookbookFitFile, setLookbookFitFile] = useState(null);
  const [lookbookFitPreviewUrl, setLookbookFitPreviewUrl] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [baseCurrency, setBaseCurrency] = useState('KRW');
  const [rawPrice, setRawPrice] = useState(() => {
    if (product && product.prices) {
      return product.prices.KRW.toString();
    }
    return '';
  });

  const EXCHANGE_RATES = {
    USD_TO_KRW: 1400,
    USD_TO_VND: 25000,
  };

  const quillRefKo = useRef(null);
  const quillRefEn = useRef(null);
  const quillRefVi = useRef(null);
  const modalContentRef = useRef(null);

  const scrollToTop = () => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const imageHandler = (quillRef) => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      try {
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1200, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        const storageRef = ref(storage, `details/${Date.now()}_${compressedFile.name}`);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const url = await getDownloadURL(snapshot.ref);

        const editor = quillRef.current.getEditor();
        const range = editor.getSelection();
        editor.insertEmbed(range ? range.index : 0, 'image', url);
      } catch (error) {
        console.error('Image upload failed:', error);
        alert('이미지 업로드에 실패했습니다.');
      }
    };
  };

  const modulesKo = useMemo(() => ({
    toolbar: { container: [[{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'color': [] }, { 'background': [] }], [{ 'align': [] }], ['image', 'video']], handlers: { image: () => imageHandler(quillRefKo) } }
  }), []);
  const modulesEn = useMemo(() => ({
    toolbar: { container: [[{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'color': [] }, { 'background': [] }], [{ 'align': [] }], ['image', 'video']], handlers: { image: () => imageHandler(quillRefEn) } }
  }), []);
  const modulesVi = useMemo(() => ({
    toolbar: { container: [[{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'color': [] }, { 'background': [] }], [{ 'align': [] }], ['image', 'video']], handlers: { image: () => imageHandler(quillRefVi) } }
  }), []);

  const calculatePrices = (base, amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return { KRW: 0, USD: 0, VND: 0 };
    
    let usd = 0;
    if (base === 'USD') usd = num;
    else if (base === 'KRW') usd = num / EXCHANGE_RATES.USD_TO_KRW;
    else if (base === 'VND') usd = num / EXCHANGE_RATES.USD_TO_VND;

    const rawKRW = usd * EXCHANGE_RATES.USD_TO_KRW;
    const rawVND = usd * EXCHANGE_RATES.USD_TO_VND;

    // USD: 0.1 단위 밑으로 버림 (예: 99.47 -> 99.4)
    const flooredUSD = Math.floor(usd * 10) / 10;
    
    // KRW: 1000 단위 밑으로 버림 (예: 145300 -> 145000)
    const flooredKRW = Math.floor(rawKRW / 1000) * 1000;
    
    // VND: 1000 단위 밑으로 버림 (예: 2453200 -> 2453000)
    const flooredVND = Math.floor(rawVND / 1000) * 1000;

    return {
      USD: flooredUSD,
      KRW: flooredKRW,
      VND: flooredVND
    };
  };
  
  const [formData, setFormData] = useState(() => {
    if (product) {
      return {
        ...product,
        imageUrls: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
        lookbookFitImageUrl: product.lookbookFitImageUrl || '',
        options: product.options || []
      };
    }
    return {
      price: '',
      youtubeUrl: '',
      videoUrl: '',
      lookbookFitImageUrl: '',
      ko: { name: '', category: '', description: '', fabric: '', sizeGuide: '' },
      en: { name: '', category: '', description: '', fabric: '', sizeGuide: '' },
      vi: { name: '', category: '', description: '', fabric: '', sizeGuide: '' },
      imageUrls: [],
      prices: { KRW: 0, USD: 0, VND: 0 }
    };
  });

  const handleChange = (lang, field, value) => {
    if (lang) {
      setFormData(prev => {
        const newState = {
          ...prev,
          [lang]: { ...prev[lang], [field]: value }
        };
        
        // 한국어 입력 시, 영어/베트남어가 비어있거나 기존 한국어와 같으면 자동으로 복사
        if (lang === 'ko') {
          const oldKoValue = prev.ko[field];
          if (!prev.en[field] || prev.en[field] === oldKoValue) {
            newState.en = { ...newState.en, [field]: value };
          }
          if (!prev.vi[field] || prev.vi[field] === oldKoValue) {
            newState.vi = { ...newState.vi, [field]: value };
          }
        }
        
        return newState;
      });
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePriceChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, ''); // 숫자와 소수점만 허용
    setRawPrice(value);
    
    const calculated = calculatePrices(baseCurrency, value);
    const formattedPriceString = `₩${calculated.KRW.toLocaleString()} / $${calculated.USD.toLocaleString()} / ₫${calculated.VND.toLocaleString()}`;
    
    setFormData(prev => ({
      ...prev,
      prices: calculated,
      price: formattedPriceString
    }));
  };
  
  const handleCurrencyChange = (e) => {
    const newBase = e.target.value;
    setBaseCurrency(newBase);
    if (rawPrice) {
       const calculated = calculatePrices(newBase, rawPrice);
       const formattedPriceString = `₩${calculated.KRW.toLocaleString()} / $${calculated.USD.toLocaleString()} / ₫${calculated.VND.toLocaleString()}`;
       setFormData(prev => ({
         ...prev,
         prices: calculated,
         price: formattedPriceString
       }));
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 8);
      setImageFiles(files);
      setPreviewUrls(files.map(file => URL.createObjectURL(file)));
    }
  };

  const handleLookbookFitChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLookbookFitFile(file);
      setLookbookFitPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveLookbookFit = () => {
    setLookbookFitFile(null);
    setLookbookFitPreviewUrl(null);
    setFormData(prev => ({ ...prev, lookbookFitImageUrl: '' }));
  };

  const handleVideoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) {
        alert("영상 용량은 20MB 이하만 가능합니다.");
        return;
      }
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setFormData(prev => ({ ...prev, videoUrl: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalImageUrls = [...formData.imageUrls];
      let finalVideoUrl = formData.videoUrl || '';
      let finalLookbookFitImageUrl = formData.lookbookFitImageUrl || '';

      // 1. Upload new images if selected (replaces old ones)
      if (imageFiles.length > 0) {
        finalImageUrls = [];
        for (const file of imageFiles) {
          const imageRef = ref(storage, `products/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(imageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          finalImageUrls.push(url);
        }
      }

      // 1.2 Upload lookbook 9:16 fit image if selected
      if (lookbookFitFile) {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true };
        const compressedFile = await imageCompression(lookbookFitFile, options).catch(() => lookbookFitFile);
        const lookbookRef = ref(storage, `products/lookbooks/${Date.now()}_${compressedFile.name}`);
        const snapshot = await uploadBytes(lookbookRef, compressedFile);
        finalLookbookFitImageUrl = await getDownloadURL(snapshot.ref);
      }

      // 1.5 Upload new video if selected
      if (videoFile) {
        const videoRef = ref(storage, `products/videos/${Date.now()}_${videoFile.name}`);
        const snapshot = await uploadBytes(videoRef, videoFile);
        finalVideoUrl = await getDownloadURL(snapshot.ref);
      }

      const finalData = { 
        ...formData, 
        imageUrls: finalImageUrls, 
        videoUrl: finalVideoUrl, 
        lookbookFitImageUrl: finalLookbookFitImageUrl,
        updatedAt: new Date() 
      };
      delete finalData.imageUrl; // Remove legacy field

      // 2. Save to Firestore
      if (product && product.id) {
        await updateDoc(doc(db, 'products', product.id), finalData);
      } else {
        await addDoc(collection(db, 'products'), { ...finalData, createdAt: new Date() });
      }

      onSaved();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="admin-modal-content" ref={modalContentRef} style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.5rem 2rem',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '84vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        position: 'relative',
        overscrollBehavior: 'contain'
      }}>
        {/* 상단 Sticky 고정 헤더 */}
        <div style={{
          position: 'sticky',
          top: '-1.5rem',
          backgroundColor: '#ffffff',
          zIndex: 40,
          paddingTop: '0.5rem',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
          borderBottom: '2px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#0f172a' }}>
            {product ? '✏️ 상품 정보 & 이미지 수정' : '➕ 새 상품 추가'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button 
              type="button" 
              onClick={scrollToTop} 
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
              }}
            >
              ⬆️ 이미지 등록 구역 (맨 위로)
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              style={{
                background: '#f1f5f9',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              &times;
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* ========================================================
              1. 🎯 메인 룩북 9:16 세로형 모델 피팅 이미지 전용 업로드 (신규)
             ======================================================== */}
          <div style={{
            padding: '1.25rem',
            backgroundColor: '#f0f9ff',
            border: '2px dashed #0284c7',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📸</span> [신규] 메인 룩북 전신 모델 피팅 사진 (9:16 세로형)
                </h4>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: '#0284c7', lineHeight: 1.4 }}>
                  * 메인 쇼핑몰 <strong>MAIN SELECTION</strong> 룩북 화보 카드(Look 01 등)에 9:16 세로 비율로 최우선 표시됩니다.
                </p>
              </div>
              <label style={{
                padding: '8px 16px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                whiteSpace: 'nowrap'
              }}>
                + 9:16 세로사진 선택
                <input type="file" accept="image/*" onChange={handleLookbookFitChange} style={{ display: 'none' }} />
              </label>
            </div>

            {/* 세로 미리보기 영역 */}
            {(lookbookFitPreviewUrl || formData.lookbookFitImageUrl) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.75rem', padding: '0.75rem 1rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img 
                    src={lookbookFitPreviewUrl || formData.lookbookFitImageUrl} 
                    alt="lookbook-fit-preview" 
                    style={{ width: '100px', height: '178px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #0284c7', boxShadow: '0 6px 16px rgba(0,0,0,0.12)' }} 
                  />
                  <button 
                    type="button" 
                    onClick={handleRemoveLookbookFit}
                    style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                  >
                    &times;
                  </button>
                </div>
                <div>
                  <span style={{ display: 'inline-block', padding: '4px 10px', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    ✓ 9:16 메인 룩북 피팅 이미지 등록됨
                  </span>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                    새로운 세로 이미지를 추가하면 메인 화면 룩북 화보 카드가 즉시 해당 9:16 모델 컷으로 업데이트됩니다.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1.25rem', textAlign: 'center', border: '1px dashed #bae6fd', borderRadius: '8px', backgroundColor: '#ffffff', color: '#0369a1', fontSize: '0.85rem' }}>
                아직 등록된 9:16 세로 룩북 사진이 없습니다. 오른쪽 <strong>[+ 9:16 세로사진 선택]</strong> 버튼을 눌러 모델 전신 컷을 등록해보세요!
              </div>
            )}
          </div>

          {/* ========================================================
              2. 🖼️ 일반 상품 갤러리 사진 (최대 8장)
             ======================================================== */}
          <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.95rem' }}>🖼️ 일반 상품 갤러리 사진 (최대 8장)</label>
              <label style={{ padding: '6px 14px', backgroundColor: '#475569', color: '#ffffff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
                + 상품사진 선택
                <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', overflowX: 'auto', minHeight: '80px', alignItems: 'center' }}>
              {imageFiles.length === 0 && formData.imageUrls && formData.imageUrls.map((url, idx) => (
                <img key={idx} src={url} alt={`preview-${idx}`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              ))}
              {imageFiles.length > 0 && previewUrls.map((url, idx) => (
                <img key={idx} src={url} alt={`new-preview-${idx}`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #3b82f6' }} />
              ))}
              {(!formData.imageUrls || formData.imageUrls.length === 0) && imageFiles.length === 0 && (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>등록된 일반 상품 사진이 없습니다.</span>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>* 드래그하여 여러 장 선택 가능하며, 새로 선택 시 기존 갤러리 사진을 덮어씁니다.</p>
          </div>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: '#1e293b' }}>가격</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select 
                value={baseCurrency} 
                onChange={handleCurrencyChange}
                style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white' }}
              >
                <option value="KRW">KRW (원)</option>
                <option value="USD">USD (달러)</option>
                <option value="VND">VND (동)</option>
              </select>
              <input 
                required 
                placeholder="숫자만 입력하세요"
                value={rawPrice} 
                onChange={handlePriceChange} 
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
              />
            </div>
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: '#1e293b' }}>
                직접 영상 업로드 (.mp4) <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>* 추천 (10MB 이하 짧은 영상)</span>
              </label>
              <input type="file" accept="video/mp4,video/quicktime" onChange={handleVideoChange} style={{ width: '100%', marginBottom: '0.5rem' }} />
              
              {(videoPreviewUrl || formData.videoUrl) && (
                <div style={{ position: 'relative', display: 'inline-block', marginTop: '0.5rem' }}>
                  <video 
                    src={videoPreviewUrl || formData.videoUrl} 
                    style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '4px', backgroundColor: 'black' }} 
                    controls 
                  />
                  <button 
                    type="button" 
                    onClick={handleRemoveVideo}
                    style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                  >
                    X
                  </button>
                </div>
              )}

              <label style={{ fontWeight: 'bold', display: 'block', margin: '1.5rem 0 0.5rem', color: '#1e293b' }}>
                유튜브 영상 링크 (대체/서브용)
              </label>
              <input 
                placeholder="예: https://youtube.com/watch?v=..."
                value={formData.youtubeUrl || ''} 
                onChange={e => handleChange(null, 'youtubeUrl', e.target.value)} 
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
              />
            </div>
            {formData.prices && formData.prices.KRW > 0 && (
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '0.9rem', color: '#475569' }}>
                <div style={{ marginBottom: '0.25rem', fontWeight: 'bold' }}>자동 계산된 가격:</div>
                <div>🇰🇷 ₩{formData.prices.KRW?.toLocaleString()}</div>
                <div>🇺🇸 ${formData.prices.USD?.toLocaleString()}</div>
                <div>🇻🇳 ₫{formData.prices.VND?.toLocaleString()}</div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                  * 적용 환율: 1 USD = 1,400 KRW = 25,000 VND
                </div>
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />

          {/* Korean */}
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#2563eb', marginBottom: '0.5rem' }}>한국어 (KO)</h3>
            <input placeholder="상품명" required value={formData.ko.name} onChange={e => handleChange('ko', 'name', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            <input placeholder="카테고리 (예: Apparel)" value={formData.ko.category} onChange={e => handleChange('ko', 'category', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            <div style={{ marginBottom: '0.5rem', background: 'white', color: 'black', borderRadius: '4px' }}>
              <ReactQuill ref={quillRefKo} theme="snow" modules={modulesKo} value={formData.ko.description} onChange={val => handleChange('ko', 'description', val)} placeholder="상세페이지 내용을 블로그처럼 예쁘게 꾸며보세요!" />
            </div>
            <textarea placeholder="원단 정보 (예: 프리미엄 나일론 88%)" value={formData.ko.fabric} onChange={e => handleChange('ko', 'fabric', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', minHeight: '60px' }} />
            <textarea placeholder="사이즈 가이드 (예: 정사이즈 추천)" value={formData.ko.sizeGuide} onChange={e => handleChange('ko', 'sizeGuide', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', minHeight: '60px' }} />
          </div>

          {/* English */}
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#16a34a', marginBottom: '0.5rem' }}>English (EN)</h3>
            <input placeholder="Product Name" value={formData.en.name} onChange={e => handleChange('en', 'name', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            <input placeholder="Category" value={formData.en.category} onChange={e => handleChange('en', 'category', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            <div style={{ marginBottom: '0.5rem', background: 'white', color: 'black', borderRadius: '4px' }}>
              <ReactQuill ref={quillRefEn} theme="snow" modules={modulesEn} value={formData.en.description} onChange={val => handleChange('en', 'description', val)} placeholder="Detailed Description" />
            </div>
            <textarea placeholder="Fabric Information" value={formData.en.fabric} onChange={e => handleChange('en', 'fabric', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', minHeight: '60px' }} />
            <textarea placeholder="Size Guide" value={formData.en.sizeGuide} onChange={e => handleChange('en', 'sizeGuide', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', minHeight: '60px' }} />
          </div>

          {/* Vietnamese */}
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#dc2626', marginBottom: '0.5rem' }}>Tiếng Việt (VI)</h3>
            <input placeholder="Tên sản phẩm" value={formData.vi.name} onChange={e => handleChange('vi', 'name', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            <input placeholder="Thể loại" value={formData.vi.category} onChange={e => handleChange('vi', 'category', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            <div style={{ marginBottom: '0.5rem', background: 'white', color: 'black', borderRadius: '4px' }}>
              <ReactQuill ref={quillRefVi} theme="snow" modules={modulesVi} value={formData.vi.description} onChange={val => handleChange('vi', 'description', val)} placeholder="Mô tả chi tiết" />
            </div>
            <textarea placeholder="Thông tin vải" value={formData.vi.fabric} onChange={e => handleChange('vi', 'fabric', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', minHeight: '60px' }} />
            <textarea placeholder="Hướng dẫn kích thước" value={formData.vi.sizeGuide} onChange={e => handleChange('vi', 'sizeGuide', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', minHeight: '60px' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button 
              type="button" 
              onClick={scrollToTop} 
              style={{
                padding: '0.75rem 1.25rem',
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ⬆️ 맨 위로 (사진업로드 구역)
            </button>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" onClick={onClose} disabled={loading} style={{ padding: '0.75rem 1.5rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
              <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                {loading ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
