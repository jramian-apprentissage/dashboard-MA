import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CLE_SYNCHRO_MONDAY } from '../../services/api';
import { LoaderMark } from './Loader';

/* Mise à jour de Monday CRM à la demande, depuis le menu profil (Topbar sur
   ordinateur, feuille « Comptes » sur mobile), juste au-dessus du changement
   de mot de passe.

   Réservée aux comptes que le backend déclare autorisés
   (`user.peutSynchroniserMonday`, aujourd'hui Tahina seulement) ; la route
   revérifie le droit de son côté. Elle relance l'extraction Monday de 21h —
   comptes, profils, leads — et rien d'autre.

   Une fois l'extraction finie, la page se recharge : c'est le seul moyen sûr
   que chaque onglet relise la base. `CLE_SYNCHRO_MONDAY` fait contourner le
   cache navigateur par ces nouvelles lectures (voir services/api.js). */

function nbModifications(bilan) {
  return ['comptes', 'profils', 'leads']
    .reduce((s, k) => s + (bilan?.[k]?.cree || 0) + (bilan?.[k]?.maj || 0), 0);
}

export default function MajMonday({ className, classeStatut }) {
  const { user, synchroniserMonday } = useAuth();
  const [etat, setEtat] = useState('repos'); // repos | encours | ok | erreur
  const [message, setMessage] = useState('');
  const minuteur = useRef(null);

  useEffect(() => () => clearTimeout(minuteur.current), []);

  if (!user?.peutSynchroniserMonday) return null;

  async function lancer() {
    if (etat === 'encours' || etat === 'ok') return;
    setEtat('encours');
    setMessage('');
    try {
      const { bilan } = await synchroniserMonday();
      const n = nbModifications(bilan);
      setEtat('ok');
      setMessage((n
        ? `${n} modification${n > 1 ? 's' : ''} reprise${n > 1 ? 's' : ''} de Monday.`
        : 'Aucune modification dans Monday.') + ' Rechargement…');
      try { sessionStorage.setItem(CLE_SYNCHRO_MONDAY, String(Date.now())); } catch { /* sans effet */ }
      minuteur.current = setTimeout(() => window.location.reload(), 1800);
    } catch (err) {
      setEtat('erreur');
      setMessage(err.message);
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={lancer}
        disabled={etat === 'encours' || etat === 'ok'}
        aria-busy={etat === 'encours'}
      >
        {etat === 'encours' ? (
          <LoaderMark size={13} />
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        )}
        {etat === 'encours' ? 'Mise à jour de Monday…' : 'Actualiser Monday CRM'}
      </button>
      {message && (
        <div className={classeStatut} role="status" data-etat={etat}>{message}</div>
      )}
    </>
  );
}
