import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './AccesDashboards.module.css';

/* Accès aux dashboards d'un utilisateur, en modale.
 *
 * Ils occupaient auparavant une colonne de tableau chacun. `TOGGLEABLE_PAGES`
 * vaut `[Accueil, ...DASHBOARDS]` et grandit donc à chaque dashboard ajouté :
 * avec les six prévus (RH, Direction, Finance, Développement, Market & Comm,
 * plus les dashboards clients), on passait de 4 colonnes à 9 ou 10. Sur
 * ordinateur les en-têtes se seraient repliés sur trois lignes ; sur mobile la
 * fiche d'un utilisateur aurait fait 500 px de haut. La liste vit donc ici,
 * défilante, et la fiche n'affiche plus qu'un décompte.
 *
 * L'enregistrement est immédiat, à chaque bascule — pas de bouton « Valider ».
 * Une modale laisse croire qu'on peut annuler, ce qui imposerait un état
 * temporaire et un retour arrière ; beaucoup de complexité pour un gain nul,
 * un accès mal coché se recochant d'un geste.
 *
 * Portail, fermeture à Échap et blocage du défilement de fond : repris de
 * ChangerMotDePasse, ce sont les trois oublis classiques d'une modale. */

export default function AccesDashboards({ utilisateur, pages, accesTotal, estActif, onBasculer, onClose }) {
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

  const nbActifs = pages.filter(p => estActif(p.id)).length;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Accès de ${utilisateur.name}`}>
        <div className={styles.header}>
          <div className={styles.identite}>
            <div className={styles.titre}>{utilisateur.name}</div>
            <div className={styles.sousTitre}>{utilisateur.email}</div>
          </div>
          <button type="button" className={styles.fermer} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {accesTotal ? (
          <div className={styles.noteRole}>
            Ce rôle donne accès à tout. Les accès ne se règlent pas individuellement.
          </div>
        ) : (
          <div className={styles.compteur}>{nbActifs} accès sur {pages.length}</div>
        )}

        {/* Hauteur bornée + défilement : la liste est vouée à s'allonger, et
            une modale plus haute que l'écran devient inutilisable sur mobile. */}
        <div className={styles.liste}>
          {pages.map(p => {
            const actif = estActif(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={styles.ligne}
                onClick={() => !accesTotal && onBasculer(p.id)}
                disabled={accesTotal}
                role="switch"
                aria-checked={actif}
              >
                <span className={styles.nomPage}>{p.label}</span>
                <span className={`${styles.toggle} ${actif ? styles.toggleOn : ''}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
