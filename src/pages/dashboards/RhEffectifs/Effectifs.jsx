import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import { useRhEffectifs } from '../../../hooks/useRhData';
import { compareValueText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber } from '../../../utils/formatNumber';
import styles from './Rh.module.css';

/* Vue 1 du Suivi des effectifs, « Effectifs de l'agence ».
 *
 * LA QUATRIÈME TUILE EST VIDE, ET C'EST VOULU. La maquette validée avec
 * Clémence porte une tuile libellée « indicateur à définir » : elle a retiré
 * l'effectif du vivier de cette rangée et laissé la place libre plutôt que de
 * la combler. On reproduit, on ne remplit pas de notre propre chef.
 *
 * LES DEUX PÉRIMÈTRES DE LA PAGE NE SONT PAS LES MÊMES, ET C'EST DANS LA
 * MAQUETTE. La tuile « effectif placé » écarte MA, MA (Nael) et CEP, donc 63
 * personnes sur 98. Le tableau par entité n'écarte que MA, donc 78. Quinze
 * personnes d'écart entre deux blocs de la même page : c'est à expliquer en
 * séance, pas à corriger en silence.
 */
export default function Effectifs() {
  const { result, compareResult, loading, error } = useRhEffectifs();
  const { comparePeriodKey } = usePeriod();

  return (
    <Loader loading={loading && !result} label="Chargement des données RH…" minHeight={220}>
      {() => {
        /* Trois états, et il ne faut jamais les confondre : la source ne
           répond pas, la source répond vide, la source répond. Les mélanger
           est une faute déjà commise ailleurs dans ce dépôt. */
        if (error) {
          return (
            <>
              <SectionLabel>L’agence Mon Ambassadeur</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>Les données RH ne répondent pas</div>
                  <div className={styles.etatTexte}>{error}</div>
                </div>
              </Card>
            </>
          );
        }
        if (!result || result.effectifTotal === 0) {
          return (
            <>
              <SectionLabel>L’agence Mon Ambassadeur</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>En attente du registre</div>
                  <div className={styles.etatTexte}>
                    Les tables existent et les règles de calcul sont écrites, mais le
                    classeur des collaborateurs n’est pas encore relié. L’écran se
                    remplira à la première ingestion, sans autre changement.
                  </div>
                </div>
              </Card>
            </>
          );
        }

        const { effectifTotal, effectifPlace, effectifInterne, contrats, entites, familles } = result;
        const part = n => (effectifTotal ? Math.round((n / effectifTotal) * 100) : 0);

        return (
          <div className={styles.page}>
            <SectionLabel badge="Registre RH">L’agence Mon Ambassadeur</SectionLabel>
            <div className={styles.kpiGrid}>
              {/* PREMIER INDICATEUR POSÉ, le 16/10.
                  Le stock se lit au dernier jour de la période ; la ligne du
                  dessous porte les deux FLUX qui expliquent l'écart, à la place
                  de la définition. Un solde seul ne se lit pas : « + 5 » ne dit
                  pas s'il vient de onze arrivées et six départs ou de cinq
                  arrivées sans départ. La définition et sa réserve de méthode
                  vivent au glossaire, pas sur la carte (arbitrage du 16/10). */}
              <KPICard
                label="Effectif total"
                value={fmtNumber(effectifTotal)}
                unit=" collaborateurs"
                compare={compareResult
                  ? compareValueText(effectifTotal, compareResult.effectifTotal, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `${fmtNumber(result.demarrages)} démarrage${result.demarrages > 1 ? 's' : ''}, `
                    + `${fmtNumber(result.fins)} fin${result.fins > 1 ? 's' : ''} de mission`,
                }}
              />
              <KPICard
                label="Effectif placé"
                value={fmtNumber(effectifPlace)}
                unit=" agents"
                trend={{ dir: 'neutral', text: `${part(effectifPlace)} % de l’effectif, hors MA et CEP` }}
              />
              <KPICard
                label="Effectif interne"
                value={fmtNumber(effectifInterne)}
                unit=" agents"
                trend={{ dir: 'neutral', text: 'Salariés de MA non placés : core team, devs, commerciaux' }}
              />
              {/* La quatrième tuile reste vide, voir l'en-tête du fichier. */}
              <KPICard
                label="Indicateur à définir"
                value="—"
                trend={{ dir: 'neutral', text: 'Le vivier passe plus bas, détaillé par type de mission' }}
              />
            </div>

            <SectionLabel>Composition du portefeuille</SectionLabel>
            <div className={styles.deuxCol}>
              <Card title="Répartition par type de contrat">
                <table className={styles.tbl}>
                  <thead><tr><th>Type de contrat</th><th>Agents</th><th>Part</th><th>Ancienneté moy.</th></tr></thead>
                  <tbody>
                    {contrats.map(c => (
                      <tr key={c.type_contrat}>
                        <td>{c.type_contrat}</td>
                        <td className={styles.num}>{fmtNumber(c.effectif)}</td>
                        <td className={styles.num}>{part(c.effectif)} %</td>
                        <td className={styles.num}>{c.anciennete_mois != null ? `${c.anciennete_mois} mois` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card title="Effectif par type de mission">
                <table className={styles.tbl}>
                  <thead><tr><th>Type de mission</th><th>Agents</th><th>Part</th></tr></thead>
                  <tbody>
                    {familles.map(f => (
                      <tr key={f.famille}>
                        <td>{f.famille}</td>
                        <td className={styles.num}>{fmtNumber(f.effectif)}</td>
                        <td className={styles.num}>{part(f.effectif)} %</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            <Card title="Répartition par entité">
              <table className={styles.tbl}>
                <thead><tr><th>Entité</th><th>Agents</th><th>Ancienneté moy.</th></tr></thead>
                <tbody>
                  {entites.slice(0, 10).map(e => (
                    <tr key={e.entite}>
                      <td>{e.entite}</td>
                      <td className={styles.num}>{fmtNumber(e.effectif)}</td>
                      <td className={styles.num}>{e.anciennete_mois != null ? `${e.anciennete_mois} mois` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {entites.length > 10 && (
                <div className={styles.mention}>
                  {entites.length - 10} autres entités, {fmtNumber(entites.slice(10).reduce((s, e) => s + e.effectif, 0))} agents.
                  Le tableau écarte MA, l’effectif interne est dans la tuile du dessus.
                </div>
              )}
            </Card>
          </div>
        );
      }}
    </Loader>
  );
}
