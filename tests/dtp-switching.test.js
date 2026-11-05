// Unit tests for DTP Switching (rollback of a submitted DTP) in dtp-rules.js. Run: node tests/dtp-switching.test.js
const assert = require('assert');
const D = require('../dtp-rules.js');
const W = require('../workflow.js');
const S = D.STATUS;

const PLANNER = { role: 'PLANNER', name: 'Planner VPLD' }, IP = { role: 'IP_ADMIN', name: 'Admin' };
const CTX = { lps: ['PBM', 'PNJ'], from: ['D1', 'D3'], to: ['K1E', 'S1E'], containerError: W.containerError };
const at = new Date(2026, 10, 5, 9, 0);
const raw = n => ({ io: 'EXPORT', roundUse: 'N', lp: 'PBM', renban: `C12${n}`, from: 'D1', to: 'K1E', dest: 'STM', etd: '2026-11-06', ctrSize: '40', truckType: 'TRAILER',
  bookNo: `89902678188${n}`, container: '', shift: 'DAY', arrDate: '2026-11-05', arrTime: '08:00' });
function setup() {
  const grid = [], orders = [], queue = [];
  const mk = (n, status) => {
    const r = D.makeRecord(raw(n), { id: n, date: '2026-11-05', source: D.SOURCE.MANUAL, grid, ctx: CTX }); grid.push(r);
    if (status !== S.AVAILABLE) { D.submit([r], { at, actor: PLANNER, date: '2026-11-05', today: '2026-11-05', cfg: { backdateDays: 3, advanceDays: 14 } }); if (status !== S.SUBMITTED) D.step(r, status, at); }
    if (status === S.PROCESSED) {
      r.orderNo = `261105C2000000${n}`;
      const o = W.newOrder({ date: r.date, type: 'Universal', supplier: 'PT. PBM', from: 'Depo Sunter', to: 'CY Karawang', renban: r.renban, shift: 'DAY', planned: 1 }, PLANNER, at, r.orderNo, 'DTP Creation');
      o.dtp = { recId: r.id }; orders.push(o);
    }
    if ([S.SUBMITTED, S.QUEUED].includes(status)) queue.push(r.id);
    return r;
  };
  const ctx = extra => Object.assign({ at, actor: PLANNER, orders, W, grid, vctx: CTX, dequeue: id => { const i = queue.indexOf(id); if (i >= 0) queue.splice(i, 1); }, removeOrder: o => orders.splice(orders.indexOf(o), 1) }, extra || {});
  return { grid, orders, queue, mk, ctx, order: r => orders.find(o => o.orderNo === r.orderNo) };
}
const tests = [];
const test = (n, f) => tests.push([n, f]);

test('eligibility: submitted / queued / failed / processed (driver not started) are switchable', () => {
  const t = setup();
  [S.SUBMITTED, S.QUEUED, S.FAILED, S.PROCESSED].forEach((st, i) => assert.ok(D.canSwitch(t.mk(i + 1, st), t.orders, W), st));
});
test('eligibility: not submitted and processing are not switchable', () => {
  const t = setup();
  assert.strictEqual(D.switchCheck(t.mk(1, S.AVAILABLE), t.orders, W).code, 'NOT_SUBMITTED');
  const r = t.mk(2, S.AVAILABLE); r.status = S.READY; assert.strictEqual(D.switchCheck(r, t.orders, W).code, 'NOT_SUBMITTED');
  assert.strictEqual(D.switchCheck(t.mk(3, S.PROCESSING), t.orders, W).code, 'NOT_ELIGIBLE');
});
test('driver started (Start Daily Order / cycle started) is not switchable', () => {
  const t = setup(), r = t.mk(1, S.PROCESSED), o = t.order(r);
  Object.assign(o, { status: W.ORDER.REL, truck: 'B1UIZ' }); assert.ok(D.canSwitch(r, t.orders, W)); // assigned, driver not started
  o.cycles[0].startAt = at; assert.strictEqual(D.switchCheck(r, t.orders, W).code, 'DRIVER_STARTED');
  o.cycles[0].startAt = null; o.status = W.ORDER.START; assert.strictEqual(D.switchCheck(r, t.orders, W).msg, D.MSG.swDriverStarted);
  o.status = W.ORDER.FIN; assert.strictEqual(D.switchCheck(r, t.orders, W).code, 'DRIVER_STARTED');
});
test('processed record whose order is missing is not eligible', () => {
  const t = setup(), r = t.mk(1, S.PROCESSED); t.orders.length = 0;
  assert.strictEqual(D.switchCheck(r, t.orders, W).code, 'NOT_ELIGIBLE');
});
test('rollback: queued record leaves the queue, becomes Available and can be submitted again', () => {
  const t = setup(), r = t.mk(1, S.QUEUED);
  const res = D.switchBack([r], t.ctx());
  assert.ok(res.ok); assert.strictEqual(res.message, 'DTP rollback completed successfully.');
  assert.deepStrictEqual([r.status, r.submittedAt, r.submittedBy, r.attempts, t.queue.length], [S.AVAILABLE, null, '', 0, 0]);
  r.status = S.READY;
  assert.ok(D.submit([r], { at, actor: PLANNER, date: '2026-11-05', today: '2026-11-05', cfg: { backdateDays: 3, advanceDays: 14 } }).ok);
});
test('rollback: processed record cancels the Daily order (LP accept / truck), keeps history and snapshot', () => {
  const t = setup(), r = t.mk(1, S.PROCESSED), o = t.order(r);
  Object.assign(o, { status: W.ORDER.REL, truck: 'B1UIZ', lpAccepted: { by: 'LP', at } });
  const n = r.history.length, res = D.switchBack([r], t.ctx());
  assert.ok(res.ok); assert.strictEqual(t.orders.length, 0); assert.strictEqual(r.orderNo, ''); assert.strictEqual(r.status, S.AVAILABLE);
  assert.strictEqual(r.history.length, n + 1); assert.ok(/rollback from Processed; Daily order 261105C20000001 \(Order Release, LP Accepted, truck B1UIZ\) cancelled/.test(r.history.at(-1).note));
  assert.deepStrictEqual([r.switchLog[0].from, r.switchLog[0].order.truck, r.switchLog[0].by], [S.PROCESSED, 'B1UIZ', 'Planner VPLD']);
  assert.ok(r.switchLog[0].order.history.length >= 1);
});
test('batch is all-or-nothing: one started order rejects the whole request', () => {
  const t = setup(), a = t.mk(1, S.PROCESSED), b = t.mk(2, S.PROCESSED), c = t.mk(3, S.QUEUED);
  t.order(b).status = W.ORDER.START;
  const res = D.switchBack([a, b, c], t.ctx());
  assert.strictEqual(res.status, 409); assert.deepStrictEqual(res.failed.map(f => [f.id, f.code]), [[2, 'DRIVER_STARTED']]);
  assert.deepStrictEqual([a.status, c.status, t.orders.length, t.queue.length], [S.PROCESSED, S.QUEUED, 2, 1]);
});
test('race: driver starts between confirmation and execution -> backend re-check rejects', () => {
  const t = setup(), r = t.mk(1, S.PROCESSED), o = t.order(r);
  assert.ok(D.canSwitch(r, t.orders, W));            // screen check before the dialog
  Object.assign(o, { status: W.ORDER.START }); o.cycles[0].startAt = at;   // driver presses Jalankan
  const res = D.switchBack([r], t.ctx());
  assert.strictEqual(res.failed[0].code, 'DRIVER_STARTED'); assert.strictEqual(r.status, S.PROCESSED); assert.strictEqual(t.orders.length, 1);
});
test('stale data: already rolled back / processing now -> no longer eligible', () => {
  const t = setup(), r = t.mk(1, S.QUEUED);
  assert.ok(D.switchBack([r], t.ctx()).ok);
  assert.strictEqual(D.switchBack([r], t.ctx()).failed[0].code, 'NOT_SUBMITTED');
  const p = t.mk(2, S.PROCESSING); assert.strictEqual(D.switchBack([p], t.ctx()).failed[0].msg, D.MSG.swNotEligible);
});
test('authorization, empty selection and DB failure (nothing changed)', () => {
  const t = setup(), r = t.mk(1, S.PROCESSED);
  assert.strictEqual(D.switchBack([r], t.ctx({ actor: IP })).status, 403);
  assert.strictEqual(D.switchBack([], t.ctx()).status, 400);
  const res = D.switchBack([r], t.ctx({ fail: true }));
  assert.strictEqual(res.status, 500); assert.strictEqual(res.error, D.MSG.swError);
  assert.deepStrictEqual([r.status, t.orders.length, r.switchLog], [S.PROCESSED, 1, undefined]);
});
test('rollback re-validates: a now-duplicate record becomes Validation Error (correct and resubmit)', () => {
  const t = setup(), r = t.mk(1, S.QUEUED);
  const twin = D.makeRecord({ ...raw(1), renban: 'C999' }, { id: 9, date: '2026-11-05', source: D.SOURCE.MANUAL, grid: [], ctx: CTX }); t.grid.push(twin); // same booking no, added later
  D.switchBack([r], t.ctx());
  assert.strictEqual(r.status, S.ERROR); assert.ok(Object.values(r.errors)[0].includes('already exists'));
});

let fail = 0;
for (const [n, f] of tests) { try { f(); console.log('ok  -', n); } catch (e) { fail++; console.log('FAIL-', n, '\n   ', e.message); } }
console.log(`\n${tests.length - fail}/${tests.length} passed`);
process.exit(fail ? 1 : 0);
