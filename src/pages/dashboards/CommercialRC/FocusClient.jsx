import { useState, useRef } from 'react';
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
import { fmtEurosExact, fmtEurosDetail } from '../../../utils/formatNumber';
import { SHOW_COMPTES_KPIS } from '../../../config/featureFlags';
import styles from './FocusClient.module.css';

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
  const santeSectionRef = useRef(null);
  const [selectedBucket, setSelectedBucket] = useState(null); // 'sain' | 'warning' | 'risque' | null
  const c = compareResult;
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
              <KPICard
                label="Clients perdus"
                value={result.nbClientsPerdus}
                unit=" clients"
                compare={cmp(result.nbClientsPerdus, c?.nbClientsPerdus, true)}
                trend={{ dir: 'neutral', text: `CA perdu : ${fmtEuros(result.caPerdu)}` }}
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
                    ? `Taux : ${Math.round(result.margeBruteNouveaux / result.caNouveauxClients * 100)}%`
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
                        <span>{c.pct}%</span>
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
                        <span>{c.pct}%</span>
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
      <div className={styles.twoCol}>
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
                tooltip={(label, value, pct) => `${label} : ${value} clients (${pct}%)`}
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

        <Card title="Détail des clients perdus">
          {!SHOW_COMPTES_KPIS ? (
            <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
          ) : perdus.error ? (
            <NotConnected>{perdus.error}</NotConnected>
          ) : perdus.detail ? (
            perdus.detail.length > 0 ? (
              <table className={styles.tbl}>
                <thead><tr><th></th><th>Fin de contrat</th><th>CA</th></tr></thead>
                <tbody>
                  {perdus.detail.map(c => (
                    <tr key={c.compteId}>
                      <td className={styles.tdName}>{c.nom}</td>
                      <td>{c.dateFin ? new Date(`${c.dateFin}T00:00:00`).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className={styles.tdRight} style={{ color: 'var(--text)', fontWeight: 600 }}><MontantExact exact={fmtEurosExact(c.ca)}>{fmtEurosDetail(c.ca)}</MontantExact></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <NotConnected>aucun client perdu sur la période</NotConnected>
            )
          ) : (
            <NotConnected>chargement…</NotConnected>
          )}
        </Card>
      </div>

      {/* Détail par client — regroupé juste sous "Niveau de santé client", en
          l'absence de KPI clients/revenus perdus à intercaler pour l'instant. */}
      <div ref={santeSectionRef} />
      <Card title="Détails du niveau de Santé par Client">
        {!SHOW_COMPTES_KPIS ? (
          <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
        ) : satisfaction.error ? (
          <NotConnected>{satisfaction.error}</NotConnected>
        ) : satisfaction.data ? (
          (() => {
            // Classement du moins bon score au meilleur — les comptes à
            // risque remontent en premier, c'est ce qui doit être traité.
            const sorted = satisfaction.data.clients
              .filter(c => c.note != null)
              .sort((a, b) => a.note - b.note);
            const visible = sorted.slice(0, showAllSante ? undefined : HEALTH_LIST_STEP);
            return (
              <>
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
                  Classé du score le plus bas au plus élevé · note générée par l'IA Monday, le raisonnement détaillé dispo au survol dans Monday · clients actifs sur la période
                </div>
              </>
            );
          })()
        ) : (
          <NotConnected>chargement…</NotConnected>
        )}
      </Card>

      <div style={{ marginTop: 20 }}>
        <Card title="Évolution mensuelle des revenus perdus">
          {!SHOW_COMPTES_KPIS ? (
            <NotConnected>{COMPTES_HIDDEN_REASON}</NotConnected>
          ) : perdus.error ? (
            <NotConnected>{perdus.error}</NotConnected>
          ) : perdus.monthly ? (
            perdus.monthly.some(m => m.caPerdu > 0) ? (() => {
              const maxCaPerdu = Math.max(...perdus.monthly.map(m => m.caPerdu), 1);
              return perdus.monthly.map(m => (
                <div key={m.month} className={styles.hsRow} style={{ gridTemplateColumns: '60px 1fr 90px' }}>
                  <div className={styles.hsName} style={{ textTransform: 'capitalize' }}>{m.label}</div>
                  <div className={styles.hsBarCol}>
                    <div className={styles.hsBar}>
                      <div
                        className={styles.hsBarFill}
                        style={{
                          width: mounted ? `${Math.max((m.caPerdu / maxCaPerdu) * 100, m.caPerdu > 0 ? 4 : 0)}%` : '0%',
                          background: 'var(--neg)',
                          transition: 'width 0.85s cubic-bezier(0.16,1,0.3,1)',
                        }}
                      />
                    </div>
                  </div>
                  <div className={styles.tdRight} style={{ color: 'var(--text)', fontWeight: 600 }}><MontantExact exact={fmtEurosExact(m.caPerdu)}>{fmtEurosDetail(m.caPerdu)}</MontantExact></div>
                </div>
              ));
            })() : (
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
