// Unit tests for PR Creation (calculation, bundle and validation). Run: node tests/pr-creation.test.js
const assert = require('assert');
globalThis.MasterPrice = require('../master-price.js');
globalThis.MasterRoutePercentage = require('../master-route-percentage.js');
require('../pr-sources.js');
const PC = require('../pr-creation-rules.js'), WF = require('../monthly-workflow.js');
const { src, PR_CREATORS } = globalThis.PrSources;
globalThis.PrSources.asOf = '2026-11-01';   // price date of the test data

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok ${n} - ${name}`); };
const staff = { role: 'VPLD_STAFF', userId: 'vpld.staff', division: 'VPLD' };
const sh = { role: 'APPROVER', level: 'SH', userId: 'farid.fadillah', division: 'VPLD' };
const dph = { role: 'APPROVER', level: 'DpH', userId: 'bahauddin', division: 'VPLD' };
const dh = { role: 'APPROVER', level: 'DH', userId: 'dh.vpld', division: 'VPLD' };
const at = new Date(2026, 10, 1, 9, 0);
let run = 1000;
const ctx = (prs, actor, extra = {}) => ({ prs, actor, at, wf: WF, prNo: (p, ym) => `${p}${ym.slice(2, 4)}${ym.slice(5)}${run++}`, name: p => p, shareTotal: src.shareTotal(), ...extra });
const rowsOf = (ym, s = src) => s.partners().map(p => PC.calculate(p, ym, s));
const wctx = prs => ({ master: { poAutoApproveDays: 1 }, pos: [], prs });

test('header: only Operational Month is mandatory (PC-01)', () => {
  assert.deepStrictEqual(PC.validateHeader({}), { ym: PC.MSG.monthReq });
  assert.deepStrictEqual(PC.validateHeader({ ym: '2026-12' }), {});
});

test('authorization: VPLD Staff and VPLD Section Head only (PC-02)', () => {
  assert(PC.canCreate(staff, PR_CREATORS) && PC.canCreate(sh, PR_CREATORS));
  assert(!PC.canCreate(dph, PR_CREATORS));
  assert(!PC.canCreate({ role: 'IELP_ADMIN' }, PR_CREATORS) && !PC.canCreate({ role: 'SUPPLIER' }, PR_CREATORS) && !PC.canCreate({ role: 'GA' }, PR_CREATORS));
});

test('creation period: Month N-1 allowed, Month N per System Master (background), never assumed (PC-03)', () => {
  const today = new Date(2026, 10, 15);
  assert.deepStrictEqual(PC.periodCheck('2026-12', today, undefined), { ok: true, rule: 'N-1' });
  assert.strictEqual(PC.periodCheck('2026-11', today, undefined).error, PC.MSG.paramMissing);
  assert.strictEqual(PC.periodCheck('2026-11', today, false).error, PC.MSG.currentNotAllowed('2026-11'));
  assert.deepStrictEqual(PC.periodCheck('2026-11', today, true), { ok: true, rule: 'N' });
  assert.strictEqual(PC.periodCheck('2026-10', today, true).error, PC.MSG.past('2026-10'));
  assert.strictEqual(PC.periodCheck('2027-01', today, true).error, PC.MSG.tooFar('2027-01', '2026-12'));
});

test('list = all trucking companies paid By Resources; Mileage / Fixed Cost from eCatalogue', () => {
  assert.deepStrictEqual(src.partners(), ['AGR', 'DNX', 'GIB', 'JMP', 'PBM']);
  const r = PC.calculate('DNX', '2026-12', src);
  assert.strictEqual(r.fixed, 28500000); assert.strictEqual(r.mileage, 2700);
});

test('detail: orders per day by Route %, Planned Cost = Distance x Mileage Cost, Total Cost = Planned Cost x Orders', () => {
  const r = PC.calculate('DNX', '2026-12', src), totalPct = src.routes().reduce((s, x) => s + x.percentage, 0);
  assert.strictEqual(r.lines.length, src.routes().length);
  r.lines.forEach(l => {
    assert.strictEqual(l.orders, Math.round(4 * l.percentage / totalPct * 100) / 100);
    assert.strictEqual(l.planned, l.distance * 2700);
    assert.strictEqual(l.cost, Math.round(l.planned * l.orders));
  });
  const dp = r.lines.find(l => l.code === 'DPCMR_CYKRW');   // 15 % of 95 %, 57 Km
  assert.deepStrictEqual([dp.orders, dp.planned, dp.cost], [0.63, 153900, 96957]);
});

test('List Summary: Delivery Cost/Day = sum of Total Cost; Monthly Delivery Cost = Delivery Cost x Working Days', () => {
  const r = PC.calculate('DNX', '2026-12', src);
  assert.strictEqual(r.workingDays, 22);
  assert.strictEqual(r.perDay, r.lines.reduce((s, l) => s + l.cost, 0));
  assert.strictEqual(r.monthlyTotal, r.perDay * 22);
  assert.notStrictEqual(r.monthlyTotal, r.fixed + r.perDay * 22);   // Fixed Cost is not added any more (OP-6)
});

test('abnormality fills the Status: calendar, routes, order sharing, price per KM', () => {
  assert.strictEqual(PC.abnormality(PC.calculate('DNX', '2026-12', src)), null);
  assert.strictEqual(PC.abnormality(PC.calculate('DNX', '2027-02', src)), PC.MSG.noCalendar('2027-02'));
  assert.strictEqual(PC.abnormality(PC.calculate('DNX', '2026-12', { ...src, routes: () => [] })), PC.MSG.noRoutes);
  assert.strictEqual(PC.abnormality(PC.calculate('PNJ', '2026-12', src)), PC.MSG.noSharing('PNJ'));
  assert(PC.abnormality(PC.calculate('DNX', '2027-01', src)).includes('No Price per KM'));   // no eCatalogue price for 202701
  assert.strictEqual(PC.abnormality(PC.calculate('DNX', '2026-12', { ...src, orderSharing: () => 0 })), PC.MSG.noOrders('DNX'));
});

test('bundle plan: one PR Sequence per month for all trucking companies; total = sum of Monthly Delivery Cost', () => {
  const plan = PC.planBundle(rowsOf('2026-12'), [], WF.prStatus);
  assert.strictEqual(plan.seq, 1); assert(plan.canSubmit);
  assert.strictEqual(plan.members.length, 5);
  plan.members.forEach(i => { assert.strictEqual(i.prep.seq, 1); assert.strictEqual(i.prep.amount, i.row.monthlyTotal); });
  assert.strictEqual(plan.total, plan.members.reduce((s, i) => s + i.row.monthlyTotal, 0));
});

test('Submit PR is blocked when any trucking company is abnormal; nothing is created (PC-12)', () => {
  const prs = [], res = PC.submitBundle(rowsOf('2027-01'), ctx(prs, staff));
  assert.strictEqual(res.ok, false); assert.strictEqual(res.error, PC.MSG.abnormal(5)); assert.strictEqual(prs.length, 0);
  const mixed = [PC.calculate('DNX', '2026-12', src), PC.calculate('PNJ', '2026-12', src)];
  assert.strictEqual(PC.submitBundle(mixed, ctx(prs, staff)).error, PC.MSG.abnormal(1)); assert.strictEqual(prs.length, 0);
});

test('Submit PR as VPLD Staff: one bundle, same sequence and bundle id, full approval chain', () => {
  const prs = [], res = PC.submitBundle(rowsOf('2026-12'), ctx(prs, staff, { expectedSeq: 1 }));
  assert(res.ok); assert.strictEqual(res.done.length, 5); assert.strictEqual(res.message, PC.MSG.submitted('2026-12', 1, 5, res.done.map(p => p.prNo).join(', ')));
  assert(res.done.every(p => p.rev === 1 && p.bundle === '2026-12#1' && p.bundleSize === 5 && p.prodMonth === '12/2026-1'));
  assert(res.done.every(p => WF.prStatus(p) === 'Waiting SH' && p.price === p.perDay * 22));
  assert.strictEqual(new Set(res.done.map(p => p.prNo)).size, 5);
});

test('Submit PR as VPLD Section Head: SH skipped, bundle starts at DpH, SH cannot approve it', () => {
  const prs = [], pr = PC.submitBundle(rowsOf('2026-12'), ctx(prs, sh)).done[0];
  assert.strictEqual(pr.approval.SH.status, WF.AP.SKIP); assert.strictEqual(WF.prStatus(pr), 'Waiting DpH');
  assert(pr.history[0].note.includes('SH Skip')); assert(WF.bundleBlock(pr, sh, prs));
});

test('bundle approval: approve / reject apply to every PR of the bundle, no partial approval (PC-10)', () => {
  const prs = [], done = PC.submitBundle(rowsOf('2026-12'), ctx(prs, staff)).done, c = wctx(prs);
  assert(WF.approveBundle(done[2], sh, at, c).ok);
  assert(done.every(p => WF.prStatus(p) === 'Waiting DpH'));
  assert(WF.approveBundle(done[0], dh, at, c).ok);   // DH approves directly: DpH Skip, PO per trucking company
  assert(done.every(p => WF.prStatus(p) === 'Approved')); assert.strictEqual(c.pos.length, 5);
  const prs2 = [], b2 = PC.submitBundle(rowsOf('2026-12'), ctx(prs2, staff)).done;
  assert.strictEqual(WF.rejectBundle(b2[1], sh, 'short', at, wctx(prs2)).ok, false);
  assert(WF.rejectBundle(b2[1], sh, 'Route plan belum sesuai', at, wctx(prs2)).ok);
  assert(b2.every(p => WF.prStatus(p) === 'Rejected'));
});

test('sequence after a rejected bundle: new number, all routes again; then only new routes (PC-06 to PC-08)', () => {
  const prs = [], c = ctx(prs, staff), rows = rowsOf('2026-12');
  const s1 = PC.submitBundle(rows, c).done;
  WF.rejectBundle(s1[0], sh, 'Route plan belum sesuai', at, wctx(prs));
  const s2 = PC.submitBundle(rows, ctx(prs, staff, { expectedSeq: 2 })).done;
  assert(s2.every(p => p.rev === 2 && p.parentPrNo === s1.find(x => x.supplierCode === p.supplierCode).prNo));
  // all routes in the active bundle 2: nothing left, the rows show "already included"
  const plan = PC.planBundle(rows, prs, WF.prStatus);
  assert.strictEqual(plan.error, PC.MSG.nothing); assert(plan.items.every(i => i.prep.included));
  // a new route makes sequence 3 with only that route for every trucking company
  const more = { ...src, routes: () => [...src.routes(), { code: 'NEW_RT', description: 'NEW ROUTE', distance: 30, percentage: 5, status: 'ACTIVE' }] };
  const s3 = PC.submitBundle(rowsOf('2026-12', more), ctx(prs, staff)).done;
  assert(s3.every(p => p.rev === 3 && p.components.length === 1 && p.components[0] === 'ROUTE:NEW_RT'));
});

test('sequence taken by another user in the meantime: nothing created (PC-11)', () => {
  const prs = [], rows = rowsOf('2026-12');
  PC.submitBundle(rows, ctx(prs, staff));
  WF.rejectBundle(prs[0], sh, 'Route plan belum sesuai', at, wctx(prs));
  const res = PC.submitBundle(rows, ctx(prs, staff, { expectedSeq: 1 }));
  assert.strictEqual(res.ok, false); assert.strictEqual(res.error, PC.MSG.seqTaken('2026-12', 1)); assert.strictEqual(prs.length, 5);
});

test('PR without bundle (created before the revision) is still approved alone', () => {
  const pr = { prNo: 'OLD1', approval: WF.newApproval(), history: [] }, prs = [pr];
  assert.deepStrictEqual(WF.bundleOf(pr, prs), [pr]);
  assert(WF.approveBundle(pr, sh, at, wctx(prs)).ok); assert.strictEqual(WF.prStatus(pr), 'Waiting DpH');
});

console.log(`\n${n} tests passed`);
