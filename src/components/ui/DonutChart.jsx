import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip } from 'chart.js';
import { useInView } from '../../hooks/useInView';
import styles from './DonutChart.module.css';

Chart.register(ArcElement, Tooltip);

/* ══════════════════════════════════════════════════════════════════
   4 modèles de camemberts premium :
   - 'half-rose' : demi-camembert éventail, rayon proportionnel à la valeur,
                   % dans les grosses tranches, rappels filaires pour les petites
   - 'rose'      : camembert complet à rayons variables (polar/rose)
   - 'donut'     : donut, segment dominant détaché + anneau de contour,
                   % dans les tranches
   - 'pie'       : camembert plein, tranche dominante sortie + arc décoratif
   ══════════════════════════════════════════════════════════════════ */

/* Luminance effective d'une couleur rgba sur fond blanc → texte sombre ou clair */
function textColorFor(color) {
  const m = String(color).match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/);
  if (!m) return '#FFFFFF';
  const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
  const r = parseInt(m[1]) * a + 255 * (1 - a);
  const g = parseInt(m[2]) * a + 255 * (1 - a);
  const b = parseInt(m[3]) * a + 255 * (1 - a);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#26001F' : '#FFFFFF';
}

function opaque(color) {
  const m = String(color).match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return m ? `rgb(${m[1]},${m[2]},${m[3]})` : color;
}

/* Facteurs de rayon pour les variantes rose : proportionnel à la valeur,
   borné pour que les petites tranches restent visibles */
function roseFactors(data) {
  const max = Math.max(...data, 1);
  return data.map(v => 0.45 + 0.55 * (v / max));
}

/* Plugin rayons variables (rose) — rayon absolu par tranche, hors animation d'échelle */
const rosePlugin = {
  id: 'roseRadius',
  beforeDatasetsDraw(chart, _args, opts) {
    if (!opts.factors) return;
    const meta = chart.getDatasetMeta(0);
    const base = meta.controller.outerRadius;
    meta.data.forEach((arc, i) => {
      if (opts.factors[i] !== undefined) arc.outerRadius = base * opts.factors[i];
    });
  },
};

/* Plugin % dans les tranches + rappels filaires (leader lines) pour les petites */
const labelsPlugin = {
  id: 'fancyLabels',
  afterDatasetsDraw(chart, _args, opts) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const ds = chart.data.datasets[0];
    if (!ds || !meta?.data?.length) return;
    const total = ds.data.reduce((s, v) => s + (v || 0), 0);
    if (!total) return;

    meta.data.forEach((arc, i) => {
      const pct = Math.round((ds.data[i] / total) * 100);
      const mid = (arc.startAngle + arc.endAngle) / 2;

      if (pct >= (opts.insideMin ?? 8)) {
        /* % au cœur de la tranche */
        const pos = arc.tooltipPosition(true);
        ctx.save();
        ctx.font = `700 ${opts.insideSize ?? 12}px "DM Sans", "OverusedGrotesk", sans-serif`;
        ctx.fillStyle = textColorFor(ds.backgroundColor[i]);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pct + '%', pos.x, pos.y);
        ctx.restore();
      } else if (opts.callouts && pct >= 1) {
        /* Rappel filaire : trait depuis la tranche vers le libellé extérieur */
        const r1 = arc.outerRadius + 3;
        const r2 = arc.outerRadius + 12;
        const x1 = arc.x + Math.cos(mid) * r1;
        const y1 = arc.y + Math.sin(mid) * r1;
        const x2 = arc.x + Math.cos(mid) * r2;
        const y2 = arc.y + Math.sin(mid) * r2;
        const goRight = Math.cos(mid) >= 0;
        const x3 = x2 + (goRight ? 10 : -10);

        ctx.save();
        ctx.strokeStyle = opaque(ds.backgroundColor[i]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y2);
        ctx.stroke();

        ctx.font = '600 9px "DM Sans", "OverusedGrotesk", sans-serif';
        ctx.fillStyle = '#2C1A27';
        ctx.textAlign = goRight ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        const label = `${pct}% · ${chart.data.labels[i]}`;
        ctx.fillText(label, x3 + (goRight ? 3 : -3), y2);
        ctx.restore();
      }
    });
  },
};

export default function DonutChart({
  variant = 'donut',
  data,
  labels,
  colors,
  height = 190,
  centerValue,
  centerLabel,
  tooltip,
}) {
  const [ref, inView] = useInView(0.3);

  const isRose = variant === 'rose' || variant === 'half-rose';
  const isHalf = variant === 'half-rose';
  const pulled = variant === 'donut' || variant === 'pie';

  /* Modèles à tranche détachée : tri décroissant, la plus grande part démarre
     à gauche (9h) et tourne dans le sens horaire */
  let D = data, L = labels, C = colors;
  if (pulled) {
    const order = data.map((_, i) => i).sort((a, b) => data[b] - data[a]);
    D = order.map(i => data[i]);
    L = order.map(i => labels[i]);
    C = order.map(i => colors[i]);
  }

  const maxIdx = D.indexOf(Math.max(...D));
  const total = D.reduce((s, v) => s + (v || 0), 0);

  const cutout = variant === 'donut' ? '58%' : variant === 'pie' ? 0 : isHalf ? '20%' : '8%';
  const offsets = pulled ? D.map((_, i) => (i === maxIdx ? 18 : 0)) : undefined;
  const factors = isRose ? roseFactors(D) : null;

  return (
    <div ref={ref} className={styles.wrap} style={{ height }}>
      {inView && (
        <>
          <Doughnut
            plugins={[rosePlugin, labelsPlugin]}
            data={{
              labels: L,
              datasets: [{
                data: D,
                backgroundColor: C,
                borderWidth: isRose ? 2 : 0,
                borderColor: '#FFFFFF',
                borderRadius: pulled ? 6 : 3,
                spacing: variant === 'donut' ? 2 : 0,
                ...(offsets ? { offset: offsets } : {}),
                hoverOffset: 8,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout,
              ...(isHalf ? { rotation: -90, circumference: 180 } : {}),
              layout: { padding: { top: 16, bottom: isHalf ? 2 : 16, left: 32, right: 32 } },
              animation: {
                animateRotate: true,
                animateScale: !isRose,
                duration: 1100,
                easing: 'easeOutQuart',
              },
              plugins: {
                legend: { display: false },
                roseRadius: { factors },
                fancyLabels: {
                  insideMin: isRose ? 9 : 8,
                  insideSize: isHalf ? 13 : 12,
                  callouts: true,
                },
                tooltip: {
                  callbacks: {
                    label: ctx => tooltip
                      ? tooltip(ctx.label, ctx.parsed, total ? Math.round(ctx.parsed / total * 100) : 0)
                      : `${ctx.label} : ${ctx.parsed}`,
                  },
                },
              },
            }}
          />
          {centerValue !== undefined && variant === 'donut' && (
            <div className={styles.center}>
              <span className={styles.centerValue}>{centerValue}</span>
              {centerLabel && <span className={styles.centerLabel}>{centerLabel}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
