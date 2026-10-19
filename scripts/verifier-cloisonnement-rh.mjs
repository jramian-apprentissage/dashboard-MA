/* Fait échouer la construction si le Dash RH franchit la frontière.
 *
 * POURQUOI CE SCRIPT EXISTE. Le Dash RH ne doit apparaître que sur le front de
 * développement, dashboard-ma-rh.vercel.app, et jamais sur la production,
 * dashboard-ma.vercel.app. Aujourd'hui cela tient à une variable d'environnement
 * posée sur un projet Vercel et pas sur l'autre : une case cochée par erreur,
 * un copier-coller de configuration, et la séparation tombe sans que personne
 * ne s'en aperçoive, parce qu'une entrée de navigation en trop ne casse rien.
 *
 * Ce script transforme donc la convention en mécanisme. Il tourne à chaque
 * construction, y compris celles de Vercel.
 *
 * COMMENT IL SAIT QUELLE CONSTRUCTION IL REGARDE, et pourquoi il accepte deux
 * façons de le lui dire. `npm run build` le déclenche par le hook postbuild,
 * sans rien lui passer : pas de drapeau, donc attente de production.
 * `npm run build:rh` l'appelle en toutes lettres avec --rh, parce que deux
 * choses l'empêchent de deviner. D'abord npm n'attache postbuild qu'au script
 * nommé `build` : pendant des semaines `build:rh` n'a donc rien vérifié du
 * tout, constaté le 19/10. Ensuite `vite build --mode rh` lit bien
 * VITE_DASH_RH dans .env.rh, mais pour lui-même : la variable ne passe pas
 * dans process.env du script suivant. Sans le drapeau, la vérification qui
 * suit une construction RH croirait regarder la production et échouerait.
 * La variable d'environnement reste acceptée, c'est elle que pose le projet
 * Vercel du front RH, et `VITE_DASH_RH=1` en préfixe ne marche pas sous
 * Windows.
 *
 * CE QU'IL VÉRIFIE, et pourquoi c'est ce marqueur-là. L'entrée de navigation
 * est ce qui rend le dashboard ATTEIGNABLE : sans elle et sans sa route, le
 * reste du code est inerte. On la cherche donc dans le paquet livré, et on
 * exige l'exact inverse selon le drapeau.
 *
 * CE QU'IL NE VÉRIFIE PAS, et c'est assumé. Le morceau chargé à la demande
 * RhEffectifs-*.js est produit dans les deux cas, parce que Rollup fabrique un
 * morceau dès qu'il voit un import() dans le source, même en branche morte. Ce
 * morceau ne porte que des libellés d'interface, aucune donnée et aucun jeton,
 * et aucune route n'y mène en production. L'éliminer demanderait un aliasing
 * conditionnel dans la configuration de build, porté par tout le monde et pour
 * toujours.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const DIST = 'dist/assets';
/* L'entrée du menu. C'est elle qui décide si le dashboard existe pour
   l'utilisateur, et elle vit dans DASHBOARDS, derrière le drapeau. */
const MARQUEUR = 'Suivi des effectifs';
const RH_ACTIF = process.env.VITE_DASH_RH === '1' || process.argv.includes('--rh');

let fichiers;
try {
  fichiers = readdirSync(DIST).filter(f => f.endsWith('.js'));
} catch {
  console.error(`verif:rh — ${DIST} est introuvable. La construction a-t-elle abouti ?`);
  process.exit(1);
}

const porteurs = fichiers.filter(f => readFileSync(join(DIST, f), 'utf8').includes(MARQUEUR));

if (RH_ACTIF && porteurs.length === 0) {
  console.error(
    'verif:rh — ÉCHEC. Cette construction est annoncée comme celle du front '
    + `RH, mais le paquet ne contient pas l'entrée de navigation `
    + `« ${MARQUEUR} ». Le front de développement ne `
    + "montrerait pas le Dash RH. Vérifier que config/dashRh.js lit bien la "
    + 'variable, et que le mode de build la reçoit : sur Vercel elle vient '
    + 'des variables du projet, en local de .env.rh via --mode rh.',
  );
  process.exit(1);
}

if (!RH_ACTIF && porteurs.length > 0) {
  console.error(
    'verif:rh — ÉCHEC. Ni --rh ni VITE_DASH_RH=1, donc cette construction '
    + `est celle de la PRODUCTION, et pourtant l'entrée de navigation `
    + `« ${MARQUEUR} » est dans le paquet : ${porteurs.join(', ')}.\n`
    + 'Le Dash RH apparaîtrait sur dashboard-ma.vercel.app, devant des gens à '
    + "qui il n'est pas destiné. Construction interrompue.\n"
    + "Cause la plus probable : une déclaration du Dash RH posée en dehors de "
    + 'DASH_RH_ACTIF, ou un ternaire remplacé par un appel de fonction, dont '
    + "l'argument est évalué avant l'appel et survit donc à l'élimination de "
    + 'code mort.',
  );
  process.exit(1);
}

console.log(
  `verif:rh — ok. ${RH_ACTIF ? 'Front RH' : 'Production'} : l'entrée « ${MARQUEUR} » est `
  + `${RH_ACTIF ? 'bien présente' : 'bien absente'}.`,
);
