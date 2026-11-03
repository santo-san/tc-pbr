// ELIPS Delivery Note (Daily > Delivery Note and the DN icon on every Daily Monitoring row).
// The PDF is generated on the fly on each click from the latest order data (no stored or batch PDF).
// Rules: dn-rules.js (window.DN); PDF renderer: dn-pdf.js (window.DNPDF) with vendor/jspdf.
(function () {
  const STORE = 'elips-dn-pas-v1';
  const PAS = (() => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; } })();
  const savePas = () => { try { localStorage.setItem(STORE, JSON.stringify(PAS)); } catch (e) { /* storage not available */ } };
  const guard = DN.createGuard();
  const dn = { q: '', page: 1, gens: 0, last: null, sim: '', auth: 'valid', pasFail: false, id: '' };
  const sjNo = (o, i) => cycleDetail(o, i).cycleNo;
  const generate = m => { dn.gens++; return DNPDF.render(window.jspdf.jsPDF, m); };
  const ctx = () => ({ orders: DATA, canView: W.canView, sjNo, generate, now: () => new Date() });
  const call = (id, opts = {}) => DN.api({ deliveryId: id, token: (opts.auth ?? 'valid') === 'valid' ? 'mock-session-token' : '', actor: state.actor, simulate: opts.sim || '' }, ctx());
  const toBlob = b64 => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Blob([u], { type: 'application/pdf' }); };
  const kb = n => `${(n / 1024).toFixed(1)} KB`;
  const ERR_TXT = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 422: 'Unprocessable Entity', 500: 'Internal Server Error', 503: 'Service Unavailable', 504: 'Gateway Timeout' };

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
  // Busy wrapper: blocks repeated clicks / simultaneous requests for the same delivery
  function busy(id, btn, fn) {
    if (!guard.begin(id)) { toast(`Delivery Note ${id} sedang diproses, tunggu sebentar`); return; }
    document.querySelectorAll(`[data-dn="${id}"],[data-dnact$="|${id}"]`).forEach(b => b.classList.add('busy'));
    setTimeout(() => {
      try { fn(); } finally {
        guard.end(id);
        document.querySelectorAll('.busy').forEach(b => b.classList.remove('busy'));
      }
    }, 250);
  }

  // ---------- View (preview) ----------
  function view(id) {
    busy(id, null, () => {
      const res = call(id);
      if (res.status !== 200) { showPreview(`Delivery Note - ${id}`, errorBox(res), ''); return; }
      const url = URL.createObjectURL(toBlob(res.body.base64)), b = res.body;
      showPreview(`Delivery Note - ${id}`,
        `<div class="dn-meta"><span>File <b>${esc(b.fileName)}</b></span><span>Size <b>${kb(b.size)}</b></span><span>Checksum <b data-dn-sum>${b.checksum}</b></span></div>
         <iframe class="dn-frame" title="Delivery Note ${id}" src="${url}"></iframe>`,
        `<button class="btn-sm-blue" id="dnPvDl">Download PDF</button>`, () => { URL.revokeObjectURL(url); $('preview').querySelector('.pv').classList.remove('dn-pv'); });
      $('preview').querySelector('.pv').classList.add('dn-pv');
      $('dnPvDl').onclick = () => dl(id);
      dn.last = res; paint();
    });
  }
  function dl(id) {
    busy(id, null, () => {
      const res = call(id);
      if (res.status !== 200) { showPreview(`Delivery Note - ${id}`, errorBox(res), ''); return; }
      download(res); dn.last = res; paint();
      toast(`${res.body.fileName} diunduh · checksum ${res.body.checksum}`);
    });
  }
  function attach(id) {
    busy(id, null, () => {
      const res = call(id), r = DN.attachPAS(PAS, res, { fail: dn.pasFail ? 'PAS service tidak merespons' : '', at: new Date().toISOString() });
      savePas(); paint();
      if (res.status !== 200) { showPreview(`Attach ke PAS GR - ${id}`, errorBox(res), ''); return; }
      toast(r.message);
    });
  }

  // ---------- Page ----------
  const visible = () => DATA.filter(o => W.canView(state.actor, o));
  function rows() {
    const q = dn.q.trim().toLowerCase();
    return visible().filter(o => !q || [o.orderNo, o.supplier, o.truck, o.driver, o.date].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : a.orderNo < b.orderNo ? 1 : -1);
  }
  function pasCell(o) {
    const p = PAS[o.orderNo];
    if (!p) return '<span class="st sb">Not Attached</span>';
    return `<span class="st ${p.status === 'Attached' ? 'av' : 'fl'}">${p.status}</span><small class="sub">Rev ${p.revisions} · ${p.attempts} attempt(s)</small>`;
  }
  function paint() {
    const root = $('dnRoot'); if (!root || $('pgDN').style.display === 'none') return;
    const list = rows(), b = dn.last?.body, PS = 10, pages = Math.max(1, Math.ceil(list.length / PS));
    dn.page = Math.min(dn.page, pages);
    const view = list.slice((dn.page - 1) * PS, dn.page * PS);
    root.innerHTML = `<section class="cal-card">
      <div class="dn-note">PDF Delivery Note dibuat <b>on-the-fly</b> setiap kali tombol diklik, dari data delivery terbaru. Tidak ada PDF yang disimpan atau di-generate secara batch.
        <span>Jumlah generate di sesi ini: <b id="dnGens">${dn.gens}</b></span></div>
      <div class="ta-top"><div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="text" id="dnQ" placeholder="Search No. Order / Trucking / Plate / Driver" value="${esc(dn.q)}" style="width:280px"></div>
        <span class="spacer"></span><span class="q-note">${list.length} delivery · login: ${esc(W.roleLabel(state.actor))}</span></div>
      <div class="table-wrap"><table id="dnTable"><thead><tr><th>Delivery Note</th><th>Date</th><th>No. Order (Delivery ID)</th><th>Trucking Comp.</th><th>License Plate</th><th>Driver</th><th>Cycle Start</th><th>Data DN</th><th>PAS GR Attachment</th></tr></thead>
      <tbody>${view.map(o => {
        const miss = DN.missing(o), n = DN.startedCycles(o).length;
        return `<tr><td><div class="ta-act">
            <button class="dn-b" data-dnact="view|${o.orderNo}" title="View PDF">View</button>
            <button class="dn-b" data-dnact="dl|${o.orderNo}" title="Download PDF">Download</button>
            <button class="dn-b pas" data-dnact="pas|${o.orderNo}" title="Attach ke PAS GR">PAS GR</button></div></td>
          <td>${fmtDate(o.date)}</td><td><button class="link" data-dnact="api|${o.orderNo}">${o.orderNo}</button></td><td class="left">${esc(o.supplier)}</td><td>${o.truck || '-'}</td><td>${esc(o.driver || '-')}</td>
          <td>${n} / ${o.cycles.length}</td>
          <td>${miss.length ? `<span class="st fl">Incomplete</span><small class="sub">${miss.map(esc).join(', ')}</small>` : '<span class="st av">Complete</span>'}</td>
          <td>${pasCell(o)}</td></tr>`; }).join('') || '<tr><td colspan="9" class="empty">No Data Found</td></tr>'}</tbody></table></div>
      <div class="dn-pager"><span class="q-note">Showing ${list.length ? (dn.page - 1) * PS + 1 : 0} to ${(dn.page - 1) * PS + view.length} of ${list.length} records</span><span class="spacer"></span>
        <button class="btn-light" data-dnpg="-1" ${dn.page === 1 ? 'disabled' : ''}>&lsaquo; Prev</button><span class="q-note">Page ${dn.page} / ${pages}</span><button class="btn-light" data-dnpg="1" ${dn.page === pages ? 'disabled' : ''}>Next &rsaquo;</button></div>
    </section>
    <section class="cal-card dn-api">
      <h2>API Console (simulasi) <small>${esc(DN.ENDPOINT)} · endpoint &amp; auth: TBD</small></h2>
      <div class="dn-form">
        <div><label for="dnId">deliveryId</label><input id="dnId" value="${esc(dn.id)}" placeholder="No. Order"></div>
        <div><label for="dnAuth">Authorization</label><select id="dnAuth"><option value="valid" ${dn.auth === 'valid' ? 'selected' : ''}>Token sesi valid</option><option value="none" ${dn.auth === 'none' ? 'selected' : ''}>Tanpa token</option></select></div>
        <div><label for="dnSim">Simulasi</label><select id="dnSim">${[['', 'Normal'], ['genfail', 'PDF generation failure'], ['corrupt', 'Corrupted PDF'], ['timeout', 'Timeout'], ['unavailable', 'Service unavailable']].map(([v, l]) => `<option value="${v}" ${dn.sim === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="dn-btns"><button class="btn-dark" id="dnSend">Send</button><button class="btn-light" id="dnVerify" ${b?.base64 ? '' : 'disabled'}>Decode &amp; Verify</button>
          <label class="form-check"><input type="checkbox" id="dnPasFail" ${dn.pasFail ? 'checked' : ''}> Simulasi PAS gagal</label></div>
      </div>
      <pre class="dn-res" id="dnRes">${dn.last ? esc(JSON.stringify(Object.assign({}, dn.last.body, b?.base64 ? { base64: b.base64.slice(0, 96) + `… (${b.base64.length} chars)` } : {}), null, 2)) : 'Belum ada request'}</pre>
      <div id="dnVerifyOut" class="q-note"></div>
    </section>
    <section class="cal-card"><h2>PAS GR Attachment Log</h2>
      <div class="table-wrap"><table><thead><tr><th>Delivery ID</th><th>File</th><th>Size</th><th>Checksum</th><th>Status</th><th>Rev</th><th>Attempt</th><th>Riwayat</th></tr></thead><tbody>
      ${Object.values(PAS).filter(p => visible().some(o => o.orderNo === p.deliveryId)).map(p => `<tr><td>${p.deliveryId}</td><td>${esc(p.fileName)}</td><td>${p.size ? kb(p.size) : '-'}</td><td>${p.checksum || '-'}</td><td>${p.status}</td><td>${p.revisions}</td><td>${p.attempts}</td>
        <td class="left">${p.log.slice(-4).map(l => `${l.result} <small>${esc(l.note)}</small>`).join('<br>')}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">Belum ada attachment</td></tr>'}
      </tbody></table></div>
      <p class="q-note" style="margin-top:6px">Idempotency key = Delivery ID: retry dengan PDF yang sama tidak menambah file; data berubah → file GR diganti (Rev + 1). Kontrak interface PAS: TBD.</p>
    </section>`;
  }

  function send() {
    dn.id = $('dnId').value; dn.auth = $('dnAuth').value; dn.sim = $('dnSim').value;
    const id = dn.id.trim() || '(kosong)';
    busy(id, null, () => { dn.last = call(dn.id, { auth: dn.auth, sim: dn.sim }); paint(); });
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-dnact]');
    if (t) {
      const [act, id] = t.dataset.dnact.split('|');
      if (act === 'view') view(id); else if (act === 'dl') dl(id); else if (act === 'pas') attach(id);
      else if (act === 'api') { dn.id = id; paint(); $('dnId').focus(); }
      return;
    }
    const pg = e.target.closest('[data-dnpg]');
    if (pg && !pg.disabled) { dn.page += +pg.dataset.dnpg; paint(); return; }
    if (e.target.id === 'dnSend') send();
    if (e.target.id === 'dnVerify' && dn.last?.body.base64) {
      const err = DN.checkPdfBase64(dn.last.body.base64);
      $('dnVerifyOut').innerHTML = err ? `<span class="st fl">${err}</span>` : `<span class="st av">Valid PDF</span> header %PDF-, trailer %%EOF, ${kb(dn.last.body.size)}, checksum ${DN.checksum(dn.last.body.base64)} <button class="link" id="dnOpen">Buka PDF</button>`;
    }
    if (e.target.id === 'dnOpen') window.open(URL.createObjectURL(toBlob(dn.last.body.base64)), '_blank');
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'dnQ') { dn.q = e.target.value; dn.page = 1; const pos = e.target.selectionStart; paint(); $('dnQ').focus(); $('dnQ').setSelectionRange(pos, pos); }
  });
  document.addEventListener('change', e => { if (e.target.id === 'dnPasFail') dn.pasFail = e.target.checked; });
  document.addEventListener('actorchange', () => { dn.last = null; paint(); });

  window.dnView = view;
  window.dnDownload = dl;
  window.dnPdfCycle = (o, i) => {
    const miss = DN.missing(o);
    if (miss.length) { toast(`Data belum lengkap: ${miss.join(', ')}`); return; }
    const b64 = generate(DN.model(o, sjNo, i));
    download({ body: { base64: b64, fileName: DN.fileName(o, i) } });
  };
  window.dnRender = paint;
})();
