import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import { EvolutionMouvements } from './EvolutionEffectifs';
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

        const { demarrages, fins, ancienneteFinMission } = result;

        /* LA COMPARAISON D'UNE MOYENNE SANS POPULATION N'EXISTE PAS. Quand
           personne n'est parti sur la période de référence, il n'y a aucun
           chiffre à comparer : août 2026 est exactement ce cas. On le dit
           dans les mots de la maquette plutôt que d'afficher un écart
           fabriqué, ou pire, de traiter l'absence comme un zéro qui ferait
           chuter la moyenne de 100 %. */
        const refAnciennete = compareResult?.ancienneteFinMission ?? null;
        const comparaisonAnciennete = (() => {
          if (ancienneteFinMission === null) {
            return { dir: 'neutral', text: 'Aucun départ sur la période' };
          }
          if (!compareResult) return null;
          if (refAnciennete === null) {
            return { dir: 'neutral', text: '0 départ sur la période précédente' };
          }
          /* PAS D'INVERSION ICI, contrairement aux sorties. Une ancienneté qui
             monte n'est ni bonne ni mauvaise en soi : partir après deux ans
             n'est pas « pire » que partir après deux mois, c'est autre chose.
             On laisse donc la couleur neutre et on affiche l'écart brut. */
          const ecart = Math.round((ancienneteFinMission - refAnciennete) * 10) / 10;
          return {
            dir: 'neutral',
            text: `${ecart > 0 ? '+' : ''}${fmtNumber(ecart)} mois vs période précédente`,
          };
        })();

        return (
          <div className={styles.page}>
            <SectionLabel badge="Sheet LISTE DES COLLABORATEURS">Mouvements et parcours</SectionLabel>
            <div className={styles.kpiGrid}>
              <KPICard
                label="Entrées"
                value={fmtNumber(demarrages)}
                unit={demarrages > 1 ? ' collaborateurs' : ' collaborateur'}
                compare={compareResult
                  ? compareValueText(demarrages, compareResult.demarrages, comparePeriodKey)
                  : null}
                trend={{ dir: 'neutral', text: 'Collaborateurs arrivés dans la période' }}
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
                unit={fins > 1 ? ' collaborateurs' : ' collaborateur'}
                compare={compareResult
                  ? compareValueText(fins, compareResult.fins, comparePeriodKey, true)
                  : null}
                trend={{ dir: 'neutral', text: 'Collaborateurs partis dans la période' }}
              />
              {/* ANCIENNETÉ MOYENNE À LA FIN DE MISSION, posée le 17/10.
                  ELLE NE SE LIT PAS SEULE. Clémence l'a écrit le 05/10 : elle
                  se regarde À CÔTÉ de la durée moyenne de mission. « 11 mois
                  d'ancienneté contre 6 mois de durée de mission, cela veut
                  dire que les agents ont du turnover sur au moins une autre
                  mission. » L'écart entre les deux chiffres est l'indicateur ;
                  chacun pris seul ne dit presque rien. La quatrième tuile
                  portera ce second terme.

                  Ancienneté = temps passé DANS L'AGENCE, de la toute première
                  mission au départ, et surtout pas la durée de la dernière,
                  qui est justement l'autre terme du couple. Faratiana
                  Mianintsoa, partie en juin, a une dernière mission d'UN JOUR
                  pour douze mois et demi d'ancienneté : c'est précisément ce
                  que ce couple donne à voir. */}
              <KPICard
                label="Ancienneté moy. à la fin de mission"
                value={ancienneteFinMission === null ? '—' : fmtNumber(ancienneteFinMission)}
                unit={ancienneteFinMission === null ? '' : ' mois'}
                compare={comparaisonAnciennete}
                trend={{ dir: 'neutral', text: 'Profils récents ou expérimentés qui partent' }}
              />

              {/* PAS DE TROISIÈME TUILE « SOLDE NET » ICI. Elle y a figuré
                  quelques heures le 16/10, puis a été retirée : ni Jimmy ni la
                  maquette ne l'avaient demandée, je l'avais ajoutée de ma
                  propre initiative et justifiée après coup. Le solde se lit
                  désormais au survol d'un mois du graphique ci-dessous, là où
                  ses deux termes sont déjà sous les yeux. */}
            </div>

            {/* LES BARRES ARRIVENT DE LA PAGE PRÉCÉDENTE, où elles
                cohabitaient avec la courbe d'effectif. Elles parlent de
                mouvements, elles appartiennent donc à la page des mouvements.
                Les deux graphiques lisent la même route, /api/rh/evolution,
                donc les chiffres ne peuvent pas diverger. */}
            <EvolutionMouvements />
          </div>
        );
      }}
    </Loader>
  );
}
