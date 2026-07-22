import { useState } from 'react';
import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import { useSatisfactionClient } from '../../../hooks/useSatisfactionClient';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import Pill from '../../../components/ui/Pill';
import DonutChart from '../../../components/ui/DonutChart';
import NotConnected, { notConnectedKPI } from '../../../components/ui/NotConnected';
import styles from './FocusClient.module.css';

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

export default function FocusClient() {
  const mounted = useChartMount();
  const { result, loading, error } = useSnapshotData();
  const satisfaction = useSatisfactionClient();
  const [healthVisible, setHealthVisible] = useState(HEALTH_LIST_STEP);

  return (
    <div className={styles.page}>

      {/* ══ Ligne 1 — Le solde net du portefeuille : entrées vs sorties ══ */}
      <SectionLabel badge="Monday">Vision client</SectionLabel>
      <Loader loading={loading} label="Chargement des données CRM…" size={44} minHeight={110} />
      {error && (
        <div style={{ padding: '20px 0', color: 'var(--neg)', fontSize: 13 }}>Erreur de chargement : {error}</div>
      )}
      {result && (
        <div className={styles.newClientsGrid}>
          <KPICard
            label="Nouveaux clients"
            value={result.nbDealsGagnes}
            unit=" clients"
            trend={{ dir: result.nbDealsGagnes > 0 ? 'up' : 'neutral', text: `CA : ${fmtEuros(result.sommeVentesGagnes)}` }}
            color="green"
          />
          <KPICard {...notConnectedKPI('Clients perdus', 'aucun suivi des départs de clients côté Monday', 'red')} />
          <KPICard
            label="Portefeuille de clients actifs"
            value={result.nbClientsActifs}
            unit=" actifs"
            trend={{ dir: 'neutral', text: `Facturés sur la période · ${result.nbClientsTotal} comptes au total` }}
            color="blue"
          />
          <KPICard
            label="Marge brute nouveaux"
            value={fmtEuros(result.margeBruteNouveaux)}
            trend={{
              dir: result.margeBruteNouveaux >= 0 ? 'up' : 'down',
              text: result.sommeVentesGagnes > 0
                ? `Taux : ${Math.round(result.margeBruteNouveaux / result.sommeVentesGagnes * 100)}%`
                : '—',
            }}
            color={result.margeBruteNouveaux >= 0 ? 'green' : 'red'}
          />
        </div>
      )}

      {/* ══ Ligne 2 — La valeur : qui rapporte quoi ══ */}
      <SectionLabel>La valeur — classement clients</SectionLabel>
      <div className={styles.col6040}>
        <Card title="CA par client">
          {result?.topClients?.length > 0 ? (
            <table className={styles.tbl}>
              <thead><tr><th>#</th><th>Client</th><th>CA</th><th>Part</th></tr></thead>
              <tbody>
                {result.topClients.map((c, i) => (
                  <tr key={c.name}>
                    <td className={styles.rank} style={{ color: i === 0 ? 'var(--myrtille)' : 'var(--text2)' }}>{i + 1}</td>
                    <td className={styles.tdName}>{c.name}</td>
                    <td className={styles.tdRight} style={{ color: 'var(--text)', fontWeight: 600 }}>{fmtEuros(c.ca)}</td>
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
          <NotConnected>l'API ne renvoie pas encore la marge par client (seulement le CA global et par top client)</NotConnected>
        </Card>
      </div>

      {/* ══ Ligne 3 — La santé : où on va, ce que ça a déjà coûté ══ */}
      <SectionLabel badge="IA — colonne Monday « Note de satisfaction »">La santé — risque actuel & pertes constatées</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="Nb de Clients par Niveau de Santé">
          {satisfaction.error ? (
            <NotConnected>{satisfaction.error}</NotConnected>
          ) : satisfaction.data ? (
            <>
              {/* Chiffres en tête, camembert en dessous — même représentation
                  que la synthèse (les nombres se lisent avant le %). */}
              <div className={styles.healthStats}>
                <div className={styles.hStat}><div className={styles.hVal} style={{ color: 'var(--pos)' }}>{satisfaction.data.buckets.sain}</div><div className={styles.hLbl}>Clients sains</div></div>
                <div className={styles.hStat}><div className={styles.hVal} style={{ color: 'var(--warn)' }}>{satisfaction.data.buckets.warning}</div><div className={styles.hLbl}>Clients sous vigilance</div></div>
                <div className={styles.hStat}><div className={styles.hVal} style={{ color: 'var(--neg)' }}>{satisfaction.data.buckets.risque}</div><div className={styles.hLbl}>Clients à risque</div></div>
              </div>
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
              <div className={styles.subnote}>Score IA Monday (colonne « Note de satisfaction ») — {satisfaction.data.note_limite}</div>
            </>
          ) : (
            <NotConnected>chargement…</NotConnected>
          )}
        </Card>

        <Card title="Clients perdus — détail">
          <NotConnected>aucun suivi des départs de clients côté Monday — nécessite un statut/date de fin de contrat compte</NotConnected>
        </Card>
      </div>

      <Card title="Revenue perdu — évolution mensuelle">
        <NotConnected>dépend du suivi des départs de clients ci-dessus</NotConnected>
      </Card>

      {/* ══ Ligne 4 — Le détail santé client par client ══ */}
      <Card title="Détails du niveau de Santé par Client">
        {satisfaction.error ? (
          <NotConnected>{satisfaction.error}</NotConnected>
        ) : satisfaction.data ? (
          (() => {
            // Classement du moins bon score au meilleur — les comptes à
            // risque remontent en premier, c'est ce qui doit être traité.
            const sorted = satisfaction.data.clients
              .filter(c => c.note != null)
              .sort((a, b) => a.note - b.note);
            const visible = sorted.slice(0, healthVisible);
            const reste = sorted.length - visible.length;
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
                {reste > 0 && (
                  <button type="button" className={styles.hsMore} onClick={() => setHealthVisible(v => v + HEALTH_LIST_STEP)}>
                    Voir plus ({reste} restant{reste > 1 ? 's' : ''})
                  </button>
                )}
                <div className={styles.subnote} style={{ marginTop: 8 }}>
                  Classé du score le plus bas au plus élevé · note générée par l'IA Monday — le raisonnement détaillé (survol dans Monday) n'est pas exposé par l'API, seule la note chiffrée l'est
                </div>
              </>
            );
          })()
        ) : (
          <NotConnected>chargement…</NotConnected>
        )}
      </Card>

      {/* ══ Ligne 5 — Pilotage interne : qui génère la marge, indépendant du churn ══ */}
      <SectionLabel>Pilotage interne — marge par collaborateur</SectionLabel>
      <Card title="Classement collaborateurs — marge générée">
        <NotConnected>aucune répartition de la marge par collaborateur commercial n'est encore calculée côté API</NotConnected>
      </Card>

    </div>
  );
}
