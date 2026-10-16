import { useState, useEffect } from 'react';
import {fmtNumber, fmtPourcentage } from '../../utils/formatNumber';
import styles from './MotifBar.module.css';

/* `extra` : une troisième valeur à droite, après le pourcentage et le compte.
   Ajoutée le 16/10 pour l'ancienneté moyenne par département du Dash RH.

   AVEC `extra`, LA ZONE DE DROITE PASSE EN GRILLE À COLONNES FIXES, et ce n'est
   pas de la coquetterie. En flex, chaque valeur pousse la suivante : la flèche
   de « 8% → 6 » ne tombait pas au même endroit que celle de « 47% → 35 », et la
   colonne entière ondulait d'une ligne à l'autre selon la largeur des nombres
   (relevé par Jimmy le 16/10). Des colonnes fixes et des chiffres tabulaires
   règlent les deux d'un coup.

   SANS `extra`, LE RENDU EST CELUI D'AVANT, à l'identique. Quatre pages du
   dashboard commercial emploient ce composant ; leur mise en page ne doit pas
   bouger parce que le Dash RH avait besoin d'une colonne de plus. D'où la
   branche, plutôt qu'une grille imposée à tout le monde. */
export default function MotifBar({ label, pct, count, extra, fillColor = 'var(--neg)', title }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    // `title` optionnel : porte la comparaison à la période précédente sans
    // ajouter de colonne — la barre reste lisible d'un coup d'œil, le détail
    // vient au survol pour qui le cherche.
    <div className={styles.row} title={title || undefined}>
      <div className={styles.label}>{label}</div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{
            // Même représentation que le funnel par étape juste au-dessus :
            // barre à l'échelle 0-100%, valeur affichée à droite plutôt que
            // dans la barre (évitait un grand espace blanc visuellement peu
            // clair entre deux valeurs proches, ex. 13% et 35%).
            width: `${w > 0 ? Math.max(w, 4) : 0}%`,
            background: fillColor,
            opacity: 0.7,
            transition: 'width 0.85s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
      {/* Virgule décimale française : une part sous 1 % s'écrit « 0,2 % ».
          Les valeurs entières passent inchangées. */}
      {extra === undefined ? (
        <div className={styles.val}>
          {typeof pct === 'number' ? fmtPourcentage(pct) : `${pct}%`}
          {count !== undefined && <span> → {fmtNumber(count)}</span>}
        </div>
      ) : (
        <div className={styles.valGrille}>
          <span className={styles.gPct}>
            {typeof pct === 'number' ? fmtPourcentage(pct) : `${pct}%`}
          </span>
          <span className={styles.gFleche}>{count !== undefined ? '→' : ''}</span>
          <span className={styles.gCount}>{count !== undefined ? fmtNumber(count) : ''}</span>
          <span className={styles.gExtra}>{extra}</span>
        </div>
      )}
    </div>
  );
}
