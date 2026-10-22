import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import { useRhBesoins } from '../../../hooks/useRhData';
import { compareValueText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber } from '../../../utils/formatNumber';
import styles from '../RhEffectifs/Rh.module.css';

/* Vue 1 du dashboard Recrutement, « Besoins et recrutements ».
 *
 * UNE SEULE CARTE POSÉE POUR L'INSTANT, la première de la rangée, et c'est
 * volontaire : on avance indicateur par indicateur, celui-ci est le seul des
 * quatre dont la source soit complète. Les trois autres attendent, et leur
 * ordre est déjà fixé par Clémence : taux des besoins ouverts depuis plus de
 * quinze jours, recrutements réalisés, taux de besoins pourvus.
 *
 * POURQUOI CELLE-CI D'ABORD, en une phrase : elle ne lit que `Statut
 * commande`, la seule colonne du classeur FCC remplie à 100 %, et aucune date.
 * Les trois suivantes dépendent de colonnes trouées ou d'un arbitrage ouvert.
 *
 * LA PÉRIODE BORNE LA DATE DE COMMANDE, PAS L'ÉTAT. Arbitrage de Jimmy du
 * 22/10. On compte, parmi les besoins ARRIVÉS sur la période, ceux qui sont
 * encore ouverts AUJOURD'HUI : sur septembre, 2 encore ouverts sur 11 arrivés.
 * Le stock à une date passée n'est pas calculable, le classeur ne portant
 * aucune date de changement de statut ; une date de clôture dans le FCC
 * lèverait cette limite d'un coup.
 *
 * LE DÉNOMINATEUR N'EST PAS DÉCORATIF, il est ce qui rend le chiffre lisible.
 * « 2 » seul laisse croire à une charge de deux besoins, alors que 27 sont
 * ouverts ce jour-là, dont sept commandés en février et mars. « Non pourvus
 * sur 11 commandes reçues » se lit sans explication.
 *
 * LES POSTES NE S'AFFICHENT QUE S'ILS DIFFÈRENT du nombre de besoins. Une
 * commande peut en porter plusieurs via `# PROFIL`, mais la plupart n'en
 * portent qu'un : écrire « 2 postes » sous une valeur qui dit déjà 2 ajoute
 * du bruit, pas de l'information. En octobre, 8 besoins valent 9 postes et la
 * mention apparaît. */
export default function Besoins() {
  const { result, compareResult, loading, error } = useRhBesoins();
  const { comparePeriodKey } = usePeriod();

  return (
    <Loader loading={loading && !result} label="Chargement des besoins…" minHeight={220}>
      {() => {
        /* Trois états, jamais confondus : la source ne répond pas, la source
           répond vide, la source répond. */
        if (error) {
          return (
            <div className={styles.page}>
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Les besoins en cours</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>Les données du FCC ne répondent pas</div>
                  <div className={styles.etatTexte}>{error}</div>
                </div>
              </Card>
            </div>
          );
        }
        if (!result || result.commandes === 0) {
          return (
            <div className={styles.page}>
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Les besoins en cours</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>En attente du classeur FCC</div>
                  <div className={styles.etatTexte}>
                    Aucune commande n’est chargée. Le classeur se charge avec
                    <code> scripts/ingest-fcc-fichier.js</code>.
                  </div>
                </div>
              </Card>
            </div>
          );
        }

        const { besoinsEnCours, commandesRecues, profilsDemandes, sansProfil } = result;

        /* Le dénominateur d'abord, c'est lui qui donne son sens à la valeur. */
        let sousTitre = `Non pourvus sur ${fmtNumber(commandesRecues)} commande${commandesRecues > 1 ? 's' : ''} reçue${commandesRecues > 1 ? 's' : ''}`;
        /* Les postes seulement s'ils apportent quelque chose, c'est-à-dire
           s'ils ne redisent pas la valeur déjà affichée en gros. Et jamais un
           total incomplet : si une commande n'a pas de `# PROFIL`, on ne
           suppose pas 1, on se tait. */
        if (sansProfil === 0 && profilsDemandes !== besoinsEnCours) {
          sousTitre += ` · ${fmtNumber(profilsDemandes)} postes`;
        }

        return (
          <div className={styles.page}>
            <SectionLabel badge="Onglet Suivi de commande RH Q2">Les besoins en cours</SectionLabel>
            <div className={styles.kpiGrid}>
              <KPICard
                label="Besoin de recrutement en cours"
                value={fmtNumber(besoinsEnCours)}
                unit={besoinsEnCours > 1 ? ' besoins' : ' besoin'}
                compare={compareResult
                  ? compareValueText(besoinsEnCours, compareResult.besoinsEnCours, comparePeriodKey)
                  : null}
                trend={{ dir: 'neutral', text: sousTitre }}
              />
            </div>
          </div>
        );
      }}
    </Loader>
  );
}
