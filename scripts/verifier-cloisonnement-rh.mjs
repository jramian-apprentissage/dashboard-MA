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
 * nommé `build` : `build:rh` ne vérifiait donc rien du tout, constaté le
 * 19/10. Ensuite `vite build --mode rh` lit bien VITE_DASH_RH dans .env.rh,
 * mais pour lui-même : la variable ne passe pas dans process.env du script
 * suivant. Sans le drapeau, la vérification qui suit une construction RH
 * croirait regarder la production et échouerait. Le drapeau a l'avantage de
 * marcher sous Windows, où `VITE_DASH_RH=1 npm run ...` n'existe pas.
 *
 * CE TROU NE CONCERNAIT QUE LE POSTE LOCAL, vérifié le 19/10 dans les
 * réglages Vercel plutôt que supposé. Les DEUX projets sont en commande de
 * build par défaut, l'override décoché : dashboard-ma en préréglage « Other »
 * et dashboard-ma-rh en préréglage « Vite » lancent l'un comme l'autre
 * `npm run build`. Le front RH n'est donc pas construit avec `build:rh` en
 * ligne ; son postbuild tourne, et c'est VITE_DASH_RH posée dans les
 * variables du projet qui lui dit de quel côté il est.
 *
 * CE QUI RESTE OUVERT, ET QUI N'EST PAS RIEN. Tant que le front RH se
 * construit avec `npm run build`, la disparition de VITE_DASH_RH y serait
 * MUETTE : sans elle le paquet ne contient plus le marqueur, le script croit
 * regarder la production, et il dit « ok, bien absente » pendant que le site
 * RH perd son dashboard. Le cas que ce script sait justement nommer, il ne
 * peut pas le voir s'il n'est pas prévenu. Basculer la commande de build du
 * projet RH sur `npm run build:rh` le préviendrait, et transformerait cette
 * panne silencieuse en construction rouge. Décision de Jimmy, pas du code.
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
const MARQUEURS = [
  /* L'entrée de navigation du premier dashboard RH. */
  'Suivi des effectifs',
  /* Le titre de carte d'accueil du second dashboard. Son libellé de
     navigation, « Recrutement », est un mot trop courant pour servir de
     marqueur ; sa route, « /rh-recrutement », a été essayée et REJETÉE le
     21/10 parce qu'elle vit dans le morceau paresseux, que Rollup émet même
     en branche morte. Ce titre-là vit dans Home.jsx, donc dans le paquet
     principal, derrière le drapeau : c'est exactement la même nature que le
     marqueur du premier dashboard.
     Sans ce second marqueur, une fuite du dashboard Recrutement serait
     passée sans bruit, le garde-fou ne cherchant que le premier. */
  'Dashboard RH - Recrutement et pipeline',
];
const RH_ACTIF = process.env.VITE_DASH_RH === '1' || process.argv.includes('--rh');

let fichiers;
try {
  fichiers = readdirSync(DIST).filter(f => f.endsWith('.js'));
} catch {
  console.error(`verif:rh — ${DIST} est introuvable. La construction a-t-elle abouti ?`);
  process.exit(1);
}

/* Un marqueur manquant suffit à alerter, un seul marqueur présent suffit à
   dénoncer : on garde donc le détail de chacun plutôt qu'un booléen global. */
const parMarqueur = MARQUEURS.map(m => ({
  marqueur: m,
  porteurs: fichiers.filter(f => readFileSync(join(DIST, f), 'utf8').includes(m)),
}));
const absents = parMarqueur.filter(x => x.porteurs.length === 0);
const presents = parMarqueur.filter(x => x.porteurs.length > 0);

if (RH_ACTIF && absents.length > 0) {
  console.error(
    'verif:rh — ÉCHEC. Cette construction est annoncée comme celle du front '
    + `RH, mais le paquet ne contient pas l'entrée de navigation `
    + `${absents.map(x => `« ${x.marqueur} »`).join(' et ')}. Le front de développement ne `
    + "montrerait pas le Dash RH. Vérifier que config/dashRh.js lit bien la "
    + 'variable, et que le mode de build la reçoit : sur Vercel elle vient '
    + 'des variables du projet, en local de .env.rh via --mode rh.',
  );
  process.exit(1);
}

if (!RH_ACTIF && presents.length > 0) {
  console.error(
    'verif:rh — ÉCHEC. Ni --rh ni VITE_DASH_RH=1, donc cette construction '
    + `est celle de la PRODUCTION, et pourtant le paquet porte `
    + `${presents.map(x => `« ${x.marqueur} » dans ${x.porteurs.join(', ')}`).join(', et ')}.\n`
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
  `verif:rh — ok. ${RH_ACTIF ? 'Front RH' : 'Production'} : les ${MARQUEURS.length} entrées RH sont `
  + `${RH_ACTIF ? 'bien présentes' : 'bien absentes'}.`,
);
