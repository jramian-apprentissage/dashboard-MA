import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import styles from '../RhEffectifs/Rh.module.css';

/* Vue 3, « Performance et qualité ». À construire.
 *
 * DEUX INDICATEURS SUR TROIS SONT SOLIDES : le taux de besoins non aboutis
 * et les besoins clôturés sans recrutement se lisent sur Statut commande,
 * rempli à 100 %, qui compte 14 commandes annulées. La répartition par
 * recruteur se lit sur Responsable de la recherche, à 88 % : Hirijy 32,
 * Tahina 7, Princia 7, Ony 4, Valérie 2, et 7 sans responsable.
 *
 * LE TROISIÈME DÉPEND DE LA DATE DE DÉMARRAGE, à 56 %, comme sur la vue 1.
 *
 * UN INDICATEUR EST IMPOSSIBLE EN L'ÉTAT. La maquette montre le détail des
 * besoins clôturés, mais AUCUNE COLONNE DU FICHIER NE PORTE DE MOTIF. Elle
 * l'avouait déjà : « 8 besoins clôturés sans recrutement, aucun motif au
 * fichier ». On peut dire combien, jamais pourquoi. C'est le même cas que le
 * motif de faute du Suivi des effectifs : une carte commandée sans colonne
 * pour l'alimenter. */
export default function Performance() {
  return (
    <div className={styles.page}>
      <SectionLabel badge="Onglet Suivi de commande RH Q2">Performance et qualité</SectionLabel>
      <Card>
        <div className={styles.etat}>
          <div className={styles.etatTitre}>Vue à construire</div>
          <div className={styles.etatTexte}>
            Deux indicateurs sur trois reposent sur des colonnes remplies à 88 % ou
            plus. En revanche le détail des besoins clôturés restera muet sur le
            POURQUOI : aucune colonne du fichier ne porte de motif de clôture.
          </div>
        </div>
      </Card>
    </div>
  );
}
