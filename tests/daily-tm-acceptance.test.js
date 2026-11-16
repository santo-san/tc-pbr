// [CR] Finish Order acceptance by VPLD Transportation Management (workflow.js). Run: node tests/daily-tm-acceptance.test.js
const assert = require('assert');
const W = require('../workflow.js');
const SA = require('../sa-rules.js');
const { ORDER, CYCLE } = W;

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('ok -', name); };
const IP = { role: 'IELP_ADMIN', name: 'Admin IELP' };
const TM = { role: 'VPLD_TM', name: 'TM VPLD (tm1)' };
const PLANNER = { role: 'PLANNER', name: 'Planner VPLD' };
const SUP = 'PT. Pusaka Bahari Mandiri';
const master = { trucks: [{ plate: 'B1UIZ', supplier: SUP, licenseDate: '2027-01-15', type: 'TRAILER', status: 'Active' }],
  drivers: [{ userId: 'DRV-1', name: 'ASEP', supplier: SUP, truck: 'B1UIZ', active: true }] };
const LP = { role: 'SUPPLIER', lpAdmin: true, supplier: SUP, name: 'LP Admin PBM' };
const DRV = { role: 'DRIVER', userId: 'DRV-1', name: 'ASEP', supplier: SUP, truck: 'B1UIZ' };
const t0 = new Date(2026, 10, 16, 8, 0);
const ok = r => assert.ok(r.ok, JSON.stringify(r.errors || r));

function finished(no, byLp) {
  const ctx = { orders: [], master };
  const o = W.newOrder({ date: '2026-11-16', type: 'DTP2', supplier: SUP, from: 'Depo A', to: 'CY B', renban: '70001', shift: 'DAY', planned: 1 }, IP, t0, no, 'DTP');
  ctx.orders.push(o);
  if (byLp) ok(W.perform(o, 'lpRelease', { reason: 'Release manual oleh LP', driver: 'DRV-1' }, LP, t0, ctx));
  else ok(W.perform(o, 'assignTruck', { truck: 'B1UIZ' }, IP, t0, ctx));
  const a = byLp ? LP : DRV, r = byLp ? { reason: 'Driver app bermasalah' } : {};
  if (!byLp) ok(W.perform(o, 'startOrder', {}, DRV, t0, ctx));
  ok(W.perform(o, 'pickup', { ...r, container: 'SELU4384522' }, a, t0, ctx));
  ok(W.perform(o, 'finishCycle', r, a, t0, ctx));
  ok(W.perform(o, 'finishOrder', r, a, new Date(2026, 10, 16, 10, 5), ctx));
  return { o, ctx };
}

test('status sequence: Waiting TM Acceptance between Start Daily Order and Finish Daily Order', () => {
  const i = W.ORDER_SEQ.indexOf(ORDER.WAIT_TM);
  assert.strictEqual(W.ORDER_SEQ[i - 1], ORDER.START);
  assert.strictEqual(W.ORDER_SEQ[i + 1], ORDER.FIN);
});

test('driver scan Finish Order -> Waiting TM Acceptance, finish scan recorded', () => {
  const { o } = finished('N1');
  assert.strictEqual(o.status, ORDER.WAIT_TM);
  assert.strictEqual(W.current(o).status, CYCLE.FIN);
  assert.deepStrictEqual([o.finishScan.by, o.finishScan.byLp], ['ASEP', false]);
});

test('LP Admin manual Finish Order also waits for TM acceptance', () => {
  const { o } = finished('N2', true);
  assert.strictEqual(o.status, ORDER.WAIT_TM);
  assert.strictEqual(o.finishScan.byLp, true);
});

test('Waiting TM Acceptance is not eligible for SA Approval', () => {
  const { o } = finished('N3');
  assert.strictEqual(SA.eligible(o, ORDER.FIN), false);
  assert.ok(W.blockReason(o, 'saApprove', PLANNER, { orders: [o], master }));
  assert.ok(W.blockReason(o, 'processSA', { role: 'SYSTEM', name: 'B' }, { orders: [o], master }));
});

test('only VPLD TM can accept; other roles see no Accept action', () => {
  const { o, ctx } = finished('N4');
  [IP, PLANNER, LP, DRV].forEach(a => assert.ok(!W.available(o, a, ctx).includes('tmAccept'), a.role));
  assert.ok(W.available(o, TM, ctx).includes('tmAccept'));
  const r = W.tmAcceptMany([{ orderNo: 'N4' }], PLANNER, t0, ctx);
  assert.deepStrictEqual([r.ok, r.message], [false, W.TM_MSG.noAuth]);
  assert.strictEqual(o.status, ORDER.WAIT_TM);
});

test('accept -> Finish Daily Order with accepted by / date and history, then SA eligible', () => {
  const { o, ctx } = finished('N5');
  const when = new Date(2026, 10, 16, 11, 0);
  const r = W.tmAcceptMany([{ orderNo: 'N5', version: W.rowVersion(o) }], TM, when, ctx);
  assert.ok(r.ok); assert.strictEqual(r.message, W.TM_MSG.ok(1));
  assert.strictEqual(o.status, ORDER.FIN);
  assert.deepStrictEqual(o.tmAccepted, { by: TM.name, at: when });
  const h = o.history[o.history.length - 1];
  assert.deepStrictEqual([h.action, h.role, h.to.startsWith(ORDER.FIN)], ['Accept Finish Order', 'VPLD TM', true]);
  assert.strictEqual(SA.eligible(o, ORDER.FIN), true);
});

test('empty selection', () => {
  const r = W.tmAcceptMany([], TM, t0, { orders: [], master });
  assert.deepStrictEqual([r.ok, r.code, r.message], [false, 'EMPTY', W.TM_MSG.none]);
});

test('bulk is all-or-nothing: one order already accepted -> nothing accepted', () => {
  const a = finished('B1'), b = finished('B2');
  const ctx = { orders: [a.o, b.o], master };
  const items = [{ orderNo: 'B1', version: W.rowVersion(a.o) }, { orderNo: 'B2', version: W.rowVersion(b.o) }];
  ok(W.perform(b.o, 'tmAccept', {}, TM, t0, ctx)); // accepted meanwhile by another TM user
  items[1].version = W.rowVersion(b.o);
  const r = W.tmAcceptMany(items, TM, t0, ctx);
  assert.deepStrictEqual([r.ok, r.code, r.message], [false, 'REVALIDATION', W.TM_MSG.failed(1, 2)]);
  assert.match(r.failed[0].msg, /no longer Waiting TM Acceptance/);
  assert.strictEqual(a.o.status, ORDER.WAIT_TM);
});

test('concurrency: row changed after display (version) -> refused', () => {
  const { o, ctx } = finished('V1');
  const v = W.rowVersion(o);
  W.log(o, t0, IP, 'other change', { order: o.status }, { order: o.status });
  const r = W.tmAcceptMany([{ orderNo: 'V1', version: v }], TM, t0, ctx);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.failed[0].msg, W.TM_MSG.version('V1'));
  assert.strictEqual(o.status, ORDER.WAIT_TM);
});

test('VPLD TM sees all orders (view) but cannot do LP / IELP actions', () => {
  const { o, ctx } = finished('R1');
  assert.ok(W.canView(TM, o));
  assert.strictEqual(W.roleLabel(TM), 'VPLD TM');
  assert.ok(W.blockReason(o, 'finishOrder', TM, ctx));
});

console.log(`\n${pass} tests passed`);
