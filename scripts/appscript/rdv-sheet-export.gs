/*
 * Expose la feuille RDV (Google Sheet privé) en CSV via une Web App Apps
 * Script, sans avoir à partager le fichier/dossier publiquement. Le script
 * s'exécute avec les droits du propriétaire (Exécuter en tant que : Moi),
 * donc il peut lire une feuille privée même si l'appelant n'a aucun accès.
 *
 * Remplace l'ancien fetch direct :
 *   https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}
 * qui exigeait un partage "Tous les utilisateurs disposant du lien".
 *
 * ─── Déploiement ────────────────────────────────────────────────────────
 * 1. Ouvrir le Google Sheet RDV (ID = VITE_RDV_SHEET_ID dans .env.local).
 * 2. Extensions > Apps Script.
 * 3. Coller ce fichier dans Code.gs (remplacer le contenu par défaut).
 * 4. Déployer > Nouveau déploiement > type "Application Web".
 *      - Exécuter en tant que : Moi
 *      - Qui a accès : Tous
 * 5. Autoriser l'accès quand Google le demande (compte propriétaire du sheet).
 * 6. Copier l'URL /exec fournie à la fin — c'est le lien à transmettre.
 *
 * Pour republier une nouvelle version après modif du code : Déployer >
 * Gérer les déploiements > icône crayon > Version > Nouvelle version.
 * (Sinon l'URL /exec continue de servir l'ancien code.)
 *
 * ─── Appel ───────────────────────────────────────────────────────────────
 *   GET {url exec}                → CSV de la 1re feuille (gid le plus bas)
 *   GET {url exec}?gid=123456     → CSV de la feuille dont le gid est 123456
 *   GET {url exec}?name=RDV       → CSV de la feuille nommée "RDV"
 */

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = pickSheet_(ss, e && e.parameter);
  const values = sheet.getDataRange().getValues();
  const csv = values.map(row => row.map(cell => csvEscape_(cell)).join(',')).join('\r\n');

  return ContentService
    .createTextOutput(csv)
    .setMimeType(ContentService.MimeType.CSV);
}

function pickSheet_(ss, params) {
  if (params && params.gid) {
    const gid = Number(params.gid);
    const byGid = ss.getSheets().find(s => s.getSheetId() === gid);
    if (byGid) return byGid;
  }
  if (params && params.name) {
    const byName = ss.getSheetByName(params.name);
    if (byName) return byName;
  }
  return ss.getSheets()[0];
}

function csvEscape_(cell) {
  let s = cell === null || cell === undefined ? '' : String(cell);
  if (cell instanceof Date) {
    s = Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  if (/[",\r\n]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
