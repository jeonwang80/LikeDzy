export const DEFAULT_PROMOTION = {
  enabled: true,
  campaignId: 'motion-launch-2026-10',
  startsAt: '',
  endsAt: '',
  images: ['/campaigns/launch-2026/white.jpg', '/campaigns/launch-2026/olive.jpg', '/campaigns/launch-2026/navy.jpg'],
  titleKo: '새로운 일상, 새로운 움직임',
  titleEn: 'Made for your next move.',
  descriptionKo: '라이크디지 모션 폴로 출시',
  descriptionEn: 'Introducing the LIKEDZY Motion Polo',
  offerKo: '출시 기념 30% 할인',
  offerEn: 'Launch offer · 30% off',
  noteKo: '쿠폰 적용 시 할인 · 적용 조건은 내 쿠폰에서 확인해 주세요.',
  noteEn: 'With an eligible coupon. See My coupons for terms.',
  buttonKo: '신상품 보러가기',
  buttonEn: 'Shop new arrivals',
  href: '/?view=collection',
};

export function safePromotionLink(value) {
  return typeof value === 'string' && /^\/(?:\?|$)/.test(value) && !/[\\\r\n]/.test(value)
    ? value : DEFAULT_PROMOTION.href;
}

export function normalizePromotion(value = {}) {
  const config = { ...DEFAULT_PROMOTION };
  for (const key of Object.keys(config)) {
    if (typeof config[key] === 'string' && typeof value[key] === 'string') config[key] = value[key].trim();
  }
  config.enabled = value.enabled === undefined ? true : value.enabled === true;
  config.campaignId ||= DEFAULT_PROMOTION.campaignId;
  config.images = Array.isArray(value.images) && value.images.length === 3 && value.images.every(src => typeof src === 'string' && /^(https?:\/\/|\/(?!\/))/.test(src))
    ? value.images : [...DEFAULT_PROMOTION.images];
  config.href = safePromotionLink(config.href);
  return config;
}

export function promotionIsActive(config, now = Date.now()) {
  if (!config.enabled) return false;
  const start = config.startsAt ? Date.parse(config.startsAt) : -Infinity;
  const end = config.endsAt ? Date.parse(config.endsAt) : Infinity;
  return start <= now && now < end;
}

export function nextLocalMidnight(now = Date.now()) {
  const date = new Date(now);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

export function promotionDismissed(id) {
  try {
    return sessionStorage.getItem(`likedzy-promotion-session:${id}`) === '1'
      || Number(localStorage.getItem(`likedzy-promotion-day:${id}`)) > Date.now();
  } catch { return false; }
}

export function dismissPromotion(id, today) {
  try {
    if (today) localStorage.setItem(`likedzy-promotion-day:${id}`, String(nextLocalMidnight()));
    else sessionStorage.setItem(`likedzy-promotion-session:${id}`, '1');
  } catch { /* The in-memory dismissal still works when storage is unavailable. */ }
}
