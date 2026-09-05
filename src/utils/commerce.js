export const DEFAULT_COMMERCE_SETTINGS = {
  orderEnabled: false,
  purchaseSafetyConfirmed: false,
  businessInfoConfirmed: false,
  policyConfirmed: false,
  termsText: '',
  privacyText: '',
  returnsText: '',
  businessName: '',
  representativeName: '',
  businessNumber: '',
  ecommerceNumber: '',
  customerServicePhone: '',
  customerServiceEmail: '',
  businessAddress: '',
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  shippingFee: 3000,
  freeShippingThreshold: 50000,
  depositDeadlineHours: 48,
  defaultCarrier: 'CJ대한통운',
  remoteAreaNotice: '제주 및 도서산간 지역은 추가 배송비가 발생할 수 있습니다.',
  returnAddress: '',
};

export const DELIVERY_CARRIERS = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배', '기타'];

export const ADMIN_TEST_COMMERCE_SETTINGS = {
  ...DEFAULT_COMMERCE_SETTINGS,
  orderEnabled: true,
  shippingFee: 3000,
  freeShippingThreshold: 50000,
  depositDeadlineHours: 48,
  bankName: '테스트 전용',
  accountNumber: '실제 입금 금지',
  accountHolder: 'LIKEDZY TEST',
};

const ADMIN_TEST_EMAILS = new Set(['jeonwang80@gmail.com']);

export const isAdminTestUser = (user) => (
  ADMIN_TEST_EMAILS.has(String(user?.email || '').trim().toLowerCase())
);

const toNonNegativeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const normalizeCommerceSettings = (value = {}) => ({
  ...DEFAULT_COMMERCE_SETTINGS,
  ...value,
  orderEnabled: value.orderEnabled === true,
  purchaseSafetyConfirmed: value.purchaseSafetyConfirmed === true,
  businessInfoConfirmed: value.businessInfoConfirmed === true,
  shippingFee: toNonNegativeNumber(value.shippingFee, DEFAULT_COMMERCE_SETTINGS.shippingFee),
  freeShippingThreshold: toNonNegativeNumber(
    value.freeShippingThreshold,
    DEFAULT_COMMERCE_SETTINGS.freeShippingThreshold,
  ),
  depositDeadlineHours: Math.max(
    1,
    toNonNegativeNumber(value.depositDeadlineHours, DEFAULT_COMMERCE_SETTINGS.depositDeadlineHours),
  ),
});

export const isCommerceReady = (settings) => Boolean(
  settings?.orderEnabled
  && settings?.purchaseSafetyConfirmed
  && settings?.businessInfoConfirmed
  && settings?.policyConfirmed
  && settings?.termsText?.trim()
  && settings?.privacyText?.trim()
  && settings?.returnsText?.trim()
  && settings?.businessName?.trim()
  && settings?.representativeName?.trim()
  && settings?.businessNumber?.trim()
  && settings?.customerServicePhone?.trim()
  && settings?.customerServiceEmail?.trim()
  && settings?.businessAddress?.trim()
  && settings?.bankName?.trim()
  && settings?.accountNumber?.trim()
  && settings?.accountHolder?.trim()
);

export const calculateShippingFee = (subtotal, settings) => {
  const normalized = normalizeCommerceSettings(settings);
  if (normalized.freeShippingThreshold > 0 && subtotal >= normalized.freeShippingThreshold) return 0;
  return normalized.shippingFee;
};

export const formatKRW = (value) => `₩${Math.max(0, Number(value) || 0).toLocaleString('ko-KR')}`;

export const getDepositDeadline = (hours, from = new Date()) => (
  new Date(from.getTime() + Math.max(1, Number(hours) || 48) * 60 * 60 * 1000)
);

export const formatKoreanDateTime = (value) => {
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
};

export const getTrackingUrl = (carrier = '', trackingNumber = '') => {
  const invoice = encodeURIComponent(String(trackingNumber).replace(/[^0-9A-Za-z-]/g, ''));
  if (!invoice) return '';
  if (carrier.includes('CJ')) return `https://trace.cjlogistics.com/next/tracking.html?wblNo=${invoice}`;
  if (carrier.includes('한진')) return `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillSch.do?mCode=MN038&wblnumText2=${invoice}`;
  if (carrier.includes('롯데')) return `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${invoice}`;
  if (carrier.includes('우체국')) return `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${invoice}`;
  if (carrier.includes('로젠')) return `https://www.ilogen.com/web/personal/trace/${invoice}`;
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(`${carrier} ${trackingNumber} 배송조회`)}`;
};
