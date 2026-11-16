// [CR] Edit & Approve Finish Order by VPLD Transportation Management (workflow.js). Run: node tests/daily-tm-approval.test.js
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
const master = { trucks: [{ plate: 'B1UIZ', supplier: SUP, licenseDate: '2027-01-15', type: 'TRAILER', status: 'Active' },
    { plate: 'B2UIZ', supplier: SUP, licenseDate: '2027-02-15', type: 'TRAILER', status: 'Active' }, { plate: 'B3OLD', supplier: SUP, licenseDate: '2026-01-01', type: 'TRAILER', status: 'Active' },
    { plate: 'B9OTH', supplier: 'PT. Other', licenseDate: '2027-01-15', type: 'TRAILER', status: 'Active' }],
  drivers: [{ userId: 'DRV-1', name: 'ASEP', supplier: SUP, truck: 'B1UIZ', active: true }, { userId: 'DRV-2', name: 'BUDI', supplier: SUP, truck: 'B2UIZ', active: true },
    { userId: 'DRV-X', name: 'OFF', supplier: SUP, truck: '', active: false }] };
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

test('status sequence: Waiting TM Approval between Start Daily Order and Finish Daily Order', () => {
  const i = W.ORDER_SEQ.indexOf(ORDER.WAIT_TM);
  assert.strictEqual(W.ORDER_SEQ[i - 1], ORDER.START);
  assert.strictEqual(W.ORDER_SEQ[i + 1], ORDER.FIN);
});

test('driver scan Finish Order -> Waiting TM Approval, finish scan recorded', () => {
  const { o } = finished('N1');
  assert.strictEqual(o.status, ORDER.WAIT_TM);
  assert.strictEqual(W.current(o).status, CYCLE.FIN);
  assert.deepStrictEqual([o.finishScan.by, o.finishScan.byLp], ['ASEP', false]);
});

test('LP Admin manual Finish Order also waits for TM approval', () => {
  const { o } = finished('N2', true);
  assert.strictEqual(o.status, ORDER.WAIT_TM);
  assert.strictEqual(o.finishScan.byLp, true);
});

test('Waiting TM Approval is not eligible for SA Approval', () => {
  const { o } = finished('N3');
  assert.strictEqual(SA.eligible(o, ORDER.FIN), false);
  assert.ok(W.blockReason(o, 'saApprove', PLANNER, { orders: [o], master }));
  assert.ok(W.blockReason(o, 'processSA', { role: 'SYSTEM', name: 'B' }, { orders: [o], master }));
});

test('only VPLD TM can approve; other roles see no Approve action', () => {
  const { o, ctx } = finished('N4');
  [IP, PLANNER, LP, DRV].forEach(a => assert.ok(!W.available(o, a, ctx).includes('tmApprove'), a.role));
  assert.ok(W.available(o, TM, ctx).includes('tmApprove'));
  const r = W.tmApproveMany([{ orderNo: 'N4' }], PLANNER, t0, ctx);
  assert.deepStrictEqual([r.ok, r.message], [false, W.TM_MSG.noAuth]);
  assert.strictEqual(o.status, ORDER.WAIT_TM);
});

test('approve -> Finish Daily Order with approved by / date and history, then SA eligible', () => {
  const { o, ctx } = finished('N5');
  const when = new Date(2026, 10, 16, 11, 0);
  const r = W.tmApproveMany([{ orderNo: 'N5', version: W.rowVersion(o) }], TM, when, ctx);
  assert.ok(r.ok); assert.strictEqual(r.message, W.TM_MSG.ok(1));
  assert.strictEqual(o.status, ORDER.FIN);
  assert.deepStrictEqual(o.tmApproved, { by: TM.name, at: when });
  const h = o.history[o.history.length - 1];
  assert.deepStrictEqual([h.action, h.role, h.to.startsWith(ORDER.FIN)], ['Approve Finish Order', 'VPLD TM', true]);
  assert.strictEqual(SA.eligible(o, ORDER.FIN), true);
});

test('empty selection', () => {
  const r = W.tmApproveMany([], TM, t0, { orders: [], master });
  assert.deepStrictEqual([r.ok, r.code, r.message], [false, 'EMPTY', W.TM_MSG.none]);
});

test('bulk is all-or-nothing: one order already approved -> nothing approved', () => {
  const a = finished('B1'), b = finished('B2');
  const ctx = { orders: [a.o, b.o], master };
  const items = [{ orderNo: 'B1', version: W.rowVersion(a.o) }, { orderNo: 'B2', version: W.rowVersion(b.o) }];
  ok(W.perform(b.o, 'tmApprove', {}, TM, t0, ctx)); // approved meanwhile by another TM user
  items[1].version = W.rowVersion(b.o);
  const r = W.tmApproveMany(items, TM, t0, ctx);
  assert.deepStrictEqual([r.ok, r.code, r.message], [false, 'REVALIDATION', W.TM_MSG.failed(1, 2)]);
  assert.match(r.failed[0].msg, /no longer Waiting TM Approval/);
  assert.strictEqual(a.o.status, ORDER.WAIT_TM);
});

test('concurrency: row changed after display (version) -> refused', () => {
  const { o, ctx } = finished('V1');
  const v = W.rowVersion(o);
  W.log(o, t0, IP, 'other change', { order: o.status }, { order: o.status });
  const r = W.tmApproveMany([{ orderNo: 'V1', version: v }], TM, t0, ctx);
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

// ---------- Edit ----------
const now = new Date(2026, 10, 16, 12, 0);
const h = (hh, mm = 0) => new Date(2026, 10, 16, hh, mm);
const edit = (o, ctx, over = {}) => Object.assign({ ...W.tmEditData(o, ctx), reason: 'Container salah ketik oleh driver' }, over);

test('edit: changes saved with before / after, status stays Waiting TM Approval, edited flag + history', () => {
  const { o, ctx } = finished('E1');
  const p = edit(o, ctx, { truck: 'B2UIZ', driver: 'DRV-2', remarks: 'cek ulang', cycles: [{ container: 'TGCU5529491', startAt: h(8), pickupAt: h(8, 30), finishAt: h(9, 40) }], finishAt: h(10) });
  const r = W.tmEdit(o, p, TM, now, ctx, W.rowVersion(o));
  ok(r);
  assert.strictEqual(o.status, ORDER.WAIT_TM);
  assert.deepStrictEqual([o.truck, o.driver, o.cycles[0].container, o.finishRemarks], ['B2UIZ', 'BUDI', 'TGCU5529491', 'cek ulang']);
  assert.deepStrictEqual(o.tmEdited, { by: TM.name, at: now });
  const f = r.changes.map(c => c.field);
  ['License Plate', 'Driver', 'Container No.', 'Pickup time', 'Finish Cycle time', 'Finish Order time', 'Remarks'].forEach(x => assert.ok(f.includes(x), x));
  assert.deepStrictEqual(r.changes.find(c => c.field === 'Container No.'), { field: 'Container No.', cycle: 1, old: 'SELU4384522', new: 'TGCU5529491' });
  const last = o.history[o.history.length - 1];
  assert.deepStrictEqual([last.action, last.reason, last.from === last.to], ['Edit Finish Order', 'Container salah ketik oleh driver', true]);
  assert.strictEqual(r.message, W.TM_MSG.saved('E1', r.changes.length));
});

test('edit: reason mandatory, no change, role, status, version', () => {
  const { o, ctx } = finished('E2');
  assert.strictEqual(W.tmEditCheck(o, edit(o, ctx, { reason: 'short', truck: 'B2UIZ' }), TM, ctx, now).errors.reason, W.TM_MSG.reason);
  assert.strictEqual(W.tmEditCheck(o, edit(o, ctx), TM, ctx, now).errors._, W.TM_MSG.noChange);
  assert.strictEqual(W.tmEditCheck(o, edit(o, ctx, { truck: 'B2UIZ' }), PLANNER, ctx, now).errors._, W.TM_MSG.noAuth);
  const v = W.rowVersion(o); W.log(o, t0, IP, 'other', { order: o.status }, { order: o.status });
  assert.strictEqual(W.tmEditCheck(o, edit(o, ctx, { truck: 'B2UIZ' }), TM, ctx, now, v).errors._, W.TM_MSG.version('E2'));
  ok(W.tmApproveMany([{ orderNo: 'E2' }], TM, now, ctx));
  const r = W.tmEditCheck(o, edit(o, ctx, { truck: 'B2UIZ' }), TM, ctx, now);
  assert.deepStrictEqual([r.code, r.errors._], ['STATUS', W.TM_MSG.status(o)]); // locked after approval
  assert.ok(!W.available(o, TM, ctx).includes('tmEdit'));
});

test('edit: master data, container and time validation', () => {
  const { o, ctx } = finished('E3');
  const e = W.tmEditCheck(o, edit(o, ctx, { truck: 'B9OTH', driver: 'DRV-X', remarks: 'x'.repeat(501),
    cycles: [{ container: 'SELU4384523', startAt: h(9), pickupAt: h(8), finishAt: h(13) }], finishAt: h(7) }), TM, ctx, now).errors;
  assert.match(e.truck, /not registered/); assert.match(e.driver, /not active or not registered/);
  assert.match(e.c0_container, /Check digit/); assert.strictEqual(e.c0_pickupAt, W.TM_MSG.timeOrder('Pickup time', 1, 'Start Cycle time of cycle 1'));
  assert.strictEqual(e.c0_finishAt, W.TM_MSG.future('Finish Cycle time of cycle 1')); assert.strictEqual(e.remarks, W.TM_MSG.remarks);
  assert.match(W.tmEditCheck(o, edit(o, ctx, { truck: 'B3OLD' }), TM, ctx, now).errors.truck, /License of truck B3OLD expired/);
  assert.match(W.tmEditCheck(o, edit(o, ctx, { finishAt: h(7) }), TM, ctx, now).errors.finishAt, /must not be earlier than Finish Cycle time/);
});

test('edit then approve: SA sees the edited data', () => {
  const { o, ctx } = finished('E4');
  ok(W.tmEdit(o, edit(o, ctx, { cycles: [{ ...W.tmEditData(o, ctx).cycles[0], container: 'TGCU5529491' }] }), TM, now, ctx));
  ok(W.tmApproveMany([{ orderNo: 'E4', version: W.rowVersion(o) }], TM, now, ctx));
  assert.strictEqual(o.status, ORDER.FIN); assert.ok(o.tmEdited && o.tmApproved);
  assert.strictEqual(SA.eligible(o, ORDER.FIN), true); assert.strictEqual(o.cycles[0].container, 'TGCU5529491');
  assert.ok(!W.perform(o, 'tmEdit', {}, TM, now, ctx).ok); // edit only through tmEdit()
});

console.log(`\n${pass} tests passed`);
