import { Line, Bar } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import Card from '../../../components/ui/Card';
import { useRhEvolution } from '../../../hooks/useRhData';
import { fmtNumber } from '../../../utils/formatNumber';
import styles from './Rh.module.css';

/* Chart.js s'enregistre par fichier dans ce projet — voir Synthese.jsx,
   ActiviteSales.jsx — et seulement pour ce qu'on utilise vraiment. */
Chart.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

/* DEUX GRAPHIQUES, DEUX PAGES, et c'est une séparation demandée par Jimmy le
   16/10 après les avoir vus réunis.
 *
 * Ils tenaient d'abord sur un seul cadre, courbe d'effectif et barres de
 * mouvements superposées. C'était défendable — l'écart entre deux points
 * s'explique par les barres du second — mais cela forçait deux échelles sur un
 * même dessin, l'effectif tournant autour de 90 et les mouvements autour de
 * 10, et noyait le graphique des mouvements dans une page qui parle d'effectif.
 *
 * Désormais : la COURBE reste sur « Effectifs de l'agence », les BARRES vivent
 * sur « Évolution et mouvements », chacune sur son axe et dans sa page. Les
 * deux lisent la même route, /api/rh/evolution, donc les chiffres ne peuvent
 * pas diverger.
 */

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

/* L'enveloppe commune aux deux graphiques : même chargement, même gestion des
   trois états, même source. Seul le dessin change. */
function CarteEvolution({ mois, titre, rendu }) {
  const { points, loading, error } = useRhEvolution(mois);

  if (error) {
    return (
      <Card title={titre}>
        <div className={styles.etat}><div className={styles.etatTexte}>{error}</div></div>
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
  return rendu(points, titre);
}

/* ─────────── PAGE 1 : la courbe d'effectif, seule ─────────── */

export default function EvolutionEffectifs({ mois = 6 }) {
  return (
    <CarteEvolution
      mois={mois}
      titre={`Effectif total sur les ${mois} derniers mois`}
      rendu={(points, titre) => <GrapheEffectif points={points} titre={titre} />}
    />
  );
}

/* LA PARTIE QUI DESSINE, SÉPARÉE DE CELLE QUI CHARGE.
 *
 * Ce n'est pas une coquetterie : la page RH est derrière une session, et le
 * graphique ne peut donc pas être regardé sans se connecter. Avec ce
 * découpage, on monte le VRAI composant avec des points donnés à la main et on
 * vérifie le rendu réel — pas une copie du code, qui ne prouverait rien sur
 * l'original. */
export function GrapheEffectif({ points, titre }) {
  return (
    <Card title={titre}>
      <div className={styles.chartWrap} style={{ height: 232 }}>
        <Line
          data={{
            labels: points.map(p => libelleMois(p.mois)),
            datasets: [{
              label: 'Effectif total',
              data: points.map(p => p.effectif),
              borderColor: C_EFFECTIF,
              pointBackgroundColor: C_EFFECTIF,
              pointRadius: 3.5,
              borderWidth: 2,
              tension: 0.35,
              fill: false,
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
                  /* L'en-tête dit le mois EN TOUTES LETTRES avec son année :
                     l'axe est abrégé en « avr. », et sur une fenêtre qui
                     enjambe un 31 décembre, deux « janv. » se ressembleraient
                     trop. */
                  title: items => libelleMoisLong(points[items[0].dataIndex].mois),
                  label: ctx => {
                    const p = points[ctx.dataIndex];
                    return `Effectif au ${p.fin.split('-').reverse().join('/')} : ${fmtNumber(ctx.parsed.y)}`;
                  },
                },
              },
            },
            scales: {
              x: { ticks: { ...tickStyle, maxRotation: 0 }, grid: gridStyle, border: borderCol },
              y: {
                beginAtZero: true,
                ticks: tickStyle,
                grid: gridStyle,
                border: borderCol,
                title: { display: true, text: 'Effectif', color: 'rgba(38,0,31,0.45)', font: { size: 9 } },
              },
            },
          }}
        />
      </div>
    </Card>
  );
}

/* ─────────── PAGE 2 : les barres de mouvements ─────────── */

export function EvolutionMouvements({ mois = 6 }) {
  return (
    <CarteEvolution
      mois={mois}
      titre="Évolution mensuelle des entrées et sorties"
      rendu={(points, titre) => <GrapheMouvements points={points} titre={titre} />}
    />
  );
}

export function GrapheMouvements({ points, titre }) {
  return (
    <Card title={titre}>
      <div className={styles.chartWrap} style={{ height: 232 }}>
        <Bar
          data={{
            labels: points.map(p => libelleMois(p.mois)),
            datasets: [
              {
                label: 'Entrées',
                data: points.map(p => p.demarrages),
                backgroundColor: C_ENTREES,
                borderRadius: 4,
                borderSkipped: false,
              },
              {
                label: 'Sorties',
                data: points.map(p => p.fins),
                backgroundColor: C_SORTIES,
                borderRadius: 4,
                borderSkipped: false,
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
                  title: items => libelleMoisLong(points[items[0].dataIndex].mois),
                  label: ctx => {
                    const n = ctx.parsed.y;
                    return `${ctx.dataset.label} : ${fmtNumber(n)} mission${n > 1 ? 's' : ''}`;
                  },
                  /* LE SOLDE EN PIED D'INFOBULLE, et pas en carte séparée.
                     C'est la différence des deux barres survolées : la donner
                     là où les deux chiffres sont déjà sous les yeux évite d'en
                     faire un indicateur de plus, que personne n'a demandé. */
                  footer: items => {
                    const p = points[items[0].dataIndex];
                    const s = p.demarrages - p.fins;
                    return `Solde : ${s > 0 ? '+' : ''}${fmtNumber(s)}`;
                  },
                },
              },
            },
            scales: {
              x: { ticks: { ...tickStyle, maxRotation: 0 }, grid: gridStyle, border: borderCol },
              y: {
                beginAtZero: true,
                /* Pas de demi-personne sur un axe de mouvements. */
                ticks: { ...tickStyle, precision: 0 },
                grid: gridStyle,
                border: borderCol,
                title: { display: true, text: 'Missions', color: 'rgba(38,0,31,0.45)', font: { size: 9 } },
              },
            },
          }}
        />
      </div>
      <div className={styles.legende}>
        <span className={styles.legDot} style={{ background: C_ENTREES }} />Entrées
        <span className={styles.legDot} style={{ background: C_SORTIES, marginLeft: 14 }} />Sorties
      </div>
    </Card>
  );
}
