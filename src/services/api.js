/* Accès unique à l'API backend (Railway).
   Par défaut on vise la prod ; en dev, .env.local pointe sur localhost:3001. */
const API_URL   = import.meta.env.VITE_API_URL || 'https://dashboard-ma-backend-production.up.railway.app';
const API_TOKEN = import.meta.env.VITE_API_READ_TOKEN || '';

export async function fetchAPI(path) {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  if (res.status === 401) {
    throw new Error('API backend : jeton de lecture absent ou invalide (VITE_API_READ_TOKEN)');
  }
  if (!res.ok) throw new Error(`API backend : HTTP ${res.status}`);
  return res.json();
}
