import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent } from '../services/tracking';

const BASE_LABELS = {
  '/':                    'Accueil',
  '/commercial-rc':       'Commercial & Relation Client',
  '/commercial-activite': 'Activité commerciale',
  '/glossaire':           'Glossaire KPI',
  '/admin':               'Administration',
};

const TAB_LABELS = {
  synthese:          'KPIs principaux',
  commercial:        'Pôle commercial',
  client:            'Pôle relation client',
  sales:             'Activité Sales',
  tlm:               'Activité TLM',
};

function pageLabel(pathname, search) {
  const base = BASE_LABELS[pathname] || pathname;
  const tab  = new URLSearchParams(search).get('tab');
  return tab && TAB_LABELS[tab] ? `${base} — ${TAB_LABELS[tab]}` : base;
}

export default function PageTracker() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    trackEvent(user.id, user.name, 'visit', pageLabel(location.pathname, location.search));
  }, [location.pathname, location.search, user?.id]); // eslint-disable-line

  return null;
}
