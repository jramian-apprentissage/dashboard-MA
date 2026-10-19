import { useState, useEffect } from 'react';
import {fmtNumber, fmtPourcentage } from '../../utils/formatNumber';
import styles from './MotifBar.module.css';

/* `extras` : des valeurs supplémentaires à droite, après le pourcentage et le
   compte. Le Dash RH y pose l'ancienneté moyenne et la durée moyenne des
   missions sur ses barres par département.

   AVEC `extras`, LA ZONE DE DROITE PASSE EN GRILLE À COLONNES FIXES, et ce
   n'est pas de la coquetterie. En flex, chaque valeur pousse la suivante : la
   flèche de « 8% → 6 » ne tombe pas au même endroit que celle de « 47% → 35 »,
   et la colonne entière ondule d'une ligne à l'autre selon la largeur des
   nombres. Des colonnes fixes et des chiffres tabulaires règlent les deux.

   LA LARGEUR DES COLONNES SUPPLÉMENTAIRES EST UN CONTRAT avec l'appelant : les
   en-têtes que la carte RH pose au-dessus se calent sur les mêmes 86 px. La
   changer ici sans la changer là désaligne les deux.

   SANS `extras`, LE RENDU EST CELUI D'AVANT, à l'identique. Quatre pages du
   dashboard commercial emploient ce composant ; leur mise en page ne doit pas
   bouger parce que le Dash RH a besoin de colonnes en plus. D'où la branche,
   plutôt qu'une grille imposée à tout le monde. */
export const LARGEUR_EXTRA = 86;

/* `largeur` : la longueur de la barre, quand elle ne doit PAS être le nombre
   affiché. Par défaut les deux sont confondus, et c'est le cas de toutes les
   parts d'un total, qui vivent entre 0 et 100.

   LE DASH RH A CASSÉ CETTE ÉQUIVALENCE avec son turnover par département :
   ce ne sont pas des parts d'un total mais des TAUX, et un taux de turnover
   dépasse allègrement 100 % quand les missions durent quelques mois.
   L'administratif est à 170 % en 2026. Sans ce paramètre, la barre serait
   large de 170 % de son rail, déborderait de la carte et se ferait couper
   par son overflow: hidden ; la seule autre issue aurait été d'écrêter à
   100 %, c'est-à-dire d'afficher l'administratif et un département à 100 %
   avec la même longueur. L'appelant passe donc une largeur mise à l'échelle
   du plus fort, et le nombre affiché reste le vrai taux. */
export default function MotifBar({ label, pct, count, extras, fillColor = 'var(--neg)', title, largeur }) {
  const cible = largeur === undefined ? pct : largeur;
  const [w, setW] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setW(cible));
    return () => cancelAnimationFrame(raf);
  }, [cible]);

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
      {!extras?.length ? (
        <div className={styles.val}>
          {typeof pct === 'number' ? fmtPourcentage(pct) : `${pct}%`}
          {count !== undefined && <span> → {fmtNumber(count)}</span>}
        </div>
      ) : (
        <div
          className={styles.valGrille}
          /* Gabarit construit ici et pas en CSS : repeat() n'accepte pas un
             compte venu d'une variable, et le nombre de colonnes dépend de
             l'appelant. */
          style={{ gridTemplateColumns: `38px 10px 22px ${extras.map(() => `${LARGEUR_EXTRA}px`).join(' ')}` }}
        >
          <span className={styles.gPct}>
            {typeof pct === 'number' ? fmtPourcentage(pct) : `${pct}%`}
          </span>
          <span className={styles.gFleche}>{count !== undefined ? '→' : ''}</span>
          <span className={styles.gCount}>{count !== undefined ? fmtNumber(count) : ''}</span>
          {extras.map((v, i) => <span key={i} className={styles.gExtra}>{v}</span>)}
        </div>
      )}
    </div>
  );
}
