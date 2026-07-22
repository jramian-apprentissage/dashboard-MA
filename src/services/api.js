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

/* Variante POST qui ne lève pas d'exception : certains flux (CloudTalk)
   attendent {ok, data} pour afficher l'erreur inline plutôt que de la
   traiter comme un crash de la page. */
async function postAPI(path, body) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Reporting CloudTalk — proxy backend vers les webhooks n8n existants.
export const cloudtalk = {
  calculer: payload => postAPI('/cloudtalk/calculer', payload),
  colonnes: client => postAPI('/cloudtalk/colonnes', { client }),
  ecrire: (client, column, values) => postAPI('/cloudtalk/ecrire', { client, column, values }),
};
