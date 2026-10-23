import { useState } from 'react';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import ListeModale from '../../../components/ui/ListeModale';
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
 * ET LE VIVIER NE REVIENDRA PAS SUR CETTE PAGE. Arbitrage de Jimmy du 16/10,
 * qui tient à la définition même des deux mots : le vivier, ce sont des
 * CANDIDATS, des gens que l'agence n'emploie pas. L'effectif, ce sont des
 * collaborateurs en poste. Les mêler ferait gonfler l'effectif de personnes
 * qui ne travaillent pas ici. Le vivier appartient à la partie RECRUTEMENT, et
 * c'est là qu'il sera traité.
 * La table rh_vivier reste donc vide et sans ingestion, non par oubli mais
 * parce que ce n'est pas la source de cet écran.
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
  /* DÉCLARÉ ICI ET PAS DANS LE CORPS DU Loader. Ce corps est une fonction
     passée en enfant, que le Loader n'appelle QUE s'il a fini de charger : un
     useState posé dedans serait un appel de hook conditionnel, et React s'en
     plaindrait dès le premier chargement. */
  const [clientsOuverts, setClientsOuverts] = useState(false);
  /* La bascule des départements. FERMÉE PAR DÉFAUT, c'est-à-dire sur les seuls
     placés : c'est le périmètre que la maquette demande en sous-titre, et
     l'ouvrir d'office ferait mentir ce sous-titre au premier coup d'œil. */
  const [avecInternes, setAvecInternes] = useState(false);

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

        const { effectifTotal, effectifPlace, effectifInterne, contrats, entites, familles, famillesTous } = result;
        const part = n => (effectifTotal ? Math.round((n / effectifTotal) * 100) : 0);
        /* Le dénominateur du camembert est la somme de ses propres tranches,
           pas effectifTotal. Voir la note sur la carte : les deux sont égaux
           tant que la route rend une partition, et l'écart doit se voir. */
        const totalContrats = contrats.reduce((s, c) => s + c.effectif, 0);
        /* Dénominateur des barres de département : la somme des barres
           elles-mêmes, qui vaut l’effectif PLACÉ et non l’effectif total.
           Prendre effectifTotal ici donnerait des parts qui ne font pas
           100 %, sans que rien ne le signale. */
        /* `famillesTous` peut manquer : une API déployée avant le 16/10 ne le
           rend pas. On retombe alors sur les placés plutôt que de planter, et
           la bascule n'est tout simplement pas proposée. */
        const famillesAffichees = avecInternes && famillesTous ? famillesTous : familles;
        const totalFamilles = famillesAffichees.reduce((s, f) => s + f.effectif, 0);
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
            <SectionLabel badge="Sheet LISTE DES COLLABORATEURS">L’agence Mon Ambassadeur</SectionLabel>
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
                  viendra pas.

                  LA LIGNE DE DÉTAIL ANNONÇAIT « le vivier passe plus bas »,
                  ce qui était faux deux fois : rien ne figurait plus bas, et
                  le vivier n'a de toute façon pas sa place dans un effectif,
                  voir l'en-tête du fichier. Elle ne renvoie donc plus nulle
                  part : une tuile en attente le dit, elle ne promet rien. */}
              <KPICard
                label="Indicateur à définir"
                value="—"
                compare={{ dir: 'neutral', text: 'Comparaison indisponible' }}
                trend={{ dir: 'neutral', text: 'Place réservée sur la maquette, indicateur non encore arrêté' }}
              />
            </div>

            {/* L'ÉVOLUTION EST POSÉE ICI, SOUS LES QUATRE TUILES, et pas dans
                une section « Évolution des effectifs » à elle. Demande de
                Jimmy du 16/10, et elle se tient : la courbe est la lecture
                dans le temps des mêmes chiffres que les tuiles, pas un autre
                sujet.

                LES BARRES D'ENTRÉES ET DE SORTIES ONT ÉTÉ RETIRÉES D'ICI le
                même jour. Elles y cohabitaient avec la courbe, ce qui forçait
                deux échelles sur un seul dessin — l'effectif tourne autour de
                90, les mouvements autour de 10 — et noyait un graphique de
                mouvements dans une page qui parle d'effectif. Elles vivent
                désormais sur « Évolution et mouvements », sous le nom
                « Évolution mensuelle des entrées et sorties ». Les deux lisent
                la même route, /api/rh/evolution.

                Son chargement est indépendant de celui des tuiles, voir
                useRhEvolution : la carte se remplit après elles. */}
            <EvolutionEffectifs />

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
                  /* Sans rappels filaires, la marge de 32 px ne sert plus qu’à
                     rétrécir le trou central, où le mot « collaborateurs » ne
                     tenait plus. Voir l’en-tête de DonutChart. */
                  paddingLateral={8}
                />
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th>Type de contrat</th><th>Effectif</th><th>Ancienneté moy.</th>
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
                        <td className={styles.num}>
                          <span className={styles.valeurBrute}>{fmtNumber(c.effectif)}</span>
                          <span className={styles.partSuffixe}>{fmtPourcentage(partPct(c.effectif, totalContrats))}</span>
                        </td>
                        <td className={styles.num}>{mois(c.anciennete_mois)}</td>
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
                    <tr><th>Client</th><th>Effectif</th><th>Ancienneté moy.</th></tr>
                  </thead>
                  <tbody>
                    {entites.slice(0, 4).map(e => (
                      <tr key={e.entite}>
                        <td>{e.entite}</td>
                        <td className={styles.num}>
                          <span className={styles.valeurBrute}>{fmtNumber(e.effectif)}</span>
                          <span className={styles.partSuffixe}>{fmtPourcentage(partPct(e.effectif, totalClients))}</span>
                        </td>
                        <td className={styles.num}>{mois(e.anciennete_mois)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* LE VERBE D'ABORD, LE NOMBRE ENSUITE. Ce pied de carte
                    disait « 32 autres clients identifiés, 108 collaborateurs »
                    suivi d'une flèche : une phrase descriptive ne se lit pas
                    comme un bouton, et rien n'annonçait qu'un clic ouvrirait
                    la liste. On reprend la pastille du dashboard commercial,
                    « Voir les N … », pour que l'action soit lisible avant le
                    clic (Jimmy, 22/10). */}
                {entites.length > 4 && (
                  <button
                    type="button"
                    className={styles.voirPlus}
                    onClick={() => setClientsOuverts(true)}
                  >
                    Voir les {fmtNumber(entites.length)} clients
                  </button>
                )}

                {/* LA LISTE COMPLÈTE EN POP-UP, posée le 16/10.
                    La carte ne montre que quatre clients sur trente-six pour
                    garder une hauteur stable à côté du camembert : c'est le
                    raisonnement écrit en tête de ListeModale, une carte dont la
                    hauteur dépend de la période déforme toute la page. Le reste
                    n'est pas perdu pour autant, il vit ici.

                    Le pied de carte sert de déclencheur plutôt qu'un bouton de
                    plus : c'est lui qui annonce le reste, c'est donc lui qu'on
                    a envie de cliquer. */}
                {clientsOuverts && (
                  <ListeModale
                    titre="Répartition par client"
                    sousTitre={
                      `${fmtNumber(entites.length)} clients · ${fmtNumber(totalClients)} collaborateurs placés`
                      + ' · effectif à la fin de la période'
                    }
                    onClose={() => setClientsOuverts(false)}
                  >
                    <table className={styles.tbl}>
                      <thead>
                        <tr><th>Client</th><th>Effectif</th><th>Ancienneté moy.</th></tr>
                      </thead>
                      <tbody>
                        {entites.map(e => (
                          <tr key={e.entite}>
                            <td>{e.entite}</td>
                            <td className={styles.num}>
                              <span className={styles.valeurBrute}>{fmtNumber(e.effectif)}</span>
                              <span className={styles.partSuffixe}>{fmtPourcentage(partPct(e.effectif, totalClients))}</span>
                            </td>
                            <td className={styles.num}>{mois(e.anciennete_mois)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ListeModale>
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
            <Card
              title="Effectif par département"
              action={famillesTous && (
                /* LA BASCULE DES INTERNES, posée le 16/10.
                   Le libellé ne change jamais, seul le voyant s'allume : un
                   bouton dont le texte bascule entre deux mots oblige à relire
                   pour savoir s'il annonce l'état courant ou l'action à venir.
                   aria-pressed dit l'état aux lecteurs d'écran, qui ne voient
                   pas le voyant. */
                <button
                  type="button"
                  className={`${styles.bascule} ${avecInternes ? styles.basculeActive : ''}`}
                  aria-pressed={avecInternes}
                  onClick={() => setAvecInternes(v => !v)}
                  title={avecInternes
                    ? 'Masquer les collaborateurs internes'
                    : 'Inclure les collaborateurs internes'}
                >
                  Internes
                  {/* aria-hidden : l'état est déjà porté par aria-pressed sur
                      le bouton. Le « ON / OFF » écrit dans la pastille est un
                      doublon visuel, utile à l'œil, bruyant au lecteur
                      d'écran. */}
                  <span className={styles.basculeInterrupteur} aria-hidden="true">
                    <span className={styles.basculeEtat}>{avecInternes ? 'ON' : 'OFF'}</span>
                    <span className={styles.basculeCurseur} />
                  </span>
                </button>
              )}
            >
              {/* RIEN AU-DESSUS DES BARRES. Le périmètre s'écrivait ici, en
                  sous-titre ; il est descendu en pied de carte le 20/10, à la
                  demande de Jimmy : aucun commentaire ne doit ouvrir un
                  graphique. Même geste que sur la carte « Évolution annuelle »
                  de la page 2, pour la même raison. */}
              <div className={styles.barres}>
                {/* DEUX EN-TÊTES, et seulement pour les deux dernières
                    colonnes : « 20,5 mois » après un « → 11 » ne dit pas de
                    quoi il s'agit, alors que le pourcentage et le nombre se
                    lisent seuls. Leur largeur est calée sur celle de MotifBar,
                    voir le contrat écrit des deux côtés. */}
                <div className={styles.barresEntete}>
                  <span className={styles.barresEnteteLib}>Ancienneté moy.</span>
                  <span className={styles.barresEnteteLib}>Durée moy. des missions</span>
                </div>
                {famillesAffichees.map(f => (
                  <MotifBar
                    key={f.famille}
                    label={libelleFamille(f.famille)}
                    pct={partPct(f.effectif, totalFamilles)}
                    count={f.effectif}
                    extras={[mois(f.anciennete_mois), mois(f.duree_mission_mois)]}
                    fillColor="rgba(38,0,31,0.95)"
                  />
                ))}
              </div>
              {/* LE PÉRIMÈTRE, ET RIEN D'AUTRE. Cette ligne disait auparavant
                  le total et le rapprochait de la tuile correspondante, en
                  prévenant que la bascule change l'ordre des départements :
                  Support client et Administratif s'échangent leur place,
                  parce que l'interne est surtout administratif et technique.
                  Retiré le 20/10 à la demande de Jimmy, en même temps que les
                  pieds de carte de la page 3.
                  CE QUI RESTE EST LE STRICT NÉCESSAIRE : la bascule a deux
                  états et les barres ne disent pas lequel est actif. Sans
                  cette ligne, rien ne distingue un effectif de 95 d'un
                  effectif placé de 73, et l'échange de rang entre deux
                  départements passerait pour un défaut d'affichage. */}
              <div className={styles.mention}>
                {avecInternes
                  ? 'Tout l’effectif, internes compris'
                  : 'Uniquement l’effectif placé, en mission chez un client'}
              </div>
            </Card>
          </div>
        );
      }}
    </Loader>
  );
}
