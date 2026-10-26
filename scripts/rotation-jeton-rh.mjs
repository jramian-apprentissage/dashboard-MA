/* Fait tourner le secret de l'API RH, en local et sur Railway, sans jamais
 * l'afficher.
 *
 * POURQUOI CE SCRIPT EXISTE. Le 26/10, API_RH_TOKEN a été trouvé en clair dans
 * le JavaScript livré du front de recette : un paquet se télécharge sans se
 * connecter, donc le secret était lisible par qui connaissait l'adresse. Les
 * routes sont depuis derrière la session et le front n'embarque plus rien,
 * mais LA VALEUR AYANT ÉTÉ PUBLIQUE, elle doit changer : les déploiements
 * Vercel précédents restent accessibles à leur URL immuable et la portent
 * encore.
 *
 * POURQUOI UN SCRIPT PLUTÔT QUE TROIS COMMANDES. Parce que les trois doivent
 * rester d'accord : le serveur local, le harnais d'aperçu et Railway. Une
 * rotation faite à moitié se manifeste par un 401 qu'on met dix minutes à
 * comprendre. Et parce qu'un secret qu'on copie-colle finit dans un
 * presse-papiers, un historique de terminal ou une transcription.
 *
 * CE QU'IL NE FAIT PAS : il ne touche à aucune variable Vercel. Les projets
 * front n'ont plus besoin du secret ; s'ils en portent encore une copie sous
 * le nom VITE_API_RH_TOKEN, il faut la renommer en API_RH_TOKEN, qui ne peut
 * pas être injectée dans le navigateur par Vite.
 *
 * Usage :  node scripts/rotation-jeton-rh.mjs
 *          node scripts/rotation-jeton-rh.mjs --local   (sans toucher Railway)
 */
import { randomBytes } from 'crypto';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const API = 'https://dashboard-ma-backend-production.up.railway.app/api/rh/effectifs?au=2026-01-31';
const LOCAL_SEULEMENT = process.argv.includes('--local');

/* 24 octets en base64url donnent 32 caractères sans ponctuation : la même
   forme que le secret actuel, et rien qui doive être échappé dans une URL,
   un fichier .env ou une ligne de commande. */
const nouveau = randomBytes(24).toString('base64url');

/* L'ancien sert à une seule chose : vérifier à la fin qu'il ne s'ouvre plus.
   Un test qui ne constate que le succès du nouveau ne prouve pas que la
   rotation a eu lieu. */
function lireCle(chemin, cle) {
  if (!existsSync(chemin)) return null;
  const m = readFileSync(chemin, 'utf8').match(new RegExp(`^${cle}=(.*)$`, 'm'));
  return m ? m[1].trim() : null;
}

const ancien = lireCle('server/.env', 'API_RH_TOKEN');

function remplacer(chemin, cle) {
  if (!existsSync(chemin)) {
    console.log(`  ${chemin} : absent, ignoré`);
    return;
  }
  const avant = readFileSync(chemin, 'utf8');
  const motif = new RegExp(`^${cle}=.*$`, 'm');
  if (!motif.test(avant)) {
    console.log(`  ${chemin} : pas de ligne ${cle}, ignoré`);
    return;
  }
  writeFileSync(chemin, avant.replace(motif, `${cle}=${nouveau}`));
  console.log(`  ${chemin} : ${cle} remplacé`);
}

console.log('Fichiers locaux');
remplacer('server/.env', 'API_RH_TOKEN');
remplacer('.env.rh', 'VITE_API_RH_TOKEN');

if (LOCAL_SEULEMENT) {
  console.log('\n--local : Railway non touché. Le serveur de production garde '
    + "l'ancien secret, le poste local a le nouveau.");
  process.exit(0);
}

console.log('\nRailway');
try {
  /* execFileSync et non une chaîne shell : le secret ne passe ainsi par aucun
     interpréteur, donc ni par l'historique du terminal. */
  execFileSync('railway', ['variables', '--set', `API_RH_TOKEN=${nouveau}`], {
    cwd: 'server',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  console.log('  variable posée, le service redéploie');
} catch (e) {
  console.error('  ÉCHEC : ' + (e.stderr?.toString().trim() || e.message));
  console.error('  Le poste local porte déjà le nouveau secret : relancer ce '
    + 'script après `railway login`, ou poser la variable à la main.');
  process.exit(1);
}

/* Le redéploiement prend une minute ou deux. On attend qu'il soit vraiment
   passé plutôt que d'annoncer une rotation qui n'a pas encore pris. */
console.log('\nVérification, le temps que le redéploiement passe');
const entete = jeton => ({ headers: { Authorization: `Bearer ${jeton}` } });

for (let essai = 1; essai <= 24; essai++) {
  const neuf = await fetch(API, entete(nouveau)).then(r => r.status).catch(() => 0);
  const vieux = ancien
    ? await fetch(API, entete(ancien)).then(r => r.status).catch(() => 0)
    : 401;
  if (neuf === 200 && vieux === 401) {
    console.log(`  ok après ${essai} essai(s) : le nouveau secret ouvre, l'ancien est mort.`);
    process.exit(0);
  }
  console.log(`  essai ${essai} : nouveau ${neuf}, ancien ${vieux}`);
  await new Promise(r => setTimeout(r, 10000));
}

console.error("  Le redéploiement n'a pas abouti dans les quatre minutes. "
  + 'Regarder les journaux Railway.');
process.exit(1);
