import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './HeroSection.css';

export default function HeroSection() {
  const { t } = useLanguage();
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });

  // 🩶 모노톤 회색 심플 & 모던 키네틱 캔버스 엔진
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight);

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
    canvas.parentElement.addEventListener('mousemove', handleMouseMove);

    let angle = 0;

    // 회색 파티클 노드 (Monochrome Kinetic Particles)
    const nodes = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (-0.3 + Math.random() * 0.6),
      vy: (-0.3 + Math.random() * 0.6),
      r: 1.5 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.5
    }));

    // 모노톤 기하학적 데이지 아웃라인 렌더링 함수
    const drawMonochromeDaisyOutline = (cx, cy, scale, rot, alpha = 1) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(scale, scale);

      const petalCount = 16;
      const innerR = 20;
      const petalL = 48;
      const petalW = 12;

      // 1. 꽃잎 아웃라인 (Silver & Slate Gray Lines)
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

      // 2. 중심 수술 아웃라인 링 (Double Ring)
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

    // 애니메이션 렌더링 루프
    const render = () => {
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // 모던 차콜 회색 모노톤 배경 그라데이션
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#111215');
      bgGrad.addColorStop(0.5, '#18191e');
      bgGrad.addColorStop(1, '#0f1013');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 미니멀 그리드 (회색 와이어)
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

      // 1. 기하학적 키네틱 파동 & 타원 궤도 선 (Monochrome Waves)
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

      // 2. 파티클 연결선 (Kinetic Gray Net)
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

      // 3. 궤도 회전 미니 모노톤 데이지 아웃라인
      const miniOrbitR = [150, 240, 310];
      miniOrbitR.forEach((r, idx) => {
        const a = angle * (idx % 2 === 0 ? 0.8 : -0.6) + (idx * Math.PI * 0.6);
        const mx = centerX + Math.cos(a) * r;
        const my = centerY + Math.sin(a) * (r * 0.42);
        drawMonochromeDaisyOutline(mx, my, 0.35 - idx * 0.05, a * 1.5, 0.6);
      });

      // 4. 중앙 시그니처 메인 모노톤 기하학 데이지
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
  }, []);

  return (
    <section className="hero-section-wide">
      {/* 모노톤 심플 & 모던 키네틱 캔버스 배너 */}
      <div className="hero-wide-banner empty-banner monochrome-hero">
        <canvas ref={canvasRef} className="hero-geometric-canvas" />
      </div>

      {/* 히어로 타이틀 문구 */}
      <div className="hero-content-area">
        <h1 className="hero-title size-md">
          PREMIUM WOVEN SPORTSWEAR
        </h1>
        <p className="hero-subtitle size-md">
          프리미엄 우븐 스포츠웨어의 새로운 기준
        </p>
      </div>
    </section>
  );
}
