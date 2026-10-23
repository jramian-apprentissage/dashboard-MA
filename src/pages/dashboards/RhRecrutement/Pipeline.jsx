import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import ListeModale from '../../../components/ui/ListeModale';
import RechercheAvecSuggestions from '../../../components/ui/RechercheAvecSuggestions';
import DonutChart from '../../../components/ui/DonutChart';
import { libelleFamille } from '../../../data/familles';
import MotifBar from '../../../components/ui/MotifBar';
import BarreEtapes, { EnteteEtapes, libelleEtape } from '../../../components/ui/BarreEtapes';
import { useRhPipeline } from '../../../hooks/useRhData';
import { compareValueText, comparePtsText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber, partPct, fmtPourcentage } from '../../../utils/formatNumber';
import styles from '../RhEffectifs/Rh.module.css';

/* Chart.js s'enregistre par fichier dans ce projet, et seulement pour ce qu'on
   utilise : voir EvolutionEffectifs.jsx et Synthese.jsx. */
Chart.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip);

/* LITTERAUX, jamais `var(--abricot-encre)` : le canvas de Chart.js ne
   resout pas les variables CSS, il ignore SILENCIEUSEMENT ce qu il ne sait
   pas lire et garde la couleur precedente. La regle est deja ecrite en tete
   de la palette ASUS et elle a coute un bug muet. */
const C_MOYENNE = 'rgba(38,0,31,0.88)';     // myrtille
const C_MEDIANE = 'rgba(136,84,48,0.90)';   // encre abricot, la teinte de ce dashboard
const C_BESOINS = 'rgba(167,173,170,0.50)'; // ciment, en retrait derriere les courbes

/* '2026-04' → 'avr.', fabriqué en UTC. Un `new Date('2026-04')` est interprété
   en UTC puis réaffiché en heure locale, ce qui recule d'un mois à l'ouest de
   Greenwich et afficherait « mars » pour avril. Même fonction que dans
   EvolutionEffectifs, même raison. */
function libelleMois(ym) {
  const [a, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' });
}
/* '2026-09-24' -> '24/09/26'. Les dates arrivent en ISO depuis la route,
   format trie et sans ambiguite sur le fil, et se lisent a la francaise a
   l'ecran. */
function dateCourte(iso) {
  if (!iso) return '-';
  const [a, m, j] = iso.split('-');
  return `${j}/${m}/${a.slice(2)}`;
}

function libelleMoisLong(ym) {
  const [a, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, 1))
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/* Vue 2 du dashboard Recrutement, « Pipeline candidats et délais ».
 *
 * LA PAGE SUIT LES PLANCHES 14 ET 15 DE LA MAQUETTE, section par section et
 * tuile par tuile, dans leur ordre. Elle avait d'abord été recomposée en une
 * seule rangée de quatre, en mélangeant les deux planches et en écartant les
 * indicateurs les plus troués : c'était décider à la place de Jimmy et de
 * Clémence d'une mise en page qu'ils avaient arrêtée ensemble. La maquette est
 * la référence ; ce que la donnée ne permet pas se SIGNALE, il ne se supprime
 * pas.
 *
 * CE QUE LA DONNÉE PERMET MAL, ET QUI EST AFFICHÉ QUAND MÊME. Le délai pour
 * pourvoir un poste et son graphe d'évolution croisent l'ouverture de
 * recherche et la date de démarrage : trente paires exploitables sur
 * quatre-vingt-dix-huit. La maquette affichait déjà cet indicateur en
 * annonçant son effectif, « 10 sur 18 », « colonne remplie sur 4 commandes ».
 * On reprend cette convention : le chiffre, puis sur combien il repose.
 *
 * LES LIBELLÉS SONT CEUX QUE CLÉMENCE A VALIDÉS dans son mail du 30/09 :
 * « Durée moy. du recrutement » et non « d'un recrutement », « Délais et
 * pipeline de recrutement » pour la section qui s'appelait « time to fill et
 * candidats par client », et « besoin » au lieu de « commande » sur la
 * transformation, puisqu'elle demandait « si c'est pareil, mettre besoin ».
 *
 * L'INVERSION DE COULEUR suit une règle unique : on inverse quand le chiffre
 * mesure ce qu'on veut voir diminuer. Les deux délais et les besoins en cours
 * s'inversent. Les deux taux montent quand ça va mieux. Restent deux chiffres
 * dont aucun sens n'est bon en soi, les candidats en cours et les profils
 * présentés par besoin : leur couleur est NEUTRALISÉE plutôt que de leur faire
 * porter un jugement indéfendable. */
/* CINQ LIGNES SUR LA CARTE, le reste en pop-up. Trois jusqu'au 22/10, porté à
   cinq le même jour : à trois, la carte montrait les deux gros clients et une
   seule des dix-sept autres lignes, ce qui donnait à croire que le pipeline
   tenait en trois noms. */
/* UN BESOIN CLOS N'A PAS D'ANCIENNETÉ : il ne vieillit plus, et le classeur ne
   porte aucune date de clôture pour dire l'âge qu'il avait en s'arrêtant. La
   route rend donc NULL et la colonne écrit un tiret. */
/* LES COLONNES DE LA POP-UP, déclarées une fois : l'en-tête et le tri lisent
   la même liste, donc ils ne peuvent pas diverger. `valeur` sert au tri, et
   rend ce qui se compare — une chaîne pour du texte, un nombre pour un compte,
   la date ISO pour une date, qui se trie comme du texte sans conversion.

   `null` EST TOUJOURS REJETÉ EN FIN DE LISTE, dans les deux sens. Une cellule
   vide n'est ni le plus petit ni le plus grand : la ranger avec les zéros
   ferait passer onze besoins non renseignés pour onze besoins à zéro, ce que
   le tiret de la colonne s'emploie justement à éviter. */
const COLONNES = [
  { cle: 'entite', libelle: 'Client', valeur: d => d.entite },
  { cle: 'poste', libelle: 'Poste', valeur: d => d.poste },
  { cle: 'etape', libelle: 'Étape', valeur: d => d.etape },
  { cle: 'issue', libelle: 'Issue', valeur: d => ISSUES[d.issue] },
  { cle: 'dateCommande', libelle: 'Commande', num: true, valeur: d => d.dateCommande },
  { cle: 'echeanceR3', libelle: 'Échéance', num: true, valeur: d => d.echeanceR3 },
  { cle: 'ageJ', libelle: 'Ancienneté', num: true, valeur: d => d.ageJ },
  { cle: 'profilsDemandes', libelle: 'Besoin', num: true, valeur: d => d.profilsDemandes },
  { cle: 'presentes', libelle: 'Présentés', num: true, valeur: d => d.presentes },
  { cle: 'retenus', libelle: 'Retenus', num: true, valeur: d => d.retenus },
];

/* UNE COULEUR PAR TYPE DE MISSION, et surtout PAS une rampe : les cinq
   familles ne sont pas ordonnées, aucune n'est « plus » qu'une autre. Une rampe
   ferait lire une progression là où il n'y a que des catégories.

   LES CINQ TEINTES SONT CELLES DU DASHBOARD COMMERCIAL, qui découpe le revenu
   par les mêmes types de mission : deux écrans de la même maison qui parlent
   des mêmes cinq métiers ne peuvent pas les peindre différemment.

   ELLES SONT ICI LIÉES AU CODE, pas à la position dans le tableau. Sur le
   dashboard commercial la palette est indexée par rang, si bien qu'une famille
   change de couleur quand le classement change. Ici « Commercial » est jaune
   quoi qu'il arrive, ce qui est la seule façon de comparer deux périodes d'un
   coup d'œil.

   DES LITTÉRAUX, jamais `var(--soleil)` : le canvas de Chart.js ne résout pas
   les variables CSS et garde silencieusement la couleur précédente. */
const COULEURS_MISSION = {
  SO: 'rgba(255,249,147,0.95)', // soleil
  AV: 'rgba(38,0,31,0.80)',     // myrtille
  CS: 'rgba(196,135,106,0.85)', // terracotta
  IT: 'rgba(123,170,191,0.75)', // bleu
  DS: 'rgba(142,207,170,0.75)', // vert
};
/* Les commandes dont l'intitulé ne dit pas le métier. En ciment, la couleur du
   « reste » partout dans ce dépôt : elle ne se confond avec aucune famille. */
const COULEUR_A_CLASSER = 'rgba(167,173,170,0.50)';

const ISSUES = {
  en_cours: 'En cours',
  realise: 'Pourvu',
  annule: 'Annulé',
  clos_sans: 'Clos sans recrutement',
};

const CLIENTS_APERCU = 5;

export default function Pipeline() {
  const { result, compareResult, loading, error } = useRhPipeline();
  const { comparePeriodKey } = usePeriod();
  /* Déclaré ici et pas dans le corps du Loader : ce corps est une
     fonction que le Loader n'appelle QUE s'il a fini de charger, donc un
     useState posé dedans serait un appel de hook conditionnel. */
  const [clientsOuverts, setClientsOuverts] = useState(false);
  /* Recherche et tri de la pop-up. Ils vivent ici et non dans le corps du
     Loader, pour la même raison que `clientsOuverts` : ce corps n'est appelé
     qu'une fois le chargement fini, un useState posé dedans serait un appel de
     hook conditionnel.

     L'ORDRE PAR DÉFAUT EST CELUI DE LA ROUTE, client puis commande la plus
     récente : `cle: null` veut dire « ne touche à rien ». Un tri imposé dès
     l'ouverture ferait croire que la colonne triée est la plus importante. */
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState({ cle: null, sens: 'asc' });

  return (
    <Loader loading={loading && !result} label="Chargement du pipeline…" minHeight={220}>
      {() => {
        if (error) {
          return (
            <div className={styles.page}>
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Placement de profils</SectionLabel>
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
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Placement de profils</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>Aucun besoin sur cette période</div>
                  <div className={styles.etatTexte}>Aucun besoin n’a été demandé entre ces deux dates.</div>
                </div>
              </Card>
            </div>
          );
        }

        const {
          demandes,
          profilsDemandes, profilsDemandesN,
          presentesBrut, presentesBrutN,
          retenusBrut, retenusBrutN, tauxProfil,
          rechercheN, rechercheMoy, rechercheMed,
          presentationN, presentationMoy, presentationMed,
          pourvoirN, pourvoirMoy, pourvoirMed,
          delaiN, dansDelai, tauxDelai,
          evolution, candidatsParClient, detailsClients, parMission,
        } = result;
        const s = n => (n > 1 ? 's' : '');

        /* UNE CELLULE VIDE S'ÉCRIT « - », JAMAIS « 0 ». La distinction vient de
           la maquette, qui mettait déjà un tiret sur ses deux dernières lignes :
           « aucun profil retenu » est un résultat, « colonne non saisie » est une
           absence d'information. Les confondre ferait passer onze besoins non
           renseignés pour onze échecs. */
        const ouTiret = v => (v == null ? '-' : fmtNumber(v));

        /* Les lignes de la répartition, libellées et colorées une seule fois :
           le camembert, le tableau et l'infobulle lisent la même liste, donc ils
           ne peuvent pas se contredire. */
        /* LE `?? []` N'EST PAS DE LA COQUETTERIE. Le front et l'API se
           déploient séparément, Vercel d'un côté et Railway de l'autre : entre
           les deux mises en ligne, cette page reçoit une réponse qui n'a pas
           encore `parMission`. Sans garde, `.map` lève et la PAGE ENTIÈRE part
           en blanc — pas la carte, la page. Avec, la carte est vide une minute
           et le reste s'affiche. Vu en local le 22/10 pendant le redémarrage du
           serveur. */
        const missions = (parMission ?? []).map(m => ({
          ...m,
          libelle: m.cle ? libelleFamille(m.cle) : 'À classer',
          couleur: m.cle ? (COULEURS_MISSION[m.cle] || COULEUR_A_CLASSER) : COULEUR_A_CLASSER,
        }));
        const besoinsMissions = missions.reduce((n, m) => n + m.besoins, 0);

        /* LA NORMALISATION RETIRE LES ACCENTS avant de comparer : chercher
           « etendard » doit trouver « Étendard », et « telepro » doit trouver
           « Téléprospecteur ». Sans elle, la recherche échoue sur la moitié des
           intitulés de ce classeur. */
        const sansAccent = v => String(v || '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ').trim().toLowerCase();

        /* Les suggestions sont les valeurs réelles des deux colonnes
           cherchables, clients et postes mêlangés : on tape ce qu'on a en
           tête sans avoir à choisir d'abord dans quelle colonne chercher. */
        const suggestions = [
          ...new Set(detailsClients.flatMap(d => [d.entite, d.poste]).filter(Boolean)),
        ];

        const q = sansAccent(recherche);
        const filtrees = q.length === 0
          ? detailsClients
          : detailsClients.filter(d => sansAccent(d.entite).includes(q)
            || sansAccent(d.poste).includes(q));

        /* LE TRI NE MODIFIE PAS LE TABLEAU REÇU : `slice()` d'abord. `sort`
           trie en place, et trier `detailsClients` lui-même reviendrait à
           réécrire la réponse de la route sous les autres lectures de la page. */
        const colonne = COLONNES.find(c => c.cle === tri.cle);
        const lignesVisibles = !colonne ? filtrees : filtrees.slice().sort((a, b) => {
          const va = colonne.valeur(a);
          const vb = colonne.valeur(b);
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          const cmp = typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base' });
          return tri.sens === 'asc' ? cmp : -cmp;
        });

        const j = v => (v == null ? '-' : fmtNumber(v));
        /* Neutralise la couleur d'une comparaison sans toucher au chiffre ni à
           la flèche : pour les indicateurs dont aucun sens n'est bon en soi. */
        const sansJugement = c => (c ? { ...c, dir: 'neutral' } : c);
        /* Le volume de la fenêtre glissante, à ne pas confondre avec celui de
           la tuile, qui est borné à la cohorte. */
        const totalDemarrages = evolution.reduce((t, p) => t + p.n, 0);

        return (
          <div className={styles.page}>

            {/* ── « Candidatures et délais » : L'ENTONNOIR DES PROFILS ──
                Arbitrage de Jimmy du 22/10 : besoin en profils, profils
                présentés, profils retenus, taux de transformation. La rangée
                se lit comme une phrase, chaque tuile étant le reste de la
                précédente.

                LES SOMMES SONT BRUTES, donc le taux est la DIVISION VISIBLE
                des deux tuiles d'à côté, 62 sur 171. Le lecteur peut la
                refaire de tête. L'autre lecture, qui n'additionne que les
                besoins portant les deux colonnes, donnerait 47 % au lieu de
                36 % : plus pure, mais introuvable depuis les tuiles affichées.
                Chaque sous-titre dit donc sur combien de besoins sa somme
                repose.

                LES QUATRE TUILES DE DÉLAIS QUI OCCUPAIENT CETTE RANGÉE sont
                descendues en bas de page, en attendant que Jimmy dise où les
                placer. Elles ne sont pas supprimées : c'est sa consigne. */}
            <SectionLabel badge="Onglet Suivi de commande RH Q2">Placement de profils</SectionLabel>
            <div className={styles.kpiGrid}>

              <KPICard
                label="Besoin en profils"
                value={fmtNumber(profilsDemandes)}
                unit={` profil${s(profilsDemandes)}`}
                compare={compareResult
                  ? compareValueText(profilsDemandes, compareResult.profilsDemandes, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `Postes à pourvoir · sur ${fmtNumber(profilsDemandesN)} besoin${s(profilsDemandesN)} renseigné${s(profilsDemandesN)}`,
                }}
              />

              {/* Couleur neutralisée : présenter davantage de profils, c'est
                  plus de choix pour le client et plus de travail pour la même
                  place. Aucun des deux sens n'est bon en soi. */}
              <KPICard
                label="Profils présentés"
                value={fmtNumber(presentesBrut)}
                unit={` profil${s(presentesBrut)}`}
                compare={compareResult
                  ? sansJugement(compareValueText(presentesBrut, compareResult.presentesBrut, comparePeriodKey))
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `Présentés au client · sur ${fmtNumber(presentesBrutN)} besoin${s(presentesBrutN)} renseigné${s(presentesBrutN)}`,
                }}
              />

              <KPICard
                label="Profils retenus"
                value={fmtNumber(retenusBrut)}
                unit={` profil${s(retenusBrut)}`}
                compare={compareResult
                  ? compareValueText(retenusBrut, compareResult.retenusBrut, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: `Retenus par le client · sur ${fmtNumber(retenusBrutN)} besoin${s(retenusBrutN)} renseigné${s(retenusBrutN)}`,
                }}
              />

              <KPICard
                label="Taux de transformation de profil"
                value={tauxProfil == null ? '-' : fmtNumber(tauxProfil)}
                unit={tauxProfil == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxProfil, compareResult.tauxProfil, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: presentesBrut === 0
                    ? 'Aucun profil présenté sur la période'
                    : `${fmtNumber(retenusBrut)} retenu${s(retenusBrut)} sur ${fmtNumber(presentesBrut)} présenté${s(presentesBrut)}`,
                }}
              />
            </div>

            {/* LES CANDIDATS PAR CLIENT, DIRECTEMENT SOUS LA RANGÉE,
                demande de Jimmy du 22/10 : c'est le détail de l'entonnoir
                qu'on vient de lire, il se place donc contre lui et non deux
                sections plus bas.

                TROIS MESURES, LES MÊMES QUE LA RANGÉE — besoin en profils,
                présentés, retenus. La carte ne porte plus un seul chiffre mais
                rejoue l'entonnoir client par client, et se lit donc à la
                verticale des tuiles du dessus.

                LA BARRE N'EST PLUS UNE PART MAIS UN AVANCEMENT, et c'est le
                changement de fond du 22/10. Elle portait la part de candidats
                du client dans le total, ce qui comparait des clients entre eux ;
                elle porte maintenant les NEUF ÉTAPES du processus, R0 à R7 puis
                « En poste », et situe chaque client sur son propre parcours.
                La question posée n'est plus « qui pèse le plus » mais « qui est
                le plus près d'aboutir ».

                AUCUN POURCENTAGE SOUS LA BARRE, volontairement : « étape 6 sur
                9 » ne veut pas dire « 67 % du travail fait ». Les étapes n'ont
                ni la même durée ni la même difficulté, et le classeur ne les
                chronomètre pas.

                LE SURVOL PORTE LES POSTES, demandé le 22/10 : un client porte
                souvent plusieurs recrutements — REGARD INC en a cinq — et la
                ligne ne peut pas les nommer sans devenir un tableau. */}
            <Card title="Détails par prospects/clients">
              {candidatsParClient.length === 0 ? (
                <div className={styles.etat}>
                  <div className={styles.etatTexte}>
                    Aucun besoin n’a été demandé par un client sur cette période.
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.barres}>
                    <EnteteEtapes colonnes={['Besoin', 'Présentés', 'Retenus']} />
                    {candidatsParClient.slice(0, CLIENTS_APERCU).map(c => (
                      <BarreEtapes
                        key={c.entite}
                        label={c.entite}
                        etape={c.etape}
                        valeurs={[
                          ouTiret(c.profilsDemandes),
                          ouTiret(c.presentes),
                          ouTiret(c.retenus),
                        ]}
                      />
                    ))}
                  </div>
                  {/* LE BOUTON EST TOUJOURS LÀ, même quand la carte montre déjà
                      tous les clients, demande de Jimmy du 22/10. Il ne promet
                      plus « N clients » mais « voir plus », et c'est exact : la
                      pop-up porte DEUX COLONNES QUE LA CARTE N'A PAS, le poste
                      et l'étape en toutes lettres. Il y a donc toujours plus à
                      voir, même sur une période à deux clients — où le bouton
                      conditionnel privait justement de ce détail. */}
                  <button
                    type="button"
                    className={styles.voirPlus}
                    onClick={() => setClientsOuverts(true)}
                  >
                    Voir plus
                  </button>
                  {/* MENTION RACCOURCIE le 22/10 : quatre phrases sous une
                      carte, personne ne les lit. Ne restent que les deux
                      choses qu'on ne peut PAS deviner en regardant la carte —
                      ce que situe la barre, et qu'un tiret n'est pas un zéro.
                      Le reste (le survol, l'absence de pourcentage) se
                      découvre en survolant, ou ne change rien à la lecture. */}
                  <div className={styles.mention}>
                    La barre situe le besoin le plus avancé du client, de R0 à « En poste ».
                  </div>
                </>
              )}
            </Card>

            {/* ── Planche 14, la section des durées ──
                « Durée de recrutement » depuis le 22/10. Elle s'appelait
                « Délais et pipeline de recrutement », titre validé par Clémence
                le 30/09 — mais le pipeline a quitté la section le même jour,
                avec les étapes du workflow, et un titre qui annonce ce qui n'y
                est plus vaut moins qu'un titre exact. */}
            <SectionLabel>Durée de recrutement</SectionLabel>
            {/* LES QUATRE TUILES REVIENNENT ICI, à leur place dans la
                maquette. Elles avaient été poussées en bas de page le 22/10
                quand la première rangée est devenue l'entonnoir des profils,
                avec consigne de ne rien supprimer en attendant — « je te
                dirai où les mettre ». C'est ce bloc-ci : le mail de Clémence
                du 30/09 nomme ces quatre indicateurs ET ce titre de section
                dans la même phrase, « Candidats en cours de recrutement,
                Délai moy. pour pourvoir un poste, Durée moy. du recrutement,
                Taux de recrutements réalisés dans les délais ; le bloc
                s'intitule Délais et pipeline de recrutement ».

                ELLES PRÉCÈDENT LE GRAPHE, et pas l'inverse : le graphe trace
                le délai pour pourvoir un poste, c'est-à-dire la deuxième de
                ces tuiles dépliée dans le temps. On lit le chiffre, puis son
                histoire. */}
            {/* QUATRE DURÉES, TOUTES COMPTÉES DEPUIS LA DEMANDE, liste arrêtée
                par Jimmy le 22/10. C'est un changement de référence, pas un
                réglage : elles partaient de l'ouverture de recherche R0, une
                date que l'équipe RH POSE elle-même. Mesurer depuis elle, c'est
                mesurer le travail de recherche en excluant le temps mis à
                l'ouvrir. Le client, lui, compte à partir du jour où il a
                demandé — et la date de la commande est la seule du fichier
                remplie à 100 %.

                LES TROIS PREMIÈRES SONT INVERSÉES : une durée qui baisse est
                une bonne nouvelle, la couleur doit virer au vert. Le paramètre
                n'inverse que la COULEUR, la flèche suit le chiffre.

                CHAQUE SOUS-TITRE NOMME SES DEUX DATES, et ce n'est pas du
                bavardage : quatre tuiles qui disent toutes « durée moyenne »
                se confondraient sans cela, et le lecteur ne saurait pas
                laquelle contient laquelle.

                LA MÉDIANE VOYAGE AVEC LA MOYENNE, parce qu'elles divergent
                fortement : 24 contre 12 jours sur la présentation au client,
                une commande ayant mis 149 jours. La moyenne seule ferait lire
                un délai courant deux fois plus long qu'il n'est.

                ET L'EFFECTIF AVEC, parce qu'il va de 90 à 32 selon la tuile :
                la date de démarrage n'est renseignée que sur un tiers des
                commandes. L'afficher quand même avec son compte en clair est
                la convention de la maquette ; le masquer serait décider à la
                place de qui lit. */}
            <div className={styles.kpiGrid}>

              <KPICard
                label="Durée moy. jusqu'à la fin de recherche"
                value={j(rechercheMoy)}
                unit={rechercheMoy == null ? '' : ' j'}
                compare={compareResult
                  ? compareValueText(rechercheMoy, compareResult.rechercheMoy, comparePeriodKey, true)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: rechercheN === 0
                    ? 'Aucune recherche close sur la période'
                    : `De la demande à la fin de recherche · médiane ${j(rechercheMed)} j · ${fmtNumber(rechercheN)} besoin${s(rechercheN)}`,
                }}
              />

              <KPICard
                label="Durée moy. jusqu'à la présentation client"
                value={j(presentationMoy)}
                unit={presentationMoy == null ? '' : ' j'}
                compare={compareResult
                  ? compareValueText(presentationMoy, compareResult.presentationMoy, comparePeriodKey, true)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: presentationN === 0
                    ? 'Aucun rendez-vous client daté sur la période'
                    : `De la demande au rendez-vous client · médiane ${j(presentationMed)} j · ${fmtNumber(presentationN)} besoin${s(presentationN)}`,
                }}
              />

              <KPICard
                label="Durée moy. pour pourvoir un poste"
                value={j(pourvoirMoy)}
                unit={pourvoirMoy == null ? '' : ' j'}
                compare={compareResult
                  ? compareValueText(pourvoirMoy, compareResult.pourvoirMoy, comparePeriodKey, true)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: pourvoirN === 0
                    ? 'Aucun démarrage daté sur la période'
                    : `De la demande au démarrage · médiane ${j(pourvoirMed)} j · ${fmtNumber(pourvoirN)} besoin${s(pourvoirN)}`,
                }}
              />

              <KPICard
                label="Taux de recrutements réalisés dans les délais"
                value={tauxDelai == null ? '-' : fmtNumber(tauxDelai)}
                unit={tauxDelai == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxDelai, compareResult.tauxDelai, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: delaiN === 0
                    ? 'Aucune recherche close sur la période'
                    : `Recherche close avant son échéance · ${fmtNumber(dansDelai)} sur ${fmtNumber(delaiN)}`,
                }}
              />

            </div>

            {/* RÉPARTITION PAR TYPE DE MISSION, au modèle de celle du revenu
                sur le dashboard commercial : même composant, même variante
                'half-rose', camembert à gauche et tableau à droite.

                LE CERCLE EST DIMENSIONNÉ PAR LES BESOINS et le tableau porte
                les quatre durées — arbitrage de Jimmy du 22/10, après un
                premier essai sur les profils retenus. C'est le bon : la carte
                vit dans la section des durées, et la question qu'on lui pose
                est « quel métier met le plus de temps ». Le cercle donne le
                poids de chaque métier, les colonnes disent son rythme.

                LE SURVOL REPREND LES QUATRE MÊMES MESURES, chacune avec son
                effectif, pour qui lit le cercle sans descendre au tableau.

                LE TYPE DE MISSION EST RECONSTITUÉ à partir de l'intitulé de
                poste, voir familleCommande.js côté serveur. Ce n'est pas dit à
                l'écran, Jimmy l'ayant retiré de la mention le 22/10. */}
            {/* UN Card NE PORTE JAMAIS SA MARGE dans ce dépôt, c'est la grille
                qui espace — et .page est en gap: 0 parce que chaque bloc
                apporte la sienne. Deux cartes qui se suivent sans grille se
                touchent donc à 0 px, ce qui s'est vu ici entre la répartition
                et le graphe (signalé le 22/10). Le même défaut avait déjà été
                corrigé sur la page des mouvements le 17/10, avec la même
                enveloppe. */}
            <div className={styles.blocGraphe}>
            <Card title="Répartition par type de mission">
              {missions.length === 0 ? (
                <div className={styles.etat}>
                  <div className={styles.etatTexte}>
                    Aucun besoin n’a été demandé sur cette période.
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.repartSplit}>
                    <div className={styles.repartDonut}>
                      <DonutChart
                        variant="half-rose"
                        data={missions.map(m => m.besoins)}
                        labels={missions.map(m => m.libelle)}
                        colors={missions.map(m => m.couleur)}
                        height={240}
                        /* Chart.js accepte un TABLEAU de lignes : les quatre
                           indicateurs se lisent l'un sous l'autre plutôt que sur
                           une ligne de cent caractères. */
                        tooltip={(label, value, pct) => {
                          const m = missions.find(x => x.libelle === label);
                          if (!m) return `${label} : ${fmtNumber(value)}`;
                          return [
                            `${label} — ${fmtNumber(value)} besoin${s(value)}, ${fmtPourcentage(pct)}`,
                            `Fin de recherche : ${j(m.rechercheMoy)} j sur ${fmtNumber(m.rechercheN)}`,
                            `Présentation client : ${j(m.presentationMoy)} j sur ${fmtNumber(m.presentationN)}`,
                            `Pourvoir un poste : ${j(m.pourvoirMoy)} j sur ${fmtNumber(m.pourvoirN)}`,
                            `Dans les délais : ${m.tauxDelai == null ? '-' : fmtPourcentage(m.tauxDelai)} sur ${fmtNumber(m.delaiN)}`,
                          ];
                        }}
                      />
                    </div>
                    <div className={styles.repartListe}>
                      <table className={styles.tbl}>
                        <thead>
                          <tr>
                            <th>Type de mission</th>
                            <th className={styles.num}>Besoins</th>
                            <th className={styles.num}>Fin de recherche</th>
                            <th className={styles.num}>Présentation</th>
                            <th className={styles.num}>Pourvoir</th>
                            <th className={styles.num}>Dans les délais</th>
                          </tr>
                        </thead>
                        <tbody>
                          {missions.map(m => (
                            <tr key={m.cle || 'a-classer'}>
                              <td>
                                <span className={styles.libelle}>
                                  <span className={styles.puce} style={{ background: m.couleur }} />
                                  {m.libelle}
                                </span>
                              </td>
                              <td className={styles.num}>{fmtNumber(m.besoins)}</td>
                              {/* CHAQUE DURÉE PORTE SON EFFECTIF, en gris à côté
                                  d'elle. À ce niveau de découpage les moyennes
                                  reposent parfois sur une ou deux observations :
                                  le Tech n'a qu'UN démarrage daté sur l'année.
                                  Une moyenne sans son compte se lirait comme un
                                  fait établi. */}
                              <td className={styles.num}>
                                {j(m.rechercheMoy)}{m.rechercheMoy == null ? '' : ' j'}
                                <span className={styles.effectif}>{fmtNumber(m.rechercheN)}</span>
                              </td>
                              <td className={styles.num}>
                                {j(m.presentationMoy)}{m.presentationMoy == null ? '' : ' j'}
                                <span className={styles.effectif}>{fmtNumber(m.presentationN)}</span>
                              </td>
                              <td className={styles.num}>
                                {j(m.pourvoirMoy)}{m.pourvoirMoy == null ? '' : ' j'}
                                <span className={styles.effectif}>{fmtNumber(m.pourvoirN)}</span>
                              </td>
                              <td className={styles.num}>
                                {m.tauxDelai == null ? '-' : fmtPourcentage(m.tauxDelai)}
                                <span className={styles.effectif}>{fmtNumber(m.delaiN)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* LA MENTION NE PARLE PLUS DE LA TABLE DE CORRESPONDANCE.
                      Elle l'annonçait, par précaution de ma part ; Jimmy l'a
                      retirée le 22/10 — « ça c'est juste à discuter avec
                      l'équipe, pas à mettre là ». Le point reste écrit où il
                      sert : dans familleCommande.js et dans le document des
                      correctifs. Ne reste ici que ce qui aide à lire la
                      carte. */}
                  <div className={styles.mention}>
                    Le cercle répartit les {fmtNumber(besoinsMissions)} besoins. En gris,
                    l’effectif de chaque durée.
                  </div>
                </>
              )}
            </Card>
            </div>

              <Card title="Évolution de la durée pour pourvoir un poste">
                {evolution.length === 0 ? (
                  <div className={styles.etat}>
                    <div className={styles.etatTexte}>
                      Aucun démarrage daté sur cette période : la courbe n’a rien à tracer.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.chartWrap} style={{ height: 232 }}>
                      <Bar
                        data={{
                          labels: evolution.map(p => libelleMois(p.mois)),
                          datasets: [
                            /* LA BARRE PORTE LE VOLUME, LES COURBES LE DELAI,
                               et les deux vivent sur des axes separes : des
                               jours et des besoins ne se comparent pas sur la
                               meme echelle. Sans second axe, une barre de 6
                               besoins ecraserait des courbes a 40 jours, ou
                               l inverse selon le mois. */
                            {
                              label: 'Besoins pourvus',
                              data: evolution.map(p => p.n),
                              backgroundColor: C_BESOINS,
                              borderRadius: 4,
                              borderSkipped: false,
                              yAxisID: 'y2',
                              order: 2,
                            },
                            {
                              type: 'line',
                              label: 'Moyenne',
                              data: evolution.map(p => p.moyenne),
                              borderColor: C_MOYENNE,
                              pointBackgroundColor: C_MOYENNE,
                              pointRadius: 3,
                              borderWidth: 2,
                              tension: 0.3,
                              fill: false,
                              spanGaps: false,
                              yAxisID: 'y',
                              /* order 0 dessine la courbe PAR-DESSUS les barres ;
                                 sans cela elle passerait dessous et
                                 disparaitrait derriere elles. */
                              order: 0,
                            },
                            {
                              type: 'line',
                              label: 'Médiane',
                              data: evolution.map(p => p.mediane),
                              borderColor: C_MEDIANE,
                              pointBackgroundColor: C_MEDIANE,
                              pointRadius: 3,
                              borderWidth: 2,
                              tension: 0.3,
                              fill: false,
                              /* LES MOIS SANS DEMARRAGE RESTENT DES TROUS : avec
                                 spanGaps, Chart.js relierait fevrier a avril
                                 d un trait continu et l on y lirait une
                                 evolution reguliere la ou mars n a rien eu. */
                              spanGaps: false,
                              yAxisID: 'y',
                              order: 1,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          animation: { duration: 900, easing: 'easeOutQuart' },
                          interaction: { mode: 'index', intersect: false },
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                title: items => libelleMoisLong(evolution[items[0].dataIndex].mois),
                                label: ctx => {
                                  const v = ctx.parsed.y;
                                  if (v == null) return null;
                                  if (ctx.dataset.label === 'Besoins pourvus') {
                                    return `${fmtNumber(v)} besoin${v > 1 ? 's' : ''} pourvu${v > 1 ? 's' : ''}`;
                                  }
                                  return `${ctx.dataset.label} : ${fmtNumber(v)} j`;
                                },
                              },
                            },
                          },
                          scales: {
                            x: { grid: { display: false } },
                            y: {
                              position: 'left',
                              beginAtZero: true,
                              ticks: { precision: 0 },
                              title: { display: true, text: 'Jours', color: 'rgba(38,0,31,0.45)', font: { size: 9 } },
                            },
                            y2: {
                              position: 'right',
                              beginAtZero: true,
                              /* Pas de demi-besoin, et pas de grille en double :
                                 celle de l axe des jours suffit, deux trames
                                 superposees brouillent la lecture. */
                              ticks: { precision: 0 },
                              grid: { drawOnChartArea: false },
                              title: { display: true, text: 'Besoins', color: 'rgba(38,0,31,0.45)', font: { size: 9 } },
                            },
                          },
                        }}
                      />
                    </div>
                    {/* LEGENDE EN HTML, pas celle de Chart.js, comme partout
                        dans ce depot : trois series sur deux axes ne se
                        devinent pas, et la legende native se place mal. */}
                    <div className={styles.legende}>
                      <span className={styles.legDot} style={{ background: C_BESOINS }} />Besoins pourvus
                      <span className={styles.legDot} style={{ background: C_MOYENNE, marginLeft: 12 }} />Moyenne
                      <span className={styles.legDot} style={{ background: C_MEDIANE, marginLeft: 12 }} />Médiane
                    </div>
                    {/* CETTE LIGNE EXISTE PARCE QUE LE GRAPHE ET LA TUILE NE
                        COMPTENT PAS LA MÊME CHOSE, et que sans elle on les
                        croirait en désaccord. La tuile est bornée à la
                        COHORTE, les besoins commandés sur la période ; le
                        graphe tourne sur une FENÊTRE GLISSANTE de douze mois
                        ancrée sur la fin de période, comme tous les graphes
                        d'évolution de ce dépôt. Une courbe réduite au mois
                        sélectionné n'aurait qu'un point. */}
                    {/* LA MENTION DÉCRIT LES TROIS SÉRIES, pas seulement la
                        médiane : elle ne parlait que d'elle depuis que les
                        barres et la moyenne ont été ajoutées. Une légende dit
                        QUI est quoi, une mention dit CE QU'ON MESURE et SUR
                        QUOI — les deux sont nécessaires et ne se remplacent
                        pas. */}
                    <div className={styles.mention}>
                      De la demande au démarrage, par mois de démarrage, sur douze mois.
                    </div>
                  </>
                )}
              </Card>

            {/* LES DEUX SECTIONS QUI SUIVAIENT ONT ÉTÉ RETIRÉES le 22/10 sur
                décision de Jimmy, « supprime tout le reste en bas ».

                « LA TRANSFORMATION DES PROFILS » portait un second taux de
                transformation, 47 % contre les 36 % de la rangée du haut. Les
                deux étaient justes sur deux bases différentes — l'un sur tous
                les profils, l'autre sur les seuls besoins portant les deux
                colonnes — et c'est précisément ce qui posait problème : deux
                nombres sous des libellés presque identiques, à deux écrans
                d'intervalle.

                « LES ÉTAPES DU WORKFLOW RH » comptait les besoins ouverts par
                étape. L'information n'est pas perdue : la barre à neuf crans de
                la carte par client la porte désormais, besoin par besoin, et
                la pop-up en donne la colonne Étape.

                Les agrégats correspondants ont été retirés de la route dans le
                même mouvement : une réponse qui porte des champs que personne
                ne lit finit par les voir diverger sans que rien ne le dise. */}

            {clientsOuverts && (
              <ListeModale
                large
                titre="Détails par prospects/clients"
                sousTitre={
                  recherche.trim()
                    ? `${fmtNumber(lignesVisibles.length)} besoin${s(lignesVisibles.length)}`
                      + ` sur ${fmtNumber(detailsClients.length)}`
                    : `${fmtNumber(detailsClients.length)} besoin${s(detailsClients.length)}`
                      + ` · ${fmtNumber(candidatsParClient.length)} client${s(candidatsParClient.length)}`
                }
                onClose={() => { setClientsOuverts(false); setRecherche(''); }}
              >
                {/* UNE LIGNE PAR BESOIN, ET NON PLUS PAR CLIENT. La carte
                    résume un client, la pop-up s'appelle « détails » : elle
                    descend donc d'un cran. Tant qu'elle agrégeait, la cellule
                    « poste » de REGARD INC empilait cinq intitulés, et les
                    deux dates demandées le 22/10 y auraient empilé cinq dates
                    chacune. Un besoin par ligne, et chaque colonne redevient
                    une vraie valeur.

                    LES DEUX DATES SONT REMPLIES À 100 % sur les besoins
                    ouverts, 26 sur 26 au 22/10. C'est l'exception dans ce
                    classeur, où la plupart des colonnes de dates sont
                    trouées : celles-ci s'affichent sans réserve. */}
                {/* LA RECHERCHE PORTE SUR LE CLIENT ET LE POSTE, demande de
                    Jimmy du 22/10 : ce sont les deux seules colonnes qu'on a
                    en tête avant d'ouvrir la liste. Les suggestions sortent
                    des lignes elles-mêmes, jamais d'un référentiel — une
                    proposition sans résultat ferait croire que la donnée
                    existe. */}
                <RechercheAvecSuggestions
                  valeur={recherche}
                  onChange={setRecherche}
                  suggestions={suggestions}
                  placeholder="Rechercher un client ou un poste…"
                />
                {lignesVisibles.length === 0 ? (
                  <div className={styles.etat}>
                    <div className={styles.etatTexte}>
                      Aucun besoin ne correspond à « {recherche} ».
                    </div>
                  </div>
                ) : (
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      {COLONNES.map(c => (
                        <th key={c.cle} className={c.num ? styles.num : undefined}>
                          {/* L'EN-TÊTE EST UN BOUTON, pas un `th` qui écoute un
                              clic : sans ça le tri est hors de portée au
                              clavier et rien n'annonce qu'il existe. */}
                          <button
                            type="button"
                            className={`${styles.triBtn} ${tri.cle === c.cle ? styles.triActif : ''}`}
                            onClick={() => setTri(t => ({
                              cle: c.cle,
                              /* Un deuxième clic sur la même colonne inverse le
                                 sens ; passer à une autre colonne repart en
                                 croissant, sinon on hérite d'un sens qu'on n'a
                                 pas demandé. */
                              sens: t.cle === c.cle && t.sens === 'asc' ? 'desc' : 'asc',
                            }))}
                          >
                            {c.libelle}
                            <span className={styles.triFleche} aria-hidden="true">
                              {tri.cle === c.cle ? (tri.sens === 'asc' ? '↑' : '↓') : '↕'}
                            </span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lignesVisibles.map(d => (
                      <tr key={d.numero}>
                        <td>{d.entite}</td>
                        {/* Les intitulés du classeur portent parfois un retour
                            à la ligne en plein milieu : on les remet sur une
                            seule ligne pour que la colonne ne saute pas. */}
                        <td>{(d.poste || '-').replace(/\s+/g, ' ')}</td>
                        <td>{libelleEtape(d.etape) || '-'}</td>
                        {/* L'ISSUE EST DEVENUE INDISPENSABLE le jour où la carte
                            a cessé de ne montrer que des besoins ouverts : sans
                            elle, un besoin arrêté à R4 se lirait comme une
                            recherche en cours alors qu'il est annulé. */}
                        <td>{ISSUES[d.issue] || '-'}</td>
                        <td className={styles.num}>{dateCourte(d.dateCommande)}</td>
                        <td className={styles.num}>{dateCourte(d.echeanceR3)}</td>
                        {/* L'ANCIENNETÉ ARRIVE ICI depuis le suivi par client de
                            la vue 1, déplacée le 22/10 : cette carte-là ne
                            porte plus que les quatre indicateurs de sa rangée,
                            et l'âge d'un besoin est un détail de besoin, pas un
                            résumé de client. Il est d'ailleurs plus juste ici :
                            par besoin il se lit tel quel, là où par client il
                            fallait prendre le plus ancien et l'expliquer. */}
                        <td className={styles.num}>
                          {d.ageJ == null ? '-' : `${fmtNumber(d.ageJ)} j`}
                        </td>
                        <td className={styles.num}>{ouTiret(d.profilsDemandes)}</td>
                        <td className={styles.num}>{ouTiret(d.presentes)}</td>
                        <td className={styles.num}>{ouTiret(d.retenus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
              </ListeModale>
            )}
          </div>
        );
      }}
    </Loader>
  );
}
