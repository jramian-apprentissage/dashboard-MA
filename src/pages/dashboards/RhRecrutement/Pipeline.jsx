import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import MotifBar from '../../../components/ui/MotifBar';
import { useRhPipeline } from '../../../hooks/useRhData';
import { compareValueText, comparePtsText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber, partPct } from '../../../utils/formatNumber';
import styles from '../RhEffectifs/Rh.module.css';

/* Chart.js s'enregistre par fichier dans ce projet, et seulement pour ce qu'on
   utilise : voir EvolutionEffectifs.jsx et Synthese.jsx. */
Chart.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

const C_DELAI = 'rgba(38,0,31,0.88)';

/* '2026-04' → 'avr.', fabriqué en UTC. Un `new Date('2026-04')` est interprété
   en UTC puis réaffiché en heure locale, ce qui recule d'un mois à l'ouest de
   Greenwich et afficherait « mars » pour avril. Même fonction que dans
   EvolutionEffectifs, même raison. */
function libelleMois(ym) {
  const [a, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' });
}
function libelleMoisLong(ym) {
  const [a, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 1))
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/* Vue 2 du dashboard Recrutement, « Pipeline candidats et délais ».
 *
 * LA PAGE SUIT LES PLANCHES 14 ET 15 DE LA MAQUETTE, section par section et
 * tuile par tuile, dans leur ordre. Elle avait d'abord été recomposée en une
 * seule rangée de quatre, en mélangeant les deux planches et en écartant les
 * indicateurs les plus troués : c'était décider à la place de Jimmy et de
 * Clémence d'une mise en page qu'ils avaient arrêtée ensemble. La maquette est
 * la référence ; ce que la donnée ne permet pas se SIGNALE, il ne se supprime
 * pas.
 *
 * CE QUE LA DONNÉE PERMET MAL, ET QUI EST AFFICHÉ QUAND MÊME. Le délai pour
 * pourvoir un poste et son graphe d'évolution croisent l'ouverture de
 * recherche et la date de démarrage : trente paires exploitables sur
 * quatre-vingt-dix-huit. La maquette affichait déjà cet indicateur en
 * annonçant son effectif, « 10 sur 18 », « colonne remplie sur 4 commandes ».
 * On reprend cette convention : le chiffre, puis sur combien il repose.
 *
 * LES LIBELLÉS SONT CEUX QUE CLÉMENCE A VALIDÉS dans son mail du 30/09 :
 * « Durée moy. du recrutement » et non « d'un recrutement », « Délais et
 * pipeline de recrutement » pour la section qui s'appelait « time to fill et
 * candidats par client », et « besoin » au lieu de « commande » sur la
 * transformation, puisqu'elle demandait « si c'est pareil, mettre besoin ».
 *
 * L'INVERSION DE COULEUR suit une règle unique : on inverse quand le chiffre
 * mesure ce qu'on veut voir diminuer. Les deux délais et les besoins en cours
 * s'inversent. Les deux taux montent quand ça va mieux. Restent deux chiffres
 * dont aucun sens n'est bon en soi, les candidats en cours et les profils
 * présentés par besoin : leur couleur est NEUTRALISÉE plutôt que de leur faire
 * porter un jugement indéfendable. */
export default function Pipeline() {
  const { result, compareResult, loading, error } = useRhPipeline();
  const { comparePeriodKey } = usePeriod();

  return (
    <Loader loading={loading && !result} label="Chargement du pipeline…" minHeight={220}>
      {() => {
        if (error) {
          return (
            <div className={styles.page}>
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Candidatures et délais</SectionLabel>
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
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Candidatures et délais</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>Aucun besoin sur cette période</div>
                  <div className={styles.etatTexte}>Aucun besoin n’a été demandé entre ces deux dates.</div>
                </div>
              </Card>
            </div>
          );
        }

        const {
          demandes, candidats, candidatsN,
          pourvoirN, pourvoirMoy, pourvoirMed,
          dureeN, dureeMoy, dureeMed,
          delaiN, dansDelai, tauxDelai,
          transfoN, presentes, retenus, tauxTransfo, parBesoin,
          evolution, candidatsParClient, etapes, sansEtape, enCours,
        } = result;
        const s = n => (n > 1 ? 's' : '');
        const j = v => (v == null ? '-' : fmtNumber(v));
        /* Neutralise la couleur d'une comparaison sans toucher au chiffre ni à
           la flèche : pour les indicateurs dont aucun sens n'est bon en soi. */
        const sansJugement = c => (c ? { ...c, dir: 'neutral' } : c);

        return (
          <div className={styles.page}>

            {/* ── Planche 14, section « Candidatures et délais » ── */}
            <SectionLabel badge="Onglet Suivi de commande RH Q2">Candidatures et délais</SectionLabel>
            <div className={styles.kpiGrid}>

              <KPICard
                label="Candidats en cours de recrutement"
                value={fmtNumber(candidats)}
                unit={` candidat${s(candidats)}`}
                compare={compareResult
                  ? sansJugement(compareValueText(candidats, compareResult.candidats, comparePeriodKey))
                  : null}
                trend={{
                  dir: 'neutral',
                  text: candidatsN === 0
                    ? 'Aucun besoin en cours ne porte de candidat compté'
                    : `Candidats présentés · colonne remplie sur ${fmtNumber(candidatsN)} besoin${s(candidatsN)}`,
                }}
              />

              {/* L'INDICATEUR LE PLUS TROUÉ DE LA PAGE, affiché comme sur la
                  maquette avec son effectif en clair. La date de démarrage
                  n'est renseignée que sur 35 % des commandes et 21
                  recrutements aboutis en manquent : le sous-titre dit sur
                  combien de besoins la moyenne porte. */}
              <KPICard
                label="Délai moy. pour pourvoir un poste"
                value={j(pourvoirMoy)}
                unit={pourvoirMoy == null ? '' : ' j'}
                compare={compareResult
                  ? compareValueText(pourvoirMoy, compareResult.pourvoirMoy, comparePeriodKey, true)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: pourvoirN === 0
                    ? 'Aucun démarrage daté sur la période'
                    : `De l’ouverture au démarrage · médiane ${j(pourvoirMed)} j · ${fmtNumber(pourvoirN)} besoin${s(pourvoirN)}`,
                }}
              />

              <KPICard
                label="Durée moy. du recrutement"
                value={j(dureeMoy)}
                unit={dureeMoy == null ? '' : ' j'}
                compare={compareResult
                  ? compareValueText(dureeMoy, compareResult.dureeMoy, comparePeriodKey, true)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: dureeN === 0
                    ? 'Aucune recherche datée sur la période'
                    : `De l’ouverture à la fin R3 · médiane ${j(dureeMed)} j · ${fmtNumber(dureeN)} recherche${s(dureeN)}`,
                }}
              />

              <KPICard
                label="Taux de recrutements réalisés dans les délais"
                value={tauxDelai == null ? '-' : fmtNumber(tauxDelai)}
                unit={tauxDelai == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxDelai, compareResult.tauxDelai, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: delaiN === 0
                    ? 'Aucune recherche close sur la période'
                    : `Fin de recherche avant l’échéance R3 · ${fmtNumber(dansDelai)} sur ${fmtNumber(delaiN)}`,
                }}
              />
            </div>

            {/* ── Planche 14, section « Délais et pipeline de recrutement » ──
                Titre validé par Clémence le 30/09, qui remplace « time to fill
                et candidats par client ». */}
            <SectionLabel>Délais et pipeline de recrutement</SectionLabel>
            <div className={styles.deuxCol}>

              <Card title="Évolution du délai pour pourvoir un poste">
                {evolution.length === 0 ? (
                  <div className={styles.etat}>
                    <div className={styles.etatTexte}>
                      Aucun démarrage daté sur cette période : la courbe n’a rien à tracer.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.chartWrap} style={{ height: 232 }}>
                      <Line
                        data={{
                          labels: evolution.map(p => libelleMois(p.mois)),
                          datasets: [{
                            label: 'Délai médian',
                            data: evolution.map(p => p.mediane),
                            borderColor: C_DELAI,
                            pointBackgroundColor: C_DELAI,
                            pointRadius: 3.5,
                            borderWidth: 2,
                            tension: 0.35,
                            fill: false,
                            /* LES MOIS SANS DÉMARRAGE RESTENT DES TROUS. Avec
                               spanGaps, Chart.js relierait février à avril
                               d'un trait continu et l'on y lirait une
                               évolution régulière là où mars n'a rien eu. */
                            spanGaps: false,
                          }],
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
                                /* L'EFFECTIF VOYAGE AVEC CHAQUE POINT, et c'est
                                   indispensable ici : plusieurs mois ne portent
                                   qu'un seul démarrage. Un point à n=1 n'est pas
                                   une tendance, et seul l'effectif le dit. */
                                label: ctx => {
                                  const p = evolution[ctx.dataIndex];
                                  return `Médiane ${fmtNumber(p.mediane)} j · moyenne ${fmtNumber(p.moyenne)} j · ${fmtNumber(p.n)} démarrage${p.n > 1 ? 's' : ''}`;
                                },
                              },
                            },
                          },
                          scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 } },
                            x: { grid: { display: false } },
                          },
                        }}
                      />
                    </div>
                    {/* CETTE LIGNE EXISTE PARCE QUE LE GRAPHE ET LA TUILE NE
                        COMPTENT PAS LA MÊME CHOSE, et que sans elle on les
                        croirait en désaccord. La tuile est bornée à la
                        COHORTE, les besoins commandés sur la période ; le
                        graphe tourne sur une FENÊTRE GLISSANTE de douze mois
                        ancrée sur la fin de période, comme tous les graphes
                        d'évolution de ce dépôt. Une courbe réduite au mois
                        sélectionné n'aurait qu'un point. */}
                    <div className={styles.mention}>
                      Médiane du délai entre l’ouverture de recherche et le démarrage,
                      par mois de démarrage · douze derniers mois ·{' '}
                      {fmtNumber(evolution.reduce((t, p) => t + p.n, 0))} démarrage
                      {evolution.reduce((t, p) => t + p.n, 0) > 1 ? 's' : ''} daté
                      {evolution.reduce((t, p) => t + p.n, 0) > 1 ? 's' : ''}.
                    </div>
                  </>
                )}
              </Card>

              <Card title="Candidats en recrutement par prospects/clients">
                {candidatsParClient.length === 0 ? (
                  <div className={styles.etat}>
                    <div className={styles.etatTexte}>
                      Aucun besoin en cours ne porte de candidat compté sur cette période.
                    </div>
                  </div>
                ) : (
                  <div className={styles.barres}>
                    {candidatsParClient.slice(0, 6).map(c => (
                      <MotifBar
                        key={c.entite}
                        label={c.entite}
                        pct={partPct(c.candidats, candidats)}
                        count={c.candidats}
                        fillColor="rgba(38,0,31,0.95)"
                      />
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* ── Planche 15, section « La transformation des profils » ──
                « Besoins » et non « commandes » : Clémence, sur cette planche,
                « si c'est pareil, mettre besoin ». */}
            <SectionLabel>La transformation des profils</SectionLabel>
            <div className={styles.kpiGrid}>

              <KPICard
                label="Besoins en cours de recrutement"
                value={fmtNumber(enCours)}
                unit={` besoin${s(enCours)}`}
                compare={compareResult
                  ? compareValueText(enCours, compareResult.enCours, comparePeriodKey, true)
                  : null}
                trend={{ dir: 'neutral', text: `Sur ${fmtNumber(demandes)} besoin${s(demandes)} demandé${s(demandes)}` }}
              />

              <KPICard
                label="Taux de transformation des profils présentés"
                value={tauxTransfo == null ? '-' : fmtNumber(tauxTransfo)}
                unit={tauxTransfo == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxTransfo, compareResult.tauxTransfo, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: transfoN === 0
                    ? 'Aucun besoin ne porte les deux comptes'
                    : `${fmtNumber(retenus)} retenu${s(retenus)} sur ${fmtNumber(presentes)} présenté${s(presentes)} · ${fmtNumber(transfoN)} besoin${s(transfoN)}`,
                }}
              />

              {/* Couleur neutralisée : plus de profils présentés par besoin,
                  c'est plus de choix pour le client et plus de travail pour la
                  même place. Aucun des deux sens n'est bon en soi. */}
              <KPICard
                label="Profils présentés par besoin de recrutement"
                value={parBesoin == null ? '-' : fmtNumber(parBesoin)}
                unit={parBesoin == null ? '' : ' profils'}
                compare={compareResult
                  ? sansJugement(compareValueText(parBesoin, compareResult.parBesoin, comparePeriodKey))
                  : null}
                trend={{
                  dir: 'neutral',
                  text: transfoN === 0
                    ? 'Aucun besoin renseigné'
                    : `${fmtNumber(presentes)} présenté${s(presentes)} sur ${fmtNumber(transfoN)} besoin${s(transfoN)} renseigné${s(transfoN)}`,
                }}
              />
            </div>

            {/* ── Planche 15, section « Les étapes du workflow RH » ──
                SUR LES SEULS BESOINS EN COURS. Sur l'ensemble des commandes,
                « En poste » écraserait tout et le tableau cesserait de décrire
                un pipeline : la maquette le disait déjà en pied de carte. Les
                huit étapes sont toujours affichées, même à zéro — un trou au
                milieu du tunnel est précisément ce qu'on veut voir. */}
            <SectionLabel>Les étapes du workflow RH</SectionLabel>
            <Card title="Processus de recrutement">
              {enCours === 0 ? (
                <div className={styles.etat}>
                  <div className={styles.etatTexte}>
                    Aucun besoin n’est en cours de recrutement sur cette période.
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.barres}>
                    {etapes.map(e => (
                      <MotifBar
                        key={e.cle}
                        label={e.libelle}
                        pct={partPct(e.besoins, enCours)}
                        count={e.besoins}
                        fillColor="rgba(38,0,31,0.95)"
                      />
                    ))}
                  </div>
                  {/* Les besoins en cours sans étape saisie ne sont pas rangés
                      d'office en R0 : ils sont nommés, sinon le tunnel paraît
                      complet alors qu'il lui manque des lignes. */}
                  {sansEtape > 0 && (
                    <div className={styles.mention}>
                      {fmtNumber(sansEtape)} besoin{s(sansEtape)} en cours sans étape RH saisie,
                      hors de ce tableau.
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        );
      }}
    </Loader>
  );
}
