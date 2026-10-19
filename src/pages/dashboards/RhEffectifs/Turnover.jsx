import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import { useRhTurnover } from '../../../hooks/useRhData';
import { comparePtsText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber } from '../../../utils/formatNumber';
import styles from './Rh.module.css';

/* Vue 3 du Suivi des effectifs, « Turnover et fidélisation ».
 *
 * EN COURS DE CONSTRUCTION, une carte à la fois. Ce que la maquette commande
 * pour cette page, et qui reste à poser :
 *   · taux de rétention à 1 an, avec le 2 ans en sous-titre
 *   · taux de réintégration après perte non fautive
 *   · délai de replacement après perte de mission
 *   · turnover par département
 *   · part des sorties par motif
 *   · le motif DÉTAILLÉ des sorties, demandé par Clémence en relecture
 *
 * DEUX PIÈGES RELEVÉS D'AVANCE, à lire avant de coder la suite.
 *
 * 1. LE FILTRE « STATUT AGENT » du bandeau n'a aucune colonne pour
 *    l'alimenter dans le classeur. À définir avec l'équipe RH ou à retirer
 *    avant de coder les filtres.
 *
 * 2. LE WIDGET « MOTIFS DE DÉPART » DOIT GROUPER SUR motif_normal, jamais sur
 *    la colonne `motif` brute. Mesuré le 17/10 sur les 74 partants de 2026 :
 *    « Arrêt client » y est saisi 35 fois avec un c minuscule et 4 fois avec
 *    une majuscule. Grouper sur le brut afficherait deux lignes pour un même
 *    motif, dont une à 4 qui passerait pour marginale, alors que l'arrêt
 *    client est de loin la première cause. La table porte déjà le jumeau
 *    normalisé, c'est exactement son usage.
 *
 * CE QUE LA PAGE AURA À EXPLIQUER, et qui sort de la mesure du 17/10 : sur
 * les partants de 2026, l'ancienneté médiane est de 2,5 mois, 58 % sont
 * partis avant trois mois et 35 % avant un mois. Le taux seul dirait
 * « l'agence perd tout le monde », alors qu'elle fait surtout tourner des
 * missions courtes. Il sera trompeur sans la distribution à côté.
 */
export default function Turnover() {
  const { result, compareResult, loading, error } = useRhTurnover();
  const { comparePeriodKey, compareActive } = usePeriod();

  return (
    <Loader loading={loading && !result} label="Chargement des données RH…" minHeight={220}>
      {() => {
        /* Trois états distincts, jamais confondus : la source ne répond pas,
           la source répond vide, la source répond. Même découpage que les
           deux autres vues. */
        if (error) {
          return (
            <>
              <SectionLabel>Turnover et fidélisation</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>Les données RH ne répondent pas</div>
                  <div className={styles.etatTexte}>{error}</div>
                </div>
              </Card>
            </>
          );
        }
        if (!result) {
          return (
            <>
              <SectionLabel>Turnover et fidélisation</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>En attente du registre</div>
                  <div className={styles.etatTexte}>
                    Les règles sont écrites et vérifiées, mais la source n’a rien rendu
                    pour cette période.
                  </div>
                </div>
              </Card>
            </>
          );
        }

        const { tauxTurnover, sorties, effectifMoyen, moisComptes } = result;

        /* L'ÉCART EST EN POINTS, PAS EN POURCENTAGE : comparer deux taux en
           pourcentage donnerait « +73 % » pour un passage de 87 à 152, ce qui
           se lit comme un taux de 73. La maquette écrit « -42 pts », et c'est
           la bonne forme.

           L'INVERSION EST NÉCESSAIRE ICI. Le turnover qui baisse est une
           bonne nouvelle : la couleur vire au vert quand le chiffre descend,
           pendant que la flèche continue de suivre le chiffre. C'est la même
           distinction que sur la tuile « Sorties » de la page précédente. */
        const comparaison = compareActive
          ? comparePtsText(tauxTurnover, compareResult?.tauxTurnover ?? null, comparePeriodKey, true)
          : false;

        return (
          <div className={styles.page}>
            <SectionLabel badge="Sheet LISTE DES COLLABORATEURS">Turnover et fidélisation</SectionLabel>
            <div className={styles.kpiGrid}>
              {/* LE TAUX DE TURNOVER GLOBAL. La formule a été choisie sur
                  mesure le 19/10, les quatre candidates ayant été calculées
                  sur les vraies données avant de trancher. Le détail et le
                  tableau comparatif sont en tête de la route, dans
                  server/src/routes/rh.js.

                  CE N'EST PAS UN TAUX ANNUEL : il porte sur la période
                  choisie. Septembre seul donne 5 %, l'année en cours 90. La
                  ligne du bas doit donc rappeler sur quoi il est calculé,
                  sinon les deux chiffres paraissent se contredire.

                  AU-DESSUS DE 100 % N'EST PAS UNE ERREUR : 2025 est à 152 %.
                  Une agence dont les missions durent quelques mois remplace
                  plus d'une fois chaque poste dans l'année. Rien ici ne doit
                  écrêter la valeur. */}
              <KPICard
                label="Taux de turnover global"
                value={tauxTurnover === null ? '-' : fmtNumber(tauxTurnover)}
                unit={tauxTurnover === null ? '' : ' %'}
                compare={comparaison}
                trend={{
                  dir: 'neutral',
                  text: tauxTurnover === null
                    ? 'Aucun effectif sur la période'
                    : `${fmtNumber(sorties)} départ${sorties > 1 ? 's' : ''} pour ${fmtNumber(effectifMoyen)} en moyenne sur ${moisComptes} mois`,
                }}
              />
            </div>

            <Card>
              <div className={styles.etat}>
                <div className={styles.etatTitre}>Vue en construction</div>
                <div className={styles.etatTexte}>
                  Première tuile posée. Viennent ensuite la rétention à un an, la
                  réintégration après perte non fautive, le délai de replacement, le
                  turnover par département et le motif des sorties.
                </div>
              </div>
            </Card>
          </div>
        );
      }}
    </Loader>
  );
}
