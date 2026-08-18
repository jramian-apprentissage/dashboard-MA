/* Catalogue des indicateurs et graphiques mentionnables dans le chat IA via
   la touche "/" — même principe que les commandes slash de Claude Code :
   on tape "/", on filtre, on sélectionne.

   Format d'affichage demandé par Jimmy (2026-08-04) : "dash - page - carte".

   Ce fichier est écrit à la main plutôt que déduit du JSX : il ne liste que
   ce qui a un sens comme sujet de question, alors qu'un scan automatique
   remonterait aussi les libellés d'interface (bascules "Journalier/Mensuel",
   messages de chargement, séries de graphiques). À tenir à jour quand une
   carte est ajoutée ou renommée. */

const REGISTRY = [
  {
    dashId: 'commercial-rc', dash: 'Commercial & Relation Client',
    pageId: 'synthese', page: 'KPIs principaux',
    cards: [
      'CA',
      'Marge brute',
      'Deals gagnés',
      'Pipeline pondéré',
      'Évolution mensuelle du CA et de la marge',
      'Top 5 clients par CA',
      'Concentration du CA & santé client',
    ],
  },
  {
    dashId: 'commercial-rc', dash: 'Commercial & Relation Client',
    pageId: 'focus-commercial', page: 'Pôle commercial',
    cards: [
      'Pipeline total',
      'Pipeline pondéré',
      'Win rate',
      'Deals gagnés',
      'Funnel par étape commerciale',
      'Pipeline pondéré par probabilité',
      'Détail des deals',
      'Deals gagnés / perdus / stand-by — par mois',
      'Motifs des deals perdus',
      'Motifs des deals stand-by',
      'Opportunités sans prochaine action',
      "CA par secteur d'activité",
      'Performance par source de lead',
      'Répartition du revenue par type de mission',
    ],
  },
  {
    dashId: 'commercial-rc', dash: 'Commercial & Relation Client',
    pageId: 'focus-client', page: 'Pôle relation client',
    cards: [
      'Nouveaux clients',
      'Missions perdues',
      'Portefeuille de clients actifs',
      'Marge brute nouveaux clients',
      'CA par client',
      'Marge brute par client',
      'Niveau de santé client',
      'Détail des missions perdues',
      'Détails du niveau de Santé par Client',
      'Évolution mensuelle des revenus perdus',
    ],
  },
  {
    dashId: 'commercial-activite', dash: 'Activités commerciales',
    pageId: 'sales', page: 'Activité Sales',
    cards: [
      'Appels émis',
      'Échanges > 1s',
      'Échanges > 30s',
      'Échanges exploitables',
      'RDV pris',
      'RDV honorés',
      'Taux RDV honorés',
      'Appels émis & RDV pris',
      'Répartition par qualification',
      'Motifs de refus rencontrés',
      'Principaux leviers',
    ],
  },
  {
    dashId: 'commercial-activite', dash: 'Activités commerciales',
    pageId: 'tlm', page: 'Activité TLM',
    cards: [
      'Appels émis',
      'Échanges > 1s',
      'Échanges > 30s',
      'Échanges exploitables',
      'Fiches complétées',
      'Rendez-vous pris',
      'Data non exploitable',
      'Transformation nette',
      'Leads à recycler',
      'Leads restants à contacter',
      'Statut des appels',
      'Freins rencontrés',
      'Principaux leviers TLM',
    ],
  },
  {
    dashId: 'asus', dash: 'Client - Asus',
    pageId: null, page: 'Vue Asus',
    cards: [
      'Appels sortants',
      'Appels entrants',
      'Temps moyen de communication',
      'Bons appels (≥ 5 min)',
    ],
  },
];

/* Liste aplatie consommée par le menu "/" : une entrée = une carte
   mentionnable, avec son chemin complet pour l'affichage et une clé de
   recherche normalisée (sans accents ni casse) pour le filtre au clavier. */
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const KPI_MENTIONS = REGISTRY.flatMap(group =>
  group.cards.map(card => {
    const chemin = `${group.dash} - ${group.page} - ${card}`;
    return {
      // id unique : une même carte existe sur plusieurs pages (ex. "Deals
      // gagnés" en Synthèse ET en Pôle commercial) — le chemin les distingue.
      id: `${group.dashId}|${group.pageId || 'main'}|${card}`,
      dash: group.dash,
      dashId: group.dashId,
      page: group.page,
      pageId: group.pageId,
      card,
      chemin,
      recherche: norm(chemin),
    };
  }),
);

/* Filtre du menu : tous les mots tapés doivent apparaître dans le chemin,
   dans n'importe quel ordre — "marge client" trouve "Marge brute par client"
   comme "CA par client". Requête vide = tout, tronqué par le composant. */
export function filtrerMentions(query) {
  const mots = norm(query).split(/\s+/).filter(Boolean);
  if (!mots.length) return KPI_MENTIONS;
  return KPI_MENTIONS.filter(m => mots.every(mot => m.recherche.includes(mot)));
}

export default REGISTRY;
