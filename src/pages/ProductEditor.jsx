import React, { useState, useRef, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import imageCompression from 'browser-image-compression';
import { db, storage } from '../firebase';
import { formatCategoryPath, useCategoryMasters } from '../hooks/useCategoryMasters';
import '../admin.css';
import '../components/CollectionList.css';

const LEGACY_CATEGORY_OPTIONS = ['TOPS', 'BOTTOMS', 'OUTERWEAR', 'ACC'];

export default function ProductEditor({ product, onClose, onSaved }) {
  const { categories: categoryMasters, loading: categoryMastersLoading } = useCategoryMasters({ activeOnly: true });
  const [loading, setLoading] = useState(false);
  const [editorMode, setEditorMode] = useState('form'); // 'visual' | 'form'
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
  const defaultPerk2 = 'Weather-ready performance fabric';

  const [formData, setFormData] = useState(() => {
    if (product) {
      return {
        ...product,
        isBestSeller: product.isBestSeller !== undefined ? product.isBestSeller : false,
        isFeatured: product.isFeatured !== undefined ? product.isFeatured : false,
        isNew: product.isNew !== undefined ? product.isNew : false,
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
      isFeatured: false,
      isNew: false,
      price: '',
      youtubeUrl: '',
      videoUrl: '',
      ko: { name: '', category: '', description: '', fabric: '', sizeGuide: '', perk1: defaultPerk1, perk2: defaultPerk2 },
      en: { name: '', category: '', description: '', fabric: '', sizeGuide: '', perk1: defaultPerk1, perk2: defaultPerk2 },
      vi: { name: '', category: '', description: '', fabric: '', sizeGuide: '', perk1: defaultPerk1, perk2: defaultPerk2 },
      imageUrls: [],
      colorSwatches: [
        { name: 'Black', colorHex: '#111111', imageUrl: '', hoverImageUrl: '', imageUrls: [] }
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

  const handleAddColorSwatch = () => {
    setFormData(prev => ({
      ...prev,
      colorSwatches: [
        ...(prev.colorSwatches || []),
        { 
          name: 'New Color', 
          colorHex: '#111111', 
          imageUrl: '', 
          hoverImageUrl: '',
          imageUrls: [] 
        }
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

  // Set Photo Color Swatch Mapping
  const handleSetPhotoColor = (imgUrl, targetColorName) => {
    setFormData(prev => {
      const updatedSwatches = (prev.colorSwatches || []).map(swatch => {
        const currentGroup = swatch.imageUrls || [];
        if (swatch.name === targetColorName) {
          const newGroup = currentGroup.includes(imgUrl) ? currentGroup : [...currentGroup, imgUrl];
          const newPrimary = swatch.imageUrl || imgUrl;
          return { ...swatch, imageUrl: newPrimary, imageUrls: newGroup };
        } else {
          const newGroup = currentGroup.filter(u => u !== imgUrl);
          const newPrimary = swatch.imageUrl === imgUrl ? '' : swatch.imageUrl;
          const newHover = swatch.hoverImageUrl === imgUrl ? '' : swatch.hoverImageUrl;
          return { ...swatch, imageUrl: newPrimary, hoverImageUrl: newHover, imageUrls: newGroup };
        }
      });
      return { ...prev, colorSwatches: updatedSwatches };
    });
  };

  // Set Photo Role for a Color: 'primary' (대표 1), 'hover' (대표 2), or 'none' (일반)
  const handleSetPhotoRole = (imgUrl, colorName, newRole) => {
    setFormData(prev => {
      let updatedSwatches = (prev.colorSwatches || []).map(swatch => {
        if (swatch.name === colorName) {
          const groupImages = swatch.imageUrls || [];
          const newGroup = groupImages.includes(imgUrl) ? groupImages : [...groupImages, imgUrl];
          
          let newPrimary = swatch.imageUrl;
          let newHover = swatch.hoverImageUrl;

          if (newRole === 'primary') {
            if (newHover === imgUrl) newHover = '';
            newPrimary = imgUrl;
          } else if (newRole === 'hover') {
            if (newPrimary === imgUrl) newPrimary = '';
            newHover = imgUrl;
          } else {
            if (newPrimary === imgUrl) newPrimary = '';
            if (newHover === imgUrl) newHover = '';
          }

          return { ...swatch, imageUrl: newPrimary, hoverImageUrl: newHover, imageUrls: newGroup };
        } else {
          // Remove imgUrl from other color swatches if assigned elsewhere
          const newGroup = (swatch.imageUrls || []).filter(u => u !== imgUrl);
          const newPrimary = swatch.imageUrl === imgUrl ? '' : swatch.imageUrl;
          const newHover = swatch.hoverImageUrl === imgUrl ? '' : swatch.hoverImageUrl;
          return { ...swatch, imageUrl: newPrimary, hoverImageUrl: newHover, imageUrls: newGroup };
        }
      });

      return {
        ...prev,
        colorSwatches: updatedSwatches
      };
    });
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

      const processedSwatches = (formData.colorSwatches || []).map((swatch, sIdx) => {
        let groupImgs = (swatch.imageUrls || []).filter(url => finalImageUrls.includes(url));
        
        if (swatch.imageUrl && !groupImgs.includes(swatch.imageUrl)) {
          groupImgs.unshift(swatch.imageUrl);
        }
        if (swatch.hoverImageUrl && !groupImgs.includes(swatch.hoverImageUrl)) {
          groupImgs.push(swatch.hoverImageUrl);
        }

        // If a color swatch still has no images assigned, default to fallback photo by index
        if (groupImgs.length === 0 && finalImageUrls.length > 0) {
          const fallbackUrl = finalImageUrls[sIdx % finalImageUrls.length];
          groupImgs = [fallbackUrl];
        }

        const primaryImg = swatch.imageUrl || groupImgs[0] || '';
        const hoverImg = swatch.hoverImageUrl || (groupImgs.length > 1 ? groupImgs[1] : primaryImg);

        return {
          ...swatch,
          imageUrl: primaryImg,
          hoverImageUrl: hoverImg,
          imageUrls: groupImgs
        };
      });

      const finalData = { 
        ...formData, 
        name,
        category,
        description,
        fabric,
        perk1,
        perk2,
        colorSwatches: processedSwatches,
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
  const categoryOptions = useMemo(() => {
    const masterOptions = categoryMasters.map((category) => ({
      value: category.code,
      label: `${category.code} · ${formatCategoryPath(category)}`,
      id: category.id,
      path: formatCategoryPath(category),
    }));
    const options = masterOptions.length > 0
      ? masterOptions
      : LEGACY_CATEGORY_OPTIONS.map((category) => ({ value: category, label: `${category} · 기존 분류` }));
    const currentCategory = currentLangData.category?.trim();
    if (currentCategory && !options.some((option) => option.value === currentCategory)) {
      return [{ value: currentCategory, label: `${currentCategory} · 기존 상품 분류` }, ...options];
    }
    return options;
  }, [categoryMasters, currentLangData.category]);

  const handleCategoryChange = (categoryCode) => {
    const selectedMaster = categoryMasters.find((category) => category.code === categoryCode);
    setFormData((previous) => ({
      ...previous,
      category: categoryCode,
      categoryMasterId: selectedMaster?.id || '',
      categoryPath: selectedMaster ? formatCategoryPath(selectedMaster) : '',
      ko: { ...previous.ko, category: categoryCode },
      en: { ...previous.en, category: categoryCode },
      vi: { ...previous.vi, category: categoryCode },
    }));
  };
  const allPhotos = [...(formData.imageUrls || []), ...previewUrls];
  const registrationChecks = [
    { label: '상품명', complete: Boolean(formData.ko?.name?.trim()) },
    { label: '카테고리', complete: Boolean(formData.ko?.category?.trim()) },
    { label: '가격', complete: Number(formData.prices?.KRW || 0) > 0 },
    { label: '상품 이미지', complete: allPhotos.length > 0 },
  ];
  const completedCheckCount = registrationChecks.filter((item) => item.complete).length;

  return (
    <div className="product-live-editor-overlay fade-in">
      
      {/* 1. TOP STICKY BUILDER HEADER CONTROL BAR */}
      <header className="live-builder-header">
        <div className="live-builder-title">
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {product ? `상품 편집 · ${formData.ko?.name || '이름 없음'}` : '새 상품 등록'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              필수 정보 {completedCheckCount}/4 완료 · 저장 전 이미지와 가격을 확인하세요
            </div>
          </div>
        </div>

        <div className="live-builder-controls">
          {/* Mode Switcher */}
          <div className="live-builder-mode-switcher">
            <button 
              type="button" 
              className={`live-builder-mode-btn ${editorMode === 'form' ? 'active' : ''}`}
              onClick={() => setEditorMode('form')}
            >
              빠른 등록
            </button>
            <button 
              type="button" 
              className={`live-builder-mode-btn ${editorMode === 'visual' ? 'active' : ''}`}
              onClick={() => setEditorMode('visual')}
            >
              스토어 미리보기
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
              className="admin-btn-secondary"
            >
              취소
            </button>
            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={loading}
              className="admin-btn-primary"
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
              <span><strong>색상별 이미지 그룹핑 모드:</strong> 각 사진 카드 하단에서 [적용 색상]을 선택하고, 색상별 [대표 1(기본)], [대표 2(호버)]를 지정하세요.</span>
              <span style={{ fontWeight: 'bold' }}>현재 편집 언어: {activeLang === 'ko' ? '한국어' : activeLang === 'en' ? 'English' : 'Tiếng Việt'}</span>
            </div>

            {/* Alo Yoga 2-Column Main Layout */}
            <div className="alo-detail-layout">
              
              {/* LEFT COLUMN: Photo Gallery With Image Combobox Controls */}
              <div className="alo-detail-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                
                {/* Existing Photos */}
                {formData.imageUrls && formData.imageUrls.map((imgUrl, idx) => {
                  const primarySwatch = (formData.colorSwatches || []).find(s => s.imageUrl === imgUrl);
                  const hoverSwatch = (formData.colorSwatches || []).find(s => s.hoverImageUrl === imgUrl);
                  const groupSwatch = (formData.colorSwatches || []).find(s => s.imageUrls && s.imageUrls.includes(imgUrl));
                  
                  const activeSwatchName = primarySwatch?.name || hoverSwatch?.name || groupSwatch?.name || (formData.colorSwatches?.[0]?.name || '');
                  const isPrimary = !!primarySwatch;
                  const isHover = !!hoverSwatch;
                  const currentRoleValue = isPrimary ? 'primary' : isHover ? 'hover' : 'none';

                  return (
                    <div key={`existing-${idx}`} className="visual-image-card" style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '10px', overflow: 'hidden', border: isPrimary ? '2px solid #10b981' : isHover ? '2px solid #2563eb' : '1px solid #cbd5e1' }}>
                      
                      {/* Image Frame */}
                      <div style={{ position: 'relative', width: '100%', height: '300px' }}>
                        <img 
                          src={imgUrl} 
                          alt={`Gallery ${idx + 1}`} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                        />
                        
                        {/* Photo Sequence Number Tag */}
                        <span className="alo-model-tag" style={{ background: 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800 }}>
                          사진 #{idx + 1}
                        </span>

                        {/* Active Role Badge Overlay */}
                        {isPrimary && (
                          <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: '#10b981', color: '#fff', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                            {activeSwatchName} - 대표 1 (기본)
                          </span>
                        )}
                        {isHover && (
                          <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                            {activeSwatchName} - 대표 2 (호버)
                          </span>
                        )}

                        {/* Hover Overlay Toolbar for Reordering/Deletion */}
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

                      {/* COMBOBOX CONTROLS PANEL DIRECTLY ON PHOTO CARD */}
                      <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        
                        {/* Color Selector Combobox */}
                        {formData.colorSwatches && formData.colorSwatches.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', minWidth: '70px' }}>적용 색상:</span>
                            <select 
                              value={activeSwatchName} 
                              onChange={e => handleSetPhotoColor(imgUrl, e.target.value)}
                              style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff', fontWeight: 'bold' }}
                            >
                              {formData.colorSwatches.map((sw, sIdx) => (
                                <option key={sIdx} value={sw.name}>
                                  {sw.name || `컬러 #${sIdx+1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Role Combobox (대표 1 / 대표 2 / 일반) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#1e293b', minWidth: '70px' }}>대표 설정:</span>
                          <select 
                            value={currentRoleValue} 
                            onChange={e => handleSetPhotoRole(imgUrl, activeSwatchName, e.target.value)}
                            style={{ flex: 1, padding: '5px 8px', fontSize: '0.825rem', border: isPrimary ? '2px solid #10b981' : isHover ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff', fontWeight: 800, color: isPrimary ? '#059669' : isHover ? '#2563eb' : '#334155' }}
                          >
                            <option value="none">-- 일반 이미지 --</option>
                            <option value="primary">★ 대표 1 (처음 나오는 기본 이미지)</option>
                            <option value="hover">✨ 대표 2 (마우스 가져다대면 변경 이미지)</option>
                          </select>
                        </div>

                      </div>

                    </div>
                  );
                })}

                {/* Newly Picked Photos */}
                {previewUrls.map((url, idx) => {
                  const totalIdx = (formData.imageUrls?.length || 0) + idx;
                  const primarySwatch = (formData.colorSwatches || []).find(s => s.imageUrl === url);
                  const hoverSwatch = (formData.colorSwatches || []).find(s => s.hoverImageUrl === url);
                  const groupSwatch = (formData.colorSwatches || []).find(s => s.imageUrls && s.imageUrls.includes(url));
                  
                  const activeSwatchName = primarySwatch?.name || hoverSwatch?.name || groupSwatch?.name || (formData.colorSwatches?.[0]?.name || '');
                  const isPrimary = !!primarySwatch;
                  const isHover = !!hoverSwatch;
                  const currentRoleValue = isPrimary ? 'primary' : isHover ? 'hover' : 'none';

                  return (
                    <div key={`new-${idx}`} className="visual-image-card" style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '10px', overflow: 'hidden', border: '2px dashed #0284c7' }}>
                      <div style={{ position: 'relative', width: '100%', height: '300px' }}>
                        <img 
                          src={url} 
                          alt={`New ${idx + 1}`} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                        />
                        <span className="alo-model-tag" style={{ background: '#0284c7', color: '#fff', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800 }}>
                          사진 #{totalIdx + 1} (신규 대기)
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

                      {/* COMBOBOX CONTROLS PANEL FOR NEW PHOTOS */}
                      <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {formData.colorSwatches && formData.colorSwatches.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', minWidth: '70px' }}>적용 색상:</span>
                            <select 
                              value={activeSwatchName} 
                              onChange={e => handleSetPhotoColor(url, e.target.value)}
                              style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff', fontWeight: 'bold' }}
                            >
                              {formData.colorSwatches.map((sw, sIdx) => (
                                <option key={sIdx} value={sw.name}>{sw.name || `컬러 #${sIdx+1}`}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#1e293b', minWidth: '70px' }}>대표 설정:</span>
                          <select 
                            value={currentRoleValue} 
                            onChange={e => handleSetPhotoRole(url, activeSwatchName, e.target.value)}
                            style={{ flex: 1, padding: '5px 8px', fontSize: '0.825rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff', fontWeight: 800 }}
                          >
                            <option value="none">-- 일반 이미지 --</option>
                            <option value="primary">★ 대표 1 (처음 나오는 기본 이미지)</option>
                            <option value="hover">✨ 대표 2 (마우스 가져다대면 변경 이미지)</option>
                          </select>
                        </div>
                      </div>

                    </div>
                  );
                })}

                {/* Add Photo Dropzone Card */}
                {allPhotos.length < 8 && (
                  <label className="visual-add-photo-card" style={{ minHeight: '380px' }}>
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

              {/* RIGHT COLUMN: Specs & Simple Color Swatches */}
              <div className="alo-detail-buy-panel">
                
                {/* Storefront visibility and badge controls */}
                <div className="alo-detail-header-meta">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backgroundColor: '#ecfdf5', padding: '3px 10px', borderRadius: '9999px', border: '1px solid #a7f3d0', fontSize: '0.68rem', fontWeight: 800 }}>
                      <input
                        type="checkbox"
                        checked={formData.isFeatured || false}
                        onChange={e => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                      />
                      MAIN FEATURED
                    </label>
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

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backgroundColor: '#fff7ed', padding: '3px 10px', borderRadius: '9999px', border: '1px solid #fed7aa', fontSize: '0.68rem', fontWeight: 800 }}>
                      <input
                        type="checkbox"
                        checked={formData.isNew || false}
                        onChange={e => setFormData(prev => ({ ...prev, isNew: e.target.checked }))}
                      />
                      NEW
                    </label>

                    <select
                      value={currentLangData.category || ''}
                      onChange={(event) => handleCategoryChange(event.target.value)}
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
                    >
                      <option value="">{categoryMastersLoading ? '카테고리 불러오는 중...' : '카테고리 선택'}</option>
                      {categoryOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                    </select>
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

                {/* Clean Simple Color Swatches List */}
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
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
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
                          placeholder="색상명 (예: Black)"
                          style={{ flex: 1, padding: '4px 8px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }}
                        />
                        <button 
                          type="button" 
                          onClick={() => handleRemoveColorSwatch(idx)}
                          style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}
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

                {/* Size Options Selector */}
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

                {/* Shipping & Return Perks Editable Box */}
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
          <div className="admin-product-form fade-in">
            <div className="admin-registration-progress">
              <div>
                <span>REGISTRATION STATUS</span>
                <strong>{completedCheckCount}/4 필수 정보 완료</strong>
              </div>
              <div className="admin-registration-checks">
                {registrationChecks.map((item) => (
                  <span className={item.complete ? 'complete' : ''} key={item.label}>
                    {item.complete ? '✓' : '·'} {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="admin-product-form-grid">
              <div className="admin-product-form-main">
                <section className="admin-form-section">
                  <header><span>01</span><div><h3>기본 정보</h3><p>상품명, 카테고리와 판매 가격을 설정합니다.</p></div></header>
                  <div className="admin-form-field-grid">
                    <label className="admin-form-field span-2">
                      <span>상품명 ({activeLang === 'ko' ? '한국어' : activeLang === 'en' ? 'English' : 'Tiếng Việt'})</span>
                      <input className="admin-input" value={currentLangData.name || ''} onChange={(event) => handleChange(activeLang, 'name', event.target.value)} placeholder="상품명을 입력하세요" />
                    </label>
                    <label className="admin-form-field">
                      <span>카테고리</span>
                      <select className="admin-select" value={currentLangData.category || ''} onChange={(event) => handleCategoryChange(event.target.value)}>
                        <option value="">{categoryMastersLoading ? '카테고리 불러오는 중...' : '기준정보 카테고리 선택'}</option>
                        {categoryOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                      </select>
                      <small>06 기준정보에서 사용 중인 카테고리가 표시됩니다.</small>
                    </label>
                    <label className="admin-form-field">
                      <span>기준 통화</span>
                      <select className="admin-select" value={baseCurrency} onChange={handleCurrencyChange}>
                        <option value="KRW">KRW (원)</option>
                        <option value="USD">USD (달러)</option>
                        <option value="VND">VND (동)</option>
                      </select>
                    </label>
                    <label className="admin-form-field span-2">
                      <span>판매 가격</span>
                      <input className="admin-input admin-price-input" value={rawPrice} onChange={handlePriceChange} inputMode="decimal" placeholder="숫자만 입력" />
                      <small>KRW ₩{formData.prices?.KRW?.toLocaleString() || 0} · USD ${formData.prices?.USD?.toLocaleString() || 0} · VND ₫{formData.prices?.VND?.toLocaleString() || 0}</small>
                    </label>
                  </div>
                </section>

                <section className="admin-form-section">
                  <header><span>02</span><div><h3>상품 설명</h3><p>선택한 언어의 소재와 상세 내용을 입력합니다.</p></div></header>
                  <div className="admin-form-field-grid">
                    <label className="admin-form-field span-2">
                      <span>소재 및 기능 요약</span>
                      <textarea className="admin-textarea" value={currentLangData.fabric || ''} onChange={(event) => handleChange(activeLang, 'fabric', event.target.value)} placeholder="소재, 기능성, 착용감을 간단히 입력하세요" />
                    </label>
                    <label className="admin-form-field span-2">
                      <span>사이즈 안내</span>
                      <input className="admin-input" value={currentLangData.sizeGuide || ''} onChange={(event) => handleChange(activeLang, 'sizeGuide', event.target.value)} placeholder="예: REGULAR FIT / 정사이즈 권장" />
                    </label>
                    <label className="admin-form-field span-2">
                      <span>혜택 안내 1</span>
                      <input className="admin-input" value={currentLangData.perk1 || ''} onChange={(event) => handleChange(activeLang, 'perk1', event.target.value)} />
                    </label>
                    <label className="admin-form-field span-2">
                      <span>혜택 안내 2</span>
                      <input className="admin-input" value={currentLangData.perk2 || ''} onChange={(event) => handleChange(activeLang, 'perk2', event.target.value)} />
                    </label>
                    <div className="admin-form-field span-2">
                      <span>상세 설명</span>
                      {activeLang === 'ko' && <ReactQuill ref={quillRefKo} theme="snow" modules={modulesKo} value={formData.ko?.description || ''} onChange={(value) => handleChange('ko', 'description', value)} />}
                      {activeLang === 'en' && <ReactQuill ref={quillRefEn} theme="snow" modules={modulesEn} value={formData.en?.description || ''} onChange={(value) => handleChange('en', 'description', value)} />}
                      {activeLang === 'vi' && <ReactQuill ref={quillRefVi} theme="snow" modules={modulesVi} value={formData.vi?.description || ''} onChange={(value) => handleChange('vi', 'description', value)} />}
                    </div>
                  </div>
                </section>
              </div>

              <aside className="admin-product-form-side">
                <section className="admin-form-section">
                  <header><span>03</span><div><h3>상품 이미지</h3><p>첫 이미지가 대표로 노출됩니다.</p></div></header>
                  <div className="admin-quick-image-grid">
                    {allPhotos.map((imageUrl, index) => {
                      const existingLength = formData.imageUrls?.length || 0;
                      const isExisting = index < existingLength;
                      return (
                        <div key={`${imageUrl}-${index}`}>
                          <img src={imageUrl} alt="" />
                          {index === 0 && <span>대표</span>}
                          <button type="button" onClick={() => isExisting ? handleRemoveExistingImage(index) : handleRemoveNewImage(index - existingLength)} aria-label="이미지 삭제">×</button>
                        </div>
                      );
                    })}
                    {allPhotos.length < 8 && (
                      <label className="admin-quick-image-upload">
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} />
                        <strong>+</strong><span>이미지 추가</span><small>{allPhotos.length}/8</small>
                      </label>
                    )}
                  </div>
                  <button type="button" className="admin-inline-link" onClick={() => setEditorMode('visual')}>색상별 대표·호버 이미지 세부 설정 →</button>
                </section>

                <section className="admin-form-section">
                  <header><span>04</span><div><h3>스토어 노출</h3><p>메인과 상품 카드의 배지를 설정합니다.</p></div></header>
                  <div className="admin-switch-list">
                    <label><span><strong>메인 추천</strong><small>메인 셀렉션 우선 노출</small></span><input type="checkbox" checked={formData.isFeatured || false} onChange={(event) => setFormData((current) => ({ ...current, isFeatured: event.target.checked }))} /></label>
                    <label><span><strong>신상품</strong><small>NEW 배지 표시</small></span><input type="checkbox" checked={formData.isNew || false} onChange={(event) => setFormData((current) => ({ ...current, isNew: event.target.checked }))} /></label>
                    <label><span><strong>베스트셀러</strong><small>BEST SELLER 배지 표시</small></span><input type="checkbox" checked={formData.isBestSeller || false} onChange={(event) => setFormData((current) => ({ ...current, isBestSeller: event.target.checked }))} /></label>
                  </div>
                </section>

                <section className="admin-form-section">
                  <header><span>05</span><div><h3>색상·사이즈</h3><p>고객이 선택할 옵션을 관리합니다.</p></div></header>
                  <div className="admin-color-option-list">
                    {(formData.colorSwatches || []).map((swatch, index) => (
                      <div key={`${swatch.name}-${index}`}>
                        <input type="color" value={swatch.colorHex || '#111111'} onChange={(event) => handleColorSwatchChange(index, 'colorHex', event.target.value)} />
                        <input className="admin-input" value={swatch.name} onChange={(event) => handleColorSwatchChange(index, 'name', event.target.value)} />
                        <button type="button" onClick={() => handleRemoveColorSwatch(index)}>×</button>
                      </div>
                    ))}
                    <button type="button" className="admin-inline-link" onClick={handleAddColorSwatch}>+ 색상 추가</button>
                  </div>
                  <div className="admin-size-option-list">
                    {(formData.options || []).map((option, index) => (
                      <span key={`${option.name}-${index}`}>{option.name}<button type="button" onClick={() => handleRemoveOption(index)}>×</button></span>
                    ))}
                    <button type="button" onClick={handleAddOption}>+ 사이즈</button>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
