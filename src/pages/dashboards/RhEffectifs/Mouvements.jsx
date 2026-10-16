import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import { useRhEffectifs } from '../../../hooks/useRhData';
import { compareValueText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber } from '../../../utils/formatNumber';
import styles from './Rh.module.css';

/* Vue 2 du Suivi des effectifs, « Évolution et mouvements ».
 *
 * DEUX PREMIERS INDICATEURS POSÉS LE 16/10 : les entrées et les sorties. Le
 * reste de la vue — répartition des mouvements, motifs de départ — viendra
 * carte par carte.
 *
 * CE SONT DES FLUX, PAS UN STOCK, et c'est la différence avec la page
 * précédente. Un effectif se lit à une DATE, le dernier jour de la période ;
 * un mouvement se compte sur l'INTERVALLE entier. Les confondre est la faute
 * qui guette ici.
 *
 * CES DEUX CHIFFRES ONT ÉTÉ REFAITS LE 16/10, et il faut savoir pourquoi avant
 * de les lire. Les sorties de septembre annonçaient 6, un total juste par
 * COMPENSATION DE DEUX ERREURS : une ligne écrite deux fois dans le classeur
 * en ajoutait une fausse, et un départ noté en colonne J de Suivi Entrées —
 * colonne que l'ingestion jetait — en masquait une vraie. Les deux sont
 * corrigées, le total reste 6 mais il est désormais composé des bonnes
 * personnes. Voir l'en-tête de server/src/routes/rh.js.
 */
export default function Mouvements() {
  const { result, compareResult, loading, error } = useRhEffectifs();
  const { comparePeriodKey } = usePeriod();

  return (
    <Loader loading={loading && !result} label="Chargement des données RH…" minHeight={220}>
      {() => {
        /* Trois états distincts, jamais confondus : la source ne répond pas,
           la source répond vide, la source répond. */
        if (error) {
          return (
            <>
              <SectionLabel>Évolution et mouvements</SectionLabel>
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
              <SectionLabel>Évolution et mouvements</SectionLabel>
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

        const { demarrages, fins } = result;
        const solde = demarrages - fins;

        return (
          <div className={styles.page}>
            <SectionLabel badge="Sheet LISTE DES COLLABORATEURS">Mouvements de la période</SectionLabel>
            <div className={styles.kpiGrid}>
              <KPICard
                label="Entrées"
                value={fmtNumber(demarrages)}
                unit={demarrages > 1 ? ' missions' : ' mission'}
                compare={compareResult
                  ? compareValueText(demarrages, compareResult.demarrages, comparePeriodKey)
                  : null}
                trend={{ dir: 'neutral', text: 'Missions démarrées dans la période' }}
              />
              {/* LA COMPARAISON DES SORTIES EST INVERSÉE, quatrième argument à
                  true : moins de départs est une bonne nouvelle, la couleur
                  doit donc virer au vert quand le chiffre baisse. La flèche,
                  elle, continue de suivre le chiffre — c'est la distinction
                  entre `sens` et `dir` posée dans compareText.js, et la
                  mélanger affichait « ↘ +11 % », qui se lit comme une erreur
                  de calcul. */}
              <KPICard
                label="Sorties"
                value={fmtNumber(fins)}
                unit={fins > 1 ? ' missions' : ' mission'}
                compare={compareResult
                  ? compareValueText(fins, compareResult.fins, comparePeriodKey, true)
                  : null}
                trend={{ dir: 'neutral', text: 'Missions arrêtées dans la période' }}
              />
              {/* LE SOLDE N'EST PAS UN TROISIÈME INDICATEUR INDÉPENDANT, c'est
                  la différence des deux précédents. Il est affiché parce qu'un
                  lecteur la fait de tête de toute façon, et qu'il vaut mieux
                  qu'elle soit juste. Sa comparaison est volontairement absente :
                  comparer un solde à un autre solde se lit mal — passer de
                  -2 à +5 n'est pas « +350 % ». */}
              <KPICard
                label="Solde net"
                value={`${solde > 0 ? '+' : ''}${fmtNumber(solde)}`}
                unit={Math.abs(solde) > 1 ? ' missions' : ' mission'}
                compare={{ dir: 'neutral', text: 'Entrées moins sorties' }}
                trend={{
                  dir: solde > 0 ? 'up' : solde < 0 ? 'down' : 'neutral',
                  text: `${fmtNumber(demarrages)} entrée${demarrages > 1 ? 's' : ''} `
                    + `pour ${fmtNumber(fins)} sortie${fins > 1 ? 's' : ''}`,
                }}
              />
            </div>

            <Card>
              <div className={styles.etat}>
                <div className={styles.etatTitre}>Vue en cours de composition</div>
                <div className={styles.etatTexte}>
                  Les entrées et les sorties sont posées. La répartition des mouvements
                  et les motifs de départ viendront ensuite, carte par carte.
                </div>
              </div>
            </Card>
          </div>
        );
      }}
    </Loader>
  );
}
