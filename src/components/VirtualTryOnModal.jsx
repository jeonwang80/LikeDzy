import React, { useState, useRef, useEffect } from 'react';
import { Client } from "@gradio/client";

export default function VirtualTryOnModal({ isOpen, onClose, productImageUrl, productName }) {
  const [step, setStep] = useState('UPLOAD'); // UPLOAD, PROCESSING, RESULT
  const [userImageFile, setUserImageFile] = useState(null);
  const [userImagePreview, setUserImagePreview] = useState('');
  const [resultImage, setResultImage] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  // 초기화
  useEffect(() => {
    if (isOpen) {
      setStep('UPLOAD');
      setUserImageFile(null);
      setUserImagePreview('');
      setResultImage('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUserImageFile(file);
      setUserImagePreview(URL.createObjectURL(file));
    }
  };

  const handleStartTryOn = async () => {
    if (!userImageFile || !productImageUrl) return;
    
    setStep('PROCESSING');
    setError('');
    setLoadingMessage('AI가 사진을 분석하고 있습니다...');

    try {
      // 1. 상품 이미지를 Blob으로 변환
      setLoadingMessage('상품 이미지를 불러오는 중입니다...');
      const garmResponse = await fetch(productImageUrl);
      if (!garmResponse.ok) throw new Error('상품 이미지를 불러오지 못했습니다.');
      const garmBlob = await garmResponse.blob();
      const garmFile = new File([garmBlob], "garment.jpg", { type: garmBlob.type });

      // 2. Gradio 클라이언트 연결 (yisol/IDM-VTON 공개 서버)
      setLoadingMessage('AI 서버(IDM-VTON)에 접속 중입니다...');
      const client = await Client.connect("yisol/IDM-VTON");

      setLoadingMessage('가상 피팅을 진행 중입니다. (접속자가 많을 경우 최대 1~2분 소요될 수 있습니다)');
      
      // 3. API 호출
      const result = await client.predict("/tryon", { 
        dict: { "background": userImageFile, "layers": [], "composite": null }, 
        garm_img: garmFile, 
        garment_des: productName || "clothes", 
        is_checked: true, 
        is_checked_crop: false, 
        denoise_steps: 30, 
        seed: 42, 
      });

      // result.data[0] 에 결과 이미지 URL이나 데이터가 들어있음
      if (result && result.data && result.data[0] && result.data[0].url) {
        setResultImage(result.data[0].url);
        setStep('RESULT');
      } else {
        throw new Error('결과 이미지를 받지 못했습니다.');
      }

    } catch (err) {
      console.error("TryOn Error:", err);
      setError(`서버 통신 오류: ${err.message || '알 수 없는 오류가 발생했습니다.'}`);
      setStep('UPLOAD'); // 에러 시 다시 업로드 화면으로
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '2rem'
    }}>
      <div style={{
        background: 'var(--card-bg)', width: '100%', maxWidth: '500px',
        borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
        display: 'flex', flexDirection: 'column'
      }}>
        
        {/* 헤더 */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>✨</span> AI 가상 피팅
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        {/* 바디 */}
        <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {step === 'UPLOAD' && (
            <>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>
                본인의 정면 전신 또는 상반신 사진을 업로드해주세요.<br/>
                AI가 체형과 얼굴을 인식하여 옷을 자연스럽게 합성합니다.
              </p>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', height: '250px', border: '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.2)', transition: 'all 0.2s',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                {userImagePreview ? (
                  <img src={userImagePreview} alt="user" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📸</div>
                    <div style={{ fontWeight: 'bold' }}>클릭하여 사진 업로드</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>(JPG, PNG 지원)</div>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </div>

              <button 
                onClick={handleStartTryOn}
                disabled={!userImageFile}
                style={{
                  width: '100%', padding: '1rem', marginTop: '2rem',
                  background: userImageFile ? 'linear-gradient(45deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                  color: userImageFile ? 'white' : 'var(--text-muted)',
                  border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem',
                  cursor: userImageFile ? 'pointer' : 'not-allowed', transition: 'all 0.3s'
                }}
              >
                입어보기 시작!
              </button>
            </>
          )}

          {step === 'PROCESSING' && (
            <div style={{ textAlign: 'center', padding: '3rem 0', width: '100%' }}>
              <div className="tryon-spinner" style={{ margin: '0 auto 2rem auto' }}></div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#8b5cf6' }}>합성 중...</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {loadingMessage}
              </p>
            </div>
          )}

          {step === 'RESULT' && (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{
                width: '100%', height: '400px', backgroundColor: 'black', borderRadius: '12px',
                overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <img src={resultImage} alt="Try On Result" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              
              {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
              
              <button 
                onClick={onClose}
                style={{
                  width: '100%', padding: '1rem', background: 'white', color: 'black',
                  border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer'
                }}
              >
                멋지네요! 계속 쇼핑하기
              </button>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
