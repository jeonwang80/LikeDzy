import { useStoreCopy } from '../i18n/storeCopy';
import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { db } from '../firebase';
import { calculateShippingFee, normalizeCommerceSettings } from '../utils/commerce';
import { FALLBACK_PRODUCT_IMAGE, getColorSwatchBackground, getSafeImageUrl } from '../utils/productPresentation';
import { useLanguage } from '../i18n/LanguageContext';
import { formatMoney, marketSettings, productPrice } from '../utils/market';
import './CartModal.css';

export default function CartModal() {
  const copy = useStoreCopy();
  const navigate = useNavigate();
  const { language, currency } = useLanguage();
  const money = (value) => formatMoney(value, currency);
  const { cart, updateQuantity, removeFromCart, isCartOpen, setIsCartOpen } = useCart();
  const [settings, setSettings] = useState(() => normalizeCommerceSettings());

  useEffect(() => onSnapshot(
    doc(db, 'settings', 'commerce'),
    (snapshot) => setSettings(normalizeCommerceSettings(snapshot.exists() ? snapshot.data() : {})),
    () => {},
  ), []);

  const subtotal = useMemo(() => cart.some((item) => productPrice(item.product, currency) === null) ? null : cart.reduce(
    (sum, item) => sum + (productPrice(item.product, currency) || 0) * item.quantity,
    0,
  ), [cart, currency]);
  const shippingFee = calculateShippingFee(subtotal, marketSettings(settings, currency));
  const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);

  if (!isCartOpen) return null;

  const getItemImage = (item) => getSafeImageUrl(
    item.product.cartThumbnailUrl
      || item.product.cartImageUrl
      || item.product.images?.[0]
      || item.product.imageUrls?.[0],
  );

  const getItemColor = (item) => {
    const swatches = item.product.colorSwatches?.length
      ? item.product.colorSwatches
      : (item.product.colors || []);
    const savedName = item.product.cartColorName || '';
    const activeSwatch = swatches.find((swatch) => swatch?.name === savedName) || swatches[0] || null;
    return {
      name: savedName || activeSwatch?.name || item.product.colorName || item.product.color || '기본',
      background: item.product.cartColorBackground || getColorSwatchBackground(activeSwatch, '#9a9c96'),
    };
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="admin-modal-overlay cart-modal-overlay" onClick={(event) => {
      if (event.target === event.currentTarget) setIsCartOpen(false);
    }}>
      <aside className="cart-sidebar" aria-label={copy("장바구니")}>
        <header className="cart-drawer-header">
          <div>
            <span>LIKEDZY / CART · {totalQuantity} ITEMS</span>
            <h2>{copy("장바구니")}</h2>
          </div>
          <button type="button" onClick={() => setIsCartOpen(false)} aria-label={copy("장바구니 닫기")}>&times;</button>
        </header>

        <div className="cart-drawer-body">
          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <span>YOUR BAG IS EMPTY</span>
              <strong>{copy("장바구니가 비어있습니다.")}</strong>
              <p>{copy("마음에 드는 아웃도어 아이템을 담아보세요.")}</p>
            </div>
          ) : (
            <div className="cart-item-list">
              {cart.map((item, index) => {
                const itemColor = getItemColor(item);
                return (
                  <article className="cart-line-item" key={`${item.product.id}-${item.option?.name || 'default'}-${item.product.cartColorName || index}`}>
                    <div className="cart-item-image-frame">
                      <img
                        src={getItemImage(item)}
                        alt={item.product.name}
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                        }}
                      />
                    </div>
                    <div className="cart-item-content">
                      <div className="cart-item-heading">
                        <div>
                          <span>LIKEDZY TECHNICAL OUTDOOR</span>
                          <h3>{item.product[language]?.name || item.product.name}</h3>
                        </div>
                        <button type="button" onClick={() => removeFromCart(item.product.id, item.option?.name, item.product.cartColorName)}>{copy("삭제")}</button>
                      </div>
                      <div className="cart-item-meta">
                        <span className="cart-color-meta"><i style={{ background: itemColor.background }} aria-hidden="true" /> COLOR · {itemColor.name}</span>
                        <span>SIZE · {item.option?.name || '기본'}</span>
                      </div>
                      <div className="cart-item-controls">
                        <div className="cart-quantity-control" aria-label={copy("수량 조절")}>
                          <button type="button" onClick={() => updateQuantity(item.product.id, item.option?.name, item.quantity - 1, item.product.cartColorName)} aria-label={copy("수량 줄이기")}>−</button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.product.id, item.option?.name, item.quantity + 1, item.product.cartColorName)} aria-label={copy("수량 늘리기")}>＋</button>
                        </div>
                        <strong>{money(productPrice(item.product, currency) === null ? null : productPrice(item.product, currency) * item.quantity)}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <footer className="cart-drawer-footer">
            <div className="cart-shipping-note">
              <span>DELIVERY</span>
              <strong>{shippingFee === 0 ? copy("무료배송 적용") : `${language === 'ko' ? '배송비' : 'Shipping'} ${money(shippingFee)}`}</strong>
            </div>
            <div className="cart-total-row">
              <span>{copy("예상 결제금액")}</span>
              <strong>{money(shippingFee === null || cart.some((item) => productPrice(item.product, currency) === null) ? null : subtotal + shippingFee)}</strong>
            </div>
            <button type="button" className="cart-checkout-button" onClick={handleCheckout}>{copy("주문서 작성")}<span>→</span>
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
