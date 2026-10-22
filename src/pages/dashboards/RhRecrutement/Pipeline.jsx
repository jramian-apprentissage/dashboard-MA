import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import MotifBar from '../../../components/ui/MotifBar';
import { useRhPipeline } from '../../../hooks/useRhData';
import { compareValueText, comparePtsText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber, partPct } from '../../../utils/formatNumber';
import styles from '../RhEffectifs/Rh.module.css';

/* Vue 2 du dashboard Recrutement, « Pipeline candidats et délais ».
 *
 * LA PHRASE DE LA RANGÉE : une recherche dure tant de jours, tant de pour cent
 * tiennent l'échéance, tant de pour cent des profils présentés sont retenus, à
 * raison de tant de présentés par besoin. Les deux premières tuiles parlent du
 * TEMPS, les deux suivantes du VOLUME de candidats.
 *
 * CETTE PAGE N'EXISTAIT PAS HIER. La version du classeur reçue le 22/10 a fait
 * passer `Debut Recherche R0` de 49 à 95 % et `Fin de recherche R3` de 44 à
 * 92 %. Les deux délais reposaient sur moins de la moitié du fichier, ils
 * reposent maintenant sur plus de neuf dixièmes.
 *
 * DEUX INDICATEURS DE LA MAQUETTE SONT ABSENTS, et c'est mesuré, pas supposé.
 * Le « délai pour pourvoir un poste » et son graphe d'évolution croisent
 * l'ouverture de recherche et la DATE DE DÉMARRAGE, renseignée sur 35 % des
 * commandes seulement, et sur laquelle 21 recrutements aboutis manquent.
 * Trente paires exploitables sur quatre-vingt-dix-huit : une moyenne calculée
 * là-dessus parlerait d'un tiers du fichier en ayant l'air d'en décrire la
 * totalité. Elles reviendront quand l'équipe RH aura saisi les dates.
 *
 * LA MOYENNE EN GROS, LA MÉDIANE EN DESSOUS : arbitrage de Jimmy du 19/10 sur
 * le Suivi des effectifs, repris ici. La moyenne est le chiffre attendu, la
 * médiane dit à quel point une queue de valeurs longues la tire. Sur l'année,
 * 22 jours de moyenne pour 12 de médiane : l'écart est le message.
 *
 * L'INVERSION DE COULEUR ne touche que la durée : une recherche plus courte
 * est une bonne nouvelle. Les deux taux montent quand ça va mieux. La
 * quatrième, les profils présentés par besoin, n'a PAS de bon sens évident —
 * plus de profils, c'est plus de choix pour le client mais plus de travail
 * pour la même place — donc on ne lui fait porter aucun jugement inversé. */
export default function Pipeline() {
  const { result, compareResult, loading, error } = useRhPipeline();
  const { comparePeriodKey } = usePeriod();

  return (
    <Loader loading={loading && !result} label="Chargement du pipeline…" minHeight={220}>
      {() => {
        if (error) {
          return (
            <div className={styles.page}>
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Candidatures et délais</SectionLabel>
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
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Candidatures et délais</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>Aucun besoin sur cette période</div>
                  <div className={styles.etatTexte}>
                    Aucun besoin n’a été demandé entre ces deux dates.
                  </div>
                </div>
              </Card>
            </div>
          );
        }

        const {
          dureeN, dureeMoy, dureeMed, delaiN, dansDelai, tauxDelai,
          transfoN, presentes, retenus, tauxTransfo, parBesoin,
          etapes, sansEtape, enCours,
        } = result;
        const s = n => (n > 1 ? 's' : '');
        const jours = v => (v == null ? '-' : fmtNumber(v));

        return (
          <div className={styles.page}>
            <SectionLabel badge="Onglet Suivi de commande RH Q2">Candidatures et délais</SectionLabel>
            <div className={styles.kpiGrid}>

              {/* SEULE TUILE INVERSÉE : une recherche plus courte est meilleure. */}
              <KPICard
                label="Durée moy. du recrutement"
                value={jours(dureeMoy)}
                unit={dureeMoy == null ? '' : ' j'}
                compare={compareResult
                  ? compareValueText(dureeMoy, compareResult.dureeMoy, comparePeriodKey, true)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: dureeN === 0
                    ? 'Aucune recherche datée sur la période'
                    : `Médiane ${jours(dureeMed)} j · sur ${fmtNumber(dureeN)} recherche${s(dureeN)}`,
                }}
              />

              {/* LE SOUS-TITRE DIT CE QUI EST RÉELLEMENT MESURÉ. Le libellé
                  parle de « recrutements réalisés » alors que la source date
                  la fin de RECHERCHE R3, pas une entrée en poste. Le libellé
                  est celui que Clémence a validé, on le garde ; la description
                  empêche de le lire pour ce qu'il n'est pas. */}
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
                    : `${fmtNumber(dansDelai)} recherche${s(dansDelai)} close${s(dansDelai)} avant l’échéance sur ${fmtNumber(delaiN)}`,
                }}
              />

              <KPICard
                label="Taux de transformation des profils présentés"
                value={tauxTransfo == null ? '-' : fmtNumber(tauxTransfo)}
                unit={tauxTransfo == null ? '' : ' %'}
                compare={compareResult
                  ? comparePtsText(tauxTransfo, compareResult.tauxTransfo, comparePeriodKey)
                  : null}
                trend={{
                  dir: 'neutral',
                  text: transfoN === 0
                    ? 'Aucun besoin ne porte les deux comptes'
                    : `${fmtNumber(retenus)} retenu${s(retenus)} sur ${fmtNumber(presentes)} présenté${s(presentes)}`,
                }}
              />

              {/* COULEUR NEUTRALISÉE, et c'est le seul endroit du dashboard
                  où on le fait. Plus de profils présentés par besoin, c'est
                  plus de choix pour le client et plus de travail pour la même
                  place ; moins, c'est l'inverse. Aucun des deux sens n'est bon
                  en soi, donc ni vert ni rouge : afficher « -18 % » en rouge
                  reviendrait à porter un jugement qu'on ne sait pas défendre.
                  Le chiffre et la flèche restent, seule la couleur se tait. */}
              <KPICard
                label="Profils présentés par besoin"
                value={parBesoin == null ? '-' : fmtNumber(parBesoin)}
                unit={parBesoin == null ? '' : ' profils'}
                compare={compareResult
                  ? (c => (c ? { ...c, dir: 'neutral' } : c))(
                    compareValueText(parBesoin, compareResult.parBesoin, comparePeriodKey))
                  : null}
                trend={{
                  dir: 'neutral',
                  text: transfoN === 0
                    ? 'Aucun besoin renseigné'
                    : `Sur ${fmtNumber(transfoN)} besoin${s(transfoN)} renseigné${s(transfoN)}`,
                }}
              />
            </div>

            {/* LE TUNNEL, SUR LES SEULS BESOINS EN COURS. Sur l'ensemble des
                commandes, « En poste » écraserait tout et le tableau cesserait
                de décrire un pipeline : c'est le piège que la maquette évitait
                déjà, et sa note de pied de carte le disait.

                LES HUIT ÉTAPES SONT TOUJOURS AFFICHÉES, même à zéro. Une étape
                absente du tableau se lirait comme une étape qui n'existe pas,
                alors qu'un trou au milieu du tunnel est précisément ce qu'on
                veut voir. */}
            <SectionLabel>Les étapes du workflow RH</SectionLabel>
            <Card title="Processus de recrutement">
              {enCours === 0 ? (
                <div className={styles.etat}>
                  <div className={styles.etatTexte}>
                    Aucun besoin n’est en cours de recrutement sur cette période.
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.barres}>
                    {etapes.map(e => (
                      <MotifBar
                        key={e.cle}
                        label={e.libelle}
                        pct={partPct(e.besoins, enCours)}
                        count={e.besoins}
                        fillColor="rgba(38,0,31,0.95)"
                      />
                    ))}
                  </div>
                  {/* Les besoins en cours dont l'étape n'est pas saisie ne
                      sont pas rangés d'office en R0 : ils sont nommés, sinon
                      le tunnel paraît complet alors qu'il lui manque des
                      lignes. */}
                  {sansEtape > 0 && (
                    <div className={styles.mention}>
                      {fmtNumber(sansEtape)} besoin{s(sansEtape)} en cours sans étape RH saisie,
                      hors de ce tableau.
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        );
      }}
    </Loader>
  );
}
