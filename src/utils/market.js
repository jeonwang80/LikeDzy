import startupVietnam from '../../functions/manual-vietnam-settings.json' with { type: 'json' };

// Launch market is Vietnam; language only controls the displayed text.
export const currencyForLanguage = () => 'VND';
export const productPrice = (product, currency = 'KRW') => {
  const value = product?.prices?.[currency] ?? product?.[`price${currency}`];
  return typeof value === 'number' && (currency === 'EUR' ? Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7 : Number.isSafeInteger(value)) && value > 0 ? value : null;
};
export const formatMoney = (value, currency = 'KRW') => {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  if (currency === 'EUR') return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Math.max(0, Number(value)));
  const amount = Math.max(0, Number(value)).toLocaleString(currency === 'VND' ? 'en-US' : 'ko-KR', { maximumFractionDigits: 0 });
  return currency === 'VND' ? `${amount} ₫` : `₩${amount}`;
};

// Never reinterpret Korean shipping fees or bank details as Vietnam settings.
export function marketSettings(settings, currency = 'KRW') {
  if (currency === 'KRW') return { ...settings, currency };
  if (currency === 'EUR') return { shippingFee: 0, freeShippingThreshold: 0, depositDeadlineHours: 48, ...settings?.hungary, currency, orderEnabled: settings?.hungary?.orderEnabled === true };
  const vietnam = vietnamSettings(settings || {});
  return { ...settings, ...vietnam, currency,
    orderEnabled: vietnam.orderEnabled === true, policyConfirmed: vietnam.policyConfirmed === true,
    manualBankTransfer: vietnam.manualBankTransfer === true,
    shippingFee: vietnam.shippingPolicyConfigured === true ? (vietnam.shippingFee ?? 0) : 0, freeShippingThreshold: vietnam.shippingPolicyConfigured === true ? (vietnam.freeShippingThreshold ?? 0) : 0,
    bankName: vietnam.bankName || '', accountNumber: vietnam.accountNumber || '', accountHolder: vietnam.accountHolder || '',
    termsText: vietnam.termsText || '', privacyText: vietnam.privacyText || '', returnsText: vietnam.returnsText || '',
    remoteAreaNotice: vietnam.remoteAreaNotice || '', defaultCarrier: vietnam.defaultCarrier || '',
  };
}


export const MANUAL_VIETNAM_SETTINGS = startupVietnam;
export const vietnamSettings = (settings = {}) => settings.vietnam || (Object.keys(settings).length === 0 ? startupVietnam : {});
