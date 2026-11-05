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

let fail = 0;
for (const [n, f] of tests) { try { f(); console.log('ok  -', n); } catch (e) { fail++; console.log('FAIL-', n, '\n   ', e.message); } }
console.log(`\n${tests.length - fail}/${tests.length} passed`);
process.exit(fail ? 1 : 0);
