import startupVietnam from '../../functions/manual-vietnam-settings.json' with { type: 'json' };

// Launch market is Vietnam; language only controls the displayed text.
export const currencyForLanguage = () => 'VND';
export const productPrice = (product, currency = 'KRW') => {
  const value = product?.prices?.[currency] ?? product?.[`price${currency}`];
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
};
export const formatMoney = (value, currency = 'KRW') => {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const amount = Math.max(0, Number(value)).toLocaleString(currency === 'VND' ? 'en-US' : 'ko-KR', { maximumFractionDigits: 0 });
  return currency === 'VND' ? `${amount} ₫` : `₩${amount}`;
};

// Never reinterpret Korean shipping fees or bank details as Vietnam settings.
export function marketSettings(settings, currency = 'KRW') {
  if (currency === 'KRW') return { ...settings, currency };
  const vietnam = vietnamSettings(settings || {});
  return { ...settings, ...vietnam, currency,
    orderEnabled: vietnam.orderEnabled === true, policyConfirmed: vietnam.policyConfirmed === true,
    manualBankTransfer: vietnam.manualBankTransfer === true,
    shippingFee: 0, freeShippingThreshold: 0,
    bankName: vietnam.bankName || '', accountNumber: vietnam.accountNumber || '', accountHolder: vietnam.accountHolder || '',
    termsText: vietnam.termsText || '', privacyText: vietnam.privacyText || '', returnsText: vietnam.returnsText || '',
    remoteAreaNotice: '', defaultCarrier: vietnam.defaultCarrier || '',
  };
}


export const MANUAL_VIETNAM_SETTINGS = startupVietnam;
export const vietnamSettings = (settings = {}) => settings.vietnam || (Object.keys(settings).length === 0 ? startupVietnam : {});
