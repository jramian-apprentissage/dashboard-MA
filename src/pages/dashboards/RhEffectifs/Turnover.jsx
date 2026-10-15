import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import styles from './Rh.module.css';

/* Vue 3, à dessiner. Une réserve connue : le bandeau de cette page ouvre un
   filtre « statut agent » qu'aucune colonne du classeur ne peut alimenter. À
   définir ou à retirer avant de coder les filtres. */
export default function Turnover() {
  return (
    <div className={styles.page}>
      <SectionLabel>Turnover et fidélisation</SectionLabel>
      <Card>
        <div className={styles.etat}>
          <div className={styles.etatTitre}>Vue à dessiner</div>
          <div className={styles.etatTexte}>
            Taux de turnover global et par type de mission, motifs de départ, taux de
            rétention à un an et deux ans. Le taux dépasse 100 % sur l’administratif,
            ce qui est normal quand les missions durent moins d’un an : l’axe devra
            l’accepter sans écrêter.
          </div>
        </div>
      </Card>
    </div>
  );
}
