/* Accès aux routes du Dash RH.
 *
 * CE CLIENT ENVOIE LA SESSION DE LA PERSONNE, plus un secret partagé. Il a
 * porté VITE_API_RH_TOKEN jusqu'au 26/10, et c'était une faille : un paquet
 * JavaScript se télécharge sans se connecter, donc le secret se lisait en
 * clair dans les sources de la page. Qui connaissait l'adresse pouvait appeler
 * l'API RH sans compte, et y lire des noms, des salaires et des motifs de
 * départ. Le serveur relit maintenant les droits du porteur du jeton à chaque
 * appel.
 *
 * FICHIER TOUJOURS SÉPARÉ DE services/api.js, et c'est toujours volontaire :
 * le client commun porte VITE_API_READ_TOKEN, le secret partagé qui ouvre les
 * routes commerciales. Les deux mondes ne partagent pas de mécanisme, et le
 * jour où le commercial passera lui aussi derrière la session, c'est ce
 * fichier-ci qui servira de modèle.
 *
 * LA CLÉ DU STOCKAGE EST CELLE D'AuthContext, écrite une seule fois là-bas.
 * Elle n'est pas importée pour ne pas tirer tout le contexte dans un module de
 * service : si elle change, elle change aux deux endroits, et le commentaire
 * de AuthContext le dit.
 *
 * LA RETOMBÉE SUR .env.rh N'EST PAS UN OUBLI. VITE_API_RH_TOKEN reste lu, mais
 * SEULEMENT en développement, pour le harnais d'aperçu local qui monte une vue
 * sans session. Vercel ne porte plus cette variable, ni en production ni en
 * recette : `npm run verif:rh` casse la construction si le secret se retrouve
 * dans le paquet livré.
 */
const API_URL  = import.meta.env.VITE_API_URL || 'https://dashboard-ma-backend-production.up.railway.app';
const JETON_OUTILLAGE = import.meta.env.DEV ? (import.meta.env.VITE_API_RH_TOKEN || '') : '';

function jetonDeSession() {
  try {
    return localStorage.getItem('ma_token') || '';
  } catch {
    /* Navigateur en navigation privée stricte, ou stockage refusé : on
       retombe sur l'absence de jeton, et l'appel renverra 401 avec un message
       lisible plutôt qu'une exception opaque. */
    return '';
  }
}

export async function fetchRh(path) {
  const jeton = jetonDeSession() || JETON_OUTILLAGE;
  const res = await fetch(`${API_URL}/api/rh${path}`, {
    headers: { Authorization: `Bearer ${jeton}` },
  });
  if (res.status === 401) {
    throw new Error('Session expirée ou absente : reconnectez-vous pour lire les données RH.');
  }
  if (res.status === 403) {
    throw new Error("Le Dash RH n'est pas ouvert à ce compte.");
  }
  if (!res.ok) throw new Error(`API RH : HTTP ${res.status}`);
  return res.json();
}
