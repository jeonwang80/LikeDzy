import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import './HeroSection.css';

export default function HeroSection() {
  const { t } = useLanguage();
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });

  const [heroImageUrls, setHeroImageUrls] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroTitle, setHeroTitle] = useState('');
  const [heroTitleSize, setHeroTitleSize] = useState('md');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroSubtitleSize, setHeroSubtitleSize] = useState('md');

  // Firestore에서 메인 배너 이미지 및 텍스트 설정 실시간 구독 (onSnapshot)
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'main'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          let urls = [];
          if (data.heroImageUrls && Array.isArray(data.heroImageUrls) && data.heroImageUrls.length > 0) {
            urls = data.heroImageUrls.filter(url => url && typeof url === 'string');
          } else if (data.heroImageUrl && typeof data.heroImageUrl === 'string') {
            urls = [data.heroImageUrl];
          }

          setHeroImageUrls(urls);
          if (data.heroTitle !== undefined) setHeroTitle(String(data.heroTitle).trim());
          if (data.heroTitleSize) setHeroTitleSize(data.heroTitleSize);
          if (data.heroSubtitle !== undefined) setHeroSubtitle(String(data.heroSubtitle).trim());
          if (data.heroSubtitleSize) setHeroSubtitleSize(data.heroSubtitleSize);
        }
      },
      (error) => {
        console.error("Error listening to hero settings:", error);
      }
    );

    return () => unsub();
  }, []);

  // 배너 이미지가 여러 장일 경우 자동 슬라이드 (4초 간격)
  useEffect(() => {
    if (heroImageUrls.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImageUrls.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImageUrls.length]);

  // 🩶 이미지 미등록 시 사용될 모노톤 회색 심플 & 모던 키네틱 캔버스 엔진
  useEffect(() => {
    if (heroImageUrls.length > 0) return; // 이미지 등록 시 캔버스 미실행
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 300);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 240);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseRef.current.targetX = x;
      mouseRef.current.targetY = y;
    };
    canvas.parentElement?.addEventListener('mousemove', handleMouseMove);

    let angle = 0;

    const nodes = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (-0.3 + Math.random() * 0.6),
      vy: (-0.3 + Math.random() * 0.6),
      r: 1.5 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.5
    }));

    const drawMonochromeDaisyOutline = (cx, cy, scale, rot, alpha = 1) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(scale, scale);

      const petalCount = 16;
      const innerR = 20;
      const petalL = 48;
      const petalW = 12;

      ctx.strokeStyle = `rgba(209, 213, 219, ${0.55 * alpha})`;
      ctx.lineWidth = 1.2;

      for (let i = 0; i < petalCount; i++) {
        const a = (i / petalCount) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, innerR + petalL * 0.5, petalW * 0.5, petalL * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(0, 0, innerR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(243, 244, 246, ${0.9 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, innerR * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(156, 163, 175, ${0.6 * alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };

    const render = () => {
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#111215');
      bgGrad.addColorStop(0.5, '#18191e');
      bgGrad.addColorStop(1, '#0f1013');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      const gSize = 60;
      for (let x = 0; x < width; x += gSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      angle += 0.005;

      const centerX = width * 0.5 + (mouseRef.current.x - 0.5) * 70;
      const centerY = height * 0.5 + (mouseRef.current.y - 0.5) * 35;

      ctx.save();
      ctx.translate(centerX, centerY);

      [130, 200, 270, 340].forEach((r, idx) => {
        ctx.save();
        ctx.rotate(angle * (idx % 2 === 0 ? 0.35 : -0.25));
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.42, Math.PI / 8, 0, Math.PI * 2);
        ctx.strokeStyle = idx % 2 === 0 ? 'rgba(209, 213, 219, 0.15)' : 'rgba(156, 163, 175, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();

      nodes.forEach((n, i) => {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(229, 231, 235, ${n.alpha * 0.6})`;
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dist = Math.hypot(n.x - n2.x, n.y - n2.y);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(156, 163, 175, ${0.15 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      });

      const miniOrbitR = [150, 240, 310];
      miniOrbitR.forEach((r, idx) => {
        const a = angle * (idx % 2 === 0 ? 0.8 : -0.6) + (idx * Math.PI * 0.6);
        const mx = centerX + Math.cos(a) * r;
        const my = centerY + Math.sin(a) * (r * 0.42);
        drawMonochromeDaisyOutline(mx, my, 0.35 - idx * 0.05, a * 1.5, 0.6);
      });

      const mainScale = Math.min(width, height) * 0.0036;
      drawMonochromeDaisyOutline(centerX, centerY, Math.max(0.65, Math.min(mainScale, 1.1)), angle, 0.95);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (canvas.parentElement) {
        canvas.parentElement.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [heroImageUrls.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImageUrls.length) % heroImageUrls.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImageUrls.length);
  };

  // 표시할 제목 및 서브타이틀
  const displayTitle = heroTitle || t('hero.title');
  const displaySubtitle = heroSubtitle || t('hero.subtitle');

  return (
    <section className="hero-section-wide">
      {/* 이미지 존재 시 이미지 슬라이더, 없을 시 모노톤 키네틱 캔버스 */}
      <div className={`hero-wide-banner ${heroImageUrls.length === 0 ? 'empty-banner monochrome-hero' : 'has-images'}`}>
        {heroImageUrls.length > 0 ? (
          <div className="hero-slider-container">
            {heroImageUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Hero banner ${index + 1}`}
                className={`hero-slide-img ${index === currentSlide ? 'active' : ''}`}
              />
            ))}

            {/* 슬라이드 2개 이상 시 컨트롤 화살표 및 인디케이터 */}
            {heroImageUrls.length > 1 && (
              <>
                <button className="hero-slider-arrow prev" onClick={handlePrevSlide} aria-label="Previous Slide">
                  ❮
                </button>
                <button className="hero-slider-arrow next" onClick={handleNextSlide} aria-label="Next Slide">
                  ❯
                </button>
                <div className="hero-slider-dots">
                  {heroImageUrls.map((_, index) => (
                    <span
                      key={index}
                      className={`hero-dot ${index === currentSlide ? 'active' : ''}`}
                      onClick={() => setCurrentSlide(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <canvas ref={canvasRef} className="hero-geometric-canvas" />
        )}
      </div>

      {/* 히어로 타이틀 문구 (어드민 설정 텍스트 동적 적용) */}
      <div className="hero-content-area">
        <p className="hero-eyebrow">LIKEDZY / TECHNICAL OUTDOOR 2026</p>
        <h1 className={`hero-title size-${heroTitleSize}`}>
          {displayTitle}
        </h1>
        <p className={`hero-subtitle size-${heroSubtitleSize}`}>
          {displaySubtitle}
        </p>
      </div>
    </section>
  );
}


