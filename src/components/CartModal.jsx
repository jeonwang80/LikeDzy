import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function CartModal() {
  const { cart, updateQuantity, removeFromCart, clearCart, isCartOpen, setIsCartOpen } = useCart();
  const { currentUser } = useAuth();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer'); // 'bank_transfer' or 'card'
  const [orderForm, setOrderForm] = useState({
    name: '', phone: '', address: '', depositName: '', notes: ''
  });

  if (!isCartOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.className === 'admin-modal-overlay') {
      setIsCartOpen(false);
      setShowOrderForm(false);
    }
  };

  const calculateTotal = () => {
    let totalKRW = 0;
    cart.forEach(item => {
      if (item.product.prices && item.product.prices.KRW) {
        totalKRW += item.product.prices.KRW * item.quantity;
      }
    });
    return totalKRW;
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setIsSubmitting(true);
    
    const totalKRW = calculateTotal();
    const orderId = `ORDER_${new Date().getTime()}`;
    const orderName = cart.length === 1 ? cart[0].product.name : `${cart[0].product.name} 외 ${cart.length - 1}건`;

    if (paymentMethod === 'bank_transfer') {
      try {
        const orderItems = cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          price: item.product.price || `₩${item.product.prices?.KRW?.toLocaleString()}`,
          optionName: item.option?.name || '기본',
          quantity: item.quantity
        }));

        const totalAmountStr = `₩${totalKRW.toLocaleString()}`;

        await addDoc(collection(db, 'orders'), {
          userId: currentUser ? currentUser.uid : null,
          items: orderItems,
          totalAmount: totalAmountStr,
          paymentMethod: 'bank_transfer',
          name: orderForm.name,
          phone: orderForm.phone,
          address: orderForm.address,
          depositName: orderForm.depositName || orderForm.name,
          notes: orderForm.notes,
          status: '입금 대기',
          createdAt: new Date()
        });

        for (const item of cart) {
          if (!item.product.id) continue;
          const productRef = doc(db, 'products', item.product.id);
          const productSnap = await getDoc(productRef);
          
          if (productSnap.exists()) {
            const productData = productSnap.data();
            if (productData.options) {
              const updatedOptions = productData.options.map(opt => {
                if (opt.name === item.option?.name) {
                  const newStock = Math.max(0, opt.stock - item.quantity);
                  const newSales = (opt.sales || 0) + item.quantity;
                  const historyEntry = {
                    date: new Date().toISOString(),
                    type: '무통장 입금 (주문 접수)',
                    amount: -item.quantity
                  };
                  const newHistory = [historyEntry, ...(opt.history || [])];
                  return { ...opt, stock: newStock, sales: newSales, history: newHistory };
                }
                return opt;
              });
              await updateDoc(productRef, { options: updatedOptions });
            }
          }
        }

        alert('주문이 성공적으로 접수되었습니다!\n아래 계좌로 입금해주시면 배송이 시작됩니다.\n\n[입금계좌]\n국민은행 123456-78-901234\n예금주: 라이크디지(LikeDzy)');
        clearCart();
        setIsCartOpen(false);
        setShowOrderForm(false);
        setOrderForm({ name: '', phone: '', address: '', depositName: '', notes: '' });
      } catch (error) {
        console.error("Order save error:", error);
        alert('주문 접수에 실패했습니다. 관리자에게 문의하세요.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 신용카드 연동 로직 (현재 비활성화 상태이지만 코드는 유지)
    const { IMP } = window;
    if (!IMP) {
      alert("결제 모듈을 불러오지 못했습니다.");
      setIsSubmitting(false);
      return;
    }
    
    // 포트원 공용 테스트 식별코드
    IMP.init('imp14397622'); 

    const paymentData = {
      pg: "html5_inicis", // 이니시스 웹표준 결제창
      pay_method: "card", // 신용카드 결제
      merchant_uid: orderId,
      name: orderName,
      amount: totalKRW,
      buyer_email: "test@test.com",
      buyer_name: orderForm.name,
      buyer_tel: orderForm.phone,
      buyer_addr: orderForm.address,
      buyer_postcode: "12345"
    };

    IMP.request_pay(paymentData, async (response) => {
      if (response.success) {
        try {
          const orderItems = cart.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            price: item.product.price || `₩${item.product.prices?.KRW?.toLocaleString()}`,
            optionName: item.option?.name || '기본',
            quantity: item.quantity
          }));

          const totalAmountStr = `₩${totalKRW.toLocaleString()}`;

          await addDoc(collection(db, 'orders'), {
            userId: currentUser ? currentUser.uid : null,
            items: orderItems,
            totalAmount: totalAmountStr,
            imp_uid: response.imp_uid,
            merchant_uid: response.merchant_uid,
            paymentMethod: response.pay_method || 'card',
            name: orderForm.name,
            phone: orderForm.phone,
            address: orderForm.address,
            notes: orderForm.notes,
            status: '결제 완료',
            createdAt: new Date()
          });

          for (const item of cart) {
            if (!item.product.id) continue;
            const productRef = doc(db, 'products', item.product.id);
            const productSnap = await getDoc(productRef);
            
            if (productSnap.exists()) {
              const productData = productSnap.data();
              if (productData.options) {
                const updatedOptions = productData.options.map(opt => {
                  if (opt.name === item.option?.name) {
                    const newStock = Math.max(0, opt.stock - item.quantity);
                    const newSales = (opt.sales || 0) + item.quantity;
                    const historyEntry = {
                      date: new Date().toISOString(),
                      type: '카드 결제 (자동 차감)',
                      amount: -item.quantity
                    };
                    const newHistory = [historyEntry, ...(opt.history || [])];
                    return { ...opt, stock: newStock, sales: newSales, history: newHistory };
                  }
                  return opt;
                });
                await updateDoc(productRef, { options: updatedOptions });
              }
            }
          }

          alert('결제가 성공적으로 완료되었습니다!');
          clearCart();
          setIsCartOpen(false);
          setShowOrderForm(false);
          setOrderForm({ name: '', phone: '', address: '', depositName: '', notes: '' });
        } catch (error) {
          console.error("Order save error:", error);
          alert('결제는 완료되었으나 주문 정보 저장에 실패했습니다. 관리자에게 문의하세요.');
        } finally {
          setIsSubmitting(false);
        }
      } else {
        alert(`결제 실패 또는 취소되었습니다.\n(${response.error_msg})`);
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className="admin-modal-overlay" onClick={handleOverlayClick} style={{ zIndex: 1000, display: 'flex', justifyContent: 'flex-end', padding: 0 }}>
      <div className="cart-sidebar" style={{ width: '100%', maxWidth: '400px', height: '100%', background: 'var(--bg-color)', color: 'var(--text-color)', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 15px rgba(0,0,0,0.5)', overflowY: 'auto', animation: 'slideInRight 0.3s forwards' }}>
        
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{showOrderForm ? '주문서 작성' : '장바구니'}</h2>
          <button onClick={() => { setIsCartOpen(false); setShowOrderForm(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
              장바구니가 비어있습니다.
            </div>
          ) : !showOrderForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--card-bg)', borderRadius: '8px' }}>
                  <img src={item.product.images?.[0] || item.product.imageUrls?.[0]} alt={item.product.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.2rem' }}>{item.product.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>옵션: {item.option?.name || '기본'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.2rem' }}>
                        <button onClick={() => updateQuantity(item.product.id, item.option?.name, item.quantity - 1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0 0.5rem' }}>-</button>
                        <span style={{ fontSize: '0.9rem' }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.option?.name, item.quantity + 1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0 0.5rem' }}>+</button>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id, item.option?.name)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}>삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-color)', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>결제 수단 선택</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: `1px solid ${paymentMethod === 'bank_transfer' ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', background: paymentMethod === 'bank_transfer' ? 'rgba(59,130,246,0.1)' : 'var(--card-bg)', flex: 1 }}>
                    <input type="radio" name="paymentMethod" value="bank_transfer" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} style={{ accentColor: '#3b82f6' }} />
                    <span style={{ fontSize: '0.9rem' }}>무통장 입금</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'not-allowed', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', flex: 1, opacity: 0.5 }}>
                    <input type="radio" name="paymentMethod" value="card" disabled style={{ cursor: 'not-allowed' }} />
                    <span style={{ fontSize: '0.9rem' }}>신용카드 (준비중)</span>
                  </label>
                </div>
              </div>

              {paymentMethod === 'bank_transfer' && (
                <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <h3 style={{ fontSize: '0.95rem', color: '#60a5fa', marginBottom: '0.5rem' }}>🏦 입금 계좌 안내</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-color)', margin: '0 0 0.25rem 0' }}>국민은행 123456-78-901234</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>예금주: 라이크디지(LikeDzy)</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0' }}>* 주문 완료 후 위 계좌로 총 결제 금액을 입금해 주세요.</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>총 결제 금액</span>
                <strong style={{ color: 'white', fontSize: '1.2rem' }}>₩{calculateTotal().toLocaleString()}</strong>
              </div>

              <form id="checkout-form" onSubmit={handleOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>구매자 이름 *</label>
                  <input required value={orderForm.name} onChange={e => setOrderForm({...orderForm, name: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} placeholder="홍길동" />
                </div>
                {paymentMethod === 'bank_transfer' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>입금자명 (다를 경우)</label>
                    <input value={orderForm.depositName} onChange={e => setOrderForm({...orderForm, depositName: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} placeholder="입금자명이 다를 경우 입력" />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>연락처 *</label>
                  <input required type="tel" value={orderForm.phone} onChange={e => setOrderForm({...orderForm, phone: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} placeholder="010-1234-5678" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>배송지 주소 *</label>
                  <input required value={orderForm.address} onChange={e => setOrderForm({...orderForm, address: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }} placeholder="도로명 주소 등 상세히 입력" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>추가 요청사항</label>
                  <textarea value={orderForm.notes} onChange={e => setOrderForm({...orderForm, notes: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', minHeight: '60px', fontFamily: 'inherit' }} placeholder="부재 시 문 앞에 놔주세요." />
                </div>
              </form>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'var(--card-bg)' }}>
            {!showOrderForm ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  <span>총 결제금액</span>
                  <span>₩{calculateTotal().toLocaleString()}</span>
                </div>
                <button 
                  onClick={() => setShowOrderForm(true)}
                  style={{ width: '100%', padding: '1rem', background: 'white', color: 'black', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                >
                  주문하기
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowOrderForm(false)} 
                  style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  뒤로가기
                </button>
                <button 
                  type="submit" 
                  form="checkout-form"
                  disabled={isSubmitting} 
                  style={{ flex: 2, padding: '1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isSubmitting ? '접수 중...' : '결제 완료하기'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
