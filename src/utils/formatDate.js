// Date du jour au format JJ/MM — même convention que dernierJourArchive()
// (sheetsParser.js) et formatJourMois() (ActiviteTLM.jsx), sans année.
export function todayDDMM() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* Date de la dernière extraction Monday, au format JJ/MM.

   Les données Monday ne sont plus mises à jour en continu par webhook mais
   par une extraction quotidienne à 21h (voir server/src/mondayIngestion.js).
   Afficher la date du jour laissait donc croire à une fraîcheur qui n'existe
   pas : avant 21h, ce qui est affiché date de la veille au soir.

   Le raisonnement se fait en heure de Paris — c'est le fuseau du cron — quel
   que soit celui du navigateur. */
export function derniereExtractionDDMM() {
  const maintenant = new Date();
  // formatToParts et non format() : en locale française, format() rend
  // « 22 h » et Number() donne NaN — la comparaison passait alors toujours
  // à faux et le bandeau affichait systématiquement la veille, y compris
  // après l'extraction du soir.
  const heureParis = Number(
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false })
      .formatToParts(maintenant)
      .find(p => p.type === 'hour').value,
  );
  // Avant 21h, la dernière extraction est celle de la veille.
  const reference = heureParis >= 21 ? maintenant : new Date(maintenant.getTime() - 86400000);
  const [jour, mois] = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit',
  }).format(reference).split('/');
  return `${jour}/${mois}`;
}
