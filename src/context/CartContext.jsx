import React, { createContext, useContext, useState, useEffect } from 'react';
import { compactCartItem } from '../utils/checkoutSession';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => item?.product?.id).slice(0, 20).map(compactCartItem) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('cart', JSON.stringify(cart.map(compactCartItem))); } catch { /* browsing remains available */ }
  }, [cart]);

  const addToCart = (product, selectedOption, quantity = 1) => {
    if (!selectedOption?.variantId || !(selectedOption.stock > 0)) return;
    setCart(prev => {
      const existingIdx = prev.findIndex(item => (
        item.product.id === product.id
        && item.option?.name === selectedOption?.name
        && (item.product.cartColorName || '') === (product.cartColorName || '')
      ));
      if (existingIdx > -1) {
        const newCart = [...prev];
        newCart[existingIdx].quantity = Math.min(20, selectedOption.stock, newCart[existingIdx].quantity + quantity);
        return newCart;
      }
      if (prev.length >= 20) return prev;
      return [...prev, compactCartItem({ product, option: selectedOption, quantity })];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId, optionName, colorName = '') => {
    setCart(prev => prev.filter(item => !(
      item.product.id === productId
      && item.option?.name === optionName
      && (item.product.cartColorName || '') === (colorName || '')
    )));
  };

  const updateQuantity = (productId, optionName, quantity, colorName = '') => {
    if (quantity <= 0) {
      removeFromCart(productId, optionName, colorName);
      return;
    }
    setCart(prev => prev.map(item => {
      if (
        item.product.id === productId
        && item.option?.name === optionName
        && (item.product.cartColorName || '') === (colorName || '')
      ) {
        // Stock limit check
        if (quantity > 20 || !item.option?.variantId || !(item.option.stock > 0) || quantity > item.option.stock) {
          alert(`해당 옵션의 남은 재고는 ${item.option.stock}개입니다.`);
          return item;
        }
        return { ...item, quantity };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, replaceCart: (items) => setCart(items.map(compactCartItem)), addToCart, removeFromCart, updateQuantity, clearCart, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}
