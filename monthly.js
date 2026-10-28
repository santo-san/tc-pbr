// ELIPS Monthly PR / PO mock-up UI. Business rules live in monthly-workflow.js.
const M = window.MonthlyWorkflow, { AP, PR, PO, LEVELS } = M;

// ---------- Helpers ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pad = (n, l = 2) => String(n).padStart(l, '0');
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const num = n => Number(n).toLocaleString('en-US');
const fmtD = d => d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : '';
const fmtDT = d => d ? `${fmtD(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const HOUR = 3600000, DAY = 24 * HOUR;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ---------- Master data ----------
const MASTER = { poAutoApproveDays: 1, approvers: { SH: 'farid.fadillah', DpH: 'bahauddin', DH: 'risa' }, division: 'VPLD' };
const SUPPLIERS = [
  ['DNX', 'PT. Dunia Express Transindo', 6, 1002881622], ['JMP', 'PT. EMKL Jakarta Maju Pusaka', 5, 1002831622],
  ['PBM', 'PT. Pusaka Bahari Mandiri', 21, 1000031622], ['PNJ', 'PT. Puninar Jaya', 7, 993664142],
  ['VMB', 'PT. Vifiera Minova Bersaudara', 5, 1000031622], ['AGR', 'PT. Agung Raya', 3, 1000031622],
  ['GIB', 'PT. Galuh Inti Bahari', 20, 1000031622], ['IBT', 'PT. Iron Bird Transport', 1, 1003031622],
  ['MJR', 'PT. Mentari Jaya Raya', 3, 1000031622], ['PLI', 'PT. Pancaran Logistik Indonesia', 20, 1330558622],
  ['SRL', 'PT. Serasi Logistics', 5, 0], ['TFL', 'PT. Toyofuji Logistics', 4, 0],
];
const SUP = Object.fromEntries(SUPPLIERS.map(s => [s[0], s[1]]));
const LOC = {
  A1: 'Port Area Priok', D1: 'Depo Sunter', D2: 'Depo Cikarang', D3: 'Depo Cakung Marunda', X1: 'CY External Cakung / Marunda',
  K1E: '(Full) CY TMMIN Karawang', S1: '(Full) CY TMMIN Sunter 1', K1M: '(Empty) CY TMMIN Karawang', S1M: '(Empty) CY TMMIN Sunter 1',
};
// Prices from the reference screen (20ft); 40ft = 20ft + 216,240
const KNOWN_P20 = { A1_D3: 1535886, A1_K1E_A1: 3700470, A1_K1E_D1: 2935500, A1_K1E_D2: 2611140, A1_K1E_D3: 3043620, A1_K1E_S1_A1: 4341060,
  A1_K1E_S1_D1: 4016700, A1_K1E_S1_D2: 4773540, A1_K1E_S1_D3: 4124820, A1_K1E_S1_X1: 4232940 };
const P40_DIFF = 216240;
const ROUTE_CODES = (() => {
  const ends = ['A1', 'D1', 'D2', 'D3', 'X1'], mids = ['K1E', 'S1', 'K1M', 'S1M'], out = [];
  const midSeqs = [[]].concat(mids.map(a => [a]), mids.flatMap(a => mids.filter(b => b !== a).map(b => [a, b])));
  for (const s of ends) for (const m of midSeqs) for (const e of ends) {
    if (!m.length && (e === s || (s === 'A1' && e !== 'D3'))) continue;
    out.push([s, ...m, e].join('_'));
  }
  return out.sort().slice(0, 253);
})();

function makeRoutes(code, ym, target) {
  const r = rng([...code + ym].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261));
  const routes = ROUTE_CODES.map(rc => {
    const seg = rc.split('_').length - 1;
    const p20 = code === 'DNX' && KNOWN_P20[rc] ? KNOWN_P20[rc] : Math.round(600000 + seg * 650000 + r() * 900000);
    return { code: rc, desc: rc.split('_').map(c => LOC[c]).join(' - '), q20: 1, q40: 1, p20, p40: p20 + P40_DIFF };
  });
  // Match the PR total from the reference screen exactly (adjust the last route)
  const total = routes.reduce((s, x) => s + x.p20 + x.p40, 0);
  if (target) {
    const diff = target - total, last = routes[routes.length - 1];
    last.p20 += Math.floor(diff / 2); last.p40 += diff - Math.floor(diff / 2);
  }
  return routes;
}

const PRS = [], POS = [];
const CTX = { master: MASTER, pos: POS, prs: PRS };
const IP = { role: 'IP_ADMIN', userId: 'ielp1', name: 'Admin IELP' };
const approver = lv => ({ role: 'APPROVER', level: lv, division: MASTER.division, userId: MASTER.approvers[lv] });
const supplier = code => ({ role: 'SUPPLIER', supplierCode: code, userId: `${code.toLowerCase()}.admin`, name: SUP[code] });
const GA = { role: 'GA', userId: 'ga.staff', name: 'General Affair Dept' };
// PR running number per production month (Oct 2026 starts at 1152 as on the reference screen)
const SEQ = { '2026-08': 952, '2026-09': 1052, '2026-10': 1152, '2026-11': 1252 };

function seedPR(code, ym, rev, prDate, steps = []) {
  const s = SUPPLIERS.find(x => x[0] === code);
  const [y, m] = ym.split('-');
  const routes = makeRoutes(code, ym, ym === '2026-10' && rev === 1 && s[3] ? s[3] : 990000000 + Math.round(rng(SEQ[ym] * 31 + rev)() * 20000000));
  const pr = {
    prNo: `${code}${y.slice(2)}${m}${SEQ[ym]++}`, ym, rev, prodMonth: `${m}/${y}-${rev}`, supplierCode: code, supplierName: s[1],
    percentage: s[2], routes, qty: routes.reduce((a, x) => a + x.q20 + x.q40, 0), price: routes.reduce((a, x) => a + x.q20 * x.p20 + x.q40 * x.p40, 0),
    prDate, createdBy: 'ielp1', approval: M.newApproval(), history: [],
  };
  pr.history.push({ at: prDate, user: 'ielp1', role: 'IP Admin', action: 'PR Creation', from: '-', to: M.prStatus(pr), reason: '', note: '' });
  PRS.push(pr);
  for (const [act, lv, at, reason] of steps) {
    if (act === 'A') M.approvePR(pr, approver(lv), at, CTX); else M.rejectPR(pr, approver(lv), reason, at);
  }
  return pr;
}
const allApproved = (d0, d1) => [['A', 'SH', d0], ['A', 'DpH', d1], ['A', 'DH', new Date(d1.getTime() + HOUR)]];

// Aug & Sep 2026: fully approved; POs approved by supplier or auto approved
for (const [ym, prDay, mon] of [['2026-08', new Date(2026, 6, 31, 9), 7], ['2026-09', new Date(2026, 7, 31, 9), 8]]) {
  SUPPLIERS.forEach(([code], i) => seedPR(code, ym, 1, prDay, allApproved(new Date(2026, mon - 1, 31, 14), new Date(2026, mon, 2, 10))));
}
// Oct 2026: as on the reference screen, plus pending and rejected / revised PRs
SUPPLIERS.slice(0, 10).forEach(([code]) => seedPR(code, '2026-10', 1, new Date(2026, 8, 30, 9), allApproved(new Date(2026, 8, 30, 15), new Date(2026, 9, 2, 10))));
seedPR('SRL', '2026-10', 1, new Date(2026, 8, 30, 9), [['A', 'SH', new Date(2026, 8, 30, 16)]]);
seedPR('TFL', '2026-10', 1, new Date(2026, 8, 30, 9), [['A', 'SH', new Date(2026, 8, 30, 16)], ['R', 'DpH', new Date(2026, 9, 1, 9), 'Persentase sharing tidak sesuai kontrak']]);
seedPR('TFL', '2026-10', 2, new Date(2026, 9, 3, 9));
// Nov 2026 (relative to now): POs still waiting General Affair approval, one about to be auto approved (Day + 1)
const NOW = Date.now();
const ago = h => new Date(NOW - h * HOUR);
const nov = (code, steps) => seedPR(code, '2026-11', 1, ago(120), steps);
nov('PBM', [['A', 'SH', ago(100)], ['A', 'DpH', ago(90)], ['A', 'DH', ago(10)]]);
nov('SRL', [['A', 'SH', ago(100)], ['A', 'DpH', ago(90)], ['A', 'DH', ago(MASTER.poAutoApproveDays * 24 - 2 / 60)]]);
nov('DNX', [['A', 'SH', ago(100)], ['A', 'DpH', ago(90)], ['A', 'DH', ago(22)]]);
nov('JMP', [['A', 'SH', ago(60)], ['A', 'DpH', ago(30)]]);
nov('GIB', [['A', 'DpH', ago(50)]]);           // DpH approves directly: SH Skip
nov('PLI', [['A', 'DH', ago(6)]]);             // DH approves directly: SH and DpH Skip
nov('PNJ', []);
nov('AGR', []);
// General Affair approves part of the older POs, rejects one (its PR goes back to PR Creation);
// the rest are approved by the scheduled job at their deadline
POS.forEach((po, i) => {
  if (po.deadline.getTime() > NOW) return;
  const at = new Date(po.poDate.getTime() + (2 + i % 20) * HOUR);
  if (po.prNo === 'IBT26091059') M.rejectPO(po, GA, 'Harga route tidak sesuai kontrak terbaru', at, CTX);
  else if (i % 3 !== 2) M.approvePO(po, GA, at);
  else M.runAutoApprove([po], po.deadline);
});

// ---------- Views ----------
const VIEWS = {
  'pr-creation': { title: 'PR Creation', empty: true },
  'pr-approval': { title: 'PR Approval', doc: 'pr', approval: true },
  'po-approval': { title: 'PO Approval', doc: 'po', approval: true },
  'pr-inquiry': { title: 'PR Inquiry', doc: 'pr' },
  'po-inquiry': { title: 'PO Inquiry', doc: 'po' },
};
const PR_STATUS_OPT = [['', ''], ['mylevel', 'Perlu approval saya'], ['pending', 'Pending (all levels)'], ['Waiting SH', 'Waiting SH'], ['Waiting DpH', 'Waiting DpH'], ['Waiting DH', 'Waiting DH'],
  [PR.APPROVED, 'Approved'], [PR.REJECTED, 'Rejected'], [PR.RETURNED, 'Returned (perlu submit ulang)']];
const PO_STATUS_OPT = [['', ''], [PO.PENDING, 'Pending'], [PO.APPROVED, 'Approved'], [PO.AUTO, 'Auto Approved'], [PO.REJECTED, 'Rejected']];

const state = { view: 'pr-inquiry', actor: IP, f: { no: '', from: '2026-10', to: '', status: '' }, search: '', sortKey: 'prodMonth', sortDir: 1, page: 1, size: 10, hidden: new Set(), selected: new Set() };

const dot = s => `<span class="dot ${s === AP.NONE ? 'none' : s}" title="${s === AP.NONE ? 'Belum sampai' : s}"></span>`;
const poBadge = s => `<span class="lg ${s === PO.PENDING ? 'lg-pending' : s === PO.REJECTED ? 'lg-rejected' : s === PO.AUTO ? 'lg-auto' : 'lg-approved'}">${s}</span>`;
const prBadge = s => `<span class="lg ${s === PR.APPROVED ? 'lg-approved' : s === PR.REJECTED ? 'lg-rejected' : s === PR.RETURNED ? 'lg-returned' : 'lg-pending'}">${s}</span>`;
function countdown(po) {
  if (po.status !== PO.PENDING) return '';
  const ms = po.deadline.getTime() - Date.now();
  if (ms <= 0) return '<span class="countdown late">menunggu job auto approve</span>';
  const h = Math.floor(ms / HOUR), mnt = Math.floor(ms % HOUR / 60000);
  return `<span class="countdown">sisa ${h} jam ${mnt} menit</span>`;
}
const prSharing = d => `<td data-col="sharing" class="c-pct">${d.percentage}%</td><td data-col="sharing" class="c-qty">${num(d.qty)}</td><td data-col="sharing" class="c-price">${num(d.price)}</td>`;
const trucking = d => `<td data-col="trucking">${d.supplierCode}</td><td data-col="trucking" class="left">${esc(d.supplierName)}</td>`;

const COLS = {
  pr: {
    head: c => `<tr>${c.chk}<th rowspan="2" class="sortable" data-sort="prodMonth" data-col="prodMonth">Production<br>Month</th><th rowspan="2" class="sortable" data-sort="prNo" data-col="no" style="min-width:120px">PR Number</th>
      <th colspan="3" data-col="status">Status</th><th rowspan="2" data-col="pic">Current PIC</th><th rowspan="2" class="sortable" data-sort="prDate" data-col="date">PR date</th>
      <th colspan="2" data-col="trucking">Trucking</th><th colspan="3" data-col="sharing">Order Sharing</th><th colspan="3" data-col="released">Released By</th></tr>
      <tr>${LEVELS.map(l => `<th data-col="status">${l}</th>`).join('')}<th data-col="trucking">Code</th><th data-col="trucking" style="min-width:170px">Name</th>
      <th data-col="sharing">Percentage</th><th data-col="sharing">Qty</th><th data-col="sharing">Total Price</th>${LEVELS.map(l => `<th data-col="released">${l}</th>`).join('')}</tr>`,
    row: d => `<td data-col="prodMonth">${d.prodMonth}</td>
      <td data-col="no"><a class="doc-link" data-open="${d.prNo}">${d.prNo}</a><button class="dl" data-dl="${d.prNo}" title="Download">&#11015;</button>${[PR.REJECTED, PR.RETURNED].includes(M.prStatus(d)) ? `<span class="sub-info">${prBadge(M.prStatus(d))}${d.returned ? ' perlu submit ulang' : ''}</span>` : ''}</td>
      ${LEVELS.map(l => `<td data-col="status">${dot(d.approval[l].status)}</td>`).join('')}
      <td data-col="pic">${M.currentPic(d)}</td><td data-col="date">${fmtD(d.prDate)}</td>${trucking(d)}${prSharing(d)}
      ${LEVELS.map(l => { const a = d.approval[l]; return `<td data-col="released" class="rel">${a.by && a.status === AP.APPROVED ? `${a.by}<small>${fmtD(a.at)}</small>` : a.status === AP.REJECTED ? `<span class="lg lg-rejected">Rejected</span><small>${a.by} ${fmtD(a.at)}</small>` : a.status === AP.SKIP ? '<span class="lg lg-skip">Skip</span>' : '-'}</td>`; }).join('')}`,
    kolom: [['prodMonth', 'Production Month'], ['no', 'PR Number'], ['status', 'Status'], ['pic', 'Current PIC'], ['date', 'PR date'], ['trucking', 'Trucking'], ['sharing', 'Order Sharing'], ['released', 'Released By']],
    status: d => M.prStatus(d),
  },
  po: {
    head: c => `<tr>${c.chk}<th rowspan="2" class="sortable" data-sort="prodMonth" data-col="prodMonth">Production<br>Month</th><th rowspan="2" class="sortable" data-sort="poNo" data-col="no" style="min-width:130px">PO Number</th>
      <th rowspan="2" data-col="prno">PR Number</th><th rowspan="2" class="sortable" data-sort="status" data-col="status">PO Status</th><th rowspan="2" class="sortable" data-sort="deadline" data-col="deadline">Auto Approve At</th>
      <th rowspan="2" data-col="approved">Approved By</th><th rowspan="2" class="sortable" data-sort="poDate" data-col="date">PO date</th>
      <th colspan="2" data-col="trucking">Trucking</th><th colspan="3" data-col="sharing">Order Sharing</th></tr>
      <tr><th data-col="trucking">Code</th><th data-col="trucking" style="min-width:170px">Name</th><th data-col="sharing">Percentage</th><th data-col="sharing">Qty</th><th data-col="sharing">Total Price</th></tr>`,
    row: d => `<td data-col="prodMonth">${d.prodMonth}</td>
      <td data-col="no"><a class="doc-link" data-open="${d.poNo}">${d.poNo}</a><button class="dl" data-dl="${d.poNo}" title="Download">&#11015;</button></td>
      <td data-col="prno">${d.prNo}</td><td data-col="status">${poBadge(d.status)}${d.reason ? `<span class="sub-info">${esc(d.reason)}</span>` : ''}</td>
      <td data-col="deadline">${fmtDT(d.deadline)}${countdown(d)}</td>
      <td data-col="approved" class="rel">${d.by ? `${d.by}<small>${fmtDT(d.at)}</small>` : '-'}</td><td data-col="date">${fmtD(d.poDate)}</td>${trucking(d)}${prSharing(d)}`,
    kolom: [['prodMonth', 'Production Month'], ['no', 'PO Number'], ['prno', 'PR Number'], ['status', 'PO Status'], ['deadline', 'Auto Approve At'], ['approved', 'Approved By'], ['date', 'PO date'], ['trucking', 'Trucking'], ['sharing', 'Order Sharing']],
    status: d => d.status,
  },
};

const docs = () => VIEWS[state.view].doc === 'pr' ? PRS : POS;
const docNo = d => d.poNo || d.prNo;
function selectable(d) {
  const v = VIEWS[state.view];
  if (!v.approval) return false;
  return v.doc === 'pr' ? !M.prBlock(d, state.actor) : !M.poBlock(d, state.actor, new Date());
}

function filtered() {
  const v = VIEWS[state.view], c = COLS[v.doc], f = state.f, q = state.search.trim().toLowerCase();
  const rows = docs().filter(d => {
    const st = c.status(d);
    return M.canView(state.actor, d) &&
      (!f.no || docNo(d).toLowerCase().includes(f.no.toLowerCase().trim())) &&
      (!f.from || d.ym >= f.from) && (!f.to || d.ym <= f.to) &&
      (!f.status || (f.status === 'pending' ? M.isPending(d) : f.status === 'mylevel' ? M.needsMe(d, state.actor) : st === f.status)) &&
      (!q || [d.prodMonth, docNo(d), d.prNo, d.supplierCode, d.supplierName, st, d.percentage + '%', d.qty, num(d.price)].join(' ').toLowerCase().includes(q));
  });
  const k = state.sortKey;
  const val = d => k === 'prodMonth' ? d.ym + pad(d.rev) + d.prNo : k === 'status' ? c.status(d) : d[k] instanceof Date ? d[k].getTime() : d[k];
  rows.sort((a, b) => val(a) < val(b) ? -state.sortDir : val(a) > val(b) ? state.sortDir : 0);
  return rows;
}

function render() {
  const v = VIEWS[state.view];
  $('pageTitle').textContent = v.title;
  $('crumb').innerHTML = `PR/PO &nbsp;-&nbsp; ${v.title}`;
  document.querySelectorAll('#monthlySub a').forEach(a => a.classList.toggle('active', a.dataset.view === state.view));
  $('emptyPage').style.display = v.empty ? '' : 'none';
  $('content').style.display = v.empty ? 'none' : '';
  if (v.empty) return;
  const c = COLS[v.doc];
  const rows = filtered();
  const pages = Math.max(1, Math.ceil(rows.length / state.size));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.size, view = rows.slice(start, start + state.size);
  const sel = rows.filter(d => state.selected.has(docNo(d)) && selectable(d));
  const anySel = view.some(selectable);
  $('thead').innerHTML = c.head({ chk: v.approval ? `<th rowspan="2" class="chk"><input type="checkbox" id="chkAll" ${anySel ? '' : 'disabled'} ${anySel && view.filter(selectable).every(d => state.selected.has(docNo(d))) ? 'checked' : ''} aria-label="Pilih semua"></th>` : '' });
  $('tbody').innerHTML = view.length ? view.map(d => `<tr>${v.approval ? `<td class="chk"><input type="checkbox" data-chk="${docNo(d)}" ${selectable(d) ? '' : 'disabled'} ${state.selected.has(docNo(d)) ? 'checked' : ''} aria-label="Pilih ${docNo(d)}"></td>` : ''}${c.row(d)}</tr>`).join('')
    : `<tr><td colspan="20" class="empty">No Data Found</td></tr>`;
  const total = docs().filter(d => M.canView(state.actor, d)).length;
  $('info').textContent = rows.length ? `Showing ${start + 1} to ${start + view.length} of ${rows.length} records` + (rows.length !== total ? ` (filtered from ${total} total entries)` : '') : 'Showing 0 to 0 of 0 records';
  $('pager').innerHTML = pagerHtml(state.page, pages);
  document.querySelectorAll('#thead th.sortable').forEach(th => { if (th.dataset.sort === state.sortKey) th.insertAdjacentHTML('beforeend', `<span class="arrow">${state.sortDir === 1 ? '▲' : '▼'}</span>`); });
  document.querySelectorAll('[data-col]').forEach(el => el.classList.toggle('hidden-col', state.hidden.has(el.dataset.col)));

  // Bulk actions and notice per view / role
  const a = state.actor;
  // Approve / Reject are always shown on approval screens; enabled only for the allowed role with a selection
  let bulk = '', notice = '';
  if (v.approval) {
    const allowed = v.doc === 'pr' ? a.role === 'APPROVER' : a.role === 'GA';
    const why = v.doc === 'pr' ? 'Hanya approver VPLD (SH, DpH, DH)' : 'Hanya General Affair Department';
    const dis = !allowed || !sel.length ? 'disabled' : '';
    const tip = allowed ? 'Centang dokumen terlebih dahulu' : why;
    bulk = `<button class="btn-green" data-bulk="approve" ${dis} title="${dis ? tip : ''}">Approve (${allowed ? sel.length : 0})</button><button class="btn-red2" data-bulk="reject" ${dis} title="${dis ? tip : ''}">Reject (${allowed ? sel.length : 0})</button>`;
    if (!allowed) notice = v.doc === 'pr' ? 'Approve / Reject PR hanya untuk approver VPLD (SH, DpH, DH). Ganti "Login sebagai" untuk mencoba.'
      : `PO di-auto approve oleh sistem pada Day + ${MASTER.poAutoApproveDays}. Approve / Reject manual sebelum batas waktu dilakukan oleh General Affair Department.`;
    if (v.doc === 'po' && a.role === 'IP_ADMIN') bulk += '<button class="btn-blue" data-bulk="auto">Jalankan Auto Approve sekarang</button>';
  }
  $('bulk').innerHTML = bulk;
  $('notice').style.display = notice ? '' : 'none'; $('notice').textContent = notice;
}
function pagerHtml(page, pages) {
  let html = `<button data-p="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= pages; p++) {
    if (pages > 7 && p > 2 && p < pages - 1 && Math.abs(p - page) > 1) { if (!html.endsWith('…</span>')) html += '<span>…</span>'; continue; }
    html += `<button data-p="${p}" class="${p === page ? 'cur' : ''}">${p}</button>`;
  }
  return html + `<button data-p="${page + 1}" ${page === pages ? 'disabled' : ''}>›</button>`;
}

function setupView() {
  const v = VIEWS[state.view];
  if (v.empty) return render();
  const isPo = v.doc === 'po';
  $('fNoLabel').textContent = isPo ? 'PO Number' : 'PR Number';
  $('fStatus').innerHTML = (isPo ? PO_STATUS_OPT : PR_STATUS_OPT).map(([val, l]) => `<option value="${val}">${l}</option>`).join('');
  const a = state.actor;
  const defStatus = v.approval ? (isPo ? PO.PENDING : a.role === 'APPROVER' ? 'mylevel' : 'pending') : '';
  state.f = { no: '', from: v.approval ? '' : '2026-10', to: '', status: defStatus };
  $('fNo').value = ''; $('fFrom').value = state.f.from; $('fTo').value = ''; $('fStatus').value = defStatus;
  state.search = ''; $('search').value = ''; state.page = 1; state.selected.clear(); state.hidden.clear();
  state.sortKey = 'prodMonth'; state.sortDir = 1;
  $('kolomMenu').innerHTML = COLS[v.doc].kolom.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" checked> ${l}</label>`).join('');
  $('legendRow').innerHTML = isPo
    ? '<span class="lg lg-pending">Pending</span><span class="lg lg-approved">Approved</span><span class="lg lg-auto">Auto Approved</span><span class="lg lg-rejected">Rejected</span>'
    : '<span class="lg lg-pending">Pending</span><span class="lg lg-approved">Approved</span><span class="lg lg-rejected">Rejected</span><span class="lg lg-skip">Skip</span><span class="lg lg-returned">Returned</span><span class="lg lg-none">- Belum ada</span>';
  $('legendInfo').innerHTML = isPo
    ? `PO dibuat otomatis setelah PR Approved dan di-auto approve sistem pada <b>Day + ${MASTER.poAutoApproveDays}</b> (System Master). Sebelum itu General Affair dapat approve / reject manual. PO Rejected mengembalikan PR ke PR Creation untuk submit ulang.`
    : `Approval PR oleh divisi <b>${MASTER.division}</b>: SH, DpH, DH. Level lebih tinggi boleh approve langsung; level di bawahnya menjadi <b>Skip</b>. Current PIC = pembuat PR.`;
  render();
}

// ---------- Events ----------
function go(view) { state.view = VIEWS[view] ? view : 'pr-inquiry'; setupView(); }
window.addEventListener('hashchange', () => go(location.hash.slice(1)));
$('monthlyToggle').addEventListener('click', e => { e.preventDefault(); $('monthlySub').classList.toggle('collapsed'); });
document.querySelectorAll('[data-page]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); toast(`Halaman "${a.dataset.page}" belum tersedia di mock-up ini`); }));
$('btnDriverApp').addEventListener('click', () => toast('Download Driver App (mock-up)'));
$('btnLanding').addEventListener('click', () => toast('Menuju Landing Page (mock-up)'));

$('btnSearch').addEventListener('click', () => {
  const f = { no: $('fNo').value, from: $('fFrom').value, to: $('fTo').value, status: $('fStatus').value };
  if (f.from && f.to && f.from > f.to) { toast('Prod. Month From tidak boleh lebih besar dari Prod. Month To'); return; }
  state.f = f; state.page = 1; render();
  if (!filtered().length) toast('No Data Found');
});
$('btnClear').addEventListener('click', () => {
  ['fNo', 'fFrom', 'fTo', 'fStatus', 'search'].forEach(id => $(id).value = '');
  state.f = { no: '', from: '', to: '', status: '' }; state.search = ''; state.page = 1; render();
});
$('search').addEventListener('input', e => { state.search = e.target.value; state.page = 1; render(); });
$('pageSize').addEventListener('change', e => { state.size = +e.target.value; state.page = 1; render(); });
$('pager').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { state.page = +b.dataset.p; render(); } });
$('thead').addEventListener('click', e => {
  if (e.target.id === 'chkAll') {
    const view = filtered().slice((state.page - 1) * state.size, state.page * state.size).filter(selectable);
    view.forEach(d => e.target.checked ? state.selected.add(docNo(d)) : state.selected.delete(docNo(d)));
    return render();
  }
  const th = e.target.closest('th.sortable'); if (!th) return;
  state.sortDir = state.sortKey === th.dataset.sort ? -state.sortDir : 1; state.sortKey = th.dataset.sort; render();
});
$('tbody').addEventListener('click', e => {
  const chk = e.target.closest('[data-chk]');
  if (chk) { chk.checked ? state.selected.add(chk.dataset.chk) : state.selected.delete(chk.dataset.chk); return render(); }
  const o = e.target.closest('[data-open]'); if (o) return openDetail(o.dataset.open);
  const dl = e.target.closest('[data-dl]'); if (dl) return download(dl.dataset.dl);
});
$('kolomMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? state.hidden.delete(k) : state.hidden.add(k); render(); });
document.querySelectorAll('.dd > button').forEach(btn => btn.addEventListener('click', e => {
  e.stopPropagation(); const dd = btn.parentElement;
  document.querySelectorAll('.dd').forEach(x => x !== dd && x.classList.remove('open')); dd.classList.toggle('open');
}));
document.querySelectorAll('.dd-menu').forEach(m => m.addEventListener('click', e => e.stopPropagation()));
document.addEventListener('click', () => document.querySelectorAll('.dd').forEach(x => x.classList.remove('open')));

$('roleSel').addEventListener('change', () => {
  const [kind, val] = $('roleSel').value.split(':');
  state.actor = kind === 'ip' ? IP : kind === 'ga' ? GA : kind === 'ap' ? approver(val) : supplier(val);
  const a = state.actor;
  $('userName').textContent = a.userId;
  $('userRole').textContent = M.roleLabel(a) + (a.role === 'SUPPLIER' ? ` · ${a.name}` : '');
  $('userAvatar').textContent = (a.role === 'SUPPLIER' ? a.supplierCode : a.userId).slice(0, 2).toUpperCase();
  setupView();
  if (a.role === 'SUPPLIER') toast(`Hanya menampilkan data ${a.name}`);
});

// ---------- Bulk approve / reject ----------
let onPreviewClose = null;
function showPreview(title, body, foot) { $('pvTitle').textContent = title; $('pvBody').innerHTML = body; $('pvFoot').innerHTML = foot; $('preview').classList.add('show'); }
function closePreview() { $('preview').classList.remove('show'); }
$('pvClose').addEventListener('click', closePreview);
$('preview').addEventListener('click', e => { if (e.target === $('preview')) closePreview(); });

$('bulk').addEventListener('click', e => {
  const b = e.target.closest('[data-bulk]'); if (!b || b.disabled) return;
  if (b.dataset.bulk === 'auto') {
    const done = M.runAutoApprove(POS, new Date());
    render(); toast(done.length ? `${done.length} PO di-auto approve: ${done.map(p => p.poNo).join(', ')}` : 'Tidak ada PO yang melewati batas waktu');
    return;
  }
  const list = docs().filter(d => state.selected.has(docNo(d)) && selectable(d));
  if (!list.length) { toast(`Pilih minimal satu ${VIEWS[state.view].doc === 'po' ? 'PO' : 'PR'}`); return; }
  openApproval(list, b.dataset.bulk === 'reject');
});

// Approve / reject confirmation for one or more documents (from the list or from the detail modal)
function openApproval(list, reject) {
  const isPo = VIEWS[state.view].doc === 'po';
  const what = isPo ? 'PO' : 'PR';
  showPreview(`${reject ? 'Reject' : 'Approve'} ${what}${isPo ? '' : ` - ${state.actor.level} ${MASTER.division}`}`,
    `<form id="apvForm" onsubmit="return false">
      <p style="margin:0 0 8px;font-size:11px">${list.length} ${what} dipilih:</p>
      <div class="apv-list">${list.map(d => `<div data-r="${docNo(d)}">${docNo(d)} · ${esc(d.supplierName)} · ${num(d.price)}</div>`).join('')}</div>
      ${reject ? `<div class="form-row" data-f="reason"><label>Reason <span class="req">*</span></label><textarea name="reason" placeholder="Minimal ${M.REASON_MIN} karakter"></textarea></div>`
        : `<p style="font-size:11px;margin:0">${isPo ? 'Approve PO ini?' : `Approve sebagai <b>${state.actor.level}</b>?${skipNote(list)}${state.actor.level === 'DH' ? ' PO akan dibuat otomatis.' : ''}`}</p>`}
    </form>`,
    `<button class="btn-outline" id="apvCancel">Batal</button><button class="${reject ? 'btn-red2' : 'btn-green'}" style="height:30px" id="apvSubmit">${reject ? 'Reject' : 'Approve'}</button>`);
  $('apvCancel').onclick = closePreview;
  $('apvSubmit').onclick = () => {
    const reason = reject ? $('apvForm').querySelector('[name=reason]').value : '';
    const row = $('apvForm').querySelector('[data-f=reason]');
    if (reject) {
      row.classList.remove('err'); row.querySelector('.msg')?.remove();
      const err = !reason.trim() ? 'Reason wajib diisi' : reason.trim().length < M.REASON_MIN ? `Reason minimal ${M.REASON_MIN} karakter` : null;
      if (err) { row.classList.add('err'); row.insertAdjacentHTML('beforeend', `<div class="msg">${err}</div>`); return; }
    }
    const now = new Date(), fails = [], pos = [], returned = [];
    for (const d of list) {
      const res = isPo ? (reject ? M.rejectPO(d, state.actor, reason, now, CTX) : M.approvePO(d, state.actor, now))
        : (reject ? M.rejectPR(d, state.actor, reason, now) : M.approvePR(d, state.actor, now, CTX));
      if (res.pr) returned.push(res.pr.prNo);
      if (!res.ok) fails.push(`${docNo(d)}: ${res.error || Object.values(res.errors).join(', ')}`);
      if (res.po) pos.push(res.po.poNo);
      state.selected.delete(docNo(d));
    }
    if (fails.length) {
      $('apvForm').insertAdjacentHTML('afterbegin', `<div class="form-alert">${fails.map(esc).join('<br>')}</div>`);
      $('apvSubmit').disabled = true;
    } else closePreview();
    render();
    if ($('overlay').classList.contains('show')) openDetail(docNo(rs.doc));
    toast(`${list.length - fails.length} ${what} ${reject ? 'di-reject' : 'di-approve'}${pos.length ? ` · PO dibuat: ${pos.join(', ')}` : ''}${returned.length ? ` · PR dikembalikan ke PR Creation: ${returned.join(', ')}` : ''}`);
  };
}

function skipNote(list) {
  const lv = state.actor.level, lower = M.LEVELS.slice(0, M.LEVELS.indexOf(lv));
  const n = list.filter(d => lower.some(l => d.approval[l].status === AP.PENDING)).length;
  return n ? ` Level di bawahnya yang masih Pending (${lower.join(', ')}) akan menjadi <b>Skip</b> pada ${n} PR.` : '';
}

// ---------- Detail modal (routes) ----------
const RCOLS = [['pct', 'Route Percentage'], ['qty', 'Qty'], ['price', 'Price']];
const rs = { doc: null, search: '', page: 1, size: 10, hidden: new Set(), sortDir: 1 };
$('rKolomMenu').innerHTML = RCOLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" checked> ${l}</label>`).join('');
$('rKolomMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? rs.hidden.delete(k) : rs.hidden.add(k); renderRoutes(); });

function openDetail(no) {
  const d = [...PRS, ...POS].find(x => docNo(x) === no);
  if (!d || !M.canView(state.actor, d)) { toast('Anda tidak memiliki akses ke dokumen ini'); return; }
  Object.assign(rs, { doc: d, search: '', page: 1, sortDir: 1 });
  $('rSearch').value = '';
  $('mTitle').textContent = `Detail ${d.poNo ? 'PO' : 'PR'} for #${no}`;
  const v = VIEWS[state.view], onApproval = v.approval && (v.doc === 'po') === !!d.poNo;
  const can = onApproval && selectable(d);
  const why = !onApproval ? '' : d.poNo ? M.poBlock(d, state.actor, new Date()) : M.prBlock(d, state.actor);
  $('docActions').innerHTML = onApproval ? `<button class="btn-green" data-doc="approve" ${can ? '' : 'disabled'} title="${esc(why || '')}">Approve</button>
    <button class="btn-red2" data-doc="reject" ${can ? '' : 'disabled'} title="${esc(why || '')}">Reject</button>${why ? `<span class="sub-info" style="align-self:center">${esc(why)}</span>` : ''}` : '';
  const h = d.history.slice().reverse();
  $('docHistory').innerHTML = `<p class="sec-title">Riwayat Approval</p><div class="table-wrap"><table>
    <tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Dari</th><th>Ke</th><th>Reason / Catatan</th></tr>
    ${h.map(x => `<tr><td style="white-space:nowrap">${fmtDT(x.at)}</td><td>${esc(x.user)}<span class="sub-info">${esc(x.role)}</span></td><td>${esc(x.action)}</td><td>${esc(x.from)}</td><td>${esc(x.to)}</td><td class="left">${esc([x.reason, x.note].filter(Boolean).join(' · ') || '-')}</td></tr>`).join('')}
  </table></div>`;
  renderRoutes();
  $('overlay').classList.add('show');
}
function renderRoutes() {
  const d = rs.doc, q = rs.search.trim().toLowerCase();
  const rows = d.routes.filter(r => !q || (r.code + ' ' + r.desc).toLowerCase().includes(q)).sort((a, b) => a.code < b.code ? -rs.sortDir : rs.sortDir);
  const pages = Math.max(1, Math.ceil(rows.length / rs.size)); rs.page = Math.min(rs.page, pages);
  const start = (rs.page - 1) * rs.size, view = rows.slice(start, start + rs.size);
  const pct = r => `${Math.round((r.q20 + r.q40) / d.qty * 100)}%`;
  $('routeTable').innerHTML = `<thead><tr><th rowspan="2" class="sortable" id="rSort" style="min-width:300px">Route <span class="arrow">${rs.sortDir === 1 ? '▲' : '▼'}</span></th>
      <th rowspan="2" data-rc="pct">Route<br>Percentage</th><th colspan="3" data-rc="qty">Qty</th><th colspan="3" data-rc="price">Price</th></tr>
      <tr><th data-rc="qty">20</th><th data-rc="qty">40</th><th data-rc="qty">Total</th><th data-rc="price">20</th><th data-rc="price">40</th><th data-rc="price">Total</th></tr></thead>
    <tbody>${view.map(r => `<tr><td class="rcell"><b>${r.code}</b><span>${esc(r.desc)}</span></td><td data-rc="pct">${pct(r)}</td>
      <td data-rc="qty">${r.q20}</td><td data-rc="qty">${r.q40}</td><td data-rc="qty" class="tq">${r.q20 + r.q40}</td>
      <td data-rc="price" class="num">${num(r.p20)}</td><td data-rc="price" class="num">${num(r.p40)}</td><td data-rc="price" class="num tp">${num(r.q20 * r.p20 + r.q40 * r.p40)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No Data Found</td></tr>'}</tbody>
    <tfoot><tr><td style="text-align:right">% Sharing Percentage for ${d.supplierCode} :</td><td data-rc="pct"><span class="pill">${d.percentage.toFixed(1)} %</span></td>
      <td data-rc="qty" colspan="2" style="text-align:right">Total QTY :</td><td data-rc="qty"><span class="pill">${num(d.qty)}</span></td>
      <td data-rc="price" colspan="2" style="text-align:right">Total. Price</td><td data-rc="price"><span class="pill">${num(d.price)}</span></td></tr></tfoot>`;
  document.querySelectorAll('#routeTable [data-rc]').forEach(el => el.classList.toggle('hidden-col', rs.hidden.has(el.dataset.rc)));
  $('rInfo').textContent = rows.length ? `Showing ${start + 1} to ${start + view.length} of ${rows.length} records` : 'Showing 0 to 0 of 0 records';
  $('rPager').innerHTML = pagerHtml(rs.page, pages);
}
$('docActions').addEventListener('click', e => {
  const b = e.target.closest('[data-doc]'); if (b && !b.disabled) openApproval([rs.doc], b.dataset.doc === 'reject');
});
$('routeTable').addEventListener('click', e => { if (e.target.closest('#rSort')) { rs.sortDir = -rs.sortDir; renderRoutes(); } });
$('rSearch').addEventListener('input', e => { rs.search = e.target.value; rs.page = 1; renderRoutes(); });
$('rPager').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { rs.page = +b.dataset.p; renderRoutes(); } });
const closeDetail = () => $('overlay').classList.remove('show');
$('mClose').addEventListener('click', closeDetail);
$('overlay').addEventListener('click', e => { if (e.target === $('overlay')) closeDetail(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('preview').classList.contains('show') ? closePreview() : closeDetail(); });

function download(no) {
  const d = [...PRS, ...POS].find(x => docNo(x) === no);
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = [d.poNo ? 'PO Number' : 'PR Number', 'Production Month', 'Trucking Code', 'Trucking Name', 'Route', 'Route Description', 'Qty 20', 'Qty 40', 'Qty Total', 'Price 20', 'Price 40', 'Price Total'];
  const lines = [head.map(q).join(',')].concat(d.routes.map(r => [no, d.prodMonth, d.supplierCode, d.supplierName, r.code, r.desc, r.q20, r.q40, r.q20 + r.q40, r.p20, r.p40, r.q20 * r.p20 + r.q40 * r.p40].map(q).join(',')));
  lines.push(['TOTAL', '', '', '', '', `Sharing ${d.percentage}%`, '', '', d.qty, '', '', d.price].map(q).join(','));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = `${no}.csv`; a.click(); URL.revokeObjectURL(a.href);
  toast(`${no}.csv di-download`);
}

// Scheduled auto approve job (simulated every 15 seconds) + countdown refresh
setInterval(() => {
  const done = M.runAutoApprove(POS, new Date());
  if (done.length) toast(`Job auto approve: ${done.map(p => p.poNo).join(', ')} menjadi Auto Approved`);
  if (VIEWS[state.view].doc === 'po' && !$('preview').classList.contains('show')) render();
}, 15000);

go(location.hash.slice(1) || 'pr-inquiry');
