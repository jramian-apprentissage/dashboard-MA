/* Accès aux routes du Dash RH.
 *
 * FICHIER SÉPARÉ DE services/api.js, ET C'EST VOLONTAIRE. Le client commun
 * porte VITE_API_READ_TOKEN, le secret partagé qui ouvre toutes les routes du
 * dashboard commercial. Le front de développement du Dash RH, dont le lien part
 * à une personne extérieure à l'entreprise, ne doit jamais l'embarquer : il
 * suffirait d'ouvrir le code de la page pour lire ensuite le chiffre
 * d'affaires, les marges et les clients nommés.
 *
 * Ce client ne connaît donc que VITE_API_RH_TOKEN, qui n'ouvre que
 * server/src/routes/rh.js. Les deux mondes ne partagent pas de secret, règle
 * déjà posée dans le dépôt pour CLOUDTALK_INGEST_TOKEN et REPORTING_TOKEN.
 */
const API_URL  = import.meta.env.VITE_API_URL || 'https://dashboard-ma-backend-production.up.railway.app';
const RH_TOKEN = import.meta.env.VITE_API_RH_TOKEN || '';

export async function fetchRh(path) {
  const res = await fetch(`${API_URL}/api/rh${path}`, {
    headers: { Authorization: `Bearer ${RH_TOKEN}` },
  });
  if (res.status === 401) {
    throw new Error('API RH : jeton absent ou invalide (VITE_API_RH_TOKEN)');
  }
  if (!res.ok) throw new Error(`API RH : HTTP ${res.status}`);
  return res.json();
}
