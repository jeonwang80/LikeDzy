import { useEffect, useSyncExternalStore } from 'react';

let country = null;
let pending;
let checkedAt = 0;
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => country;
export async function refreshVisitorCountry() {
  if (pending) return pending;
  if (Date.now() - checkedAt < 60000) return country;
  pending = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch('/api/visitor-country', { cache: 'no-store', signal: controller.signal });
      const data = response.ok ? await response.json() : null;
      country = /^[A-Z]{2}$/.test(data?.country || '') && data.country !== 'XX' ? data.country : null;
    } catch { country = null; }
    finally { clearTimeout(timeout); checkedAt = Date.now(); pending = null; listeners.forEach(listener => listener()); }
    return country;
  })();
  return pending;
}
export function useVisitorCountry() {
  const value = useSyncExternalStore(subscribe, snapshot, () => null);
  useEffect(() => {
    refreshVisitorCountry();
    const refresh = () => { if (document.visibilityState === 'visible') refreshVisitorCountry(); };
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return value;
}
