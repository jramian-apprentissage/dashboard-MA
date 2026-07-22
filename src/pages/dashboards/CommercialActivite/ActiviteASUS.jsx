import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import NotConnected from '../../../components/ui/NotConnected';
import Loader from '../../../components/ui/Loader';
import styles from './Activite.module.css';

function fmtDuree(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Une carte par tag, dans l'ordre transmis par Jimmy — la première (total)
// reçoit la variante accent, c'est l'indicateur "plus important".
function buildTagCards(directionStats, totalLabel) {
  const cards = [
    { label: totalLabel, value: directionStats.total, unit: '', color: 'accent' },
    ...directionStats.parTag.map(t => ({ label: t.label, value: t.count, unit: '', color: 'default' })),
  ];
  return cards;
}

export default function ActiviteASUS({ selectedCollab = 'Tous', asusData }) {
  const hasData = asusData?.hasData && asusData?.result;
  const r = asusData?.result;

  // Même principe que Activité Sales : le tout premier chargement affiche le
  // logo animé plutôt qu'une mosaïque de "Non connecté", pour ne pas donner
  // l'impression que c'est cassé le temps que l'archive arrive.
  const firstLoad = !hasData && asusData?.loading && !asusData?.error;

  return (
    <Loader loading={firstLoad} label="Récupération de l'archive Ringover…" minHeight={380}>
      {() => (
    <div className={styles.page}>
      <SectionLabel badge="RINGOVER — CLIENT ASUS">Activité commerciale ASUS</SectionLabel>

      {asusData?.error && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(196,135,106,0.4)', background: 'rgba(196,135,106,0.08)' }}>
          <span style={{ color: 'var(--neg)' }}>⚠ Erreur :</span> {asusData.error}
        </div>
      )}
      {hasData && asusData.lastFetched && (
        <div className={styles.dataAlert} style={{ borderColor: 'rgba(142,207,170,0.3)', background: 'rgba(142,207,170,0.06)' }}>
          <span style={{ color: 'var(--pos)' }}>● Données Ringover — ASUS</span> — {r.totalAppels.toLocaleString('fr-FR')} appels chargés · MAJ {asusData.lastFetched.toLocaleTimeString('fr-FR')}
          {selectedCollab !== 'Tous' && <span style={{ color: 'var(--text3)' }}> · filtre : {selectedCollab}</span>}
        </div>
      )}

      <SectionLabel>Appels sortants</SectionLabel>
      <Card>
        {hasData ? (
          <div className={styles.kpiGridAuto}>
            {buildTagCards(r.sortant, 'Appels sortants').map(k => <KPICard key={k.label} {...k} />)}
          </div>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Appels entrants</SectionLabel>
      <Card>
        {hasData ? (
          <div className={styles.kpiGridAuto}>
            {buildTagCards(r.entrant, 'Appels entrants').map(k => <KPICard key={k.label} {...k} />)}
          </div>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>

      <SectionLabel>Qualité des appels — TMC</SectionLabel>
      <Card>
        {hasData ? (
          <div className={styles.kpiGridAuto}>
            <KPICard label="Durée moyenne (TMC)" value={fmtDuree(r.dureeMoyenneS)} unit="min" color="default" />
            <KPICard label="Bons appels (≥ 5 min)" value={r.bonsAppels} unit="" trend={{ dir: 'neutral', text: `${r.tauxBons}% du total` }} color="default" />
          </div>
        ) : (
          <NotConnected>en attente de l'archive Ringover</NotConnected>
        )}
      </Card>
    </div>
      )}
    </Loader>
  );
}
