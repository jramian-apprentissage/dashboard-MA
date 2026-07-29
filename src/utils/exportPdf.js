import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
export async function exportDashboardPdf({
  contentEl,
  fileName = 'dashboard.pdf',
  title,
  periodLabel,
  maLogoSrc,
  clientLogoSrc,
}) {
  if (!contentEl) throw new Error('Contenu à exporter introuvable.');

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

  // windowWidth force le rendu dans une largeur "desktop" fixe, indépendamment
  // de la taille d'écran réelle de la personne qui clique sur Extraire — le
  // PDF envoyé à un client externe doit toujours montrer la grille complète,
  // jamais l'empilement mobile.
  const canvas = await html2canvas(contentEl, {
    scale: 1.5,
    backgroundColor: '#FBFBFB',
    useCORS: true,
    windowWidth: 1280,
    width: contentEl.scrollWidth < 1280 ? 1280 : undefined,
  });
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const firstPageCapacity = pageHeight - headerBottom - margin;
  const pageCapacity = pageHeight - margin * 2;

  pdf.addImage(imgData, 'JPEG', margin, headerBottom, imgWidth, imgHeight);
  let shown = Math.min(imgHeight, firstPageCapacity);

  while (shown < imgHeight) {
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', margin, margin - shown, imgWidth, imgHeight);
    shown += pageCapacity;
  }

  pdf.save(fileName);
}
