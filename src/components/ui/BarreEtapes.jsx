import styles from './BarreEtapes.module.css';

/* LA RAMPE DES NEUF ÉTAPES, du R0 au placement.
 *
 * Elle est ORDONNÉE, et c'est tout l'intérêt : l'avancement d'un recrutement
 * n'est pas une catégorie mais une position sur une échelle. Neuf couleurs
 * sans rapport entre elles obligeraient à compter les segments pour savoir où
 * l'on en est ; une rampe se lit d'un coup d'œil, et plus c'est vert, plus
 * c'est près d'aboutir.
 *
 * LE NEUVIÈME EST #80EF80, le vert pastel donné par Jimmy le 22/10. Les huit
 * autres y mènent, d'un vert grisé presque neutre à ce vert-là : teinte de 135
 * à 120, saturation de 38 à 78 %, clarté de 84 à 72 %, interpolées linéairement.
 * LE DÉPART EST FRANCHEMENT VERT et non grisé : la première rampe essayée
 * partait de #DBE6DD, qui se confond avec le rail #F0EEE9 — un besoin à R0
 * paraissait n'avoir franchi aucune étape.
 * Les valeurs sont écrites en clair plutôt que calculées à l'exécution — une
 * palette qui se relit vaut mieux qu'une palette qui se recalcule, et celle-ci
 * ne changera que si quelqu'un la redessine.
 *
 * LA DERNIÈRE ÉTAPE EST « EN POSTE » et n'apparaîtra donc JAMAIS sur une carte
 * qui ne montre que des besoins ouverts. Elle est dans la rampe quand même :
 * la barre représente les neuf étapes du processus, et en retirer la dernière
 * ferait croire que le recrutement s'arrête à l'onboarding. Le segment reste
 * vide, et c'est précisément ce qu'il doit dire. */
export const ETAPES = [
  { rang: 1, cle: 'R0', libelle: 'R0 · Ouverture de recherche', couleur: '#C7E6CE' },
  { rang: 2, cle: 'R1', libelle: 'R1 · Sourcing des candidats', couleur: '#BFE6C8' },
  { rang: 3, cle: 'R2', libelle: 'R2 · Qualification des candidats', couleur: '#B7E6C0' },
  { rang: 4, cle: 'R3', libelle: 'R3 · Entretien approfondi', couleur: '#AFE6B8' },
  { rang: 5, cle: 'R4', libelle: 'R4 · Présentation candidat', couleur: '#A6E7AE' },
  { rang: 6, cle: 'R5', libelle: 'R5 · Présentation client', couleur: '#9DE9A4' },
  { rang: 7, cle: 'R6', libelle: 'R6 · Formalité administrative', couleur: '#94EB99' },
  { rang: 8, cle: 'R7', libelle: 'R7 · Onboarding ambassadeur', couleur: '#8AED8D' },
  { rang: 9, cle: 'POSTE', libelle: 'En poste', couleur: '#80EF80' },
];

export function libelleEtape(rang) {
  return ETAPES.find(e => e.rang === rang)?.libelle ?? null;
}

/* L'en-tête des colonnes de droite, et la légende de la rampe sous la piste.
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
      <div className={styles.entete} style={{ gridTemplateColumns: `repeat(${colonnes.length}, 56px)` }}>
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
 * `title` porte le survol. Le navigateur l'affiche tel quel, retours à la ligne
 * compris — d'où les postes passés avec des sauts de ligne par l'appelant. */
export default function BarreEtapes({ label, etape, valeurs, title }) {
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
    <div className={styles.row} title={title || undefined}>
      <div className={styles.label}>{label}</div>
      <div className={styles.piste}>
        {ETAPES.map(e => {
          const atteint = (etape || 0) >= e.rang;
          return (
            /* CHAQUE SEGMENT PORTE SON PROPRE SURVOL, demande de Jimmy du
               22/10 : neuf cases vertes ne disent pas laquelle est R5. Le
               survol d'un segment annonce son étape, et précise si elle est
               franchie — la couleur le dit déjà, mais pas pour qui hésite
               entre deux teintes voisines de la rampe.

               IL PREND LE PAS SUR CELUI DE LA LIGNE, et c'est le comportement
               voulu : le navigateur affiche le `title` de l'élément le plus
               PROCHE du curseur. Sur la barre on lit donc l'étape, et sur le
               nom du client ou ses chiffres, les postes. Deux informations,
               deux zones, aucune ne masque l'autre. */
            <div
              key={e.cle}
              className={`${styles.segment} ${atteint ? styles.atteint : ''}`}
              /* Le décalage échelonne l'entrée des segments de gauche à droite,
                 ce que faisait le rAF — sans jamais porter la valeur. */
              style={atteint
                ? { background: e.couleur, animationDelay: `${(e.rang - 1) * 45}ms` }
                : undefined}
              title={`${e.libelle} · ${atteint ? 'étape franchie' : 'pas encore atteinte'}`}
            />
          );
        })}
      </div>
      <div className={styles.valeurs} style={{ gridTemplateColumns: `repeat(${valeurs.length}, 56px)` }}>
        {valeurs.map((v, i) => <span key={i}>{v}</span>)}
      </div>
    </div>
  );
}
