import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

const getWallet = httpsCallable(functions, 'listMyCoupons');
const EMPTY = { coupons: [], heldCount: 0, availableCount: 0, maxCoupons: 3 };
export function useCouponWallet(userId) {
  const [state, setState] = useState({ ...EMPTY, userId: null, loading: true, error: false });
  useEffect(() => {
    if (!userId) return undefined;
    let active = true, request = 0;
    const refresh = async () => {
      const id = ++request;
      try {
        const { data } = await getWallet({});
        if (active && id === request) setState({ ...data, userId, loading: false, error: false });
      } catch {
        if (active && id === request) setState({ ...EMPTY, userId, loading: false, error: true });
      }
    };
    const unsubscribe = onSnapshot(query(collection(db, 'userCoupons'), where('userId', '==', userId)), refresh, refresh);
    const interval = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { active = false; unsubscribe(); clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [userId]);
  return state.userId === userId ? state : { ...EMPTY, loading: Boolean(userId), error: false };
}
