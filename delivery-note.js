// ELIPS Delivery Note (Surat Jalan) in Daily Monitoring > Order Detail > Cycle n:
// "Surat Jalan ELIPS" = View (PDF preview), "PDF" = Download. One Delivery = one cycle.
// The PDF is generated on the fly on each click from the latest data (no stored or batch PDF).
// The preview also holds the simulated Base64 API and PAS GR attachment for testing.
// Rules: dn-rules.js (window.DN); renderer: dn-pdf.js (window.DNPDF) with vendor/jspdf.
(function () {
  const STORE = 'elips-dn-pas-v3';
  const PAS = (() => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; } })();
  const savePas = () => { try { localStorage.setItem(STORE, JSON.stringify(PAS)); } catch (e) { /* storage not available */ } };
  const guard = DN.createGuard();
  const dn = { gens: 0, pasFail: false, cur: null };
  // Data sources of the Surat Jalan fields (docs/delivery-note-spec.md §2)
  const look = {
    sjNo: (o, i) => cycleDetail(o, i).cycleNo,
    phone: o => MASTER.drivers.find(d => d.name === o.driver && d.supplier === o.supplier)?.phone || '',
    saNo: o => saNumber(o),
    loc: (o, name) => { const cd = name === o.from ? o.dtp?.fromCd : name === o.to ? o.dtp?.toCd : ''; return cd ? `${cd} - ${name}` : name; },
    keterangan: () => 'PENGIRIMAN CONTAINER', // TBD: source of Keterangan not defined
  };
  const resolve = id => DATA.flatMap(o => o.cycles.map((c, i) => ({ o, i }))).filter(x => look.sjNo(x.o, x.i) === id);
  const generate = (m, printedAt) => { dn.gens++; return DNPDF.render(window.jspdf.jsPDF, m, printedAt); };
  const ctx = () => ({ resolve, canView: W.canView, look, generate, now: () => new Date() });
  const call = (id, opts = {}) => DN.api({ deliveryId: id, token: (opts.auth ?? 'valid') === 'valid' ? 'mock-session-token' : '', actor: state.actor, simulate: opts.sim || '' }, ctx());
  const toBlob = b64 => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Blob([u], { type: 'application/pdf' }); };
  const kb = n => `${(n / 1024).toFixed(1)} KB`;
  const ERR_TXT = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 422: 'Unprocessable Entity', 500: 'Internal Server Error', 503: 'Service Unavailable', 504: 'Gateway Timeout' };
  const short = body => JSON.stringify(Object.assign({}, body, body.base64 ? { base64: body.base64.slice(0, 80) + `… (${body.base64.length} chars)` } : {}), null, 2);

  function download(res) {
    const a = document.createElement('a'), url = URL.createObjectURL(toBlob(res.body.base64));
    a.href = url; a.download = res.body.fileName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function errorBox(res) {
    const b = res.body;
    return `<div class="dn-err"><b>HTTP ${res.status} ${ERR_TXT[res.status] || ''} · ${b.error}</b><p>${esc(b.message)}</p>
      ${b.missingFields ? `<p>Field mandatory yang kosong:</p><ul>${b.missingFields.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}</div>`;
  }
  // DN-R07: block repeated clicks / simultaneous requests for the same delivery
  function busy(id, fn) {
    if (!guard.begin(id)) { toast(`Surat Jalan ${id} sedang diproses, tunggu sebentar`); return; }
    document.querySelectorAll('[data-sj],[data-pdf],[data-dnx]').forEach(b => b.classList.add('busy'));
    setTimeout(() => {
      try { fn(); } finally { guard.end(id); document.querySelectorAll('.busy').forEach(b => b.classList.remove('busy')); }
    }, 250);
  }
  const pasLine = id => {
    const p = PAS[id];
    return p ? `<span class="st ${p.status === 'Attached' ? 'av' : 'fl'}">${p.status}</span> Rev ${p.revisions} · ${p.attempts} attempt(s) · ${p.log.slice(-3).map(l => l.result).join(' → ')}`
      : '<span class="st sb">Not Attached</span>';
  };

  // ---------- View (Surat Jalan ELIPS) ----------
  function view(o, i) {
    const id = look.sjNo(o, i);
    busy(id, () => {
      const res = call(id);
      if (res.status !== 200) { showPreview(`Surat Jalan ELIPS - Cycle ${i + 1}`, errorBox(res), ''); return; }
      const url = URL.createObjectURL(toBlob(res.body.base64)), b = res.body;
      showPreview(`Surat Jalan ELIPS - Cycle ${i + 1}`,
        `<div class="dn-meta"><span>Delivery ID <b>${b.deliveryId}</b></span><span>No Order <b>${b.orderNo}</b></span><span>File <b>${esc(b.fileName)}</b></span><span>Size <b>${kb(b.size)}</b></span><span>Data hash <b data-dn-sum>${b.dataHash}</b></span></div>
         <iframe class="dn-frame" title="Surat Jalan ${b.deliveryId}" src="${url}"></iframe>
         <details class="dn-api" id="dnApi"><summary>API Base64 &amp; PAS GR Attachment (simulasi)</summary>
           <p class="q-note">${esc(DN.ENDPOINT)} · endpoint, auth &amp; kontrak PAS: TBD · generate di sesi ini: <b id="dnGens">${dn.gens}</b></p>
           <div class="dn-form">
             <div><label for="dnId">deliveryId</label><input id="dnId" value="${b.deliveryId}"></div>
             <div><label for="dnAuth">Authorization</label><select id="dnAuth"><option value="valid">Token sesi valid</option><option value="none">Tanpa token</option></select></div>
             <div><label for="dnSim">Simulasi</label><select id="dnSim">${[['', 'Normal'], ['genfail', 'PDF generation failure'], ['corrupt', 'Corrupted PDF'], ['timeout', 'Timeout'], ['unavailable', 'Service unavailable']].map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
             <div class="dn-btns"><button class="btn-dark" data-dnx="send">Send</button><button class="btn-light" data-dnx="verify">Decode &amp; Verify</button></div>
           </div>
           <pre class="dn-res" id="dnRes">Belum ada request</pre>
           <div class="dn-pas"><label class="form-check"><input type="checkbox" id="dnPasFail" ${dn.pasFail ? 'checked' : ''}> Simulasi PAS gagal</label>
             <button class="btn-sm-blue" data-dnx="pas">Attach ke PAS GR</button><span id="dnPas">${pasLine(b.deliveryId)}</span></div>
         </details>`,
        `<button class="btn-sm-blue" id="dnPvDl">Download PDF</button>`,
        () => { URL.revokeObjectURL(url); $('preview').querySelector('.pv').classList.remove('dn-pv'); dn.cur = null; });
      $('preview').querySelector('.pv').classList.add('dn-pv');
      $('dnPvDl').onclick = () => dl(o, i);
      dn.cur = { o, i, id: b.deliveryId, last: null };
    });
  }
  // ---------- Download (PDF) ----------
  function dl(o, i) {
    const id = look.sjNo(o, i);
    busy(id, () => {
      const res = call(id);
      if (res.status !== 200) { showPreview(`Surat Jalan ELIPS - Cycle ${i + 1}`, errorBox(res), ''); return; }
      download(res); toast(`${res.body.fileName} diunduh · data hash ${res.body.dataHash}`);
    });
  }

  document.addEventListener('click', e => {
    const x = e.target.closest('[data-dnx]'); if (!x || !dn.cur) return;
    const cur = dn.cur;
    if (x.dataset.dnx === 'send') {
      const id = $('dnId').value;
      busy(id.trim() || '(kosong)', () => {
        cur.last = call(id, { auth: $('dnAuth').value, sim: $('dnSim').value });
        $('dnRes').textContent = `HTTP ${cur.last.status}\n` + short(cur.last.body); $('dnGens').textContent = dn.gens;
      });
    }
    if (x.dataset.dnx === 'verify') {
      const b64 = cur.last?.body.base64;
      $('dnRes').textContent += `\n\n» Decode & Verify: ${!b64 ? 'tidak ada Base64 di response terakhir' : DN.checkPdfBase64(b64) || `VALID PDF (%PDF- … %%EOF), ${kb(DN.decodedSize(b64))}`}`;
    }
    if (x.dataset.dnx === 'pas') {
      busy(cur.id, () => {
        const res = call(cur.id), r = DN.attachPAS(PAS, res, { fail: $('dnPasFail').checked ? 'PAS service tidak merespons' : '', at: new Date().toISOString() });
        savePas(); $('dnPas').innerHTML = pasLine(cur.id); $('dnGens').textContent = dn.gens;
        toast(res.status !== 200 ? `${res.body.error}: ${res.body.message}` : r.message);
      });
    }
  });
  document.addEventListener('change', e => { if (e.target.id === 'dnPasFail') dn.pasFail = e.target.checked; });

  window.dnView = view;
  window.dnDownload = dl;
})();
