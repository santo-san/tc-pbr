// ELIPS Master Route Percentage mock-up UI, following the existing Route Entry / List Active Route Percentage screen.
// Shares helpers from master.js, LOCATIONS (location.js), MILEAGES / combo() / activeLocs (mileage.js); rules live in master-route-percentage.js.
const RP = window.MasterRoutePercentage;
const distM = window.MasterLocation.distanceMeters;
const fmtKm = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

// ---------- Seed data (first rows as on the reference screen) ----------
const ROUTES = [];
const rpSeedAt = new Date(2026, 8, 1, 8, 0);
[[['D1', 'S1', 'X1'], 7], [['D1', 'S1', 'D3'], 6], [['DPCMR', 'CYKRW'], 15], [['PRTGP', 'WHCKR'], 12], [['PRTGP', 'CYKRW'], 10], [['DPCMR', 'CYSTR'], 9],
 [['PRTGP', 'CYSTR'], 8], [['CYSTR', 'PRTGP'], 8], [['SNT', 'KRW'], 10], [['SNT', 'CKR'], 5], [['CKR', 'KRW'], 5]]
  .forEach(([stops, percentage], i) => {
    const d = RP.distance(stops, LOCATIONS, MILEAGES, distM);
    ROUTES.push({ stops, code: RP.code(stops), description: RP.describe(stops, LOCATIONS), distance: d.km, estimated: d.estimated, percentage,
      status: RP.STATUS.ACTIVE, createdBy: 'admin', createdAt: new Date(rpSeedAt - i * 60000), changedBy: 'admin', changedAt: new Date(rpSeedAt - i * 60000), version: 1 });
  });

// ---------- Route Entry ----------
let rStops = [], rEditing = null, rSaving = false, rFlash = null;
const rPick = combo($('rPick'), {
  options: activeLocs, placeholder: 'Select Location', onPick: c => {
    const res = RP.addStop(rStops, c, LOCATIONS);
    if (!res.ok) { toast(res.error); $('rStopsMsg').textContent = res.error; return; }
    rErrors({}); rDrawEntry();
  },
});
$('rPickClear').addEventListener('click', () => rPick.set(''));
function rDrawEntry() {
  const n = rStops.length;
  $('rCode').value = n ? RP.code(rStops) : '';
  $('rDesc').value = n ? RP.describe(rStops, LOCATIONS) : '';
  const d = n > 1 ? RP.distance(rStops, LOCATIONS, MILEAGES, distM) : null;
  $('rDist').value = d ? `${fmtKm(d.km)}${d.estimated ? ' (incl. estimate)' : ''}` : '';
  $('rDist').title = d ? d.legs.map(l => `${l.from} -> ${l.to}: ${fmtKm(l.km)} Km (${l.source})`).join('\n') : '';
  $('rStopBody').innerHTML = n ? rStops.map((c, i) => `<tr>
      <td class="mv"><button data-up="${i}" ${i === 0 ? 'disabled' : ''} title="Move up">&uarr;</button><button data-down="${i}" ${i === n - 1 ? 'disabled' : ''} title="Move down">&darr;</button></td>
      <td><button class="rm" data-rm="${i}" title="Delete">&times;</button></td>
      <td>${esc(c)}</td><td>${esc(LOCATIONS.find(l => l.code === c)?.name ?? c)}</td>
      <td><span class="rp-tag ${RP.label(i, n)}">${RP.label(i, n)}</span></td></tr>`).join('')
    : '<tr><td colspan="5" class="none">Pick a location to start the route (first = START, last = END).</td></tr>';
}
$('rStopBody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.rm !== undefined) rStops.splice(+b.dataset.rm, 1);
  else RP.moveStop(rStops, +(b.dataset.up ?? b.dataset.down), b.dataset.up !== undefined ? 'up' : 'down');
  rErrors({}); rDrawEntry();
});
function rErrors(errors) {
  $('rAlert').innerHTML = errors._ ? `<div class="form-alert-m" style="margin:0 0 10px">${esc(errors._)}</div>` : '';
  $('rStopsMsg').textContent = errors.stops || '';
  $('rStops').classList.toggle('err', !!errors.stops);
  const f = document.querySelector('.rp-row2 [data-f="percentage"]');
  f.classList.toggle('err', !!errors.percentage); f.querySelector('.msg')?.remove();
  if (errors.percentage) f.insertAdjacentHTML('beforeend', `<div class="msg">${esc(errors.percentage)}</div>`);
}
function rSetForm(route) {
  rEditing = route ? { route, version: route.version } : null;
  rStops = route ? [...route.stops] : [];
  $('rPct').value = route ? route.percentage : '';
  rPick.set(''); $('rTitle').textContent = route ? `Route Entry - Edit ${route.code}` : 'Route Entry';
  rErrors({}); rDrawEntry(); rRender();
}
function rBusy(b) { rSaving = b; $('rSave').disabled = b; $('rClear').disabled = b; $('rSave').classList.toggle('btn-busy', b); $('rSaveLbl').textContent = b ? 'Saving...' : 'Save'; }
$('rClear').addEventListener('click', () => { rSetForm(null); toast('Form dikosongkan'); });
$('rSave').addEventListener('click', () => {
  if (rSaving) return;   // prevent double submission
  const form = { stops: rStops, percentage: $('rPct').value };
  rBusy(true);
  setTimeout(() => {
    const res = RP.save(form, ROUTES, LOCATIONS, MILEAGES, distM, rEditing, USER, new Date());
    rBusy(false);
    if (!res.ok) { rErrors(res.errors); toast(Object.values(res.errors)[0]); return; }
    rFlash = res.route; rSetForm(null); toast(res.message);
  }, 400);
});

// ---------- List Active Route Percentage ----------
// [key, label]
const RCOLS = [['code', 'Route Code'], ['description', 'Description'], ['distance', 'Distance (Km)'], ['percentage', 'Percentage (%)'], ['createdBy', 'Created By'], ['changedAt', 'Changed Dt']];
const rState = { q: '', page: 1, size: 10, sort: '', hidden: new Set(['createdBy', 'changedAt']) };
$('rViewMenu').innerHTML = RCOLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" ${rState.hidden.has(k) ? '' : 'checked'}> ${l}</label>`).join('');
$('rViewMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? rState.hidden.delete(k) : rState.hidden.add(k); rRender(); });
const rVal = (r, k) => k === 'distance' ? fmtKm(r.distance) : k === 'changedAt' ? `${r.changedAt.getFullYear()}-${pad(r.changedAt.getMonth() + 1)}-${pad(r.changedAt.getDate())} ${pad(r.changedAt.getHours())}:${pad(r.changedAt.getMinutes())}` : r[k];
function rFiltered() {
  const q = rState.q.trim().toLowerCase();
  const rows = ROUTES.filter(r => r.status === RP.STATUS.ACTIVE && (!q || RCOLS.some(([k]) => String(rVal(r, k)).toLowerCase().includes(q))));
  // Default: newest first; the Percentage header toggles descending / ascending
  return rows.sort((a, b) => rState.sort === 'desc' ? b.percentage - a.percentage : rState.sort === 'asc' ? a.percentage - b.percentage : b.createdAt - a.createdAt);
}
function rRender() {
  const rows = rFiltered(), pages = Math.max(1, Math.ceil(rows.length / rState.size));
  rState.page = Math.min(rState.page, pages);
  const start = (rState.page - 1) * rState.size, view = rows.slice(start, start + rState.size);
  const cols = RCOLS.filter(([k]) => !rState.hidden.has(k));
  const arrow = rState.sort === 'desc' ? '&#9662;' : rState.sort === 'asc' ? '&#9652;' : '<span style="color:#9ca3af">&#8597;</span>';
  $('rThead').innerHTML = `<tr><th>Options</th>${cols.map(([k, l]) => k === 'percentage' ? `<th class="sort" data-sort title="Sort by percentage">${l} ${arrow}</th>` : `<th>${l}</th>`).join('')}</tr>`;
  $('rTbody').innerHTML = view.length ? view.map(r => {
    const i = ROUTES.indexOf(r);
    return `<tr class="${rEditing?.route === r ? 'editing' : ''} ${rFlash === r ? 'flash' : ''}">
      <td><div class="opsi"><button data-opsi>Opsi &#9662;</button><div class="opsi-menu">
        <button data-redit="${i}">&#9998; Edit</button><button class="danger" data-roff="${i}">&#10006; Deactivate</button></div></div></td>
      ${cols.map(([k]) => k === 'percentage' ? `<td><input class="pct" data-pct="${i}" value="${r.percentage}" inputmode="decimal" aria-label="Percentage ${esc(r.code)}"></td>`
        : k === 'distance' ? `<td>${rVal(r, k)}${r.estimated ? ' <span class="rp-est" title="Includes a straight-line estimate for legs not in Master Mileage">est.</span>' : ''}</td>`
        : `<td>${esc(rVal(r, k))}</td>`).join('')}</tr>`;
  }).join('') : `<tr><td colspan="${cols.length + 1}" class="empty" style="text-align:center">${ROUTES.some(r => r.status === RP.STATUS.ACTIVE) ? 'No route found for the selected criteria.' : 'No active route found.'}</td></tr>`;
  rFlash = null;
  $('rInfo').textContent = rows.length ? `Menampilkan ${start + 1} - ${start + view.length} dari ${rows.length} data` : 'Menampilkan 0 data';
  const t = RP.totalActive(ROUTES);
  $('rTotal').textContent = `Total Percentage: ${t}%${t < RP.MAX_TOTAL ? ` (${Math.round((RP.MAX_TOTAL - t) * 100) / 100}% unassigned)` : ''}`;
  $('rTotal').classList.toggle('full', t === RP.MAX_TOTAL);
  let html = `<button data-p="${rState.page - 1}" ${rState.page === 1 ? 'disabled' : ''} aria-label="Previous page">&lsaquo;</button>`;
  for (let p = 1; p <= pages; p++) html += `<button data-p="${p}" class="${p === rState.page ? 'cur' : ''}">${p}</button>`;
  $('rPager').innerHTML = html + `<button data-p="${rState.page + 1}" ${rState.page === pages ? 'disabled' : ''} aria-label="Next page">&rsaquo;</button>`;
}
$('rQuick').addEventListener('input', e => { rState.q = e.target.value; rState.page = 1; rRender(); });
$('rPager').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { rState.page = +b.dataset.p; rRender(); } });
$('rThead').addEventListener('click', e => { if (!e.target.closest('[data-sort]')) return; rState.sort = rState.sort === '' ? 'desc' : rState.sort === 'desc' ? 'asc' : ''; rRender(); });

// Percentage changed directly in the list: saved on Enter / leaving the box
function rSavePct(inp) {
  const r = ROUTES[+inp.dataset.pct];
  if (String(r.percentage) === inp.value.trim()) return;
  const res = RP.setPercentage(ROUTES, r, inp.value, USER, new Date());
  if (!res.ok) { inp.classList.add('err'); toast(res.error); inp.value = r.percentage; setTimeout(() => inp.classList.remove('err'), 2500); return; }
  if (rEditing?.route === r) rEditing.version = r.version;   // keep an open edit in sync
  if (rEditing?.route === r) $('rPct').value = r.percentage;
  rFlash = r; rRender(); toast(res.message);
}
$('rTbody').addEventListener('keydown', e => { if (e.target.matches('input.pct') && e.key === 'Enter') e.target.blur(); });
$('rTbody').addEventListener('focusout', e => { if (e.target.matches('input.pct')) rSavePct(e.target); });

// Options: Edit / Deactivate
$('rTbody').addEventListener('click', e => {
  const o = e.target.closest('[data-opsi]');
  if (o) {
    e.stopPropagation();
    const box = o.parentElement, open = box.classList.contains('open');
    document.querySelectorAll('.opsi.open').forEach(x => x.classList.remove('open'));
    if (!open) box.classList.add('open');
    return;
  }
  const b = e.target.closest('.opsi-menu button'); if (!b) return;
  document.querySelectorAll('.opsi.open').forEach(x => x.classList.remove('open'));
  if (b.dataset.redit) { const r = ROUTES[+b.dataset.redit]; rSetForm(r); window.scrollTo({ top: 0, behavior: 'smooth' }); toast(`Edit ${r.code}: ubah lokasi / percentage lalu Save, atau Clear`); return; }
  const r = ROUTES[+b.dataset.roff];
  showPreview('Deactivate Route', `<p style="font-size:11px;margin:0">Nonaktifkan route <b>${esc(r.code)}</b> (${esc(r.description)})?<br>
      Percentage ${r.percentage}% dilepas dan route ini tidak lagi dipakai di PR creation. Data tetap tersimpan sebagai Inactive.</p>`,
    `<button class="btn-outline" id="rOffCancel">Batal</button><button style="height:30px;background:#f43f5e;color:#fff;border:0;border-radius:5px;padding:0 14px;font-weight:600" id="rOffOk">Deactivate</button>`);
  $('rOffCancel').onclick = closePreview;
  $('rOffOk').onclick = () => {
    const res = RP.deactivate(ROUTES, r, USER, new Date()); closePreview();
    if (rEditing?.route === r) rSetForm(null);
    rRender(); toast(res.ok ? res.message : res.error);
  };
});

document.addEventListener('masterview', e => { if (e.detail === 'route-percentage') rRender(); });
rSetForm(null);
