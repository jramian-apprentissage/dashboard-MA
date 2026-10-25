import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import MotifBar from '../../../components/ui/MotifBar';
import DonutChart from '../../../components/ui/DonutChart';
import { libelleFamille } from '../../../data/familles';
import { useRhQualite } from '../../../hooks/useRhData';
import { compareValueText, comparePtsText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber, partPct, fmtPourcentage } from '../../../utils/formatNumber';
import styles from '../RhEffectifs/Rh.module.css';

/* Chart.js s'enregistre par fichier dans ce projet, et seulement pour ce qu'on
   utilise : voir Pipeline.jsx et EvolutionEffectifs.jsx. */
Chart.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

/* LITTÉRAUX, jamais `var(--myrtille)` : le canvas de Chart.js ne résout pas les
   variables CSS, il ignore SILENCIEUSEMENT ce qu'il ne sait pas lire et garde
   la couleur précédente. Règle déjà écrite en tête de la palette ASUS, et elle
   a coûté un bug muet.

   LES DEUX COURBES S'OPPOSENT, donc leurs couleurs aussi : le myrtille pour ce
   qui aboutit, l'encre abricot pour ce qui se perd. Les barres de volume
   passent en ciment, derrière, parce qu'elles servent de contexte et non de
   message — c'est le même partage que sur le graphe de la vue 2. */
const C_REALISE = 'rgba(38,0,31,0.88)';     // myrtille
const C_PERDU = 'rgba(136,84,48,0.90)';     // encre abricot
const C_VOLUME = 'rgba(167,173,170,0.45)';  // ciment, en retrait

/* '2026-04' → 'avr.', fabriqué en UTC. Un `new Date('2026-04')` est interprété
   en UTC puis réaffiché en heure locale, ce qui recule d'un mois à l'ouest de
   Greenwich et afficherait « mars » pour avril. Même fonction que dans
   Pipeline et EvolutionEffectifs, même raison. */
function libelleMois(ym) {
  const [a, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' });
}
function libelleMoisLong(ym) {
  const [a, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 1))
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/* UNE COULEUR PAR MOTIF, dans l'ordre de la nomenclature. Pas une rampe : les
   motifs ne sont pas ordonnés, aucun n'est « plus » qu'un autre.
   « NON RENSEIGNÉ » EST EN CIMENT, la couleur du « reste » partout dans ce
   dépôt, et c'est délibéré : c'est la plus grosse barre de la carte, onze sur
   trente et un, et elle ne doit surtout pas ressembler à un motif. Lui donner
   une teinte franche la ferait lire comme une cause parmi les autres. */
const COULEURS_MOTIF = {
  non_renseigne:   'rgba(167,173,170,0.50)', // ciment : une absence, pas une cause
  couvert_autrement: 'rgba(142,207,170,0.80)',
  sans_retour:     'rgba(196,135,106,0.80)',
  conditions:      'rgba(136,84,48,0.78)',
  redefini:        'rgba(123,170,191,0.78)',
  decision_ma:     'rgba(38,0,31,0.70)',
  profils_refuses: 'rgba(201,170,196,0.85)',
};

/* Les deux couleurs du graphe mensuel. Littéraux, le canvas ne lit pas les
   jetons CSS. */
/* LES MÊMES CINQ TEINTES QUE SUR LE PIPELINE, liées au code du métier et non
   à son rang : deux cartes du même dashboard qui découpent les mêmes métiers
   doivent les peindre pareil, sinon on ne compare plus rien d'un écran à
   l'autre. Littéraux, le canvas ne lit pas les jetons CSS. */
const COULEURS_MISSION = {
  SO: 'rgba(255,249,147,0.95)', // soleil
  AV: 'rgba(38,0,31,0.80)',     // myrtille
  CS: 'rgba(196,135,106,0.85)', // terracotta
  IT: 'rgba(123,170,191,0.75)', // bleu
  DS: 'rgba(142,207,170,0.75)', // vert
};
const COULEUR_A_CLASSER = 'rgba(167,173,170,0.50)';

const C_MOIS_REALISE = 'rgba(38,0,31,0.78)';
const C_MOIS_PERDU = 'rgba(196,135,106,0.85)';
const C_MOIS_VOLUME = 'rgba(38,0,31,0.88)';

/* Vue 3 du dashboard Recrutement, « Performance et qualité », planche 16.
 *
 * LA PAGE SUIT LA PLANCHE ET LES CINQ ANNOTATIONS DE CLÉMENCE, qui sont des
 * cadres posés sur la maquette et non des commentaires PowerPoint. Chacune est
 * reprise à l'endroit où elle s'applique, et dite dans le code :
 *
 *   1. « Mettre Recrutements réalisés comme sur la slide 13 ? » — fait. La
 *      tuile ne s'appelle plus « finalisés » et ne compte plus les dates de
 *      démarrage mais les placements, exactement comme la vue 1.
 *   2. « Un graphe mensuel comparant taux de recrutement réalisé et taux de
 *      besoins non aboutis ? » — fait, avec sa réserve écrite sous le graphe.
 *   3. « Le volume n'est-il pas déjà dans le taux de besoins non aboutis ? » —
 *      la réponse est NON depuis le fichier du 22/10, voir plus bas.
 *   4. « Comme je te l'ai dit, je suis pas fan » sur le graphe des recruteurs,
 *      et dans son mail : recentrer sur la CHARGE assignée, pas sur la
 *      performance individuelle. La carte compte donc ce que chacun porte
 *      encore, jamais ce qu'il a conclu, et le dit sous la carte.
 *   5. « Intervertir l'ordre, ce widget est lié au taux de besoins non
 *      aboutis, pas à la répartition des besoins. » — le détail des besoins
 *      clôturés est remonté dans la section Qualité, contre le taux dont il
 *      est le détail, et il a quitté « Répartition des besoins ».
 *
 * L'ANNOTATION 3 APPELAIT « OUI » LE 21/10 ET APPELLE « NON » AUJOURD'HUI, et
 * c'est le fichier qui a changé, pas l'avis. Sur le FCC d'alors, les besoins
 * clôturés sans recrutement et les besoins annulés rendaient le même ensemble
 * de quatorze lignes : la tuile répétait bien le numérateur du taux. Depuis
 * l'ingestion du 22/10 les deux colonnes se séparent nettement — 23 annulés
 * contre 8 clôturés sans recrutement sur l'année. Ce sont deux histoires
 * distinctes : le client retire sa demande d'un côté, la recherche se termine
 * sans placer personne de l'autre. La troisième tuile garde donc sa place, et
 * son sous-titre dit ce qu'elle n'est pas.
 *
 * AUCUN MOTIF N'EST AFFICHÉ NULLE PART, et ce n'est pas un oubli : le classeur
 * n'a pas de colonne de motif. La maquette l'avouait déjà sous la tuile,
 * « aucun motif au fichier ». On peut dire combien et lesquels, jamais
 * pourquoi. Le commentaire libre ne comble pas ce trou — il parle d'autre
 * chose une fois sur deux, et le prendre pour un motif inventerait la donnée
 * la plus sensible de la vue. */
export default function Performance() {
  const { comparePeriodKey } = usePeriod();
  /* Déclaré ici et pas dans le corps du Loader : ce corps est une fonction que
     le Loader n'appelle QUE s'il a fini de charger, donc un useState posé
     dedans serait un appel de hook conditionnel. */
  const { result, compareResult, loading, error } = useRhQualite();

  return (
    <Loader loading={loading && !result} label="Chargement de la qualité…" minHeight={220}>
      {() => {
        /* Trois états, jamais confondus, comme sur les deux autres vues : la
           source ne répond pas, la source répond vide, la source répond. */
        if (error) {
          return (
            <div className={styles.page}>
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Qualité de recrutement</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>Les données du FCC ne répondent pas</div>
                  <div className={styles.etatTexte}>{error}</div>
                </div>
              </Card>
            </div>
          );
        }
        if (!result || result.demandes === 0) {
          return (
            <div className={styles.page}>
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Qualité de recrutement</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>Aucun besoin sur cette période</div>
                  <div className={styles.etatTexte}>
                    Aucun besoin n’a été demandé entre ces deux dates, donc rien ne
                    peut avoir abouti ni échoué. Si la page reste vide sur toutes les
                    périodes, le classeur FCC n’est pas chargé :
                    <code>scripts/ingest-fcc-fichier.js</code>.
                  </div>
                </div>
              </Card>
            </div>
          );
        }

        const {
          demandes, realises, annules, enCours,
          tauxNonAbouti,
          tauxR3, r3Base, r3Passe,
          tauxPrez, prezBase, prezAboutis,
          satisfactionN, satisfaits, tauxSatisfaction,
          motifs, parMission,
          evolution,
        } = result;
        const s = n => (n > 1 ? 's' : '');

        const motifTotal = motifs.reduce((n, m) => n + m.total, 0);
        const missions = parMission.map(m => ({
          ...m,
          libelle: m.cle ? libelleFamille(m.cle) : 'À classer',
          couleur: m.cle ? (COULEURS_MISSION[m.cle] || COULEUR_A_CLASSER) : COULEUR_A_CLASSER,
        }));
        const nonAboutisMissions = missions.reduce((n, m) => n + m.annules, 0);

        /* La charge totale porte TOUS les besoins ouverts, y compris ceux dont
           la case « responsable » est vide : c'est elle qui fait le dénominateur
           des parts, sinon les pourcentages feraient plus de 100 en additionnant
           des barres calculées sur un sous-ensemble. */
        const chargeTotale = enCours;


        return (
          <div className={styles.page}>

            {/* ── Planche 16, section « Qualité de recrutement » ───────────── */}
            <SectionLabel badge="Onglet Suivi de commande RH Q2">Qualité de recrutement</SectionLabel>
            {/* LA RANGÉE A ÉTÉ ENTIÈREMENT REFAITE le 22/10 — « supprime tout ce
                qu'il y a actuellement dans qualité ». Partent « Recrutements
                réalisés », qui faisait doublon avec la vue 1, et « Besoins
                clôturés sans recrutement », dont le volume vit maintenant dans
                la carte des motifs.

                QUATRE TAUX ET RIEN D'AUTRE : la section s'appelle qualité, et
                une qualité se mesure en proportions, pas en volumes. Chaque
                sous-titre porte la fraction qui la produit, pour qu'on puisse
                la refaire de tête.

                « R3 » A DISPARU DES LIBELLÉS le 23/10 — « R3 ne parle à
                personne ». Le code reste la clé en base et sur la barre à neuf
                crans, où il est toujours collé à son sens (« R3 · Entretien
                approfondi ») ; seul il ne dit rien. Les deux tuiles se lisent
                donc en français, et en parallèle : après l'entretien, après la
                présentation.

                LES DEUX NE SE LISENT QUE SUR LES BESOINS CLOS. Un besoin encore
                en cours au stade de la présentation n'a pas échoué, il n'a pas
                fini :
                l'inclure ferait baisser les taux à mesure que le pipeline se
                remplit, c'est-à-dire quand tout va bien. */}
            <div className={styles.kpiGrid}>

              <KPICard
                label="Taux de réussite après l’entretien approfondi"
                value={tauxR3 == null ? '-' : fmtNumber(tauxR3)}
                unit={tauxR3 == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxR3, compareResult.tauxR3, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: r3Base === 0
                    ? 'Aucun besoin clos n’est arrivé à l’entretien'
                    : `${fmtNumber(r3Passe)} besoin${s(r3Passe)} poursuivent sur ${fmtNumber(r3Base)} arrivés à l’entretien · besoins clos`,
                }}
              />

              <KPICard
                label="Taux de réussite après présentation client"
                value={tauxPrez == null ? '-' : fmtNumber(tauxPrez)}
                unit={tauxPrez == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxPrez, compareResult.tauxPrez, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: prezBase === 0
                    ? 'Aucun besoin clos n’a été présenté au client'
                    : `${fmtNumber(prezAboutis)} en poste sur ${fmtNumber(prezBase)} présenté${s(prezBase)} au client · besoins clos`,
                }}
              />

              {/* INVERSÉE : un taux de perte qui baisse est une bonne nouvelle,
                  la couleur doit virer au vert. Le paramètre n'inverse que la
                  COULEUR, la flèche suit toujours le chiffre.
                  LE VOLUME EST DANS LE SOUS-TITRE, demande du 22/10 : un taux
                  seul ne se vérifie pas, « 23 annulés sur 98 » se vérifie. */}
              <KPICard
                label="Taux de besoins non aboutis"
                value={tauxNonAbouti == null ? '-' : fmtNumber(tauxNonAbouti)}
                unit={tauxNonAbouti == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxNonAbouti, compareResult.tauxNonAbouti, comparePeriodKey, true)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `${fmtNumber(annules)} non abouti${s(annules)} sur ${fmtNumber(demandes)} demandé${s(demandes)}`,
                }}
              />

              {/* LA CARTE LA PLUS TROUÉE DE LA VUE, et son sous-titre le dit :
                  14 commandes sur 98 portent un niveau. 93 % sur quatorze
                  réponses n'est pas le taux de satisfaction de l'année, c'est
                  celui des quatorze clients qui ont répondu.
                  « RELANCE RECHERCHE » EST ÉCARTÉE du dénominateur, côté route :
                  c'est la quatrième valeur du classeur et ce n'est pas un
                  niveau de satisfaction mais une suite donnée à l'entretien. */}
              <KPICard
                label="Taux de satisfaction client"
                value={tauxSatisfaction == null ? '-' : fmtNumber(tauxSatisfaction)}
                unit={tauxSatisfaction == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxSatisfaction, compareResult.tauxSatisfaction, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: satisfactionN === 0
                    ? 'Aucun entretien noté sur cette période'
                    : `${fmtNumber(satisfaits)} satisfait${s(satisfaits)} sur ${fmtNumber(satisfactionN)} entretien${s(satisfactionN)} noté${s(satisfactionN)} · ${fmtNumber(demandes)} besoin${s(demandes)} au total`,
                }}
              />

            </div>

            {/* LES MOTIFS DES BESOINS NON ABOUTIS.
                LE CLASSEUR N'EN PORTE AUCUN. Le classement vient de
                motifNonAbouti.js, lu à la main dans la colonne Commentaire le
                22/10 — j'avais alerté sur le risque, Jimmy a tranché : « il
                faut que tu catégorises ». Chaque attribution est écrite dans ce
                fichier avec le fragment de commentaire qui la fonde, pour
                qu'elle se conteste ligne à ligne.

                « MOTIF NON RENSEIGNÉ » EST LA PLUS GROSSE BARRE, onze sur trente
                et un, et elle est en ciment pour qu'on ne la lise pas comme une
                cause. Ce n'est pas un trou dans mon classement : onze
                commentaires écrivent eux-mêmes que la raison est introuvable.

                LES DEUX COLONNES DE DROITE ONT DISPARU le 23/10 avec la
                catégorie qu'elles séparaient : elles comptaient d'un côté les
                annulations déclarées, de l'autre les clôtures sans
                recrutement. Hirijy a tranché en réunion, c'est la même chose,
                et une colonne qui répète le total n'apprend rien. */}
            <div className={styles.blocGraphe}>
            <Card title="Motifs des besoins non aboutis">
              {motifTotal === 0 ? (
                <div className={styles.etat}>
                  <div className={styles.etatTexte}>
                    Aucun besoin de cette période n’a été annulé.
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.barres}>
                    {motifs.filter(m => m.total > 0).map(m => (
                      <MotifBar
                        key={m.cle}
                        label={m.libelle}
                        pct={partPct(m.total, motifTotal)}
                        count={m.total}
                        fillColor={COULEURS_MOTIF[m.cle]}
                      />
                    ))}
                  </div>
                </>
              )}
            </Card>
            </div>

            {/* DEUX CARTES ONT ÉTÉ RETIRÉES ICI le 22/10, sur demande.

                « DÉTAIL DES BESOINS CLÔTURÉS » listait les 31 besoins annulés ou
                clos ligne à ligne. Son emplacement venait d'une annotation de
                Clémence — « intervertir l'ordre, ce widget est lié au taux de
                besoins non aboutis » — et la carte des MOTIFS, posée le même
                jour juste au-dessus, répond mieux à la même question : elle dit
                POURQUOI, là où le tableau disait seulement lesquels.

                « BESOINS OUVERTS PAR RECRUTEUR », et avec elle toute la section
                « Répartition des besoins », qui ne portait qu'elle. Elle venait
                de la planche 16 et répondait à l'annotation « je ne suis pas
                fan » de Clémence en recentrant sur la charge assignée. */}

            <div className={styles.blocGraphe}>
            <Card title="Réalisés et non aboutis, mois par mois">
              {evolution.every(p => p.demandes === 0) ? (
                <div className={styles.etat}>
                  <div className={styles.etatTexte}>
                    Aucun besoin n’a été ouvert sur les douze derniers mois.
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.chartWrap} style={{ height: 240 }}>
                    <Bar
                      data={{
                        labels: evolution.map(p => libelleMois(p.mois)),
                        datasets: [
                          {
                            label: 'Taux de recrutements réalisés',
                            data: evolution.map(p => p.tauxRealise),
                            backgroundColor: C_MOIS_REALISE,
                            borderRadius: 4,
                            borderSkipped: false,
                            yAxisID: 'y',
                            order: 2,
                          },
                          {
                            label: 'Taux de besoins non aboutis',
                            data: evolution.map(p => p.tauxNonAbouti),
                            backgroundColor: C_MOIS_PERDU,
                            borderRadius: 4,
                            borderSkipped: false,
                            yAxisID: 'y',
                            order: 2,
                          },
                          {
                            type: 'line',
                            label: 'Besoins ouverts',
                            data: evolution.map(p => p.demandes),
                            borderColor: C_MOIS_VOLUME,
                            pointBackgroundColor: C_MOIS_VOLUME,
                            pointRadius: 3,
                            borderWidth: 2,
                            tension: 0.3,
                            fill: false,
                            /* LES MOIS SANS AUCUN BESOIN RESTENT DES TROUS : avec
                               spanGaps, Chart.js relierait les deux mois voisins
                               d'un trait continu et l'on y lirait une évolution
                               régulière là où rien ne s'est passé. */
                            spanGaps: false,
                            yAxisID: 'y2',
                            /* order 0 dessine la courbe PAR-DESSUS les barres ;
                               sans cela elle passerait dessous. */
                            order: 0,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 900, easing: 'easeOutQuart' },
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              title: items => libelleMoisLong(evolution[items[0].dataIndex].mois),
                              label: ctx => {
                                const v = ctx.parsed.y;
                                if (v == null) return null;
                                if (ctx.dataset.label === 'Besoins ouverts') {
                                  return `${fmtNumber(v)} besoin${v > 1 ? 's' : ''} ouvert${v > 1 ? 's' : ''}`;
                                }
                                return `${ctx.dataset.label} : ${fmtNumber(v)} %`;
                              },
                            },
                          },
                        },
                        scales: {
                          x: { grid: { display: false } },
                          y: {
                            position: 'left',
                            beginAtZero: true,
                            /* PLAFOND À 100 : ce sont des pourcentages, et une
                               échelle qui s'arrête à 62 parce que c'est le plus
                               haut point du moment ferait bouger la pente d'un
                               mois à l'autre sans que rien n'ait changé. */
                            max: 100,
                            ticks: { precision: 0, callback: v => `${v} %` },
                          },
                          y2: {
                            position: 'right',
                            beginAtZero: true,
                            ticks: { precision: 0 },
                            /* Pas de grille en double : celle des pourcentages
                               suffit, deux trames superposées brouillent tout. */
                            grid: { drawOnChartArea: false },
                            title: { display: true, text: 'Besoins ouverts', color: 'rgba(38,0,31,0.45)', font: { size: 9 } },
                          },
                        },
                      }}
                    />
                  </div>
                  {/* LÉGENDE EN HTML, pas celle de Chart.js, comme partout dans
                      ce dépôt : trois séries sur deux axes ne se devinent pas. */}
                  <div className={styles.legende}>
                    <span className={styles.legDot} style={{ background: C_MOIS_REALISE }} />Réalisés
                    <span className={styles.legDot} style={{ background: C_MOIS_PERDU, marginLeft: 12 }} />Non aboutis
                    <span className={styles.legDot} style={{ background: C_MOIS_VOLUME, marginLeft: 12 }} />Besoins ouverts
                  </div>
                  {/* CETTE MENTION N'EST PAS UNE PRÉCAUTION DE STYLE. Le mois
                      d'un besoin est celui de sa COMMANDE, faute de mieux : le
                      classeur ne porte ni date d'annulation ni date de clôture.
                      Les besoins des deux derniers mois n'ont donc pas fini de
                      vivre, et leur taux de réalisation est bas pour cette
                      seule raison. Sans cette phrase, la fin de la courbe se
                      lit comme un effondrement du recrutement. */}
                  {/* LA RÉSERVE SUR LES MOIS RÉCENTS RESTE, en une phrase. Sans
                      elle, la fin de la courbe se lit comme un effondrement
                      alors que ces besoins n'ont pas fini de vivre. C'est la
                      seule chose qu'on ne peut PAS deviner en regardant le
                      graphe, donc la seule qui mérite d'être écrite. */}
                  <div className={styles.mention}>
                    Chaque mois porte les besoins ouverts ce mois-là et leur issue à ce jour :
                    les plus récents n’ont pas fini de vivre.
                  </div>
                </>
              )}
            </Card>
            </div>

            {/* LES DEUX TAUX PAR TYPE DE MISSION, pour fermer la vue.
                Même découpage et même table de correspondance que la carte des
                durées du Pipeline : deux vues du même dashboard qui découperaient
                les métiers autrement ne seraient pas comparables.

                LES DEUX TAUX NE SE COMPLÈTENT PAS À 100 %, et c'est voulu : ce
                qui manque, ce sont les besoins encore en cours et ceux clôturés
                sans recrutement. Le nombre de besoins ouvre la ligne pour que
                l'écart se lise. */}
            <Card title="Réalisés et non aboutis par type de mission">
              {missions.length === 0 ? (
                <div className={styles.etat}>
                  <div className={styles.etatTexte}>
                    Aucun besoin n’a été demandé sur cette période.
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.repartSplit}>
                    <div className={styles.repartDonut}>
                      <DonutChart
                        variant="half-rose"
                        data={missions.map(m => m.annules)}
                        labels={missions.map(m => m.libelle)}
                        colors={missions.map(m => m.couleur)}
                        height={240}
                        tooltip={(label, value, pct) => {
                          const m = missions.find(x => x.libelle === label);
                          if (!m) return `${label} : ${fmtNumber(value)}`;
                          return [
                            `${label} — ${fmtNumber(value)} non abouti${s(value)}, ${fmtPourcentage(pct)}`,
                            `Réalisés : ${fmtNumber(m.realises)} (${m.tauxRealise == null ? '-' : fmtPourcentage(m.tauxRealise)})`,
                            `Non aboutis : ${fmtNumber(m.annules)} (${m.tauxNonAbouti == null ? '-' : fmtPourcentage(m.tauxNonAbouti)})`,
                          ];
                        }}
                      />
                    </div>
                    <div className={styles.repartListe}>
                      <table className={styles.tbl}>
                        <thead>
                          <tr>
                            <th>Type de mission</th>
                            <th className={styles.num}>Besoins</th>
                            <th className={styles.num}>Réalisés</th>
                            <th className={styles.num}>Non aboutis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {missions.map(m => (
                            <tr key={m.cle || 'a-classer'}>
                              <td>
                                <span className={styles.libelle}>
                                  <span className={styles.puce} style={{ background: m.couleur }} />
                                  {m.libelle}
                                </span>
                              </td>
                              <td className={styles.num}>{fmtNumber(m.demandes)}</td>
                              <td className={styles.num}>
                                <span className={styles.valeurBrute}>{fmtNumber(m.realises)}</span>
                                <span className={styles.partSuffixe}>{m.tauxRealise == null ? '-' : fmtPourcentage(m.tauxRealise)}</span>
                              </td>
                              <td className={styles.num}>
                                <span className={styles.valeurBrute}>{fmtNumber(m.annules)}</span>
                                <span className={styles.partSuffixe}>{m.tauxNonAbouti == null ? '-' : fmtPourcentage(m.tauxNonAbouti)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className={styles.mention}>
                    Le cercle répartit les {fmtNumber(nonAboutisMissions)} besoins non aboutis.
                    Les deux taux ne se complètent pas : le reste est encore en cours.
                  </div>
                </>
              )}
            </Card>

          </div>
        );
      }}
    </Loader>
  );
}
