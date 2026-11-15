// Vercel supplies this header from the connection IP. Never infer country from language.
export default function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (request.method !== 'GET') return response.status(405).json({ country: null });
  const value = request.headers['x-vercel-ip-country'];
  const country = typeof value === 'string' && /^[A-Z]{2}$/.test(value) && value !== 'XX' ? value : null;
  return response.status(200).json({ country });
}
