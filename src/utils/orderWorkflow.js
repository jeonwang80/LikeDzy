export const ORDER_TRANSITIONS = {
  '입금 대기': ['입금 확인', '주문 취소'],
  '입금 확인': ['상품 준비중', '환불요청'],
  '상품 준비중': ['발송 완료', '환불요청'],
  '발송 완료': ['배송완료', '반품요청'],
  '배송완료': ['반품요청'],
  '반품요청': ['반품입고'],
};
export const ORDER_STATUSES = [...Object.keys(ORDER_TRANSITIONS), '주문 취소', '환불요청', '반품입고', '환불완료'];
