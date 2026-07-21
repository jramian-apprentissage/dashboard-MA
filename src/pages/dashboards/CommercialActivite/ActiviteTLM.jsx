import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import NotConnected from '../../../components/ui/NotConnected';
import styles from './Activite.module.css';

// Aucune source de données n'est branchée pour ce dashboard : le système
// KAVKOM (téléphonie TLM) est en stand-by côté Mon Ambassadeur, il n'y a
// donc rien d'équivalent à l'archive Ringover de l'onglet Sales.
export default function ActiviteTLM() {
  return (
    <div className={styles.page}>
      <SectionLabel badge="KAVKOM — EN STAND BY">Activité TLM — indicateurs clés</SectionLabel>
      <Card>
        <NotConnected>
          le système téléphonique KAVKOM utilisé pour l'activité TLM est en stand-by — aucune source de données à connecter pour l'instant
        </NotConnected>
      </Card>
    </div>
  );
}
