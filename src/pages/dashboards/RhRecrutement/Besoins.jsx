import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import { useRhBesoins } from '../../../hooks/useRhData';
import { compareValueText, comparePtsText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber } from '../../../utils/formatNumber';
import styles from '../RhEffectifs/Rh.module.css';

/* Vue 1 du dashboard Recrutement, « Besoins et recrutements ».
 *
 * TROIS TUILES SUR QUATRE, dans l'ordre que Clémence a demandé sur la planche
 * 13 : besoin de recrutement en cours, besoins ouverts depuis plus de quinze
 * jours, puis taux de besoins pourvus.
 *
 * LA QUATRIÈME, « Recrutements réalisés », N'EST PAS POSÉE, et ce n'est pas un
 * oubli. Deux raisons, l'une de données, l'autre de logique. D'abord la
 * donnée : sur les 43 commandes pourvues de l'année, 21 n'ont AUCUNE date de
 * démarrage. Compter les recrutements par cette colonne en perdrait la
 * moitié. Ensuite la logique : si on les compte par le statut, cette tuile
 * devient le NUMÉRATEUR de la tuile « taux de besoins pourvus », soit le même
 * ensemble de commandes affiché deux fois. C'est exactement ce que Clémence
 * reproche à la planche 16, « le volume n'est-il pas déjà dans le taux ? Si
 * c'est le cas, l'intégrer à la description plutôt qu'un widget de plus ».
 * Le volume est donc dans le sous-titre du taux, et la tuile libérée attendra
 * que les dates de démarrage soient saisies.
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

        const {
          besoinsEnCours, commandesRecues, profilsDemandes, sansProfil,
          ouvertsPlus15j, tauxPlus15j, pourvues, tauxPourvu,
        } = result;

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
              {/* INVERSION DE COULEUR, demandée par Jimmy le 22/10 et vraie
                  pour les trois tuiles de gauche à droite sauf la dernière :
                  un besoin non pourvu de moins est une BONNE nouvelle, et la
                  carte doit virer au vert quand le chiffre baisse. Le
                  paramètre n'inverse que la couleur ; la flèche continue de
                  suivre le chiffre, sinon on lit « ↘ +11 % » et cela passe
                  pour une erreur de calcul. */}
              <KPICard
                label="Besoin de recrutement en cours"
                value={fmtNumber(besoinsEnCours)}
                unit={besoinsEnCours > 1 ? ' besoins' : ' besoin'}
                compare={compareResult
                  ? compareValueText(besoinsEnCours, compareResult.besoinsEnCours, comparePeriodKey, true)
                  : null}
                trend={{ dir: 'neutral', text: sousTitre }}
              />

              {/* L'ANCIENNETÉ SE COMPTE À CE JOUR, pas à la fin de la période :
                  mesurée au 30/09, cette tuile annonçait 0 % sur septembre
                  alors que ses deux besoins encore ouverts traînent depuis plus
                  de cinquante jours. Voir l'en-tête de la route. */}
              <KPICard
                label="Besoins ouverts depuis plus de 15 jours"
                value={tauxPlus15j == null ? '-' : fmtNumber(tauxPlus15j)}
                unit={tauxPlus15j == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxPlus15j, compareResult.tauxPlus15j, comparePeriodKey, true)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: besoinsEnCours === 0
                    ? 'Aucun besoin encore ouvert sur la période'
                    : `${fmtNumber(ouvertsPlus15j)} sur ${fmtNumber(besoinsEnCours)} encore ouverts`,
                }}
              />

              {/* Celle-ci ne s'inverse PAS : un taux de besoins pourvus qui
                  monte est une bonne nouvelle, la couleur suit le chiffre. */}
              <KPICard
                label="Taux de besoins pourvus"
                value={tauxPourvu == null ? '-' : fmtNumber(tauxPourvu)}
                unit={tauxPourvu == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxPourvu, compareResult.tauxPourvu, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `${fmtNumber(pourvues)} pourvu${pourvues > 1 ? 's' : ''} sur ${fmtNumber(commandesRecues)} reçu${commandesRecues > 1 ? 's' : ''}`,
                }}
              />
            </div>
          </div>
        );
      }}
    </Loader>
  );
}
