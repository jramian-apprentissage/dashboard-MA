import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import { EvolutionMouvements } from './EvolutionEffectifs';
import EvolutionAnnuelle from './EvolutionAnnuelle';
import { libelleFamille } from '../../../data/familles';
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

        const { demarrages, fins, ancienneteFinMission, dureeMoyenneMission, departements } = result;

        /* Les moyennes arrivent en nombre ou en null. Un tiret pour le null,
           jamais un zéro : « 0 mois » se lirait comme un départ le jour de
           l'arrivée, alors qu'il n'y a simplement eu aucun départ. */
        const mois = v => (v === null || v === undefined ? '-' : `${fmtNumber(v)} mois`);

        /* LA COMPARAISON D'UNE MOYENNE SANS POPULATION N'EXISTE PAS. Quand
           personne n'est parti sur la période de référence, il n'y a aucun
           chiffre à comparer : août 2026 est exactement ce cas. On le dit
           dans les mots de la maquette plutôt que d'afficher un écart
           fabriqué, ou pire, de traiter l'absence comme un zéro qui ferait
           chuter la moyenne de 100 %. */
        /* Les deux tuiles du couple partagent exactement la même mécanique de
           comparaison : même population, mêmes cas limites, même absence
           d'inversion de couleur. Une seule fonction, donc, plutôt que deux
           blocs jumeaux qui finiraient par diverger. */
        const comparerMois = (valeur, reference) => {
          if (valeur === null) return { dir: 'neutral', text: 'Aucun départ sur la période' };
          if (!compareResult) return null;
          if (reference === null || reference === undefined) {
            return { dir: 'neutral', text: '0 départ sur la période précédente' };
          }
          /* PAS D'INVERSION ICI, contrairement aux sorties. Une ancienneté qui
             monte n'est ni bonne ni mauvaise en soi : partir après deux ans
             n'est pas « pire » que partir après deux mois, c'est autre chose.
             On laisse donc la couleur neutre et on affiche l'écart brut. */
          const ecart = Math.round((valeur - reference) * 10) / 10;
          return {
            dir: 'neutral',
            text: `${ecart > 0 ? '+' : ''}${fmtNumber(ecart)} mois vs période précédente`,
          };
        };
        const comparaisonAnciennete = comparerMois(ancienneteFinMission, compareResult?.ancienneteFinMission ?? null);
        const comparaisonDuree = comparerMois(dureeMoyenneMission, compareResult?.dureeMoyenneMission ?? null);

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

              {/* DURÉE MOYENNE DE MISSION, quatrième tuile, posée le 17/10.
                  Elle remplace « Repositionnement en mission client » de la
                  maquette : c'est le second terme du couple que Clémence a
                  décrit, et il n'a de sens qu'à côté du premier.

                  MÊME POPULATION QUE L'ANCIENNETÉ, c'est la condition pour que
                  son raisonnement tienne. Elle DIVISE les deux pour en tirer
                  le nombre de missions par personne ; sur deux populations
                  différentes le rapport ne voudrait rien dire. On mesure donc
                  toutes les missions des personnes PARTIES sur la période, et
                  pas seulement celle qui s'achève, puisque c'est leur
                  enchaînement qu'on cherche à voir.

                  LE RAPPORT N'EST PAS UN COMPTE EXACT, et il ne faut pas le
                  vendre comme tel : vérifié sur trois mois, il donne 1,00
                  contre 1,00 en septembre, 1,45 contre 1,40 en juin, 1,14
                  contre 1,29 en mars. L'écart vient des missions menées
                  SIMULTANÉMENT, dont les durées se chevauchent au lieu de
                  s'ajouter. C'est un indicateur de tendance, pas un
                  dénombrement. */}
              {/* « TERMINÉE » N'EST PAS UN ORNEMENT. Sans ce mot, la tuile
                  laisse croire qu'elle mesure les missions en cours, et
                  surtout elle rend incompréhensibles les mois où les deux
                  chiffres du couple coïncident. Septembre 2026 en est un :
                  les cinq partants n'avaient jamais eu qu'une seule mission,
                  donc leur première mission EST leur dernière et l'ancienneté
                  se confond avec sa durée. L'égalité est un constat, pas un
                  défaut, et le libellé doit le laisser deviner. */}
              <KPICard
                label="Durée moy. de mission terminée"
                value={dureeMoyenneMission === null ? '—' : fmtNumber(dureeMoyenneMission)}
                unit={dureeMoyenneMission === null ? '' : ' mois'}
                compare={comparaisonDuree}
                trend={{ dir: 'neutral', text: 'À lire avec l’ancienneté : l’écart révèle les missions enchaînées' }}
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
            {/* L'enveloppe porte la marge basse que le Card du graphe n'a pas :
                voir .blocGraphe dans Rh.module.css. Sans elle, le graphe et la
                rangée de deux cartes se touchent. */}
            <div className={styles.blocGraphe}>
              <EvolutionMouvements />
            </div>

            {/* LES QUATRE INDICATEURS DE LA RANGÉE, VENTILÉS PAR DÉPARTEMENT.
                Demande de Jimmy du 17/10. La carte de droite, « Évolution
                annuelle », viendra compléter cette rangée.

                UNE RÈGLE DE RATTACHEMENT A DÛ ÊTRE TRANCHÉE, parce qu'une
                personne porte plusieurs missions donc plusieurs départements
                possibles : une entrée se rattache à la mission qui l'a fait
                entrer, une sortie à celle qu'elle quitte. Autrement on verrait
                des entrées dans un département où la personne n'a pas mis les
                pieds ce mois-là. Le détail est en tête de la requête, dans
                server/src/routes/rh.js.

                LES DEUX MOYENNES NE CONCERNENT QUE LES PARTANTS, comme les
                tuiles dont elles sont la ventilation. Un département qui ne
                perd personne n'a donc pas d'ancienneté à afficher : on y met
                un tiret, pas un zéro, qui se lirait comme « ils partent le
                jour de leur arrivée ». */}
            <div className={styles.deuxCol}>
              <Card title="Mouvements par département">
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      {/* LES EN-TÊTES REPRENNENT MOT POUR MOT LES LIBELLÉS DES
                          TUILES, et pas une abréviation maison : ce tableau en
                          est la ventilation, pas une autre mesure. Un libellé
                          raccourci laisserait croire à un indicateur voisin.
                          Demande de Jimmy du 17/10. */}
                      <th>Département</th><th>Entrées</th><th>Sorties</th>
                      <th>Ancienneté moy. à la fin de mission</th>
                      <th>Durée moy. de mission terminée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departements.map(d => (
                      <tr key={d.famille}>
                        <td>{libelleFamille(d.famille)}</td>
                        <td className={styles.num}>{fmtNumber(d.entrees)}</td>
                        <td className={styles.num}>{fmtNumber(d.sorties)}</td>
                        <td className={styles.num}>{mois(d.anciennete)}</td>
                        <td className={styles.num}>{mois(d.dureeMission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* LE CONTRÔLE EST AFFICHÉ, pas seulement vérifié en coulisse :
                    les deux colonnes de comptage doivent sommer aux deux
                    premières tuiles, et le lire sous le tableau évite d'avoir
                    à le croire. */}
                <div className={styles.mention}>
                  {fmtNumber(departements.reduce((s, d) => s + d.entrees, 0))} entrées et{' '}
                  {fmtNumber(departements.reduce((s, d) => s + d.sorties, 0))} sorties,
                  soit les deux premières tuiles.
                </div>
              </Card>

              <EvolutionAnnuelle />
            </div>
          </div>
        );
      }}
    </Loader>
  );
}
