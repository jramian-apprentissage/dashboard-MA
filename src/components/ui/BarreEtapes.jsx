import Infobulle from './Infobulle';
import styles from './BarreEtapes.module.css';

/* LA RAMPE DES NEUF ÉTAPES, du R0 au placement.
 *
 * Elle est ORDONNÉE, et c'est tout l'intérêt : l'avancement d'un recrutement
 * n'est pas une catégorie mais une position sur une échelle. Neuf couleurs sans
 * rapport entre elles obligeraient à compter les segments pour savoir où l'on
 * en est ; une rampe se lit d'un coup d'œil, et plus c'est appuyé, plus c'est
 * près d'aboutir.
 *
 * EN ABRICOT, LA TEINTE DU DASHBOARD, et non en vert. Elle a été posée en vert
 * le 22/10 puis reprise le même jour : le dashboard Recrutement porte l'abricot
 * partout ailleurs, de son bandeau à ses courbes, et une seule carte en vert
 * donnait l'air d'un emprunt à un autre écran.
 *
 * ELLE COURT DE #EDD5C0 À --abricot-encre #885430, qui ferme la famille abricot
 * de tokens.css : teinte de 28 à 24,5, saturation de 55 à 48, clarté de 84 à
 * 36, interpolées linéairement. Le troisième cran, #DEB492, tombe à deux points
 * de --abricot #E0B99E : la couleur de signature est DANS la rampe, elle n'en
 * est pas une extrémité — l'y mettre aurait aplati les huit autres crans,
 * #E0B99E étant déjà clair.
 *
 * LE DÉPART RESTE FRANC, 84 de clarté et non 88 : au-dessus, le premier cran se
 * confond avec le rail #F0EEE9 et un besoin à R0 paraît n'avoir franchi aucune
 * étape. C'est le défaut qui avait déjà fait reprendre la rampe précédente.
 *
 * DES LITTÉRAUX, jamais `var(--abricot-encre)` : ces valeurs partent en style
 * inline, et surtout la règle vaut pour toute palette de ce dépôt — le canvas
 * de Chart.js ne résout pas les variables CSS et garde silencieusement la
 * couleur précédente. Une palette, une seule écriture.
 *
 * LA DERNIÈRE ÉTAPE EST « EN POSTE » et n'apparaîtra donc JAMAIS sur une carte
 * qui ne montre que des besoins ouverts. Elle est dans la rampe quand même : la
 * barre représente les neuf étapes du processus, et en retirer la dernière
 * ferait croire que le recrutement s'arrête à l'onboarding. Le segment reste
 * vide, et c'est précisément ce qu'il doit dire. */
export const ETAPES = [
  { rang: 1, cle: 'R0', libelle: 'R0 · Ouverture de recherche', couleur: '#EDD5C0' },
  { rang: 2, cle: 'R1', libelle: 'R1 · Sourcing des candidats', couleur: '#E5C4A9' },
  { rang: 3, cle: 'R2', libelle: 'R2 · Qualification des candidats', couleur: '#DEB492' },
  { rang: 4, cle: 'R3', libelle: 'R3 · Entretien approfondi', couleur: '#D6A37B' },
  { rang: 5, cle: 'R4', libelle: 'R4 · Présentation candidat', couleur: '#CD9365' },
  { rang: 6, cle: 'R5', libelle: 'R5 · Présentation client', couleur: '#C5824F' },
  { rang: 7, cle: 'R6', libelle: 'R6 · Formalité administrative', couleur: '#B7713E' },
  { rang: 8, cle: 'R7', libelle: 'R7 · Onboarding ambassadeur', couleur: '#A06337' },
  { rang: 9, cle: 'POSTE', libelle: 'En poste', couleur: '#885430' },
];

export function libelleEtape(rang) {
  return ETAPES.find(e => e.rang === rang)?.libelle ?? null;
}

/* 72 px PAR COLONNE ET NON 56 depuis le 23/10 : « Besoin en profils »
   remplace « Besoin », qui ne disait pas de quoi il parlait. À 56 px le
   libellé se cassait en trois lignes et poussait l'en-tête au-dessus des
   barres. La largeur est la même pour l'en-tête et pour les valeurs, sans
   quoi les deux cessent de s'aligner.

   L'en-tête des colonnes de droite, et la légende de la rampe sous la piste.
 *
 * ELLE EST OBLIGATOIRE ICI, là où MotifBar peut s'en passer : trois nombres nus
 * alignés à droite ne disent pas lequel est le besoin et lequel le retenu, et
 * neuf cases vertes ne disent pas qu'elles sont les étapes R0 à En poste.
 *
 * LES DEUX BORNES SEULEMENT, pas les neuf libellés : neuf étiquettes sous une
 * barre de 300 px se chevaucheraient. Le survol d'une ligne donne l'étape
 * exacte, en toutes lettres. */
export function EnteteEtapes({ colonnes }) {
  return (
    <div className={styles.ligneEntete}>
      <div className={styles.enteteVide} />
      <div className={styles.entetePiste}>
        <div className={styles.entete} style={{ gridTemplateColumns: '1fr auto' }}>
          <span style={{ textAlign: 'left' }}>R0</span>
          <span>En poste</span>
        </div>
      </div>
      <div className={styles.entete} style={{ gridTemplateColumns: `repeat(${colonnes.length}, 72px)` }}>
        {colonnes.map(c => <span key={c}>{c}</span>)}
      </div>
    </div>
  );
}

/* Une ligne « client · avancement · valeurs », calquée sur MotifBar dont elle
 * reprend le gabarit et les classes d'esprit : même largeur de libellé, même
 * grille de colonnes fixes à droite.
 *
 * POURQUOI UN COMPOSANT À PART plutôt qu'une option de MotifBar : MotifBar
 * dessine UNE barre continue dont la longueur EST la valeur. Ici la barre est
 * discrète, neuf cases, et ne mesure rien — elle situe. Les deux lectures ne
 * se mélangent pas, et quatre pages du dashboard commercial dépendent du rendu
 * de MotifBar.
 *
 * LA BARRE NE PORTE PAS DE POURCENTAGE, volontairement : « étape 6 sur 9 » ne
 * veut pas dire « 67 % du travail fait ». Les étapes n'ont ni la même durée ni
 * la même difficulté, et afficher un taux inventerait une mesure que personne
 * n'a prise.
 *
 * LE SURVOL VIT SUR LES SEGMENTS, pas sur la ligne : chaque case annonce son
 * étape. Le composant ne prend donc plus de `title` — il en acceptait un pour
 * le survol de ligne, retiré le 22/10. */
export default function BarreEtapes({ label, etape, valeurs }) {
  /* AUCUN ÉTAT D'ANIMATION ICI, ET C'EST UN CORRECTIF, pas une simplification.
   *
   * La première version copiait MotifBar : un useState à 0, puis un
   * requestAnimationFrame qui posait la vraie valeur, pour que la barre se
   * remplisse à l'arrivée. Sur MotifBar le défaut est bénin, le nombre est
   * écrit en toutes lettres à côté de la barre. Ici la barre EST la seule
   * information : si le rAF ne se déclenche pas, les neuf segments restent
   * gris et le client paraît n'avoir franchi aucune étape.
   *
   * OR UN rAF NE SE DÉCLENCHE PAS TOUJOURS. Le navigateur le suspend quand la
   * page ne dessine pas : onglet en arrière-plan, fenêtre minimisée, aperçu
   * hors champ. Constaté le 22/10 — les neuf segments lus dans le DOM
   * n'avaient AUCUNE classe `atteint` sur un client pourtant à R5, et rien ne
   * le signalait. C'est le pire cas possible : pas une anomalie visible, une
   * valeur fausse qui ressemble à une vraie.
   *
   * Le composant rend donc directement l'étape reçue. Le mouvement est confié
   * au CSS, qui ne peut pas se tromper de valeur : une animation suspendue
   * laisse un segment déjà coloré, jamais un segment vide. */
  return (
    /* UN SEUL SURVOL, CELUI DE L'ÉTAPE. La ligne en portait un second, qui
       dépliait les postes du client ; retiré le 22/10 — « il me faut juste
       l'étape ». Les postes n'ont rien perdu : ils ont une colonne à eux dans
       la pop-up, où ils se lisent mieux qu'en bulle.

       L'INFOBULLE EST CELLE DU DÉPÔT, PAS CELLE DU NAVIGATEUR : `title` mettait
       une seconde à sortir et Jimmy l'a cherchée sans la trouver le même jour.
       Voir Infobulle.jsx pour le portail, qui est ce qui lui permet de sortir
       d'une carte à `overflow: hidden`. */
      <div className={styles.row}>
        <div className={styles.label}>{label}</div>
        <div className={styles.piste}>
          {ETAPES.map(e => {
            const atteint = (etape || 0) >= e.rang;
            return (
              /* CHAQUE SEGMENT ANNONCE SON ÉTAPE, demande de Jimmy du 22/10 :
                 neuf cases vertes ne disent pas laquelle est R5. Elle précise
                 Le libellé seul, sans « franchie » ou « pas atteinte » : la
                 couleur le dit déjà, et la bulle doit se lire d'un coup. */
              <Infobulle
                key={e.cle}
                contenu={e.libelle}
              >
                <div
                  className={`${styles.segment} ${atteint ? styles.atteint : ''}`}
                  /* Le décalage échelonne l'entrée des segments de gauche à
                     droite, ce que faisait le rAF — sans porter la valeur. */
                  style={atteint
                    ? { background: e.couleur, animationDelay: `${(e.rang - 1) * 45}ms` }
                    : undefined}
                  /* Focusable au clavier : sans cela l'étape d'un segment
                     n'est accessible qu'à la souris. */
                  tabIndex={0}
                />
              </Infobulle>
            );
          })}
        </div>
        <div className={styles.valeurs} style={{ gridTemplateColumns: `repeat(${valeurs.length}, 72px)` }}>
          {valeurs.map((v, i) => <span key={i}>{v}</span>)}
        </div>
      </div>
  );
}
