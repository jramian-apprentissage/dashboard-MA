/* jsPDF et html2canvas sont importés dynamiquement, dans la fonction d'export
   (voir plus bas), et non en tête de fichier.

   Ils pèsent à eux deux ~470 Ko minifiés. Importés statiquement, ils étaient
   embarqués dans le morceau du dashboard ASUS — donc téléchargés par chaque
   client à l'ouverture de la page, pour une fonction que la plupart
   n'utilisent jamais. L'export est déclenché par un clic explicite : y ajouter
   un aller-retour réseau ne se remarque pas, la génération du PDF prend de
   toute façon plusieurs secondes. */

// Rasterise un logo (SVG ou PNG importé par Vite) en PNG — jsPDF ne sait pas
// dessiner de SVG directement, donc on le passe par un <canvas> une fois,
// à une largeur fixe (suffisante pour l'impression, fichier léger).
function loadImageAsPng(src, maxWidthPx) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(1, maxWidthPx / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
    };
    img.onerror = reject;
    img.src = src;
  });
}

function drawLogo(pdf, logo, x, y, targetH) {
  if (!logo) return 0;
  const w = targetH * (logo.width / logo.height);
  pdf.addImage(logo.dataUrl, 'PNG', x, y, w, targetH);
  return w;
}

/* Capture le contenu du dashboard (Cards/graphes déjà rendus dans le DOM) et
   compose un PDF multi-pages : en-tête (logos MA + client, titre, période)
   sur la première page, puis l'image du dashboard découpée page par page. */
/* Largeur de rendu imposée à l'export : le PDF part chez un client externe,
   il doit toujours montrer la grille desktop, jamais l'empilement mobile. */
const LARGEUR_EXPORT = 1280;

/* Capture en largeur desktop, graphes compris.

   html2canvas clone le document dans un cadre de LARGEUR_EXPORT et y réévalue
   les media queries : la mise en page du clone est donc bien celle du desktop.
   Mais un graphe Chart.js est un <canvas>, et html2canvas en recopie le bitmap
   tel quel — à la taille qu'il avait à l'écran. Depuis un téléphone, le graphe
   restait donc à ~360 px de large dans une carte capturée à 1280, et sortait
   tassé dans le tiers gauche avec du vide à droite (retour Clémence, 20/08).

   On élargit donc réellement le conteneur avant de capturer, et on redimensionne
   les graphes pour que leur bitmap suive. Chart.getChart() rend l'instance
   attachée à un canvas : pas d'attente au jugé sur un ResizeObserver, on force
   et on rend la main à l'image suivante. Tout est remis en place ensuite, y
   compris si la capture échoue. */
async function enLargeurDesktop(el, largeur, capture) {
  if (el.clientWidth >= largeur) return capture();

  const { Chart } = await import('chart.js');
  const graphes = () =>
    [...el.querySelectorAll('canvas')].map(c => Chart.getChart(c)).filter(Boolean);

  const avant = { width: el.style.width, maxWidth: el.style.maxWidth };
  el.style.width = `${largeur}px`;
  el.style.maxWidth = 'none';
  graphes().forEach(g => g.resize());
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    return await capture();
  } finally {
    el.style.width = avant.width;
    el.style.maxWidth = avant.maxWidth;
    graphes().forEach(g => g.resize());
  }
}

export async function exportDashboardPdf({
  contentEl,
  fileName = 'dashboard.pdf',
  title,
  periodLabel,
  maLogoSrc,
  clientLogoSrc,
}) {
  if (!contentEl) throw new Error('Contenu à exporter introuvable.');

  // Les deux téléchargements partent ensemble : ils ne dépendent pas l'un de
  // l'autre, les enchaîner doublerait l'attente pour rien.
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 32;

  const [maLogo, clientLogo] = await Promise.all([
    maLogoSrc ? loadImageAsPng(maLogoSrc, 260) : null,
    clientLogoSrc ? loadImageAsPng(clientLogoSrc, 200) : null,
  ]);

  const logoH = 22;
  let cursorY = margin;

  if (maLogo) drawLogo(pdf, maLogo, margin, cursorY, logoH);
  if (clientLogo) {
    const w = logoH * (clientLogo.width / clientLogo.height);
    drawLogo(pdf, clientLogo, pageWidth - margin - w, cursorY, logoH);
  }
  cursorY += logoH + 18;

  if (title) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(38, 0, 31); // myrtille
    pdf.text(title, margin, cursorY);
    cursorY += 16;
  }
  if (periodLabel) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(120, 110, 118);
    pdf.text(periodLabel, margin, cursorY);
    cursorY += 10;
  }

  cursorY += 10;
  pdf.setDrawColor(227, 225, 216);
  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 16;

  const headerBottom = cursorY;

  const canvas = await enLargeurDesktop(contentEl, LARGEUR_EXPORT, () =>
    html2canvas(contentEl, {
      scale: 1.5,
      backgroundColor: '#FBFBFB',
      useCORS: true,
      windowWidth: LARGEUR_EXPORT,
      width: contentEl.scrollWidth < LARGEUR_EXPORT ? LARGEUR_EXPORT : undefined,
    }),
  );
  // Plus d'encodage du canvas entier : chaque page encode sa seule tranche.
  const imgWidth = pageWidth - margin * 2;

  const firstPageCapacity = pageHeight - headerBottom - margin;
  const pageCapacity = pageHeight - margin * 2;

  /* Découpe du canvas page par page, plutôt que de reposer l'image entière
     décalée vers le haut à chaque fois.

     L'ancienne méthode dupliquait du contenu entre deux pages. jsPDF ne
     rogne une image qu'au bord physique de la page, pas à la marge : la
     première page affichait donc firstPageCapacity + margin de contenu alors
     que le compteur n'en retenait que firstPageCapacity. Les 32 pt de marge
     basse se retrouvaient réimprimés en haut de la page suivante, et l'écart
     se reproduisait à chaque saut — « le bas de la première page devient le
     haut de la seconde » (retour Jimmy, 20/08).

     En découpant, chaque page reçoit exactement ses lignes : plus de
     recouvrement possible, et la marge basse est réellement respectée. */
  const pxParPt = canvas.width / imgWidth;
  const trancheHaute = Math.round(firstPageCapacity * pxParPt);
  const trancheSuite = Math.round(pageCapacity * pxParPt);

  const page = document.createElement('canvas');
  const ctx = page.getContext('2d');

  let y = 0;
  let premiere = true;
  while (y < canvas.height) {
    const h = Math.min(premiere ? trancheHaute : trancheSuite, canvas.height - y);
    page.width = canvas.width;
    page.height = h;
    // Même fond que la capture : sans ce remplissage, une tranche plus courte
    // que prévu (dernière page) sortirait sur du transparent, donc du noir
    // une fois encodée en JPEG.
    ctx.fillStyle = '#FBFBFB';
    ctx.fillRect(0, 0, page.width, page.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);

    if (!premiere) pdf.addPage();
    pdf.addImage(
      page.toDataURL('image/jpeg', 0.92),
      'JPEG',
      margin,
      premiere ? headerBottom : margin,
      imgWidth,
      h / pxParPt,
    );

    y += h;
    premiere = false;
  }

  pdf.save(fileName);
}
