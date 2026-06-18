export const DASHBOARD_ROUTES = {
  'commercial-rc': '/commercial-rc',
  'commercial-activite': '/commercial-activite',
};

export const DASHBOARD_TABS = {
  'commercial-rc': [
    { id: 'synthese', label: 'Synthèse' },
    { id: 'focus-commercial', label: 'Focus commercial' },
    { id: 'focus-client', label: 'Focus client' },
  ],
  'commercial-activite': [
    { id: 'sales', label: 'Activité Sales' },
    { id: 'tlm', label: 'Activité TLM' },
  ],
};

export const DASHBOARD_DEFAULT_TAB = {
  'commercial-rc': 'synthese',
  'commercial-activite': 'sales',
};
