import { useEffect, useMemo, useRef, useState } from 'react';
import RechercheListe from './RechercheListe';
import styles from './RechercheAvecSuggestions.module.css';

/* Champ de recherche qui propose des valeurs DÉJÀ PRÉSENTES dans la liste.
 *
 * Il enveloppe RechercheListe, qui reste le champ de ce dépôt — même icône,
 * même croix d'effacement, même apparence que les deux cartes du dashboard
 * commercial qui l'emploient. Seules les suggestions sont nouvelles.
 *
 * LES PROPOSITIONS NE SORTENT QUE DE LA LISTE AFFICHÉE, règle posée par Jimmy
 * le 22/10. Une suggestion qui ne donnerait aucun résultat est pire que pas de
 * suggestion : elle fait croire que la donnée existe. L'appelant passe donc les
 * valeurs réelles de ses lignes, et le composant n'invente rien.
 *
 * À PARTIR DE DEUX CARACTÈRES, même règle. En dessous, la liste proposerait
 * presque tout et n'aiderait personne ; c'est aussi ce qui évite d'ouvrir un
 * panneau de soixante lignes au premier appui sur une touche.
 *
 * PAS DE <datalist>, bien qu'il fasse ça nativement : son rendu appartient au
 * navigateur, il ne respecte ni la charte ni le seuil de deux caractères, et
 * il se comporte différemment d'un navigateur à l'autre.
 */

const MIN_CARACTERES = 2;
const MAX_SUGGESTIONS = 8;

/* LA MÊME NORMALISATION QUE LE FILTRE DE L'APPELANT, et ce n'est pas un détail
   de confort : si les deux divergent, taper « telepro » filtre le tableau sur
   « Téléprospecteur » mais ne propose rien, et le panneau paraît cassé au
   moment précis où il devrait aider. Constaté le 22/10 en testant la pop-up du
   Pipeline : les suggestions comparaient les accents, le filtre non. */
const sansAccent = v => String(v || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toLowerCase();

export default function RechercheAvecSuggestions({
  valeur,
  onChange,
  suggestions,
  placeholder = 'Rechercher…',
}) {
  const [ouvert, setOuvert] = useState(false);
  const [survol, setSurvol] = useState(-1);
  const boite = useRef(null);

  const proposees = useMemo(() => {
    const q = sansAccent(valeur);
    if (q.length < MIN_CARACTERES) return [];
    /* DÉDOUBLONNÉES ET TRIÉES PAR PERTINENCE : ce qui COMMENCE par la saisie
       d'abord, le reste ensuite. Chercher « ass » doit proposer « Assistante
       de direction » avant « Chargé d'assistance », sinon le premier élément
       de la liste n'est jamais le bon. */
    const vues = new Set();
    const debut = [];
    const dedans = [];
    for (const v of suggestions) {
      const net = String(v || '').replace(/\s+/g, ' ').trim();
      if (!net) continue;
      const cle = sansAccent(net);
      if (vues.has(cle)) continue;
      vues.add(cle);
      if (cle.startsWith(q)) debut.push(net);
      else if (cle.includes(q)) dedans.push(net);
    }
    return [...debut, ...dedans].slice(0, MAX_SUGGESTIONS);
  }, [valeur, suggestions]);

  /* Un clic en dehors referme le panneau. Sans ça il reste ouvert pendant
     qu'on lit le tableau qu'il recouvre. */
  useEffect(() => {
    if (!ouvert) return undefined;
    function dehors(e) {
      if (boite.current && !boite.current.contains(e.target)) setOuvert(false);
    }
    document.addEventListener('mousedown', dehors);
    return () => document.removeEventListener('mousedown', dehors);
  }, [ouvert]);

  function choisir(v) {
    onChange(v);
    setOuvert(false);
    setSurvol(-1);
  }

  function auClavier(e) {
    if (e.key === 'Escape') { setOuvert(false); return; }
    if (!ouvert || proposees.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSurvol(i => (i + 1) % proposees.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSurvol(i => (i <= 0 ? proposees.length : i) - 1); }
    else if (e.key === 'Enter' && survol >= 0) { e.preventDefault(); choisir(proposees[survol]); }
  }

  return (
    <div className={styles.wrap} ref={boite} onKeyDown={auClavier}>
      <RechercheListe
        valeur={valeur}
        onChange={v => { onChange(v); setOuvert(true); setSurvol(-1); }}
        placeholder={placeholder}
      />
      {ouvert && proposees.length > 0 && (
        <ul className={styles.panneau} role="listbox">
          {proposees.map((v, i) => (
            <li key={v}>
              <button
                type="button"
                className={`${styles.item} ${i === survol ? styles.actif : ''}`}
                onMouseEnter={() => setSurvol(i)}
                onClick={() => choisir(v)}
              >
                {v}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
