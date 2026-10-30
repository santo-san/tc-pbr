// ELIPS Master Location mock-up UI (shares helpers from master.js). Rules live in master-location.js.
const LOC = window.MasterLocation;

// ---------- Master data (would come from the Sub Area and Location masters) ----------
const SUB_AREAS = ['KARAWANG', 'CIKARANG', 'PORT AREA', 'DEPO', 'SUNTER', 'PATIMBAN', 'CY EXTERNAL'];
const LOCATIONS = [];
const locSeedAt = new Date(2026, 1, 3, 10, 0);
[
  ['KARAWANG PLANT 3', 'K3E', 'KARAWANG', -6.3594125, 107.2915083, 50, 'No', 'Jl. Permata Raya Lot BB 4A, KIIC, Karawang, Jawa Barat', true],
  ['KARAWANG PLANT 1', 'K2E', 'KARAWANG', -6.3612400, 107.2861500, 50, 'No', 'Kawasan Industri KIIC, Teluk Jambe Timur, Karawang, Jawa Barat', false],
  ['PORT AREA PRIOK', 'RA1', 'PORT AREA', -6.1040312, 106.8860244, 50, 'No', 'Jl. Raya Pelabuhan No. 9, Tanjung Priok, Jakarta Utara', true],
  ['WAREHOUSE CIKARANG', 'X10E', 'CIKARANG', -6.2903110, 107.1502236, 50, 'No', 'Kawasan Industri Jababeka, Cikarang Utara, Bekasi', false],
  ['DEPO CAKUNG MARUNDA', 'RD3', 'DEPO', -6.1330418, 106.9530372, 50, 'No', 'Jl. Cakung Cilincing Raya, Marunda, Jakarta Utara', true],
  ['CSIS', 'D4', 'DEPO', -6.2942699, 107.1451779, 50, 'No', 'Jalan Jababeka Raya No.3d, Pasirgombong, Kabupaten Bekasi, Jawa Barat, Indonesia', false],
  ['WAREHOUSE CIKARANG', 'X10', 'CIKARANG', -6.3051230, 107.1722360, 50, 'No', 'Kawasan Industri Terpadu Indonesia China, Jl. KITIC, Kec. Serang Baru, Kabupaten Bekasi, Jawa Barat 17330', false],
  ['EAST KARAWANG PACKING PLANT', 'X11E', 'KARAWANG', -6.4201668, 107.3328415, 50, 'No', 'Jl. Surya Madya VI, Kutanegara, Ciampel, Karawang, Jawa Barat 41363, Indonesia', false],
  ['CY EXTERNAL KARAWANG TIMUR', 'X6', 'CY EXTERNAL', -6.4189120, 107.3401250, 50, 'Yes', 'Jl. Raya Karawang Cikampek Km 9.3, Gintungkerta, Kec. Klari, Karawang', true],
  ['CY EXTERNAL CIKARANG DRY PORT', 'X7', 'CY EXTERNAL', -6.1067553, 106.8991149, 50, 'No', 'PT. Cikarang Dry Port (Cab. Tj. Priok), RW.1, Koja, North Jakarta City, Jakarta, Indonesia', false],
  ['PATIMBAN PORT', 'A2', 'PATIMBAN', -6.2470055, 107.9069941, 100, 'No', 'Pelabuhan Patimban, Pusakanagara, Subang, Jawa Barat', false],
  ['CY TMMIN SUNTER 1', 'S1', 'SUNTER', -6.1460210, 106.8800145, 75, 'Yes', 'Jl. Yos Sudarso, Sunter II, Jakarta Utara', true],
  ['DEPO SUNTER', 'D1', 'DEPO', -6.1490330, 106.8690122, 50, 'No', 'Jl. Danau Sunter Utara, Jakarta Utara', false],
  ['DEPO CIKARANG', 'D2', 'DEPO', -6.3200417, 107.1700306, 50, 'No', 'Jl. Industri Selatan, Cikarang, Bekasi', false],
  ['OLD DEPO PLUMPANG', 'D9', 'DEPO', -6.1312200, 106.8975500, 50, 'No', 'Jl. Plumpang Semper, Jakarta Utara', true, 'INACTIVE'],
  ['SUNTER', 'SNT', 'SUNTER', -6.1452010, 106.8754120, 100, 'No', 'Sunter, Tanjung Priok, Jakarta Utara', true],
  ['KARAWANG', 'KRW', 'KARAWANG', -6.3227300, 107.3375900, 100, 'No', 'Karawang, Jawa Barat', true],
  ['CIKARANG', 'CKR', 'CIKARANG', -6.2611500, 107.1529200, 100, 'No', 'Cikarang, Kabupaten Bekasi, Jawa Barat', false],
  ['BEKASI', 'BKS', 'CIKARANG', -6.2382700, 106.9755700, 100, 'No', 'Bekasi, Jawa Barat', false],
].forEach(([name, code, subArea, lat, lng, radius, autoFinish, addr, used, status = 'ACTIVE']) => LOCATIONS.push({
  name, code, subArea, lat, lng, radius, autoFinish, autoCycle: 'No', cycleToArea: '-', gmapAddress: addr, physicalAddress: addr,
  status, usedInDelivery: used, createdBy: 'ielp1', createdAt: locSeedAt, updatedBy: 'ielp1', updatedAt: locSeedAt, version: 1,
}));

$('lSub').innerHTML = '<option value="">Select an option</option>' + SUB_AREAS.map(s => `<option>${s}</option>`).join('');

// ---------- Map (Leaflet + OpenStreetMap in the mock-up; Google Maps in the real app) ----------
let map = null, marker = null, circle = null;
const DEFAULT_CENTER = [-6.2, 106.95];
function initMap() {
  if (map || !window.L) {
    if (!window.L) $('map').outerHTML = '<div class="map-off" id="map">Peta tidak bisa dimuat (offline).<br>Isi Latitude / Longitude secara manual.</div>';
    return;
  }
  map = L.map('map').setView(DEFAULT_CENTER, 10);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  map.on('click', e => setPoint(e.latlng.lat, e.latlng.lng, { reverse: true }));
}
function setPoint(lat, lng, { reverse = false, zoom = true, address } = {}) {
  lat = Number(Number(lat).toFixed(7)); lng = Number(Number(lng).toFixed(7));
  $('lLat').value = lat; $('lLng').value = lng;
  if (address !== undefined) $('lGmap').value = address;
  drawMarker(zoom);
  if (reverse) reverseGeocode(lat, lng);
}
function drawMarker(zoom = false) {
  if (!map) return;
  const lat = Number($('lLat').value), lng = Number($('lLng').value), r = Number($('lRadius').value) || 0;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || $('lLat').value === '' || $('lLng').value === '' || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
  if (!marker) {
    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on('dragend', () => { const p = marker.getLatLng(); setPoint(p.lat, p.lng, { reverse: true, zoom: false }); });
  } else marker.setLatLng([lat, lng]);
  if (circle) circle.remove();
  circle = r > 0 ? L.circle([lat, lng], { radius: r, color: '#3b8ef3', weight: 1, fillOpacity: .15 }).addTo(map) : null;
  if (zoom) map.setView([lat, lng], Math.max(map.getZoom(), 16));
}
function clearMarker() {
  if (marker) { marker.remove(); marker = null; }
  if (circle) { circle.remove(); circle = null; }
  if (map) map.setView(DEFAULT_CENTER, 10);
}
['lLat', 'lLng', 'lRadius'].forEach(id => $(id).addEventListener('input', () => drawMarker(id !== 'lRadius')));

// Address search: Nominatim suggestions; "lat, lng" typed directly also works
let searchTimer = null, searchSeq = 0;
function showSuggest(html) { $('suggest').innerHTML = html; $('suggest').classList.toggle('show', !!html); }
$('lGmap').addEventListener('input', e => {
  clearTimeout(searchTimer);
  const q = e.target.value.trim();
  const ll = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (ll) return showSuggest(`<div data-lat="${ll[1]}" data-lng="${ll[2]}" data-addr="">Gunakan koordinat ${ll[1]}, ${ll[2]}</div>`);
  if (q.length < 4) return showSuggest('');
  searchTimer = setTimeout(async () => {
    const seq = ++searchSeq;
    showSuggest('<div class="muted">Mencari...</div>');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=id&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
      const rows = await res.json();
      if (seq !== searchSeq) return;
      showSuggest(rows.length ? rows.map(r => `<div data-lat="${r.lat}" data-lng="${r.lon}" data-addr="${esc(r.display_name)}">${esc(r.display_name)}</div>`).join('')
        : '<div class="muted">Alamat tidak ditemukan</div>');
    } catch {
      if (seq === searchSeq) showSuggest('<div class="muted">Pencarian alamat tidak tersedia (offline). Klik peta atau ketik "lat, lng".</div>');
    }
  }, 450);
});
$('suggest').addEventListener('click', e => {
  const d = e.target.closest('[data-lat]'); if (!d) return;
  showSuggest('');
  setPoint(d.dataset.lat, d.dataset.lng, { address: d.dataset.addr || undefined, reverse: !d.dataset.addr });
});
document.addEventListener('click', e => { if (!e.target.closest('[data-f="gmapAddress"]')) showSuggest(''); });
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { Accept: 'application/json' } });
    const r = await res.json();
    if (r.display_name && $('lLat').value == lat) $('lGmap').value = r.display_name;
  } catch { /* offline: keep the address the user typed */ }
}

// ---------- Form ----------
let lEditing = null;
function lShowErrors(errors) {
  document.querySelectorAll('#lForm .f').forEach(f => { f.classList.remove('err'); f.querySelectorAll('.msg').forEach(m => m.remove()); });
  Object.entries(errors).forEach(([k, m]) => {
    const f = document.querySelector(`#lForm [data-f="${k}"]`);
    if (f) { f.classList.add('err'); f.insertAdjacentHTML('beforeend', `<div class="msg">${esc(m)}</div>`); }
  });
  if (errors._) toast(errors._);
  document.querySelector('#lForm .err input, #lForm .err select')?.focus();
}
const lRead = () => Object.fromEntries([...new FormData($('lForm'))]);
function lReset() {
  $('lForm').reset(); $('lCode').readOnly = false; lEditing = null; lShowErrors({}); showSuggest('');
  $('lMode').innerHTML = 'Mode: <b>Add</b> lokasi baru';
  clearMarker(); lRender();
}
function lStartEdit(loc) {
  lEditing = { loc, version: loc.version };
  ['name', 'code', 'gmapAddress', 'physicalAddress', 'subArea', 'radius', 'autoFinish', 'autoCycle', 'lat', 'lng'].forEach(k => { $('lForm').elements[k].value = loc[k] ?? ''; });
  $('lCode').readOnly = loc.usedInDelivery;
  lShowErrors({});
  $('lMode').innerHTML = `Mode: <b>Edit</b> ${esc(loc.code)} - ${esc(loc.name)}${loc.usedInDelivery ? ' (Alias terkunci: sudah dipakai di delivery)' : ''}`;
  drawMarker(true); lRender();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$('lCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/\s/g, ''); });
$('lSave').addEventListener('click', () => {
  const now = new Date();
  const res = lEditing ? LOC.update(lRead(), LOCATIONS, SUB_AREAS, lEditing.loc, lEditing.version, USER, now) : LOC.add(lRead(), LOCATIONS, SUB_AREAS, USER, now);
  if (!res.ok) return lShowErrors(res.errors);
  const l = res.location, wasEdit = !!lEditing;
  lReset(); lState.search = ''; $('lSearch').value = ''; lRender();
  toast(`${l.code} - ${l.name} berhasil ${wasEdit ? 'di-update' : 'ditambahkan'}`);
});
$('lCancel').addEventListener('click', () => { lReset(); toast('Form dikosongkan'); });

// ---------- Location Registrations ----------
const LCOLS = [
  ['code', 'Location Code'], ['name', 'Loc Name'], ['subArea', 'Loc Sub Area'], ['autoCycle', 'Auto Cycle'], ['cycleToArea', 'Cycle To Area'],
  ['autoFinish', 'Auto Finish'], ['coord', 'Coordinates'], ['radius', 'Radius (m)'], ['gmapAddress', 'G.Map Address'], ['physicalAddress', 'Physical Address'],
  ['status', 'Status'], ['createdBy', 'Created By'], ['createdAt', 'Created At'], ['updatedBy', 'Updated By'], ['updatedAt', 'Updated At'],
];
const LNOWRAP = new Set(['code', 'autoCycle', 'cycleToArea', 'autoFinish', 'coord', 'radius', 'status', 'createdAt', 'updatedAt']);
const lState = { search: '', sortKey: 'code', sortDir: 1, page: 1, size: 10, hidden: new Set(['physicalAddress', 'createdBy', 'createdAt']) };
$('lKolomMenu').innerHTML = LCOLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" ${lState.hidden.has(k) ? '' : 'checked'}> ${l}</label>`).join('');
$('lKolomMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? lState.hidden.delete(k) : lState.hidden.add(k); lRender(); });

const lVal = (l, k) => k === 'cycleToArea' ? l.cycleToArea || '-' : k === 'coord' ? `${l.lat}, ${l.lng}` : l[k] instanceof Date ? fmtDT(l[k]) : k === 'autoCycle' || k === 'autoFinish' ? String(l[k]).toUpperCase() : l[k] ?? '';
const lCell = (l, k) => k === 'status' ? `<span class="st ${l.status}">${l.status}</span>` : esc(lVal(l, k));
function lFiltered() {
  const q = lState.search.trim().toLowerCase();
  const rows = LOCATIONS.filter(l => !q || ['code', 'name', 'subArea', 'gmapAddress', 'physicalAddress'].some(k => String(l[k] ?? '').toLowerCase().includes(q)));
  const k = lState.sortKey, val = l => k === 'coord' ? l.lat : l[k] instanceof Date ? l[k].getTime() : typeof l[k] === 'number' ? l[k] : String(l[k] ?? '');
  return rows.sort((a, b) => val(a) < val(b) ? -lState.sortDir : val(a) > val(b) ? lState.sortDir : 0);
}
function lRender() {
  const cols = LCOLS.filter(([k]) => !lState.hidden.has(k));
  $('lThead').innerHTML = `<tr><th>Options</th>${cols.map(([k, l]) => `<th class="sortable" data-sort="${k}">${l}${lState.sortKey === k ? `<span class="arrow">${lState.sortDir === 1 ? '▲' : '▼'}</span>` : ''}</th>`).join('')}</tr>`;
  const rows = lFiltered(), pages = Math.max(1, Math.ceil(rows.length / lState.size));
  lState.page = Math.min(lState.page, pages);
  const start = (lState.page - 1) * lState.size, view = rows.slice(start, start + lState.size);
  $('lTbody').innerHTML = view.length ? view.map(l => {
    const i = LOCATIONS.indexOf(l), inactive = l.status === LOC.STATUS.INACTIVE, rm = LOC.removalAction(l);
    return `<tr class="${lEditing?.loc === l ? 'editing' : ''} ${inactive ? 'inactive' : ''}">
      <td><div class="opsi"><button data-opsi>Opsi &#9662;</button><div class="opsi-menu">
        <button data-lview="${i}">View</button>
        <button data-ledit="${i}" ${inactive ? 'disabled title="Lokasi INACTIVE"' : ''}>Edit</button>
        <button class="danger" data-lrm="${i}" ${inactive ? 'disabled' : ''}>${rm === 'delete' ? 'Delete' : 'Deactivate'}</button>
      </div></div></td>
      ${cols.map(([k]) => `<td class="${LNOWRAP.has(k) ? 'nw' : k.endsWith('Address') ? 'addr' : ''}">${lCell(l, k)}</td>`).join('')}</tr>`;
  }).join('') : `<tr><td colspan="${cols.length + 1}" class="empty" style="text-align:center">No Data Found</td></tr>`;
  $('lInfo').textContent = rows.length ? `Showing ${start + 1} to ${start + view.length} of ${rows.length} records` + (rows.length !== LOCATIONS.length ? ` (filtered from ${LOCATIONS.length} total entries)` : '') : 'Showing 0 to 0 of 0 records';
  let html = `<button data-p="${lState.page - 1}" ${lState.page === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= pages; p++) html += `<button data-p="${p}" class="${p === lState.page ? 'cur' : ''}">${p}</button>`;
  $('lPager').innerHTML = html + `<button data-p="${lState.page + 1}" ${lState.page === pages ? 'disabled' : ''}>›</button>`;
}
$('lThead').addEventListener('click', e => {
  const th = e.target.closest('th[data-sort]'); if (!th) return;
  lState.sortDir = lState.sortKey === th.dataset.sort ? -lState.sortDir : 1; lState.sortKey = th.dataset.sort; lRender();
});
$('lSearch').addEventListener('input', e => { lState.search = e.target.value; lState.page = 1; lRender(); });
$('lPager').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { lState.page = +b.dataset.p; lRender(); } });
$('lPageSize').addEventListener('change', e => { lState.size = +e.target.value; lState.page = 1; lRender(); });

// ---------- Options: View / Edit / Deactivate or Delete ----------
$('lTbody').addEventListener('click', e => {
  const o = e.target.closest('[data-opsi]');
  if (o) {
    e.stopPropagation();
    const box = o.parentElement, open = box.classList.contains('open');
    document.querySelectorAll('.opsi.open').forEach(x => x.classList.remove('open'));
    if (!open) box.classList.add('open');
    return;
  }
  const b = e.target.closest('.opsi-menu button'); if (!b || b.disabled) return;
  document.querySelectorAll('.opsi.open').forEach(x => x.classList.remove('open'));
  if (b.dataset.lview) return lView(LOCATIONS[+b.dataset.lview]);
  if (b.dataset.ledit) return lStartEdit(LOCATIONS[+b.dataset.ledit]);
  if (b.dataset.lrm) return lRemove(LOCATIONS[+b.dataset.lrm]);
});
document.addEventListener('click', () => document.querySelectorAll('.opsi.open').forEach(x => x.classList.remove('open')));

function lRemove(l) {
  const del = LOC.removalAction(l) === 'delete';
  showPreview(del ? 'Delete Location' : 'Deactivate Location', `<p style="font-size:11px;margin:0">${del ? 'Hapus' : 'Nonaktifkan'} <b>${esc(l.code)} - ${esc(l.name)}</b>?<br>
      ${del ? 'Lokasi ini belum pernah dipakai di transaksi delivery, sehingga dihapus permanen.'
            : 'Lokasi ini sudah dipakai di transaksi delivery. Data tidak dihapus: Status menjadi <b>INACTIVE</b> agar histori delivery tetap punya referensi, dan lokasi tidak bisa dipilih di transaksi baru.'}</p>`,
    `<button class="btn-outline" id="lrCancel">Batal</button><button style="height:30px;background:#f43f5e;color:#fff;border:0;border-radius:5px;padding:0 14px;font-weight:600" id="lrOk">${del ? 'Delete' : 'Deactivate'}</button>`);
  $('lrCancel').onclick = closePreview;
  $('lrOk').onclick = () => {
    const res = del ? LOC.remove(l, LOCATIONS) : LOC.deactivate(l, USER, new Date());
    closePreview();
    if (!res.ok) return toast(res.error);
    if (lEditing?.loc === l) lReset();
    lRender(); toast(`${l.code} - ${l.name} ${del ? 'dihapus' : 'di-nonaktifkan (INACTIVE)'}`);
  };
}

// View: detail + geofence check simulation (Haversine distance driver GPS vs location)
function lView(l) {
  const rows = [['Location Alias', l.code], ['Location Name', l.name], ['Sub Area', l.subArea || '-'], ['Google Map Address', l.gmapAddress || '-'],
    ['Physical Address', l.physicalAddress || '-'], ['Coordinates', `${l.lat}, ${l.lng}`], ['Radius', `${l.radius} m`], ['Auto Finish Order', l.autoFinish],
    ['Auto Generate Cycle', l.autoCycle], ['Status', l.status], ['Dipakai di delivery', l.usedInDelivery ? 'Ya' : 'Tidak'],
    ['Created', `${l.createdBy} · ${fmtDT(l.createdAt)}`], ['Updated', `${l.updatedBy} · ${fmtDT(l.updatedAt)}`]];
  showPreview(`View Location ${l.code}`, `<div class="kv">${rows.map(([k, v]) => `<span>${k}</span><b>${esc(v)}</b>`).join('')}</div>
    <div class="geo"><p class="sec-title" style="margin-bottom:8px">Simulasi closing delivery (geofence)</p>
      <div class="row2"><div><label style="font-size:10px">GPS Driver Latitude</label><input id="gLat" value="${(l.lat + 0.0003).toFixed(7)}"></div>
      <div><label style="font-size:10px">GPS Driver Longitude</label><input id="gLng" value="${(l.lng + 0.0003).toFixed(7)}"></div>
      <button class="btn-blue" style="height:30px" id="gCheck">Cek</button></div>
      <div id="gRes"></div></div>`, '');
  $('gCheck').onclick = () => {
    const la = $('gLat').value, ln = $('gLng').value;
    if (!(Number.isFinite(+la) && Number.isFinite(+ln)) || la === '' || ln === '') { $('gRes').innerHTML = '<div class="geo-res out">GPS driver tidak valid.</div>'; return; }
    const g = LOC.geofence(l, la, ln);
    const fin = LOC.finishRecord(l, { trigger: false, gpsLat: la, gpsLng: ln, at: new Date(), user: 'driver' });
    $('gRes').innerHTML = `<div class="geo-res ${g.inside ? 'in' : 'out'}"><b>${g.status}</b> · jarak ${g.distance.toFixed(1)} m (radius ${l.radius} m)
      ${g.warning ? `<br>&#9888; ${g.warning} Closing tetap bisa dilakukan; kejadian dicatat untuk monitoring.` : '<br>Closing mengikuti SOP normal.'}
      <br>Finish mechanism closing manual: <b>${fin.mechanism}</b>${l.autoFinish === 'Yes' ? '. Lokasi ini Auto Finish = Yes: delivery bisa selesai otomatis (AUTO) saat trigger TC-PBR terpenuhi, tanpa scan driver.' : ''}</div>`;
  };
}

// ---------- Export .xls ----------
$('lExport').addEventListener('click', () => {
  const rows = lFiltered(), cols = LCOLS.filter(([k]) => !lState.hidden.has(k));
  const x = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#DFE4EC" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Master Location"><Table>
<Row>${cols.map(([, l]) => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(l)}</Data></Cell>`).join('')}</Row>
${rows.map(l => `<Row>${cols.map(([k]) => `<Cell><Data ss:Type="${k === 'radius' ? 'Number' : 'String'}">${x(lVal(l, k))}</Data></Cell>`).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`;
  const a = document.createElement('a'), d = new Date();
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
  a.download = `Master_Location_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xls`;
  a.click(); URL.revokeObjectURL(a.href);
  toast(`${rows.length} baris diexport`);
});

// Initialise when the Location page is shown (Leaflet needs a visible container)
function onLocationView(view) {
  if (view !== 'location-code') return;
  initMap();
  if (map) setTimeout(() => { map.invalidateSize(); drawMarker(false); }, 0);
}
document.addEventListener('masterview', e => onLocationView(e.detail));
lRender();
onLocationView(location.hash.slice(1));
