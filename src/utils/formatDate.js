// Date du jour au format JJ/MM — même convention que dernierJourArchive()
// (sheetsParser.js) et formatJourMois() (ActiviteTLM.jsx), sans année.
export function todayDDMM() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
