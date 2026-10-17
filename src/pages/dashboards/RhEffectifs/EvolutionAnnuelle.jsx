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
      <div className={styles.sousTitre}>
        Sur les collaborateurs arrivés chaque année, combien sont encore là
      </div>
      <table className={styles.tbl}>
        <thead>
          <tr><th>Année</th><th>Entrées</th><th>Encore en poste</th><th>Partis</th><th>Rétention</th></tr>
        </thead>
        <tbody>
          {lignes.map(l => (
            <tr key={l.annee}>
              <td>{l.annee}</td>
              <td className={styles.num}>{fmtNumber(l.entrees)}</td>
              <td className={styles.num}>{fmtNumber(l.encore)}</td>
              <td className={styles.num}>{fmtNumber(l.sortis)}</td>
              {/* LA RÉTENTION EST LA LECTURE DE LA LIGNE, pas un indicateur de
                  plus : c'est exactement ce que Clémence fait de tête en
                  disant « 130 départs pour 150 intégrations ». La donner
                  évite que chacun la recalcule, et de travers. */}
              <td className={styles.num}>{fmtPourcentage(partPct(l.encore, l.entrees))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.mention}>
        « Encore en poste » s’entend à la fin de la période choisie, pas au 31 décembre
        de l’année concernée. Une année récente a donc mécaniquement une meilleure
        rétention qu’une ancienne.
      </div>
    </Card>
  );
}
