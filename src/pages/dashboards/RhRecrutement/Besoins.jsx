import KPICard from '../../../components/ui/KPICard';
import Card from '../../../components/ui/Card';
import SectionLabel from '../../../components/ui/SectionLabel';
import Loader from '../../../components/ui/Loader';
import { useRhBesoins } from '../../../hooks/useRhData';
import { compareValueText, comparePtsText } from '../../../utils/compareText';
import { usePeriod } from '../../../contexts/PeriodContext';
import { fmtNumber } from '../../../utils/formatNumber';
import styles from '../RhEffectifs/Rh.module.css';

/* Vue 1 du dashboard Recrutement, « Besoins et recrutements ».
 *
 * L'ORDRE DES QUATRE TUILES RACONTE LE CYCLE D'UN BESOIN, arbitrage de Jimmy
 * du 22/10 : ce qu'on nous demande, ce qu'on a réalisé, ce qui reste en cours,
 * et pour finir la synthèse en taux. On lit la rangée de gauche à droite comme
 * une phrase, et chaque chiffre est explicité par celui d'à côté.
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
export default function Besoins() {
  const { result, compareResult, loading, error } = useRhBesoins();
  const { comparePeriodKey } = usePeriod();

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
          annules, closSansRecrutement, postesDemandes, sansProfil, entites, tauxPourvu,
        } = result;
        const s = n => (n > 1 ? 's' : '');

        /* Le sous-titre de la première tuile dit d'abord les POSTES, quand ils
           diffèrent des besoins : une commande peut en porter plusieurs, et
           sans cette ligne un lecteur qui compare au plan de recrutement ne
           retrouve pas ses comptes. Jamais un total incomplet : si une
           commande n'a pas de `# PROFIL`, supposer 1 serait inventer.
           À défaut, il dit le nombre d'ENTITÉS, qui apprend quelque chose. Il
           ne doit en aucun cas répéter le libellé de la tuile. */
        const postes = sansProfil === 0 && postesDemandes !== demandes
          ? `${fmtNumber(postesDemandes)} postes à pourvoir`
          : `Sur ${fmtNumber(entites)} entité${s(entites)}`;

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

              {/* SEULE TUILE INVERSÉE de la rangée : un arriéré qui baisse est
                  une bonne nouvelle, la couleur doit virer au vert. Le
                  paramètre n'inverse que la couleur, la flèche suit le
                  chiffre. */}
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

            </div>
          </div>
        );
      }}
    </Loader>
  );
}
