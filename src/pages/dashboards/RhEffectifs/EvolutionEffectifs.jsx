import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import Card from '../../../components/ui/Card';
import { useRhEvolution } from '../../../hooks/useRhData';
import { fmtNumber } from '../../../utils/formatNumber';
import styles from './Rh.module.css';

/* Chart.js s'enregistre par fichier dans ce projet — voir Synthese.jsx,
   ActiviteSales.jsx — et seulement pour ce qu'on utilise vraiment. */
Chart.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

/* Styles d'axes repris à l'identique des graphiques du dashboard commercial,
   où ils sont redéclarés par fichier. On suit la convention du dépôt plutôt
   que d'introduire un module partagé pour trois constantes. */
const tickStyle = { color: 'rgba(167,173,170,0.5)', font: { size: 10, family: 'DM Sans' } };
const gridStyle = { color: 'rgba(227,225,216,0.5)' };
const borderCol = { color: 'rgba(227,225,216,0.08)' };
const barAnim = {
  duration: 900,
  easing: 'easeOutQuart',
  delay: ctx => (ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 55 : 0),
};

/* DES LITTÉRAUX, PAS DES JETONS CSS : le canvas de Chart.js ne résout pas les
   variables CSS, il garde silencieusement la couleur précédente. Règle déjà
   écrite en tête de la palette ASUS de ce dépôt.

   Les entrées sont vertes et les sorties terracotta, les deux couleurs que le
   projet emploie déjà pour « ça avance » et « ça se perd ». La courbe est en
   myrtille, comme sur la maquette. */
const C_ENTREES  = 'rgba(126,184,154,0.72)';
const C_SORTIES  = 'rgba(196,135,106,0.72)';
const C_EFFECTIF = 'rgba(38,0,31,0.88)';

/* '2026-04' → 'avr.' — fabriqué en UTC, parce qu'un `new Date('2026-04')` est
   interprété en UTC puis réaffiché en heure locale, ce qui recule d'un mois à
   l'ouest de Greenwich et afficherait « mars » pour avril. */
function libelleMois(ym) {
  const [a, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 1))
    .toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' });
}
function libelleMoisLong(ym) {
  const [a, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 1))
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/* LA COURBE ET LES BARRES NE SE LISENT PAS SUR LE MÊME AXE, et il ne faut pas
   les y forcer. L'effectif tourne autour de 90, les mouvements autour de 10 :
   sur un axe commun, les barres seraient écrasées au ras de l'abscisse et ne
   diraient plus rien. D'où l'axe de droite, borné à zéro.

   CE QUE LE GRAPHIQUE MONTRE VRAIMENT : le point d'un mois est l'effectif à sa
   FIN, les barres sont les mouvements DU mois. L'écart entre deux points
   s'explique donc par les deux barres du second — c'est précisément ce qu'on
   veut pouvoir lire d'un coup d'œil, et ce qu'un solde seul cache. */
export default function EvolutionEffectifs({ mois = 6 }) {
  const { points, loading, error } = useRhEvolution(mois);

  const titre = `Effectif total et mouvements sur les ${mois} derniers mois`;

  if (error) {
    return (
      <Card title={titre}>
        <div className={styles.etat}>
          <div className={styles.etatTexte}>{error}</div>
        </div>
      </Card>
    );
  }
  if (loading || !points) {
    return (
      <Card title={titre}>
        <div className={styles.chartWrap} style={{ height: 232 }} />
      </Card>
    );
  }

  return <GrapheEvolution points={points} titre={titre} />;
}

/* LA PARTIE QUI DESSINE, SÉPARÉE DE CELLE QUI CHARGE.
 *
 * Ce n'est pas une coquetterie : la page RH est derrière une session, et le
 * graphique ne peut donc pas être regardé sans se connecter. Avec ce découpage,
 * on monte le VRAI composant avec des points donnés à la main et on vérifie le
 * rendu réel — pas une copie du code, qui ne prouverait rien sur l'original. */
export function GrapheEvolution({ points, titre }) {
  const labels = points.map(p => libelleMois(p.mois));

  /* PLAFOND DE L'AXE DES MOUVEMENTS, et ce n'est pas un réglage cosmétique.
     Laissé en automatique, Chart.js cale cet axe sur le plus grand flux : une
     barre de 15 occupe alors TOUTE la hauteur du cadre et passe par-dessus la
     courbe qu'elle est censée expliquer. On lui donne deux fois et demie de
     marge, les barres tiennent dans le tiers bas, la courbe reste lisible
     au-dessus. Le minimum de 10 évite qu'un mois sans mouvement n'écrase
     l'échelle à zéro. */
  const maxFlux = Math.max(10, ...points.map(p => Math.max(p.demarrages, p.fins)));
  const plafondFlux = Math.ceil((maxFlux * 2.5) / 5) * 5;

  return (
    <Card title={titre}>
      <div className={styles.chartWrap} style={{ height: 232 }}>
        <Bar
          data={{
            labels,
            datasets: [
              {
                type: 'bar',
                label: 'Entrées',
                data: points.map(p => p.demarrages),
                backgroundColor: C_ENTREES,
                borderRadius: 4,
                borderSkipped: false,
                yAxisID: 'y2',
                order: 2,
              },
              {
                type: 'bar',
                label: 'Sorties',
                data: points.map(p => p.fins),
                backgroundColor: C_SORTIES,
                borderRadius: 4,
                borderSkipped: false,
                yAxisID: 'y2',
                order: 2,
              },
              {
                type: 'line',
                label: 'Effectif total',
                data: points.map(p => p.effectif),
                borderColor: C_EFFECTIF,
                pointBackgroundColor: C_EFFECTIF,
                pointRadius: 3.5,
                borderWidth: 2,
                tension: 0.35,
                fill: false,
                yAxisID: 'y',
                order: 0,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: barAnim,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  /* L'en-tête dit le mois EN TOUTES LETTRES avec son année :
                     l'axe est abrégé en « avr. », et sur une fenêtre qui
                     enjambe un 31 décembre, deux « janv. » se ressembleraient
                     trop. */
                  title: items => libelleMoisLong(points[items[0].dataIndex].mois),
                  label: ctx => {
                    const p = points[ctx.dataIndex];
                    if (ctx.dataset.label === 'Effectif total') {
                      return `Effectif au ${p.fin.split('-').reverse().join('/')} : ${fmtNumber(ctx.parsed.y)}`;
                    }
                    const n = ctx.parsed.y;
                    return `${ctx.dataset.label} : ${fmtNumber(n)} collaborateur${n > 1 ? 's' : ''}`;
                  },
                },
              },
            },
            scales: {
              x: { ticks: { ...tickStyle, maxRotation: 0 }, grid: gridStyle, border: borderCol },
              y: {
                position: 'left',
                beginAtZero: true,
                ticks: tickStyle,
                grid: gridStyle,
                border: borderCol,
                title: { display: true, text: 'Effectif', color: 'rgba(38,0,31,0.45)', font: { size: 9 } },
              },
              y2: {
                position: 'right',
                beginAtZero: true,
                max: plafondFlux,
                /* Pas de demi-personne sur un axe de mouvements. */
                ticks: { ...tickStyle, precision: 0 },
                grid: { display: false },
                border: borderCol,
                title: { display: true, text: 'Mouvements', color: 'rgba(167,173,170,0.7)', font: { size: 9 } },
              },
            },
          }}
        />
      </div>
      <div className={styles.legende}>
        <span className={styles.legDot} style={{ background: C_EFFECTIF }} />Effectif total
        <span className={styles.legDot} style={{ background: C_ENTREES, marginLeft: 14 }} />Entrées
        <span className={styles.legDot} style={{ background: C_SORTIES, marginLeft: 14 }} />Sorties
      </div>
    </Card>
  );
}
