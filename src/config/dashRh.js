/* CLOISONNEMENT DU DASH RH — point d'entrée unique.
 *
 * Le Dash RH se construit avec Clémence Menestret, qui est extérieure à Mon
 * Ambassadeur. Les données RH sont nominatives : salaires, motifs de départ,
 * noms de collaborateurs. Décision du 13/10/2026 : on lui montre un aperçu à
 * données factices, jamais un accès au dashboard de production.
 *
 * TROIS CHOSES À SAVOIR AVANT DE TOUCHER À CE FICHIER.
 *
 * 1. `import.meta.env` est remplacé à la COMPILATION par Vite, pas lu à
 *    l'exécution. Un build sans VITE_DASH_RH ne contient donc même pas le code
 *    des pages RH : les conditions deviennent `false`, et l'élimination de code
 *    mort retire du paquet livré les routes, les pages et les fixtures. Le
 *    cloisonnement n'est pas une discipline, il est mécanique.
 *
 * 2. DASH_RH_DEMO_PUBLIQUE ouvre une route SANS authentification. Elle n'est
 *    défendable que parce que le même mode prive le build de toute adresse
 *    d'API (voir .env.demo-rh) : même si l'adresse fuite, il n'y a aucune
 *    donnée réelle derrière, parce qu'il n'existe aucun chemin vers elle.
 *
 * 3. Les deux drapeaux ne s'allument jamais sur la production du dashboard.
 *    `npm run verif:rh`, branché sur prebuild, casse la compilation si un
 *    fichier RH importe le client d'API.
 */

export const DASH_RH_ACTIF = import.meta.env.VITE_DASH_RH === '1';
export const DASH_RH_DEMO_PUBLIQUE = import.meta.env.VITE_DASH_RH_DEMO === '1';

/* Les identifiants de dashboard que le Dash RH ajoute. Le second, le suivi des
   effectifs, arrive quand ses décisions seront prises : sa première vue porte
   encore une tuile intitulée « indicateur à définir ». */
export const DASH_RH_IDS = ['rh-recrutement'];

/* Posé sur chaque jeu de fixtures. Sert à deux choses : le repérer d'un coup
   d'œil dans les outils de développement, et permettre au hook de refuser une
   donnée qui ne le porterait pas. */
export const MARQUEUR_DEMO = 'FIXTURE-RH-DEMO-NE-PAS-BRANCHER-A-L-API';
