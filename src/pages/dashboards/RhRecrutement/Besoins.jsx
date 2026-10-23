import { useState } from 'react';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import ListeModale from '../../../components/ui/ListeModale';
import Loader from '../../../components/ui/Loader';
import DonutChart from '../../../components/ui/DonutChart';
import { useRhBesoins } from '../../../hooks/useRhData';
import { compareValueText, comparePtsText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber, partsAJustees, fmtPourcentage } from '../../../utils/formatNumber';
import styles from '../RhEffectifs/Rh.module.css';

/* Vue 1 du dashboard Recrutement, « Besoins et recrutements ».
 *
 * L'ORDRE DES QUATRE TUILES RACONTE LE CYCLE D'UN BESOIN, arbitrage de Jimmy
 * du 22/10 : ce qu'on nous demande, ce qu'on a réalisé, la part que cela
 * représente, et ce qui reste en cours. On lit la rangée de gauche à droite
 * comme une phrase, et chaque chiffre est explicité par celui d'à côté.
 *
 * LE TAUX EST COLLÉ AUX RÉALISÉS, et c'est le sens de la permutation du
 * 22/10 : « 41 réalisés » puis « 42 % » se lisent d'un seul mouvement, alors
 * qu'une tuile intercalée obligeait l'œil à faire l'aller-retour entre deux
 * nombres qui disent la même chose. L'arriéré ferme la rangée, à sa place : il
 * ne décrit pas ce qui a été fait mais ce qui attend.
 *
 * LE MOT « COMMANDE » NE PARAÎT PAS À L'ÉCRAN. Clémence ne l'aime pas, et elle
 * a raison sur le fond : une ligne du FCC est une commande au sens du
 * classeur, mais ce que lit l'équipe RH est un BESOIN à pourvoir. Le mot reste
 * dans le code et dans la base, où il désigne la ligne source, et disparaît de
 * l'interface.
 *
 * PAS DE TUILE POUR LE TAUX DES PLUS DE 15 JOURS, retirée le 22/10 : « je ne
 * vois pas l'importance de dédier une carte au taux de besoins ouverts depuis
 * plus de 15 jours ». Le compte vit maintenant dans la description des besoins
 * en cours, qui est son contexte naturel — c'est parmi eux qu'un besoin peut
 * traîner, et nulle part ailleurs.
 *
 * LES QUATRE CATÉGORIES PARTITIONNENT, c'est-à-dire que réalisés, en cours,
 * annulés et clos sans recrutement font exactement le total demandé. Deux
 * commandes portent à la fois « Annuler » et « En poste » : sans un ordre de
 * priorité elles seraient comptées deux fois. Le détail est dans l'en-tête de
 * la route, avec l'arbitrage qui fait primer l'annulation sur le placement.
 *
 * L'INVERSION DE COULEUR ne touche QUE « besoins en cours » : c'est le seul
 * des quatre chiffres qu'on veut voir baisser. Les besoins demandés qui
 * montent, c'est de l'activité ; les réalisés qui montent, c'est du travail
 * livré ; le taux qui monte, c'est mieux. L'arriéré qui monte, c'est le seul
 * mauvais signe de la rangée.
 *
 * LA PÉRIODE BORNE LA DATE DE COMMANDE, PAS L'ÉTAT : on compte, parmi les
 * besoins ARRIVÉS sur la période, ce qu'ils sont devenus AUJOURD'HUI. Le stock
 * à une date passée n'est pas calculable, le classeur ne portant aucune date
 * de changement de statut. */
/* CINQ LIGNES SUR LA CARTE, le reste en pop-up. Ce n'est pas un chiffre
   esthétique : c'est ce qui garde la carte de droite à la hauteur de celle de
   gauche, qui porte quatre barres. Sans plafond, une période large allongerait
   l'une et laisserait l'autre vide à côté. */
const CLIENTS_APERCU = 6;

/* PALETTE DU CAMEMBERT DES TRANCHES — des LITTÉRAUX, jamais `var(--myrtille)`.
 *
 * La règle est écrite en tête de la palette d'Effectifs.jsx et elle a déjà
 * coûté un bug muet : le canvas de Chart.js ne résout pas les variables CSS,
 * `ctx.fillStyle` ignore SILENCIEUSEMENT ce qu'il ne sait pas lire et garde la
 * couleur précédente, donc une tranche prend la teinte de sa voisine sans le
 * moindre avertissement.
 *
 * LA RAMPE SUIT L'ÂGE, du plus clair au plus foncé, et ce n'est pas une
 * décoration : l'ancienneté est une variable ORDONNÉE, pas une liste de
 * catégories sans rapport. Quatre couleurs indépendantes obligeraient à lire la
 * légende pour savoir laquelle est la mauvaise nouvelle ; une rampe la désigne
 * sans un mot. Le plus de 60 jours, qui est l'alerte, porte le myrtille, la
 * couleur la plus appuyée du dashboard.
 *
 * LE MÊME TABLEAU SERT AU DONUT ET AUX PASTILLES DU TABLEAU, une seule source
 * pour le cercle et sa légende — sans quoi les deux divergent au premier
 * changement (précédent ASUS). */
const COULEURS_TRANCHE = [
  'rgba(167,173,170,0.62)', // ciment        — moins de 15 jours
  'rgba(201,170,196,0.78)', // glycine       — 15 à 30 jours
  'rgba(116,81,110,0.72)',  // glycine encre — 30 à 60 jours
  'rgba(38,0,31,0.88)',     // myrtille      — plus de 60 jours
];

export default function Besoins() {
  const { result, compareResult, loading, error } = useRhBesoins();
  const { comparePeriodKey } = usePeriod();
  /* DÉCLARÉ ICI ET PAS DANS LE CORPS DU Loader : ce corps est une fonction que
     le Loader n'appelle QUE s'il a fini de charger, donc un useState posé
     dedans serait un appel de hook conditionnel. Même raison que sur la page
     « Effectifs de l'agence ». */
  const [clientsOuverts, setClientsOuverts] = useState(false);

  return (
    <Loader loading={loading && !result} label="Chargement des besoins…" minHeight={220}>
      {() => {
        /* Trois états, jamais confondus : la source ne répond pas, la source
           répond vide, la source répond. */
        if (error) {
          return (
            <div className={styles.page}>
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Les besoins en cours</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>Les données du FCC ne répondent pas</div>
                  <div className={styles.etatTexte}>{error}</div>
                </div>
              </Card>
            </div>
          );
        }
        if (!result || result.demandes === 0) {
          return (
            <div className={styles.page}>
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Les besoins en cours</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>Aucun besoin sur cette période</div>
                  <div className={styles.etatTexte}>
                    Aucun besoin n’a été demandé entre ces deux dates. Si la page
                    reste vide sur toutes les périodes, le classeur FCC n’est pas
                    chargé : <code>scripts/ingest-fcc-fichier.js</code>.
                  </div>
                </div>
              </Card>
            </div>
          );
        }

        const {
          demandes, realises, enCours, enCours15j,
          annules, closSansRecrutement, postesDemandes, sansProfil, clients, tauxPourvu,
          tranches, parClient,
        } = result;
        const s = n => (n > 1 ? 's' : '');

        /* LES PARTS DES TRANCHES SONT CALCULÉES ENSEMBLE, pas une par une :
           les quatre font exactement le stock des besoins en cours, donc la
           colonne doit tomber sur 100. Avec un arrondi ligne à ligne, août à
           octobre affichait 36 + 36 + 0 + 29 = 101 %. Voir partsAJustees. */
        const partsTranches = partsAJustees(tranches.map(t => t.besoins));

        /* Le sous-titre de la première tuile dit d'abord les POSTES, quand ils
           diffèrent des besoins : une commande peut en porter plusieurs, et
           sans cette ligne un lecteur qui compare au plan de recrutement ne
           retrouve pas ses comptes. Jamais un total incomplet : si une
           commande n'a pas de `# PROFIL`, supposer 1 serait inventer.
           À défaut, il dit le nombre d'ENTITÉS, qui apprend quelque chose. Il
           ne doit en aucun cas répéter le libellé de la tuile. */
        const postes = sansProfil === 0 && postesDemandes !== demandes
          ? `${fmtNumber(postesDemandes)} postes à pourvoir`
          : `Sur ${fmtNumber(clients)} client${s(clients)}`;

        /* Le même tableau sert la carte et la pop-up, avec un jeu de lignes
           différent. L'écrire deux fois, c'est prendre le risque qu'ils
           divergent à la première colonne ajoutée. */
        const tableauClients = lignes => (
          /* LES COLONNES SONT EXACTEMENT LES QUATRE TUILES DE LA RANGÉE,
             dans leur ordre, arbitrage de Jimmy du 22/10 : demandés,
             réalisés, taux de pourvus, en cours. Le tableau est la même phrase
             que la rangée, répétée client par client, et il ne dit RIEN DE
             PLUS — l'ancienneté qui y figurait est partie dans le détail par
             besoin de la vue 2, où elle se lit sans agrégation.
             La planche 13 les posait dans l'ordre inverse — en cours d'abord,
             puis les recrutements — et l'œil devait repartir en arrière pour
             relier un tableau à la phrase qu'il venait de lire au-dessus. Le
             tableau se lit maintenant dans le même sens que la rangée, et le
             taux est COLLÉ aux réalisés dont il est le pourcentage, comme sur
             les tuiles.

             « BESOINS RÉALISÉS » ET NON « RECRUTEMENTS » : c'est le même mot
             que la tuile, pour la même mesure, et le classeur n'a pas de
             notion de recrutement distincte du besoin pourvu.

             LES DEUX PARTS SE LISENT SUR LES BESOINS DEMANDÉS DU CLIENT,
             la même base que le taux de pourvus de la tuile. Elles ne se
             complètent donc PAS à 100 % : ce qui manque est annulé ou clos
             sans recrutement. Deux bases différentes dans une même rangée
             seraient pires, on ne saurait plus de quoi chaque part est la
             part.

             LE TAUX ET LES RÉALISÉS SORTENT DE LA MÊME SOURCE, le statut
             « En poste ». La maquette affichait pour REGARD INC « 5
             recrutements » et « 0 % pourvu » sur la même ligne, parce que ses
             deux colonnes lisaient deux colonnes différentes du classeur. Ici
             elles ne peuvent plus se contredire. */
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th>Client</th>
                <th className={styles.num}>Besoins demandés</th>
                <th className={styles.num}>Besoins réalisés</th>
                <th className={styles.num}>Besoins en cours</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(e => (
                <tr key={e.entite}>
                  <td>{e.entite}</td>
                  <td className={styles.num}>{fmtNumber(e.demandes)}</td>
                  <td className={styles.num}>
                    <span className={styles.valeurBrute}>{fmtNumber(e.realises)}</span>
                    <span className={styles.partSuffixe}>{e.demandes > 0 ? `${Math.round((100 * e.realises) / e.demandes)} %` : '-'}</span>
                  </td>
                  <td className={styles.num}>
                    <span className={styles.valeurBrute}>{fmtNumber(e.en_cours)}</span>
                    <span className={styles.partSuffixe}>{e.demandes > 0 ? `${Math.round((100 * e.en_cours) / e.demandes)} %` : '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

        return (
          <div className={styles.page}>
            <SectionLabel badge="Onglet Suivi de commande RH Q2">Les besoins en cours</SectionLabel>
            <div className={styles.kpiGrid}>

              <KPICard
                label="Besoins demandés"
                value={fmtNumber(demandes)}
                unit={` besoin${s(demandes)}`}
                compare={compareResult
                  ? compareValueText(demandes, compareResult.demandes, comparePeriodKey)
                  : null}
                trend={{ dir: 'neutral', text: postes }}
              />

              {/* Le sous-titre porte ce qui N'A PAS abouti, parce que c'est le
                  complément direct des réalisés et que sans lui la rangée ne
                  se recompose pas : demandés = réalisés + en cours + annulés +
                  clos sans recrutement. */}
              <KPICard
                label="Besoins réalisés"
                value={fmtNumber(realises)}
                unit={` besoin${s(realises)}`}
                compare={compareResult
                  ? compareValueText(realises, compareResult.realises, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `${fmtNumber(annules)} annulé${s(annules)}, ${fmtNumber(closSansRecrutement)} clos sans recrutement`,
                }}
              />

              {/* LE TAUX SUIT IMMÉDIATEMENT LES RÉALISÉS, permutation demandée
                  par Jimmy le 22/10 : un chiffre et son pourcentage se lisent
                  côte à côte, « 41 réalisés, soit 42 % ». Les séparer par
                  l'arriéré obligeait l'œil à sauter une tuile pour relier deux
                  nombres qui disent la même chose. */}
              <KPICard
                label="Taux de besoins pourvus"
                value={tauxPourvu == null ? '-' : fmtNumber(tauxPourvu)}
                unit={tauxPourvu == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxPourvu, compareResult.tauxPourvu, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `${fmtNumber(realises)} réalisé${s(realises)} sur ${fmtNumber(demandes)} demandé${s(demandes)}`,
                }}
              />

              {/* SEULE TUILE INVERSÉE de la rangée, et elle la ferme : un
                  arriéré qui baisse est une bonne nouvelle, la couleur doit
                  virer au vert. Le paramètre n'inverse que la couleur, la
                  flèche suit le chiffre. */}
              <KPICard
                label="Besoins en cours"
                value={fmtNumber(enCours)}
                unit={` besoin${s(enCours)}`}
                compare={compareResult
                  ? compareValueText(enCours, compareResult.enCours, comparePeriodKey, true)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: enCours === 0
                    ? 'Aucun besoin en attente'
                    : enCours15j === 0
                      ? 'Aucun ne dépasse 15 jours'
                      : `Dont ${fmtNumber(enCours15j)} depuis plus de 15 jours`,
                }}
              />

            </div>

            {/* LES DEUX BLOCS CÔTE À CÔTE, comme sur la planche 13 et comme la
                paire contrats / clients du Suivi des effectifs. Empilés, ils
                obligeaient à faire défiler pour relier l'âge du stock aux
                clients qui le portent, alors que c'est la même question posée
                deux fois : qu'est-ce qui traîne, et chez qui.

                LES DEUX CARTES ONT LA MÊME HAUTEUR par construction : les
                éléments d'une grille s'étirent sur la hauteur de leur rangée.
                C'est pour cela que le tableau est PLAFONNÉ À CINQ LIGNES et
                que le reste part en pop-up — sans plafond, une période large
                allongerait la carte de droite et laisserait la gauche vide. */}
            <SectionLabel>Analyse de l’ancienneté</SectionLabel>
            <div className={`${styles.deuxCol} ${styles.rangeeAnciennete}`}>

              {/* CAMEMBERT ET NON PLUS QUATRE BARRES, demande de Jimmy du
                  22/10, au modèle de « Répartition du revenu par type de
                  mission » du dashboard commercial : même composant, même
                  variante 'half-rose'. Ce que les barres disaient mal ici,
                  c'est que les quatre tranches forment un TOUT — le stock des
                  besoins en attente, découpé par âge. Un camembert le dit par
                  sa forme ; quatre barres indépendantes laissaient croire à
                  quatre mesures sans rapport.

                  LE TABLEAU EST À DROITE DU GRAPHE, comme sur le dashboard
                  commercial. Il est passé dessous puis revenu à côté le même
                  jour, à la demande de Jimmy, et l'essai valait la peine : un
                  demi-camembert est DEUX FOIS PLUS LARGE QUE HAUT, donc empilé
                  il tassait son cercle en haut d'une carte devenue très haute.
                  Côte à côte, les deux occupent la même bande et la carte
                  retombe à la hauteur de son tableau — ce qui laisse la place
                  d'allonger la liste des clients juste à côté. Trois colonnes
                  seulement ici, contre quatre sur la carte des contrats : elles
                  tiennent dans ce qui reste.
                  SUR MOBILE le tableau repasse dessous, sous 760 px : deux
                  colonnes y seraient illisibles.

                  LES QUATRE TRANCHES SONT TOUJOURS LISTÉES, même à zéro.
                  Celle de 30 à 60 jours est vide sur toutes les périodes
                  mesurées le 22/10 : la masquer donnerait trois lignes et
                  laisserait croire que la tranche n'existe pas, alors que ce
                  trou dit quelque chose du renouvellement du stock. Le cercle,
                  lui, ne dessine rien pour une tranche vide — c'est le tableau
                  qui porte le zéro, à sa place.

                  LES PARTS SOMMENT À 100 par construction (partsAJustees, plus
                  fort reste) et non par arrondi de chaque ligne : les quatre
                  tranches font exactement le stock, une colonne à 101 % ferait
                  douter du reste du tableau. Le prix est qu'une part peut
                  tomber un point sous son propre rapport ; les effectifs sont
                  dans la colonne d'à côté, donc rien n'est caché. */}
              <Card title="Besoins en cours par tranche d’ancienneté">
                {enCours === 0 ? (
                  <div className={styles.etat}>
                    <div className={styles.etatTexte}>
                      Aucun besoin n’est en attente sur cette période.
                    </div>
                  </div>
                ) : (
                  <div className={styles.donutEtTranches}>
                    <DonutChart
                      variant="half-rose"
                      data={tranches.map(t => t.besoins)}
                      labels={tranches.map(t => t.libelle)}
                      colors={tranches.map((_, i) => COULEURS_TRANCHE[i])}
                      height={192}
                      tooltip={(label, value, pct) =>
                        `${label} : ${value} besoin${value > 1 ? 's' : ''} en cours (${fmtPourcentage(pct)})`}
                    />
                    <table className={styles.tbl}>
                      <thead>
                        <tr>
                          <th>Ancienneté</th>
                          <th className={styles.num}>Besoins</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tranches.map((t, i) => (
                          <tr key={t.cle}>
                            <td>
                              <span className={styles.libelle}>
                                <span
                                  className={styles.puce}
                                  style={{ background: COULEURS_TRANCHE[i] }}
                                />
                                {t.libelle}
                              </span>
                            </td>
                            <td className={styles.num}>
                              <span className={styles.valeurBrute}>{fmtNumber(t.besoins)}</span>
                              <span className={styles.partSuffixe}>{fmtPourcentage(partsTranches[i])}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* LE SUIVI PAR ENTITÉ REPREND LA PHRASE DE LA RANGÉE :
                  demandés, réalisés, en cours. S'y ajoute la seule chose qu'un
                  tableau peut dire et qu'une tuile ne peut pas, l'âge du plus
                  ancien besoin qui attend chez ce client.

                  PAS DE COLONNE DE TAUX, volontairement. « 33 % » seul pose le
                  même problème de lisibilité que sur les tuiles, et le couple
                  réalisés / demandés le donne déjà, lisible et vérifiable. */}
              <Card title="Suivi des besoins par prospects/clients">
                {parClient.length === 0 ? (
                  <div className={styles.etat}>
                    <div className={styles.etatTexte}>
                      Aucun client n’a de besoin en attente sur cette période.
                    </div>
                  </div>
                ) : (
                  <div className={styles.corpsEtire}>
                    {tableauClients(parClient.slice(0, CLIENTS_APERCU))}
                    {/* LE BOUTON EST COLLÉ AU BAS DE LA CARTE, et non au bas du
                        tableau : les deux cartes de la rangée ont la même
                        hauteur par construction mais pas le même contenu, et un
                        bouton flottant au milieu du blanc donne l'air d'un
                        gabarit cassé. `margin-top: auto` le pose sur le bord bas
                        quelle que soit la longueur de la liste. */}
                    {parClient.length > CLIENTS_APERCU && (
                      <div className={styles.piedCarte}>
                        <button
                          type="button"
                          className={styles.voirPlus}
                          onClick={() => setClientsOuverts(true)}
                        >
                          Voir les {fmtNumber(parClient.length)} clients
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {clientsOuverts && (
              <ListeModale
                titre="Suivi des besoins par prospects/clients"
                sousTitre={
                  `${fmtNumber(parClient.length)} client${s(parClient.length)} avec au moins un besoin en attente`
                  + ` · ${fmtNumber(enCours)} besoin${s(enCours)} en cours`
                }
                onClose={() => setClientsOuverts(false)}
              >
                {tableauClients(parClient)}
              </ListeModale>
            )}
          </div>
        );
      }}
    </Loader>
  );
}
