// Unit tests for the TC-PBR SA Approval rules (sa-rules.js). Run: node tests/sa-approval.test.js
const assert = require('assert');
const SA = require('../sa-rules.js');

const FIN = 'Finish Daily Order';
const at = (d, h) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`);
const order = (no, over = {}) => Object.assign({
  orderNo: no, date: '2026-11-03', supplier: 'PT. Dinamika', status: FIN, saNo: '',
  cycles: [{ from: 'Depo A', to: 'CY B', container: 'TGCU1234560', finishAt: at('2026-11-03', 8) },
           { from: 'CY B', to: 'Depo A', container: 'SELU4384522', finishAt: at('2026-11-03', 10) }],
}, over);
const PO = (over = {}) => Object.assign({ poNo: 'PO-DNX-11', type: 'TC-PBR', lpCode: 'DNX', validFrom: '2026-11-01', validTo: '2026-11-30', status: 'Approved', ratePerKm: 2700, currency: 'IDR' }, over);
function mkCtx(orders, pos = [PO()], extra = {}) {
  const mileage = { 'DA>CB': { km: 20, status: 'ACTIVE' }, 'CB>DA': { km: 22.5, status: 'ACTIVE' } };
  return Object.assign({
    orders, finStatus: FIN, lpCode: o => ({ 'PT. Dinamika': 'DNX', 'PT. Other': 'OTH' })[o.supplier] || '',
    locCode: n => ({ 'Depo A': 'DA', 'CY B': 'CB' })[n] || '', mileage: (f, t) => mileage[`${f}>${t}`] || null,
    pos, sas: [], seq: {}, requests: {}, scope: 'LP_DATE', canApprove: a => a.role === 'PLANNER',
    commitOrder: (o, saNo, when) => { o.status = 'SA Approved'; o.saNo = saNo; o.saAt = when; },
  }, extra);
}
const VPLD = { role: 'PLANNER', name: 'planner1' }, IP = { role: 'IP_ADMIN', name: 'admin' };
const codes = r => r.errors.map(e => e.code);
const tests = [];
const test = (n, f) => tests.push([n, f]);

test('calculate(): route, Total KM, PO, rate and cost of a valid delivery', () => {
  const r = SA.calculate(order('A1'), mkCtx([]));
  assert.ok(r.valid, JSON.stringify(r.errors));
  assert.strictEqual(r.route, 'DACBDA'); assert.strictEqual(r.totalKm, 42.5);
  assert.deepStrictEqual([r.poNo, r.rate, r.currency, r.cost], ['PO-DNX-11', 2700, 'IDR', 114750]);
  assert.strictEqual(r.formula, '42.5 km x 2700 IDR/km = 114750');
});
test('eligibility: only Finish Daily Order without SA Number', () => {
  assert.ok(codes(SA.calculate(order('A', { status: 'Start Daily Order' }), mkCtx([]))).includes('NOT_ELIGIBLE'));
  assert.ok(codes(SA.calculate(order('A', { saNo: 'ILS/TR/DNX/2611030001' }), mkCtx([]))).includes('ALREADY_SA'));
});
test('route / KM errors: location without code, missing leg, zero and negative KM', () => {
  assert.deepStrictEqual(codes(SA.calculate(order('A', { cycles: [{ from: 'Depo X', to: 'CY B', finishAt: at('2026-11-03', 8) }] }), mkCtx([]))), ['ROUTE_NOT_FOUND']);
  const c = mkCtx([]); c.mileage = (f, t) => f === 'DA' ? { km: 20, status: 'ACTIVE' } : null;
  assert.deepStrictEqual(codes(SA.calculate(order('A'), c)), ['KM_NOT_FOUND']);
  c.mileage = (f, t) => ({ km: f === 'DA' ? 0 : -5, status: 'ACTIVE' });
  assert.ok(codes(SA.calculate(order('A'), c)).every(x => x === 'KM_INVALID'));
  c.mileage = () => ({ km: 10, status: 'INACTIVE' });
  assert.ok(codes(SA.calculate(order('A'), c)).includes('KM_NOT_FOUND'));
  assert.deepStrictEqual(codes(SA.calculate(order('A', { cycles: [] }), mkCtx([]))), ['ROUTE_NOT_FOUND']);
});
test('PO mapping: not found, other month, not active, multiple, rate missing / zero', () => {
  const r = p => codes(SA.calculate(order('A'), mkCtx([], p)));
  assert.deepStrictEqual(r([]), ['PO_NOT_FOUND']);
  assert.deepStrictEqual(r([PO({ validFrom: '2026-10-01', validTo: '2026-10-31' })]), ['PO_NOT_FOUND']);
  assert.deepStrictEqual(r([PO({ lpCode: 'OTH' })]), ['PO_NOT_FOUND']);
  assert.deepStrictEqual(r([PO({ type: 'FIX' })]), ['PO_NOT_FOUND']);
  assert.deepStrictEqual(r([PO({ status: 'Pending' }), PO({ poNo: 'X', status: 'Rejected' })]), ['PO_NOT_ACTIVE']);
  assert.deepStrictEqual(r([PO(), PO({ poNo: 'PO-2', status: 'Auto Approved' })]), ['MULTI_PO']);
  assert.deepStrictEqual(r([PO(), PO({ poNo: 'PO-2', status: 'Rejected' })]), []);
  assert.deepStrictEqual(r([PO({ ratePerKm: null })]), ['RATE_NOT_FOUND']);
  assert.deepStrictEqual(r([PO({ ratePerKm: 0 })]), ['RATE_INVALID']);
  assert.deepStrictEqual(r([PO({ ratePerKm: -1 })]), ['RATE_INVALID']);
});
test('PO validity boundaries: first and last day of the period are covered', () => {
  assert.ok(SA.calculate(order('A', { date: '2026-11-01' }), mkCtx([])).valid);
  assert.ok(SA.calculate(order('A', { date: '2026-11-30' }), mkCtx([])).valid);
  assert.deepStrictEqual(codes(SA.calculate(order('A', { date: '2026-12-01' }), mkCtx([]))), ['PO_NOT_FOUND']);
});
test('trucking company code missing', () => {
  assert.ok(codes(SA.calculate(order('A', { supplier: 'PT. Unknown' }), mkCtx([]))).includes('LP_CODE_MISSING'));
});
test('SA Number format and sequence scope per trucking company per date (default) or global per date', () => {
  assert.strictEqual(SA.saNumber('DNX', at('2026-11-04', 9), 1), 'ILS/TR/DNX/2611040001');
  const os = [order('A'), order('B'), order('C', { supplier: 'PT. Other' })];
  const c = mkCtx(os, [PO(), PO({ poNo: 'PO-OTH', lpCode: 'OTH' })]);
  const r = SA.approve({ orderNos: ['A', 'B', 'C'] }, VPLD, at('2026-11-04', 9), c);
  assert.ok(r.ok, r.message);
  assert.deepStrictEqual(r.sas.map(s => s.saNo).sort(), ['ILS/TR/DNX/2611040001', 'ILS/TR/OTH/2611040001']);
  const g = mkCtx([order('D'), order('E', { supplier: 'PT. Other' })], [PO(), PO({ poNo: 'PO-OTH', lpCode: 'OTH' })], { scope: 'DATE' });
  assert.deepStrictEqual(SA.approve({ orderNos: ['D', 'E'] }, VPLD, at('2026-11-04', 9), g).sas.map(s => s.saNo).sort(), ['ILS/TR/DNX/2611040001', 'ILS/TR/OTH/2611040002']);
  const n = mkCtx([order('F')]); n.seq['DNX|261104'] = 3;
  assert.strictEqual(SA.approve({ orderNos: ['F'] }, VPLD, at('2026-11-04', 9), n).sas[0].saNo, 'ILS/TR/DNX/2611040004');
  const nextDay = mkCtx([order('G')]); nextDay.seq['DNX|261104'] = 3;
  assert.strictEqual(SA.approve({ orderNos: ['G'] }, VPLD, at('2026-11-05', 9), nextDay).sas[0].saNo, 'ILS/TR/DNX/2611050001');
});
test('approve(): header, snapshot, Daily Monitoring update and audit', () => {
  const os = [order('A'), order('B')], c = mkCtx(os);
  const r = SA.approve({ requestId: 'R1', orderNos: ['A', 'B'], expected: { A: 114750, B: 114750 } }, VPLD, at('2026-11-04', 9), c);
  assert.ok(r.ok);
  const h = c.sas[0];
  assert.deepStrictEqual([h.deliveries, h.totalKm, h.totalCost, h.poNo, h.status, h.approvedBy], [2, 85, 229500, 'PO-DNX-11', 'SA Approved', 'planner1']);
  assert.strictEqual(h.details[0].rate, 2700); assert.strictEqual(h.audit.length, 1);
  assert.deepStrictEqual(os.map(o => [o.status, o.saNo]), [['SA Approved', h.saNo], ['SA Approved', h.saNo]]);
  c.pos[0].ratePerKm = 9999; // later PO change must not change the approved SA
  assert.strictEqual(c.sas[0].details[0].cost, 114750);
});
test('approve(): only VPLD (403) and at least one delivery (400)', () => {
  const c = mkCtx([order('A')]);
  assert.strictEqual(SA.approve({ orderNos: ['A'] }, { role: 'IP_ADMIN', name: 'x' }, at('2026-11-04', 9), c).status, 403);
  assert.strictEqual(SA.approve({ orderNos: [] }, VPLD, at('2026-11-04', 9), c).status, 400);
  assert.strictEqual(c.orders[0].saNo, '');
});
test('approve(): all-or-nothing when one delivery fails revalidation', () => {
  const os = [order('A'), order('B', { cycles: [{ from: 'Depo X', to: 'CY B', finishAt: at('2026-11-03', 8) }] })], c = mkCtx(os);
  const r = SA.approve({ orderNos: ['A', 'B', 'Z'] }, VPLD, at('2026-11-04', 9), c);
  assert.strictEqual(r.status, 422); assert.deepStrictEqual(r.failed.map(f => f.orderNo), ['B', 'Z']);
  assert.strictEqual(os[0].saNo, ''); assert.strictEqual(c.sas.length, 0); assert.deepStrictEqual(c.seq, {});
});
test('approve(): duplicate request is idempotent, second approval of same delivery is rejected', () => {
  const os = [order('A')], c = mkCtx(os);
  const r1 = SA.approve({ requestId: 'R1', orderNos: ['A'] }, VPLD, at('2026-11-04', 9), c);
  const r2 = SA.approve({ requestId: 'R1', orderNos: ['A'] }, VPLD, at('2026-11-04', 9), c);
  assert.ok(r2.replay); assert.strictEqual(r2.sas[0].saNo, r1.sas[0].saNo); assert.strictEqual(c.sas.length, 1);
  const r3 = SA.approve({ requestId: 'R2', orderNos: ['A'] }, VPLD, at('2026-11-04', 9), c);
  assert.strictEqual(r3.status, 422); assert.strictEqual(r3.failed[0].errors[0].code, 'ALREADY_SA');
});
test('approve(): cost difference between screen and revalidation blocks approval', () => {
  const c = mkCtx([order('A')]);
  const r = SA.approve({ orderNos: ['A'], expected: { A: 100000 } }, VPLD, at('2026-11-04', 9), c);
  assert.strictEqual(r.status, 422); assert.strictEqual(r.failed[0].errors[0].code, 'COST_CHANGED');
});
test('approve(): DB failure rolls back everything (no SA, no sequence, no Daily update)', () => {
  ['header', 'detail', 'daily'].forEach(fail => {
    const os = [order('A')], c = mkCtx(os, [PO()], { fail });
    const r = SA.approve({ requestId: 'R', orderNos: ['A'] }, VPLD, at('2026-11-04', 9), c);
    assert.strictEqual(r.status, 500); assert.strictEqual(c.sas.length, 0); assert.deepStrictEqual(c.seq, {}); assert.strictEqual(os[0].saNo, '');
    assert.deepStrictEqual(c.requests, {}); // a retry with the same request id is processed again
  });
});
test('approve(): sequence overflow and SA Number collision are refused', () => {
  const c = mkCtx([order('A')]); c.seq['DNX|261104'] = 9999;
  assert.strictEqual(SA.approve({ orderNos: ['A'] }, VPLD, at('2026-11-04', 9), c).status, 500);
  const d = mkCtx([order('B')]); d.sas.push({ saNo: 'ILS/TR/DNX/2611040001' });
  const r = SA.approve({ orderNos: ['B'] }, VPLD, at('2026-11-04', 9), d);
  assert.strictEqual(r.status, 500); assert.ok(/already exists/.test(r.message));
});
test('approve(): one SA per trucking company and PO', () => {
  const os = [order('A'), order('B', { date: '2026-10-30' })];
  const c = mkCtx(os, [PO(), PO({ poNo: 'PO-DNX-10', validFrom: '2026-10-01', validTo: '2026-10-31' })]);
  const r = SA.approve({ orderNos: ['A', 'B'] }, VPLD, at('2026-11-04', 9), c);
  assert.deepStrictEqual(r.sas.map(s => [s.saNo, s.poNo]), [['ILS/TR/DNX/2611040001', 'PO-DNX-11'], ['ILS/TR/DNX/2611040002', 'PO-DNX-10']]);
});

// ---------- Monthly truck cost (Fixed Cost PO) ----------
const MPO = (over = {}) => Object.assign({ poNo: 'PODNX261101', prNo: 'DNX261101', type: 'FIX', lpCode: 'DNX', lpName: 'PT. Dinamika', ym: '202611', status: 'Approved', amount: 28000000, currency: 'IDR', saNo: '' }, over);
const mctx = (pos, extra = {}) => mkCtx([], [PO()], Object.assign({ monthlyPos: pos, commitMonthly: (po, saNo, when) => { po.saNo = saNo; po.saAt = when; } }, extra));
test('monthly: only released Fixed Cost PO without SA is eligible', () => {
  assert.ok(SA.monthlyEligible(MPO()));
  assert.ok(SA.monthlyEligible(MPO({ status: 'Auto Approved' })));
  ['Pending', 'Rejected'].forEach(st => assert.ok(!SA.monthlyEligible(MPO({ status: st }))));
  assert.ok(!SA.monthlyEligible(MPO({ type: 'TC-PBR' })));
  assert.ok(!SA.monthlyEligible(MPO({ saNo: 'ILS/TR/DNX/2611040001' })));
});
test('monthly: calculation, period and validation', () => {
  const r = SA.calculateMonthly(MPO());
  assert.ok(r.valid); assert.deepStrictEqual([r.cost, r.period, r.poFrom, r.poTo], [28000000, '11/2026', '2026-11-01', '2026-11-30']);
  assert.deepStrictEqual(SA.calculateMonthly(MPO({ amount: null })).errors.map(x => x.code), ['AMOUNT_NOT_FOUND']);
  assert.deepStrictEqual(SA.calculateMonthly(MPO({ amount: 0 })).errors.map(x => x.code), ['AMOUNT_INVALID']);
  assert.deepStrictEqual(SA.calculateMonthly(MPO({ lpCode: '' })).errors.map(x => x.code), ['LP_CODE_MISSING']);
  assert.deepStrictEqual(SA.calculateMonthly(MPO({ status: 'Rejected' })).errors.map(x => x.code), ['PO_NOT_ACTIVE']);
});
test('monthly: approve gives one SA per PO with snapshot and PO marked; shares the SA sequence', () => {
  const a = MPO(), b = MPO({ poNo: 'POOTH261101', lpCode: 'OTH', lpName: 'PT. Other' }), c = mctx([a, b]);
  c.seq['DNX|261104'] = 1; // a delivery SA of DNX was already approved today
  const r = SA.approveMonthly({ requestId: 'M1', poNos: ['PODNX261101', 'POOTH261101'], expected: { PODNX261101: 28000000 } }, VPLD, at('2026-11-04', 9), c);
  assert.ok(r.ok, r.message);
  assert.deepStrictEqual(r.sas.map(x => x.saNo), ['ILS/TR/DNX/2611040002', 'ILS/TR/OTH/2611040001']);
  const h = c.sas[0];
  assert.deepStrictEqual([h.type, h.totalCost, h.deliveries, h.details.length, h.details[0].kind, h.pas.status], ['MONTHLY', 28000000, 0, 1, 'MONTHLY', 'NOT_SENT']);
  assert.strictEqual(a.saNo, 'ILS/TR/DNX/2611040002');
  a.amount = 30000000; assert.strictEqual(c.sas[0].totalCost, 28000000);
  assert.strictEqual(SA.approveMonthly({ requestId: 'M1', poNos: ['PODNX261101'] }, VPLD, at('2026-11-04', 9), c).replay, true);
  assert.strictEqual(SA.approveMonthly({ requestId: 'M2', poNos: ['PODNX261101'] }, VPLD, at('2026-11-04', 9), c).failed[0].errors[0].code, 'ALREADY_SA');
});
test('monthly: 403, 400, amount changed, all-or-nothing and rollback', () => {
  const c = mctx([MPO(), MPO({ poNo: 'PO2', amount: null })]);
  assert.strictEqual(SA.approveMonthly({ poNos: ['PODNX261101'] }, IP, at('2026-11-04', 9), c).status, 403);
  assert.strictEqual(SA.approveMonthly({ poNos: [] }, VPLD, at('2026-11-04', 9), c).status, 400);
  assert.strictEqual(SA.approveMonthly({ poNos: ['PODNX261101'], expected: { PODNX261101: 1 } }, VPLD, at('2026-11-04', 9), c).failed[0].errors[0].code, 'AMOUNT_CHANGED');
  const r = SA.approveMonthly({ poNos: ['PODNX261101', 'PO2', 'PO9'] }, VPLD, at('2026-11-04', 9), c);
  assert.strictEqual(r.status, 422); assert.deepStrictEqual(r.failed.map(f => f.orderNo), ['PO2', 'PO9']); assert.strictEqual(c.sas.length, 0);
  const d = mctx([MPO()], { fail: 'daily' });
  assert.strictEqual(SA.approveMonthly({ poNos: ['PODNX261101'] }, VPLD, at('2026-11-04', 9), d).status, 500);
  assert.deepStrictEqual([d.sas.length, d.seq, d.monthlyPos[0].saNo], [0, {}, '']);
});

let fail = 0;
for (const [n, f] of tests) { try { f(); console.log('ok  -', n); } catch (e) { fail++; console.log('FAIL-', n, '\n   ', e.message); } }
console.log(`\n${tests.length - fail}/${tests.length} passed`);
process.exit(fail ? 1 : 0);
