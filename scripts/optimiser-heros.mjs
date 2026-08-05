/* Réencode en WebP les images matricielles embarquées dans les SVG de fond.
 *
 * Ces fichiers ne sont pas des dessins vectoriels : chacun est une photo PNG
 * encodée en base64 à l'intérieur d'une coquille SVG. PNG est sans perte, donc
 * inadapté à une photo, et le base64 rajoute 33 % par-dessus — d'où 11,2 Mo
 * d'assets pour cinq images de fond, sur un build qui en pesait 14.
 *
 * On ne remplace QUE la charge base64. La coquille SVG (masques, filtres,
 * dégradés, patterns, transformations, et les attributs width/height de la
 * balise <image>) reste octet pour octet identique : le rendu ne change pas,
 * seule la façon dont les pixels sont stockés change. C'est aussi pour ça
 * qu'un redimensionnement reste sûr — les dimensions déclarées ne bougent pas,
 * le raster est simplement rééchantillonné dedans.
 *
 * La qualité est réglée sur la visibilité réelle de chaque fond, mesurée dans
 * les CSS : un fond rendu à opacity 0.18 n'a pas besoin de la même finesse
 * qu'un fond affiché en pleine opacité.
 *
 * Script ponctuel, conservé pour retrouver les réglages si les visuels sont
 * un jour réexportés depuis Figma. Usage : node scripts/optimiser-heros.mjs
 * (nécessite sharp, non listé en dépendance : npm i -D sharp le temps du run).
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, statSync } from 'node:fs';

// opacite = celle appliquée par la CSS au .heroBg correspondant, qui justifie
// le niveau de qualité retenu.
const CIBLES = [
  // q95 plutôt que 90 : c'est un dégradé sombre quasi uni, la forme d'image
  // où le lossy produit des bandes. La mesure ne montre pas de banding (le
  // grain du PNG d'origine le dissout — c'est d'ailleurs pourquoi son
  // équivalent sans perte pèse encore 736 Ko), mais 30 Ko de plus sur un
  // fichier qui tombe de 1,87 Mo à 68 Ko est une assurance gratuite.
  { fichier: 'bg.svg',            qualite: 95, opacite: '1 (Commercial RC)' },
  { fichier: 'hero-activite.svg', qualite: 90, opacite: '1 (Activité)' },
  { fichier: 'hero-home.svg',     qualite: 80, opacite: '0.22 (Accueil, Glossaire)' },
  { fichier: 'hero-admin.svg',    qualite: 80, opacite: '0.18 (Admin)' },
  // Seul fichier redimensionné : 2000 px de large pour un cadre de 1700,
  // affiché à 0.18. 1600 laisse de la marge en écran haute densité.
  { fichier: 'hero-login.svg',    qualite: 78, largeur: 1600, opacite: '0.18 (Connexion)' },
];

// En dessous de ce seuil, l'image n'est pas une photo mais un petit masque ou
// une texture : la convertir ne rapporte rien et risque d'altérer un filtre.
const SEUIL_OCTETS = 50_000;

const MOTIF = /data:image\/([a-z]+);base64,([A-Za-z0-9+/=]+)/g;

let totalAvant = 0;
let totalApres = 0;

for (const { fichier, qualite, largeur, opacite } of CIBLES) {
  const chemin = new URL(`../src/assets/${fichier}`, import.meta.url);
  const avant = statSync(chemin).size;
  let svg = readFileSync(chemin, 'utf8');

  let converties = 0;
  const remplacements = [];
  for (const m of svg.matchAll(MOTIF)) {
    const brut = Buffer.from(m[2], 'base64');
    if (brut.length < SEUIL_OCTETS) continue;
    let pipeline = sharp(brut);
    if (largeur) pipeline = pipeline.resize({ width: largeur });
    const webp = await pipeline.webp({ quality: qualite }).toBuffer();
    remplacements.push([m[0], `data:image/webp;base64,${webp.toString('base64')}`]);
    converties++;
  }
  for (const [avantTxt, apresTxt] of remplacements) svg = svg.replace(avantTxt, apresTxt);

  writeFileSync(chemin, svg);
  const apres = statSync(chemin).size;
  totalAvant += avant;
  totalApres += apres;

  const gain = ((1 - apres / avant) * 100).toFixed(1);
  console.log(
    `${fichier.padEnd(20)} ${(avant / 1024 / 1024).toFixed(2)} Mo -> ${(apres / 1024).toFixed(0)} Ko` +
    `  (-${gain} %, q${qualite}${largeur ? `, ${largeur} px` : ''}, ${converties} image(s))` +
    `  · opacity ${opacite}`,
  );
}

/* Le hero ASUS, lui, est un vrai fichier image et non un SVG déguisé. Il part
   d'un JPEG déjà compressé, donc le gain est plus modeste que sur les PNG
   ci-dessus — mais c'est l'asset le plus lourd du dashboard client, et le seul
   qui restait au format d'origine. q82 mesure 42 dB de PSNR face au JPEG
   source : la différence n'est pas visible, elle est sous le bruit du JPEG.

   Le fichier .jpg d'origine est conservé : c'est la source, et elle n'est plus
   référencée par le code une fois l'import basculé sur le .webp. */
const asus = new URL('../src/assets/hero-asus.jpg', import.meta.url);
const asusWebp = new URL('../src/assets/hero-asus.webp', import.meta.url);
const asusAvant = statSync(asus).size;
writeFileSync(asusWebp, await sharp(readFileSync(asus)).webp({ quality: 82 }).toBuffer());
const asusApres = statSync(asusWebp).size;
totalAvant += asusAvant;
totalApres += asusApres;
console.log(
  `${'hero-asus.jpg'.padEnd(20)} ${(asusAvant / 1024).toFixed(0)} Ko -> ${(asusApres / 1024).toFixed(0)} Ko` +
  `  (-${((1 - asusApres / asusAvant) * 100).toFixed(1)} %, q82)  · opacity 1 (ASUS)`,
);

console.log(
  `\nTotal ${(totalAvant / 1024 / 1024).toFixed(2)} Mo -> ${(totalApres / 1024).toFixed(0)} Ko ` +
  `(-${((1 - totalApres / totalAvant) * 100).toFixed(1)} %)`,
);
