import { useState, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import { useSatisfactionClient } from '../../../hooks/useSatisfactionClient';
import { useClientsPerdus } from '../../../hooks/useClientsPerdus';
import { usePeriod } from '../../../contexts/PeriodContext';
import { compareValueText } from '../../../utils/compareText';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader, { LoaderMark } from '../../../components/ui/Loader';
import Pill from '../../../components/ui/Pill';
import DonutChart from '../../../components/ui/DonutChart';
import NotConnected, { notConnectedKPI } from '../../../components/ui/NotConnected';
import NoPeriodData from '../../../components/ui/NoPeriodData';
import MontantExact from '../../../components/ui/MontantExact';
import { derniereExtractionDDMM } from '../../../utils/formatDate';
import { fmtEurosExact, fmtEurosDetail, partPct, fmtPourcentage } from '../../../utils/formatNumber';
import { SHOW_COMPTES_KPIS, SHOW_MONDAY_KPIS } from '../../../config/featureFlags';
import styles from './FocusClient.module.css';
import RechercheListe from '../../../components/ui/RechercheListe';
import { correspond } from '../../../utils/recherche';
import rechStyles from '../../../components/ui/RechercheListe.module.css';
import ListeModale from '../../../components/ui/ListeModale';

// Chart.js s'enregistre par fichier dans ce projet (voir Synthese.jsx,
// FocusCommercial.jsx) : seuls les éléments réellement utilisés ici, pour
// l'histogramme des revenus perdus. Le donut de la page passe par DonutChart,
// qui enregistre ArcElement de son côté.
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip);

const COMPTES_HIDDEN_REASON = 'masqué temporairement — travail en cours sur le board Leads/Prospects';

const sentimentInfo = s => {
  if (s?.includes('Sain'))   return { color: 'var(--pos)',  variant: 'green', label: 'Sain' };
  if (s?.includes('Risque')) return { color: 'var(--neg)',  variant: 'red',   label: 'Risque de départ' };
  if (s?.includes('Warning')) return { color: 'var(--warn)', variant: 'amber', label: 'Sous vigilance' };
  return { color: 'var(--text3)', variant: 'gray', label: 'Non noté' };
};

const fmtEuros = v => {
  if (!v) return '0 €';
  if (v >= 1000) return `${(v / 1000).toFixed(0)} K€`;
  return `${v} €`;
};

const HEALTH_LIST_STEP = 8;
/* Lignes affichées dans la carte — une ligne = un client et un poste, après
   regroupement. Le reste passe par la modale : le nombre de groupes varie
   d'une période à l'autre, jusqu'à 12 sur le mois le plus chargé de
   l'historique, et le laisser dicter la hauteur de la carte déplaçait tout le
   bas de la page à chaque changement de période. */
const MISSIONS_APERCU = 5;
const BUCKET_MATCH = {
  sain:    c => c.sentiment?.includes('Sain'),
  warning: c => c.sentiment?.includes('Warning'),
  risque:  c => c.sentiment?.includes('Risque'),
};
const BUCKET_LABEL = { sain: 'Clients sains', warning: 'Clients sous vigilance', risque: 'Clients à risque' };

export default function FocusClient() {
  const mounted = useChartMount();
  const { result, compareResult, loading, error } = useSnapshotData();
  const satisfaction = useSatisfactionClient();
  const perdus = useClientsPerdus();
  const { comparePeriodKey } = usePeriod();
  const [showAllSante, setShowAllSante] = useState(false);
  const [rechercheSante, setRechercheSante] = useState('');
  // Sens du tri de la liste santé : 'desc' = les mieux notés en tête.
  const [santeDir, setSanteDir] = useState('desc');
  const santeSectionRef = useRef(null);
  const [selectedBucket, setSelectedBucket] = useState(null); // 'sain' | 'warning' | 'risque' | null
  const [missionsOuvertes, setMissionsOuvertes] = useState(false);
  const c = compareResult;

  /* Regroupe les missions par client ET par poste, en sommant les montants
     (demande de Jimmy, 15/08). Un client qui perd trois téléprospecteurs
     occupait trois lignes identiques à l'œil, qu'il fallait additionner de
     tête ; il en occupe une, avec le nombre de profils et le total.

     La date retenue est la plus tardive du groupe — c'est celle à laquelle le
     client a fini de perdre ces postes. L'étendue complète et le nom des
     personnes restent au survol. */
  const regrouperMissions = lignes => {
    const groupes = new Map();
    for (const p of lignes) {
      const cle = `${p.compteId}|${p.poste || ''}`;
      let g = groupes.get(cle);
      if (!g) {
        g = { cle, client: p.client, poste: p.poste, ca: 0, dates: [], noms: [], motifs: new Set() };
        groupes.set(cle, g);
      }
      g.ca += p.ca;
      if (p.dateFin) g.dates.push(p.dateFin);
      if (p.collaborateur) g.noms.push(p.collaborateur);
      if (p.motif) g.motifs.add(p.motif);
    }
    return [...groupes.values()]
      .map(g => {
        const dates = [...g.dates].sort();
        return { ...g, nb: g.noms.length || g.dates.length || 1, dateFin: dates.at(-1) || null, datePremiere: dates[0] || null };
      })
      .sort((a, b) => (b.dateFin || '').localeCompare(a.dateFin || '') || b.ca - a.ca);
  };

  const fmtJour = d => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR') : '—');

  /* Même tableau dans la carte (extrait) et dans la modale (liste entière) :
     une seule définition, sinon les deux divergent au premier ajustement. */
  const tableauMissions = groupes => (
    <table className={styles.tbl}>
      {/* Client en tête : c'est par lui qu'on cherche une perte (demande de
          Jimmy, 15/08). Le poste vient ensuite préciser ce qui a été perdu. */}
      <thead><tr><th>Client</th><th>Mission</th><th>Profils</th><th>Fin</th><th>CA</th></tr></thead>
      <tbody>
        {groupes.map(g => (
          <tr key={g.cle}>
            <td className={styles.tdName} title={g.motifs.size ? [...g.motifs].join(' · ') : undefined}>{g.client}</td>
            {/* Le poste, pas le nom de la personne : sur un dashboard commercial
                c'est le type de mission perdue qui se pilote. Les noms restent
                accessibles au survol. */}
            <td className={styles.tdPostes}>
              <span className={styles.postePill} title={g.noms.join(', ') || undefined}>
                {g.poste || 'Poste non renseigné'}
              </span>
            </td>
            <td className={styles.tdRight}>{g.nb}</td>
            <td title={g.datePremiere && g.datePremiere !== g.dateFin ? `du ${fmtJour(g.datePremiere)} au ${fmtJour(g.dateFin)}` : undefined}>
              {fmtJour(g.dateFin)}
            </td>
            <td className={styles.tdRight} style={{ color: 'var(--text)', fontWeight: 600 }}>
              <MontantExact exact={fmtEurosExact(g.ca)}>{fmtEurosDetail(g.ca)}</MontantExact>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const cmp = (current, ref, invert) => c ? compareValueText(current, ref, comparePeriodKey, invert) : null;
  // Connecté, données chargées, mais aucun compte facturé sur la période
  // choisie — même traitement que Synthèse/Sales/ASUS/TLM : un seul message
  // clair plutôt qu'une mosaïque de "0 €" et de graphiques vides.
  const isEmptyPeriod = SHOW_COMPTES_KPIS && result && result.nbClientsActifs === 0;

  return (
    <div className={styles.page}>

      {/* Source des données — Monday CRM, extrait une fois par soir à 21h
          (voir server/src/mondayIngestion.js) et non plus en continu par
          webhook : avant 21h, ce qui est affiché date de la veille au soir.
          Spinner uniquement lors d'un rechargement (changement de filtre),
          pas au tout premier affichage. */}
      <div className={styles.dataAlert} style={{ borderColor: 'rgba(142,207,170,0.3)', background: 'rgba(142,207,170,0.06)' }}>
        <span style={{ color: 'var(--pos)' }}>● Données Monday CRM</span> — Mise à jour arrêtée au {derniereExtractionDDMM()}
        {loading && result && <span className={styles.dataAlertSpin}><LoaderMark size={14} /></span>}
      </div>

      {/* ══ Ligne 1 — Le solde net du portefeuille : entrées vs sorties ══ */}
      <SectionLabel badge="Monday">Vision client</SectionLabel>
      <Loader loading={loading && !result} label="Chargement des données CRM…" size={44} minHeight={110} />
      {error && (
        <div style={{ padding: '20px 0', color: 'var(--neg)', fontSize: 13 }}>Erreur de chargement : {error}</div>
      )}

      {isEmptyPeriod && (
        <Card><NoPeriodData suggestion="Essayez une autre période — le mois précédent, par exemple." /></Card>
      )}

      {result && !isEmptyPeriod && (
        <div className={styles.newClientsGrid}>
          {!SHOW_COMPTES_KPIS ? (
            <>
              <KPICard {...notConnectedKPI('Nouveaux clients', COMPTES_HIDDEN_REASON, 'green')} />
              <KPICard {...notConnectedKPI('Clients perdus', COMPTES_HIDDEN_REASON, 'red')} />
              <KPICard {...notConnectedKPI('Portefeuille de clients actifs', COMPTES_HIDDEN_REASON, 'blue')} />
              <KPICard {...notConnectedKPI('Marge brute nouveaux', COMPTES_HIDDEN_REASON, 'green')} />
            </>
          ) : (
            <>
              <KPICard
                label="Nouveaux clients"
                value={result.nbNouveauxClients}
                unit=" clients"
                compare={cmp(result.nbNouveauxClients, c?.nbNouveauxClients)}
                trend={{ dir: 'neutral', text: `CA : ${fmtEuros(result.caNouveauxClients)}` }}
                color="green"
              />
              {/* La perte se compte en missions, pas en clients : un contrat
                  qui porte cinq profils dont un s'arrête ne « perd » pas un
                  client, mais perd bien du revenu. Le nombre de clients
                  touchés reste lisible juste en dessous — plusieurs missions
                  peuvent s'arrêter chez le même client sur une période. */}
              <KPICard
                label="Missions perdues"
                value={result.nbProfilsPerdus}
                unit=" missions"
                compare={cmp(result.nbProfilsPerdus, c?.nbProfilsPerdus, true)}
                trend={{
                  dir: 'neutral',
                  text: `CA perdu : ${fmtEuros(result.caPerdu)} · ${result.nbClientsPerdus} client${result.nbClientsPerdus > 1 ? 's' : ''}`,
                }}
                color="red"
              />
              <KPICard
                label="Portefeuille de clients actifs"
                value={result.nbClientsActifs}
                unit=" actifs"
                compare={cmp(result.nbClientsActifs, c?.nbClientsActifs)}
                trend={{ dir: 'neutral', text: 'Clients ayant généré du CA sur la période' }}
                color="blue"
              />
              <KPICard
                label="Marge brute nouveaux"
                value={fmtEuros(result.margeBruteNouveaux)}
                exactValue={fmtEurosExact(result.margeBruteNouveaux)}
                compare={cmp(result.margeBruteNouveaux, c?.margeBruteNouveaux)}
                trend={{
                  dir: 'neutral',
                  text: result.caNouveauxClients > 0
                    ? `Taux : ${fmtPourcentage(partPct(result.margeBruteNouveaux, result.caNouveauxClients))}`
                    : '—',
                }}
                color={result.margeBruteNouveaux >= 0 ? 'green' : 'red'}
              />
            </>
          )}
        </div>
      )}

      {/* ══ Ligne 2 — La valeur : qui rapporte quoi ══ */}
      <SectionLabel>Performance client</SectionLabel>
      <div className={styles.col6040}>
        <Card title="CA par client">
          {!SHOW_COMPTES_KPIS ? (
            <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
          ) : result?.topClients?.length > 0 ? (
            <table className={styles.tbl}>
              <thead><tr><th></th><th></th><th>CA</th><th>Part du CA</th></tr></thead>
              <tbody>
                {result.topClients.map((c, i) => (
                  <tr key={c.name}>
                    <td className={styles.rank} style={{ color: i === 0 ? 'var(--myrtille)' : 'var(--text2)' }}>{i + 1}</td>
                    <td className={styles.tdName}>{c.name}</td>
                    <td className={styles.tdRight} style={{ color: 'var(--text)', fontWeight: 600 }}><MontantExact exact={fmtEurosExact(c.ca)}>{fmtEurosDetail(c.ca)}</MontantExact></td>
                    <td>
                      <div className={styles.miniBarWrap}>
                        <div className={styles.miniBar}>
                          <div
                            className={styles.miniFill}
                            style={{
                              width: mounted ? `${c.pct}%` : '0%',
                              transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
                            }}
                          />
                        </div>
                        <span>{fmtPourcentage(c.pct)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <NotConnected>aucun client actif sur la période</NotConnected>
          )}
          <div className={styles.subnote}>Top 5 clients par CA — secteur et évolution non disponibles (à connecter)</div>
        </Card>

        <Card title="Marge brute par client">
          {!SHOW_COMPTES_KPIS ? (
            <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
          ) : result?.topClientsMarge?.length > 0 ? (
            <table className={styles.tbl}>
              <thead><tr><th></th><th></th><th>Marge</th><th>Part de la marge</th></tr></thead>
              <tbody>
                {result.topClientsMarge.map((c, i) => (
                  <tr key={c.name}>
                    <td className={styles.rank} style={{ color: i === 0 ? 'var(--myrtille)' : 'var(--text2)' }}>{i + 1}</td>
                    <td className={styles.tdName}>{c.name}</td>
                    <td className={styles.tdRight} style={{ color: c.marge >= 0 ? 'var(--text)' : 'var(--neg)', fontWeight: 600 }}><MontantExact exact={fmtEurosExact(c.marge)}>{fmtEurosDetail(c.marge)}</MontantExact></td>
                    <td>
                      <div className={styles.miniBarWrap}>
                        <div className={styles.miniBar}>
                          <div
                            className={styles.miniFill}
                            style={{
                              width: mounted ? `${Math.max(c.pct, 0)}%` : '0%',
                              transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
                            }}
                          />
                        </div>
                        <span>{fmtPourcentage(c.pct)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <NotConnected>aucun client actif sur la période</NotConnected>
          )}
          <div className={styles.subnote}>Top 5 clients par marge brute (vente − achat)</div>
        </Card>
      </div>

      {/* ══ Ligne 3 — La santé : où on va, ce que ça a déjà coûté ══ */}
      <SectionLabel badge="IA">Santé du portefeuille client</SectionLabel>
      <div className={SHOW_MONDAY_KPIS ? styles.twoCol : undefined}>
        {/* La note de satisfaction vient de Monday : aucun des 117 comptes
            reconstruits depuis l'Excel n'en porte. La carte serait vide et
            non filtrée — elle est retirée tant qu'on travaille sur la seule
            base Excel (décision de Jimmy, 15/08). */}
        {SHOW_MONDAY_KPIS && (
        <Card title="Niveau de santé client">
          {!SHOW_COMPTES_KPIS ? (
            <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
          ) : satisfaction.error ? (
            <NotConnected>{satisfaction.error}</NotConnected>
          ) : satisfaction.data ? (
            <>
              {/* Chiffres en tête, camembert en dessous — même représentation
                  que la synthèse (les nombres se lisent avant le %). Cliquer
                  une catégorie déploie son Top 5 clients concernés. */}
              {/* Scopé aux clients actifs sur la période (mêmes clients que
                  "Portefeuille de clients actifs" ci-dessus) — rapprochés
                  par nom avec leur éventuel score live. */}
              <div className={styles.subnote} style={{ marginBottom: 8 }}>Sur les clients actifs de la période</div>
              <div className={styles.healthStats}>
                <button type="button" className={styles.hStat} onClick={() => setSelectedBucket(b => b === 'sain' ? null : 'sain')}>
                  <div className={styles.hVal} style={{ color: 'var(--pos)' }}>{satisfaction.data.buckets.sain}</div><div className={styles.hLbl}>Clients sains</div>
                </button>
                <button type="button" className={styles.hStat} onClick={() => setSelectedBucket(b => b === 'warning' ? null : 'warning')}>
                  <div className={styles.hVal} style={{ color: 'var(--warn)' }}>{satisfaction.data.buckets.warning}</div><div className={styles.hLbl}>Clients sous vigilance</div>
                </button>
                <button type="button" className={styles.hStat} onClick={() => setSelectedBucket(b => b === 'risque' ? null : 'risque')}>
                  <div className={styles.hVal} style={{ color: 'var(--neg)' }}>{satisfaction.data.buckets.risque}</div><div className={styles.hLbl}>Clients à risque</div>
                </button>
              </div>
              {selectedBucket && (() => {
                const top5 = satisfaction.data.clients
                  .filter(BUCKET_MATCH[selectedBucket])
                  .filter(c => c.note != null)
                  .sort((a, b) => a.note - b.note)
                  .slice(0, 5);
                return (
                  <div className={styles.bucketTop5}>
                    <div className={styles.metaSub}>Top 5 — {BUCKET_LABEL[selectedBucket]}</div>
                    {top5.length > 0 ? top5.map(c => (
                      <div key={c.compteId} className={styles.bucketTop5Row}>
                        <span>{c.nom}</span><span>{c.note}</span>
                      </div>
                    )) : (
                      <div className={styles.subnote}>Aucun client dans cette catégorie</div>
                    )}
                  </div>
                );
              })()}
              <DonutChart
                variant="donut"
                data={[satisfaction.data.buckets.sain, satisfaction.data.buckets.warning, satisfaction.data.buckets.risque]}
                labels={['Clients sains', 'Clients sous vigilance', 'Clients à risque']}
                colors={['rgba(142,207,170,0.85)', 'rgba(212,168,75,0.8)', 'rgba(196,135,106,0.8)']}
                height={185}
                centerValue={satisfaction.data.buckets.sain + satisfaction.data.buckets.warning + satisfaction.data.buckets.risque}
                centerLabel="clients"
                tooltip={(label, value, pct) => `${label} : ${value} clients (${fmtPourcentage(pct)})`}
              />
              {satisfaction.data.buckets.sansNote > 0 && (
                <div className={styles.subnote}>{satisfaction.data.buckets.sansNote} compte(s) sans note pour l'instant</div>
              )}
              <div className={styles.subnote}>Score IA Monday — {satisfaction.data.note_limite}</div>
            </>
          ) : (
            <NotConnected>chargement…</NotConnected>
          )}
        </Card>
        )}

        {/* L'unité est la mission arrêtée, pas le client : ce qu'on lit c'est
            un poste, un montant, une date — et en dernière colonne seulement,
            chez qui (arbitrage de Jimmy, 14/08). La version précédente
            séparait « clients perdus » et « collaborateurs perdus », une
            distinction qui reposait sur la date de fin de contrat du compte,
            absente de tout l'historique reconstruit depuis l'Excel. */}
        <Card title="Détail des missions perdues">
          {!SHOW_COMPTES_KPIS ? (
            <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
          ) : perdus.error ? (
            <NotConnected>{perdus.error}</NotConnected>
          ) : perdus.profils ? (
            perdus.profils.length > 0 ? (() => {
              /* Le regroupement précède le découpage : tronquer les profils
                 puis regrouper donnerait des groupes incomplets, avec des
                 totaux faux dans la carte. */
              const groupes = regrouperMissions(perdus.profils);
              return (
                <>
                  {/* La carte n'affiche qu'un extrait de hauteur fixe : le
                      nombre de groupes change d'une période à l'autre, et le
                      laisser s'allonger déformait la page. Le reste vit dans
                      la modale. */}
                  {tableauMissions(groupes.slice(0, MISSIONS_APERCU))}
                  {groupes.length > MISSIONS_APERCU && (
                    <button
                      type="button"
                      className={styles.hsMore}
                      onClick={() => setMissionsOuvertes(true)}
                    >
                      Voir les {perdus.profils.length} missions
                    </button>
                  )}
                </>
              );
            })() : (
              <NotConnected>aucune mission arrêtée sur la période</NotConnected>
            )
          ) : (
            <NotConnected>chargement…</NotConnected>
          )}

          {missionsOuvertes && (
            <ListeModale
              titre="Missions perdues"
              sousTitre={`${perdus.profils.length} missions arrêtées sur la période · ${fmtEurosDetail(perdus.profils.reduce((s, p) => s + p.ca, 0))}`}
              onClose={() => setMissionsOuvertes(false)}
            >
              {tableauMissions(regrouperMissions(perdus.profils))}
            </ListeModale>
          )}
        </Card>
      </div>

      {/* Détail par client — regroupé juste sous "Niveau de santé client", en
          l'absence de KPI clients/revenus perdus à intercaler pour l'instant. */}
      <div ref={santeSectionRef} />
      {/* Même raison que la carte ci-dessus : la note vient de Monday, aucun
          compte Excel n'en a. */}
      {SHOW_MONDAY_KPIS && (
      <Card title="Détails du niveau de Santé par Client">
        {!SHOW_COMPTES_KPIS ? (
          <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
        ) : satisfaction.error ? (
          <NotConnected>{satisfaction.error}</NotConnected>
        ) : satisfaction.data ? (
          (() => {
            /* Les mieux notés en tête par défaut (demande de Jimmy). Le sens
               se renverse au clic sur l'en-tête « Note », comme les colonnes
               triables des tableaux du dashboard — remettre les comptes à
               risque en premier reste donc à un clic.

               La recherche filtre avant le repliement : sinon chercher un
               client au-delà des 8 premières lignes ne donnait rien tant que
               la liste n'était pas dépliée. */
            const notes = satisfaction.data.clients.filter(c => c.note != null);
            const filtrees = notes.filter(c => correspond(rechercheSante, c.nom, c.sentiment));
            const sorted = [...filtrees].sort((a, b) =>
              santeDir === 'desc' ? b.note - a.note : a.note - b.note);
            const visible = sorted.slice(0, showAllSante ? undefined : HEALTH_LIST_STEP);
            return (
              <>
                <RechercheListe valeur={rechercheSante} onChange={setRechercheSante} />
                {rechercheSante && (
                  <div className={rechStyles.compte}>
                    {filtrees.length} résultat{filtrees.length > 1 ? 's' : ''} sur {notes.length}
                  </div>
                )}

                <button
                  type="button"
                  className={styles.hsSortBtn}
                  onClick={() => setSanteDir(d => (d === 'desc' ? 'asc' : 'desc'))}
                  aria-label={`Trier par note, actuellement ${santeDir === 'desc' ? 'décroissant' : 'croissant'}`}
                >
                  Note{santeDir === 'desc' ? ' ▼' : ' ▲'}
                </button>

                {sorted.length === 0 && (
                  <div className={styles.subnote}>Aucun client ne correspond à « {rechercheSante} »</div>
                )}

                {visible.map((c, i) => {
                  const s = sentimentInfo(c.sentiment);
                  return (
                    <div key={c.compteId} className={styles.hsRow}>
                      <div className={styles.hsInfo}>
                        <div className={styles.hsName}>{c.nom}</div>
                      </div>
                      <div className={styles.hsScore} style={{ color: s.color }}>{c.note}</div>
                      <div className={styles.hsBarCol}>
                        <div className={styles.hsBarRow}>
                          <div className={styles.hsBar}>
                            <div
                              className={styles.hsBarFill}
                              style={{
                                width: mounted ? `${c.note}%` : '0%',
                                background: s.color,
                                transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 40}ms`,
                              }}
                            />
                          </div>
                          <Pill variant={s.variant}>{s.label}</Pill>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {sorted.length > HEALTH_LIST_STEP && (
                  <button
                    type="button"
                    className={styles.hsMore}
                    onClick={() => {
                      // "Voir moins" : la liste se réduit, mais si on avait
                      // scrollé en bas de la liste déployée, on restait coincé
                      // loin du début — on remonte au début de la section.
                      if (showAllSante) santeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      setShowAllSante(v => !v);
                    }}
                  >
                    {showAllSante
                      ? 'Voir moins'
                      : `Voir les ${sorted.length - HEALTH_LIST_STEP} autres`}
                  </button>
                )}
                <div className={styles.subnote} style={{ marginTop: 8 }}>
                  Classé du score {santeDir === 'desc' ? 'le plus élevé au plus bas' : 'le plus bas au plus élevé'} · note générée par l'IA Monday, le raisonnement détaillé dispo au survol dans Monday · clients actifs sur la période
                </div>
              </>
            );
          })()
        ) : (
          <NotConnected>chargement…</NotConnected>
        )}
      </Card>
      )}

      <div style={{ marginTop: 20 }}>
        <Card title="Évolution mensuelle des revenus perdus">
          {!SHOW_COMPTES_KPIS ? (
            <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
          ) : perdus.error ? (
            <NotConnected>{perdus.error}</NotConnected>
          ) : perdus.monthly ? (
            perdus.monthly.some(m => m.caPerdu > 0) ? (
              /* Histogramme vertical plutôt que la liste de barres
                 horizontales d'origine : l'axe des mois se lit naturellement
                 de gauche à droite, ce qui rend la progression du churn
                 immédiatement visible — une pile de barres horizontales se lit
                 ligne par ligne et masque la tendance. Le montant exact reste
                 accessible au survol de chaque barre. */
              <div className={styles.chartWrapPerdus}>
                <Bar
                  data={{
                    labels: perdus.monthly.map(m => m.label),
                    datasets: [{
                      label: 'Revenu perdu',
                      data: perdus.monthly.map(m => m.caPerdu),
                      backgroundColor: 'rgba(196,135,106,0.85)',
                      borderRadius: 4,
                      borderSkipped: false,
                      maxBarThickness: 46,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: mounted ? { duration: 900, easing: 'easeOutQuart' } : false,
                    plugins: {
                      legend: { display: false },
                      /* L'infobulle porte le montant exact au centime — l'axe
                         est volontairement abrégé en K€ — puis la liste des
                         clients perdus ce mois-là, du plus gros au plus petit.
                         Sans elle, lire une barre obligeait à remonter dans la
                         page pour savoir qui on avait perdu (demande de
                         Tahina, 14/08).

                         Chart.js déclenche l'infobulle au survol sur
                         ordinateur et au toucher sur mobile : le comportement
                         demandé pour les deux supports vient sans code. */
                      tooltip: {
                        displayColors: false,
                        callbacks: {
                          label: ctx => fmtEurosExact(ctx.parsed.y),
                          afterBody: ctx => {
                            const missions = perdus.monthly[ctx[0].dataIndex]?.clients || [];
                            if (!missions.length) return [];
                            /* Seules les missions qui portaient du revenu sont
                               nommées : les lister toutes remplirait
                               l'infobulle de lignes à 0 €. Elles restent
                               comptées à part — ce sont de vraies pertes,
                               simplement sans effet sur la hauteur de la barre.

                               Le poste accompagne le client : plusieurs
                               missions peuvent s'arrêter le même mois chez le
                               même client, et deux lignes au même nom seraient
                               illisibles. */
                            const avecRevenu = missions.filter(m => m.ca > 0);
                            const sansRevenu = missions.length - avecRevenu.length;
                            // Au-delà de 6 lignes, l'infobulle dépasse la carte.
                            const visibles = avecRevenu.slice(0, 6);
                            const reste = avecRevenu.length - visibles.length;
                            return [
                              '',
                              ...visibles.map(m => `${m.nom}${m.poste ? ` · ${m.poste}` : ''} — ${fmtEurosDetail(m.ca)}`),
                              ...(reste > 0 ? [`+ ${reste} autre${reste > 1 ? 's' : ''}`] : []),
                              ...(sansRevenu > 0
                                ? [`${sansRevenu} mission${sansRevenu > 1 ? 's' : ''} sans revenu récurrent`]
                                : []),
                            ];
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        ticks: { color: 'rgba(22,5,18,0.35)', font: { size: 10 } },
                        grid: { display: false },
                        border: { color: 'rgba(22,5,18,0.08)' },
                      },
                      y: {
                        beginAtZero: true,
                        ticks: { color: 'rgba(22,5,18,0.35)', font: { size: 10 }, callback: v => fmtEurosDetail(v) },
                        grid: { color: 'rgba(22,5,18,0.06)' },
                        border: { color: 'rgba(22,5,18,0.08)' },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <NotConnected>aucun revenu perdu sur les 6 derniers mois</NotConnected>
            )
          ) : (
            <NotConnected>chargement…</NotConnected>
          )}
        </Card>
      </div>

      {/* ══ Ligne 5 — Pilotage interne : qui génère la marge, indépendant du
          churn. Masquée tant que l'API ne calcule aucune répartition de la
          marge par collaborateur : afficher une section entière vide
          n'apporte rien (demande de Jimmy, 2026-08-04). À réafficher le jour
          où le calcul existe côté API. */}

    </div>
  );
}
