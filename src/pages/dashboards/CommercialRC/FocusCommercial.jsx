import { useChartMount } from '../../../hooks/useChartMount';
import { useSnapshotData } from '../../../hooks/useSnapshotData';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import NotConnected from '../../../components/ui/NotConnected';
import styles from './FocusCommercial.module.css';

const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(0)} K€` : `${v}€`;

export default function FocusCommercial() {
  const mounted = useChartMount();
  const { result, loading, error } = useSnapshotData();

  const circumference = 276.5;
  const winRate = result?.winRate ?? 0;
  const dashTarget = winRate * (circumference / 100);

  return (
    <div className={styles.page}>

      {/* ══ Ligne 1 — L'entonnoir en chiffres : entrée → conversion → sortie ══ */}
      <SectionLabel badge="Monday CRM — données réelles">L'entonnoir — pipeline, conversion, signatures</SectionLabel>
      <Loader loading={loading} label="Chargement des données CRM…" size={44} minHeight={110} />
      {error && (
        <div style={{ padding: '20px 0', color: 'var(--neg)', fontSize: 13 }}>Erreur de chargement : {error}</div>
      )}
      {result && (
        <>
          <div className={styles.kpiRow4}>
            <KPICard
              label="Pipeline total"
              value={fmt(result.montantPipeline)}
              trend={{ dir: 'neutral', text: 'Opportunités en cours' }}
              color="blue"
            />
            <KPICard
              label="Pipeline pondéré"
              value={fmt(result.montantPipelinePondere)}
              trend={{ dir: 'neutral', text: 'Seuil ≥ 30% de probabilité' }}
              color="green"
            />
            <KPICard
              label="Win rate"
              value={`${winRate}%`}
              trend={{ dir: winRate >= 50 ? 'up' : 'down', text: 'Gagnés ÷ (Gagnés + Perdus)' }}
              color={winRate >= 50 ? 'green' : 'amber'}
            />
            <KPICard
              label="Deals gagnés (période)"
              value={result.nbDealsGagnes}
              unit=" deals"
              trend={{ dir: result.nbDealsGagnes > 0 ? 'up' : 'neutral', text: `CA associé : ${fmt(result.sommeVentesGagnes)}` }}
              color="green"
            />
          </div>

          {/* ══ Ligne 2 — Diagnostic du flux : où sont les opps, que valent-elles ══ */}
          <SectionLabel>Diagnostic du pipeline</SectionLabel>
          <div className={styles.threeCol}>
            {/* Funnel par étape — pas encore de répartition par étape côté API */}
            <Card title="Funnel par étape commerciale">
              <NotConnected>le funnel par étape (Prospection → Signature) et l'âge moyen des opportunités ne sont pas encore calculés côté API</NotConnected>
            </Card>

            {/* Pipeline pondéré par probabilité */}
            <Card title="Pipeline pondéré par probabilité">
              <div className={styles.pipelineHeader}>
                <div>
                  <div className={styles.metaSub}>Pipeline total</div>
                  <div className={styles.metaVal}>{fmt(result.montantPipeline)}</div>
                </div>
                <div>
                  <div className={styles.metaSub}>Pipeline pondéré</div>
                  <div className={styles.metaVal} style={{ color: 'var(--myrtille)' }}>{fmt(result.montantPipelinePondere)}</div>
                </div>
              </div>
              <div className={styles.sep} />
              {result.pipelineBreakdown.map((p, i) => (
                <div key={p.label} className={styles.pBar}>
                  <div className={styles.pLabel}>{p.label}</div>
                  <div className={styles.pTrack}>
                    <div
                      className={styles.pFill}
                      style={{
                        width: mounted ? `${p.pct}%` : '0%',
                        background: p.color,
                        transition: `width 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                      }}
                    >
                      <span>{fmt(p.amount)}</span>
                      <span style={{ opacity: 0.7 }}>{p.pct}%</span>
                    </div>
                  </div>
                </div>
              ))}
              {result.pipelineBreakdown.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: 12 }}>Aucune opportunité en pipeline</div>
              )}
            </Card>

            {/* Win rate — jauge + détail des issues */}
            <Card title="Win rate — détail des issues">
              <div className={styles.donutWrap} style={{ height: 'auto' }}>
                <svg viewBox="0 0 110 110" width={120} height={120}>
                  <defs>
                    <linearGradient id="winGradFC" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#26001F" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#26001F" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  <circle cx="55" cy="55" r="44" fill="none" stroke="rgba(167,173,170,0.25)" strokeWidth="11" />
                  {/* Repère cible 50% */}
                  <line x1="55" y1="4" x2="55" y2="16" stroke="rgba(38,0,31,0.3)" strokeWidth="2" transform="rotate(180 55 55)" />
                  <circle
                    cx="55" cy="55" r="44" fill="none"
                    stroke="url(#winGradFC)" strokeWidth="11"
                    strokeDasharray={mounted ? `${dashTarget} ${circumference}` : `0 ${circumference}`}
                    strokeLinecap="round"
                    transform="rotate(-90 55 55)"
                    style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)' }}
                  />
                </svg>
                <div className={styles.donutCenter}>
                  <div className={styles.donutVal}>{winRate}%</div>
                  <div className={styles.donutLbl}>Win rate</div>
                </div>
              </div>
              <div className={styles.donutStats}>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--pos)' }}>{result.dealStats.gagnes}</div>
                  <div className={styles.dl}>Gagnés</div>
                </div>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--neg)' }}>{result.dealStats.perdus}</div>
                  <div className={styles.dl}>Perdus</div>
                </div>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--warn)' }}>{result.dealStats.standby}</div>
                  <div className={styles.dl}>Stand-by</div>
                </div>
                <div className={styles.dstat}>
                  <div className={styles.dv} style={{ color: 'var(--text2)' }}>{result.dealStats.enCours}</div>
                  <div className={styles.dl}>En cours</div>
                </div>
              </div>
              <div className={styles.subnote}>Repère vertical = cible 50% · Win rate = Gagnés ÷ (Gagnés + Perdus)</div>
            </Card>
          </div>
        </>
      )}

      {/* ══ Ligne 3 — Pourquoi on perd : tendance + causes sur la même ligne ══ */}
      <SectionLabel badge="Monday CRM">Pourquoi on gagne, pourquoi on perd</SectionLabel>
      <div className={styles.threeCol}>
        <Card title="Deals gagnés / perdus / stand-by — par mois">
          <NotConnected>évolution mensuelle des issues de deals non calculée côté API (un seul snapshot par appel actuellement)</NotConnected>
        </Card>
        <Card title="Motifs des deals perdus">
          <NotConnected>colonne « Motif refus » du board Leads non encore agrégée</NotConnected>
        </Card>
        <Card title="Motifs des deals stand-by">
          <NotConnected>motifs de stand-by non catégorisés côté Monday</NotConnected>
        </Card>
      </div>

      {/* ══ Ligne 4 — L'action immédiate : la to-do de la réunion d'équipe ══ */}
      <SectionLabel>À traiter cette semaine</SectionLabel>
      <Card title="Opportunités sans prochaine action">
        <NotConnected>nécessite une colonne « prochaine relance » suivie côté Monday pour détecter les affaires sans action planifiée</NotConnected>
      </Card>

      {/* ══ Ligne 5 — Segments : lecture stratégique ══ */}
      <SectionLabel>Performance par segment</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="CA par secteur d'activité">
          <NotConnected>aucune colonne secteur/activité sur le board Comptes Monday</NotConnected>
        </Card>
        <Card title="Performance par source de lead">
          <NotConnected>la colonne « Canaux d'acquisition » du board Leads n'est pas encore agrégée côté API</NotConnected>
        </Card>
      </div>

      {/* ══ Ligne 6 — Missions MA : part du tout en donut + chiffres exacts à côté ══ */}
      <SectionLabel>Revenue par type de mission MA</SectionLabel>
      <Card title="Répartition du revenue par type de mission">
        <NotConnected>répartition par type de mission (« Pôles » du compte d'exploitation) non encore branchée côté API</NotConnected>
      </Card>

    </div>
  );
}
