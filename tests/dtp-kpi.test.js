// Unit tests for DTP Creation vs Master KPI monitoring (dtp-rules.js kpiMonitor, master-kpi.js applicable). Run: node tests/dtp-kpi.test.js
const assert = require('assert');
const D = require('../dtp-rules.js');
const MK = require('../master-kpi.js');
const S = D.STATUS;

const KPI = [{ partner: 'TCA', paymentType: MK.PAYMENT_BY_RESOURCE, orderSharing: 20 }, { partner: 'TCB', paymentType: MK.PAYMENT_BY_RESOURCE, orderSharing: 15 },
  { partner: 'TCC', paymentType: MK.PAYMENT_BY_RESOURCE, orderSharing: 10 }, { partner: 'TCX', paymentType: 'Fixed Cost', orderSharing: 5 }];
let id = 0;
const recs = (lp, date, status, n) => Array.from({ length: n }, () => ({ id: ++id, lp, date, status }));
const mon = (records, extra = {}) => D.kpiMonitor(Object.assign({ date: '2026-11-05', records, lps: ['TCA', 'TCB', 'TCC'], kpiRows: KPI, applicable: MK.applicable, byResource: MK.PAYMENT_BY_RESOURCE }, extra));
const row = (m, lp) => m.rows.find(r => r.lp === lp);
const tests = [];
const test = (n, f) => tests.push([n, f]);

test('example of the requirement: limit / assigned / remaining / usage per trucking company', () => {
  const m = mon([...recs('TCA', '2026-11-05', S.PROCESSED, 14), ...recs('TCB', '2026-11-05', S.PROCESSED, 15), ...recs('TCC', '2026-11-05', S.PROCESSED, 7)]);
  assert.deepStrictEqual(['TCA', 'TCB', 'TCC'].map(lp => { const r = row(m, lp); return [r.limit, r.assigned, r.remaining, r.usage, r.level]; }),
    [[20, 14, 6, 70, 'ok'], [15, 15, 0, 100, 'full'], [10, 7, 3, 70, 'ok']]);
  assert.deepStrictEqual([m.total.limit, m.total.assigned, m.total.remaining], [45, 36, 9]);
});
test('per date: other dates are never combined', () => {
  const r = [...recs('TCA', '2026-11-05', S.PROCESSED, 14), ...recs('TCA', '2026-11-06', S.PROCESSED, 10)];
  assert.strictEqual(row(mon(r), 'TCA').assigned, 14);
  assert.strictEqual(row(mon(r, { date: '2026-11-06' }), 'TCA').remaining, 10);
});
test('consuming statuses: submitted / queued / processing / processed / failed; not available / ready / error', () => {
  const r = [S.SUBMITTED, S.QUEUED, S.PROCESSING, S.PROCESSED, S.FAILED, S.AVAILABLE, S.READY, S.ERROR].map(st => ({ id: ++id, lp: 'TCA', date: '2026-11-05', status: st }));
  const x = row(mon(r), 'TCA');
  assert.deepStrictEqual([x.assigned, x.selected, x.remaining, x.after], [5, 1, 15, 6]);
});
test('dynamic: 2 more assigned -> remaining 6 to 4; DTP Switching (back to Available) -> recalculated', () => {
  const r = recs('TCA', '2026-11-05', S.PROCESSED, 14);
  assert.strictEqual(row(mon(r), 'TCA').remaining, 6);
  r.push(...recs('TCA', '2026-11-05', S.SUBMITTED, 2));
  assert.deepStrictEqual([row(mon(r), 'TCA').assigned, row(mon(r), 'TCA').remaining], [16, 4]);
  r[0].status = S.AVAILABLE; // rolled back
  assert.deepStrictEqual([row(mon(r), 'TCA').assigned, row(mon(r), 'TCA').remaining], [15, 5]);
});
test('LP-rejected processed order does not consume', () => {
  const r = recs('TCB', '2026-11-05', S.PROCESSED, 3);
  const x = row(mon(r, { rejected: q => q.id === r[0].id }), 'TCB');
  assert.deepStrictEqual([x.assigned, x.rejected, x.remaining], [2, 1, 13]);
});
test('over allocation is shown, not hidden; warning level from 80%', () => {
  const x = row(mon(recs('TCA', '2026-11-05', S.PROCESSED, 22)), 'TCA');
  assert.deepStrictEqual([x.assigned, x.limit, x.remaining, x.over, x.level, x.usage], [22, 20, 0, 2, 'full', 110]);
  assert.strictEqual(row(mon(recs('TCA', '2026-11-05', S.PROCESSED, 16)), 'TCA').level, 'warn');
  assert.strictEqual(row(mon(recs('TCA', '2026-11-05', S.PROCESSED, 15)), 'TCA').level, 'ok');
});
test('after submit projection flags exceeding the limit', () => {
  const r = [...recs('TCC', '2026-11-05', S.PROCESSED, 9), ...recs('TCC', '2026-11-05', S.READY, 3)];
  const x = row(mon(r), 'TCC');
  assert.deepStrictEqual([x.after, x.afterOver, x.remaining], [12, 2, 1]);
});
test('missing Master KPI is not treated as limit 0; non By Resources payment type flagged', () => {
  const r = [...recs('ZZZ', '2026-11-05', S.PROCESSED, 2), ...recs('TCX', '2026-11-05', S.PROCESSED, 1)];
  const m = mon(r, { lps: ['TCA', 'TCX'] });
  const z = row(m, 'ZZZ'), t = row(m, 'TCX');
  assert.deepStrictEqual([z.kpi, z.limit, z.remaining, z.assigned, z.level], ['NONE', null, null, 2, 'none']);
  assert.strictEqual(t.kpi, 'NOT_BY_RESOURCE');
  assert.deepStrictEqual([m.total.limit, m.total.assigned, m.total.noKpiAssigned], [20, 0, 3]);
});
test('limit 0 with nothing assigned is full; applicable KPI respects an effective period when present', () => {
  const k = [{ partner: 'TCA', paymentType: MK.PAYMENT_BY_RESOURCE, orderSharing: 0 }];
  assert.strictEqual(row(mon([], { kpiRows: k }), 'TCA').level, 'full');
  const p = [{ partner: 'TCA', paymentType: MK.PAYMENT_BY_RESOURCE, orderSharing: 9, effFrom: '2026-12-01', effTo: '2026-12-31' }];
  assert.strictEqual(MK.applicable(p, 'TCA', '2026-11-05'), null);
  assert.strictEqual(MK.applicable(p, 'TCA', '2026-12-05').orderSharing, 9);
});

// ---------- By Trip (Master KPI KP-01 / KP-14 / KP-15, DTP monitoring KM-09 .. KM-12) ----------
const BT = MK.PAYMENT_BY_TRIP, BR = MK.PAYMENT_BY_RESOURCE;
test('Master KPI: one row per company and payment type; By Trip share is a % with 2 decimals; seed totals', () => {
  const rows = [], vendors = [{ code: 'AGR' }, { code: 'DNX' }];
  assert.ok(MK.addCompany(rows, [], vendors, 'AGR', 'u', new Date(), BR).ok);
  assert.ok(MK.addCompany(rows, [], vendors, 'AGR', 'u', new Date(), BT).ok);
  assert.strictEqual(MK.addCompany(rows, [], vendors, 'AGR', 'u', new Date(), BT).error, 'Trucking Company AGR is already registered in Master KPI as By Trip.');
  assert.strictEqual(MK.addCompany(rows, [], vendors, 'DNX', 'u', new Date(), 'Fixed').error, MK.MSG.typeReq);
  // both types: Order Sharing % (2 decimals); By Resources also a typed Daily Trip (whole number); By Trip Daily Trip is calculated
  assert.deepStrictEqual([MK.validateRow({ score: 700, orderSharing: '10.09', values: {} }, [], BT), MK.validateRow({ score: 700, orderSharing: '14.29', dailyTrip: '4', values: {} }, [], BR)], [{}, {}]);
  assert.ok(MK.validateRow({ score: 700, orderSharing: '10.123', values: {} }, [], BT).orderSharing);
  assert.ok(MK.validateRow({ score: 700, orderSharing: '100.5', values: {} }, [], BT).orderSharing);
  assert.deepStrictEqual(Object.keys(MK.validateRow({ score: 700, orderSharing: '14.299', dailyTrip: '4.5', values: {} }, [], BR)).sort(), ['dailyTrip', 'orderSharing']);
  assert.deepStrictEqual([MK.totalByTrip(MK.SEED), MK.totalPct(MK.SEED, BR), MK.totalByResource(MK.SEED), MK.grade(667), MK.grade(665), MK.fmtShare({ paymentType: BR, orderSharing: 14.29 })], [100, 100, 28, 'GOLD', 'SILVER', '14.29%']);
  assert.strictEqual(MK.dailyQty(MK.SEED, 'PBM'), 4);   // By Resources typed Daily Trip
  const alloc = MK.allocateTrip(MK.SEED, 20), pbm = r => MK.SEED.find(s => s.partner === 'PBM' && s.paymentType === r);
  assert.deepStrictEqual([MK.dailyTripOf(pbm(BR), alloc), MK.dailyTripOf(pbm(BT), alloc)], [4, 2]);
});
test('KP-15 allocateTrip: 20 trips per day as the reference table (1 each, rest by %), fewer trips than companies, 0 % not eligible', () => {
  const a = MK.allocateTrip(MK.SEED, 20);
  assert.deepStrictEqual(a, { GIB: 2, VMB: 2, JMP: 2, DNX: 2, IBT: 2, MJR: 2, PLI: 2, PNJ: 2, PBM: 2, AGR: 1, PS: 1 });
  assert.strictEqual(Object.values(MK.allocateTrip(MK.SEED, 100)).reduce((s, n) => s + n, 0), 100);
  assert.deepStrictEqual(Object.entries(MK.allocateTrip(MK.SEED, 3)).filter(([, n]) => n).map(([c]) => c), ['GIB', 'VMB', 'JMP']);
  assert.deepStrictEqual([MK.DAILY_TRIPS, 'SGL' in a, MK.validTrips('20'), MK.validTrips('2.5')], [20, false, true, false]);
});
const KT = [{ partner: 'TCA', paymentType: BR, orderSharing: 40, dailyTrip: 2 }, { partner: 'TCA', paymentType: BT, orderSharing: 60 }, { partner: 'TCB', paymentType: BT, orderSharing: 40 },
  { partner: 'TCC', paymentType: BR, orderSharing: 60, dailyTrip: 3 }, { partner: 'TCD', paymentType: BT, orderSharing: 0 }];
const monT = (records, extra = {}) => D.kpiMonitor(Object.assign({ date: '2026-11-05', records, lps: ['TCA', 'TCB', 'TCC', 'TCD'], kpiRows: KT, applicable: MK.applicable, byResource: BR, byTrip: BT, dailyTrips: 5, tripLimits: MK.allocateTrip }, extra));
test('KM-09/10: trips above the By Resources limit go by trip (not over allocation); By Trip only company; resource only keeps over allocation', () => {
  const m = monT([...recs('TCA', '2026-11-05', S.PROCESSED, 5), ...recs('TCB', '2026-11-05', S.SUBMITTED, 1), ...recs('TCC', '2026-11-05', S.PROCESSED, 4)]);
  const a = row(m, 'TCA'), b = row(m, 'TCB'), c = row(m, 'TCC');
  assert.deepStrictEqual([a.kpi, a.assigned, a.limit, a.remaining, a.over, a.level, a.tripAssigned, a.total], ['OK', 2, 2, 0, 0, 'full', 3, 5]);
  assert.deepStrictEqual([b.kpi, b.tripAssigned, c.over, c.tripAssigned, row(m, 'TCD').kpi], ['BY_TRIP', 1, 1, 0, 'NONE']);
});
test('KM-11/12: By Trip daily limit from the trips per day (5 -> TCA 3, TCB 2), trips vs limit, after submit, total % check', () => {
  const r = [...recs('TCA', '2026-11-05', S.PROCESSED, 5), ...recs('TCB', '2026-11-05', S.SUBMITTED, 1), ...recs('TCB', '2026-11-05', S.READY, 2)];
  const t = monT(r).trip, ta = t.rows.find(x => x.lp === 'TCA'), tb = t.rows.find(x => x.lp === 'TCB');
  assert.deepStrictEqual([t.dailyTrips, t.rows.map(x => x.lp).join(), t.limit, t.trips, t.sumPct, t.sumOk], [5, 'TCA,TCB', 5, 4, 100, true]);   // TCD 0 % not eligible
  assert.deepStrictEqual([ta.limit, ta.trips, ta.remaining, ta.level, ta.usage], [3, 3, 0, 'full', 100]);
  assert.deepStrictEqual([tb.limit, tb.trips, tb.remaining, tb.level, tb.selected, tb.after, tb.afterOver], [2, 1, 1, 'ok', 2, 3, 1]);
  const over = monT([...recs('TCB', '2026-11-05', S.PROCESSED, 4)]).trip.rows.find(x => x.lp === 'TCB');
  assert.deepStrictEqual([over.trips, over.over, over.level], [4, 2, 'full']);
  const bad = monT([], { kpiRows: KT.map(k => k.partner === 'TCB' ? { ...k, orderSharing: 30 } : k) }).trip;
  assert.deepStrictEqual([bad.sumPct, bad.sumOk], [90, false]);
});

// ---------- Payment Type per DTP chosen by the planner (KM-13 .. KM-15) ----------
const P = D.PAY, planner = { role: 'PLANNER', name: 'Planner VPLD' };
const ptRecs = (lp, status, n, payType) => recs(lp, '2026-11-05', status, n).map(r => Object.assign(r, { payType, history: [] }));
test('KM-13: the planner\'s Payment Type decides by resource / by trip; By Resources above the limit is over allocation', () => {
  // TCA: limit 2 + By Trip. Planner: 1 By Resources, 3 By Trip, 1 without type (auto -> fills the free resource slot)
  const r = [...ptRecs('TCA', S.PROCESSED, 1, P.RES), ...ptRecs('TCA', S.PROCESSED, 3, P.TRIP), ...ptRecs('TCA', S.SUBMITTED, 1, undefined)];
  const a = row(monT(r), 'TCA');
  assert.deepStrictEqual([a.assigned, a.tripAssigned, a.over, a.remaining], [2, 3, 0, 0]);
  const o = row(monT(ptRecs('TCA', S.PROCESSED, 3, P.RES)), 'TCA');   // planner chose By Resources 3 times: over 1, nothing by trip
  assert.deepStrictEqual([o.assigned, o.over, o.tripAssigned, o.level], [3, 1, 0, 'full']);
  const s = row(monT([...ptRecs('TCA', S.PROCESSED, 1, P.TRIP), ...ptRecs('TCA', S.READY, 1, P.RES)]), 'TCA');   // projection follows the type
  assert.deepStrictEqual([s.assigned, s.tripAssigned, s.after, s.tripAfter], [0, 1, 1, 1]);
});
test('KM-14 / KM-15: types of a company, default By Resources while a slot is free, change only before submit, submit check', () => {
  const ap = MK.applicable;
  assert.deepStrictEqual([D.payTypesFor('TCA', '2026-11-05', KT, ap), D.payTypesFor('TCB', '2026-11-05', KT, ap), D.payTypesFor('TCD', '2026-11-05', KT, ap), D.payTypesFor('TCC', '2026-11-05', KT, ap)],
    [[P.RES, P.TRIP], [P.TRIP], [], [P.RES]]);   // TCD By Trip 0 % -> not eligible
  const g = ptRecs('TCA', S.AVAILABLE, 2, P.RES);
  assert.strictEqual(D.suggestPayType('TCA', '2026-11-05', g, KT, ap), P.TRIP);   // 2 of 2 slots planned
  assert.strictEqual(D.suggestPayType('TCA', '2026-11-05', g.slice(0, 1), KT, ap), P.RES);
  assert.strictEqual(D.suggestPayType('TCC', '2026-11-05', ptRecs('TCC', S.AVAILABLE, 5, P.RES), KT, ap), P.RES);   // no By Trip: stays By Resources
  const x = ptRecs('TCB', S.AVAILABLE, 1, P.TRIP)[0], lockedR = ptRecs('TCA', S.SUBMITTED, 1, P.RES)[0];
  const ctx = { date: '2026-11-05', kpiRows: KT, applicable: ap, at: new Date(), actor: planner };
  assert.match(D.setPayType([x], P.RES, ctx).error, /TCB has no By Resources/);
  assert.match(D.setPayType([lockedR], P.TRIP, ctx).error, /cannot be changed/);
  const y = ptRecs('TCA', S.READY, 1, P.RES)[0];
  assert.deepStrictEqual([D.setPayType([y], P.TRIP, ctx).ok, y.payType, y.history.length], [true, P.TRIP, 1]);
  assert.strictEqual(D.setPayType([y], P.TRIP, { ...ctx, actor: { role: 'IP', name: 'IP' } }).ok, false);
  const issues = D.payIssues([Object.assign({}, y, { payType: '' }), Object.assign({}, x, { payType: P.RES }), ptRecs('ZZZ', S.READY, 1, undefined)[0]], '2026-11-05', KT, ap);
  assert.deepStrictEqual(issues.map(i => /select the Payment Type/.test(i.msg) ? 'none' : 'wrong'), ['none', 'wrong']);   // ZZZ has no Master KPI: not checked
});

let fail = 0;
for (const [n, f] of tests) { try { f(); console.log('ok  -', n); } catch (e) { fail++; console.log('FAIL-', n, '\n   ', e.message); } }
console.log(`\n${tests.length - fail}/${tests.length} passed`);
process.exit(fail ? 1 : 0);
