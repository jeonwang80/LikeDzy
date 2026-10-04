import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { productPrice } from '../utils/market';
import { hasAvailableProductStock } from '../utils/productStock';

export function useCheckoutCatalog(cart, currency, language, replaceCart, onPriceChange) {
  const key = JSON.stringify([currency, cart.map((item) => [item.product.id, item.product.cartColorName, item.option?.name, item.quantity, productPrice(item.product, currency), item.option?.stock, item.option?.variantId])]);
  const [state, setState] = useState({ key: '', checked: false, error: '' });
  useEffect(() => {
    if (!cart.length) return undefined;
    let active = true;
    let failed = false;
    const products = new Map(); const stocks = new Map();
    const ids = [...new Set(cart.map((item) => item.product.id))];
    const publish = () => {
      if (!active || failed || ids.some((id) => !products.has(id) || !stocks.has(id))) return;
      let blocked = false; let changed = false; let priceChanged = false;
      const next = cart.map((item) => {
        const product = products.get(item.product.id);
        const variant = stocks.get(item.product.id).find((row) => row.colorName === (item.product.cartColorName || '기본') && row.optionName === (item.option?.name || '기본'));
        const price = productPrice(product, currency);
        const available = Math.max(0, Number(variant?.available) || 0);
        if (price !== productPrice(item.product, currency)) priceChanged = true;
        if (!product || product.isActive === false || price === null || !variant || !hasAvailableProductStock(product, [variant]) || available < item.quantity) blocked = true;
        if (price !== productPrice(item.product, currency) || available !== item.option?.stock || variant?.id !== item.option?.variantId) changed = true;
        return { ...item, product: { ...item.product, ko: product?.ko, en: product?.en, name: product?.[language]?.name || product?.name || item.product.name, prices: { ...product?.prices, [currency]: price } }, option: { ...item.option, variantId: variant?.id || '', stock: available } };
      });
      if (changed) replaceCart(next);
      if (priceChanged) onPriceChange();
      setState({ key, checked: !blocked, error: blocked ? (language === 'ko' ? '상품 준비중이거나 주문 수량보다 재고가 부족한 상품이 있습니다. 장바구니를 확인해 주세요.' : 'Some items are unavailable or exceed the available stock. Please check your bag.') : '' });
    };
    const failure = () => { failed = true; if (active) setState({ key, checked: false, error: language === 'ko' ? '상품 정보를 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.' : 'Could not load item availability. Please check your connection and reload.' }); };
    const unsubscribe = ids.flatMap((id) => [
      onSnapshot(doc(db, 'products', id), (snapshot) => { products.set(id, snapshot.exists() ? snapshot.data() : null); publish(); }, failure),
      onSnapshot(query(collection(db, 'stockAvailability'), where('productId', '==', id), limit(200)), (snapshot) => { stocks.set(id, snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))); publish(); }, failure),
    ]);
    return () => { active = false; unsubscribe.forEach((stop) => stop()); };
  }, [cart, currency, language, replaceCart, onPriceChange, key]);
  return { checked: state.key === key && state.checked, loading: cart.length > 0 && state.key !== key, error: state.key === key ? state.error : '' };
}
