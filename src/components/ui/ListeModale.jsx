import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './ListeModale.module.css';

/* Modale générique pour les listes longues.
 *
 * Une carte de dashboard doit garder une hauteur stable : c'est ce qui permet
 * de balayer la page du regard sans que la mise en page se déforme selon la
 * période choisie. Une liste qui s'allonge — 5 missions en juillet, 22 en
 * septembre — repousse tout ce qui se trouve en dessous et oblige à défiler
 * pour retrouver le graphique suivant.
 *
 * La carte affiche donc un extrait de taille fixe, et le reste vit ici.
 * L'alternative « Voir plus » en accordéon a le défaut inverse : elle règle le
 * problème d'affichage par défaut, mais le recrée dès qu'on l'ouvre.
 *
 * Portail, fermeture à Échap et blocage du défilement de fond : les trois
 * oublis classiques d'une modale, repris de AccesDashboards. */
export default function ListeModale({ titre, sousTitre, onClose, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = avant; };
  }, []);

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
      >
        <div className={styles.header}>
          <div className={styles.identite}>
            <div className={styles.titre}>{titre}</div>
            {sousTitre && <div className={styles.sousTitre}>{sousTitre}</div>}
          </div>
          <button type="button" className={styles.fermer} onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className={styles.corps}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
