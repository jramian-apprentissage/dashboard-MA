export const DASHBOARD_ROUTES = {
  'commercial-rc': '/commercial-rc',
  'commercial-activite': '/commercial-activite',
  asus: '/asus',
};

export const DASHBOARD_TABS = {
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
  'commercial-rc': 'synthese',
  'commercial-activite': 'sales',
};
