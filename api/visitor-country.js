import countryProof from '../functions/countryProof.js';
import process from 'node:process';
// Vercel supplies this header from the connection IP. Never infer country from language.
export default function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (!['GET', 'POST'].includes(request.method)) return response.status(405).json({ country: null });
  const value = request.headers['x-vercel-ip-country'];
  const country = typeof value === 'string' && /^[A-Z]{2}$/.test(value) && value !== 'XX' ? value : null;
  if (request.method === 'POST') {
    if (!['KR', 'VN', 'HU'].includes(country)) return response.status(403).json({ error: 'Country unavailable or unsupported' });
    try {
      const proof = countryProof.signCountryProof(country, request.body?.orderKey, process.env.COUNTRY_TOKEN_SECRET);
      return response.status(200).json({ country, proof });
    } catch { return response.status(503).json({ error: 'Country verification unavailable' }); }
  }
  return response.status(200).json({ country });
}
