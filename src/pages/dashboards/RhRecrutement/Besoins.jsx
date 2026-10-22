import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import { useRhBesoins } from '../../../hooks/useRhData';
import { fmtNumber } from '../../../utils/formatNumber';
import styles from '../RhEffectifs/Rh.module.css';

/* Vue 1 du dashboard Recrutement, « Besoins et recrutements ».
 *
 * UNE SEULE CARTE POSÉE POUR L'INSTANT, la première de la rangée, et c'est
 * volontaire : on avance indicateur par indicateur, celui-ci est le seul des
 * quatre dont la source soit complète. Les trois autres attendent, et leur
 * ordre est déjà fixé par Clémence : taux des besoins ouverts depuis plus de
 * quinze jours, recrutements réalisés, taux de besoins pourvus.
 *
 * POURQUOI CELLE-CI D'ABORD, en une phrase : elle ne lit que `Statut
 * commande`, la seule colonne du classeur FCC remplie à 100 %, et aucune date.
 * Les trois suivantes dépendent de colonnes trouées ou d'un arbitrage ouvert.
 *
 * LA CARTE NE SUIT PAS LE SÉLECTEUR DE PÉRIODE, et ce n'est pas un oubli. Un
 * besoin en cours est un stock, et le classeur ne porte aucune date de
 * changement de statut : on sait qu'une commande est aujourd'hui terminée,
 * jamais quand elle l'est devenue. L'état du stock au 30 septembre n'est donc
 * pas reconstituable. Faire bouger le chiffre avec la période reviendrait à
 * l'inventer. Le sous-titre dit « à ce jour » pour que la lecture soit juste,
 * et la comparaison est éteinte plutôt que laissée en attente d'un calcul qui
 * ne viendra pas. Une date de clôture dans le FCC lèverait tout cela d'un
 * coup : c'est la première chose à demander à l'équipe RH.
 *
 * LE SOUS-TITRE PORTE LE VOLUME DE POSTES, pas une définition. Une commande
 * du FCC peut porter plusieurs postes via `# PROFIL` : vingt-sept besoins
 * valent vingt-neuf postes à pourvoir. Sans cette ligne, un lecteur qui
 * compare au plan de recrutement ne retrouverait pas ses comptes. */
export default function Besoins() {
  const { result, loading, error } = useRhBesoins();

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
        if (!result || result.commandes === 0) {
          return (
            <div className={styles.page}>
              <SectionLabel badge="Onglet Suivi de commande RH Q2">Les besoins en cours</SectionLabel>
              <Card>
                <div className={styles.etat}>
                  <div className={styles.etatTitre}>En attente du classeur FCC</div>
                  <div className={styles.etatTexte}>
                    Aucune commande n’est chargée. Le classeur se charge avec
                    <code> scripts/ingest-fcc-fichier.js</code>.
                  </div>
                </div>
              </Card>
            </div>
          );
        }

        const { besoinsEnCours, profilsDemandes, sansProfil } = result;
        /* Le volume de postes n'est annoncé que s'il est COMPLET. Si une
           commande en cours n'a pas de `# PROFIL`, on dit sur combien de
           besoins il porte plutôt que d'afficher un total qui en oublie.
           Supposer 1 serait une donnée inventée. */
        const postes = sansProfil === 0
          ? `${fmtNumber(profilsDemandes)} poste${profilsDemandes > 1 ? 's' : ''} à pourvoir`
          : `${fmtNumber(profilsDemandes)} postes sur ${fmtNumber(besoinsEnCours - sansProfil)} des ${fmtNumber(besoinsEnCours)} besoins`;

        return (
          <div className={styles.page}>
            <SectionLabel badge="Onglet Suivi de commande RH Q2">Les besoins en cours</SectionLabel>
            <div className={styles.kpiGrid}>
              <KPICard
                label="Besoin de recrutement en cours"
                value={fmtNumber(besoinsEnCours)}
                unit={besoinsEnCours > 1 ? ' besoins' : ' besoin'}
                /* Éteinte, pas en attente : voir l'en-tête du fichier. */
                compare={false}
                trend={{ dir: 'neutral', text: `Non pourvus à ce jour · ${postes}` }}
              />
            </div>
          </div>
        );
      }}
    </Loader>
  );
}
