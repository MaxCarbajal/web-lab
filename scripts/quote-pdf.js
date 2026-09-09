/*
 * Generador de PDF de resumen de cotización, compartido por las propuestas en /propuestas.
 * Requiere que la página haya cargado jsPDF (UMD) antes de este script:
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 *
 * Uso desde una propuesta:
 *   generateQuotePDF({
 *     title, client, institution,
 *     amountLabel, amountNote,
 *     serviceSummary,
 *     deliverables: [...],
 *     schedule: [{ phase, dur }, ...],
 *     totalDuration,
 *     color: [r, g, b],
 *     filename,
 *   });
 */
function generateQuotePDF(quote) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const marginX = 20;
  const maxW = 170;
  const pageBottom = 282;
  let y = 22;

  function ensureSpace(h) {
    if (y + h > pageBottom) {
      doc.addPage();
      y = 22;
    }
  }

  function heading1(text) {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...quote.color);
    const lines = doc.splitTextToSize(text, maxW);
    doc.text(lines, marginX, y);
    y += lines.length * 7 + 3;
  }

  function heading2(text) {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...quote.color);
    doc.text(text, marginX, y);
    y += 7;
  }

  function paragraph(text, opts) {
    const color = (opts && opts.color) || [40, 40, 40];
    const size = (opts && opts.size) || 10.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxW);
    ensureSpace(lines.length * 5 + 2);
    doc.text(lines, marginX, y);
    y += lines.length * 5 + 4;
  }

  function bulletList(items) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    items.forEach((item) => {
      const lines = doc.splitTextToSize('- ' + item, maxW - 4);
      ensureSpace(lines.length * 5 + 1);
      doc.text(lines, marginX + 2, y);
      y += lines.length * 5 + 2;
    });
    y += 2;
  }

  function scheduleList(items) {
    items.forEach((item) => {
      const lines = doc.splitTextToSize(item.phase + ': ' + item.dur, maxW);
      ensureSpace(lines.length * 5 + 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(40, 40, 40);
      doc.text(lines, marginX, y);
      y += lines.length * 5 + 3;
    });
    y += 1;
  }

  heading1(quote.title);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(110, 110, 110);
  const today = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text('Resumen de cotizacion - generado el ' + today, marginX, y);
  y += 10;

  heading2('Cliente e institucion');
  paragraph(quote.client + ' - ' + quote.institution);

  heading2('Monto de la inversion');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...quote.color);
  ensureSpace(8);
  doc.text(quote.amountLabel, marginX, y);
  y += 7;
  paragraph(quote.amountNote, { color: [90, 90, 90], size: 9.5 });

  heading2('Servicio');
  paragraph(quote.serviceSummary);

  heading2('Entregables');
  bulletList(quote.deliverables);

  heading2('Cronograma');
  scheduleList(quote.schedule);
  paragraph('Duracion total estimada: ' + quote.totalDuration, { color: [90, 90, 90], size: 9.5 });

  doc.save(quote.filename);
}
