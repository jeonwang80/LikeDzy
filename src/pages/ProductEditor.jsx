import React, { useState, useRef, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import imageCompression from 'browser-image-compression';
import { db, storage } from '../firebase';
import '../admin.css';
import '../components/CollectionList.css';

export default function ProductEditor({ product, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' | 'form'
  const [activeLang, setActiveLang] = useState('ko'); // 'ko' | 'en' | 'vi'
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'reviews' | 'qna'

  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [baseCurrency, setBaseCurrency] = useState('KRW');
  const [rawPrice, setRawPrice] = useState(() => {
    if (product && product.prices) {
      return product.prices.KRW.toString();
    }
    return product?.price ? product.price.toString().replace(/[^0-9.]/g, '') : '';
  });

  const EXCHANGE_RATES = {
    USD_TO_KRW: 1400,
    USD_TO_VND: 25000,
  };

  const quillRefKo = useRef(null);
  const quillRefEn = useRef(null);
  const quillRefVi = useRef(null);

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

    const flooredUSD = Math.floor(usd * 10) / 10;
    const flooredKRW = Math.floor(rawKRW / 1000) * 1000;
    const flooredVND = Math.floor(rawVND / 1000) * 1000;

    return {
      USD: flooredUSD,
      KRW: flooredKRW,
      VND: flooredVND
    };
  };
  
  const defaultPerk1 = 'Complimentary Shipping Over ₩50,000 & Free Returns';
  const defaultPerk2 = 'Premium Organic Cotton Blend';

  const [formData, setFormData] = useState(() => {
    if (product) {
      return {
        ...product,
        isBestSeller: product.isBestSeller !== undefined ? product.isBestSeller : false,
        imageUrls: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
        colorSwatches: product.colorSwatches || (product.colors || []),
        options: product.options || [
          { name: 'S' },
          { name: 'M' },
          { name: 'L' },
          { name: 'XL' },
          { name: '2XL' }
        ],
        ko: product.ko || { 
          name: product.name || '', 
          category: product.category || '', 
          description: product.description || '', 
          fabric: product.fabric || '', 
          sizeGuide: product.sizeGuide || '',
          perk1: product.perk1 || defaultPerk1,
          perk2: product.perk2 || defaultPerk2
        },
        en: product.en || { 
          name: product.name || '', 
          category: product.category || '', 
          description: product.description || '', 
          fabric: product.fabric || '', 
          sizeGuide: product.sizeGuide || '',
          perk1: product.perk1 || defaultPerk1,
          perk2: product.perk2 || defaultPerk2
        },
        vi: product.vi || { 
          name: product.name || '', 
          category: product.category || '', 
          description: product.description || '', 
          fabric: product.fabric || '', 
          sizeGuide: product.sizeGuide || '',
          perk1: product.perk1 || defaultPerk1,
          perk2: product.perk2 || defaultPerk2
        },
      };
    }
    return {
      isBestSeller: false,
      price: '',
      youtubeUrl: '',
      videoUrl: '',
      ko: { name: '', category: 'Apparel', description: '', fabric: '', sizeGuide: '', perk1: defaultPerk1, perk2: defaultPerk2 },
      en: { name: '', category: 'Apparel', description: '', fabric: '', sizeGuide: '', perk1: defaultPerk1, perk2: defaultPerk2 },
      vi: { name: '', category: 'Apparel', description: '', fabric: '', sizeGuide: '', perk1: defaultPerk1, perk2: defaultPerk2 },
      imageUrls: [],
      colorSwatches: [
        { name: 'Black', colorHex: '#111111', imageUrl: '' }
      ],
      options: [
        { name: 'S' },
        { name: 'M' },
        { name: 'L' },
        { name: 'XL' },
        { name: '2XL' }
      ],
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
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setRawPrice(value);
    
    const calculated = calculatePrices(baseCurrency, value);
    const formattedPriceString = `KRW ₩${calculated.KRW.toLocaleString()} / USD $${calculated.USD.toLocaleString()} / VND ₫${calculated.VND.toLocaleString()}`;
    
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
       const formattedPriceString = `KRW ₩${calculated.KRW.toLocaleString()} / USD $${calculated.USD.toLocaleString()} / VND ₫${calculated.VND.toLocaleString()}`;
       setFormData(prev => ({
         ...prev,
         prices: calculated,
         price: formattedPriceString
       }));
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const currentCount = (formData.imageUrls?.length || 0) + imageFiles.length;
      const available = 8 - currentCount;
      if (available <= 0) {
        alert("이미지는 최대 8장까지 등록할 수 있습니다.");
        return;
      }
      const files = Array.from(e.target.files).slice(0, available);
      setImageFiles(prev => [...prev, ...files]);
      setPreviewUrls(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
    }
  };

  const handleRemoveExistingImage = (index) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveNewImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveExistingImage = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= (formData.imageUrls?.length || 0)) return;

    setFormData(prev => {
      const updated = [...prev.imageUrls];
      const temp = updated[fromIndex];
      updated[fromIndex] = updated[toIndex];
      updated[toIndex] = temp;
      return { ...prev, imageUrls: updated };
    });
  };

  const handleMakeMainImage = (url) => {
    setFormData(prev => {
      const filtered = prev.imageUrls.filter(u => u !== url);
      return { ...prev, imageUrls: [url, ...filtered] };
    });
  };

  const handleAddColorSwatch = () => {
    setFormData(prev => ({
      ...prev,
      colorSwatches: [
        ...(prev.colorSwatches || []),
        { name: 'Black', colorHex: '#111111', imageUrl: prev.imageUrls?.[0] || '' }
      ]
    }));
  };

  const handleColorSwatchChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...(prev.colorSwatches || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, colorSwatches: updated };
    });
  };

  const handleRemoveColorSwatch = (index) => {
    setFormData(prev => ({
      ...prev,
      colorSwatches: prev.colorSwatches.filter((_, i) => i !== index)
    }));
  };

  const handleAddOption = () => {
    const name = prompt("추가할 사이즈 옵션명을 입력하세요 (예: 3XL, FREE)", "3XL");
    if (!name) return;
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), { name: name.trim().toUpperCase() }]
    }));
  };

  const handleRemoveOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
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
    if (e) e.preventDefault();
    setLoading(true);

    try {
      let finalImageUrls = [...(formData.imageUrls || [])];
      let finalVideoUrl = formData.videoUrl || '';

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const imageRef = ref(storage, `products/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(imageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          finalImageUrls.push(url);
        }
      }

      if (videoFile) {
        const videoRef = ref(storage, `products/videos/${Date.now()}_${videoFile.name}`);
        const snapshot = await uploadBytes(videoRef, videoFile);
        finalVideoUrl = await getDownloadURL(snapshot.ref);
      }

      const name = formData.ko?.name || formData.en?.name || formData.vi?.name || '신규 상품';
      const category = formData.ko?.category || 'Apparel';
      const description = formData.ko?.description || '';
      const fabric = formData.ko?.fabric || '';
      const perk1 = formData.ko?.perk1 || defaultPerk1;
      const perk2 = formData.ko?.perk2 || defaultPerk2;

      const finalData = { 
        ...formData, 
        name,
        category,
        description,
        fabric,
        perk1,
        perk2,
        imageUrls: finalImageUrls, 
        videoUrl: finalVideoUrl, 
        updatedAt: new Date() 
      };
      delete finalData.imageUrl;

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

  const currentLangData = formData[activeLang] || formData.ko;
  const allPhotos = [...(formData.imageUrls || []), ...previewUrls];

  return (
    <div className="product-live-editor-overlay fade-in">
      
      {/* 1. TOP STICKY BUILDER HEADER CONTROL BAR */}
      <header className="live-builder-header">
        <div className="live-builder-title">
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {product ? `상품 라이브 비주얼 빌더 (${formData.ko?.name || '편집 중'})` : '새 상품 비주얼 라이브 빌더'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              화면 상의 텍스트와 사진을 직접 클릭하여 실시간으로 편집하세요
            </div>
          </div>
        </div>

        <div className="live-builder-controls">
          {/* Mode Switcher */}
          <div className="live-builder-mode-switcher">
            <button 
              type="button" 
              className={`live-builder-mode-btn ${editorMode === 'visual' ? 'active' : ''}`}
              onClick={() => setEditorMode('visual')}
            >
              라이브 비주얼 편집
            </button>
            <button 
              type="button" 
              className={`live-builder-mode-btn ${editorMode === 'form' ? 'active' : ''}`}
              onClick={() => setEditorMode('form')}
            >
              양식 폼 모드
            </button>
          </div>

          {/* Language Tabs */}
          <div className="live-builder-lang-switcher">
            <button 
              type="button" 
              className={`live-builder-lang-btn ${activeLang === 'ko' ? 'active' : ''}`}
              onClick={() => setActiveLang('ko')}
            >
              한국어
            </button>
            <button 
              type="button" 
              className={`live-builder-lang-btn ${activeLang === 'en' ? 'active' : ''}`}
              onClick={() => setActiveLang('en')}
            >
              English
            </button>
            <button 
              type="button" 
              className={`live-builder-lang-btn ${activeLang === 'vi' ? 'active' : ''}`}
              onClick={() => setActiveLang('vi')}
            >
              Tiếng Việt
            </button>
          </div>

          {/* Currency Pill */}
          <div className="live-builder-price-pill">
            {formData.prices?.KRW > 0 
              ? `KRW ₩${formData.prices.KRW?.toLocaleString()} / USD $${formData.prices.USD?.toLocaleString()} / VND ₫${formData.prices.VND?.toLocaleString()}`
              : '가격 미설정'
            }
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              취소
            </button>
            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
              }}
            >
              {loading ? '저장 중...' : '저장 및 반영'}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN EDITOR WORKSPACE CANVAS */}
      <main className="product-live-editor-body">
        
        {editorMode === 'visual' ? (
          /* VISUAL LIVE WYSIWYG CANVAS MODE */
          <div className="visual-canvas-container fade-in">
            
            {/* Top Info Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              color: '#1e40af',
              fontSize: '0.85rem'
            }}>
              <span><strong>라이브 비주얼 모드:</strong> 실제 고객 상품 상세 페이지와 동일한 화면입니다. 점선 테두리 항목을 직접 클릭해서 수정하세요.</span>
              <span style={{ fontWeight: 'bold' }}>현재 편집 언어: {activeLang === 'ko' ? '한국어' : activeLang === 'en' ? 'English' : 'Tiếng Việt'}</span>
            </div>

            {/* Alo Yoga 2-Column Main Layout */}
            <div className="alo-detail-layout">
              
              {/* LEFT COLUMN: Photo Gallery */}
              <div className="alo-detail-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                
                {/* Existing Photos */}
                {formData.imageUrls && formData.imageUrls.map((imgUrl, idx) => (
                  <div key={`existing-${idx}`} className="visual-image-card">
                    <img 
                      src={imgUrl} 
                      alt={`Gallery ${idx + 1}`} 
                      style={{ width: '100%', height: '320px', objectFit: 'cover', display: 'block' }} 
                    />
                    
                    {idx === 0 ? (
                      <span className="alo-model-tag" style={{ background: '#111111', color: '#fff', padding: '4px 10px', fontSize: '0.7rem' }}>
                        대표 이미지
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMakeMainImage(imgUrl)}
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '8px',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          cursor: 'pointer'
                        }}
                      >
                        대표 지정
                      </button>
                    )}

                    <div className="visual-image-overlay-toolbar">
                      <div className="visual-img-btn-group">
                        <button 
                          type="button" 
                          className="visual-img-action-btn" 
                          onClick={() => handleMoveExistingImage(idx, -1)}
                          disabled={idx === 0}
                          title="위로 이동"
                        >
                          위로
                        </button>
                        <button 
                          type="button" 
                          className="visual-img-action-btn" 
                          onClick={() => handleMoveExistingImage(idx, 1)}
                          disabled={idx === (formData.imageUrls.length - 1)}
                          title="아래로 이동"
                        >
                          아래로
                        </button>
                      </div>
                      
                      <button 
                        type="button" 
                        className="visual-img-action-btn danger" 
                        onClick={() => handleRemoveExistingImage(idx)}
                        title="사진 삭제"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}

                {/* Newly Picked Photos */}
                {previewUrls.map((url, idx) => {
                  const totalIdx = (formData.imageUrls?.length || 0) + idx;
                  return (
                    <div key={`new-${idx}`} className="visual-image-card" style={{ borderColor: '#0284c7' }}>
                      <img 
                        src={url} 
                        alt={`New ${idx + 1}`} 
                        style={{ width: '100%', height: '320px', objectFit: 'cover', display: 'block' }} 
                      />
                      <span className="alo-model-tag" style={{ background: '#0284c7', color: '#fff', padding: '4px 10px', fontSize: '0.7rem' }}>
                        신규 업로드 예정
                      </span>

                      <div className="visual-image-overlay-toolbar">
                        <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 'bold' }}>#{totalIdx + 1}</span>
                        <button 
                          type="button" 
                          className="visual-img-action-btn danger" 
                          onClick={() => handleRemoveNewImage(idx)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add Photo Dropzone Card */}
                {allPhotos.length < 8 && (
                  <label className="visual-add-photo-card">
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>+ 상품 사진 추가</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                      ({allPhotos.length} / 8장)
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      onChange={handleImageChange} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                )}

              </div>

              {/* RIGHT COLUMN: Specs & Options */}
              <div className="alo-detail-buy-panel">
                
                {/* Category & BEST SELLER Checkbox */}
                <div className="alo-detail-header-meta">
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backgroundColor: '#f1f5f9', padding: '3px 10px', borderRadius: '9999px', border: '1px solid #cbd5e1' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.isBestSeller || false} 
                        onChange={e => setFormData(prev => ({ ...prev, isBestSeller: e.target.checked }))} 
                        style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                      <span className="alo-badge-pill" style={{ opacity: formData.isBestSeller ? 1 : 0.4, margin: 0 }}>
                        BEST SELLER
                      </span>
                    </label>

                    <input
                      type="text"
                      value={currentLangData.category || ''}
                      onChange={e => handleChange(activeLang, 'category', e.target.value)}
                      placeholder="카테고리 (예: Apparel)"
                      className="visual-editable-field"
                      style={{
                        border: '1px dashed #cbd5e1',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#64748b'
                      }}
                    />
                  </div>

                  {/* Title Field */}
                  <div className="visual-editable-field" style={{ marginBottom: '1rem' }}>
                    <input
                      type="text"
                      value={currentLangData.name || ''}
                      onChange={e => handleChange(activeLang, 'name', e.target.value)}
                      placeholder={`상품명 입력 (${activeLang.toUpperCase()})`}
                      style={{
                        width: '100%',
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        border: 'none',
                        borderBottom: '2px solid #111111',
                        padding: '4px 0',
                        outline: 'none',
                        color: '#111111',
                        letterSpacing: '-0.02em'
                      }}
                    />
                  </div>

                  {/* Price & Currency Row */}
                  <div className="alo-detail-price-rating-row" style={{ marginTop: '1rem' }}>
                    <div className="visual-editable-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <select 
                        value={baseCurrency} 
                        onChange={handleCurrencyChange}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}
                      >
                        <option value="KRW">KRW (원)</option>
                        <option value="USD">USD ($)</option>
                        <option value="VND">VND (동)</option>
                      </select>

                      <input 
                        type="text" 
                        value={rawPrice} 
                        onChange={handlePriceChange} 
                        placeholder="가격 입력 (숫자만)" 
                        style={{
                          fontSize: '1.3rem',
                          fontWeight: 800,
                          width: '140px',
                          padding: '4px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px'
                        }}
                      />
                    </div>
                    <span className="alo-detail-rating">(182 Reviews)</span>
                  </div>
                </div>

                <div className="alo-detail-divider" />

                {/* Color Swatches Manager */}
                <div className="alo-detail-option-group" style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div className="alo-option-label" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <strong>Color Swatches ({formData.colorSwatches?.length || 0}):</strong>
                    <button 
                      type="button" 
                      onClick={handleAddColorSwatch}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      + 색상 추가
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {formData.colorSwatches && formData.colorSwatches.map((swatch, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <input 
                          type="color" 
                          value={swatch.colorHex || '#111111'} 
                          onChange={e => handleColorSwatchChange(idx, 'colorHex', e.target.value)}
                          style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', background: 'none' }}
                          title="색상 칩 컬러 지정"
                        />
                        <input 
                          type="text" 
                          value={swatch.name || ''} 
                          onChange={e => handleColorSwatchChange(idx, 'name', e.target.value)}
                          placeholder="색상명"
                          style={{ width: '90px', padding: '4px 6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                        <select 
                          value={swatch.imageUrl || ''} 
                          onChange={e => handleColorSwatchChange(idx, 'imageUrl', e.target.value)}
                          style={{ flex: 1, padding: '4px 6px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        >
                          <option value="">-- 연결 사진 선택 --</option>
                          {allPhotos.map((url, pIdx) => (
                            <option key={pIdx} value={url}>사진 #{pIdx + 1}</option>
                          ))}
                        </select>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveColorSwatch(idx)}
                          style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer' }}
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fit Note Box Editable */}
                <div className="alo-fit-note-box visual-editable-field">
                  <strong>Fit Note:</strong>
                  <input
                    type="text"
                    value={currentLangData.sizeGuide || ''}
                    onChange={e => handleChange(activeLang, 'sizeGuide', e.target.value)}
                    placeholder="핏 안내 예: Designed for a relaxed oversized fit"
                    style={{ width: '100%', border: 'none', background: 'transparent', marginTop: '4px', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                {/* Size Options Selector (Without Stock Counters) */}
                <div className="alo-detail-option-group" style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div className="alo-option-label" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span><strong>Size Options ({formData.options?.length || 0}):</strong></span>
                    <button 
                      type="button" 
                      onClick={handleAddOption}
                      style={{ padding: '4px 10px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      + 사이즈 추가
                    </button>
                  </div>
                  
                  <div className="alo-size-pill-grid">
                    {formData.options && formData.options.map((sz, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="alo-size-pill-btn selected"
                          style={{ padding: '6px 14px', cursor: 'default' }}
                        >
                          {sz.name || sz}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="사이즈 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping & Return Perks Editable Box (Capture 2) */}
                <div className="alo-shipping-perks visual-editable-field" style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    배송 및 혜택 안내 문구 (Capture 2 영역 - {activeLang.toUpperCase()}):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem' }}>✓</span>
                    <input 
                      type="text"
                      value={currentLangData.perk1 ?? defaultPerk1}
                      onChange={e => handleChange(activeLang, 'perk1', e.target.value)}
                      placeholder="혜택 문구 1 (예: Complimentary Shipping Over ₩50,000 & Free Returns)"
                      style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem' }}>✓</span>
                    <input 
                      type="text"
                      value={currentLangData.perk2 ?? defaultPerk2}
                      onChange={e => handleChange(activeLang, 'perk2', e.target.value)}
                      placeholder="혜택 문구 2 (예: Premium Organic Cotton Blend)"
                      style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                {/* Video Upload & Youtube Media Card */}
                <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#1e293b', display: 'block', marginBottom: '0.5rem' }}>
                    동영상 관리 (MP4 또는 유튜브)
                  </strong>
                  
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: '4px' }}>직접 MP4 파일 업로드 (20MB 이하):</label>
                    <input type="file" accept="video/mp4,video/quicktime" onChange={handleVideoChange} style={{ fontSize: '0.8rem', width: '100%' }} />
                  </div>

                  {(videoPreviewUrl || formData.videoUrl) && (
                    <div style={{ position: 'relative', display: 'inline-block', marginTop: '0.5rem' }}>
                      <video 
                        src={videoPreviewUrl || formData.videoUrl} 
                        style={{ width: '140px', height: '100px', objectFit: 'cover', borderRadius: '4px', backgroundColor: 'black' }} 
                        controls 
                      />
                      <button 
                        type="button" 
                        onClick={handleRemoveVideo}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.78rem', color: '#475569', display: 'block', marginBottom: '4px' }}>유튜브 영상 URL:</label>
                    <input 
                      type="text" 
                      placeholder="https://youtube.com/watch?v=..."
                      value={formData.youtubeUrl || ''} 
                      onChange={e => handleChange(null, 'youtubeUrl', e.target.value)} 
                      style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* BOTTOM TABS & RICH TEXT DETAILS WYSIWYG EDITOR */}
            <div style={{ marginTop: '4rem', borderTop: '2px solid #E5E5E5', paddingTop: '2.5rem' }}>
              
              <div className="detail-tabs-container">
                <button 
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`detail-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                >
                  상품 상세정보 (Live WYSIWYG)
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className={`detail-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
                >
                  고객 리뷰 (182)
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('qna')}
                  className={`detail-tab-btn ${activeTab === 'qna' ? 'active' : ''}`}
                >
                  Q&A 문의
                </button>
              </div>

              <div style={{ padding: '1.5rem 0' }}>
                {activeTab === 'details' && (
                  <div className="detail-tab-content fade-in">
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>
                      PRODUCT DETAILS & FABRIC ({activeLang.toUpperCase()})
                    </h3>
                    
                    {/* Fabric Info Editable Box */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        원단 / 소재 정보 ({activeLang.toUpperCase()}):
                      </label>
                      <textarea
                        value={currentLangData.fabric || ''}
                        onChange={e => handleChange(activeLang, 'fabric', e.target.value)}
                        placeholder="예: Premium Organic Cotton Blend 88%, Spandex 12%"
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '8px 12px',
                          fontSize: '0.9rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    {/* Quill Embedded Rich Text Visual Editor */}
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        상세페이지 본문 에디터:
                      </label>
                      
                      <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '300px' }}>
                        {activeLang === 'ko' && (
                          <ReactQuill 
                            ref={quillRefKo} 
                            theme="snow" 
                            modules={modulesKo} 
                            value={formData.ko?.description || ''} 
                            onChange={val => handleChange('ko', 'description', val)} 
                            placeholder="한국어 상세페이지 내용을 작성하세요." 
                          />
                        )}
                        {activeLang === 'en' && (
                          <ReactQuill 
                            ref={quillRefEn} 
                            theme="snow" 
                            modules={modulesEn} 
                            value={formData.en?.description || ''} 
                            onChange={val => handleChange('en', 'description', val)} 
                            placeholder="Write English detailed description here..." 
                          />
                        )}
                        {activeLang === 'vi' && (
                          <ReactQuill 
                            ref={quillRefVi} 
                            theme="snow" 
                            modules={modulesVi} 
                            value={formData.vi?.description || ''} 
                            onChange={val => handleChange('vi', 'description', val)} 
                            placeholder="Viết mô tả chi tiết bằng tiếng Việt..." 
                          />
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div style={{ padding: '2rem', textTransform: 'uppercase', textAlign: 'center', color: '#94a3b8' }}>
                    고객 리뷰 미리보기
                  </div>
                )}

                {activeTab === 'qna' && (
                  <div style={{ padding: '2rem', textTransform: 'uppercase', textAlign: 'center', color: '#94a3b8' }}>
                    Q&A 문의 미리보기
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : (
          /* FORM MODE */
          <div className="admin-modal-content fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#0f172a' }}>전통적 폼 방식 데이터 입력</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.isBestSeller || false} 
                    onChange={e => setFormData(prev => ({ ...prev, isBestSeller: e.target.checked }))} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>BEST SELLER 설정</span>
                </label>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>기본 가격</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select value={baseCurrency} onChange={handleCurrencyChange} style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                    <option value="KRW">KRW (원)</option>
                    <option value="USD">USD (달러)</option>
                    <option value="VND">VND (동)</option>
                  </select>
                  <input value={rawPrice} onChange={handlePriceChange} placeholder="가격 (숫자만)" style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                </div>
              </div>

              {/* Korean Form */}
              <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <h4 style={{ color: '#2563eb', margin: '0 0 0.75rem 0' }}>한국어 데이터</h4>
                <input placeholder="상품명" value={formData.ko.name} onChange={e => handleChange('ko', 'name', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
                <input placeholder="카테고리" value={formData.ko.category} onChange={e => handleChange('ko', 'category', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
                <textarea placeholder="원단 정보" value={formData.ko.fabric} onChange={e => handleChange('ko', 'fabric', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', minHeight: '60px' }} />
                <input placeholder="혜택 안내 1" value={formData.ko.perk1} onChange={e => handleChange('ko', 'perk1', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
                <input placeholder="혜택 안내 2" value={formData.ko.perk2} onChange={e => handleChange('ko', 'perk2', e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
              </div>

              {/* English Form */}
              <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <h4 style={{ color: '#16a34a', margin: '0 0 0.75rem 0' }}>English Data</h4>
                <input placeholder="Product Name" value={formData.en.name} onChange={e => handleChange('en', 'name', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
                <input placeholder="Category" value={formData.en.category} onChange={e => handleChange('en', 'category', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
                <textarea placeholder="Fabric Info" value={formData.en.fabric} onChange={e => handleChange('en', 'fabric', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', minHeight: '60px' }} />
                <input placeholder="Perk 1" value={formData.en.perk1} onChange={e => handleChange('en', 'perk1', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
                <input placeholder="Perk 2" value={formData.en.perk2} onChange={e => handleChange('en', 'perk2', e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
              </div>

              {/* Vietnamese Form */}
              <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <h4 style={{ color: '#dc2626', margin: '0 0 0.75rem 0' }}>Dữ liệu tiếng Việt</h4>
                <input placeholder="Tên sản phẩm" value={formData.vi.name} onChange={e => handleChange('vi', 'name', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
                <input placeholder="Thể loại" value={formData.vi.category} onChange={e => handleChange('vi', 'category', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
                <textarea placeholder="Thông tin vải" value={formData.vi.fabric} onChange={e => handleChange('vi', 'fabric', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', minHeight: '60px' }} />
                <input placeholder="Quyền lợi 1" value={formData.vi.perk1} onChange={e => handleChange('vi', 'perk1', e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
                <input placeholder="Quyền lợi 2" value={formData.vi.perk2} onChange={e => handleChange('vi', 'perk2', e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
