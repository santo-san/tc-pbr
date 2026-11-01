// ELIPS PR Creation (Monthly) mock-up UI: List Summary, route plan detail pop-up and PR submission.
// Uses monthly.js (PRS, state, SEQ, helpers), the PR workflow (monthly-workflow.js) and the rules in pr-creation-rules.js.
const PC = window.PrCreation, PS = window.PrSources;
const idr = n => n == null ? '-' : num(n);
const monthName = ym => { const [y, m] = ym.split('-'); return `${MONTHS[+m - 1][0]}${MONTHS[+m - 1].slice(1).toLowerCase()} ${y}`; };
const prName = code => SUP[code] || code;
const nextPrNo = (code, ym) => { const [y, m] = ym.split('-'); SEQ[ym] = SEQ[ym] || 1000; return `${code}${y.slice(2)}${m}${SEQ[ym]++}`; };

// ---------- Existing December PRs (to show additional sequences and duplicate checks) ----------
(() => {
  const ym = '2026-12', base = { prs: PRS, wf: M, prNo: nextPrNo, name: prName, shareTotal: PS.src.shareTotal() };
  const at = new Date(2026, 9, 28, 10, 0);
  // DNX: Monthly Cost (sequence 1) and a route-based PR made before route D1_S1_D3 was added (sequence 2)
  PC.createPRs([{ type: 'FIX', row: PC.calculate('DNX', ym, PS.src) }], { ...base, actor: STAFF, at });
  const before = { ...PS.src, routes: () => PS.src.routes().filter(r => r.code !== 'D1_S1_D3') };
  PC.createPRs([{ type: 'ROUTE', row: PC.calculate('DNX', ym, before) }], { ...base, actor: approver('SH'), at: new Date(at.getTime() + HOUR) });
  // JMP: Monthly Cost PR rejected by DpH, so the Monthly Cost can be created again as a new sequence
  const jmp = PC.createPRs([{ type: 'FIX', row: PC.calculate('JMP', ym, PS.src) }], { ...base, actor: STAFF, at }).done[0];
  M.approvePR(jmp, approver('SH'), new Date(at.getTime() + 2 * HOUR), CTX);
  M.rejectPR(jmp, approver('DpH'), 'Monthly price belum sesuai SPK GAD terbaru', new Date(at.getTime() + 20 * HOUR));
})();

// ---------- Screen state ----------
const pcs = { type: 'ROUTE', ym: PC.ymAdd(PC.ymOf(new Date()), 1), partner: 'ALL', rows: [], selected: new Set(), search: '', page: 1, size: 10, hidden: new Set(), generated: false, period: null, busy: false };
$('pcPartner').innerHTML = '<option value="">Select Logistics Partner</option><option value="ALL">All Logistics Partners</option>'
  + PS.src.partners().map(p => `<option value="${p}">${p} - ${esc(prName(p))}</option>`).join('');
const PC_COLS = [['seq', 'PR Sequence'], ['mileage', 'Mileage Cost'], ['fixed', 'Fixed Cost'], ['wd', 'Working Days'], ['perday', 'Delivery Cost'], ['monthly', 'Monthly Delivery Cost'], ['amount', 'PR Amount'], ['status', 'Status']];
$('pcColMenu').innerHTML = PC_COLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" checked> ${l}</label>`).join('');
$('pcColMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? pcs.hidden.delete(k) : pcs.hidden.add(k); prcRender(); });

const authorized = () => PC.canCreate(state.actor, PS.PR_CREATORS);
function pcErrors(e) {
  document.querySelectorAll('#pcForm .f').forEach(f => { f.classList.remove('err'); f.querySelector('.msg')?.remove(); });
  Object.entries(e).forEach(([k, msg]) => { const f = document.querySelector(`#pcForm [data-f="${k}"]`); if (f) { f.classList.add('err'); f.insertAdjacentHTML('beforeend', `<div class="msg">${esc(msg)}</div>`); } });
}
function readForm() { return { type: $('pcType').value, ym: $('pcMonth').value, partner: $('pcPartner').value }; }
function setForm() { $('pcType').value = pcs.type; $('pcMonth').value = pcs.ym; $('pcPartner').value = pcs.partner; }

// ---------- Generate Route Plan ----------
function calculateRows() {
  const partners = pcs.partner === 'ALL' ? PS.src.partners() : [pcs.partner];
  pcs.period = PC.periodCheck(pcs.ym, new Date(), PS.SYSTEM_MASTER.prAllowCurrentMonth);
  pcs.rows = partners.map(p => { const row = PC.calculate(p, pcs.ym, PS.src); return { row, prep: PC.prepare(pcs.type, row, PRS, M.prStatus) }; });
  defaultSelection();
  pcs.generated = true;
}
// Ready rows are selected by default for a user who may create PR
function defaultSelection() {
  pcs.actorId = state.actor.userId;
  pcs.selected = new Set(pcs.rows.filter(r => r.prep.ok && !r.created && pcs.period?.ok && authorized()).map(r => r.row.partner));
}
function busy(on, text, btn) {
  pcs.busy = on;
  $('pcLoading').classList.toggle('show', on); $('pcTableBox').style.display = on ? 'none' : '';
  $('pcLoadingText').textContent = text || '';
  ['pcGenerate', 'pcCreate', 'pcCancel'].forEach(id => { $(id).disabled = on; });
  if (btn) $(btn).classList.toggle('busy', on);
}
function generate() {
  const f = readForm(), e = PC.validateHeader(f);
  pcErrors(e);
  if (Object.keys(e).length) { toast(Object.values(e)[0]); return; }
  Object.assign(pcs, f, { page: 1 });
  busy(true, 'Calculating route plan (Route Percentage x TMMIN Calendar x E-Catalogue)...', 'pcGenerate');
  setTimeout(() => { calculateRows(); busy(false, '', 'pcGenerate'); prcRender(); toast(`Route plan ${monthName(pcs.ym)} calculated for ${pcs.rows.length} logistics partner(s)`); }, 500);
}
$('pcGenerate').addEventListener('click', generate);
['pcType', 'pcMonth', 'pcPartner'].forEach(id => $(id).addEventListener('change', () => { pcs.generated = false; pcErrors({}); prcRender(); }));
$('pcCancel').addEventListener('click', () => {
  Object.assign(pcs, { type: '', ym: '', partner: '', rows: [], selected: new Set(), generated: false, search: '' });
  $('pcSearch').value = ''; setForm(); pcErrors({}); prcRender(); toast('PR Creation dikosongkan');
});

// ---------- List Summary ----------
const statusCell = r => {
  if (r.created) return `<span class="st new">Created ${esc(r.created)}</span>`;
  if (r.prep.ok) return `<span class="st ready">Ready: ${r.prep.type === 'FIX' ? 'Monthly Cost' : `${r.prep.lines.length} route(s)${r.prep.skipped ? `, ${r.prep.skipped} already in earlier sequence` : ''}`}</span>`;
  return `<span class="st ${/already included/.test(r.prep.error) ? 'done' : 'bad'}" title="${esc(r.prep.error)}">${esc(r.prep.error)}</span>`;
};
function pcFiltered() {
  const q = pcs.search.trim().toLowerCase();
  return pcs.rows.filter(r => !q || `${r.row.partner} ${prName(r.row.partner)}`.toLowerCase().includes(q));
}
function prcRender() {
  if (pcs.generated && pcs.actorId !== state.actor.userId) defaultSelection();   // "Login sebagai" changed
  const a = state.actor, auth = authorized();
  // Header chips: creation period, calendar, route percentage, System Master parameter
  const sm = PS.SYSTEM_MASTER.prAllowCurrentMonth;
  const per = pcs.ym ? PC.periodCheck(pcs.ym, new Date(), sm) : null, wd = pcs.ym ? PS.src.workingDays(pcs.ym) : null, rpt = PS.src.routePercentageTotal();
  $('pcChips').innerHTML = [
    per ? `<span class="chip ${per.ok ? 'ok' : 'bad'}">Creation period: ${per.ok ? (per.rule === 'N-1' ? `Month N-1 (created ${monthName(PC.ymOf(new Date()))} for ${monthName(pcs.ym)})` : 'Month N (allowed by System Master)') : 'not allowed'}</span>` : '',
    pcs.ym ? `<span class="chip ${wd == null ? 'bad' : ''}">TMMIN Calendar ${monthName(pcs.ym)}: ${wd == null ? 'not available' : `${wd} working days`}</span>` : '',
    `<span class="chip ${rpt === 100 ? 'ok' : 'warn'}">Route Percentage: ${PS.src.routes().length} active routes, total ${rpt}%${rpt < 100 ? ' (orders split proportionally)' : ''}</span>`,
    `<span class="chip">Total By Resource (Master KPI): ${PS.src.shareTotal()} orders/day</span>`,
    `<span class="chip ${sm === undefined ? 'warn' : ''}">System Master - PR in Month N:
      <select id="pcParam" aria-label="System Master parameter"><option value="" ${sm === undefined ? 'selected' : ''}>Not configured</option><option value="Y" ${sm === true ? 'selected' : ''}>Allowed</option><option value="N" ${sm === false ? 'selected' : ''}>Not allowed</option></select></span>`,
  ].join('');
  const alerts = [];
  if (!auth) alerts.push(`<div class="pc-alert info">Login as <b>${esc(M.roleLabel(a))}</b>: view only. PR Creation is available to VPLD Staff and VPLD Section Head (change "Login sebagai").</div>`);
  if (pcs.generated && !pcs.period.ok) alerts.push(`<div class="pc-alert bad">${esc(pcs.period.error)}</div>`);
  $('pcAlert').innerHTML = alerts.join('');
  $('pcCreate').disabled = pcs.busy || !auth || !pcs.generated || !pcs.period?.ok || !pcs.selected.size;
  $('pcCreate').title = !auth ? PC.MSG.noAuth : !pcs.generated ? 'Generate the route plan first' : !pcs.period?.ok ? pcs.period.error : !pcs.selected.size ? 'Select at least one logistics partner' : '';
  // PR sequence info
  const one = pcs.generated && pcs.partner !== 'ALL' ? pcs.rows[0] : null;
  $('pcSeq').textContent = !pcs.generated ? 'Generate the route plan to see the sequence'
    : one ? `Sequence ${one.prep.seq}${one.prep.seq > 1 ? ` - additional PR to ${one.prep.parent}` : ' - initial PR'}` : 'Per logistics partner (see table)';
  $('pcListTitle').textContent = pcs.generated ? `List Summary - ${PC.TYPE_LABEL[pcs.type]} - ${monthName(pcs.ym)}` : 'List Summary';

  const rows = pcFiltered(), pages = Math.max(1, Math.ceil(rows.length / pcs.size));
  pcs.page = Math.min(pcs.page, pages);
  const start = (pcs.page - 1) * pcs.size, view = rows.slice(start, start + pcs.size);
  const h = k => pcs.hidden.has(k) ? ' hidden-col' : '';
  const canSel = r => auth && pcs.period?.ok && r.prep.ok && !r.created;
  const selectable = view.filter(canSel);
  $('pcThead').innerHTML = `<tr><th class="chk"><input type="checkbox" id="pcAll" ${selectable.length ? '' : 'disabled'} ${selectable.length && selectable.every(r => pcs.selected.has(r.row.partner)) ? 'checked' : ''} aria-label="Select all"></th>
    <th>No.</th><th style="min-width:200px">Trucking Company</th><th class="${h('seq')}">PR<br>Sequence</th><th class="${h('mileage')}">Mileage Cost<br>(IDR/Km)</th><th class="${h('fixed')}">Fixed Cost<br>(IDR/Month)</th>
    <th class="${h('wd')}">Working Days<br>(Days)</th><th class="${h('perday')}">Delivery Cost<br>(IDR/Day)</th><th class="${h('monthly')}">Monthly Delivery Cost<br>(IDR)</th>
    <th class="${h('amount')}">PR Amount<br>(IDR)</th><th class="${h('status')}">Status</th><th>Detail</th></tr>`;
  $('pcTbody').innerHTML = !pcs.generated ? `<tr><td colspan="12" class="empty">Select PR Creation Type, Operational Month and Logistics Partner, then click <b>Generate Route Plan</b>.</td></tr>`
    : view.length ? view.map((r, i) => {
      const x = r.row, sel = pcs.selected.has(x.partner) && canSel(r);
      return `<tr class="${sel ? 'sel' : ''}"><td class="chk"><input type="checkbox" data-pc="${x.partner}" ${canSel(r) ? '' : 'disabled'} ${sel ? 'checked' : ''} aria-label="Select ${x.partner}"></td>
        <td>${start + i + 1}</td><td class="left">${x.partner} - ${esc(prName(x.partner))}</td>
        <td class="seq${h('seq')}">${r.prep.seq}<small>${r.prep.seq > 1 ? `adds to ${esc(r.prep.parent)}` : 'initial'}</small></td>
        <td class="num${h('mileage')}" title="${esc(x.errors.km || '')}">${idr(x.mileage)}</td><td class="num${h('fixed')}" title="${esc(x.errors.fix || '')}">${idr(x.fixed)}</td>
        <td class="${h('wd')}">${x.workingDays ?? '-'}</td><td class="num${h('perday')}">${idr(x.perDay)}</td><td class="num${h('monthly')}">${idr(x.monthlyTotal)}</td>
        <td class="num${h('amount')}"><b>${r.prep.ok ? idr(r.prep.amount) : '-'}</b></td><td class="${h('status')}">${statusCell(r)}</td>
        <td><button class="pc-detail" data-detail="${x.partner}">&#128196; Detail</button></td></tr>`;
    }).join('') : '<tr><td colspan="12" class="empty">No Data Found</td></tr>';
  const sum = f => rows.reduce((s, r) => s + (f(r) || 0), 0);
  $('pcTfoot').innerHTML = pcs.generated && rows.length ? `<tr><td></td><td colspan="2" class="left">Total</td><td class="${h('seq')}"></td><td class="${h('mileage')}">-</td>
    <td class="num${h('fixed')}">${idr(sum(r => r.row.fixed))}</td><td class="${h('wd')}">-</td><td class="${h('perday')}">-</td><td class="num${h('monthly')}">${idr(sum(r => r.row.monthlyTotal))}</td>
    <td class="num${h('amount')}">${idr(sum(r => r.prep.ok && !r.created ? r.prep.amount : 0))}</td><td class="${h('status')}"></td><td></td></tr>` : '';
  const selTotal = pcs.rows.filter(r => pcs.selected.has(r.row.partner) && canSel(r)).reduce((s, r) => s + r.prep.amount, 0);
  $('pcSelTotal').textContent = `Total PR Cost (selected ${[...pcs.selected].filter(p => pcs.rows.some(r => r.row.partner === p && canSel(r))).length}): IDR ${num(selTotal)}`;
  $('pcInfo').textContent = pcs.generated ? `Showing ${rows.length ? start + 1 : 0} to ${start + view.length} of ${rows.length} records` : '';
  $('pcPager').innerHTML = pcs.generated ? pagerHtml(pcs.page, pages) : '';
}
window.prcRender = prcRender;

$('pcChips').addEventListener('change', e => {
  if (e.target.id !== 'pcParam') return;
  PS.SYSTEM_MASTER.prAllowCurrentMonth = e.target.value === 'Y' ? true : e.target.value === 'N' ? false : undefined;
  if (pcs.generated) calculateRows();
  prcRender(); toast('System Master parameter changed (mock-up)');
});
$('pcSearch').addEventListener('input', e => { pcs.search = e.target.value; pcs.page = 1; prcRender(); });
$('pcPager').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { pcs.page = +b.dataset.p; prcRender(); } });
$('pcThead').addEventListener('change', e => {
  if (e.target.id !== 'pcAll') return;
  pcFiltered().slice((pcs.page - 1) * pcs.size, pcs.page * pcs.size).filter(r => r.prep.ok && !r.created)
    .forEach(r => e.target.checked ? pcs.selected.add(r.row.partner) : pcs.selected.delete(r.row.partner));
  prcRender();
});
$('pcTbody').addEventListener('change', e => { const c = e.target.closest('[data-pc]'); if (!c) return; c.checked ? pcs.selected.add(c.dataset.pc) : pcs.selected.delete(c.dataset.pc); prcRender(); });
$('pcTbody').addEventListener('click', e => { const b = e.target.closest('[data-detail]'); if (b) openPcDetail(b.dataset.detail); });

// ---------- Detail pop-up ----------
let pcmItem = null;
function openPcDetail(partner) {
  const r = pcs.rows.find(x => x.row.partner === partner); if (!r) return;
  pcmItem = r;
  const x = r.row, prep = r.prep, isFix = pcs.type === 'FIX';
  const used = PC.usedComponents(PRS, partner, x.ym, M.prStatus);
  $('pcmTitle').textContent = `PR Detail - ${partner} - ${prName(partner)}`;
  $('pcmInfo').innerHTML = [['Logistics Partner', `${partner} - ${esc(prName(partner))}`], ['Operational Month', monthName(x.ym)],
    ['PR Sequence', `${prep.seq}${prep.seq > 1 ? ` (additional to ${prep.parent})` : ' (initial PR)'}`], ['PR Creation Type', PC.TYPE_LABEL[pcs.type]],
    ['Working Days (TMMIN Calendar)', x.workingDays ?? 'not available'], ['Order Sharing (daily QTY)', x.dailyOrders ?? 'not in Master KPI'],
    ['Mileage Cost (E-Catalogue)', x.mileage == null ? 'not available' : `IDR ${num(x.mileage)} / Km`], ['Fixed Cost (E-Catalogue)', x.fixed == null ? 'not available' : `IDR ${num(x.fixed)} / month`]]
    .map(([k, v]) => `<div><b>${k}</b>${v}</div>`).join('');
  if (isFix) {
    const inPr = used.get(PC.FIX_COMPONENT);
    $('pcmTable').innerHTML = `<thead><tr><th>Cost Component</th><th>Source</th><th>Basis</th><th>Status</th><th>Amount (IDR)</th></tr></thead>
      <tbody><tr class="${inPr ? 'used' : ''}"><td class="left"><b>Monthly Cost</b><span>Paid once per month; proceeds to SA after PO</span></td><td>E-Catalogue</td><td>per month</td><td>${inPr ? `In ${inPr}` : 'New'}</td><td class="num">${idr(x.fixed)}</td></tr>
      <tr><td class="left"><b>Mileage Cost</b><span>Base price for distance; amount comes from the route-based PR</span></td><td>E-Catalogue</td><td>per Km</td><td>Reference</td><td class="num">${x.mileage == null ? '-' : `${num(x.mileage)} / Km`}</td></tr></tbody>
      <tfoot><tr><td colspan="4" style="text-align:right">Total Cost</td><td class="num">${prep.ok ? idr(prep.amount) : '-'}</td></tr></tfoot>`;
  } else {
    $('pcmTable').innerHTML = `<thead><tr><th style="min-width:250px">Route</th><th>Route<br>Percentage</th><th>Number of<br>Orders</th><th>Working<br>Days</th><th>Distance<br>(Km)</th><th>Planned Cost<br>(IDR)</th><th>PR</th></tr></thead>
      <tbody>${x.lines.length ? x.lines.map(l => { const inPr = used.get(PC.routeComponent(l.code)); return `<tr class="${inPr ? 'used' : ''}"><td class="left"><b>${l.code}</b><span>${esc(l.description)}</span></td>
        <td>${l.percentage}%</td><td>${num(l.orders)}</td><td>${x.workingDays}</td><td>${num(l.distance)}</td><td class="num">${num(l.cost)}</td><td>${inPr ? `In ${inPr}` : l.orders ? 'New' : 'No order'}</td></tr>`; }).join('')
        : `<tr><td colspan="7" class="empty">${esc(prep.error || 'No route plan')}</td></tr>`}</tbody>
      <tfoot><tr><td style="text-align:right">Total (this PR)</td><td>${PS.src.routePercentageTotal()}%</td><td>${prep.ok ? num(prep.qty) : '-'}</td><td>${x.workingDays ?? '-'}</td><td></td><td class="num">${prep.ok ? idr(prep.amount) : '-'}</td><td></td></tr></tfoot>`;
  }
  const can = authorized() && pcs.period?.ok && prep.ok && !r.created;
  $('pcmNote').textContent = r.created ? `PR ${r.created} has been created.` : !prep.ok ? prep.error : !authorized() ? PC.MSG.noAuth : !pcs.period?.ok ? pcs.period.error
    : isFix ? 'Monthly Cost goes directly to SA (Service Acceptance) after PO.' : `Monthly PR = Order Sharing ${x.dailyOrders}/day x ${x.workingDays} working days, split by Route Percentage; cost = orders x Km x IDR ${num(x.mileage)}/Km.`;
  $('pcmConfirm').disabled = !can;
  $('pcOverlay').classList.add('show');
}
const closePcm = () => $('pcOverlay').classList.remove('show');
$('pcmClose').addEventListener('click', closePcm);
$('pcmCancel').addEventListener('click', closePcm);
$('pcOverlay').addEventListener('click', e => { if (e.target === $('pcOverlay')) closePcm(); });
$('pcmConfirm').addEventListener('click', () => { if (!pcmItem) return; closePcm(); confirmCreate([pcmItem]); });

// ---------- Create PR (confirmation, loading, result) ----------
function approvalPath() {
  const { skipped } = PC.initialApproval(state.actor, M, new Date());
  const rest = M.LEVELS.filter(l => !skipped.includes(l));
  return `${rest.join(' → ')}${skipped.length ? ` (${skipped.join(', ')} skipped: created by ${state.actor.level})` : ''}`;
}
$('pcCreate').addEventListener('click', () => {
  if (!authorized()) { toast(PC.MSG.noAuth); return; }
  const list = pcs.rows.filter(r => pcs.selected.has(r.row.partner) && r.prep.ok && !r.created);
  if (!list.length) { toast('Select at least one logistics partner with status Ready'); return; }
  confirmCreate(list);
});
function confirmCreate(list) {
  const total = list.reduce((s, r) => s + r.prep.amount, 0);
  showPreview(`Create PR - ${PC.TYPE_LABEL[pcs.type]}`, `<p style="margin:0 0 8px;font-size:11px">Operational Month <b>${monthName(pcs.ym)}</b> · ${list.length} PR will be created:</p>
    <div class="apv-list">${list.map(r => `<div>${r.row.partner} · Sequence ${r.prep.seq}${r.prep.seq > 1 ? ` (adds to ${esc(r.prep.parent)})` : ''} · ${pcs.type === 'FIX' ? 'Monthly Cost' : `${r.prep.lines.length} route(s), ${num(r.prep.qty)} orders`} · IDR ${num(r.prep.amount)}</div>`).join('')}</div>
    <p style="font-size:11px;margin:0 0 4px">Total PR Cost: <b>IDR ${num(total)}</b></p>
    <p style="font-size:11px;margin:0">Approval: <b>${approvalPath()}</b>. Current PIC: ${esc(state.actor.userId)}.</p>`,
    `<button class="btn-outline" id="pcNo">Batal</button><button class="btn-green" style="height:30px" id="pcYes">Create PR</button>`);
  $('pcNo').onclick = closePreview;
  $('pcYes').onclick = () => {
    closePreview(); busy(true, 'Submitting PR...', 'pcCreate');
    setTimeout(() => {
      // recalculate right before saving so the latest sequences and components are used
      const items = list.map(r => ({ type: pcs.type, row: PC.calculate(r.row.partner, pcs.ym, PS.src) }));
      const res = PC.createPRs(items, { prs: PRS, actor: state.actor, at: new Date(), wf: M, prNo: nextPrNo, name: prName, shareTotal: PS.src.shareTotal() });
      calculateRows();
      res.done.forEach(pr => { const r = pcs.rows.find(x => x.row.partner === pr.supplierCode); if (r) r.created = `${pr.prNo} (${M.prStatus(pr)})`; });
      pcs.selected.clear(); busy(false, '', 'pcCreate'); prcRender();
      if (res.done.length) toast(`${PC.MSG.created(res.done.length, res.done.map(p => p.prNo).join(', '))} Status: ${M.prStatus(res.done[0])}.`);
      if (res.fails.length) showPreview('PR not created', `<div class="form-alert">${res.fails.map(f => `${f.partner}: ${esc(f.error)}`).join('<br>')}</div>`, '<button class="btn-outline" id="pcFailOk">Close</button>');
      if (res.fails.length) $('pcFailOk').onclick = closePreview;
    }, 600);
  };
}

// ---------- Export ----------
$('pcExportMenu').addEventListener('click', e => {
  const b = e.target.closest('[data-x]'); if (!b) return;
  if (!pcs.generated) { toast('Generate the route plan first'); return; }
  const x = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const cell = v => typeof v === 'number' ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>` : `<Cell><Data ss:Type="String">${x(v)}</Data></Cell>`;
  const head = h => `<Row>${h.map(v => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(v)}</Data></Cell>`).join('')}</Row>`;
  let rows;
  if (b.dataset.x === 'summary') {
    rows = head(['No.', 'Trucking Company', 'PR Sequence', 'Mileage Cost (IDR/Km)', 'Fixed Cost (IDR/Month)', 'Working Days', 'Delivery Cost (IDR/Day)', 'Monthly Delivery Cost (IDR)', 'PR Amount (IDR)', 'Status'])
      + pcFiltered().map((r, i) => `<Row>${[i + 1, `${r.row.partner} - ${prName(r.row.partner)}`, r.prep.seq, r.row.mileage ?? '-', r.row.fixed ?? '-', r.row.workingDays ?? '-', r.row.perDay ?? '-', r.row.monthlyTotal ?? '-',
        r.prep.ok ? r.prep.amount : '-', r.created ? `Created ${r.created}` : r.prep.ok ? 'Ready' : r.prep.error].map(cell).join('')}</Row>`).join('');
  } else {
    rows = head(['Trucking Company', 'Operational Month', 'Route', 'Description', 'Route Percentage', 'Number of Orders', 'Working Days', 'Distance (Km)', 'Mileage Cost (IDR/Km)', 'Planned Cost (IDR)'])
      + pcFiltered().flatMap(r => r.row.lines.map(l => `<Row>${[r.row.partner, pcs.ym, l.code, l.description, l.percentage, l.orders, r.row.workingDays, l.distance, l.priceKm, l.cost].map(cell).join('')}</Row>`)).join('');
  }
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#DFE4EC" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="PR Creation"><Table>${rows}</Table></Worksheet></Workbook>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
  a.download = `PR_Creation_${b.dataset.x === 'summary' ? 'Summary' : 'Route_Plan'}_${pcs.ym.replace('-', '')}.xls`;
  a.click(); URL.revokeObjectURL(a.href);
  document.querySelectorAll('.dd').forEach(d => d.classList.remove('open'));
  toast(`${a.download} di-export`);
});

setForm(); calculateRows();
if (state.view === 'pr-creation') render();
