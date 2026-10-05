import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Static, self-contained SVGs; edit here and rerun to keep diagrams reproducible.
const out = fileURLToPath(new URL('../public/guide/diagrams/', import.meta.url));
mkdirSync(out, { recursive: true });
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const card = (x, y, title, subtitle, rows, tone = 'green') => {
  const color = tone === 'blue' ? '#e6edf7' : tone === 'sand' ? '#f2ecdd' : '#e6eee2';
  return `<g transform="translate(${x} ${y})"><rect width="270" height="250" rx="12" fill="white" stroke="#cbd7c5"/><path d="M12 0H258Q270 0 270 12V77H0V12Q0 0 12 0" fill="${color}"/><text x="18" y="30" class="entity">${esc(title)}</text><text x="18" y="57" class="subtitle">${esc(subtitle)}</text>${rows.map((r, i) => `<text x="18" y="106" dy="${i * 27}" class="field">${esc(r)}</text>`).join('')}</g>`;
};
const line = (path, x, y, label) => `<path d="${path}" fill="none" stroke="#6d8262" stroke-width="2"/><rect x="${x - 42}" y="${y - 17}" width="84" height="26" rx="5" fill="#f7f9f4"/><text x="${x}" y="${y}" text-anchor="middle" class="relation">${esc(label)}</text>`;
function save(name, title, desc, contents) {
  writeFileSync(out + name, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc><style>text{font-family:Arial,'Noto Sans KR',sans-serif;fill:#293d30}.entity{font-size:19px;font-weight:700}.subtitle{font-size:13px;fill:#64745a}.field{font-size:14px;font-family:Consolas,monospace}.relation{font-size:13px;font-weight:700}.legend{font-size:13px;fill:#617058}</style><rect width="1000" height="700" rx="14" fill="#f7f9f4"/>${contents}<text x="20" y="682" class="legend">DOC = 문서 ID · REF = 코드상 참조 · 1 = 하나 · 0..1 = 선택적 하나 · 0..N = 여러 개 가능</text></svg>\n`);
}

save('catalog-erd.svg', '상품과 재고 ERD', '카테고리 하나에 여러 상품, 상품 하나에 여러 SKU 재고와 주문 항목이 연결됩니다. 재고 문서와 공개 재고는 같은 ID의 일대일 관계이며 재고 변동 이력은 여러 건입니다. orders.items는 별도 컬렉션이 아닌 주문 내부 배열입니다.',
  line('M290 130H365',327,120,'0..1 : N') +
  line('M635 130H710',672,120,'1 : 0..N') +
  line('M845 285V390',845,342,'1 : 1') +
  line('M775 285V325H500V390',580,315,'1 : 0..N') +
  line('M415 285V340H155V390',275,330,'1 : 0..N') +
  card(20,35,'categoryMasters','카테고리 기준정보', ['DOC categoryId','code · level1/2/3Code','level1/2/3Name','active · sortOrder','createdAt · updatedAt']) +
  card(365,35,'products','상품 · 현재 옵션', ['DOC productId','REF categoryMasterId?','category · prices{}','colorSwatches[] · sizeOptions[]','measurementGuide{}']) +
  card(710,35,'inventory','색상 × 사이즈별 재고', ['DOC variantId','REF productId','colorName · optionName','stock · reserved · sold','version · updatedAt']) +
  card(20,390,'orders.items[]','주문 내부 배열 · 별도 컬렉션 아님', ['REF productId · variantId','productName','colorName · optionName','quantity · unitPrice','lineAmount'], 'sand') +
  card(365,390,'inventoryMovements','재고 변경 기록', ['DOC movementId','REF variantId · productId','REF orderId? · actorUid?','type · stockDelta','stockAfter · version']) +
  card(710,390,'stockAvailability','스토어 공개용 재고', ['DOC variantId (동일 ID)','REF productId','colorName · optionName','available (= stock)','updatedAt'], 'blue')
);

save('commerce-erd.svg', '회원 주문 쿠폰 ERD', 'Firebase Auth 계정은 여러 주문과 보유 쿠폰을 가질 수 있습니다. 비회원 주문은 userId가 없습니다. 주문은 여러 이벤트를 가지며 쿠폰 사용 문서는 회원과 쿠폰 조합당 하나로 현재 연결 주문을 기록합니다. 주문당 쿠폰은 선택적으로 하나입니다.',
  line('M290 130H365',327,120,'0..1 : N') +
  line('M635 130H710',672,120,'1 : 1..N') +
  line('M155 285V390',155,342,'1 : 0..N') +
  line('M365 495H290',327,485,'1 : 0..N') +
  line('M635 495H710',672,485,'1 : 0..N') +
  line('M500 390V285',500,342,'0..1 : N') +
  line('M845 390V330H595V285',760,320,'0..1 : 1') +
  card(20,35,'Firebase Auth','계정 서비스 · Firestore 밖', ['KEY uid','email · displayName','emailVerified · disabled','providerData[]','metadata.creationTime'], 'blue') +
  card(365,35,'orders','주문 시점의 확정 데이터', ['DOC orderId','REF userId? · couponCode?','items[] · bankSnapshot{}','subtotal · discountAmount','totalAmountNumber · status']) +
  card(710,35,'orderEvents','주문 처리 이력', ['DOC eventId','REF orderId · userId?','actorUid? · type','fromStatus? · toStatus','note? · createdAt']) +
  card(20,390,'userCoupons','회원에게 발급된 쿠폰', ['DOC hash(code:userId)','REF userId · code','orderId? · redeemedAt?','createdAt · issuedBy?','발급 당시 조건 사본']) +
  card(365,390,'coupons','쿠폰 행사 · 최신 조건', ['DOC CODE','percent · currency','minSubtotal · maxDiscount','startsAt · endsAt · active','autoIssue · usageLimit']) +
  card(710,390,'couponUses','회원 × 코드별 사용 상태', ['DOC hash(code:userId)','REF userId · code','REF orderId','released · releasedAt?','createdAt'])
);
