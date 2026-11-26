// ELIPS PR Creation (Monthly) mock-up UI: List Summary of all trucking companies, route detail pop-up and Submit PR as one bundle.
// Uses monthly.js (PRS, state, SEQ, helpers), the PR workflow (monthly-workflow.js) and the rules in pr-creation-rules.js.
// Revision 26-Nov-26 (user review): Operational Month only; [Create PR] calculates, [Submit PR] sends the bundle to approval.
const PC = window.PrCreation, PS = window.PrSources;
const idr = n => n == null ? '-' : num(n);
const monthName = ym => { const [y, m] = ym.split('-'); return `${MONTHS[+m - 1][0]}${MONTHS[+m - 1].slice(1).toLowerCase()} ${y}`; };
const prName = code => SUP[code] || code;
const nextPrNo = (code, ym) => { const [y, m] = ym.split('-'); SEQ[ym] = SEQ[ym] || 1000; return `${code}${y.slice(2)}${m}${SEQ[ym]++}`; };
const allRows = (ym, s = PS.src) => s.partners().map(p => PC.calculate(p, ym, s));

// ---------- Existing December bundle: sequence 1 rejected by DpH, so the next Submit PR is sequence 2 ----------
(() => {
  const ym = '2026-12', at = new Date(2026, 9, 28, 10, 0);
  const res = PC.submitBundle(allRows(ym), { prs: PRS, wf: M, prNo: nextPrNo, name: prName, shareTotal: PS.src.shareTotal(), actor: STAFF, at });
  if (!res.ok) return;
  M.approveBundle(res.done[0], approver('SH'), new Date(at.getTime() + 2 * HOUR), CTX);
  M.rejectBundle(res.done[0], approver('DpH'), 'Route percentage belum sesuai rencana operasional terbaru', new Date(at.getTime() + 20 * HOUR), CTX);
})();

// ---------- Screen state ----------
const pcs = { ym: PC.ymAdd(PC.ymOf(new Date()), 1), plan: null, search: '', page: 1, size: 10, hidden: new Set(), generated: false, period: null, busy: false };
const PC_COLS = [['mileage', 'Mileage Cost'], ['fixed', 'Fixed Cost'], ['wd', 'Working Days'], ['perday', 'Delivery Cost'], ['monthly', 'Monthly Delivery Cost'], ['status', 'Status']];
$('pcColMenu').innerHTML = PC_COLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" checked> ${l}</label>`).join('');
$('pcColMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? pcs.hidden.delete(k) : pcs.hidden.add(k); prcRender(); });

const authorized = () => PC.canCreate(state.actor, PS.PR_CREATORS);
function pcErrors(e) {
  document.querySelectorAll('#pcForm .f').forEach(f => { f.classList.remove('err'); f.querySelector('.msg')?.remove(); });
  Object.entries(e).forEach(([k, msg]) => { const f = document.querySelector(`#pcForm [data-f="${k}"]`); if (f) { f.classList.add('err'); f.insertAdjacentHTML('beforeend', `<div class="msg">${esc(msg)}</div>`); } });
}

// ---------- Create PR (calculate the bundle) ----------
function calculateRows() {
  // PC-03: the System Master parameter is read in the background (not on the screen)
  pcs.period = PC.periodCheck(pcs.ym, new Date(), PS.SYSTEM_MASTER.prAllowCurrentMonth);
  pcs.plan = PC.planBundle(allRows(pcs.ym), PRS, M.prStatus);
  pcs.generated = true;
}
function busy(on, text, btn) {
  pcs.busy = on;
  $('pcLoading').classList.toggle('show', on); $('pcTableBox').style.display = on ? 'none' : '';
  $('pcLoadingText').textContent = text || '';
  ['pcGenerate', 'pcCreate', 'pcCancel'].forEach(id => { $(id).disabled = on; });
  if (btn) $(btn).classList.toggle('busy', on);
}
function generate() {
  const ym = $('pcMonth').value, e = PC.validateHeader({ ym });
  pcErrors(e);
  if (Object.keys(e).length) { toast(e.ym); return; }
  Object.assign(pcs, { ym, page: 1 });
  busy(true, 'Calculating PR (Route Percentage x E-Catalogue x TMMIN Calendar)...', 'pcGenerate');
  setTimeout(() => { calculateRows(); busy(false, '', 'pcGenerate'); prcRender(); toast(`PR ${monthName(pcs.ym)} calculated for ${pcs.plan.items.length} trucking company(ies)`); }, 500);
}
$('pcGenerate').addEventListener('click', generate);
$('pcMonth').addEventListener('change', () => { pcs.generated = false; pcErrors({}); prcRender(); });
$('pcCancel').addEventListener('click', () => {
  Object.assign(pcs, { ym: '', plan: null, generated: false, search: '' });
  $('pcSearch').value = ''; $('pcMonth').value = ''; pcErrors({}); prcRender(); toast('PR Creation dikosongkan');
});

// ---------- List Summary ----------
// Status shows only an abnormality of the detail (red); grey when all routes are already in an active PR (OP-2); otherwise empty
const statusCell = i => i.prep.abnormal ? `<span class="st bad" title="${esc(i.prep.error)}">${esc(i.prep.error)}</span>`
  : i.prep.included ? `<span class="st done" title="${esc(i.prep.error)}">Already in PR ${esc(i.prep.error.replace(/.*included in PR /, '').replace(/\.$/, ''))}</span>` : '';
function pcFiltered() {
  const q = pcs.search.trim().toLowerCase();
  return (pcs.plan?.items || []).filter(i => !q || `${i.row.partner} ${prName(i.row.partner)}`.toLowerCase().includes(q));
}
function submitBlock() {
  return !authorized() ? PC.MSG.noAuth : !pcs.generated ? 'Click Create PR first.' : !pcs.period?.ok ? pcs.period.error : pcs.plan.error;
}
function prcRender() {
  const a = state.actor, auth = authorized(), plan = pcs.plan;
  const wd = pcs.ym ? PS.src.workingDays(pcs.ym) : null, rpt = PS.src.routePercentageTotal();
  const per = pcs.ym ? PC.periodCheck(pcs.ym, new Date(), PS.SYSTEM_MASTER.prAllowCurrentMonth) : null;
  $('pcChips').innerHTML = [
    per ? `<span class="chip ${per.ok ? 'ok' : 'bad'}">Creation period: ${per.ok ? (per.rule === 'N-1' ? `Month N-1 (created ${monthName(PC.ymOf(new Date()))} for ${monthName(pcs.ym)})` : 'Month N (allowed by System Master)') : 'not allowed'}</span>` : '',
    pcs.ym ? `<span class="chip ${wd == null ? 'bad' : ''}">TMMIN Calendar ${monthName(pcs.ym)}: ${wd == null ? 'not available' : `${wd} working days`}</span>` : '',
    `<span class="chip ${rpt === 100 ? 'ok' : 'warn'}">Route Percentage: ${PS.src.routes().length} active routes, total ${rpt}%${rpt < 100 ? ' (orders split proportionally)' : ''}</span>`,
    `<span class="chip">Total By Resource (Master KPI): ${PS.src.shareTotal()} orders/day</span>`,
  ].join('');
  const alerts = [];
  if (!auth) alerts.push(`<div class="pc-alert info">Login as <b>${esc(M.roleLabel(a))}</b>: view only. PR Creation is available to VPLD Staff and VPLD Section Head (change "Login sebagai").</div>`);
  if (pcs.generated && !pcs.period.ok) alerts.push(`<div class="pc-alert bad">${esc(pcs.period.error)}</div>`);
  else if (pcs.generated && plan.abnormal.length) alerts.push(`<div class="pc-alert bad">${esc(plan.error)}</div>`);
  $('pcAlert').innerHTML = alerts.join('');
  const block = submitBlock();
  $('pcCreate').disabled = pcs.busy || !!block;
  $('pcCreate').title = block || '';
  // PR Sequence: one number for the whole bundle of the operational month (PC-07)
  $('pcSeq').textContent = !pcs.generated ? 'Click Create PR to see the sequence'
    : `Sequence ${plan.seq}${plan.seq > 1 ? ' - additional bundle' : ' - initial bundle'} (all trucking companies)`;
  $('pcListTitle').textContent = pcs.generated ? `List Summary - ${monthName(pcs.ym)} - PR Sequence ${plan.seq}` : 'List Summary';

  const rows = pcFiltered(), pages = Math.max(1, Math.ceil(rows.length / pcs.size));
  pcs.page = Math.min(pcs.page, pages);
  const start = (pcs.page - 1) * pcs.size, view = rows.slice(start, start + pcs.size);
  const h = k => pcs.hidden.has(k) ? ' hidden-col' : '';
  $('pcThead').innerHTML = `<tr><th>No.</th><th style="min-width:200px">Trucking Company</th><th class="${h('mileage')}">Mileage Cost<br>(IDR/Km)</th><th class="${h('fixed')}">Fixed Cost<br>(IDR/Month)</th>
    <th class="${h('wd')}">Working Days<br>(Days)</th><th class="${h('perday')}">Delivery Cost<br>(IDR/Day)</th><th class="${h('monthly')}">Monthly Delivery Cost<br>(IDR)</th>
    <th class="${h('status')}">Status</th><th>Detail</th></tr>`;
  $('pcTbody').innerHTML = !pcs.generated ? `<tr><td colspan="9" class="empty">Select the Operational Month, then click <b>Create PR</b>.</td></tr>`
    : view.length ? view.map((i, k) => {
      const x = i.row;
      return `<tr><td>${start + k + 1}</td><td class="left">${x.partner} - ${esc(prName(x.partner))}</td>
        <td class="num${h('mileage')}" title="${esc(x.errors.km || '')}">${idr(x.mileage)}</td><td class="num${h('fixed')}" title="${esc(x.fixedNote || '')}">${idr(x.fixed)}</td>
        <td class="${h('wd')}">${x.workingDays ?? '-'}</td><td class="num${h('perday')}">${idr(x.perDay)}</td><td class="num${h('monthly')}"><b>${idr(x.monthlyTotal)}</b></td>
        <td class="${h('status')}">${statusCell(i)}</td>
        <td><button class="pc-detail" data-detail="${x.partner}">&#128196; Detail</button></td></tr>`;
    }).join('') : '<tr><td colspan="9" class="empty">No Data Found</td></tr>';
  const sum = f => rows.reduce((s, i) => s + (f(i) || 0), 0);
  $('pcTfoot').innerHTML = pcs.generated && rows.length ? `<tr><td colspan="2" class="left">Total</td><td class="${h('mileage')}">-</td>
    <td class="num${h('fixed')}">${idr(sum(i => i.row.fixed))}</td><td class="${h('wd')}">-</td><td class="num${h('perday')}">${idr(sum(i => i.row.perDay))}</td>
    <td class="num${h('monthly')}">${idr(sum(i => i.row.monthlyTotal))}</td><td class="${h('status')}"></td><td></td></tr>` : '';
  $('pcSelTotal').textContent = pcs.generated ? `Total PR Cost (bundle, ${plan.members.length} trucking companies): IDR ${num(plan.total)}` : 'Total PR Cost (bundle): IDR 0';
  $('pcInfo').textContent = pcs.generated ? `Showing ${rows.length ? start + 1 : 0} to ${start + view.length} of ${rows.length} records` : '';
  $('pcPager').innerHTML = pcs.generated ? pagerHtml(pcs.page, pages) : '';
}
window.prcRender = prcRender;

$('pcSearch').addEventListener('input', e => { pcs.search = e.target.value; pcs.page = 1; prcRender(); });
$('pcPager').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { pcs.page = +b.dataset.p; prcRender(); } });
$('pcTbody').addEventListener('click', e => { const b = e.target.closest('[data-detail]'); if (b) openPcDetail(b.dataset.detail); });

// ---------- Detail pop-up (read only; Master Route Percentage) ----------
function openPcDetail(partner) {
  const i = pcs.plan?.items.find(x => x.row.partner === partner); if (!i) return;
  const x = i.row;
  $('pcmTitle').textContent = `PR Detail - ${partner} - ${prName(partner)}`;
  // Revision 26-Nov-26 (user review 2): Route Percentage and Number of Orders are not shown; Total Cost is still Σ Planned Cost x orders per day (5.3)
  $('pcmTable').innerHTML = `<thead><tr><th style="min-width:300px">Route</th><th>Distance<br>(Km)</th><th>Planned Cost<br>(IDR)</th></tr></thead>
    <tbody>${x.lines.length ? x.lines.map(l => `<tr><td class="left"><b>${l.code}</b><span>${esc(l.description)}</span></td>
      <td>${num(l.distance)}</td><td class="num">${num(l.planned)}</td></tr>`).join('')
      : `<tr><td colspan="3" class="empty">${esc(i.prep.error || 'No route data')}</td></tr>`}</tbody>
    <tfoot><tr><td style="text-align:right" title="Delivery Cost (IDR/Day) of the List Summary">Total Cost (IDR/Day)</td><td></td><td class="num">${idr(x.perDay)}</td></tr></tfoot>`;
  $('pcOverlay').classList.add('show');
}
const closePcm = () => $('pcOverlay').classList.remove('show');
$('pcmClose').addEventListener('click', closePcm);
$('pcOverlay').addEventListener('click', e => { if (e.target === $('pcOverlay')) closePcm(); });

// ---------- Submit PR (bundle confirmation, loading, result) ----------
function approvalPath() {
  const { skipped } = PC.initialApproval(state.actor, M, new Date());
  const rest = M.LEVELS.filter(l => !skipped.includes(l));
  return `${rest.join(' → ')}${skipped.length ? ` (${skipped.join(', ')} skipped: submitted by ${state.actor.level})` : ''}`;
}
$('pcCreate').addEventListener('click', () => {
  const block = submitBlock();
  if (block) { toast(block); return; }
  const plan = pcs.plan;
  showPreview(`Submit PR - ${monthName(pcs.ym)} - PR Sequence ${plan.seq}`, `<p style="margin:0 0 8px;font-size:11px">One bundle of <b>${plan.members.length} PR</b> (one per trucking company) is sent to approval and approved / rejected together:</p>
    <div class="apv-list">${plan.members.map(i => `<div>${i.row.partner} · ${i.prep.lines.length} route(s)${i.prep.skipped ? ` (${i.prep.skipped} already in an earlier PR)` : ''} · IDR ${num(i.prep.amount)}</div>`).join('')}</div>
    ${plan.items.length > plan.members.length ? `<p style="font-size:11px;margin:0 0 4px">Not in the bundle (all routes already in an active PR): ${plan.items.filter(i => i.prep.included).map(i => i.row.partner).join(', ')}</p>` : ''}
    <p style="font-size:11px;margin:0 0 4px">Total PR Cost: <b>IDR ${num(plan.total)}</b></p>
    <p style="font-size:11px;margin:0">Approval: <b>${approvalPath()}</b>. Current PIC: ${esc(state.actor.userId)}.</p>`,
    `<button class="btn-outline" id="pcNo">Batal</button><button class="btn-green" style="height:30px" id="pcYes">Submit PR</button>`);
  $('pcNo').onclick = closePreview;
  $('pcYes').onclick = () => {
    closePreview(); busy(true, 'Submitting PR bundle...', 'pcCreate');
    setTimeout(() => {
      // recalculated right before saving; nothing is created when the sequence or any trucking company changed (PC-11, PC-12)
      const res = PC.submitBundle(allRows(pcs.ym), { prs: PRS, actor: state.actor, at: new Date(), wf: M, prNo: nextPrNo, name: prName, shareTotal: PS.src.shareTotal(), expectedSeq: plan.seq });
      calculateRows(); busy(false, '', 'pcCreate'); prcRender();
      if (res.ok) toast(`${res.message} Status: ${M.prStatus(res.done[0])}.`);
      else { showPreview('PR not submitted', `<div class="form-alert">${esc(res.error)}</div>`, '<button class="btn-outline" id="pcFailOk">Close</button>'); $('pcFailOk').onclick = closePreview; }
    }, 600);
  };
});

// ---------- Export ----------
$('pcExportMenu').addEventListener('click', e => {
  const b = e.target.closest('[data-x]'); if (!b) return;
  if (!pcs.generated) { toast('Click Create PR first.'); return; }
  const x = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const cell = v => typeof v === 'number' ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>` : `<Cell><Data ss:Type="String">${x(v)}</Data></Cell>`;
  const head = h => `<Row>${h.map(v => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(v)}</Data></Cell>`).join('')}</Row>`;
  let rows;
  if (b.dataset.x === 'summary') {
    rows = head(['No.', 'Trucking Company', 'PR Sequence', 'Mileage Cost (IDR/Km)', 'Fixed Cost (IDR/Month)', 'Working Days', 'Delivery Cost (IDR/Day)', 'Monthly Delivery Cost (IDR)', 'Status'])
      + pcFiltered().map((i, k) => `<Row>${[k + 1, `${i.row.partner} - ${prName(i.row.partner)}`, pcs.plan.seq, i.row.mileage ?? '-', i.row.fixed ?? '-', i.row.workingDays ?? '-', i.row.perDay ?? '-', i.row.monthlyTotal ?? '-',
        i.prep.abnormal || i.prep.included ? i.prep.error : ''].map(cell).join('')}</Row>`).join('');
  } else {
    rows = head(['Trucking Company', 'Operational Month', 'Route', 'Description', 'Route Percentage', 'Number of Orders (per day)', 'Distance (Km)', 'Mileage Cost (IDR/Km)', 'Planned Cost (IDR)', 'Total Cost (IDR/Day)'])
      + pcFiltered().flatMap(i => i.row.lines.map(l => `<Row>${[i.row.partner, pcs.ym, l.code, l.description, l.percentage, l.orders, l.distance, l.priceKm, l.planned, l.cost].map(cell).join('')}</Row>`)).join('');
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

$('pcMonth').value = pcs.ym; calculateRows();
if (state.view === 'pr-creation') render();
