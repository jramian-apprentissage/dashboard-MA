// ─── CSV parser ───────────────────────────────────────────────────────────────

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

// ─── Sheet URLs ───────────────────────────────────────────────────────────────

const BASE = 'https://docs.google.com/spreadsheets/d/1bOBCZE1UXZLiYYnJBGEGHmzeR4pPfTZPn1ZFFWI6BPE/export?format=csv';
export const SNAP_LEADS_URL   = `${BASE}&gid=1517305723`;
export const SNAP_COMPTES_URL = `${BASE}&gid=1943201326`;

// ─── Parsers ──────────────────────────────────────────────────────────────────

// Headers: snapshot_date,item_id,nom,groupe,etat,closer,type_contrat,
//          profil_fonction,achat_p,vente_p,probabilite,
//          date_ouverture,date_rdv,date_presentation,date_demarrage_souhaite
export function parseSnapLeads(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  return lines.slice(1).map(line => {
    const c = parseCSVLine(line);
    return {
      snapshot_date:           c[0]  || '',
      item_id:                 c[1]  || '',
      nom:                     c[2]  || '',
      groupe:                  c[3]  || '',
      etat:                    c[4]  || '',
      closer:                  c[5]  || '',
      type_contrat:            c[6]  || '',
      profil_fonction:         c[7]  || '',
      achat_p:                 parseFloat(c[8])  || 0,
      vente_p:                 parseFloat(c[9])  || 0,
      probabilite:             parseFloat(c[10]) || 0,
      date_ouverture:          c[11] || '',
      date_rdv:                c[12] || '',
      date_presentation:       c[13] || '',
      date_demarrage_souhaite: c[14] || '',
    };
  }).filter(r => r.snapshot_date && r.item_id);
}

// Headers: snapshot_date,compte_id,nom,statut,achat_total,vente_total,
//          profil_actif,date_demarrage,date_fin_contrat
export function parseSnapComptes(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  return lines.slice(1).map(line => {
    const c = parseCSVLine(line);
    return {
      snapshot_date:    c[0] || '',
      compte_id:        c[1] || '',
      nom:              c[2] || '',
      statut:           c[3] || '',
      achat_total:      parseFloat(c[4]) || 0,
      vente_total:      parseFloat(c[5]) || 0,
      profil_actif:     parseFloat(c[6]) || 0,
      date_demarrage:   c[7] || '',
      date_fin_contrat: c[8] || '',
    };
  }).filter(r => r.snapshot_date && r.compte_id);
}

// ─── Snapshot resolution ──────────────────────────────────────────────────────
// Returns the rows from the last snapshot whose date <= periodEndDate (ISO string).
// Falls back to the earliest snapshot if none is before the end date.

export function resolveSnapshot(rows, periodEndStr) {
  const dates = [...new Set(rows.map(r => r.snapshot_date))].sort();
  if (!dates.length) return [];
  if (!periodEndStr) return rows.filter(r => r.snapshot_date === dates[dates.length - 1]);
  const target = dates.filter(d => d <= periodEndStr).pop() || dates[0];
  return rows.filter(r => r.snapshot_date === target);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_ETATS = new Set([
  'Attente retour client',
  'Relance à faire',
  'Point de cadrage',
  'Présentation profil',
  'Recherche profil',
  'Date de démarrage planifié/Contrat signé',
  'R1 Planifié',
  'Relance en cours',
  'Suivi MEP J+7',
  'Suivi MEP J+21',
  'ATRC après prez',
  'R2 à planifier/planifié',
]);

const GAGNES_GROUPES = new Set([
  'Gagnée',
  'ARC après présentation / date de démarrage confirmé',
]);

const PERDUS_GROUPES = new Set([
  'Arrêt Suivi',
  'Stop Contact',
  'Résilié / Arrêt de collaboration',
  'ATRC après prez',
]);

// ─── KPI computation ─────────────────────────────────────────────────────────
// comptesSnap / leadsSnap : rows already resolved to the right snapshot date
// dateFrom / dateTo       : ISO strings "YYYY-MM-DD" from getPeriodRange

export function computeCRMKPIs(comptesSnap, leadsSnap, dateFrom, dateTo) {
  const from = dateFrom || '';
  const to   = dateTo   || '';

  // ── COMPTES — état actuel (state KPIs) ────────────────────────────────────
  const actifs = comptesSnap.filter(c => c.statut === 'Actif');

  const caGlobal          = actifs.reduce((s, c) => s + c.vente_total, 0);
  const totalAchats       = actifs.reduce((s, c) => s + c.achat_total, 0);
  const margeBruteGlobale = caGlobal - totalAchats;
  const tauxMarge         = caGlobal > 0 ? Math.round((margeBruteGlobale / caGlobal) * 100) : 0;
  const nbClientsActifs   = actifs.length;
  const nbClientsTotal    = comptesSnap.length;

  // ── COMPTES — filtrés par date de démarrage dans la période (flow KPIs) ───
  const destarresPeriode = comptesSnap.filter(c =>
    c.date_demarrage && c.date_demarrage >= from && c.date_demarrage <= to
  );
  const sommeVentesGagnes  = destarresPeriode.reduce((s, c) => s + c.vente_total, 0);
  const sommeAchatsGagnes  = destarresPeriode.reduce((s, c) => s + c.achat_total, 0);
  const margeBruteNouveaux = sommeVentesGagnes - sommeAchatsGagnes;

  // Top 5 clients par CA (state)
  const maxCA = actifs.length ? Math.max(...actifs.map(c => c.vente_total)) : 1;
  const topClients = [...actifs]
    .sort((a, b) => b.vente_total - a.vente_total)
    .slice(0, 5)
    .map(c => ({
      name: c.nom,
      ca:   c.vente_total,
      pct:  maxCA > 0 ? Math.round((c.vente_total / maxCA) * 100) : 0,
    }));

  // ── LEADS — deals gagnés (filtrés par date de démarrage souhaité) ─────────
  const dealsGagnesPeriode = leadsSnap.filter(l =>
    l.etat === 'Contrat signé' &&
    l.date_demarrage_souhaite &&
    l.date_demarrage_souhaite >= from &&
    l.date_demarrage_souhaite <= to
  );
  const nbDealsGagnes = dealsGagnesPeriode.length;

  // ── LEADS — pipeline (state) ───────────────────────────────────────────────
  const pipelineItems  = leadsSnap.filter(l => PIPELINE_ETATS.has(l.etat));
  const montantPipeline = pipelineItems.reduce((s, l) => s + l.vente_p, 0);

  // Pipeline pondéré : seuil 30%, répartition Modérée 30-75% / Forte ≥ 75%
  let pondereFort   = 0;
  let pondereModere = 0;
  pipelineItems.forEach(l => {
    const prob = l.probabilite;
    const val  = l.vente_p;
    if (prob >= 75)      pondereFort   += val * (prob / 100);
    else if (prob >= 30) pondereModere += val * (prob / 100);
  });
  const montantPipelinePondere = Math.round(pondereFort + pondereModere);
  const totalPondere = montantPipelinePondere || 1;

  const pipelineBreakdown = [
    {
      label:  'Haute (≥ 75%)',
      amount: Math.round(pondereFort),
      pct:    Math.round((pondereFort / totalPondere) * 100),
      color:  'var(--pos)',
    },
    {
      label:  'Modérée (30–75%)',
      amount: Math.round(pondereModere),
      pct:    Math.round((pondereModere / totalPondere) * 100),
      color:  'var(--warn)',
    },
  ].filter(p => p.amount > 0);

  // ── LEADS — win rate (all-time, par groupe) ────────────────────────────────
  const nbGagnesAll  = leadsSnap.filter(l => GAGNES_GROUPES.has(l.groupe)).length;
  const nbPerdusAll  = leadsSnap.filter(l => PERDUS_GROUPES.has(l.groupe)).length;
  const nbStandbyAll = leadsSnap.filter(l => l.groupe === 'Stand By').length;
  const nbEnCoursAll = pipelineItems.length;

  const winRate = (nbGagnesAll + nbPerdusAll) > 0
    ? Math.round((nbGagnesAll / (nbGagnesAll + nbPerdusAll)) * 100)
    : 0;

  return {
    // State — tous clients actifs
    caGlobal,
    totalAchats,
    margeBruteGlobale,
    tauxMarge,
    nbClientsActifs,
    nbClientsTotal,
    // Flow — clients démarrés dans la période
    sommeVentesGagnes,
    sommeAchatsGagnes,
    margeBruteNouveaux,
    // Leads — deals gagnés période
    nbDealsGagnes,
    // Pipeline
    montantPipeline,
    montantPipelinePondere,
    pipelineBreakdown,
    // Win rate
    winRate,
    dealStats: {
      gagnes:  nbGagnesAll,
      perdus:  nbPerdusAll,
      standby: nbStandbyAll,
      enCours: nbEnCoursAll,
    },
    topClients,
  };
}
