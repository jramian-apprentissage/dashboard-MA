/* Accès unique à l'API backend (Railway).
   Par défaut on vise la prod ; en dev, .env.local pointe sur localhost:3001. */
const API_URL   = import.meta.env.VITE_API_URL || 'https://dashboard-ma-backend-production.up.railway.app';
const API_TOKEN = import.meta.env.VITE_API_READ_TOKEN || '';

/* Après une mise à jour de Monday à la demande (voir MajMonday.jsx), les
   réponses déjà dans le cache du navigateur — max-age 60 s puis
   stale-while-revalidate 300 s, voir routes/api.js — montreraient encore
   l'état d'avant. Pendant les six minutes qui suivent, les lectures
   contournent donc ce cache. */
export const CLE_SYNCHRO_MONDAY = 'ma_synchro_monday';
const CONTOURNEMENT_CACHE_MS = 6 * 60 * 1000;

function modeCache() {
  try {
    const depuis = Date.now() - Number(sessionStorage.getItem(CLE_SYNCHRO_MONDAY) || 0);
    return depuis < CONTOURNEMENT_CACHE_MS ? 'reload' : 'default';
  } catch {
    return 'default';
  }
}

export async function fetchAPI(path) {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
    cache: modeCache(),
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

/* Assistante IA (Claude, côté backend).

   La réponse arrive en flux (SSE) : `onDelta` est appelé à chaque fragment
   de texte, ce qui permet d'afficher la réponse au fur et à mesure plutôt
   qu'après plusieurs secondes d'attente. Résout {ok, error} à la fin.

   Pas d'EventSource : l'API ne gère que GET et ne permet pas d'en-tête
   Authorization — on lit donc le flux à la main depuis fetch. */
export const ai = {
  async chat(payload, onDelta) {
    let res;
    try {
      res = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(payload || {}),
      });
    } catch {
      return { ok: false, error: 'Connexion au serveur impossible.' };
    }

    // Erreur avant l'ouverture du flux (clé absente, quota) : réponse JSON.
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || `Erreur ${res.status}` };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let erreur = null;

    // Trame SSE : "event: <nom>\ndata: <json>\n\n". On accumule jusqu'à
    // trouver un séparateur \n\n, le reste attend le prochain chunk (un
    // événement peut être coupé en deux par le réseau).
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const trame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        const event = trame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
        const brut  = trame.match(/^data:\s*(.*)$/m)?.[1];
        if (!brut) continue;

        let data;
        try { data = JSON.parse(brut); } catch { continue; }

        if (event === 'delta' && data.text) onDelta?.(data.text);
        else if (event === 'refusal') onDelta?.(data.text);
        else if (event === 'error') erreur = data.error;
      }
    }

    return erreur ? { ok: false, error: erreur } : { ok: true };
  },
};

// Reporting CloudTalk — proxy backend vers les webhooks n8n existants.
export const cloudtalk = {
  calculer: payload => postAPI('/cloudtalk/calculer', payload),
  colonnes: client => postAPI('/cloudtalk/colonnes', { client }),
  ecrire: (client, column, values) => postAPI('/cloudtalk/ecrire', { client, column, values }),
};
