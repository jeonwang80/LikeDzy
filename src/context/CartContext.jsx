import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, selectedOption, quantity = 1) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id && item.option?.name === selectedOption?.name);
      if (existingIdx > -1) {
        const newCart = [...prev];
        newCart[existingIdx].quantity += quantity;
        return newCart;
      }
      return [...prev, { product, option: selectedOption, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId, optionName) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.option?.name === optionName)));
  };

  const updateQuantity = (productId, optionName, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId, optionName);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.product.id === productId && item.option?.name === optionName) {
        // Stock limit check
        if (item.option && quantity > item.option.stock) {
          alert(`해당 옵션의 남은 재고는 ${item.option.stock}개입니다.`);
          return { ...item, quantity: item.option.stock };
        }
        return { ...item, quantity };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}
