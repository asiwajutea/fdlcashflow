import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Renders every `.ct-page` inside the given container as one A4 PDF page.
 * Falls back to slicing a single long capture when no pages are found.
 */
export async function exportContractPdf(containerId: string, filename: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // The on-screen renderer shrinks the A4 sheet to fit its container.
  // Neutralise that transform so the PDF always captures at full A4 size.
  const prevTransform = container.style.transform;
  const parent = container.parentElement;
  const prevParentH = parent?.style.height;
  const prevParentOverflow = parent?.style.overflow;
  container.style.transform = 'none';
  if (parent) { parent.style.height = 'auto'; parent.style.overflow = 'visible'; }

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();

  const pages = Array.from(container.querySelectorAll<HTMLElement>('.ct-page'));
  const targets = pages.length ? pages : [container];

  try {


  for (let i = 0; i < targets.length; i++) {
    const canvas = await html2canvas(targets[i], {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth: targets[i].scrollWidth,
    });
    const img = canvas.toDataURL('image/jpeg', 0.92);
    const ratio = canvas.height / canvas.width;
    const h = Math.min(ph, pw * ratio);
    if (i > 0) pdf.addPage();
    pdf.addImage(img, 'JPEG', 0, 0, pw, h);
  }

  pdf.save(filename);
}
