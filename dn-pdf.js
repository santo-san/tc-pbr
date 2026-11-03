// ELIPS Delivery Note PDF renderer (jsPDF). Turns the model from dn-rules.js into a PDF and
// returns it as Base64. Output is deterministic (fixed creation date and file id) so the same
// delivery data always gives the same bytes: View, Download and API return identical files.
(function (root) {
  function render(jsPDF, m) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setCreationDate(new Date(Date.UTC(2026, 0, 1)));
    let h = 0; for (const ch of m.deliveryId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    doc.setFileId((h.toString(16).padStart(8, '0')).repeat(4).toUpperCase());
    doc.setProperties({ title: `Surat Jalan ${m.deliveryId}`, subject: 'Delivery Note', creator: 'ELIPS' });
    const W = 297, L = 12, R = W - 12;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(m.title, W / 2, 16, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
    doc.text(`ELIPS · Delivery ID ${m.deliveryId}`, W / 2, 21.5, { align: 'center' });
    doc.setTextColor(0); doc.setDrawColor(180); doc.line(L, 25, R, 25);
    // header
    doc.setFontSize(10);
    m.header.forEach(([k, v], i) => {
      const x = i % 2 ? 155 : L, y = 32 + Math.floor(i / 2) * 6;
      doc.setFont('helvetica', 'normal'); doc.text(k, x, y);
      doc.setFont('helvetica', 'bold'); doc.text(`: ${v}`, x + 36, y);
    });
    // cycle table
    const cw = [13, 40, 30, 46, 46, 34, 32, 32], top = 48;
    let y = top;
    const row = (cells, bold, fill) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(8.5);
      const lines = cells.map((c, i) => doc.splitTextToSize(String(c), cw[i] - 3));
      const rh = Math.max(...lines.map(l => l.length)) * 4 + 3;
      let x = L;
      cells.forEach((_, i) => {
        if (fill) { doc.setFillColor(232, 241, 253); doc.rect(x, y, cw[i], rh, 'FD'); } else doc.rect(x, y, cw[i], rh);
        doc.text(lines[i], x + 1.5, y + 4.6); x += cw[i];
      });
      y += rh;
    };
    row(m.columns, true, true);
    m.rows.forEach(r => row(r, false, false));
    // signatures
    y = Math.max(y + 14, 150);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    m.sign.forEach((s, i) => {
      const x = L + 20 + i * 90;
      doc.line(x, y + 22, x + 60, y + 22);
      doc.text(s, x + 30, y + 27, { align: 'center' });
    });
    doc.setFontSize(7.5); doc.setTextColor(120);
    doc.text('Dokumen ini dibuat otomatis oleh ELIPS dari data delivery terbaru.', L, 203);
    return doc.output('datauristring').split(',').pop();
  }
  const api = { render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DNPDF = api;
})(typeof window !== 'undefined' ? window : this);
