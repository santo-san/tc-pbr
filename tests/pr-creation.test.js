// Unit tests for PR Creation (calculation and validation). Run: node tests/pr-creation.test.js
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
const at = new Date(2026, 10, 1, 9, 0);
let run = 1000;
const ctx = (prs, actor) => ({ prs, actor, at, wf: WF, prNo: (p, ym) => `${p}${ym.slice(2, 4)}${ym.slice(5)}${run++}`, name: p => p, shareTotal: src.shareTotal() });

test('header validation: type, month and partner are mandatory', () => {
  assert.deepStrictEqual(PC.validateHeader({}), { type: PC.MSG.typeReq, ym: PC.MSG.monthReq, partner: PC.MSG.partnerReq });
  assert.deepStrictEqual(PC.validateHeader({ type: 'ROUTE', ym: '2026-12', partner: 'DNX' }), {});
});

test('authorization: VPLD Staff and VPLD Section Head only', () => {
  assert(PC.canCreate(staff, PR_CREATORS) && PC.canCreate(sh, PR_CREATORS));
  assert(!PC.canCreate({ role: 'APPROVER', level: 'DpH', division: 'VPLD' }, PR_CREATORS));
  assert(!PC.canCreate({ role: 'IELP_ADMIN' }, PR_CREATORS) && !PC.canCreate({ role: 'SUPPLIER' }, PR_CREATORS) && !PC.canCreate({ role: 'GA' }, PR_CREATORS));
});

test('creation period: Month N-1 allowed, Month N per System Master, never assumed', () => {
  const today = new Date(2026, 10, 15);
  assert.deepStrictEqual(PC.periodCheck('2026-12', today, undefined), { ok: true, rule: 'N-1' });
  assert.strictEqual(PC.periodCheck('2026-11', today, undefined).error, PC.MSG.paramMissing);
  assert.strictEqual(PC.periodCheck('2026-11', today, false).error, PC.MSG.currentNotAllowed('2026-11'));
  assert.deepStrictEqual(PC.periodCheck('2026-11', today, true), { ok: true, rule: 'N' });
  assert.strictEqual(PC.periodCheck('2026-10', today, true).error, PC.MSG.past('2026-10'));
  assert.strictEqual(PC.periodCheck('2027-01', today, true).error, PC.MSG.tooFar('2027-01', '2026-12'));
  assert.deepStrictEqual(PC.periodCheck('2027-01', new Date(2026, 11, 1), undefined), { ok: true, rule: 'N-1' });   // created in Dec 2026 for Jan 2027
});

test('Monthly Cost and Mileage Cost are read from eCatalogue', () => {
  const r = PC.calculate('DNX', '2026-12', src);
  assert.strictEqual(r.fixed, 28500000); assert.strictEqual(r.mileage, 2700);
  const s = PC.calculate('SRL', '2026-12', src);
  assert.strictEqual(s.fixed, 28300000); assert(s.errors.km.includes('No Price per KM'));
});

test('route plan: Order Sharing x working days split by Route Percentage, cost = orders x KM x price per KM', () => {
  const r = PC.calculate('DNX', '2026-12', src);
  assert.strictEqual(r.workingDays, 22); assert.strictEqual(r.dailyOrders, 4); assert.strictEqual(r.monthlyOrders, 88);
  assert.strictEqual(r.lines.reduce((s, l) => s + l.orders, 0), 88);
  r.lines.forEach(l => assert.strictEqual(l.cost, Math.round(l.orders * l.distance * 2700)));
  assert.strictEqual(r.variable, r.lines.reduce((s, l) => s + l.cost, 0));
  assert.strictEqual(r.perDay, Math.round(r.variable / 22));
  assert.strictEqual(r.monthlyTotal, 28500000 + r.variable);
  // the largest route percentage (15%) gets the most orders
  assert.strictEqual(r.lines.find(l => l.code === 'DPCMR_CYKRW').orders, Math.max(...r.lines.map(l => l.orders)));
});

test('missing TMMIN Calendar, Order Sharing or Route Percentage blocks the route-based PR', () => {
  const jan = PC.calculate('DNX', '2027-01', src);
  assert(jan.errors.calendar === undefined && jan.errors.fix);   // calendar exists, no eCatalogue price for 202701
  const feb = PC.calculate('DNX', '2027-02', src);
  assert.strictEqual(feb.errors.calendar, PC.MSG.noCalendar('2027-02'));
  assert.strictEqual(PC.prepare('ROUTE', feb, [], WF.prStatus).error, PC.MSG.noCalendar('2027-02'));
  const pnj = PC.calculate('PNJ', '2026-12', src);
  assert.strictEqual(PC.prepare('ROUTE', pnj, [], WF.prStatus).error, PC.MSG.noSharing('PNJ'));
  const noRoutes = PC.calculate('DNX', '2026-12', { ...src, routes: () => [] });
  assert.strictEqual(PC.prepare('ROUTE', noRoutes, [], WF.prStatus).error, PC.MSG.noRoutes);
  const agr = PC.calculate('AGR', '2026-12', src);
  assert(PC.prepare('ROUTE', agr, [], WF.prStatus).error.includes('No Price per KM'));
});

test('create Monthly Fixed Cost PR as VPLD Staff: full approval chain', () => {
  const prs = [], row = PC.calculate('DNX', '2026-12', src);
  const res = PC.createPRs([{ type: 'FIX', row }], ctx(prs, staff));
  assert.strictEqual(res.done.length, 1);
  const pr = res.done[0];
  assert.strictEqual(pr.rev, 1); assert.strictEqual(pr.prodMonth, '12/2026-1'); assert.strictEqual(pr.price, 28500000);
  assert.deepStrictEqual(pr.components, ['FIX']); assert.strictEqual(pr.parentPrNo, null);
  assert.strictEqual(WF.prStatus(pr), 'Waiting SH'); assert.strictEqual(WF.currentPic(pr), 'vpld.staff');
  assert(WF.LEVELS.every(l => pr.approval[l].status === WF.AP.PENDING));
});

test('create Route-Based PR as VPLD Section Head: SH skipped, starts at DpH, SH cannot approve it', () => {
  const prs = [], row = PC.calculate('JMP', '2026-12', src);
  const pr = PC.createPRs([{ type: 'ROUTE', row }], ctx(prs, sh)).done[0];
  assert.strictEqual(pr.approval.SH.status, WF.AP.SKIP); assert.strictEqual(WF.prStatus(pr), 'Waiting DpH');
  assert(pr.history[0].note.includes('SH Skip'));
  assert(WF.prBlock(pr, sh));
  assert(WF.approvePR(pr, { role: 'APPROVER', level: 'DpH', userId: 'bahauddin', division: 'VPLD' }, at, { master: { poAutoApproveDays: 1 }, pos: [], prs }).ok);
  assert.strictEqual(WF.prStatus(pr), 'Waiting DH');
  assert.strictEqual(pr.qty, 88); assert.strictEqual(pr.percentage, 20);
});

test('additional sequence: unique sequence, no duplicated components, link to the initial PR', () => {
  const prs = [], c = ctx(prs, staff), row = PC.calculate('DNX', '2026-12', src);
  const s1 = PC.createPRs([{ type: 'FIX', row }], c).done[0];
  // a route-based PR created before route D1_S1_D3 existed
  const without = { ...src, routes: () => src.routes().filter(r => r.code !== 'D1_S1_D3') };
  const s2 = PC.createPRs([{ type: 'ROUTE', row: PC.calculate('DNX', '2026-12', without) }], c).done[0];
  assert.strictEqual(s2.rev, 2); assert.strictEqual(s2.parentPrNo, s1.prNo);
  // Monthly Cost again: duplicate
  const dupFix = PC.createPRs([{ type: 'FIX', row }], c);
  assert.strictEqual(dupFix.done.length, 0); assert.strictEqual(dupFix.fails[0].error, PC.MSG.dupFix('DNX', s1.prNo));
  // Route-based with all routes: only the new route goes into sequence 3
  const s3 = PC.createPRs([{ type: 'ROUTE', row }], c).done[0];
  assert.strictEqual(s3.rev, 3); assert.deepStrictEqual(s3.components, ['ROUTE:D1_S1_D3']); assert.strictEqual(s3.parentPrNo, s1.prNo);
  // previous PRs unchanged
  assert.strictEqual(s1.price, 28500000); assert(!s2.components.includes('ROUTE:D1_S1_D3'));
  // nothing left
  const s4 = PC.createPRs([{ type: 'ROUTE', row }], c);
  assert(s4.fails[0].error.startsWith('All planned routes of DNX'));
  assert.strictEqual(new Set(prs.map(p => p.rev)).size, prs.length);
});

test('rejected or returned PR does not block its components; the sequence still increases', () => {
  const prs = [], c = ctx(prs, staff), row = PC.calculate('PBM', '2026-12', src);
  const s1 = PC.createPRs([{ type: 'FIX', row }], c).done[0];
  WF.rejectPR(s1, { role: 'APPROVER', level: 'SH', userId: 'farid.fadillah', division: 'VPLD' }, 'Harga belum sesuai kontrak', at);
  const s2 = PC.createPRs([{ type: 'FIX', row }], c).done[0];
  assert.strictEqual(s2.rev, 2); assert.deepStrictEqual(s2.components, ['FIX']);
});

test('several partners at once: partners with errors fail, others are created', () => {
  const prs = [], c = ctx(prs, staff);
  const res = PC.createPRs(['DNX', 'AGR', 'PBM'].map(p => ({ type: 'ROUTE', row: PC.calculate(p, '2026-12', src) })), c);
  assert.deepStrictEqual(res.done.map(p => p.supplierCode), ['DNX', 'PBM']);
  assert.deepStrictEqual(res.fails.map(f => f.partner), ['AGR']);
});

test('calculated amount must be greater than 0', () => {
  const row = PC.calculate('DNX', '2026-12', src);
  assert.strictEqual(PC.prepare('FIX', { ...row, fixed: 0 }, [], WF.prStatus).error, PC.MSG.badAmount('DNX'));
  assert.strictEqual(PC.prepare('ROUTE', { ...row, monthlyOrders: 0 }, [], WF.prStatus).error, PC.MSG.noOrders('DNX'));
});

console.log(`\n${n} tests passed`);
