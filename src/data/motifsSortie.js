/* LES MOTIFS DE FIN DE MISSION, ET LEUR FORME LISIBLE.
 *
 * Même rôle que LIBELLES_FAMILLE dans familles.js, et posé au même endroit
 * pour la même raison : la base stocke une forme normalisée, l'écran doit
 * afficher une forme écrite, et deux copies de cette table finiraient par
 * diverger.
 *
 * POURQUOI LA BASE NORMALISE. La colonne brute du classeur porte « Arrêt
 * client » 121 fois et « Arrêt Client » 5 fois, « Fin de Mission » 8 fois et
 * « Fin de mission » 4 fois. Groupée telle quelle, elle afficherait deux
 * lignes pour un même motif, dont une à 5 qui passerait pour marginale alors
 * que l'arrêt client est de loin la première cause. L'ingestion pose donc un
 * jumeau normalisé, motif_normal, et c'est lui qu'on groupe.
 *
 * LA CHAÎNE VIDE EST UN MOTIF COMME LES AUTRES, et il ne faut pas la cacher :
 * quatre fins de mission de 2026 n'ont aucun motif saisi. Les faire
 * disparaître de la carte fausserait les parts de toutes les autres, et
 * surtout masquerait un défaut de saisie que la RH a intérêt à voir.
 *
 * CES CINQ VALEURS SONT TOUT CE QUE LA BASE CONNAÎT, vérifié le 19/10 sur les
 * 220 sorties. À ne pas confondre avec les onze causes détaillées de la
 * maquette, qui ne sortent pas de cette colonne mais du commentaire en texte
 * libre, et qui restent à construire.
 */
export const LIBELLES_MOTIF = {
  'arret client': 'Arrêt client',
  demission: 'Démission',
  'fin de mission': 'Fin de mission',
  'stand by': 'Stand by',
  '': 'Motif non saisi',
};

export const libelleMotif = (motif) =>
  LIBELLES_MOTIF[motif] ?? (motif ? `${motif[0].toUpperCase()}${motif.slice(1)}` : 'Motif non saisi');
