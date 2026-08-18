// Indicateurs issus du board Monday "Leads/Prospects" — masqués du
// 2026-08-02 au 2026-08-03 le temps de stabiliser les KPI calculés depuis le
// board Comptes (comptes_history reconstruite de zéro). Les KPI Comptes sont
// désormais fiables (CA, marge, missions, clients perdus/nouveaux) ; les
// indicateurs Leads sont réaffichés (demande de Jimmy, 2026-08-03).
export const SHOW_LEADS_KPIS = true;

// Symétrique du flag ci-dessus : masquait en local tous les indicateurs
// issus du board Comptes (CA, marge, top clients, santé client, nouveaux/
// perdus, missions, secteur) le temps de se concentrer sur le board Leads/
// Prospects (2026-08-03). Le travail Leads (Date RDV comme référence sur
// Pipeline/Win rate/Funnel/Motifs/Sources) est fait — indicateurs réaffichés.
export const SHOW_COMPTES_KPIS = true;

/* Indicateurs qui n'existent QUE dans Monday CRM, sans équivalent dans le
   classeur d'exploitation. On se concentre sur les données Excel le temps de
   fiabiliser les chiffres, « comme si on n'avait jamais eu Monday » (décision
   de Jimmy, 15/08).
 *
 * Concrètement, deux données n'ont aucune contrepartie côté Excel :
 *   - le secteur d'activité      → 68 comptes Monday sur 88, 0 sur 117 legacy
 *   - la note de satisfaction    → Monday seul, 0 sur legacy
 * Les widgets qui en dépendent ne peuvent donc pas être « filtrés » : ils
 * seraient vides. Ils sont masqués, pas supprimés — remettre ce drapeau à
 * true les fait revenir tels quels le jour où Monday est rebranché.
 *
 * Ce drapeau ne touche PAS le CA, la marge ni les missions perdues : ceux-là
 * se calculent déjà exclusivement sur l'historique Excel. */
export const SHOW_MONDAY_KPIS = true;
