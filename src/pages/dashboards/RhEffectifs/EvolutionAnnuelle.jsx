import Card from '../../../components/ui/Card';
import TrendIcon from '../../../components/ui/TrendIcon';
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
/* LA CROISSANCE D'UNE ANNEE SUR L'AUTRE, demandee par Clemence le 23/10 :
 * « ca permet de se dire que chaque annee, mon ambassadeur croit a peu pres
 * de X % ». Elle porte sur l'EFFECTIF de fin d'annee et non sur les entrees :
 * une annee qui recrute cent personnes et en perd cent n'a pas grandi.
 *
 * LE POURCENTAGE ET L'ECART SONT DONNES TOUS LES DEUX, comme le demande
 * Jimmy : « le systeme de pourcentage mais avec l'emoji + la difference ».
 * Passer de 8 a 54 fait +575 %, passer de 124 a 120 fait -3 % : le taux seul
 * ne dit pas de combien de personnes on parle, l'ecart seul ne dit pas si
 * c'est beaucoup.
 *
 * SANS ANNEE PRECEDENTE, RIEN NE S'AFFICHE. La premiere ligne du tableau n'a
 * pas de comparaison possible, et un « +100 % » sur un effectif parti de zero
 * serait une invention. */
function croissance(effectif, precedent) {
  if (effectif == null || precedent == null) return null;
  const ecart = effectif - precedent;
  return {
    ecart,
    /* Un denominateur nul n'a pas de taux : on garde l'ecart, qui lui est
       toujours vrai. */
    pct: precedent === 0 ? null : Math.round((100 * ecart) / precedent),
    dir: ecart > 0 ? 'up' : ecart < 0 ? 'down' : 'neutral',
  };
}

const signe = n => (n > 0 ? `+${fmtNumber(n)}` : fmtNumber(n));

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
          La carte « Effectif par type de mission » garde le sien, elle, parce
          qu'il annonce un PÉRIMÈTRE : savoir qu'on ne regarde que les placés
          change ce que les chiffres veulent dire, et doit se lire avant eux. */}
      <table className={styles.tbl}>
        <thead>
          {/* « Sorties » et non « Partis » : c'est le mot de la maquette et
              celui de tout le reste du dashboard, tuile comprise. Inventer un
              synonyme ici laissait croire à une autre mesure.
              « Encore actif » garde le mot de Clémence en retirant le seul
              morceau qui était faux, « fin d'année » : voir l'en-tête. */}
          {/* L'EFFECTIF OUVRE LA LIGNE, avant la cohorte : il dit la TAILLE
              de l'agence cette année-là, et les trois colonnes suivantes
              racontent ce qu'est devenue la promotion entrée la même année.
              Deux mesures différentes, dans cet ordre, parce qu'on lit
              d'abord combien on était.
              SA CROISSANCE EST DANS SA CELLULE, pas dans une colonne à elle :
              c'est la règle posée le 23/10 pour tout le dashboard, un nombre
              et sa part se lisent ensemble. Elle était en colonne séparée
              pendant une heure, corrigée par Jimmy le 25/10. */}
          <tr>
            <th>Année</th>
            <th className={styles.num}>Effectif au 31/12</th>
            <th className={styles.num}>Entrées</th>
            <th className={styles.num}>Encore actif</th>
            <th className={styles.num}>Sorties</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => {
            const c = croissance(l.effectif, i > 0 ? lignes[i - 1].effectif : null);
            return (
            <tr key={l.annee}>
              <td>{l.annee}</td>
              <td className={styles.num}>
                <span className={styles.valeurBrute}>{fmtNumber(l.effectif)}</span>
                {/* LA FLÈCHE GARDE SA COULEUR, c'est tout ce qui distingue ce
                    suffixe de celui d'« encore actif » : une part en gris dit
                    une proportion, une croissance dit un sens. Le vert et le
                    rouge sont ceux des tuiles, la flèche est leur composant. */}
                {c && (
                  <span className={`${styles.partSuffixe} ${c.dir === 'up' ? styles.hausse : c.dir === 'down' ? styles.baisse : ''}`}>
                    <TrendIcon dir={c.dir} />
                    {' '}
                    {c.pct == null ? signe(c.ecart) : `${signe(c.pct)} % (${signe(c.ecart)})`}
                  </span>
                )}
              </td>
              <td className={styles.num}>{fmtNumber(l.entrees)}</td>
              <td className={styles.num}>
                <span className={styles.valeurBrute}>{fmtNumber(l.encore)}</span>
                <span className={styles.partSuffixe}>{fmtPourcentage(partPct(l.encore, l.entrees))}</span>
              </td>
              <td className={styles.num}>{fmtNumber(l.sortis)}</td>
            </tr>
            );
          })}
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
        de la période choisie, pas au 31 décembre de l’année concernée. L’effectif
        de l’année en cours est arrêté à cette même date, son 31 décembre n’ayant
        pas encore eu lieu.
      </div>
    </Card>
  );
}
