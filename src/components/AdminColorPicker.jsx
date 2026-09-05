import React, { useEffect, useMemo, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeHex = (value) => {
  const raw = String(value || '').trim().replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split('').map((character) => character + character).join('').toUpperCase()}`;
  }
  return '#111111';
};

const hexToRgb = (hex) => {
  const normalized = normalizeHex(hex).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }) => (
  `#${[r, g, b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`
);

const rgbToHsv = ({ r, g, b }) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * (((blue - red) / delta) + 2);
    else hue = 60 * (((red - green) / delta) + 4);
  }

  if (hue < 0) hue += 360;
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
};

const hsvToRgb = ({ h, s, v }) => {
  const chroma = v * s;
  const segment = h / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const offset = v - chroma;
  let channels = [0, 0, 0];

  if (segment < 1) channels = [chroma, secondary, 0];
  else if (segment < 2) channels = [secondary, chroma, 0];
  else if (segment < 3) channels = [0, chroma, secondary];
  else if (segment < 4) channels = [0, secondary, chroma];
  else if (segment < 5) channels = [secondary, 0, chroma];
  else channels = [chroma, 0, secondary];

  return {
    r: (channels[0] + offset) * 255,
    g: (channels[1] + offset) * 255,
    b: (channels[2] + offset) * 255,
  };
};

export default function AdminColorPicker({ value, onChange, label = '색상' }) {
  const [open, setOpen] = useState(false);
  const [draftHex, setDraftHex] = useState(() => normalizeHex(value));
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(value)));
  const [hexInput, setHexInput] = useState(() => normalizeHex(value));
  const planeRef = useRef(null);
  const rgb = useMemo(() => hexToRgb(draftHex), [draftHex]);

  const openPicker = () => {
    const normalized = normalizeHex(value);
    setDraftHex(normalized);
    setHexInput(normalized);
    setHsv(rgbToHsv(hexToRgb(normalized)));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const setFromHsv = (nextHsv) => {
    const normalizedHsv = {
      h: clamp(nextHsv.h, 0, 359.999),
      s: clamp(nextHsv.s, 0, 1),
      v: clamp(nextHsv.v, 0, 1),
    };
    const nextHex = rgbToHex(hsvToRgb(normalizedHsv));
    setHsv(normalizedHsv);
    setDraftHex(nextHex);
    setHexInput(nextHex);
  };

  const updatePlane = (event) => {
    const rect = planeRef.current?.getBoundingClientRect();
    if (!rect) return;
    setFromHsv({
      ...hsv,
      s: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      v: clamp(1 - ((event.clientY - rect.top) / rect.height), 0, 1),
    });
  };

  const handlePlanePointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePlane(event);
  };

  const handlePlanePointerMove = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) updatePlane(event);
  };

  const handleHexInput = (event) => {
    const nextValue = event.target.value.toUpperCase();
    setHexInput(nextValue);
    const raw = nextValue.replace('#', '');
    if (/^[0-9A-F]{6}$/.test(raw) || /^[0-9A-F]{3}$/.test(raw)) {
      const normalized = normalizeHex(nextValue);
      setDraftHex(normalized);
      setHsv(rgbToHsv(hexToRgb(normalized)));
    }
  };

  const handleRgbInput = (channel, valueInput) => {
    const nextRgb = { ...rgb, [channel]: clamp(Number(valueInput) || 0, 0, 255) };
    const nextHex = rgbToHex(nextRgb);
    setDraftHex(nextHex);
    setHexInput(nextHex);
    setHsv(rgbToHsv(nextRgb));
  };

  return (
    <>
      <button
        type="button"
        className="admin-color-picker-trigger"
        style={{ '--picker-color': normalizeHex(value) }}
        onClick={openPicker}
        aria-label={`${label} 선택`}
        title={`${label} 선택`}
      >
        <span aria-hidden="true" />
      </button>

      {open && (
        <div className="admin-color-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="admin-color-dialog" role="dialog" aria-modal="true" aria-label={`${label} 선택`}>
            <header>
              <div><span>PRODUCT COLOR</span><h2>{label} 선택</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="색상 선택창 닫기">×</button>
            </header>

            <div
              ref={planeRef}
              className="admin-color-plane"
              style={{ '--picker-hue': `hsl(${hsv.h} 100% 50%)` }}
              onPointerDown={handlePlanePointerDown}
              onPointerMove={handlePlanePointerMove}
            >
              <span
                className="admin-color-plane-cursor"
                style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, '--picker-color': draftHex }}
              />
            </div>

            <div className="admin-color-hue-row">
              <span className="admin-color-preview" style={{ '--picker-color': draftHex }} aria-hidden="true" />
              <label>
                <span>색상 스펙트럼</span>
                <input type="range" min="0" max="359" value={Math.round(hsv.h)} onChange={(event) => setFromHsv({ ...hsv, h: Number(event.target.value) })} />
              </label>
            </div>

            <div className="admin-color-value-grid">
              <label className="hex"><span>HEX</span><input value={hexInput} onChange={handleHexInput} maxLength={7} /></label>
              {['r', 'g', 'b'].map((channel) => (
                <label key={channel}>
                  <span>{channel.toUpperCase()}</span>
                  <input type="number" min="0" max="255" value={rgb[channel]} onChange={(event) => handleRgbInput(channel, event.target.value)} />
                </label>
              ))}
            </div>

            <footer>
              <button type="button" className="secondary" onClick={() => setOpen(false)}>취소</button>
              <button type="button" className="primary" onClick={() => {
                onChange(draftHex.toLowerCase());
                setOpen(false);
              }}>색상 적용</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
