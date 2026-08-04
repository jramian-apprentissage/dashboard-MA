import { useState, useRef, useEffect } from 'react';
import styles from './KPICard.module.css';
import { fmtNumber } from '../../utils/formatNumber';
import { usePeriod } from '../../contexts/PeriodContext';

// Icônes "tendance graphique" (trending-up/down) plutôt qu'un chevron, qui se
// lit comme un contrôle cliquable (expand/collapse) et non comme un
// indicateur de hausse/baisse. Partagées entre la ligne comparaison et la
// ligne définition (toutes deux peuvent porter un up/down).
function TrendIcon({ dir }) {
  if (dir === 'up') {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    );
  }
  if (dir === 'down') {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
        <polyline points="16 17 22 17 22 11"/>
      </svg>
    );
  }
  return null;
}

// Ligne de comparaison jamais masquée silencieusement : tant que "Comparer"
// est actif, la carte affiche toujours quelque chose (le delta, "0 sur la
// période précédente" pour une référence à zéro, ou "Calcul en cours…" tant
// que la donnée n'est pas encore arrivée) — sans ça, l'utilisateur ne peut
// pas deviner pourquoi certaines cartes ont un comparatif et d'autres non.
// Seule la désactivation explicite de "Comparer" masque la ligne. `compare`
// reste néanmoins surchargeable à `false` (jamais `null`/`undefined`) par
// une carte qui n'a structurellement aucune notion de comparaison (ex. un
// libellé texte plutôt qu'un chiffre) — cas volontairement rare.
function resolveCompare(compare, compareActive) {
  if (!compareActive) return null;
  if (compare === false) return null;
  if (compare) return compare;
  return { dir: 'neutral', text: 'Calcul en cours…' };
}

// Durée d'affichage du montant exact après un tap sur mobile (pas de survol
// possible au doigt) — la carte se "retourne" automatiquement après ce délai.
const FLIP_DURATION_MS = 5000;

export default function KPICard({ label, value, unit, trend, compare, color = 'default', variant, source, exactValue }) {
  const { compareActive } = usePeriod();
  const resolvedCompare = resolveCompare(compare, compareActive);
  const [flipped, setFlipped] = useState(false);
  const flipTimer = useRef(null);

  useEffect(() => () => clearTimeout(flipTimer.current), []);

  // Le survol (voir CSS, gate `@media (hover: hover)`) couvre déjà l'ordinateur
  // — sur un appareil qui n'a pas de vrai survol (mobile/tactile), le clic
  // retourne la carte pour révéler le montant exact.
  //
  // Le retour se fait de deux façons : automatiquement après 5 s, ou tout de
  // suite si l'utilisateur retouche la carte. Sans ce second clic, il fallait
  // attendre le délai en regardant l'écran, sans aucun moyen de revenir.
  function handleClick() {
    if (!exactValue) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    clearTimeout(flipTimer.current);
    if (flipped) { setFlipped(false); return; }
    setFlipped(true);
    flipTimer.current = setTimeout(() => setFlipped(false), FLIP_DURATION_MS);
  }

  const cls = [
    styles.card,
    variant === 'accent'      ? styles.accent      : '',
    variant === 'accent-soft' ? styles.accentSoft  : '',
    color === 'accent'        ? styles.accent       : '',
    color === 'accentAsus'    ? styles.accentAsus   : '',
  ].filter(Boolean).join(' ');

  const valueLen = String(value).length;

  const front = (
    <div className={cls}>
      <div className={styles.label}>
        {label}
        {/* Marqueur temporaire (chantier CloudTalk réel vs mock) : certains
            indicateurs TLM n'ont pas d'équivalent dans les données CloudTalk
            (détail par agent, taux d'appels honorés...) et restent fictifs
            tant qu'aucune autre source ne les couvre. */}
        {source && (
          <span
            className={`${styles.sourceDot} ${source === 'real' ? styles.sourceReal : styles.sourceMock}`}
            title={source === 'real' ? 'Donnée réelle (CloudTalk)' : 'Donnée fictive (mock) — pas de source CloudTalk pour cet indicateur'}
          />
        )}
      </div>
      <div className={`${styles.value}${valueLen > 8 ? ' ' + styles.sm : ''} ${exactValue ? styles.valueHoverable : ''}`}>
        {fmtNumber(value)}<span className={styles.unit}>{unit}</span>
        {/* Infobulle montant exact — CSS-only, ordinateur uniquement (voir
            @media (hover: hover) dans KPICard.module.css) : le tactile n'a
            pas de survol fiable, il passe par le clic + retournement. */}
        {exactValue && <span className={styles.exactTooltip}>{exactValue}</span>}
      </div>
      {/* Ligne 1 (si dispo) : comparaison vs période précédente/année précédente.
          Ligne 2 : la petite définition du KPI, toujours affichée — la
          comparaison vient s'ajouter au-dessus, elle ne la remplace jamais. */}
      {resolvedCompare && (
        <div className={`${styles.compare} ${styles[resolvedCompare.dir] || ''}`}>
          <TrendIcon dir={resolvedCompare.dir} />
          <span className={styles.lineText}>{resolvedCompare.text}</span>
        </div>
      )}
      {trend && (
        <div className={`${styles.trend} ${styles[trend.dir] || ''}`}>
          <TrendIcon dir={trend.dir} />
          <span className={styles.lineText}>{trend.text}</span>
        </div>
      )}
    </div>
  );

  if (!exactValue) return front;

  return (
    <div className={styles.flipWrap} onClick={handleClick}>
      <div className={`${styles.flipInner} ${flipped ? styles.flipped : ''}`}>
        <div className={styles.flipFront}>{front}</div>
        <div className={`${cls} ${styles.flipBack}`}>
          <div className={styles.label}>{label}</div>
          <div className={styles.exactValueBack}>{exactValue}</div>
        </div>
      </div>
    </div>
  );
}
