import Card from '../../../components/ui/Card';
import { useRhAnnuel } from '../../../hooks/useRhData';
import { fmtNumber, partPct, fmtPourcentage } from '../../../utils/formatNumber';
import styles from './Rh.module.css';

/* LA COHORTE PAR ANNÉE D'ENTRÉE : sur les gens arrivés telle année, combien
 * sont encore là et combien sont partis.
 *
 * POURQUOI CETTE CARTE COMPTE. C'est celle que Clémence a trouvée « très très
 * intéressante » : « en 2025 il y a 130 départs pour 150 intégrations, c'est
 * un vrai warning, il y a un manque de rétention cruel. » Son mérite est que
 * chaque ligne se lit seule, sans avoir à comparer deux colonnes d'un
 * graphique.
 *
 * LA COLONNE DU MILIEU NE DIT PAS « FIN D'ANNÉE », CONTRAIREMENT À LA
 * MAQUETTE. Deux lectures étaient possibles — encore en poste à la date de
 * lecture, ou encore en poste au 31 décembre de l'année concernée — et les
 * deux partitionnent les entrées, donc l'arithmétique ne départage pas. Les
 * chiffres de la maquette tranchent : sur 2023 elle écrit 8/5/3, la première
 * lecture rend 8/5/3 et la seconde 8/8/0. Le libellé a donc été corrigé en
 * « encore en poste », qui décrit ce qui est calculé.
 *
 * LES ENTRÉES SONT EN PERSONNES. Les chiffres de la maquette comptaient des
 * missions : 150 lignes pour 119 personnes en 2025. L'écart est attendu, il ne
 * s'agit pas d'une régression. La colonne du milieu, elle, coïncide presque à
 * l'unité près, parce qu'une personne encore en poste est rarement sur deux
 * missions à la fois.
 */
export default function EvolutionAnnuelle() {
  const { lignes, loading, error } = useRhAnnuel();
  const titre = 'Évolution annuelle';

  if (error) {
    return (
      <Card title={titre}>
        <div className={styles.etat}><div className={styles.etatTexte}>{error}</div></div>
      </Card>
    );
  }
  if (loading || !lignes) {
    return <Card title={titre}><div style={{ height: 150 }} /></Card>;
  }

  return (
    <Card title={titre}>
      {/* PAS DE SOUS-TITRE AU-DESSUS DU TABLEAU. Il y en a eu un, « sur les
          collaborateurs arrivés chaque année, combien sont encore là » :
          c'était une aide à la lecture, pas un périmètre, et la carte a déjà
          son pied de page pour ça. Retiré le 17/10, le texte est descendu dans
          la mention.
          La carte « Effectif par département » garde le sien, elle, parce
          qu'il annonce un PÉRIMÈTRE : savoir qu'on ne regarde que les placés
          change ce que les chiffres veulent dire, et doit se lire avant eux. */}
      <table className={styles.tbl}>
        <thead>
          {/* « Sorties » et non « Partis » : c'est le mot de la maquette et
              celui de tout le reste du dashboard, tuile comprise. Inventer un
              synonyme ici laissait croire à une autre mesure.
              « Encore actif » garde le mot de Clémence en retirant le seul
              morceau qui était faux, « fin d'année » : voir l'en-tête. */}
          <tr><th>Année</th><th className={styles.num}>Entrées</th><th className={styles.num}>Encore actif</th><th className={styles.num}>Sorties</th></tr>
        </thead>
        <tbody>
          {lignes.map(l => (
            <tr key={l.annee}>
              <td>{l.annee}</td>
              <td className={styles.num}>{fmtNumber(l.entrees)}</td>
              <td className={styles.num}>
                <span className={styles.valeurBrute}>{fmtNumber(l.encore)}</span>
                <span className={styles.partSuffixe}>{fmtPourcentage(partPct(l.encore, l.entrees))}</span>
              </td>
              <td className={styles.num}>{fmtNumber(l.sortis)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.mention}>
        {/* LA PHRASE « une année récente a donc mécaniquement une meilleure
            rétention qu'une ancienne » a été retirée le 19/10. Ce qu'elle
            annonçait reste vrai, et la précaution qui la précède suffit à le
            faire comprendre : dire d'où vient l'écart, c'est renseigner ; en
            tirer la conclusion à la place du lecteur, c'est désamorcer la
            lecture que la carte existe précisément pour permettre. */}
        Chaque ligne se lit seule : sur les collaborateurs arrivés cette année-là,
        combien sont encore en poste aujourd’hui. « Encore actif » s’entend à la fin
        de la période choisie, pas au 31 décembre de l’année concernée.
      </div>
    </Card>
  );
}
