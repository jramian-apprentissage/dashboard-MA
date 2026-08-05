import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoaderMark } from './Loader';
import styles from './ChangerMotDePasse.module.css';

/* Changement de mot de passe, depuis le menu profil (Topbar sur ordinateur,
   feuille « Comptes » sur mobile — les deux ouvrent cette même modale).

   Trois champs plutôt que deux : la confirmation évite qu'une faute de frappe
   dans un champ masqué enferme la personne dehors. Elle est vérifiée ici et
   non côté serveur, qui n'a pas à connaître cette notion — c'est une
   précaution de saisie, pas une règle métier.

   La longueur minimale (8) est celle qu'applique le backend. Elle est
   rappelée dans l'interface avant la validation : découvrir une contrainte
   après avoir tout tapé et vu le formulaire se vider est le meilleur moyen
   de faire abandonner. */

const LONGUEUR_MIN = 8;

function Oeil({ visible }) {
  return visible ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function Champ({ id, libelle, valeur, onChange, autoFocus, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{libelle}</label>
      <div className={styles.inputWrap}>
        <input
          id={id}
          className={styles.input}
          type={visible ? 'text' : 'password'}
          value={valeur}
          onChange={e => onChange(e.target.value)}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className={styles.eyeBtn}
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Masquer' : 'Afficher'}
          tabIndex={-1}
        >
          <Oeil visible={visible} />
        </button>
      </div>
    </div>
  );
}

export default function ChangerMotDePasse({ onClose }) {
  const { changePassword } = useAuth();
  const [actuel, setActuel]   = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirme, setConfirme] = useState('');
  const [erreur, setErreur]   = useState(null);
  const [succes, setSucces]   = useState(false);
  const [envoi, setEnvoi]     = useState(false);
  const minuteur = useRef(null);

  useEffect(() => () => clearTimeout(minuteur.current), []);

  // Échap ferme la modale — un formulaire de mot de passe ouvert par erreur
  // doit pouvoir se refermer sans viser la croix.
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Le fond ne défile plus tant que la modale est ouverte : sans ça la page
  // continuait de glisser derrière l'overlay au moindre coup de molette.
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = avant; };
  }, []);

  const tropCourt = nouveau.length > 0 && nouveau.length < LONGUEUR_MIN;
  const discordant = confirme.length > 0 && nouveau !== confirme;
  const pretAEnvoyer = actuel && nouveau.length >= LONGUEUR_MIN && nouveau === confirme && !envoi;

  async function onSubmit(e) {
    e.preventDefault();
    if (!pretAEnvoyer) return;
    setErreur(null);
    setEnvoi(true);
    try {
      await changePassword(actuel, nouveau);
      setSucces(true);
      // Laisse le temps de lire la confirmation avant que la modale disparaisse.
      minuteur.current = setTimeout(onClose, 1600);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  /* Rendu en portail dans document.body, et non à l'endroit où le composant
     est monté. La Topbar se révèle au défilement via un `transform`, ce qui
     en fait le bloc conteneur de tout `position: fixed` situé dessous : la
     modale s'y trouvait plaquée sur les 46 px de l'entête, tronquée par le
     haut. Même contournement que le menu de PeriodPicker. */
  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Changer mon mot de passe">
        <div className={styles.header}>
          <h2 className={styles.titre}>Changer mon mot de passe</h2>
          <button type="button" className={styles.fermer} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {succes ? (
          <div className={styles.succes}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Mot de passe modifié.
          </div>
        ) : (
          <form className={styles.form} onSubmit={onSubmit}>
            <Champ
              id="mdp-actuel" libelle="Mot de passe actuel" valeur={actuel}
              onChange={setActuel} autoFocus autoComplete="current-password"
            />
            <Champ
              id="mdp-nouveau" libelle="Nouveau mot de passe" valeur={nouveau}
              onChange={setNouveau} autoComplete="new-password"
            />
            <Champ
              id="mdp-confirme" libelle="Confirmer le nouveau" valeur={confirme}
              onChange={setConfirme} autoComplete="new-password"
            />

            {/* Contraintes annoncées pendant la saisie, pas après l'envoi. */}
            {tropCourt && <div className={styles.aide}>Au moins {LONGUEUR_MIN} caractères.</div>}
            {discordant && <div className={styles.aide}>Les deux saisies ne correspondent pas.</div>}
            {erreur && <div className={styles.erreur}>{erreur}</div>}

            <button type="submit" className={styles.valider} disabled={!pretAEnvoyer}>
              {envoi ? <><LoaderMark size={15} /> Modification…</> : 'Modifier le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
