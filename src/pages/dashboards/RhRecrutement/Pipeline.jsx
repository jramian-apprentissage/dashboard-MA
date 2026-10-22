import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import ListeModale from '../../../components/ui/ListeModale';
import MotifBar from '../../../components/ui/MotifBar';
import BarreEtapes, { EnteteEtapes, libelleEtape } from '../../../components/ui/BarreEtapes';
import { useRhPipeline } from '../../../hooks/useRhData';
import { compareValueText, comparePtsText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber, partPct } from '../../../utils/formatNumber';
import styles from '../RhEffectifs/Rh.module.css';

/* Chart.js s'enregistre par fichier dans ce projet, et seulement pour ce qu'on
   utilise : voir EvolutionEffectifs.jsx et Synthese.jsx. */
Chart.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

/* LITTERAUX, jamais `var(--abricot-encre)` : le canvas de Chart.js ne
   resout pas les variables CSS, il ignore SILENCIEUSEMENT ce qu il ne sait
   pas lire et garde la couleur precedente. La regle est deja ecrite en tete
   de la palette ASUS et elle a coute un bug muet. */
const C_MOYENNE = 'rgba(38,0,31,0.88)';     // myrtille
const C_MEDIANE = 'rgba(136,84,48,0.90)';   // encre abricot, la teinte de ce dashboard
const C_BESOINS = 'rgba(167,173,170,0.50)'; // ciment, en retrait derriere les courbes

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
/* CINQ LIGNES SUR LA CARTE, le reste en pop-up. Trois jusqu'au 22/10, porté à
   cinq le même jour : à trois, la carte montrait les deux gros clients et une
   seule des dix-sept autres lignes, ce qui donnait à croire que le pipeline
   tenait en trois noms. */
const CLIENTS_APERCU = 5;

export default function Pipeline() {
  const { result, compareResult, loading, error } = useRhPipeline();
  const { comparePeriodKey } = usePeriod();
  /* Déclaré ici et pas dans le corps du Loader : ce corps est une
     fonction que le Loader n'appelle QUE s'il a fini de charger, donc un
     useState posé dedans serait un appel de hook conditionnel. */
  const [clientsOuverts, setClientsOuverts] = useState(false);

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
          profilsDemandes, profilsDemandesN,
          presentesBrut, presentesBrutN,
          retenusBrut, retenusBrutN, tauxProfil,
          pourvoirN, pourvoirMoy, pourvoirMed,
          dureeN, dureeMoy, dureeMed,
          delaiN, dansDelai, tauxDelai,
          transfoN, presentes, retenus, tauxTransfo, parBesoin,
          evolution, candidatsParClient, etapes, sansEtape, enCours,
        } = result;
        const s = n => (n > 1 ? 's' : '');

        /* UNE CELLULE VIDE S'ÉCRIT « - », JAMAIS « 0 ». La distinction vient de
           la maquette, qui mettait déjà un tiret sur ses deux dernières lignes :
           « aucun profil retenu » est un résultat, « colonne non saisie » est une
           absence d'information. Les confondre ferait passer onze besoins non
           renseignés pour onze échecs. */
        const ouTiret = v => (v == null ? '-' : fmtNumber(v));

        /* Le survol d'une ligne : les postes, un par ligne, puis l'étape
           atteinte en toutes lettres. C'est là que vit le détail qu'une barre
           à neuf cases ne peut pas porter. */
        const survolClient = c => {
          const postes = (c.postes || '')
            .split(' ; ')
            .map(x => x.replace(/\s+/g, ' ').trim())
            .filter(Boolean);
          const etape = libelleEtape(c.etape);
          return [
            `${fmtNumber(c.besoins)} besoin${s(c.besoins)} en cours`,
            ...postes.map(x => `• ${x}`),
            etape ? `Étape la plus avancée : ${etape}` : 'Étape non renseignée au fichier',
          ].join('\n');
        };
        const j = v => (v == null ? '-' : fmtNumber(v));
        /* Neutralise la couleur d'une comparaison sans toucher au chiffre ni à
           la flèche : pour les indicateurs dont aucun sens n'est bon en soi. */
        const sansJugement = c => (c ? { ...c, dir: 'neutral' } : c);
        /* Le volume de la fenêtre glissante, à ne pas confondre avec celui de
           la tuile, qui est borné à la cohorte. */
        const totalDemarrages = evolution.reduce((t, p) => t + p.n, 0);

        return (
          <div className={styles.page}>

            {/* ── « Candidatures et délais » : L'ENTONNOIR DES PROFILS ──
                Arbitrage de Jimmy du 22/10 : besoin en profils, profils
                présentés, profils retenus, taux de transformation. La rangée
                se lit comme une phrase, chaque tuile étant le reste de la
                précédente.

                LES SOMMES SONT BRUTES, donc le taux est la DIVISION VISIBLE
                des deux tuiles d'à côté, 62 sur 171. Le lecteur peut la
                refaire de tête. L'autre lecture, qui n'additionne que les
                besoins portant les deux colonnes, donnerait 47 % au lieu de
                36 % : plus pure, mais introuvable depuis les tuiles affichées.
                Chaque sous-titre dit donc sur combien de besoins sa somme
                repose.

                LES QUATRE TUILES DE DÉLAIS QUI OCCUPAIENT CETTE RANGÉE sont
                descendues en bas de page, en attendant que Jimmy dise où les
                placer. Elles ne sont pas supprimées : c'est sa consigne. */}
            <SectionLabel badge="Onglet Suivi de commande RH Q2">Candidatures et délais</SectionLabel>
            <div className={styles.kpiGrid}>

              <KPICard
                label="Besoin en profils"
                value={fmtNumber(profilsDemandes)}
                unit={` profil${s(profilsDemandes)}`}
                compare={compareResult
                  ? compareValueText(profilsDemandes, compareResult.profilsDemandes, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `Postes à pourvoir · sur ${fmtNumber(profilsDemandesN)} besoin${s(profilsDemandesN)} renseigné${s(profilsDemandesN)}`,
                }}
              />

              {/* Couleur neutralisée : présenter davantage de profils, c'est
                  plus de choix pour le client et plus de travail pour la même
                  place. Aucun des deux sens n'est bon en soi. */}
              <KPICard
                label="Profils présentés"
                value={fmtNumber(presentesBrut)}
                unit={` profil${s(presentesBrut)}`}
                compare={compareResult
                  ? sansJugement(compareValueText(presentesBrut, compareResult.presentesBrut, comparePeriodKey))
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `Présentés au client · sur ${fmtNumber(presentesBrutN)} besoin${s(presentesBrutN)} renseigné${s(presentesBrutN)}`,
                }}
              />

              <KPICard
                label="Profils retenus"
                value={fmtNumber(retenusBrut)}
                unit={` profil${s(retenusBrut)}`}
                compare={compareResult
                  ? compareValueText(retenusBrut, compareResult.retenusBrut, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `Retenus par le client · sur ${fmtNumber(retenusBrutN)} besoin${s(retenusBrutN)} renseigné${s(retenusBrutN)}`,
                }}
              />

              <KPICard
                label="Taux de transformation de profil"
                value={tauxProfil == null ? '-' : fmtNumber(tauxProfil)}
                unit={tauxProfil == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxProfil, compareResult.tauxProfil, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: presentesBrut === 0
                    ? 'Aucun profil présenté sur la période'
                    : `${fmtNumber(retenusBrut)} retenu${s(retenusBrut)} sur ${fmtNumber(presentesBrut)} présenté${s(presentesBrut)}`,
                }}
              />
            </div>

            {/* LES CANDIDATS PAR CLIENT, DIRECTEMENT SOUS LA RANGÉE,
                demande de Jimmy du 22/10 : c'est le détail de l'entonnoir
                qu'on vient de lire, il se place donc contre lui et non deux
                sections plus bas.

                TROIS MESURES, LES MÊMES QUE LA RANGÉE — besoin en profils,
                présentés, retenus. La carte ne porte plus un seul chiffre mais
                rejoue l'entonnoir client par client, et se lit donc à la
                verticale des tuiles du dessus.

                LA BARRE N'EST PLUS UNE PART MAIS UN AVANCEMENT, et c'est le
                changement de fond du 22/10. Elle portait la part de candidats
                du client dans le total, ce qui comparait des clients entre eux ;
                elle porte maintenant les NEUF ÉTAPES du processus, R0 à R7 puis
                « En poste », et situe chaque client sur son propre parcours.
                La question posée n'est plus « qui pèse le plus » mais « qui est
                le plus près d'aboutir ».

                AUCUN POURCENTAGE SOUS LA BARRE, volontairement : « étape 6 sur
                9 » ne veut pas dire « 67 % du travail fait ». Les étapes n'ont
                ni la même durée ni la même difficulté, et le classeur ne les
                chronomètre pas.

                LE SURVOL PORTE LES POSTES, demandé le 22/10 : un client porte
                souvent plusieurs recrutements — REGARD INC en a cinq — et la
                ligne ne peut pas les nommer sans devenir un tableau. */}
            <Card title="Candidats en recrutement par prospects/clients">
              {candidatsParClient.length === 0 ? (
                <div className={styles.etat}>
                  <div className={styles.etatTexte}>
                    Aucun besoin n’est en cours chez un client sur cette période.
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.barres}>
                    <EnteteEtapes colonnes={['Besoin', 'Présentés', 'Retenus']} />
                    {candidatsParClient.slice(0, CLIENTS_APERCU).map(c => (
                      <BarreEtapes
                        key={c.entite}
                        label={c.entite}
                        etape={c.etape}
                        valeurs={[
                          ouTiret(c.profilsDemandes),
                          ouTiret(c.presentes),
                          ouTiret(c.retenus),
                        ]}
                        title={survolClient(c)}
                      />
                    ))}
                  </div>
                  {candidatsParClient.length > CLIENTS_APERCU && (
                    <button
                      type="button"
                      className={styles.voirPlus}
                      onClick={() => setClientsOuverts(true)}
                    >
                      Voir les {fmtNumber(candidatsParClient.length)} clients
                    </button>
                  )}
                  <div className={styles.mention}>
                    La barre situe le besoin le plus avancé du client sur les neuf étapes du
                    processus, de R0 à « En poste » ; elle ne mesure pas une part de travail
                    accompli. Au survol d’une ligne : les postes concernés et l’étape atteinte.
                    Un tiret signale une colonne non saisie au classeur, et non un zéro.
                  </div>
                </>
              )}
            </Card>

            {/* ── Planche 14, section « Délais et pipeline de recrutement » ──
                Titre validé par Clémence le 30/09, qui remplace « time to fill
                et candidats par client ». */}
            <SectionLabel>Délais et pipeline de recrutement</SectionLabel>
            {/* LE GRAPHE PREND TOUTE LA LARGEUR depuis que les candidats
                par client sont remontes sous la rangee : une grille a deux
                colonnes dont une est vide laisse un trou, et une courbe a
                douze points respire mieux large. */}

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
                      <Bar
                        data={{
                          labels: evolution.map(p => libelleMois(p.mois)),
                          datasets: [
                            /* LA BARRE PORTE LE VOLUME, LES COURBES LE DELAI,
                               et les deux vivent sur des axes separes : des
                               jours et des besoins ne se comparent pas sur la
                               meme echelle. Sans second axe, une barre de 6
                               besoins ecraserait des courbes a 40 jours, ou
                               l inverse selon le mois. */
                            {
                              label: 'Besoins pourvus',
                              data: evolution.map(p => p.n),
                              backgroundColor: C_BESOINS,
                              borderRadius: 4,
                              borderSkipped: false,
                              yAxisID: 'y2',
                              order: 2,
                            },
                            {
                              type: 'line',
                              label: 'Moyenne',
                              data: evolution.map(p => p.moyenne),
                              borderColor: C_MOYENNE,
                              pointBackgroundColor: C_MOYENNE,
                              pointRadius: 3,
                              borderWidth: 2,
                              tension: 0.3,
                              fill: false,
                              spanGaps: false,
                              yAxisID: 'y',
                              /* order 0 dessine la courbe PAR-DESSUS les barres ;
                                 sans cela elle passerait dessous et
                                 disparaitrait derriere elles. */
                              order: 0,
                            },
                            {
                              type: 'line',
                              label: 'Médiane',
                              data: evolution.map(p => p.mediane),
                              borderColor: C_MEDIANE,
                              pointBackgroundColor: C_MEDIANE,
                              pointRadius: 3,
                              borderWidth: 2,
                              tension: 0.3,
                              fill: false,
                              /* LES MOIS SANS DEMARRAGE RESTENT DES TROUS : avec
                                 spanGaps, Chart.js relierait fevrier a avril
                                 d un trait continu et l on y lirait une
                                 evolution reguliere la ou mars n a rien eu. */
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
                                  if (ctx.dataset.label === 'Besoins pourvus') {
                                    return `${fmtNumber(v)} besoin${v > 1 ? 's' : ''} pourvu${v > 1 ? 's' : ''}`;
                                  }
                                  return `${ctx.dataset.label} : ${fmtNumber(v)} j`;
                                },
                              },
                            },
                          },
                          scales: {
                            x: { grid: { display: false } },
                            y: {
                              position: 'left',
                              beginAtZero: true,
                              ticks: { precision: 0 },
                              title: { display: true, text: 'Jours', color: 'rgba(38,0,31,0.45)', font: { size: 9 } },
                            },
                            y2: {
                              position: 'right',
                              beginAtZero: true,
                              /* Pas de demi-besoin, et pas de grille en double :
                                 celle de l axe des jours suffit, deux trames
                                 superposees brouillent la lecture. */
                              ticks: { precision: 0 },
                              grid: { drawOnChartArea: false },
                              title: { display: true, text: 'Besoins', color: 'rgba(38,0,31,0.45)', font: { size: 9 } },
                            },
                          },
                        }}
                      />
                    </div>
                    {/* LEGENDE EN HTML, pas celle de Chart.js, comme partout
                        dans ce depot : trois series sur deux axes ne se
                        devinent pas, et la legende native se place mal. */}
                    <div className={styles.legende}>
                      <span className={styles.legDot} style={{ background: C_BESOINS }} />Besoins pourvus
                      <span className={styles.legDot} style={{ background: C_MOYENNE, marginLeft: 12 }} />Moyenne
                      <span className={styles.legDot} style={{ background: C_MEDIANE, marginLeft: 12 }} />Médiane
                    </div>
                    {/* CETTE LIGNE EXISTE PARCE QUE LE GRAPHE ET LA TUILE NE
                        COMPTENT PAS LA MÊME CHOSE, et que sans elle on les
                        croirait en désaccord. La tuile est bornée à la
                        COHORTE, les besoins commandés sur la période ; le
                        graphe tourne sur une FENÊTRE GLISSANTE de douze mois
                        ancrée sur la fin de période, comme tous les graphes
                        d'évolution de ce dépôt. Une courbe réduite au mois
                        sélectionné n'aurait qu'un point. */}
                    {/* LA MENTION DÉCRIT LES TROIS SÉRIES, pas seulement la
                        médiane : elle ne parlait que d'elle depuis que les
                        barres et la moyenne ont été ajoutées. Une légende dit
                        QUI est quoi, une mention dit CE QU'ON MESURE et SUR
                        QUOI — les deux sont nécessaires et ne se remplacent
                        pas. */}
                    <div className={styles.mention}>
                      Délai entre l’ouverture de recherche et le démarrage, par mois
                      de démarrage · douze derniers mois ·{' '}
                      {fmtNumber(totalDemarrages)} démarrage{s(totalDemarrages)} daté{s(totalDemarrages)}.
                    </div>
                  </>
                )}
              </Card>

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

            {/* ── EN ATTENTE DE PLACEMENT ──
                Ces quatre tuiles occupaient la rangée « Candidatures et
                délais » avant qu'elle ne devienne l'entonnoir des profils.
                Jimmy a demandé le 22/10 de les descendre ici en attendant de
                dire où elles vont, et de ne rien supprimer. Le titre de
                section est volontairement explicite : une section provisoire
                qui ne dit pas qu'elle l'est finit par passer pour un choix. */}
            <SectionLabel>Indicateurs à replacer</SectionLabel>
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

            {clientsOuverts && (
              <ListeModale
                titre="Candidats en recrutement par prospects/clients"
                sousTitre={
                  `${fmtNumber(candidatsParClient.length)} client${s(candidatsParClient.length)}`
                  + ` · ${fmtNumber(candidatsParClient.reduce((n, c) => n + c.besoins, 0))} besoin`
                  + `${s(candidatsParClient.reduce((n, c) => n + c.besoins, 0))} en cours`
                }
                onClose={() => setClientsOuverts(false)}
              >
                {/* LA POP-UP NOMME LES POSTES, là où la carte les laisse au
                    survol : elle a la place d'une colonne, et c'est ce qu'on
                    vient y chercher quand on déplie la liste. */}
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Poste</th>
                      <th>Étape</th>
                      <th className={styles.num}>Besoin</th>
                      <th className={styles.num}>Présentés</th>
                      <th className={styles.num}>Retenus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidatsParClient.map(c => (
                      <tr key={c.entite}>
                        <td>{c.entite}</td>
                        <td>{(c.postes || '-').replace(/\s+/g, ' ')}</td>
                        <td>{libelleEtape(c.etape) || '-'}</td>
                        <td className={styles.num}>{ouTiret(c.profilsDemandes)}</td>
                        <td className={styles.num}>{ouTiret(c.presentes)}</td>
                        <td className={styles.num}>{ouTiret(c.retenus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ListeModale>
            )}
          </div>
        );
      }}
    </Loader>
  );
}
