import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import styles from '../RhEffectifs/Rh.module.css';

/* Vue 1, « Besoins et recrutements ». À construire.
 *
 * CE QUE LA MAQUETTE COMMANDE : besoins de recrutement en cours, taux des
 * besoins ouverts depuis plus de 15 jours, taux de besoins pourvus,
 * recrutements réalisés, et la ventilation des besoins en cours par tranche
 * d'ancienneté.
 *
 * CE QUE LA SOURCE PERMET, inventaire du 21/10 sur les 59 commandes de
 * l'onglet « Suivi de commande RH Q2 » :
 *   · Statut commande est rempli à 100 %, avec un vocabulaire propre :
 *     Terminé 24, Annuler 14, En attente client 13, À faire 5, En cours 3.
 *     Les besoins en cours et le taux de besoins pourvus en découlent
 *     directement, sans réserve.
 *   · Date de la commande est à 86 %, donc l'ancienneté d'un besoin et le
 *     seuil des 15 jours tiennent, à trois commandes près.
 *   · Date de démarrage n'est qu'à 56 %. « Recrutements réalisés » repose
 *     donc sur un peu plus d'une commande sur deux, et la maquette l'avouait
 *     déjà : « date de démarrage 18 fois sur 53 ».
 *
 * LA QUESTION À TRANCHER AVANT DE CODER : ce qu'est un « besoin en cours ».
 * Trois statuts peuvent y prétendre, À faire, En cours et En attente client,
 * et leur somme fait 21 là où la maquette affiche 27. L'écart vient du
 * fichier, qui a grossi depuis le 27/09. */
export default function Besoins() {
  return (
    <div className={styles.page}>
      <SectionLabel badge="Onglet Suivi de commande RH Q2">Besoins et recrutements</SectionLabel>
      <Card>
        <div className={styles.etat}>
          <div className={styles.etatTitre}>Vue à construire</div>
          <div className={styles.etatTexte}>
            La source existe mais n’est pas encore ingérée : aucune table, aucune
            route. Quatre des cinq indicateurs de cette page reposent sur des
            colonnes remplies à 86 % ou plus et ne posent pas de difficulté. Le
            cinquième, les recrutements réalisés, dépend de la date de démarrage,
            renseignée sur 33 commandes sur 59.
          </div>
        </div>
      </Card>
    </div>
  );
}
