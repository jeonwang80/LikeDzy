import { useEffect, useState } from 'react';

export function useVisitorCountry() {
  const [country, setCountry] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    fetch('/api/visitor-country', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (/^[A-Z]{2}$/.test(data?.country || '') && data.country !== 'XX') setCountry(data.country);
      })
      .catch(() => { /* Unknown is preferable to displaying an invented country. */ })
      .finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);
  return country;
}
