import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { computeAsusData } from '../../services/sheetsParser';
import ActiviteASUS from '../../pages/dashboards/CommercialActivite/ActiviteASUS';
import { LoaderMark } from '../ui/Loader';
import styles from './InstantaneAsus.module.css';

/* Bouton « Actualiser » du dashboard ASUS et sa fenêtre de résultat.
 *
 * Le dashboard lit l'archive consolidée par l'ingestion de 21h : la journée en
 * cours n'y est donc pas. Le bouton va chercher ces appels-là directement dans
 * Ringover, arrêtés à l'heure du clic, et les montre à part : la page et
 * l'archive ne bougent pas. Chaque clic remplace l'extraction précédente.
 *
 * La fenêtre reprend les mêmes indicateurs que la page, sans l'évolution du
 * nombre d'appels (une seule journée) et sans filtres : ce sont les chiffres
 * de la journée entière, pour tous les collaborateurs. */

const heure = iso => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const jourLong = j => new Date(`${j}T12:00:00Z`)
  .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

function Fenetre({ etat, appels, onClose }) {
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

  const jour = etat?.jour;
  const borne = jour ? new Date(`${jour}T12:00:00Z`) : null;
  const resultat = borne ? computeAsusData(appels, borne, borne, 'Tous') : null;
  // Même forme que le hook useAsusData, pour réutiliser la page telle quelle.
  const donnees = { result: resultat, hasData: !!resultat, loading: false, error: null, rows: appels };

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.fenetre} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Activité du jour">
        <div className={styles.entete}>
          <div>
            <div className={styles.titre}>Activité du jour</div>
            <div className={styles.sousTitre}>
              {jour ? `${jourLong(jour)}, arrêtée à ${heure(etat.extrait_le)}` : 'Aucune extraction'}
              {etat ? ` · ${etat.nb_appels} appel${etat.nb_appels > 1 ? 's' : ''}` : ''}
            </div>
          </div>
          <button type="button" className={styles.fermer} onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className={styles.corps}>
          {resultat && appels.length > 0
            ? <ActiviteASUS asusData={donnees} instantane />
            : <div className={styles.vide}>Aucun appel sur cette journée pour l&apos;instant.</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function InstantaneAsus({ className }) {
  const { actualiserAsus } = useAuth();
  const [etat, setEtat] = useState('repos'); // repos | encours | erreur
  const [message, setMessage] = useState('');
  const [instantane, setInstantane] = useState(null);

  async function actualiser() {
    if (etat === 'encours') return;
    setEtat('encours');
    setMessage('');
    try {
      const data = await actualiserAsus();
      setInstantane(data);
      setEtat('repos');
    } catch (err) {
      /* Trop tôt après le clic précédent : le backend renvoie quand même la
         dernière extraction, autant la montrer plutôt qu'une erreur sèche. */
      if (err.donnees?.etat) {
        setInstantane(err.donnees);
        setEtat('repos');
        setMessage(err.message);
        return;
      }
      setEtat('erreur');
      setMessage(err.message);
    }
  }

  return (
    <>
      <button
        type="button"
        className={className || styles.bouton}
        onClick={actualiser}
        disabled={etat === 'encours'}
        title="Lire les appels du jour dans Ringover, arrêtés à maintenant"
      >
        {etat === 'encours'
          ? <LoaderMark size={12} />
          : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          )}
        {etat === 'encours' ? 'Actualisation…' : 'Actualiser'}
      </button>

      {etat === 'erreur' && <span className={styles.erreur}>{message}</span>}

      {instantane && (
        <Fenetre
          etat={instantane.etat}
          appels={instantane.appels || []}
          onClose={() => { setInstantane(null); setMessage(''); }}
        />
      )}
    </>
  );
}
