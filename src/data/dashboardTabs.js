export const DASHBOARD_ROUTES = {
  'commercial-rc': '/commercial-rc',
  'commercial-activite': '/commercial-activite',
};

export const DASHBOARD_TABS = {
  'commercial-rc': [
    { id: 'synthese', label: 'KPIs principaux' },
    { id: 'focus-commercial', label: 'Pôle commercial' },
    { id: 'focus-client', label: 'Pôle relations clients' },
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
