import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import styles from '../RhEffectifs/Rh.module.css';

/* Vue 2, « Pipeline candidats et délais ». À construire.
 *
 * C'EST LA PAGE LA PLUS FRAGILE DES TROIS, et il faut le savoir avant de la
 * dessiner. Un délai exige DEUX dates sur la même ligne : prises séparément
 * les colonnes semblent tenir, mais leur croisement tombe sous la moitié.
 * Mesuré le 21/10 sur les 59 commandes :
 *
 *   délai pour pourvoir, depuis la commande   31/59   53 %
 *   durée d'un recrutement, R0 à R3           26/59   44 %
 *   respect des délais, R3 contre échéance    25/59   42 %
 *   délai pour pourvoir, depuis R0            22/59   37 %
 *   transformation des profils                37/59   63 %
 *
 * CE QUI TIENT MALGRÉ TOUT : les étapes du workflow. Statut RH est rempli à
 * 97 % et couvre R0 à R7 plus « En poste », 16 fois. La carte « Processus de
 * recrutement » est donc solide, elle seule sur cette page.
 *
 * LA TRANSFORMATION DES PROFILS est celle que Clémence a demandée en
 * relecture : 63 % des commandes portent à la fois les profils présentés et
 * les profils retenus. C'est la moins mauvaise des cinq. */
export default function Pipeline() {
  return (
    <div className={styles.page}>
      <SectionLabel badge="Onglet Suivi de commande RH Q2">Pipeline candidats et délais</SectionLabel>
      <Card>
        <div className={styles.etat}>
          <div className={styles.etatTitre}>Vue à construire</div>
          <div className={styles.etatTexte}>
            Page à traiter avec précaution : tous ses délais croisent deux colonnes
            de dates, et ces croisements tombent entre 37 et 53 % des commandes.
            Seules les étapes du workflow reposent sur une colonne solide, le statut
            RH, rempli à 97 %.
          </div>
        </div>
      </Card>
    </div>
  );
}
