// Unit tests for Planning Truck Assignment (LP Admin: Accept, Reject, Assign Truck, Change Truck). Run: node tests/truck-assignment.test.js
const assert = require('assert');
const W = require('../workflow.js');
let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok ${n} - ${name}`); };
const PBM = 'PT. Pusaka Bahari Mandiri', SRL = 'PT. Serasi Logistics';
const planner = { role: 'PLANNER', name: 'Planner VPLD' };
const lp = { role: 'SUPPLIER', lpAdmin: true, supplier: PBM, name: 'LP Admin PBM' };
const lpSrl = { role: 'SUPPLIER', lpAdmin: true, supplier: SRL, name: 'LP Admin SRL' };
const viewer = { role: 'SUPPLIER', lpAdmin: false, supplier: PBM, name: 'Viewer PBM' };
const at = new Date(2026, 10, 2, 9, 0);
function setup() {
  const master = {
    trucks: [
      { plate: 'B1111AAA', supplier: PBM, licenseDate: '2027-01-15', type: 'TRAILER', status: 'Active' },
      { plate: 'B2222BBB', supplier: PBM, licenseDate: '2027-02-15', type: 'TRAILER', status: 'Active' },
      { plate: 'B3333CCC', supplier: PBM, licenseDate: '2027-03-15', type: 'COMBO', status: 'Active' },
      { plate: 'B4444DDD', supplier: PBM, licenseDate: '2027-04-15', type: 'TRAILER', status: 'Maintenance' },
      { plate: 'B5555EEE', supplier: PBM, licenseDate: '2026-10-31', type: 'TRAILER', status: 'Active' },
      { plate: 'B9999SRL', supplier: SRL, licenseDate: '2027-01-15', type: 'TRAILER', status: 'Active' }],
    drivers: [{ userId: 'DRV-1', name: 'ASEP', supplier: PBM, truck: 'B1111AAA', active: true }, { userId: 'DRV-2', name: 'BUDI', supplier: PBM, truck: 'B2222BBB', active: true }],
  };
  const mk = (sup, no) => { const o = W.newOrder({ date: '2026-11-03', type: 'Universal', supplier: sup, from: 'Port Area Priok', to: 'CY TMMIN Karawang', renban: 'C1', shift: 'DAY', planned: 1 }, planner, at, no, 'DTP Creation');
    o.dtp = { truckType: 'TRAILER' }; return o; };
  const orders = [mk(PBM, 'O1'), mk(PBM, 'O2'), mk(SRL, 'O3')];
  return { ctx: { orders, master }, o1: orders[0], o2: orders[1], o3: orders[2] };
}
const go = (o, k, p, a, c) => W.perform(o, k, p, a, at, c);

test('new order from DTP: Waiting for Confirmation, no assignment yet', () => {
  const { o1 } = setup();
  assert.strictEqual(W.lpStatus(o1), W.LP_STATUS.WAIT); assert.strictEqual(W.assignStatus(o1), W.ASSIGN_STATUS.NONE);
});

test('LP Admin sees only orders of its trucking company; viewer / other LP cannot act', () => {
  const { ctx, o1, o3 } = setup();
  assert(W.canView(lp, o1) && !W.canView(lp, o3));
  assert(go(o1, 'lpAccept', {}, lpSrl, ctx).errors._.includes('akses'));
  assert(go(o1, 'lpAccept', {}, viewer, ctx).errors._.includes('tidak boleh'));
});

test('accept: status Accepted, Waiting for Truck Assignment; second accept blocked', () => {
  const { ctx, o1 } = setup();
  assert(go(o1, 'lpAccept', {}, lp, ctx).ok);
  assert.strictEqual(W.lpStatus(o1), W.LP_STATUS.ACC); assert.strictEqual(W.assignStatus(o1), W.ASSIGN_STATUS.WAIT);
  assert(!go(o1, 'lpAccept', {}, lp, ctx).ok);
  assert(go(o1, 'lpReject', { reason: 'Tidak ada truck tersedia hari ini' }, lp, ctx).errors._.includes('sudah di-Accept'));
});

test('reject needs a reason; rejected order cannot be accepted or assigned', () => {
  const { ctx, o1 } = setup();
  assert.strictEqual(go(o1, 'lpReject', { reason: '' }, lp, ctx).errors.reason, 'Reason wajib diisi');
  assert(go(o1, 'lpReject', { reason: 'short' }, lp, ctx).errors.reason.includes('minimal'));
  assert(go(o1, 'lpReject', { reason: 'Truck tidak tersedia untuk tanggal ini' }, lp, ctx).ok);
  assert.strictEqual(W.lpStatus(o1), W.LP_STATUS.REJ);
  assert(!go(o1, 'lpAccept', {}, lp, ctx).ok);
  assert(go(o1, 'lpAssign', { truck: 'B1111AAA' }, lp, ctx).errors._.includes('Rejected'));
});

test('no truck assignment before Accept (also not by IP Admin / Order Release)', () => {
  const { ctx, o1 } = setup();
  assert(go(o1, 'lpAssign', { truck: 'B1111AAA' }, lp, ctx).errors._.includes('Accept'));
  assert(go(o1, 'assignTruck', { truck: 'B1111AAA' }, { role: 'IP_ADMIN', name: 'IP' }, ctx).errors._.includes('Accept'));
  assert(go(o1, 'lpRelease', { reason: 'Release manual oleh LP Admin', driver: 'DRV-1' }, lp, ctx).errors._.includes('Accept'));
});

test('assign: own truck only, available, matching type; driver of the truck gets the order', () => {
  const { ctx, o1 } = setup();
  go(o1, 'lpAccept', {}, lp, ctx);
  assert(go(o1, 'lpAssign', { truck: 'B9999SRL' }, lp, ctx).errors.truck.includes('bukan milik'));
  assert(go(o1, 'lpAssign', { truck: 'B4444DDD' }, lp, ctx).errors.truck.includes('maintenance'));
  assert(go(o1, 'lpAssign', { truck: 'B5555EEE' }, lp, ctx).errors.truck.includes('Lisensi'));
  assert(go(o1, 'lpAssign', { truck: 'B3333CCC' }, lp, ctx).errors.truck.includes('tidak sesuai'));
  assert(go(o1, 'lpAssign', { truck: 'X' }, lp, ctx).errors.truck === 'Truck tidak terdaftar');
  assert(go(o1, 'lpAssign', { truck: 'B1111AAA' }, lp, ctx).ok);
  assert.strictEqual(o1.truck, 'B1111AAA'); assert.strictEqual(o1.driver, 'ASEP'); assert.strictEqual(o1.status, W.ORDER.REL);
  assert.strictEqual(W.assignStatus(o1), W.ASSIGN_STATUS.DONE);
  const drv = { role: 'DRIVER', supplier: PBM, truck: 'B1111AAA' }, other = { role: 'DRIVER', supplier: PBM, truck: 'B2222BBB' };
  assert(W.canView(drv, o1) && !W.canView(other, o1));
});

test('no duplicate active assignment: second Assign blocked, truck busy on another order of the same shift', () => {
  const { ctx, o1, o2 } = setup();
  go(o1, 'lpAccept', {}, lp, ctx); go(o1, 'lpAssign', { truck: 'B1111AAA' }, lp, ctx);
  assert(go(o1, 'lpAssign', { truck: 'B2222BBB' }, lp, ctx).errors._.includes('Assign Truck hanya bisa'));   // already Order Release: use Change Truck
  assert.strictEqual(o1.truck, 'B1111AAA');
  go(o2, 'lpAccept', {}, lp, ctx);
  assert(go(o2, 'lpAssign', { truck: 'B1111AAA' }, lp, ctx).errors.truck.includes('sudah di-assign ke order O1'));
});

test('change truck: replaces the active assignment, moves the order to the new driver, keeps audit', () => {
  const { ctx, o1 } = setup();
  go(o1, 'lpAccept', {}, lp, ctx); go(o1, 'lpAssign', { truck: 'B1111AAA' }, lp, ctx);
  assert(go(o1, 'lpChangeTruck', { truck: 'B1111AAA' }, lp, ctx).errors.truck.includes('berbeda'));
  assert(go(o1, 'lpChangeTruck', { truck: 'B2222BBB', reason: 'Truck breakdown' }, lp, ctx).ok);
  assert.strictEqual(o1.truck, 'B2222BBB'); assert.strictEqual(o1.driver, 'BUDI');
  assert(!W.canView({ role: 'DRIVER', supplier: PBM, truck: 'B1111AAA' }, o1) && W.canView({ role: 'DRIVER', supplier: PBM, truck: 'B2222BBB' }, o1));
  const h = o1.history.at(-1);
  assert.deepStrictEqual([h.action, h.plateFrom, h.plateTo, h.reason, h.actor], ['Change Truck', 'B1111AAA', 'B2222BBB', 'Truck breakdown', 'LP Admin PBM']);
  assert(h.at instanceof Date && h.lpFrom === W.LP_STATUS.ACC);
  // the old truck is free again for other orders
  assert(W.truckState(ctx.master.trucks[0], ctx.orders[1], ctx).ok);
});

test('change truck not possible after the driver started the order', () => {
  const { ctx, o1 } = setup();
  go(o1, 'lpAccept', {}, lp, ctx); go(o1, 'lpAssign', { truck: 'B1111AAA' }, lp, ctx);
  assert(go(o1, 'startOrder', {}, { role: 'DRIVER', name: 'ASEP', supplier: PBM, truck: 'B1111AAA' }, ctx).ok);
  assert(go(o1, 'lpChangeTruck', { truck: 'B2222BBB' }, lp, ctx).errors._.includes('Change Truck hanya bisa'));
});

test('audit trail records every status and truck change', () => {
  const { ctx, o1 } = setup();
  go(o1, 'lpAccept', {}, lp, ctx); go(o1, 'lpAssign', { truck: 'B1111AAA' }, lp, ctx);
  assert.deepStrictEqual(o1.history.map(h => h.action), ['DTP Creation', 'Accept Order', 'Assign Truck (LP)']);
  assert.deepStrictEqual(o1.history.slice(1).map(h => [h.lpFrom, h.lpTo, h.plateFrom, h.plateTo]),
    [[W.LP_STATUS.WAIT, W.LP_STATUS.ACC, '', ''], [W.LP_STATUS.ACC, W.LP_STATUS.ACC, '', 'B1111AAA']]);
});

console.log(`\n${n} tests passed`);
