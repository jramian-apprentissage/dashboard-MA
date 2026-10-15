// Étend la règle de fin de campagne aux statuts « En pause » et « En cours télépro ».
//
// AUJOURD'HUI, les quatre workflows CloudTalk ne testent qu'un statut commençant
// par TERMIN dans la colonne D de l'onglet Test. Diag IA (Fin TLM 15/09/2026,
// statut « En pause ») et Cmonjardinier (Fin TLM 23/07/2026, statut « En cours
// télépro ») continuent donc d'alimenter les indicateurs TLM.
//
// DEMANDÉ PAR JIMMY le 05/10/2026 :
//   - « En pause » et « En cours télépro » s'arrêtent à leur Fin TLM,
//   - mais SEULEMENT si la date est renseignée : une case G oubliée ne doit pas
//     effacer l'historique d'un client. « Terminée » garde sa règle du 15/09,
//     où l'absence de date masque la campagne entière.
//
// L'ACCENT EST LE PIÈGE : normalize() du workflow met en majuscules et retire
// les espaces, mais pas les diacritiques. « En cours télépro » devient
// ENCOURSTÉLÉPRO et ne peut pas être comparé à ENCOURSTELEPRO. Le patch pose
// donc son propre statutTLM() qui décompose en NFD et retire les accents, comme
// le fait déjà isFicheCompletee() pour le statut du formulaire.
//
// Usage :
//   node scripts/n8n-statut-pause.mjs --dry        (diff sur les sauvegardes locales)
//   N8N_API_KEY=... node scripts/n8n-statut-pause.mjs   (lit, sauvegarde, publie)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const BACKUPS = join(ICI, '..', 'server', 'backups');
const BASE = process.env.N8N_URL || 'https://n8n-production-c03fd.up.railway.app';
const CLE = process.env.N8N_API_KEY;
const DRY = process.argv.includes('--dry');

// nom exact du workflow -> sauvegarde locale la plus récente, pour le dry-run
const WORKFLOWS = [
  ['Ingestion Quotidienne CloudTalk', '2026-09-17-n8n-ingestion-quotidienne-APRES-cr-tlm.json'],
  ['RATTRAPAGE - Ingestion CloudTalk', '2026-09-17-n8n-rattrapage-APRES-cr-tlm.json'],
  ['Reporting CloudTalk - App (Webhook)', '2026-09-15-n8n-bouton-extraire-APRES-statut-fin-tlm.json'],
  ['Reporting Hebdo CloudTalk', '2026-09-15-n8n-hebdo-APRES-statut-fin-tlm.json'],
];

const ANCIEN_COURT = `  if (idxStatut >= 0 && normalize(row[idxStatut]).startsWith("TERMIN")) {
    const fin = parseFinTLM(row[idxFinTLM]);
    if (!fin || fin < periodFrom) continue;
  }`;

const ANCIEN_LONG = `  if (idxStatut >= 0 && normalize(row[idxStatut]).startsWith("TERMIN")) {
    const fin = parseFinTLM(row[idxFinTLM]);
    if (!fin || fin < periodFrom) continue;
    finTLMParClient[initial] = fin;
  }`;

function nouveau(avecPlafond) {
  return `  // Fin de campagne (règle étendue le 05/10/2026) : « Terminée », « En pause » et
  // « En cours télépro » s'arrêtent à leur date « Fin TLM ». Une « Terminée » sans
  // date reste masquée (règle du 15/09) ; une « En pause » ou une « En cours télépro »
  // sans date continue de compter, pour qu'une case oubliée n'efface pas un historique.
  const statutLigne = idxStatut >= 0 ? statutTLM(row[idxStatut]) : "";
  const estTerminee = statutLigne.startsWith("TERMIN");
  const estSuspendue = statutLigne.startsWith("ENPAUSE") || statutLigne.startsWith("ENCOURSTELEPRO");
  if (estTerminee || estSuspendue) {
    const fin = parseFinTLM(row[idxFinTLM]);
    if (estTerminee && !fin) continue;
    if (fin && fin < periodFrom) continue;${avecPlafond ? `
    if (fin) finTLMParClient[initial] = fin;` : ''}
  }`;
}

// posé juste avant la boucle, à côté de parseFinTLM
const HELPER = `
// normalize() ne retire pas les accents : « En cours télépro » deviendrait
// ENCOURSTÉLÉPRO et ne serait jamais reconnu. On décompose en NFD d'abord.
function statutTLM(v) {
  return String(v || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().replace(/\\s+/g, "");
}
`;

function patcher(nomWorkflow, corps) {
  const noeud = corps.nodes.find((n) => n.name === 'Calculer indicateurs par campagne');
  if (!noeud) throw new Error(`${nomWorkflow} : nœud « Calculer indicateurs par campagne » introuvable`);
  let js = noeud.parameters.jsCode;

  if (js.includes('statutTLM')) return { js, change: false };

  const avecPlafond = js.includes('finTLMParClient[initial] = fin;');
  const ancien = avecPlafond ? ANCIEN_LONG : ANCIEN_COURT;
  if (!js.includes(ancien)) {
    throw new Error(`${nomWorkflow} : le bloc de statut attendu n'a pas été retrouvé, le workflow a changé depuis la sauvegarde`);
  }
  js = js.replace(ancien, nouveau(avecPlafond));

  // le helper se pose juste après parseFinTLM, qu'il accompagne
  const ancre = js.indexOf('const normToCanonical = {};');
  if (ancre === -1) throw new Error(`${nomWorkflow} : ancre du helper introuvable`);
  js = js.slice(0, ancre) + HELPER.trimStart() + '\n' + js.slice(ancre);

  noeud.parameters.jsCode = js;
  return { js, change: true };
}

async function api(chemin, options = {}) {
  const r = await fetch(`${BASE}/api/v1${chemin}`, {
    ...options,
    headers: { 'X-N8N-API-KEY': CLE, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!r.ok) throw new Error(`${options.method || 'GET'} ${chemin} : ${r.status} ${await r.text()}`);
  return r.json();
}

if (DRY) {
  for (const [nom, fichier] of WORKFLOWS) {
    const corps = JSON.parse(readFileSync(join(BACKUPS, fichier), 'utf8'));
    const { js, change } = patcher(nom, corps);
    const i = js.indexOf('function statutTLM');
    const j = js.indexOf('const prefixToTags');
    console.log('='.repeat(78));
    console.log(nom, change ? '' : '  (déjà à jour)');
    console.log('='.repeat(78));
    console.log(js.slice(i, j).trimEnd());
    console.log();
  }
  console.log('Dry-run sur les sauvegardes locales. Rien n\'a été publié.');
} else {
  if (!CLE) {
    console.error('N8N_API_KEY manquante. Sans clé, ne rien créer en base : demander la clé.');
    process.exit(1);
  }
  const horodatage = new Date().toISOString().slice(0, 10);
  mkdirSync(BACKUPS, { recursive: true });
  const tous = await api('/workflows?limit=250');
  for (const [nom] of WORKFLOWS) {
    const w = (tous.data || []).find((x) => x.name === nom);
    if (!w) throw new Error(`workflow « ${nom} » introuvable sur l'instance`);
    const complet = await api(`/workflows/${w.id}`);
    const slug = nom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    writeFileSync(join(BACKUPS, `${horodatage}-n8n-${slug}-AVANT-statut-pause.json`),
      JSON.stringify({ name: complet.name, nodes: complet.nodes, connections: complet.connections, settings: complet.settings }, null, 2));

    const corps = { name: complet.name, nodes: complet.nodes, connections: complet.connections, settings: complet.settings };
    const { change } = patcher(nom, corps);
    if (!change) { console.log(`${nom} : déjà à jour, rien à publier`); continue; }

    writeFileSync(join(BACKUPS, `${horodatage}-n8n-${slug}-APRES-statut-pause.json`), JSON.stringify(corps, null, 2));
    const avant = complet.activeVersionId;
    await api(`/workflows/${w.id}`, { method: 'PUT', body: JSON.stringify(corps) });
    const apres = (await api(`/workflows/${w.id}`)).activeVersionId;
    if (complet.active && avant === apres) {
      throw new Error(`${nom} : activeVersionId inchangé (${avant}), la publication n'a pas pris. Voir n8n-debloquer.mjs.`);
    }
    console.log(`${nom} : publié, activeVersionId ${avant} -> ${apres}`);
  }
}
