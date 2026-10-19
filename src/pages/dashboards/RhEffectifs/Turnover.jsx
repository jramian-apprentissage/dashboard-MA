import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import MotifBar from '../../../components/ui/MotifBar';
import { libelleMotif } from '../../../data/motifsSortie';
import { libelleFamille } from '../../../data/familles';
import { useRhTurnover } from '../../../hooks/useRhData';
import { comparePtsText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber } from '../../../utils/formatNumber';
import styles from './Rh.module.css';

/* Vue 3 du Suivi des effectifs, « Turnover et fidélisation ».
 *
 * CETTE PAGE EST ANNUELLE DANS LA MAQUETTE, « Année en cours » et « vs année
 * précédente », mais le sélecteur de période n'offre PAS d'année : jour,
 * semaine, mois, trimestre, personnalisé. Elle s'ouvre donc sur le mois
 * précédent, où le turnover vaut 5 % au lieu de 90, et l'année se regarde en
 * passant par « Personnaliser ». Signalé à Jimmy le 19/10 avec la correction
 * possible, ajouter l'année au sélecteur en l'écartant des dashboards
 * commerciaux dont la source ne commence qu'au 1er août : il a tranché pour
 * ne rien ajouter. À ne pas « corriger » de sa propre initiative.
 *
 * EN COURS DE CONSTRUCTION, une carte à la fois. Ce que la maquette commande
 * pour cette page, et qui reste à poser :
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

        const { tauxTurnover, sorties, effectifMoyen, moisComptes,
                retention1An, retention2Ans, reintegration, delaiReplacement,
                sortiesParMotif, turnoverParDepartement, causesDeDepart } = result;

        /* Les trois nombres de la mention du bas, calculés ici pour qu'ils ne
           puissent pas se contredire : sans commentaire, avec un commentaire
           qui ne dit pas la cause, et le total qui ne dit pas pourquoi. */
        const sansCommentaire = causesDeDepart
          ? causesDeDepart.total - causesDeDepart.avecCommentaire
          : 0;
        const nonRenseignees = causesDeDepart?.lignes?.find(l => l.cause === 'Non renseigné')?.n ?? 0;
        const notesSansCause = Math.max(0, nonRenseignees - sansCommentaire);

        /* L'ÉCART EST EN POINTS, PAS EN POURCENTAGE : comparer deux taux en
           pourcentage donnerait « +73 % » pour un passage de 87 à 152, ce qui
           se lit comme un taux de 73. La maquette écrit « -42 pts », et c'est
           la bonne forme.

           L'INVERSION EST NÉCESSAIRE ICI. Le turnover qui baisse est une
           bonne nouvelle : la couleur vire au vert quand le chiffre descend,
           pendant que la flèche continue de suivre le chiffre. C'est la même
           distinction que sur la tuile « Sorties » de la page précédente. */
        /* UN TAUX ABSENT N'EST PAS UN CALCUL EN COURS. Quand la période de
           référence ne rend aucun taux, comparePtsText rend null, et KPICard
           lit ce null comme « la comparaison n'est pas encore arrivée » : il
           affiche « Calcul en cours… », indéfiniment. Constaté le 19/10 sur
           2024, dont la période précédente n'a aucune cohorte d'un an.
           On distingue donc les deux cas, et on DIT l'absence. */
        const comparerPts = (valeur, reference, absence, invert = false) => {
          if (!compareActive) return false;
          if (valeur === null || valeur === undefined) return false;
          if (reference === null || reference === undefined) return { dir: 'neutral', text: absence };
          return comparePtsText(valeur, reference, comparePeriodKey, invert);
        };

        const comparaison = comparerPts(
          tauxTurnover, compareResult?.tauxTurnover ?? null,
          'Aucun effectif à comparer', true,
        );

        /* PAS D'INVERSION SUR LA RÉTENTION, contrairement au turnover : une
           rétention qui monte est une bonne nouvelle, donc le sens par défaut
           convient. Les deux tuiles voisines ont des conventions opposées,
           c'est normal, elles mesurent des choses opposées. */
        const comparaisonRetention = comparerPts(
          retention1An?.taux ?? null, compareResult?.retention1An?.taux ?? null,
          'Aucune cohorte à comparer',
        );

        const comparaisonReintegration = comparerPts(
          reintegration?.taux ?? null, compareResult?.reintegration?.taux ?? null,
          'Aucune perte à comparer',
        );

        /* UN DÉLAI NE SE COMPARE PAS EN POINTS. comparePtsText écrirait
           « -13 pts », qui se lit comme un taux alors qu'il s'agit de jours.
           D'où ces quelques lignes plutôt qu'un détournement de l'utilitaire
           partagé, qui servirait mal les deux usages.
           L'inversion est la même que sur le turnover : un délai qui raccourcit
           est une bonne nouvelle, donc vert quand le chiffre descend. */
        const comparaisonDelai = (() => {
          if (!compareActive) return false;
          const v = delaiReplacement?.moyen;
          if (v === null || v === undefined) return false;
          const ref = compareResult?.delaiReplacement?.moyen;
          if (ref === null || ref === undefined) return { dir: 'neutral', text: 'Aucun replacement à comparer' };
          const ecart = Math.round(v - ref);
          return {
            dir: ecart === 0 ? 'neutral' : ecart > 0 ? 'down' : 'up',
            sens: ecart === 0 ? 'neutral' : ecart > 0 ? 'up' : 'down',
            text: `${ecart === 0 ? '=' : (ecart > 0 ? '+' : '') + fmtNumber(ecart) + ' j'} vs période précédente`,
          };
        })();

        return (
          <div className={styles.page}>
            <SectionLabel badge="Sheet LISTE DES COLLABORATEURS">Turnover et fidélisation</SectionLabel>
            <div className={styles.rangeeTuiles}>
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

              {/* LA RÉTENTION À 1 AN EST UNE SURVIE, pas une présence : parmi
                  les gens qui ont ATTEINT leur douzième mois, combien étaient
                  encore là CE JOUR-LÀ. L'autre lecture a été mesurée et
                  écartée le 19/10, le détail est en tête de la route.

                  LE 2 ANS VA DANS LA LIGNE DU BAS, comme sur la maquette, et
                  il ressort plus HAUT que le 1 an : 49 % contre 33. Ce n'est
                  pas une erreur, les deux ne portent pas sur les mêmes
                  personnes, et c'est la note sous la rangée qui le dit. */}
              <KPICard
                label="Taux de rétention à 1 an"
                value={retention1An?.taux === null || retention1An === undefined ? '-' : fmtNumber(retention1An.taux)}
                unit={retention1An?.taux === null || retention1An === undefined ? '' : ' %'}
                compare={comparaisonRetention}
                trend={{
                  dir: 'neutral',
                  text: retention2Ans?.taux === null || retention2Ans === undefined
                    /* Avant octobre 2026, personne n'avait deux ans
                       d'ancienneté : on le dit, au lieu d'afficher un taux
                       sur une cohorte vide. */
                    ? 'Personne n’a encore deux ans d’ancienneté'
                    : `À 2 ans : ${fmtNumber(retention2Ans.taux)} % sur ${fmtNumber(retention2Ans.n)} personnes`,
                }}
              />

              {/* RÉINTÉGRATION APRÈS PERTE NON FAUTIVE. « Non fautive » vaut
                  ici « tout sauf démission », décision prise après mesure :
                  la base n'a aucun motif de faute, les cinq valeurs de
                  motif_normal sont arrêt client, démission, fin de mission,
                  stand by et vide. Le détail est en tête de la route.

                  LA LIGNE DU BAS DONNE LA BASE, et ce n'est pas une
                  précaution de style : le taux repose sur 4 replacements en
                  2026. Il n'est pas faux, il est fragile, et un lecteur qui
                  voit 6,8 % sans le nombre de cas croit à une politique là
                  où il n'y a que des cas isolés. */}
              <KPICard
                label="Taux de réintégration après perte non fautive"
                value={reintegration?.taux === null || reintegration === undefined ? '-' : fmtNumber(reintegration.taux)}
                unit={reintegration?.taux === null || reintegration === undefined ? '' : ' %'}
                compare={comparaisonReintegration}
                trend={{
                  dir: 'neutral',
                  /* « PERSONNES REPLACÉES » ET NON « REPLACEMENTS », parce
                     que la tuile voisine compte des replacements au sens
                     d'évènements et n'annonce pas le même nombre : 12 ici et
                     13 là en 2025, une personne ayant été replacée deux fois.
                     Les deux sont justes, mais le même mot sur deux chiffres
                     voisins se lit comme une erreur de calcul. */
                  text: reintegration?.pertes
                    ? `${fmtNumber(reintegration.reprises)} personne${reintegration.reprises > 1 ? 's' : ''} replacée${reintegration.reprises > 1 ? 's' : ''} sur ${fmtNumber(reintegration.pertes)}`
                    : 'Aucune perte non fautive sur la période',
                }}
              />

              {/* DÉLAI DE REPLACEMENT. Moyenne en valeur et médiane dans la
                  ligne du bas, choix de Jimmy le 19/10. Les deux sont rendus
                  par la route parce qu'ils divergent franchement dès qu'un
                  cas s'éloigne : 62 contre 38 jours en 2025, où un seul
                  replacement à 217 jours tire toute la moyenne. Donner les
                  deux évite d'avoir à choisir entre le chiffre que Clémence a
                  vu sur la maquette et celui qui décrit le cas courant. */}
              <KPICard
                label="Délai de replacement après perte de mission"
                value={delaiReplacement?.moyen === null || delaiReplacement === undefined ? '-' : fmtNumber(delaiReplacement.moyen)}
                unit={delaiReplacement?.moyen === null || delaiReplacement === undefined ? '' : ' j'}
                compare={comparaisonDelai}
                trend={{
                  dir: 'neutral',
                  text: delaiReplacement?.cas
                    ? `Médiane ${fmtNumber(delaiReplacement.median)} j, sur ${fmtNumber(delaiReplacement.cas)} replacement${delaiReplacement.cas > 1 ? 's' : ''}`
                    : 'Aucun replacement sur la période',
                }}
              />
            </div>

            {/* POURQUOI CETTE NOTE EXISTE. Deux taux de fidélisation dont le
                plus long est le plus élevé se lisent comme une erreur de
                calcul. Elle nomme la seule chose qui l'explique, la taille et
                la nature des deux populations, sans conclure à la place du
                lecteur sur ce qui a changé dans l'agence.

                ELLE N'APPARAÎT QUE S'IL Y A DEUX TAUX. Sans cohorte à deux
                ans, il n'y a pas de paradoxe à désamorcer, et la note
                affirmait alors une absurdité : « 8 collaborateurs ont atteint
                leur premier anniversaire, un taux à deux ans plus élevé n'est
                donc pas une incohérence », sur une période où aucun taux à
                deux ans n'existe. Vu sur 2024 le 19/10. */}
            {retention1An?.n && retention2Ans?.n ? (
              <div className={styles.mention}>
                Les deux taux ne portent pas sur les mêmes personnes :{' '}
                {fmtNumber(retention1An.n)} collaborateurs ont atteint leur premier
                anniversaire dans l’agence, {fmtNumber(retention2Ans.n)} leur deuxième.
                Un taux à deux ans plus élevé n’est donc pas une incohérence.
              </div>
            ) : null}
            </div>

            {/* LA RANGÉE DE LA MAQUETTE : turnover par département à gauche,
                part des sorties par motif à droite. La carte de gauche reste
                à faire, et elle garde sa place plutôt que de laisser celle de
                droite s'étaler sur toute la largeur, qu'il faudrait défaire
                en l'ajoutant. */}
            <div className={styles.deuxCol}>
              {/* TURNOVER PAR DÉPARTEMENT.
                  LES BARRES SONT À L'ÉCHELLE DU PLUS FORT, pas sur 100, et
                  c'est pour ça que MotifBar a reçu une largeur distincte de
                  sa valeur. Ce ne sont pas des parts d'un total mais des
                  TAUX : l'administratif est à 170 % en 2026. Écrêter à 100
                  aurait donné la même longueur à un département qui remplace
                  tout son effectif une fois et à un autre qui le remplace
                  presque deux fois.

                  LA VENTILATION EST UNE VRAIE DÉCOMPOSITION, vérifié à
                  chaque appel par la route : la somme des sorties vaut la
                  tuile, celle des effectifs moyens vaut le dénominateur
                  global. Le taux d'ensemble est donc la combinaison de
                  ceux-ci, et non un chiffre calculé à part qui pourrait
                  diverger en silence. */}
              <Card title="Turnover par département">
                {turnoverParDepartement?.length ? (
                  <>
                    {(() => {
                      const max = Math.max(...turnoverParDepartement.map(d => d.taux || 0), 1);
                      return turnoverParDepartement.map(d => (
                        <MotifBar
                          key={d.famille}
                          label={libelleFamille(d.famille)}
                          pct={d.taux === null ? 0 : d.taux}
                          largeur={d.taux === null ? 0 : Math.round((100 * d.taux) / max)}
                          count={d.sorties}
                          fillColor="rgba(38,0,31,0.95)"
                          title={`${fmtNumber(d.sorties)} sortie${d.sorties > 1 ? 's' : ''} pour ${fmtNumber(d.effectifMoyen)} personnes en moyenne`}
                        />
                      ));
                    })()}
                    <div className={styles.mention}>
                      Taux de turnover du département, et non une part d’un total :
                      les barres sont à l’échelle du plus fort. Au-dessus de 100 %, le
                      département a remplacé plus d’une fois chacun de ses postes sur
                      la période. Le nombre à droite est celui des sorties.
                    </div>
                  </>
                ) : (
                  <div className={styles.etat}>
                    <div className={styles.etatTexte}>Aucun département sur la période.</div>
                  </div>
                )}
              </Card>

              {/* PART DES SORTIES PAR MOTIF.
                  ELLE COMPTE DES FINS DE MISSION, pas des personnes, et c'est
                  la seule exception assumée à la règle de la page : un motif
                  appartient à une mission qui s'arrête. Cinq personnes voient
                  d'ailleurs leurs missions s'arrêter pour des motifs
                  différents en 2026. D'où le total annoncé en toutes lettres
                  sous les barres, pour qu'on ne le confonde pas avec la tuile
                  « Sorties » de la page 2, qui compte 78 personnes là où il y
                  a 86 fins de mission. */}
              <Card title="Part des sorties par motif">
                {sortiesParMotif?.lignes?.length ? (
                  <>
                    {sortiesParMotif.lignes.map(l => (
                      <MotifBar
                        key={l.motif || 'non-saisi'}
                        label={libelleMotif(l.motif)}
                        pct={l.part}
                        count={l.n}
                        fillColor="rgba(38,0,31,0.95)"
                      />
                    ))}
                    <div className={styles.mention}>
                      {fmtNumber(sortiesParMotif.total)} fins de mission sur la période.
                      Le motif porte sur la mission qui s’arrête, pas sur la personne :
                      quelqu’un qui quitte deux missions compte deux fois.
                    </div>
                  </>
                ) : (
                  <div className={styles.etat}>
                    <div className={styles.etatTexte}>
                      Aucune fin de mission sur la période.
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* L'ANALYSE DES SORTIES, demandée par Clémence en relecture.
                ELLE NE SORT PAS DE LA COLONNE MOTIF, qui dit QUI a mis fin à
                la mission et jamais POURQUOI, mais du commentaire en texte
                libre, lu par une grille de mots-clés. Le détail des règles et
                leurs pièges sont dans server/src/causesDepart.js.

                C'EST LA SEULE CARTE DE LA PAGE DONT LES CHIFFRES SONT
                INTERPRÉTÉS, et la mention du bas le dit : ailleurs on compte
                des dates, ici on lit des phrases écrites à la main. */}
            {causesDeDepart?.lignes?.length ? (
              <>
                <SectionLabel>Analyse des sorties</SectionLabel>
                <Card title="Cause des départs">
                  <table className={styles.tbl}>
                    <thead>
                      <tr><th>Cause</th><th>Sorties</th><th>Part</th></tr>
                    </thead>
                    <tbody>
                      {causesDeDepart.lignes.map(l => (
                        <tr key={l.cause}>
                          <td>{l.cause}</td>
                          <td className={styles.num}>{fmtNumber(l.n)}</td>
                          <td className={styles.num}>{fmtNumber(l.part)} %</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className={styles.mention}>
                    {fmtNumber(causesDeDepart.avecCommentaire)} des{' '}
                    {fmtNumber(causesDeDepart.total)} fins de mission portent un
                    commentaire.
                    {notesSansCause > 0 && (
                      <> Sur ces commentaires, {fmtNumber(notesSansCause)} notent une
                      date de démarrage ou une consigne interne plutôt qu’une cause.</>
                    )}{' '}
                    La cause est donc lue dans une phrase écrite à la main, pas dans une
                    colonne prévue pour ça : c’est le seul endroit de la page où le
                    chiffre repose sur une interprétation.
                  </div>
                </Card>
              </>
            ) : null}
          </div>
        );
      }}
    </Loader>
  );
}
