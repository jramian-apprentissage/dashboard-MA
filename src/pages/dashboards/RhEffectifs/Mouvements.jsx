import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import styles from './Rh.module.css';

/* Vue 2, à dessiner. Ce n'est NI une source absente NI une période vide : c'est
   un écran qui n'existe pas encore, et confondre les trois états est une faute
   déjà commise ailleurs dans ce dépôt. */
export default function Mouvements() {
  return (
    <div className={styles.page}>
      <SectionLabel>Évolution et mouvements</SectionLabel>
      <Card>
        <div className={styles.etat}>
          <div className={styles.etatTitre}>Vue à dessiner</div>
          <div className={styles.etatTexte}>
            Entrées et sorties par mois, solde net, évolution de l’effectif sur six
            mois. Les règles sont écrites et vérifiées, l’écran reste à composer.
          </div>
        </div>
      </Card>
    </div>
  );
}
