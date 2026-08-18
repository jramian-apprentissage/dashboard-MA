// ─── CSV Parser ─────────────────────────────────────────────────────────────
import { partPct, fmtPourcentage } from '../utils/formatNumber';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null;
  str = str.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str))
    return new Date(str.slice(0, 10));
  if (str.includes('/')) {
    const [a, b, c] = str.split('/');
    if (a.length === 4) return new Date(`${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`);
    if (parseInt(a, 10) > 12) return new Date(`${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`);
    return new Date(`${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`);
  }
  return new Date(str);
}

function toMidnight(d) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

// ─── Tag helpers ─────────────────────────────────────────────────────────────
// Tags: "OK - RDV", "PI - Refus catégorique", "INJ - NRP", "CNA - A rappeler",
//       "HC - Hors cible" — can be comma/semi-colon separated in one cell.
//
// Catégories :
//   OK  → RDV pris
//   PI  → Pas intéressé
//   INJ → Injoignable
//   CNA → Contact non argumenté
//   HC  → Hors cible
//
// Contact argumenté = OK + PI

function hasTagCat(tags, cat) {
  if (!tags) return false;
  return tags.split(/[,;|]/).some(t => t.trim().toUpperCase().startsWith(cat.toUpperCase()));
}

// Match un tag précis (pas juste sa catégorie à 2-3 lettres), tolérant aux
// espaces variables autour du tiret ("CNA - Mail", "CNA -Mail", "CNA- Mail").
function hasTagPrefix(tags, prefix) {
  if (!tags) return false;
  const norm = s => s.trim().toUpperCase().replace(/\s*-\s*/g, ' - ');
  const target = norm(prefix);
  return tags.split(/[,;|]/).some(t => norm(t).startsWith(target));
}

// Collaborateurs à exclure du filtre "Tous" (pas des commerciaux Sales)
const EXCLUDED_COLLABS = ['Entrant', 'Management'];

function isExcluded(collab) {
  return EXCLUDED_COLLABS.some(ex => collab?.toLowerCase().includes(ex.toLowerCase()));
}

// ─── Column indices (0-based, A=0) ──────────────────────────────────────────
// E = 4 : durée en secondes
// G = 6 : date d'appel
// H = 7 : tranche horaire (ex : "09:00", "15:00")
// L = 11: tags
// N = 13: collaborateur

const COL = { DURATION: 4, DATE: 6, HEURE: 7, TAGS: 11, COLLAB: 13 };

// ─── Parse raw CSV text → array of row objects ───────────────────────────────

export function parseSheetCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  return lines.slice(1)
    .map(line => {
      const cols = parseCSVLine(line);
      return {
        duration: parseInt(cols[COL.DURATION], 10) || 0,
        date:     cols[COL.DATE]   || '',
        heure:    cols[COL.HEURE]  || '',
        tags:     cols[COL.TAGS]   || '',
        collab:   (cols[COL.COLLAB] || '').trim(),
      };
    })
    .filter(r => r.date && r.collab);
}

// ─── Catégories de tags ──────────────────────────────────────────────────────
// Nom complet d'abord, abréviation entre parenthèses ensuite — plus lisible
// que l'abréviation en tête (retour direct : "légende trop longue, CNA/ING
// illisible").
export const TAG_CATEGORIES = [
  { key: 'OK',  label: 'RDV pris (OK)',               color: 'rgba(142,207,170,0.8)' },
  { key: 'PI',  label: 'Pas intéressé (PI)',           color: 'rgba(255,249,147,0.7)' },
  { key: 'CNA', label: 'Contact non argumenté (CNA)', color: 'rgba(123,170,191,0.6)' },
  { key: 'INJ', label: 'Injoignable (INJ)',            color: 'rgba(167,173,170,0.5)' },
  { key: 'HC',  label: 'Hors cible (HC)',             color: 'rgba(196,135,106,0.55)' },
  { key: '',    label: 'Sans tag',                     color: 'rgba(227,225,216,0.9)' },
];

// ─── Compute KPIs + tranches from parsed rows ────────────────────────────────

export function computeSalesData(rows, dateFrom, dateTo, collab) {
  const from = dateFrom ? toMidnight(dateFrom) : null;
  const to   = dateTo   ? toMidnight(dateTo)   : null;

  const filtered = rows.filter(row => {
    const d = parseDate(row.date);
    if (!d) return false;
    const day = toMidnight(d);
    if (from && day < from) return false;
    if (to   && day > to)   return false;
    if (collab && collab !== 'Tous') {
      if (row.collab !== collab) return false;
    } else {
      // "Tous" : exclure Entrant & Management
      if (isExcluded(row.collab)) return false;
    }
    return true;
  });

  const total = filtered.length;

  /* Décroché = quelqu'un a répondu. C'est le statut Ringover qui le dit, PAS
     la durée : `duration` est le total_duration de l'API, sonnerie comprise.
     Sur l'archive complète, 3 670 appels CANCELLED, 1 558 MISSED et 865
     FAILED dépassent la seconde sans qu'aucun interlocuteur n'ait décroché.
     Un seuil de durée mesurerait donc la patience de l'agent, pas la
     joignabilité.

     Ce point corrige aussi la mesure précédente : « décroché » valait
     `duration > 30`, ce qui comptait 1 617 appels jamais décrochés — dont
     282 messageries vocales — comme des conversations de plus de 30
     secondes. La joignabilité affichée en était faussée.

     VOICEMAIL reste exclu : la boîte vocale n'est pas un interlocuteur. */
  const estDecroche = r => r.statut === 'ANSWERED';
  const decroches = filtered.filter(estDecroche).length;

  /* Second palier, sur le modèle du TLM (décision de Christophe, 14/08) : le
     décroché dit que la jonction a eu lieu, l'échange de plus de 30 secondes
     dit qu'il s'est passé quelque chose.

     On mesure sur `conversation` (incall_duration Ringover) et non sur
     `duration` (total_duration) : ce dernier additionne sonnerie, attente,
     serveur vocal et post-appel. Sur 1 000 appels échantillonnés, il
     surestimait de 27 % le nombre d'échanges de plus de 30 secondes — un
     appel décroché affichait 43 s au total pour 11 s de conversation réelle.

     Repli sur `duration` pour les lignes antérieures à la migration 027, qui
     n'ont pas encore la conversation : mieux vaut la vieille mesure que zéro. */
  const dureeEchange = r => (r.conversation ?? r.duration ?? 0);
  /* Deux seuils, comme sur le TLM : au-delà d'une seconde la jonction a eu
     lieu, au-delà de trente il s'est passé quelque chose. Le seuil à 1 s n'a
     de sens QUE depuis qu'on dispose de la durée de conversation (migration
     027) : sur `total_duration`, qui inclut la sonnerie, il aurait compté des
     appels jamais décrochés. La condition sur le statut le protège de toute
     façon, y compris sur l'historique antérieur au repli. */
  const echanges1s  = filtered.filter(r => estDecroche(r) && dureeEchange(r) > 1).length;
  const echanges30s = filtered.filter(r => estDecroche(r) && dureeEchange(r) > 30).length;

  // Contact argumenté = OK (RDV pris) + PI (Pas intéressé) — le prospect a écouté le pitch
  const argues = filtered.filter(r => hasTagCat(r.tags, 'OK') || hasTagCat(r.tags, 'PI')).length;
  const rdv    = filtered.filter(r => hasTagCat(r.tags, 'OK')).length;
  // Fiche exploitable = argumenté (OK/PI) + CNA - Mail (contact non argumenté
  // au téléphone mais dont l'échange par mail a permis de récupérer une info).
  const fichesExploitables = filtered.filter(r =>
    hasTagCat(r.tags, 'OK') || hasTagCat(r.tags, 'PI') || hasTagPrefix(r.tags, 'CNA - Mail')
  ).length;

  // Tranches horaires
  const trancheMap = {};
  filtered.forEach(r => {
    const t = r.heure || '?';
    if (!trancheMap[t]) trancheMap[t] = { appels: 0, decroche: 0, echange30s: 0, rdv: 0, agents: {} };
    trancheMap[t].appels++;
    /* Même définition que la carte « Échanges > 1s » : décroché ET plus
       d'une seconde de conversation. Le graphe portait auparavant le statut
       seul, ce qui donnait deux mesures différentes sous un même nom. */
    if (estDecroche(r) && dureeEchange(r) > 1) trancheMap[t].decroche++;
    if (estDecroche(r) && dureeEchange(r) > 30) trancheMap[t].echange30s++;
    if (hasTagCat(r.tags, 'OK')) trancheMap[t].rdv++;

    /* Ventilation par agent de chaque tranche (demande de Christophe, 14/08).
       L'agrégat seul ne dit pas si un creux de joignabilité à 14h vient de
       toute l'équipe ou d'une seule personne : sans le détail, la tranche se
       lit mais ne s'explique pas. */
    const nom = r.collab || '(sans agent)';
    if (!trancheMap[t].agents[nom]) trancheMap[t].agents[nom] = { appels: 0, decroche: 0, rdv: 0 };
    trancheMap[t].agents[nom].appels++;
    if (estDecroche(r) && dureeEchange(r) > 1) trancheMap[t].agents[nom].decroche++;
    if (hasTagCat(r.tags, 'OK')) trancheMap[t].agents[nom].rdv++;
  });

  const tranches = Object.entries(trancheMap)
    .sort(([a], [b]) => {
      const ha = parseInt(a.split(':')[0], 10) || 0;
      const hb = parseInt(b.split(':')[0], 10) || 0;
      return ha - hb;
    })
    .map(([t, v]) => ({
      t,
      appels: v.appels,
      join:   partPct(v.decroche, v.appels),
      // Part des appels décrochés qui ont donné plus de 30 secondes d'échange.
      echange30s: partPct(v.echange30s, v.appels),
      rdv:    v.rdv,
      // Trié par volume : au survol, on veut voir d'abord qui porte la tranche.
      agents: Object.entries(v.agents)
        .map(([nom, a]) => ({
          nom,
          appels: a.appels,
          join:   partPct(a.decroche, a.appels),
          rdv:    a.rdv,
        }))
        .sort((a, b) => b.appels - a.appels),
    }));

  // Collabs list : exclure Entrant & Management
  const collabs = ['Tous', ...Array.from(
    new Set(rows.map(r => r.collab).filter(c => c && !isExcluded(c)))
  ).sort()];

  // ── Statistiques par catégorie de tag (5 grandes catégories) ──────────────
  const categStats = TAG_CATEGORIES.map(cat => {
    const count = cat.key
      ? filtered.filter(r => hasTagCat(r.tags, cat.key)).length
      : filtered.filter(r => !r.tags || r.tags.trim() === '').length;
    return { ...cat, count, pct: partPct(count, total) };
  }).filter(c => c.count > 0);

  // ── Statistiques par tag individuel (liste complète) ─────────────────────
  const tagMap = {};
  filtered.forEach(r => {
    const parts = r.tags
      ? r.tags.split(/[,;|]/).map(t => t.trim()).filter(Boolean)
      : [];
    if (parts.length === 0) {
      tagMap['(sans tag)'] = (tagMap['(sans tag)'] || 0) + 1;
    } else {
      parts.forEach(tag => { tagMap[tag] = (tagMap[tag] || 0) + 1; });
    }
  });
  const tagStats = Object.entries(tagMap)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count, pct: partPct(count, total) }));

  // ── Statistiques par collaborateur ──────────────────────────────────────────
  const collabStats = {};
  filtered.forEach(r => {
    if (!collabStats[r.collab]) collabStats[r.collab] = { appels: 0, decroche: 0, echange1s: 0, echange30s: 0, argues: 0, fichesExploitables: 0 };
    collabStats[r.collab].appels++;
    if (estDecroche(r)) collabStats[r.collab].decroche++;
    if (estDecroche(r) && dureeEchange(r) > 1) collabStats[r.collab].echange1s++;
    if (estDecroche(r) && dureeEchange(r) > 30) collabStats[r.collab].echange30s++;
    const estArgue = hasTagCat(r.tags, 'OK') || hasTagCat(r.tags, 'PI');
    if (estArgue) collabStats[r.collab].argues++;
    if (estArgue || hasTagPrefix(r.tags, 'CNA - Mail')) collabStats[r.collab].fichesExploitables++;
  });
  /* Le détail par collaborateur porte EXACTEMENT les mêmes paliers que les
     cartes d'en-tête, et dans le même ordre : appels émis, décrochés,
     échanges > 30 s, argumentés, fiches exploitables (décision de Jimmy,
     15/08 — c'est le jeu d'indicateurs qu'on reprendra pour tous les tableaux
     par collaborateur). Les volumes servent l'affichage, les taux restent
     disponibles pour le tri et la colorisation. */
  const perCollab = Object.fromEntries(
    Object.entries(collabStats).map(([name, v]) => [name, {
      appels: v.appels,
      decroches: v.decroche,
      echanges1s: v.echange1s,
      echanges30s: v.echange30s,
      argues: v.argues,
      fichesExploitables: v.fichesExploitables,
      tauxFichesExploit: partPct(v.fichesExploitables, v.appels),
      // `taux` = taux de décroché. Conservé sous ce nom pour ne pas casser le
      // tri du tableau par collaborateur, mais il mesure désormais le statut
      // et non plus une durée.
      taux:   v.appels > 0 ? fmtPourcentage(partPct(v.decroche, v.appels)) : '—',
      tauxEchange30s: partPct(v.echange30s, v.appels),
    }])
  );

  return {
    total, decroches, echanges1s, echanges30s, argues, fichesExploitables, rdv,
    tranches, collabs, categStats, tagStats, perCollab,
  };
}

// ─── ASUS (client) ───────────────────────────────────────────────────────────
// Périmètre dédié : agents Ando/Miantsa/Hasina, archive Ringover filtrée côté
// backend (/api/ringover/asus). Les tags sont utilisés tels quels — pas de
// préfixe "CAT - sous-type" à parser comme pour l'équipe Mon Ambassadeur,
// Jimmy a confirmé qu'ils sont déjà nommés comme les indicateurs voulus.

// `tags` = variantes réelles envoyées par Ringover pour cette catégorie —
// plusieurs orthographes possibles pour un même tag (ex. "Pas intéresser"
// puis "Pas intéressé" après correction du libellé dans Ringover début
// août 2026 : l'archive garde l'ancienne orthographe sur les appels déjà
// tagués, il faut donc matcher les deux indéfiniment). `prefix: true` pour
// un tag composite du type "NRP : non attribué / hors service / faux
// numéro", dont seul le préfixe avant les deux-points est stable.
// Ordre d'affichage demandé par Jimmy : les tags "qualifiants" (résultat de
// l'appel) d'abord, les tags "techniques" (répondeur/NRP/sans tag) ensuite —
// "Sans tag" reste toujours en toute dernière position (ajouté par
// statsDirection/buildTagCards, pas dans cette liste).
/* `label` est le texte affiché, `tags` les valeurs brutes Ringover à matcher.
   Les libellés sont au pluriel : une carte porte un NOMBRE d'appels, pas un
   tag. « Appels sortants : 12 » puis « Vente gagnée : 2 » juste à côté se
   contredisaient (retour de Clémence, 14/08). Les invariants restent tels
   quels — « Rendez-vous » et le sigle « NRP » ne se pluralisent pas. */
export const ASUS_TAGS_SORTANT = [
  { label: 'Opportunités détectées', tags: ['Opportunité détectée'] },
  { label: 'Envois catalogue',       tags: ['Envoi catalogue', 'Envoie catalogue'] },
  { label: 'Rendez-vous',            tags: ['Rendez-vous'] },
  { label: 'Ventes gagnées',         tags: ['Vente gagnée'] },
  { label: 'Ventes perdues',         tags: ['Vente perdue'] },
  { label: 'Rappels',                tags: ['Rappel'] },
  { label: 'Répondeurs',             tags: ['Répondeur'], technique: true },
  { label: 'NRP',                    tags: ['NRP'], prefix: true, technique: true },
  { label: 'Pas intéressés',         tags: ['Pas intéressé', 'Pas intéresser'] },
];
export const ASUS_TAGS_ENTRANT = [
  { label: 'Opportunités détectées', tags: ['Opportunité détectée'] },
  { label: 'Envois catalogue',       tags: ['Envoi catalogue', 'Envoie catalogue'] },
  { label: 'Rendez-vous',            tags: ['Rendez-vous'] },
  { label: 'Ventes gagnées',         tags: ['Vente gagnée'] },
  { label: 'Ventes perdues',         tags: ['Vente perdue'] },
  { label: 'Rappels',                tags: ['Rappel'] },
  { label: 'Pas intéressés',         tags: ['Pas intéressé', 'Pas intéresser'] },
];

const BON_APPEL_SECONDES = 300; // 5 min — seuil convenu avec Jimmy

function normTag(s) {
  return (s || '').trim().toLowerCase();
}

function statsDirection(rows, direction, tagDefs) {
  const set = rows.filter(r => r.direction === direction);
  const matchesTag = (r, def) => {
    const t = normTag(r.tag);
    return def.tags.some(tag => {
      const m = normTag(tag);
      return def.prefix ? t.startsWith(m) : t === m;
    });
  };
  const parTag = tagDefs.map(def => ({
    label: def.label,
    count: set.filter(r => matchesTag(r, def)).length,
    // `technique` distingue les qualifications commerciales (ce que l'appel a
    // produit) des issues techniques (personne au bout du fil). L'affichage
    // les sépare en deux groupes : mélangés, les répondeurs et NRP dominent
    // le volume et enterrent les tags qui portent l'information business.
    technique: !!def.technique,
  }));
  const sansTag = set.filter(r => !r.tag || !tagDefs.some(def => matchesTag(r, def))).length;
  return { total: set.length, parTag, sansTag };
}

export function computeAsusData(rows, dateFrom, dateTo, collab = 'Tous') {
  const from = dateFrom ? toMidnight(dateFrom) : null;
  const to   = dateTo   ? toMidnight(dateTo)   : null;

  const filtered = rows.filter(row => {
    const d = parseDate(row.date);
    if (!d) return false;
    const day = toMidnight(d);
    if (from && day < from) return false;
    if (to   && day > to)   return false;
    if (collab && collab !== 'Tous' && row.collab !== collab) return false;
    return true;
  });

  const sortant = statsDirection(filtered, 'out', ASUS_TAGS_SORTANT);
  const entrant = statsDirection(filtered, 'in',  ASUS_TAGS_ENTRANT);

  const totalAppels    = filtered.length;

  /* TMC = temps moyen de COMMUNICATION. Le libellé disait donc déjà ce qu'il
     fallait mesurer, mais le calcul portait sur `duration` — le
     total_duration de Ringover, qui additionne sonnerie, file d'attente,
     mise en attente, serveur vocal et post-appel. Sur les appels décrochés,
     l'écart moyen est de 10 secondes ; un appel affichait 43 s au total pour
     11 s de conversation réelle.
     Idem pour les « bons appels » : cinq minutes de ligne ouverte ne sont pas
     cinq minutes d'échange.
     Repli sur `duration` pour l'historique antérieur à la migration 027, qui
     n'a pas la conversation — mieux vaut l'ancienne mesure que zéro. */
  const dureeComm      = r => (r.conversation ?? r.duration ?? 0);
  const dureeMoyenneS  = totalAppels ? Math.round(filtered.reduce((s, r) => s + dureeComm(r), 0) / totalAppels) : 0;
  const bonsAppels     = filtered.filter(r => dureeComm(r) >= BON_APPEL_SECONDES).length;
  const tauxBons       = partPct(bonsAppels, totalAppels);

  // TMC par sens — même donnée que sortant.total/entrant.total, calculée à
  // part pour ne pas faire dépendre computeAsusData() du contenu de parTag.
  const dureeMoyenne = (direction) => {
    const set = filtered.filter(r => r.direction === direction);
    return set.length ? Math.round(set.reduce((s, r) => s + dureeComm(r), 0) / set.length) : 0;
  };
  const dureeMoyenneSortantS = dureeMoyenne('out');
  const dureeMoyenneEntrantS = dureeMoyenne('in');

  // Répartition "abouti / non abouti" (sortant) et "décroché / manqué"
  // (entrant) — sur le statut Ringover (`statut`), pas sur la durée : la
  // durée n'est pas un signal fiable ici (des appels non aboutis ont une
  // durée non nulle dans cette archive). Définitions et valeurs vérifiées
  // directement auprès de Jimmy contre le rapport Ringover réel de juillet :
  //   Aboutis (sortant)    = ANSWERED
  //   Non aboutis (sortant) = CANCELLED + FAILED
  //   Décrochés (entrant)   = ANSWERED
  //   Manqués (entrant)     = MISSED + VOICEMAIL (le standard ASUS compte le
  //                           répondeur comme manqué, pas comme décroché)
  // Alimente le donut "Nombre total d'appels" (vision globale sortant+entrant).
  const sortantRows = filtered.filter(r => r.direction === 'out');
  const entrantRows = filtered.filter(r => r.direction === 'in');
  const aboutis    = sortantRows.filter(r => r.statut === 'ANSWERED').length;
  const nonAboutis = sortantRows.filter(r => r.statut === 'CANCELLED' || r.statut === 'FAILED').length;
  const decroches  = entrantRows.filter(r => r.statut === 'ANSWERED').length;
  const manques    = entrantRows.filter(r => r.statut === 'MISSED' || r.statut === 'VOICEMAIL').length;

  const collabs = ['Tous', ...Array.from(new Set(rows.map(r => r.collab).filter(Boolean))).sort()];

  // Statistiques par collaborateur — tableau du bas + détail au clic sur
  // "Appels sortants/entrants" (répartition par qualification, réutilise
  // buildTagCards côté page).
  const perCollab = {};
  Array.from(new Set(filtered.map(r => r.collab).filter(Boolean))).forEach(name => {
    const rowsC = filtered.filter(r => r.collab === name);
    const totalC = rowsC.length;
    perCollab[name] = {
      sortant:       statsDirection(rowsC, 'out', ASUS_TAGS_SORTANT),
      entrant:       statsDirection(rowsC, 'in',  ASUS_TAGS_ENTRANT),
      totalAppels:   totalC,
      // Même mesure que le TMC global : la communication, pas la ligne ouverte.
      dureeMoyenneS: totalC ? Math.round(rowsC.reduce((s, r) => s + dureeComm(r), 0) / totalC) : 0,
      bonsAppels:    rowsC.filter(r => dureeComm(r) >= BON_APPEL_SECONDES).length,
    };
  });

  return { sortant, entrant, totalAppels, dureeMoyenneS, dureeMoyenneSortantS, dureeMoyenneEntrantS, bonsAppels, tauxBons, aboutis, nonAboutis, decroches, manques, collabs, perCollab };
}

function dateKeyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mondayOf(d) {
  const day = d.getDay() || 7; // dimanche (0) -> 7
  const m = new Date(d);
  m.setDate(d.getDate() - day + 1);
  return m;
}

// Évolution du nombre d'appels — fenêtre glissante propre au graphe (7
// derniers jours / 4 dernières semaines / 6 derniers mois), indépendante du
// sélecteur de période de la page.
// Dernier jour réellement présent dans l'archive (format DD/MM) — reflète la
// fraîcheur réelle des données, indépendamment de l'heure de la requête
// (qui ne dit rien sur la fraîcheur, l'archive n'étant synchronisée qu'1x/j)
// et du filtre de période courant (qui peut être vide, ex. "Aujourd'hui"
// avant la synchro du soir).
export function dernierJourArchive(rows) {
  if (!rows || !rows.length) return null;
  const max = rows.reduce((m, r) => (r.date > m ? r.date : m), rows[0].date);
  const [, mo, d] = max.split('-');
  return `${d}/${mo}`;
}

/* Fenêtre glissante de N mois se terminant au mois de `fin`.
 *
 * `fin` est la FIN DE LA PÉRIODE de référence ('YYYY-MM-DD'), pas la date du
 * jour : sur « mois précédent » en août, on veut février→juillet et non
 * mars→août (demande de Jimmy, 18/08). Repli sur aujourd'hui pour tout
 * appelant non migré.
 *
 * Factorisé parce que trois graphes construisaient ce bloc à l'identique, et
 * que deux d'entre eux alimentent la MÊME carte en partageant un seul jeu de
 * libellés : un écart d'ancre entre les deux aurait décalé une série d'un cran
 * sans rien casser de visible.
 *
 * L'année n'apparaît que si la fenêtre chevauche un 1er janvier — même règle
 * que côté serveur, pour que les deux ne divergent pas. */
export function cleMois(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function fenetreMois(n, fin) {
  const ancre = fin ? new Date(`${fin}T00:00:00`) : new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) months.push(new Date(ancre.getFullYear(), ancre.getMonth() - i, 1));
  const surDeuxAnnees = new Set(months.map(m => m.getFullYear())).size > 1;
  const format = surDeuxAnnees ? { month: 'short', year: '2-digit' } : { month: 'short' };
  return { months, labels: months.map(m => m.toLocaleString('fr-FR', format)) };
}

export function computeAsusEvolution(rows, granularity, collab = 'Tous', finPeriode) {
  const base = collab && collab !== 'Tous' ? rows.filter(r => r.collab === collab) : rows;
  /* Les TROIS granularités lisent cette même ancre : la bascule
     Journalier / Semaine / Mensuel ne doit pas changer de référentiel selon
     l'onglet cliqué. */
  const today = toMidnight(finPeriode ? new Date(`${finPeriode}T00:00:00`) : new Date());

  if (granularity === 'semaine') {
    const monday = mondayOf(today);
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(monday); start.setDate(start.getDate() - i * 7);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      weeks.push({ start, end });
    }
    return {
      labels: weeks.map(w => `${String(w.start.getDate()).padStart(2, '0')}/${String(w.start.getMonth() + 1).padStart(2, '0')}`),
      counts: weeks.map(w => base.filter(r => {
        const d = parseDate(r.date);
        return d && d >= w.start && d <= w.end;
      }).length),
    };
  }

  if (granularity === 'mois') {
    const { months, labels } = fenetreMois(6, finPeriode);
    return {
      labels,
      counts: months.map(m => base.filter(r => {
        const d = parseDate(r.date);
        return d && d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      }).length),
    };
  }

  // 'jour' (défaut) — 7 derniers jours, aujourd'hui inclus
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    days.push(d);
  }
  return {
    labels: days.map(d => d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })),
    counts: days.map(d => base.filter(r => r.date === dateKeyOf(d)).length),
  };
}

// ─── RDV ─────────────────────────────────────────────────────────────────────
// Les lignes ({date, time, collab, honore}) viennent de /api/rdv/rows —
// table Postgres remplacée chaque soir par le backend depuis le Google
// Sheet (voir server/src/rdvParser.js pour le parsing CSV, désormais
// côté serveur). parseRDVDate reste utilisé ici pour filtrer par plage de
// dates dans computeRDVData/computeRDVMonthlyEvolution/computeRDVStatsForRange.
// Formats tolérés pour l'historique : "DD.MM.YYYY", "DD/MM/YYYY", "YYYY-MM-DD"
function parseRDVDate(str) {
  if (!str) return null;
  const s = str.trim().split(' ')[0]; // partie date (avant l'éventuelle heure)
  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00');
    return isNaN(d) ? null : d;
  }
  // DD.MM.YYYY (format Google Sheets français avec points)
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('.');
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
    return isNaN(d) ? null : d;
  }
  // DD,MM,YYYY (saisie incorrecte avec virgules au lieu de points)
  if (/^\d{1,2},\d{1,2},\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split(',');
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
    return isNaN(d) ? null : d;
  }
  // DD/MM/YYYY (format français avec slashes)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
    return isNaN(d) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

export function computeRDVData(rdvRows, dateFrom, dateTo, collab, validCollabs) {
  const from = dateFrom ? toMidnight(dateFrom) : null;
  const to   = dateTo   ? toMidnight(dateTo)   : null;
  // validCollabs = Set ou Array des noms présents dans Ringover
  const validSet = new Set(validCollabs || []);

  const filtered = rdvRows.filter(row => {
    if (validSet.size > 0 && !validSet.has(row.collab)) return false;
    const d = parseRDVDate(row.date);
    if (!d) return false;
    const day = toMidnight(d);
    if (from && day < from) return false;
    if (to   && day > to)   return false;
    if (collab && collab !== 'Tous') {
      if (row.collab !== collab) return false;
    }
    return true;
  });

  const rdvPris    = filtered.length;
  const rdvHonores = filtered.filter(r => r.honore).length;
  const tauxHonores = partPct(rdvHonores, rdvPris);

  // ── Par collaborateur ──────────────────────────────────────────────────────
  const collabMap = {};
  filtered.forEach(r => {
    if (!collabMap[r.collab]) collabMap[r.collab] = { rdvPris: 0, rdvHonores: 0 };
    collabMap[r.collab].rdvPris++;
    if (r.honore) collabMap[r.collab].rdvHonores++;
  });

  // ── Évolution mensuelle ────────────────────────────────────────────────────
  const monthlyMap = {};
  filtered.forEach(r => {
    const d = parseRDVDate(r.date);
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });

  /* ── Par tranche horaire — quand le rendez-vous a été PRIS ────────────────
     r.time est l'heure de la colonne « Date de Création » de la feuille,
     tronquée à l'heure pleine pour se joindre aux tranches Ringover, qui sont
     elles aussi des clés « HH:00 » d'Europe/Paris.

     Ce byHour a longtemps ventilé les RDV sur l'heure du CRÉNEAU et non sur
     celle de la prise : le parseur serveur lisait la mauvaise colonne (voir
     server/src/rdvParser.js). Superposé aux tranches d'appels, ça revenait à
     coller « quand le client sera reçu » sur « quand le commercial a appelé »
     — sans que rien ne se voie, les créneaux s'étalant eux aussi de 9h à 18h.

     Une heure absente vaut null côté serveur et n'est comptée nulle part :
     mieux vaut une tranche manquante qu'une tranche fantôme à minuit. */
  const byHourMap = {};
  const byHourCollabMap = {};
  filtered.forEach(r => {
    const timePart = r.time?.trim();
    if (!timePart) return;
    const [hh] = timePart.split(':');
    if (!hh) return;
    const key = `${hh.padStart(2, '0')}:00`;
    byHourMap[key] = (byHourMap[key] || 0) + 1;
    // Ventilation par agent de chaque tranche : alimente l'infobulle du graphe
    // horaire, qui répond à « ce creux vient-il de toute l'équipe ? ».
    if (!byHourCollabMap[key]) byHourCollabMap[key] = {};
    byHourCollabMap[key][r.collab] = (byHourCollabMap[key][r.collab] || 0) + 1;
  });

  return {
    rdvPris, rdvHonores, tauxHonores,
    perCollab: collabMap,
    monthly: monthlyMap,
    byHour: byHourMap,
    byHourCollab: byHourCollabMap,
  };
}

// ── Évolution mensuelle des RDV, sur une fenêtre glissante des 6 derniers
// mois — indépendante de la période de référence sélectionnée sur la page
// (computeRDVData.monthly ne couvre que les RDV DANS la période choisie,
// souvent un seul mois : un "graphe d'évolution" à un seul point n'a aucun
// sens). Mêmes filtres collab/validCollabs que computeRDVData, mais jamais
// de borne de date.
export function computeRDVMonthlyEvolution(rdvRows, validCollabs, collab, finPeriode) {
  const validSet = new Set(validCollabs || []);
  const filtered = (rdvRows || []).filter(row => {
    if (validSet.size > 0 && !validSet.has(row.collab)) return false;
    if (collab && collab !== 'Tous' && row.collab !== collab) return false;
    return !!parseRDVDate(row.date);
  });

  const monthlyMap = {};
  filtered.forEach(r => {
    const d = parseRDVDate(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });

  const { months, labels } = fenetreMois(6, finPeriode);
  return {
    labels,
    // `|| 0` : un mois sans donnée vaut zéro, il n'est jamais sauté.
    counts: months.map(d => monthlyMap[cleMois(d)] || 0),
  };
}

// ── Évolution mensuelle des appels émis (archive Ringover), même fenêtre
// glissante de 6 mois que computeRDVMonthlyEvolution — permet de tracer
// "Appels émis" sur le même graphe que "RDV pris" (widget "Évolution
// mensuelle" de l'onglet Sales).
export function computeCallsMonthlyEvolution(rows, collab) {
  const filtered = (rows || []).filter(row => {
    if (!parseDate(row.date)) return false;
    if (collab && collab !== 'Tous') return row.collab === collab;
    return !isExcluded(row.collab);
  });

  const monthlyMap = {};
  filtered.forEach(r => {
    const d = parseDate(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });

  const { months, labels } = fenetreMois(6, finPeriode);
  return {
    labels,
    // `|| 0` : un mois sans donnée vaut zéro, il n'est jamais sauté.
    counts: months.map(d => monthlyMap[cleMois(d)] || 0),
  };
}

// ── Recalcul des stats RDV (compte + taux honoré) sur une plage de dates
// arbitraire, à partir du cache déjà chargé — sert à la comparaison de
// période ("vs période précédente"), sur le même principe que
// computeFromCache côté appels Ringover.
export function computeRDVStatsForRange(rdvRows, validCollabs, collab, dateFrom, dateTo) {
  const validSet = new Set(validCollabs || []);
  const from = dateFrom ? toMidnight(dateFrom) : null;
  const to   = dateTo   ? toMidnight(dateTo)   : null;

  const filtered = (rdvRows || []).filter(row => {
    if (validSet.size > 0 && !validSet.has(row.collab)) return false;
    if (collab && collab !== 'Tous' && row.collab !== collab) return false;
    const d = parseRDVDate(row.date);
    if (!d) return false;
    const day = toMidnight(d);
    if (from && day < from) return false;
    if (to   && day > to)   return false;
    return true;
  });

  const rdvPris = filtered.length;
  const rdvHonores = filtered.filter(r => r.honore).length;
  const tauxHonores = partPct(rdvHonores, rdvPris);
  return { rdvPris, rdvHonores, tauxHonores };
}
