import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import DonutChart from '../../../components/ui/DonutChart';
import EvolutionEffectifs from './EvolutionEffectifs';
import MotifBar from '../../../components/ui/MotifBar';
import { libelleFamille } from '../../../data/familles';
import { useRhEffectifs } from '../../../hooks/useRhData';
import { compareValueText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber, partPct, fmtPourcentage } from '../../../utils/formatNumber';
import styles from './Rh.module.css';

/* PALETTE DU CAMEMBERT DES CONTRATS — des LITTÉRAUX, jamais `var(--glycine)`.
 *
 * La règle est déjà écrite dans ce dépôt, en tête de la palette ASUS, et elle
 * a coûté un bug muet : le canvas de Chart.js ne résout pas les variables CSS.
 * `ctx.fillStyle` ignore SILENCIEUSEMENT une valeur qu'il ne sait pas lire et
 * garde la précédente, donc une tranche prend la couleur de sa voisine sans le
 * moindre avertissement. Tout ce qui part vers un graphique est un littéral.
 *
 * Les valeurs sont celles de tokens.css : myrtille #26001F pour la tranche
 * dominante comme sur la maquette, ciment #A7ADAA pour la deuxième, et glycine
 * #C9AAC4 pour la troisième — la maquette y mettait un crème sans jeton, on
 * prend la couleur de signature du dashboard RH.
 *
 * Ces mêmes littéraux servent aux pastilles du tableau : une seule source pour
 * le donut ET sa légende, sinon les deux divergent (précédent ASUS). */
const COULEURS_CONTRAT = [
  'rgba(38,0,31,0.88)',     // myrtille
  'rgba(167,173,170,0.62)', // ciment
  'rgba(201,170,196,0.78)', // glycine
  'rgba(116,81,110,0.55)',  // glycine encre, 4e type si le classeur en crée un
  'rgba(38,0,31,0.32)',
];

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
        /* Le dénominateur du camembert est la somme de ses propres tranches,
           pas effectifTotal. Voir la note sur la carte : les deux sont égaux
           tant que la route rend une partition, et l'écart doit se voir. */
        const totalContrats = contrats.reduce((s, c) => s + c.effectif, 0);
        /* Dénominateur des barres de département : la somme des barres
           elles-mêmes, qui vaut l’effectif PLACÉ et non l’effectif total.
           Prendre effectifTotal ici donnerait des parts qui ne font pas
           100 %, sans que rien ne le signale. */
        const totalFamilles = familles.reduce((s, f) => s + f.effectif, 0);
        /* Même logique pour les clients : le dénominateur est la somme des
           lignes du tableau, pas effectifTotal. Les deux valent 74, et c’est
           voulu depuis le 16/10 — toute la section compte les placés. */
        const totalClients = entites.reduce((s, e) => s + e.effectif, 0);

        /* L'ANCIENNETÉ ARRIVE EN CHAÎNE, PAS EN NOMBRE. `round(..., 1)` rend un
           NUMERIC, et node-postgres rend tout NUMERIC en chaîne pour ne pas
           perdre de précision. Or fmtNumber laisse passer sans rien faire ce
           qui n'est pas un nombre — c'est écrit dans son en-tête — donc la
           page affichait « 11.3 mois », avec un point, là où la maquette écrit
           « 11,1 mois ». On convertit avant de formater. */
        const mois = v => {
          const n = Number(v);
          return v == null || v === '' || !Number.isFinite(n) ? '-' : `${fmtNumber(n)} mois`;
        };

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
              {/* DEUX CARTES COMPLÉMENTAIRES, et c'est pour cela qu'elles se
                  posent ensemble : placé + interne = total, par construction.
                  CEPREMIUM est compté comme CLIENT depuis l'arbitrage du 16/10,
                  donc ses collaborateurs sont placés et non internes. Les
                  descriptions sont celles de la maquette du 15/10. */}
              <KPICard
                label="Effectif placé"
                value={fmtNumber(effectifPlace)}
                unit=" collaborateurs"
                compare={compareResult
                  ? compareValueText(effectifPlace, compareResult.effectifPlace, comparePeriodKey)
                  : null}
                trend={{ dir: 'neutral', text: `En mission chez un client · ${part(effectifPlace)} % de l’effectif` }}
              />
              <KPICard
                label="Effectif interne"
                value={fmtNumber(effectifInterne)}
                unit=" collaborateurs"
                compare={compareResult
                  ? compareValueText(effectifInterne, compareResult.effectifInterne, comparePeriodKey)
                  : null}
                trend={{ dir: 'neutral', text: 'Core team, devs, commerciaux' }}
              />
              {/* La quatrième tuile reste vide, voir l'en-tête du fichier. */}
              {/* Sans `compare`, KPICard annonce « Calcul en cours… » puis
                  « Comparaison indisponible » au bout d'un délai. Or rien ne
                  calcule ici : la tuile est vide par décision de Clémence, qui
                  a sorti le vivier de cette rangée sans la combler. On le dit
                  tout de suite plutôt que de promettre un chiffre qui ne
                  viendra pas. */}
              <KPICard
                label="Indicateur à définir"
                value="—"
                compare={{ dir: 'neutral', text: 'Comparaison indisponible' }}
                trend={{ dir: 'neutral', text: 'Le vivier passe plus bas, détaillé par type de mission' }}
              />
            </div>

            {/* L'ÉVOLUTION EST POSÉE ICI, SOUS LES QUATRE TUILES, et pas dans
                une section « Évolution des effectifs » à elle. Demande de
                Jimmy du 16/10, et elle se tient : la courbe est la lecture
                dans le temps des mêmes chiffres que les tuiles, pas un autre
                sujet. Les deux barres mensuelles sont les mêmes flux que ceux
                annoncés sous la première tuile, étalés sur six mois.

                Son chargement est indépendant de celui des tuiles, voir
                useRhEvolution : la carte se remplit après elles. */}
            <EvolutionEffectifs mois={6} />

            <SectionLabel>Répartition des collaborateurs de l’agence</SectionLabel>

            {/* CARTE POSÉE LE 16/10, sur la maquette de Clémence : camembert à
                gauche, tableau à droite, le total au cœur de l'anneau.
                On reprend le DonutChart du dashboard commercial tel quel,
                variante 'donut' : anneau, tranche dominante détachée, tri
                décroissant interne. Les parts ne sont PAS écrites dans les
                tranches (showDataLabels={false}) parce que le tableau les
                donne déjà à côté, chiffrées ; les répéter sur le cercle fait
                doublon et surcharge une tranche de 3 %.

                LE TOTAL AU CENTRE EST CELUI DES TRANCHES, pas effectifTotal.
                Les deux sont égaux aujourd'hui, et doivent le rester : si un
                jour ils divergent, c'est que la route a cessé de rendre une
                partition, et il vaut mieux que le cercle le montre plutôt
                qu'un chiffre arrondi le cache. */}
            <div className={styles.deuxCol}>
            <Card title="Répartition par type de contrat">
              <div className={styles.donutEtTable}>
                <DonutChart
                  variant="donut"
                  data={contrats.map(c => c.effectif)}
                  labels={contrats.map(c => c.type_contrat)}
                  colors={contrats.map((_, i) => COULEURS_CONTRAT[i % COULEURS_CONTRAT.length])}
                  height={196}
                  centerValue={totalContrats}
                  centerLabel="collaborateurs"
                  tooltip={(label, value, pct) =>
                    `${label} : ${value} collaborateur${value > 1 ? 's' : ''} (${fmtPourcentage(pct)})`}
                  showDataLabels={false}
                />
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th>Type de contrat</th><th>Effectif</th><th>Ancienneté moy.</th><th>Part</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contrats.map((c, i) => (
                      <tr key={c.type_contrat}>
                        <td>
                          <span className={styles.libelle}>
                            <span
                              className={styles.puce}
                              style={{ background: COULEURS_CONTRAT[i % COULEURS_CONTRAT.length] }}
                            />
                            {c.type_contrat}
                          </span>
                        </td>
                        <td className={styles.num}>{fmtNumber(c.effectif)}</td>
                        <td className={styles.num}>{mois(c.anciennete_mois)}</td>
                        <td className={styles.num}>{fmtPourcentage(partPct(c.effectif, totalContrats))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* RÉPARTITION PAR CLIENT, posée à droite des contrats comme sur
                la maquette du 15/10.

                MÊME PÉRIMÈTRE QUE TOUTE LA SECTION, les 74 placés. La carte
                n'écartait jusqu'ici que l'entité « MA » et rangeait donc
                « MA (Nael) », un développeur interne, parmi les clients. Trois
                cartes du même bloc comptaient deux populations différentes, ce
                qui ne se voit pas à l'œil et ne s'explique pas en séance.
                Corrigé côté route le 16/10, l'écart valait une personne.

                QUATRE LIGNES ET UN RESTE, comme la maquette. Le portefeuille
                compte trente-six clients : les lister tous ferait une carte
                trois fois plus haute que sa voisine, pour un détail que
                personne ne lit en séance. Le reste est chiffré dessous, il
                n'est pas caché. */}
              <Card title="Répartition par client">
                <table className={styles.tbl}>
                  <thead>
                    <tr><th>Client</th><th>Effectif</th><th>Ancienneté moy.</th><th>Part</th></tr>
                  </thead>
                  <tbody>
                    {entites.slice(0, 4).map(e => (
                      <tr key={e.entite}>
                        <td>{e.entite}</td>
                        <td className={styles.num}>{fmtNumber(e.effectif)}</td>
                        <td className={styles.num}>{mois(e.anciennete_mois)}</td>
                        <td className={styles.num}>{fmtPourcentage(partPct(e.effectif, totalClients))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {entites.length > 4 && (
                  <div className={styles.mention}>
                    {fmtNumber(entites.length - 4)} autres clients identifiés,{' '}
                    {fmtNumber(entites.slice(4).reduce((s, e) => s + e.effectif, 0))} collaborateurs.
                  </div>
                )}
              </Card>
            </div>

            {/* EFFECTIF PAR DÉPARTEMENT, posé le 16/10.
                Il vivait dans une section « La composition de l'agence » sur la
                maquette ; Jimmy a demandé qu'il rejoigne celle-ci, et ça se
                tient : c'est une répartition des collaborateurs de plus, au
                même titre que les contrats et les clients.

                PLEINE LARGEUR, parce que la rangée du dessus est prise par les
                deux cartes de la maquette et qu'une troisième carte à mi-chemin
                laisserait un trou. C'est aussi la forme qu'elle avait sur la
                maquette, dans sa section d'origine.

                LE PÉRIMÈTRE EST PLUS ÉTROIT QUE CELUI DE LA PAGE, et c'est le
                sous-titre de la maquette qui l'impose. La somme des cinq barres
                fait l'effectif PLACÉ, 74 au 30/09, et non l'effectif total, 97.
                On l'écrit sous la carte plutôt que de laisser quelqu'un
                additionner les barres et s'étonner. */}
            <Card title="Effectif par département">
              <div className={styles.sousTitre}>
                Uniquement l’effectif placé, en mission chez un client
              </div>
              {familles.map(f => (
                <MotifBar
                  key={f.famille}
                  label={libelleFamille(f.famille)}
                  pct={partPct(f.effectif, totalFamilles)}
                  count={f.effectif}
                  fillColor="rgba(38,0,31,0.95)"
                />
              ))}
              <div className={styles.mention}>
                {fmtNumber(totalFamilles)} collaborateurs placés, soit l’effectif de la
                deuxième tuile. Les {fmtNumber(effectifInterne)} internes ne sont pas
                dans ces barres.
              </div>
            </Card>
          </div>
        );
      }}
    </Loader>
  );
}
