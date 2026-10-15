export const DASHBOARD_ROUTES = {
  'rh-effectifs': '/rh-effectifs',
  'commercial-rc': '/commercial-rc',
  'commercial-activite': '/commercial-activite',
  asus: '/asus',
};

export const DASHBOARD_TABS = {
  /* Les trois vues arretees avec Clemence. Les deux dernieres sont des pages
     d'attente : le menu « Choisir une vue » n'apparait qu'a partir de deux
     onglets, et c'est cette mecanique a trois vues qu'on veut lui montrer. */
  'rh-effectifs': [
    { id: 'effectifs', label: 'Effectifs de l’agence' },
    { id: 'mouvements', label: 'Évolution & mouvements' },
    { id: 'turnover', label: 'Turnover & fidélisation' },
  ],
  'commercial-rc': [
    { id: 'synthese', label: 'KPIs principaux' },
    { id: 'focus-commercial', label: 'Pôle commercial' },
    { id: 'focus-client', label: 'Pôle relation client' },
  ],
  'commercial-activite': [
    { id: 'sales', label: 'Activité Sales' },
    { id: 'tlm', label: 'Activité TLM' },
  ],
  // asus : pas d'entrée ici — page unique sans sous-onglets (voir Asus.jsx).
};

export const DASHBOARD_DEFAULT_TAB = {
  'rh-effectifs': 'effectifs',
  'commercial-rc': 'synthese',
  'commercial-activite': 'sales',
};

// "Aujourd'hui"/"Hier" n'ont de sens que pour un suivi au jour le jour
// (Activité commerciale — Ringover). Sur Commercial & Relation Client, la
// donnée Monday est analysée par mois/trimestre, jamais au jour près — ces
// deux options n'apportaient que de la confusion (widgets vides le jour même).
export const DASHBOARD_EXCLUDED_PERIODS = {
  /* Meme raison que le commercial : la saisie des sorties n'est jamais a jour
     sur le mois courant, 18 departs en juin puis 2 en juillet et 0 en aout.
     Une page « aujourd'hui » serait fausse et le dirait sans le dire. */
  'rh-effectifs': ['today', 'yesterday'],
  'commercial-rc': ['today', 'yesterday'],
};
