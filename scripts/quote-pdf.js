/*
 * Generador de PDF de resumen de cotización, compartido por las propuestas en /propuestas.
 * El PDF se arma leyendo el HTML de la propuesta en el momento de la descarga (no hay datos
 * duplicados a mano) para que nunca quede desincronizado de lo que se ve en la página.
 *
 * Requiere que la página haya cargado jsPDF + jsPDF-AutoTable (UMD) antes de este script:
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
 *
 * Uso desde una propuesta (botón dentro de la sección de Inversión):
 *   <button data-filename="cotizacion-....pdf" onclick="downloadQuotePDF(this)">Descargar cotización (PDF)</button>
 *
 * Uso desde una página índice, sin abrir la propuesta (lee el HTML por fetch):
 *   <button onclick="downloadQuotePDFFromURL('archivo-propuesta.html', 'cotizacion-....pdf')">Descargar cotización (PDF)</button>
 */

/* ---------- extracción de datos desde el HTML de la propuesta ---------- */
function extractQuoteData(doc) {
  const metaBold = doc.querySelectorAll('.hero .meta b');
  const timelineItems = [...doc.querySelectorAll('#cronograma .timeline .tl-item')];
  return {
    title: doc.querySelector('.hero h1').textContent.trim(),
    client: metaBold[0].textContent.trim(),
    institution: metaBold[1].textContent.trim(),
    amountLabel: doc.querySelector('#inversion .opt-card .price').textContent.replace(/\s+/g, ' ').trim(),
    amountNote: doc.querySelector('#inversion .note').textContent.replace(/\s+/g, ' ').trim(),
    serviceSummary: doc.querySelector('#resumen p').textContent.trim(),
    deliverables: [...doc.querySelectorAll('#alcance ul li')].map((li) => li.textContent.trim()),
    schedule: timelineItems.map((item) => ({
      phase: item.querySelector('.phase').textContent.trim(),
      dur: item.querySelector('.dur').textContent.trim(),
    })),
    totalDuration: doc.querySelector('#cronograma .opt-card .price').textContent.replace(/\s+/g, ' ').trim(),
    totalDurationNote: doc.querySelectorAll('#cronograma .note')[0].textContent.trim(),
  };
}

/* ---------- color de acento: leído del propio botón + la variable CSS que usa ---------- */
function extractAccentColor(doc, buttonEl) {
  const styleAttr = buttonEl.getAttribute('style') || '';
  const varMatch = styleAttr.match(/background:\s*var\((--[a-z0-9-]+)\)/i);
  const varName = varMatch ? varMatch[1] : null;
  const cssText = [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n');
  const hexMatch = varName && new RegExp(varName.replace(/[-]/g, '\\-') + ':\\s*#([0-9a-fA-F]{6})').exec(cssText);
  const hex = hexMatch ? hexMatch[1] : '333333';
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

/* ---------- descarga desde la propia página de la propuesta ---------- */
function downloadQuotePDF(buttonEl) {
  const data = extractQuoteData(document);
  const color = extractAccentColor(document, buttonEl);
  const filename = buttonEl.dataset.filename || 'cotizacion.pdf';
  generateQuotePDF({ ...data, color, filename });
}

/* ---------- descarga desde una página índice, sin abrir la propuesta ---------- */
async function downloadQuotePDFFromURL(url, filename) {
  const res = await fetch(url);
  const html = await res.text();
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const button = parsed.querySelector('#inversion button');
  const data = extractQuoteData(parsed);
  const color = extractAccentColor(parsed, button);
  generateQuotePDF({ ...data, color, filename });
}

/* ---------- construcción del PDF ---------- */
function generateQuotePDF(quote) {
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  const [r, g, b] = quote.color;
  const soft = [90, 96, 102];
  const faint = [235, 236, 238];

  let y = 0;

  /* ---- header band ---- */
  const bandH = 34;
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, pageW, bandH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(quote.title, contentW - 55);
  doc.text(titleLines, marginX, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('RESUMEN DE COTIZACIÓN', marginX, bandH - 6);

  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const now = new Date();
  const today = now.getDate() + ' de ' + MONTHS[now.getMonth()] + ' de ' + now.getFullYear();
  doc.setFontSize(9);
  doc.text(today, pageW - marginX, bandH - 6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(45, 48, 51);
  doc.text(quote.client, marginX, bandH + 8);
  const clientW = doc.getTextWidth(quote.client);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...soft);
  doc.text('   |   ' + quote.institution, marginX + clientW, bandH + 8);

  y = bandH + 15;

  /* ---- helpers ---- */
  function ensureSpace(h) {
    if (y + h > pageH - 20) {
      doc.addPage();
      y = 18;
    }
  }

  function label(text) {
    ensureSpace(6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(r, g, b);
    doc.text(text.toUpperCase(), marginX, y);
    y += 5;
  }

  function paragraph(text, opts) {
    const color = (opts && opts.color) || [45, 48, 51];
    const size = (opts && opts.size) || 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW);
    ensureSpace(lines.length * 5 + 2);
    doc.text(lines, marginX, y);
    y += lines.length * 5 + 4;
  }

  function divider() {
    ensureSpace(5);
    doc.setDrawColor(...faint);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageW - marginX, y);
    y += 6;
  }

  /* ---- monto ---- */
  label('Monto de la inversión');
  const boxH = 18;
  ensureSpace(boxH + 4);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, y, contentW, boxH, 2.5, 2.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(r, g, b);
  doc.text(quote.amountLabel, marginX + 6, y + 11.5);
  y += boxH + 4;
  paragraph(quote.amountNote, { color: soft, size: 8.5 });

  divider();

  /* ---- servicio ---- */
  label('Servicio');
  paragraph(quote.serviceSummary, { size: 10 });

  /* ---- entregables ---- */
  label('Entregables');
  doc.autoTable({
    startY: y,
    margin: { left: marginX, right: marginX, bottom: 22 },
    rowPageBreak: 'avoid',
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9.5, textColor: [45, 48, 51], cellPadding: { top: 1.5, bottom: 1.5, left: 0, right: 2 } },
    columnStyles: { 0: { cellWidth: 6, textColor: [r, g, b], fontStyle: 'bold' } },
    body: quote.deliverables.map((item, i) => [String(i + 1) + '.', item]),
  });
  y = doc.lastAutoTable.finalY + 6;

  /* ---- cronograma ---- */
  ensureSpace(14);
  label('Cronograma');
  const totalRowIndex = quote.schedule.length;
  doc.autoTable({
    startY: y,
    margin: { left: marginX, right: marginX, bottom: 22 },
    rowPageBreak: 'avoid',
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9.5, textColor: [45, 48, 51], cellPadding: 2.5, lineColor: faint, lineWidth: 0.3 },
    headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 1: { cellWidth: 45 } },
    head: [['Fase', 'Duración']],
    body: [
      ...quote.schedule.map((item) => [item.phase, item.dur]),
      ['Total estimado', quote.totalDuration],
    ],
    didParseCell(data) {
      if (data.section === 'body' && data.row.index === totalRowIndex) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [248, 247, 245];
        data.cell.styles.textColor = [r, g, b];
      }
    },
  });
  y = doc.lastAutoTable.finalY + 5;

  paragraph(quote.totalDurationNote, { color: soft, size: 8.5 });

  /* ---- footer on every page ---- */
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...faint);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageH - 16, pageW - marginX, pageH - 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...soft);
    doc.text('Cotización referencial; no constituye comprobante de pago.', marginX, pageH - 10);
    doc.text(String(i) + ' / ' + pageCount, pageW - marginX, pageH - 10, { align: 'right' });
  }

  doc.save(quote.filename);
}
