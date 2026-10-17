import { Line, Bar } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import Card from '../../../components/ui/Card';
import { useRhEvolution } from '../../../hooks/useRhData';
import { useLargeurElement } from '../../../hooks/useLargeurElement';
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

/* DOUZE MOIS SUR GRAND ÉCRAN, SIX SUR TÉLÉPHONE, et ce n'est pas un compromis
 * mou : les deux tailles servent une lecture différente.
 *
 * POURQUOI DOUZE PAR DÉFAUT. Six mois cachent l'histoire : on y lit une montée
 * régulière de 84 à 96, là où douze montrent l'automne plat autour de 70, le
 * pic de mars, le creux de juin et la reprise. Douze permettent surtout de
 * comparer octobre à octobre, 96 contre 72, un tiers de croissance en un an.
 * Et la vue « Turnover et fidélisation » travaille sur des taux annuels par
 * définition : garder six ici ferait un dashboard qui se contredit.
 * L'identité a été vérifiée sur vingt-quatre mois consécutifs sans une seule
 * rupture, et la qualité des données ne se dégrade pas avec l'ancienneté.
 *
 * POURQUOI SIX SUR TÉLÉPHONE. Le graphique des mouvements porte deux barres
 * par mois : vingt-quatre barres sur une largeur de téléphone deviennent des
 * traits. La courbe d'effectif, elle, tiendrait, mais les deux cartes doivent
 * raconter la même période sous peine de se contredire d'un coup d'œil.
 *
 * UN SEUL APPEL, QUELLE QUE SOIT LA LARGEUR. On demande toujours douze mois et
 * on n'affiche que les six derniers quand l'écran est étroit. Faire dépendre
 * la requête de la largeur relancerait un appel à chaque rotation de
 * téléphone, pour des données déjà en main. */
const MOIS_LARGE = 12;
const MOIS_ETROIT = 6;

/* LE SEUIL SE LIT SUR LA CARTE, PAS SUR LA FENÊTRE. Douze mois font
 * vingt-quatre barres sur le graphique des mouvements ; en dessous de 720 px
 * de carte, elles deviennent des traits. Ce cas n'est pas réservé au
 * téléphone : une carte posée à côté sur desktop ramène celle-ci à une demi
 * rangée, soit environ 690 px, sans que la fenêtre ait bougé d'un pixel.
 * Mesuré avec useLargeurElement, le seuil tient dans les deux situations. */
const SEUIL_DOUZE_MOIS = 720;

/* L'enveloppe commune aux deux graphiques : même chargement, même gestion des
   trois états, même source. Seul le dessin change. */
function CarteEvolution({ titre, rendu }) {
  const { points, loading, error } = useRhEvolution(MOIS_LARGE);
  const [ref, largeur] = useLargeurElement();

  /* Tant que la largeur n'est pas mesurée (premier rendu, avant que
     ResizeObserver ne se prononce), on suppose la carte large. C'est le cas
     majoritaire, et la correction éventuelle arrive à la frame suivante,
     pendant que la carte affiche encore son état de chargement. */
  const affiches = largeur === 0 || largeur >= SEUIL_DOUZE_MOIS ? MOIS_LARGE : MOIS_ETROIT;

  /* `titre` est une FONCTION du nombre de mois affichés, et pas une chaîne :
     la carte de l'effectif l'annonce dans son titre, et un titre qui mentirait
     sur la fenêtre serait pire que pas de titre du tout. */
  const libelle = titre(affiches);

  /* LE REF VIT SUR L'ENVELOPPE ET PAS SUR LA CARTE, parce qu'il doit survivre
     aux trois états. Card n'expose pas de ref, et mesurer un élément interne
     le perdrait à chaque changement d'état. */
  const envelopper = contenu => <div ref={ref}>{contenu}</div>;

  if (error) {
    return envelopper(
      <Card title={libelle}>
        <div className={styles.etat}><div className={styles.etatTexte}>{error}</div></div>
      </Card>,
    );
  }
  if (loading || !points) {
    return envelopper(
      <Card title={libelle}>
        <div className={styles.chartWrap} style={{ height: 232 }} />
      </Card>,
    );
  }
  /* slice(-n) et pas un découpage par dates : la route rend déjà les mois dans
     l'ordre, et le dernier point peut être borné à une date de milieu de mois
     quand la période choisie s'y arrête. On coupe par le nombre, jamais par le
     calendrier. */
  return envelopper(rendu(points.slice(-affiches), libelle));
}

/* ─────────── PAGE 1 : la courbe d'effectif, seule ─────────── */

export default function EvolutionEffectifs() {
  return (
    <CarteEvolution
      titre={n => `Effectif total sur les ${n} derniers mois`}
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

export function EvolutionMouvements() {
  return (
    <CarteEvolution
      /* Ce titre-là ne nomme pas la fenêtre : « mensuelle » suffit, et il
         resterait vrai sur six comme sur douze mois. */
      titre={() => 'Évolution mensuelle des entrées et sorties'}
      rendu={(points, titre) => <GrapheMouvements points={points} titre={titre} />}
    />
  );
}

export function GrapheMouvements({ points, titre }) {
  const soldes = points.map(p => p.demarrages - p.fins);

  /* L'AXE DOIT DESCENDRE SOUS ZÉRO, sinon la courbe du solde est tronquée les
     mois où les départs l'emportent — juin 2026 affiche -10. On ne force donc
     PAS beginAtZero, on borne au plus bas des soldes, arrondi à la dizaine
     inférieure pour que la graduation tombe juste.

     UN SEUL AXE POUR LES TROIS SÉRIES, et c'est délibéré : entrées, sorties et
     solde se comptent tous en collaborateurs. Leur donner deux échelles rendrait
     comparables des hauteurs qui ne le sont pas, ce qui est précisément le
     défaut qu'on vient de corriger en séparant cette carte de la courbe
     d'effectif. */
  const bas = Math.min(0, ...soldes);
  const minAxe = Math.floor(bas / 10) * 10;

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
              /* LE SOLDE NET, demandé par Jimmy le 16/10 à cet endroit précis
                 et pas en tuile. Il y est à sa place : c'est la différence des
                 deux barres du même mois, et la courbe la rend lisible dans le
                 temps — on voit d'un coup d'œil les mois où l'agence a perdu
                 du monde, mai et juin 2026, et ceux où elle en a gagné.
                 `order: 0` la dessine PAR-DESSUS les barres ; sans cela elle
                 passerait dessous et disparaîtrait derrière elles. */
              {
                type: 'line',
                label: 'Solde net',
                data: soldes,
                borderColor: C_EFFECTIF,
                pointBackgroundColor: C_EFFECTIF,
                pointRadius: 3,
                borderWidth: 2,
                tension: 0.3,
                fill: false,
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
                  title: items => libelleMoisLong(points[items[0].dataIndex].mois),
                  /* Le solde porte son signe, les deux autres non : « +5 »
                     se lit comme un gain, « 5 » comme un compte. Le pied
                     d'infobulle qui portait le solde a disparu, la courbe le
                     donne maintenant dans la liste. */
                  label: ctx => {
                    const n = ctx.parsed.y;
                    if (ctx.dataset.label === 'Solde net') {
                      return `Solde net : ${n > 0 ? '+' : ''}${fmtNumber(n)}`;
                    }
                    return `${ctx.dataset.label} : ${fmtNumber(n)} collaborateur${n > 1 ? 's' : ''}`;
                  },
                },
              },
            },
            scales: {
              x: { ticks: { ...tickStyle, maxRotation: 0 }, grid: gridStyle, border: borderCol },
              y: {
                suggestedMin: minAxe,
                /* Pas de demi-personne sur un axe de mouvements. */
                ticks: { ...tickStyle, precision: 0 },
                /* LA LIGNE DE ZÉRO EST APPUYÉE. Depuis que la courbe du solde
                   peut passer en négatif, zéro n'est plus le bas du cadre mais
                   une frontière au milieu : sans la marquer, on ne voit pas
                   d'un coup d'œil quels mois sont en perte. */
                grid: {
                  ...gridStyle,
                  color: ctx => (ctx.tick?.value === 0 ? 'rgba(38,0,31,0.28)' : gridStyle.color),
                  lineWidth: ctx => (ctx.tick?.value === 0 ? 1.5 : 1),
                },
                border: borderCol,
                title: { display: true, text: 'Collaborateurs', color: 'rgba(38,0,31,0.45)', font: { size: 9 } },
              },
            },
          }}
        />
      </div>
      <div className={styles.legende}>
        <span className={styles.legDot} style={{ background: C_ENTREES }} />Entrées
        <span className={styles.legDot} style={{ background: C_SORTIES, marginLeft: 14 }} />Sorties
        <span className={styles.legDot} style={{ background: C_EFFECTIF, marginLeft: 14 }} />Solde net
      </div>
    </Card>
  );
}
