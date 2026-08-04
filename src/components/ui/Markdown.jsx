import styles from './Markdown.module.css';

/* Rendu Markdown minimal pour les réponses de l'assistante IA.

   Écrit à la main plutôt qu'avec marked/react-markdown : on ne supporte que
   ce que le modèle produit réellement (gras, listes, tableaux, code inline),
   et surtout on génère des éléments React — jamais de
   dangerouslySetInnerHTML, donc aucune surface XSS même si le modèle
   renvoyait du HTML dans sa réponse.

   Volontairement non supporté : titres #, images, liens, HTML brut. Le
   prompt système demande explicitement des titres en gras, pas des #. */

// Inline : **gras**, *italique*, `code`. Découpage par groupes capturants
// pour conserver les délimiteurs et savoir quoi styler.
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;

function inline(texte, cle) {
  return texte.split(INLINE).filter(Boolean).map((part, i) => {
    const k = `${cle}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={k}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`')  && part.endsWith('`'))  return <code key={k} className={styles.code}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*')  && part.endsWith('*'))  return <em key={k}>{part.slice(1, -1)}</em>;
    return <span key={k}>{part}</span>;
  });
}

const estLigneTableau = l => /^\s*\|.*\|\s*$/.test(l);
// Ligne de séparation d'un tableau : |---|:--:|  (pas une vraie ligne de données)
const estSeparateur   = l => /^\s*\|[\s:|-]+\|\s*$/.test(l);
const cellules        = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
const estPuce         = l => /^\s*[-*•]\s+/.test(l);
const estNumerotee    = l => /^\s*\d+[.)]\s+/.test(l);

export default function Markdown({ children }) {
  const lignes = String(children || '').split('\n');
  const blocs = [];
  let i = 0;

  while (i < lignes.length) {
    const ligne = lignes[i];

    // ── Tableau ──
    if (estLigneTableau(ligne)) {
      const brut = [];
      while (i < lignes.length && estLigneTableau(lignes[i])) brut.push(lignes[i++]);
      const lignesData = brut.filter(l => !estSeparateur(l));
      if (lignesData.length) {
        const [entete, ...corps] = lignesData;
        blocs.push(
          <div key={`t${i}`} className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>{cellules(entete).map((c, j) => <th key={j}>{inline(c, `h${j}`)}</th>)}</tr></thead>
              <tbody>
                {corps.map((l, r) => (
                  <tr key={r}>{cellules(l).map((c, j) => <td key={j}>{inline(c, `c${r}-${j}`)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    // ── Liste à puces ──
    if (estPuce(ligne)) {
      const items = [];
      while (i < lignes.length && estPuce(lignes[i])) {
        items.push(lignes[i].replace(/^\s*[-*•]\s+/, ''));
        i++;
      }
      blocs.push(
        <ul key={`u${i}`} className={styles.list}>
          {items.map((t, j) => <li key={j}>{inline(t, `li${j}`)}</li>)}
        </ul>,
      );
      continue;
    }

    // ── Liste numérotée ──
    if (estNumerotee(ligne)) {
      const items = [];
      while (i < lignes.length && estNumerotee(lignes[i])) {
        items.push(lignes[i].replace(/^\s*\d+[.)]\s+/, ''));
        i++;
      }
      blocs.push(
        <ol key={`o${i}`} className={styles.list}>
          {items.map((t, j) => <li key={j}>{inline(t, `oi${j}`)}</li>)}
        </ol>,
      );
      continue;
    }

    // ── Paragraphe : lignes consécutives non vides, non structurantes ──
    if (ligne.trim()) {
      const para = [];
      while (
        i < lignes.length && lignes[i].trim()
        && !estLigneTableau(lignes[i]) && !estPuce(lignes[i]) && !estNumerotee(lignes[i])
      ) para.push(lignes[i++]);
      blocs.push(
        <p key={`p${i}`} className={styles.para}>
          {para.map((l, j) => (
            <span key={j}>
              {inline(l, `p${j}`)}
              {j < para.length - 1 && <br />}
            </span>
          ))}
        </p>,
      );
      continue;
    }

    i++; // ligne vide
  }

  return <div className={styles.md}>{blocs}</div>;
}
