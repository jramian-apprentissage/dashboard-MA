import styles from './RechercheListe.module.css';

/* Champ de recherche pour filtrer une liste affichée dans une carte
   (opportunités sans prochaine action, santé par client).

   Ces listes dépassent la trentaine de lignes et sont repliées par défaut :
   retrouver un client précis obligeait à tout déplier puis à parcourir à
   l'œil. Le filtre porte sur ce que l'utilisateur a en tête — le nom du
   client — et laisse le tri et le repliement fonctionner comme avant.

   Le composant ne détient pas l'état : c'est la carte qui décide sur quels
   champs filtrer et comment recompter, ce qui évite de lui imposer une forme
   de donnée. */

export default function RechercheListe({ valeur, onChange, placeholder = 'Rechercher un client…' }) {
  return (
    <div className={styles.wrap}>
      <svg className={styles.icone} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="search"
        className={styles.champ}
        value={valeur}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {valeur && (
        <button type="button" className={styles.effacer} onClick={() => onChange('')} aria-label="Effacer la recherche">
          ✕
        </button>
      )}
    </div>
  );
}
