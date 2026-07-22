import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import MotifBar from '../../../components/ui/MotifBar';
import DonutChart from '../../../components/ui/DonutChart';
import styles from './Activite.module.css';

Chart.register(LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Tooltip, Filler);

const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(227,225,216,0.5)' };
const borderCol = { color: 'rgba(227,225,216,0.08)' };
const lineAnim = { duration: 900, easing: 'easeOutQuart' };

/* Données fictives, en local uniquement — le temps de valider avec Jimmy les
   17 indicateurs TLM d'origine avant de brancher la vraie source CloudTalk
   (remplace KAVKOM, en stand-by). Relations internes cohérentes (contact
   joint <= émis, exploitables <= contact joint, etc.) pour que les KPIs
   dérivés (taux, funnel) restent lisibles même fictifs. */
const MOCK_COLLABS = [
  { nom: 'Agent TLM 1', tempsPresence: '162h', appels: 950, contactJoint: 430, exploitables: 280, nonExploitables: 150, fichesCompletees: 130, rdvPris: 32 },
  { nom: 'Agent TLM 2', tempsPresence: '148h', appels: 820, contactJoint: 365, exploitables: 230, nonExploitables: 135, fichesCompletees: 105, rdvPris: 24 },
  { nom: 'Agent TLM 3', tempsPresence: '155h', appels: 760, contactJoint: 340, exploitables: 210, nonExploitables: 130, fichesCompletees: 95,  rdvPris: 22 },
  { nom: 'Agent TLM 4', tempsPresence: '147h', appels: 670, contactJoint: 315, exploitables: 170, nonExploitables: 145, fichesCompletees: 80,  rdvPris: 18 },
];

const totalAppels        = MOCK_COLLABS.reduce((s, c) => s + c.appels, 0);
const totalContactJoint  = MOCK_COLLABS.reduce((s, c) => s + c.contactJoint, 0);
const totalExploitables  = MOCK_COLLABS.reduce((s, c) => s + c.exploitables, 0);
const totalNonExploit    = MOCK_COLLABS.reduce((s, c) => s + c.nonExploitables, 0);
const totalFiches        = MOCK_COLLABS.reduce((s, c) => s + c.fichesCompletees, 0);
const totalRdv           = MOCK_COLLABS.reduce((s, c) => s + c.rdvPris, 0);

const tauxDecroche30s     = 38; // % — mesuré séparément du contact joint (durée > 30s)
const tauxRdvHonores      = 71;
const tauxFichesExploit   = Math.round((totalExploitables / totalAppels) * 100);
const tauxTransfoNette    = Math.round((totalRdv / totalAppels) * 1000) / 10;
const injoignables        = totalAppels - totalContactJoint;

const MOCK_STATUTS = [
  { label: 'RDV pris',               count: totalRdv,                                                          color: 'rgba(142,207,170,0.8)' },
  { label: 'Fiche complétée',        count: totalFiches - totalRdv,                                             color: 'rgba(123,170,191,0.6)' },
  { label: 'Exploitable sans suite', count: totalExploitables - totalFiches,                                    color: 'rgba(255,249,147,0.7)' },
  { label: 'Non exploitable',        count: totalNonExploit,                                                    color: 'rgba(196,135,106,0.55)' },
  { label: 'Injoignable / NRP',      count: injoignables,                                                       color: 'rgba(167,173,170,0.5)' },
];

const MOCK_MOTIFS = [
  { label: 'Pas de besoin identifié',       pct: 34, count: 190 },
  { label: 'Budget insuffisant',            pct: 22, count: 123 },
  { label: 'Déjà équipé / sous contrat',    pct: 18, count: 101 },
  { label: 'Mauvais interlocuteur',         pct: 15, count: 84  },
  { label: 'Autre prestataire retenu',      pct: 11, count: 62  },
];

const MOCK_EVOLUTION_FICHES = { 'Fév': 52, 'Mars': 61, 'Avr': 70, 'Mai': 75, 'Juin': 68, 'Juil': 74 };

const MOCK_LEADS_A_RECYCLER = 240;
const MOCK_LEADS_RESTANTS   = 780;

function trend(text) {
  return { dir: 'neutral', text };
}

export default function ActiviteTLM() {
  const kpis = [
    { label: 'Appels émis',                value: totalAppels,                      unit: '', trend: trend('Volume global TLM'),                    color: 'accent' },
    { label: 'Appels exploitables',        value: totalExploitables,                unit: '', trend: trend(`${tauxFichesExploit}% des appels émis`) },
    { label: 'Nombre de contacts joints',  value: totalContactJoint,                unit: '', trend: trend(`${Math.round(totalContactJoint / totalAppels * 100)}% des appels émis`) },
    { label: 'Appels non exploitables',    value: totalNonExploit,                  unit: '', trend: trend('Contact joint sans info business') },
    { label: 'Taux décroché > 30s',        value: `${tauxDecroche30s}%`,            unit: '', trend: trend('Capacité à joindre réellement') },
    { label: 'Taux fiches exploitables',   value: `${tauxFichesExploit}%`,          unit: '', trend: trend('Qualité des infos collectées') },
    { label: 'RDV pris',                   value: totalRdv,                         unit: '', trend: trend('Transformation TLM → RDV'),              color: 'green' },
    { label: 'Taux RDV honorés',           value: `${tauxRdvHonores}%`,             unit: '', trend: trend('Qualité des RDV générés') },
    { label: 'Taux de transformation nette', value: `${tauxTransfoNette}%`,         unit: '', trend: trend('RDV pris / appels émis') },
    { label: 'Fiches complétées',          value: totalFiches,                      unit: '', trend: trend('Besoin ou intérêt identifié') },
  ];

  const funnelSteps = [
    { label: 'Appels émis',      value: totalAppels },
    { label: 'Contact joint',    value: totalContactJoint },
    { label: 'Exploitable',      value: totalExploitables },
    { label: 'RDV pris',         value: totalRdv },
  ];

  return (
    <div className={styles.page}>
      <SectionLabel badge="CLOUDTALK">Activité TLM — indicateurs clés</SectionLabel>

      <div className={styles.dataAlert} style={{ borderColor: 'rgba(212,168,75,0.4)', background: 'rgba(212,168,75,0.08)' }}>
        <span style={{ color: 'var(--warn)' }}>⚠ Données fictives</span> — mock local sur les 17 indicateurs TLM d'origine, en attente de la source CloudTalk réelle
      </div>

      <div className={styles.kpiGridAuto}>
        {kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      <SectionLabel>Performance & présence / collaborateur</SectionLabel>
      <Card title="Comparatif individuel — principaux leviers TLM">
        <table className={styles.perfTable}>
          <thead><tr>
            <th>Collaborateur</th>
            <th>Temps de présence</th>
            <th>Appels émis</th>
            <th>Contact joint</th>
            <th>Exploitables</th>
            <th>Fiches complétées</th>
            <th>Taux complétion</th>
            <th>RDV pris</th>
          </tr></thead>
          <tbody>
            {MOCK_COLLABS.map(c => {
              const tauxCompletion = Math.round((c.fichesCompletees / c.exploitables) * 100);
              return (
                <tr key={c.nom}>
                  <td className={styles.tdName}>{c.nom}</td>
                  <td className={styles.tdNum}>{c.tempsPresence}</td>
                  <td className={styles.tdNum}>{c.appels}</td>
                  <td className={styles.tdNum}>{c.contactJoint}</td>
                  <td className={styles.tdNum}>{c.exploitables}</td>
                  <td className={styles.tdNum}>{c.fichesCompletees}</td>
                  <td className={styles.tdNum}><span className={styles.tauxPill}>{tauxCompletion}%</span></td>
                  <td className={styles.tdNum}>{c.rdvPris}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className={styles.twoCol}>
        <Card title="Statut par appels — répartition">
          <DonutChart
            variant="donut"
            data={MOCK_STATUTS.map(s => s.count)}
            labels={MOCK_STATUTS.map(s => s.label)}
            colors={MOCK_STATUTS.map(s => s.color)}
            height={200}
            centerValue={totalAppels}
            centerLabel="appels"
            tooltip={(label, value, pct) => `${label} : ${value} appels (${pct}%)`}
          />
          <div className={styles.legend} style={{ justifyContent: 'center' }}>
            {MOCK_STATUTS.map(s => (
              <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className={styles.legDot} style={{ background: s.color }} />{s.label} {Math.round(s.count / totalAppels * 100)}%
              </span>
            ))}
          </div>
        </Card>

        <Card title="Motifs de refus en appel">
          <div className={styles.subNote} style={{ marginBottom: 12 }}>Principaux freins rencontrés par les équipes TLM</div>
          {MOCK_MOTIFS.map(m => <MotifBar key={m.label} {...m} fillColor="var(--neg)" />)}
          <div className={styles.subNote} style={{ marginTop: 8 }}>Sur les appels non exploitables</div>
        </Card>
      </div>

      <SectionLabel>Taux de transformation nette — funnel</SectionLabel>
      <Card>
        <div className={styles.funnelWrap}>
          {funnelSteps.map((s, i) => {
            const pctOfMax = Math.round((s.value / funnelSteps[0].value) * 100);
            const pctPrev  = i === 0 ? 100 : Math.round((s.value / funnelSteps[i - 1].value) * 100);
            return (
              <div key={s.label} className={styles.funnelRow}>
                <div className={styles.funnelLabel}>{s.label}</div>
                <div className={styles.funnelTrack}>
                  <div className={styles.funnelFill} style={{ width: `${pctOfMax}%` }} />
                </div>
                <div className={styles.funnelValue}>{s.value}{i > 0 && <span className={styles.funnelPct}> · {pctPrev}%</span>}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <SectionLabel>Fiches complétées — évolution mensuelle</SectionLabel>
      <Card title="Fiches complétées">
        <div className={styles.chartWrap} style={{ height: 200 }}>
          <Line
            data={{
              labels: Object.keys(MOCK_EVOLUTION_FICHES),
              datasets: [{
                label: 'Fiches complétées',
                data: Object.values(MOCK_EVOLUTION_FICHES),
                borderColor: '#7EB89A', backgroundColor: 'rgba(126,184,154,0.04)', pointBackgroundColor: '#7EB89A',
                tension: 0.35, fill: true, pointRadius: 4, borderWidth: 2, yAxisID: 'y',
              }],
            }}
            options={{
              responsive: true, maintainAspectRatio: false,
              animation: lineAnim,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: tickStyle, grid: gridStyle, border: borderCol },
                y: { ticks: tickStyle, grid: gridStyle, border: borderCol, position: 'left' },
              },
            }}
          />
        </div>
      </Card>

      <SectionLabel>Suivi des leads</SectionLabel>
      <div className={styles.twoCol}>
        <Card title="Lead à recycler">
          <KPICard label="Leads à recycler" value={MOCK_LEADS_A_RECYCLER} unit="" trend={trend('À relancer après J+30')} color="amber" />
        </Card>
        <Card title="Lead restant à contacter">
          <KPICard label="Leads restants à contacter" value={MOCK_LEADS_RESTANTS} unit="" trend={trend('Stock non encore traité')} color="amber" />
        </Card>
      </div>
    </div>
  );
}
