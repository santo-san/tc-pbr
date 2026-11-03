// ELIPS Delivery Note PDF renderer (jsPDF): TMMIN "SURAT JALAN" layout, one A4 portrait page per cycle.
// Returns the PDF as Base64. Apart from the printed date, the output is deterministic
// (fixed creation date and file id), so the same delivery data gives the same document.
(function (root) {
  function render(jsPDF, m, printedAt) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setCreationDate(new Date(Date.UTC(2026, 0, 1)));
    let h = 0; for (const ch of m.deliveryId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    doc.setFileId((h.toString(16).padStart(8, '0')).repeat(4).toUpperCase());
    doc.setProperties({ title: `Surat Jalan ${m.deliveryId}`, subject: 'Delivery Note', creator: 'ELIPS' });
    const L = 10, R = 200;
    m.pages.forEach((p, pi) => {
      if (pi) doc.addPage();
      // watermark (under the content)
      doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.22 }));
      doc.setFont('helvetica', 'bold'); doc.setFontSize(120); doc.setTextColor(120);
      doc.text(m.watermark, 48, 232, { angle: 58 });
      doc.restoreGraphicsState(); doc.setTextColor(0);
      // printed by / date
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text(`printed by : ${m.printedBy}, printed date : ${printedAt}`, R, 9, { align: 'right' });
      // company logo placeholder + name
      doc.setDrawColor(204, 0, 0); doc.setLineWidth(1.6); doc.ellipse(24, 24, 12, 8, 'S');
      doc.setLineWidth(1.2); doc.ellipse(24, 21.5, 6, 3.2, 'S'); doc.ellipse(24, 25, 2.4, 7.4, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
      doc.text(doc.splitTextToSize(m.company, 112), 44, 20.5, { lineHeightFactor: 1.05 });
      // dashed rule
      doc.setDrawColor(0); doc.setLineWidth(0.7); doc.setLineDashPattern([1.6, 0.9], 0); doc.line(L, 41, R, 41); doc.setLineDashPattern([], 0);
      doc.setFontSize(13); doc.text(m.title, 105, 52, { align: 'center' });
      // header fields
      doc.setFontSize(9.5);
      const field = (x, y, [k, v], cw) => {
        doc.setFont('helvetica', 'bold'); doc.text(k, x, y);
        doc.setFont('helvetica', 'normal'); doc.text(':', x + cw, y); doc.text(String(v), x + cw + 4, y);
      };
      p.left.forEach((f, i) => field(L, 64 + i * 5.6, f, 21));
      p.right.forEach((f, i) => field(109, 64 + i * 5.6, f, 31));
      // table
      const cw = [11, 53, 52, 31, 43];
      let y = 83;
      const row = (cells, head) => {
        doc.setFont('helvetica', head ? 'bold' : 'normal'); doc.setFontSize(9);
        const lines = cells.map((c, i) => doc.splitTextToSize(String(c), cw[i] - 3));
        const rh = Math.max(...lines.map(l => l.length)) * 3.9 + 3;
        let x = L; doc.setLineWidth(0.25);
        cells.forEach((_, i) => {
          if (head) { doc.setFillColor(222, 222, 222); doc.rect(x, y, cw[i], rh, 'FD'); } else doc.rect(x, y, cw[i], rh);
          const center = head || i === 0;
          doc.text(lines[i], center ? x + cw[i] / 2 : x + 1.5, y + 4.4, center ? { align: 'center' } : {});
          x += cw[i];
        });
        y += rh + (head ? 1 : 0);
      };
      row(p.columns, true);
      p.rows.forEach(r => row(r, false));
      // officer + stamp + division
      y += 13;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(m.officer, 140, y);
      doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.7 }));
      doc.setDrawColor(70, 110, 190); doc.setLineWidth(1.1); doc.circle(160, y + 22, 15, 'S');
      doc.setLineWidth(0.5); doc.circle(160, y + 22, 11, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(70, 110, 190); doc.text('TMMIN', 160, y + 23.6, { align: 'center' });
      doc.restoreGraphicsState(); doc.setTextColor(0);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(m.division, 139, y + 44);
    });
    return doc.output('datauristring').split(',').pop();
  }
  const api = { render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DNPDF = api;
})(typeof window !== 'undefined' ? window : this);
