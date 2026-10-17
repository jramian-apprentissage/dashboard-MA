import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import styles from './Rh.module.css';

/* Vue 3, à dessiner.

   DEUX PIÈGES RELEVÉS D'AVANCE, à lire avant de coder cette page.

   1. LE FILTRE « STATUT AGENT » du bandeau n'a aucune colonne pour
      l'alimenter dans le classeur. À définir avec l'équipe RH ou à retirer
      avant de coder les filtres.

   2. LE WIDGET « MOTIFS DE DÉPART » DOIT GROUPER SUR motif_normal, jamais sur
      la colonne `motif` brute. Mesuré le 17/10 sur les 74 partants de 2026 :
      « Arrêt client » y est saisi 35 fois avec un c minuscule et 4 fois avec
      une majuscule. Grouper sur le brut afficherait deux lignes pour un même
      motif, dont une à 4 qui passerait pour marginale, alors que l'arrêt
      client est de loin la première cause avec 39 départs sur 74. La table
      porte déjà le jumeau normalisé, c'est exactement son usage.

   CE QUE LA PAGE AURA À EXPLIQUER, et qui sort de la mesure du 17/10 : sur ces
   74 partants, l'ancienneté médiane est de 2,5 mois, 58 % sont partis avant
   trois mois et 35 % avant un mois. Un taux de turnover brut sur cette
   population dirait « l'agence perd tout le monde », alors qu'elle fait
   surtout tourner des missions courtes. Le taux seul sera trompeur sans la
   distribution à côté. */
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
