import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* Identifiant du tableau de bord ouvert, ou rien pour les pages qui n'en sont
   pas un. Seuls les trois tableaux de bord sont journalisés : ce qu'on veut
   savoir, c'est si les équipes les consultent — y mêler l'accueil, le
   glossaire et l'administration diluerait les 40 entrées conservées.

   L'onglet (?tab=…) est délibérément ignoré. « Activités commerciales »
   répond à la question posée ; « Activités commerciales — Activité TLM »
   relèverait du suivi des gestes individuels, pas de la mesure d'adoption
   (arbitrage de Jimmy, 17/08/2026). C'est aussi ce qui évite qu'un
   aller-retour entre onglets remplisse le journal à lui seul. */
const DASHBOARD_PAR_CHEMIN = {
  '/commercial-rc':       'commercial-rc',
  '/commercial-activite': 'commercial-activite',
  '/asus':                'asus',
};

export default function PageTracker() {
  const { user, enregistrerConsultation } = useAuth();
  const location = useLocation();
  const dashboard = DASHBOARD_PAR_CHEMIN[location.pathname];

  useEffect(() => {
    if (!user || !dashboard) return;
    enregistrerConsultation(dashboard);
  }, [dashboard, user?.id]); // eslint-disable-line

  return null;
}
