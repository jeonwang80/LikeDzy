export const couponStatusText = (status, language = 'ko') => ({
  available: ['사용 가능', 'Available'], scheduled: ['사용 시작 전', 'Not started'], reserved: ['입금 대기 주문에 적용', 'Applied to an unpaid order'],
  used: ['사용 완료', 'Used'], expired: ['기간 만료', 'Expired'], paused: ['행사 중지', 'Paused'], exhausted: ['행사 한도 소진', 'Campaign limit reached'],
  invalid: ['기간 설정 확인 필요', 'Check validity dates'], unavailable: ['사용 불가', 'Unavailable'],
}[status] || ['확인 필요', 'Check status'])[language === 'ko' ? 0 : 1];
export const couponDate = (value, language = 'ko') => value ? new Date(value).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
