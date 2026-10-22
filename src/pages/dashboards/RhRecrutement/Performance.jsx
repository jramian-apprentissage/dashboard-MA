import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import ListeModale from '../../../components/ui/ListeModale';
import MotifBar from '../../../components/ui/MotifBar';
import { useRhQualite } from '../../../hooks/useRhData';
import { compareValueText, comparePtsText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber, partPct } from '../../../utils/formatNumber';
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

function dateCourte(iso) {
  if (!iso) return '-';
  const [a, m, j] = iso.split('-');
  return `${j}/${m}/${a.slice(2)}`;
}

const ISSUES = { annule: 'Annulé', clos_sans: 'Clôturé sans recrutement' };

/* Six lignes sur la carte, le reste en pop-up. Le détail des besoins clôturés
   sert à repérer ce qui se répète — un client, un type de poste — pas à lire
   trente et une lignes d'affilée. */
const CLOTURES_APERCU = 6;

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
  const [cloturesOuvertes, setCloturesOuvertes] = useState(false);
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
          demandes, realises, annules, closSansRecrutement, enCours,
          tauxRealise, tauxNonAbouti,
          parRecruteur, sansRecruteur, clotures, evolution,
        } = result;
        const s = n => (n > 1 ? 's' : '');

        /* La charge totale porte TOUS les besoins ouverts, y compris ceux dont
           la case « responsable » est vide : c'est elle qui fait le dénominateur
           des parts, sinon les pourcentages feraient plus de 100 en additionnant
           des barres calculées sur un sous-ensemble. */
        const chargeTotale = enCours;

        const tableauClotures = lignes => (
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th>Besoin</th>
                <th>Client</th>
                <th>Poste</th>
                <th>Recruteur</th>
                <th>Issue</th>
                <th className={styles.num}>Ouvert le</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(c => (
                <tr key={c.numero}>
                  <td>{c.numero}</td>
                  <td>{c.entite || '-'}</td>
                  {/* Le poste manque sur quelques lignes du classeur. Un tiret
                      le dit ; inventer « Non précisé » laisserait croire que
                      quelqu'un a renseigné quelque chose. */}
                  <td>{c.poste || '-'}</td>
                  <td>{c.recruteur || '-'}</td>
                  <td>{ISSUES[c.issue]}</td>
                  <td className={styles.num}>{dateCourte(c.dateCommande)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

        return (
          <div className={styles.page}>

            {/* ── Planche 16, section « Qualité de recrutement » ───────────── */}
            <SectionLabel badge="Onglet Suivi de commande RH Q2">Qualité de recrutement</SectionLabel>
            <div className={styles.kpiGrid3}>

              {/* ANNOTATION 1 DE CLÉMENCE. La maquette écrivait « Recrutements
                  finalisés · date de démarrage renseignée », ce qui comptait
                  les dates saisies et non les recrutements : 21 placements sur
                  43 n'ont aucune date de démarrage au fichier, la tuile en
                  perdait donc la moitié. Elle compte maintenant les besoins où
                  quelqu'un est EN POSTE, règle de la vue 1, et les deux pages
                  donnent le même chiffre — ce qui est le but de son « comme
                  sur la slide 13 ». */}
              <KPICard
                label="Recrutements réalisés"
                value={fmtNumber(realises)}
                unit={` recrutement${s(realises)}`}
                compare={compareResult
                  ? compareValueText(realises, compareResult.realises, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `${fmtNumber(realises)} sur ${fmtNumber(demandes)} besoin${s(demandes)} demandé${s(demandes)}`,
                }}
              />

              {/* INVERSÉE : un taux de perte qui baisse est une bonne nouvelle,
                  la couleur doit virer au vert. Le paramètre n'inverse que la
                  COULEUR, la flèche suit toujours le chiffre.
                  LE VOLUME EST DANS LE SOUS-TITRE, et c'est la part de
                  l'annotation 3 qui reste vraie quoi qu'il arrive : un taux
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
                  text: `${fmtNumber(annules)} besoin${s(annules)} annulé${s(annules)} sur ${fmtNumber(demandes)} demandé${s(demandes)}`,
                }}
              />

              {/* ANNOTATION 3, et la réponse est non : ces besoins-là ne sont
                  pas les annulés. Le sous-titre le dit en toutes lettres, parce
                  que deux tuiles voisines qui comptent « ce qui n'a pas abouti »
                  invitent à les confondre, et parce que la question a déjà été
                  posée une fois. */}
              <KPICard
                label="Besoins clôturés sans recrutement"
                value={fmtNumber(closSansRecrutement)}
                unit={` besoin${s(closSansRecrutement)}`}
                compare={compareResult
                  ? compareValueText(closSansRecrutement, compareResult.closSansRecrutement, comparePeriodKey, true)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: 'Recherche close sans placement, hors annulations · aucun motif au fichier',
                }}
              />

            </div>

            {/* ANNOTATION 2 DE CLÉMENCE : le graphe mensuel des deux taux.
                Les barres de volume ne sont pas une décoration. Sans elles,
                « 100 % de réalisés en mai » et « 61 % en février » se liraient
                comme deux mois comparables, alors que mai porte quatre besoins
                et février dix-huit. Une barre de quatre à côté d'une barre de
                dix-huit règle la question sans une ligne de texte. */}
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
                            label: 'Besoins ouverts',
                            data: evolution.map(p => p.demandes),
                            backgroundColor: C_VOLUME,
                            borderRadius: 4,
                            borderSkipped: false,
                            yAxisID: 'y2',
                            order: 2,
                          },
                          {
                            type: 'line',
                            label: 'Taux de recrutements réalisés',
                            data: evolution.map(p => p.tauxRealise),
                            borderColor: C_REALISE,
                            pointBackgroundColor: C_REALISE,
                            pointRadius: 3,
                            borderWidth: 2,
                            tension: 0.3,
                            fill: false,
                            /* LES MOIS SANS AUCUN BESOIN RESTENT DES TROUS : avec
                               spanGaps, Chart.js relierait les deux mois voisins
                               d'un trait continu et l'on y lirait une évolution
                               régulière là où rien ne s'est passé. */
                            spanGaps: false,
                            yAxisID: 'y',
                            /* order 0 dessine la courbe PAR-DESSUS les barres ;
                               sans cela elle passerait dessous. */
                            order: 0,
                          },
                          {
                            type: 'line',
                            label: 'Taux de besoins non aboutis',
                            data: evolution.map(p => p.tauxNonAbouti),
                            borderColor: C_PERDU,
                            pointBackgroundColor: C_PERDU,
                            pointRadius: 3,
                            borderWidth: 2,
                            tension: 0.3,
                            fill: false,
                            spanGaps: false,
                            yAxisID: 'y',
                            order: 1,
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
                            title: { display: true, text: 'Besoins', color: 'rgba(38,0,31,0.45)', font: { size: 9 } },
                          },
                        },
                      }}
                    />
                  </div>
                  {/* LÉGENDE EN HTML, pas celle de Chart.js, comme partout dans
                      ce dépôt : trois séries sur deux axes ne se devinent pas. */}
                  <div className={styles.legende}>
                    <span className={styles.legDot} style={{ background: C_VOLUME }} />Besoins ouverts
                    <span className={styles.legDot} style={{ background: C_REALISE, marginLeft: 12 }} />Réalisés
                    <span className={styles.legDot} style={{ background: C_PERDU, marginLeft: 12 }} />Non aboutis
                  </div>
                  {/* CETTE MENTION N'EST PAS UNE PRÉCAUTION DE STYLE. Le mois
                      d'un besoin est celui de sa COMMANDE, faute de mieux : le
                      classeur ne porte ni date d'annulation ni date de clôture.
                      Les besoins des deux derniers mois n'ont donc pas fini de
                      vivre, et leur taux de réalisation est bas pour cette
                      seule raison. Sans cette phrase, la fin de la courbe se
                      lit comme un effondrement du recrutement. */}
                  <div className={styles.mention}>
                    Chaque mois porte les besoins OUVERTS ce mois-là, et leur issue à ce jour :
                    le classeur ne date ni les annulations ni les clôtures. Les mois récents
                    affichent donc peu de réalisés parce que leurs besoins sont encore en cours,
                    et non parce qu’ils ont échoué. Les deux taux ne sont pas complémentaires :
                    ce qui reste est le stock encore ouvert.
                  </div>
                </>
              )}
            </Card>

            {/* ANNOTATION 5 DE CLÉMENCE : ce tableau est le détail du taux de
                besoins non aboutis, pas de la répartition des besoins. Il
                remonte donc ici, contre les tuiles dont il donne les lignes, et
                a quitté la section « Répartition des besoins » où la maquette
                l'avait posé. */}
            <Card title="Détail des besoins clôturés">
              {clotures.length === 0 ? (
                <div className={styles.etat}>
                  <div className={styles.etatTexte}>
                    Aucun besoin de cette période n’a été annulé ni clôturé sans recrutement.
                  </div>
                </div>
              ) : (
                <>
                  {tableauClotures(clotures.slice(0, CLOTURES_APERCU))}
                  {clotures.length > CLOTURES_APERCU && (
                    <button
                      type="button"
                      className={styles.voirPlus}
                      onClick={() => setCloturesOuvertes(true)}
                    >
                      Voir les {fmtNumber(clotures.length)} besoins
                    </button>
                  )}
                  <div className={styles.mention}>
                    {fmtNumber(annules)} annulé{s(annules)} et {fmtNumber(closSansRecrutement)} clôturé
                    {s(closSansRecrutement)} sans recrutement, les plus récents d’abord.
                    Le classeur ne porte AUCUNE colonne de motif : on sait lesquels, jamais pourquoi.
                  </div>
                </>
              )}
            </Card>

            {/* ── Planche 16, section « Répartition des besoins » ──────────── */}
            <SectionLabel>Répartition des besoins</SectionLabel>

            {/* ANNOTATION 4 DE CLÉMENCE, « je suis pas fan », et son mail :
                recentrer sur la CHARGE ASSIGNÉE, pas sur la performance
                individuelle. La carte ne compte donc que ce que chacun porte
                ENCORE — les besoins ouverts aujourd'hui — et jamais ce qu'il a
                conclu. C'est la différence entre « qui est chargé » et « qui
                réussit », et c'est exactement la lecture en palmarès qu'elle
                refuse.
                LE TITRE DE LA SECTION Y PARTICIPE : la maquette l'appelait
                « Performance des recruteurs & suivi des besoins » dans son
                sommaire, ce qui rétablissait le palmarès par le titre. C'est
                « Répartition des besoins », comme sur la planche elle-même.
                LE « SANS RESPONSABLE » EST HORS DU CLASSEMENT, en mention : ce
                n'est pas un recruteur, c'est une case vide, et lui donner une
                barre inventerait une personne. */}
            <Card title="Besoins ouverts par recruteur">
              {parRecruteur.length === 0 ? (
                <div className={styles.etat}>
                  <div className={styles.etatTexte}>
                    Aucun besoin de cette période n’est encore ouvert.
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.barres}>
                    {parRecruteur.map(r => (
                      <MotifBar
                        key={r.cle}
                        label={r.libelle}
                        pct={partPct(r.enCours, chargeTotale)}
                        count={r.enCours}
                        fillColor="rgba(38,0,31,0.95)"
                      />
                    ))}
                  </div>
                  <div className={styles.mention}>
                    Charge en cours, pas un classement : on compte les besoins qu’il reste à
                    pourvoir, pas les recrutements conclus.
                    {sansRecruteur > 0
                      ? ` ${fmtNumber(sansRecruteur)} besoin${s(sansRecruteur)} ouvert${s(sansRecruteur)} n’a pas de responsable au fichier et n’apparaît sur aucune barre.`
                      : ''}
                  </div>
                </>
              )}
            </Card>

            {cloturesOuvertes && (
              <ListeModale
                titre="Détail des besoins clôturés"
                sousTitre={
                  `${fmtNumber(clotures.length)} besoin${s(clotures.length)} clôturé${s(clotures.length)}`
                  + ` · ${fmtNumber(annules)} annulé${s(annules)}, ${fmtNumber(closSansRecrutement)} sans recrutement`
                }
                onClose={() => setCloturesOuvertes(false)}
              >
                {tableauClotures(clotures)}
              </ListeModale>
            )}
          </div>
        );
      }}
    </Loader>
  );
}
