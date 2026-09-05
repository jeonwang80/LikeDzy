import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export function useProductStock(productId) {
  const [state, setState] = useState({ variants: [], loading: true, error: '' });
  useEffect(() => {
    if (!productId) return undefined;
    return onSnapshot(query(collection(db, 'stockAvailability'), where('productId', '==', productId), limit(200)),
      (snapshot) => setState({ productId, variants: snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })), loading: false, error: '' }),
      () => setState({ productId, variants: [], loading: false, error: '재고를 확인하지 못했습니다. 새로고침 후 다시 확인해 주세요.' }));
  }, [productId]);
  return productId && state.productId === productId ? state : { variants: [], loading: Boolean(productId), error: '' };
}
