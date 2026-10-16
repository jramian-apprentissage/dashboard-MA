/* LE VOCABULAIRE DES TYPES DE MISSION, UN SEUL JEU POUR TOUTE LA MAISON.
 *
 * C'est la règle posée par Clémence le 08/10 : « reprends systématiquement le
 * vocabulaire métier que vous avez dans Mon Ambassadeur ». Ces libellés
 * vivaient en haut de FocusCommercial.jsx ; ils sont sortis ici le 16/10 parce
 * que le Dash RH en a besoin à son tour, et que deux copies d'une table de
 * correspondance finissent toujours par diverger — celle-ci a déjà changé une
 * fois, il n'y a pas de raison que ce soit la dernière.
 *
 * « Informatique » et « Digital Services » ont été remplacés par « Tech » et
 * « Service digital » le 12/10, à la demande de Jimmy, pour coller à ce qui se
 * dit en interne. « Support client » et non « Customer Success », même raison,
 * même jour : le code de mission reste CS, il vient de Monday.
 *
 * LA MAQUETTE DU DASH RH ÉCRIT « Tech & Innovation », « Support Client » et
 * « Service Digital ». On garde la forme ci-dessous, qui est celle que Jimmy a
 * arbitrée le 12/10 et qui est déjà affichée en production sur le dashboard
 * commercial : deux dashboards de la même maison ne peuvent pas nommer
 * différemment les mêmes cinq départements.
 *
 * À NE PAS CONFONDRE avec les secteurs d'activité des CLIENTS, qui vivent dans
 * server/src/secteurs.js et gardent leur « Services informatiques ».
 *
 * Le code à deux lettres est le préfixe du libellé de poste, avant le tiret :
 * « SO - Téléprospecteur » donne SO. Côté RH il est extrait à l'ingestion, voir
 * server/src/rhIngestion.js, fonction famille().
 */
export const LIBELLES_FAMILLE = {
  SO: 'Commercial',
  AV: 'Administratif',
  CS: 'Support client',
  IT: 'Tech',
  DS: 'Service digital',
};

/* Retombe sur le code brut plutôt que sur un vide : si le classeur invente un
   sixième préfixe, mieux vaut lire « XX » sur l'écran et aller voir, que de
   perdre silencieusement une ligne ou d'afficher une case blanche. */
export const libelleFamille = code => LIBELLES_FAMILLE[code] || code;
