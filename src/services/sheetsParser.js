// ─── CSV Parser ─────────────────────────────────────────────────────────────

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
export const TAG_CATEGORIES = [
  { key: 'OK',  label: 'OK — RDV pris',               color: 'rgba(142,207,170,0.8)' },
  { key: 'PI',  label: 'PI — Pas intéressé',           color: 'rgba(255,249,147,0.7)' },
  { key: 'CNA', label: 'CNA — Contact non argumenté', color: 'rgba(123,170,191,0.6)' },
  { key: 'INJ', label: 'INJ — Injoignable',            color: 'rgba(167,173,170,0.5)' },
  { key: 'HC',  label: 'HC — Hors cible',             color: 'rgba(196,135,106,0.55)' },
  { key: '',    label: 'Sans tag',                     color: 'rgba(255,255,255,0.12)' },
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

  const total    = filtered.length;
  const decroche = filtered.filter(r => r.duration > 30).length;

  // Contact argumenté = OK (RDV pris) + PI (Pas intéressé) — le prospect a écouté le pitch
  const argues = filtered.filter(r => hasTagCat(r.tags, 'OK') || hasTagCat(r.tags, 'PI')).length;
  const rdv    = filtered.filter(r => hasTagCat(r.tags, 'OK')).length;

  // Tranches horaires
  const trancheMap = {};
  filtered.forEach(r => {
    const t = r.heure || '?';
    if (!trancheMap[t]) trancheMap[t] = { appels: 0, decroche: 0, rdv: 0 };
    trancheMap[t].appels++;
    if (r.duration > 30) trancheMap[t].decroche++;
    if (hasTagCat(r.tags, 'OK')) trancheMap[t].rdv++;
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
      join:   v.appels > 0 ? Math.round((v.decroche / v.appels) * 100) : 0,
      rdv:    v.rdv,
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
    return { ...cat, count, pct: total > 0 ? Math.round(count / total * 100) : 0 };
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
    .map(([tag, count]) => ({ tag, count, pct: total > 0 ? Math.round(count / total * 100) : 0 }));

  // ── Statistiques par collaborateur ──────────────────────────────────────────
  const collabStats = {};
  filtered.forEach(r => {
    if (!collabStats[r.collab]) collabStats[r.collab] = { appels: 0, decroche: 0, argues: 0 };
    collabStats[r.collab].appels++;
    if (r.duration > 30) collabStats[r.collab].decroche++;
    if (hasTagCat(r.tags, 'OK') || hasTagCat(r.tags, 'PI')) collabStats[r.collab].argues++;
  });
  const perCollab = Object.fromEntries(
    Object.entries(collabStats).map(([name, v]) => [name, {
      appels: v.appels,
      argues: v.argues,
      taux:   v.appels > 0 ? `${Math.round((v.decroche / v.appels) * 100)}%` : '—',
    }])
  );

  return { total, decroche, argues, rdv, tranches, collabs, categStats, tagStats, perCollab };
}

// ─── RDV Sheet ───────────────────────────────────────────────────────────────
// Colonne A (0) : date  (format DD/MM/YYYY ou ISO)
// Colonne H (7) : télépro
// Colonne I (8) : honoré (TRUE / FALSE)

// Colonne A (0) = date du RDV ← à utiliser
// Colonne H (7) = "BDR"      ← télépro qui a posé le RDV
// Colonne I (8) = "Présent"  ← honoré TRUE/FALSE
const RDV_COL = { DATE: 0, COLLAB: 7, HONORE: 8 };

// Parseur dédié au fichier RDV
// Formats rencontrés : "22.04.2024 15:00" (DD.MM.YYYY HH:MM)
//                      "22/04/2024"        (DD/MM/YYYY)
//                      "2024-04-22"        (ISO)
function parseRDVDate(str) {
  if (!str) return null;
  const s = str.trim().split(' ')[0]; // conserver uniquement la partie date (avant l'heure)
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
  // DD/MM/YYYY (format français avec slashes)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
    return isNaN(d) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

export function parseRDVSheetCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  return lines.slice(1)
    .map(line => {
      const cols = parseCSVLine(line);
      return {
        date:    cols[RDV_COL.DATE]   || '',
        collab:  (cols[RDV_COL.COLLAB] || '').trim(),
        honore:  (cols[RDV_COL.HONORE] || '').trim().toLowerCase() === 'honoré',
      };
    })
    .filter(r => r.date && r.collab);
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
  const tauxHonores = rdvPris > 0 ? Math.round((rdvHonores / rdvPris) * 100) : 0;

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

  // ── Par tranche horaire (heure de création du RDV, arrondie à l'heure pleine)
  // Format date colonne A : "01.06.2026 16:56" → tranche "16:00" pour matcher Ringover
  const byHourMap = {};
  filtered.forEach(r => {
    const parts = r.date.trim().split(' ');
    if (parts.length < 2) return;
    const [hh] = parts[1].split(':');
    if (!hh) return;
    const key = `${hh.padStart(2, '0')}:00`;
    byHourMap[key] = (byHourMap[key] || 0) + 1;
  });

  return { rdvPris, rdvHonores, tauxHonores, perCollab: collabMap, monthly: monthlyMap, byHour: byHourMap };
}
