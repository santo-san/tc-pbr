// Unit tests for DTP Maintenance (calendar entry > DTP n List: edit / cancel while the driver has not started). Run: node tests/dtp-maintenance.test.js
const assert = require('assert');
const D = require('../dtp-rules.js');
const W = require('../workflow.js');

const LP = { TCA: 'PT Trucking A', TCB: 'PT Trucking B' }, FROM = { D1: 'Depo Sunter', D3: 'Depo Cakung Marunda' }, TO = { S1E: 'CY TMMIN Sunter (EMPTY)', K1E: 'CY TMMIN Karawang (EMPTY)' };
const rev = m => n => Object.keys(m).find(k => m[k] === n) || n;
const names = { lp: c => LP[c] || c, from: c => FROM[c] || c, to: c => TO[c] || c, lpCode: rev(LP), fromCode: rev(FROM), toCode: rev(TO) };
const vctx = { lps: Object.keys(LP), from: Object.keys(FROM), to: Object.keys(TO), containerError: W.containerError };
const planner = { role: 'PLANNER', name: 'Planner VPLD' }, at = new Date('2026-11-11T08:00:00');
const raw = { io: 'EXPORT', roundUse: 'N', lp: 'TCA', renban: 'TMP', from: 'D3', to: 'S1E', dest: 'TMP', etd: '2026-11-12', ctrSize: '40 HC', agent: 'MAERSK',
  bookNo: '26895701', vessel: 'AS NARA', truckType: 'TRAILER', description: 'VANNING', shift: '', dg: '', arrDate: '2026-11-11', arrTime: '00:30' };
let seq = 0;
function setup() {
  const r = D.makeRecord(raw, { id: ++seq, date: '2026-11-11', source: D.SOURCE.EXCEL, grid: [], ctx: vctx });
  r.status = D.STATUS.PROCESSED; r.orderNo = 'ORD' + seq;
  const o = W.newOrder(D.orderPayload(r, names), planner, at, r.orderNo, 'DTP Creation (Universal DTP)');
  o.dtp = { recId: r.id };
  const orders = [o], recs = [r];
  const ctx = { at, actor: planner, W, vctx, names, removeOrder: x => orders.splice(orders.indexOf(x), 1), removeRecord: x => recs.splice(recs.indexOf(x), 1) };
  return { r, o, orders, recs, ctx, v: D.maintValues(o, r, names) };
}
const tests = [];
const test = (n, f) => tests.push([n, f]);

test('row values from the DTP record: Ctr Size / Ctr Type split, DG, Service Type from Import/Export', () => {
  const { v } = setup();
  assert.deepStrictEqual([v.ctrSize, v.ctrType, v.dg, v.serviceType, v.lp, v.from, v.to], ['40', 'HC', 'N', 'CONTAINER FOR EXPORT', 'TCA', 'D3', 'S1E']);
  assert.deepStrictEqual([D.maintToRecord(v).ctrSize, D.maintToRecord(v).io, D.maintToRecord({ ...v, dg: 'Y' }).dg], ['40 HC', 'EXPORT', 'DG']);
});
test('MT-01 edit / cancel allowed in Planning Order and Order Release, not after the driver started', () => {
  const { o } = setup();
  assert.strictEqual(D.maintCheck(o, W), null);
  o.status = W.ORDER.REL; o.truck = 'B1234XX';
  assert.strictEqual(D.maintCheck(o, W), null);
  o.cycles[0].startAt = at;
  assert.strictEqual(D.maintCheck(o, W).code, 'DRIVER_STARTED');
  assert.strictEqual(D.maintCheck(null, W).code, 'NOT_FOUND');
});
test('MT-04 cancel removes the Daily order and the DTP record (KPI no longer consumed)', () => {
  const s = setup();
  const res = D.maintSave([{ key: s.o.orderNo, o: s.o, r: s.r, cancel: true }], s.ctx);
  assert.deepStrictEqual([res.ok, res.cancelled, s.orders.length, s.recs.length], [true, 1, 0, 0]);
  assert.match(s.r.history.at(-1).note, /DTP cancelled; Daily order ORD\d+ \(Planning Order/);
});
test('MT-05 all-or-nothing: one row whose driver started blocks the whole save', () => {
  const a = setup(), b = setup();
  b.o.cycles[0].startAt = at;
  const ctx = { ...a.ctx, removeOrder: () => assert.fail('nothing may be removed') };
  const res = D.maintSave([{ key: 'A', o: a.o, r: a.r, cancel: true }, { key: 'B', o: b.o, r: b.r, values: { ...b.v, renban: 'NEW1' } }], ctx);
  assert.deepStrictEqual([res.ok, res.status, res.failed.map(f => f.code)], [false, 409, ['DRIVER_STARTED']]);
  assert.strictEqual(b.r.renban, 'TMP');
});
test('MT-03 invalid edit: 422 with errors per row and field, nothing changed', () => {
  const s = setup();
  const res = D.maintSave([{ key: 'A', o: s.o, r: s.r, values: { ...s.v, to: 'D3', renban: 'tmp-1', ctrSize: '20', ctrType: 'HC', serviceType: '' } }], s.ctx);
  assert.deepStrictEqual([res.ok, res.status, Object.keys(res.errors.A).sort()], [false, 422, ['ctrType', 'renban', 'serviceType', 'to']]);
  assert.deepStrictEqual([s.r.to, s.o.to], ['S1E', TO.S1E]);
});
test('MT-04 edit updates the DTP record and the Daily order, with history', () => {
  const s = setup();
  const res = D.maintSave([{ key: 'A', o: s.o, r: s.r, values: { ...s.v, renban: 'C1201', to: 'K1E', serviceType: 'CONTAINER FOR IMPORT', shift: 'DAY', roundUse: 'Y' } }], s.ctx);
  assert.deepStrictEqual([res.ok, res.updated], [true, 1]);
  assert.deepStrictEqual([s.r.renban, s.r.to, s.r.io, s.o.renban, s.o.to, s.o.shift, s.o.planned, s.o.cycles[0].to, s.o.orderNo], ['C1201', 'K1E', 'IMPORT', 'C1201', TO.K1E, 'DAY', 2, TO.K1E, s.r.orderNo]);
  assert.match(s.o.history.at(-1).note, /renban, to, serviceType, shift|roundUse/);
  assert.strictEqual(s.o.history.at(-1).action, 'DTP Maintenance');
});
test('MT-06 another trucking company releases the truck and the LP decision', () => {
  const s = setup();
  Object.assign(s.o, { status: W.ORDER.REL, truck: 'B1234XX', driver: 'Budi', lpAccepted: { by: 'LP', at } });
  D.maintSave([{ key: 'A', o: s.o, r: s.r, values: { ...s.v, lp: 'TCB' } }], s.ctx);
  assert.deepStrictEqual([s.o.supplier, s.o.truck, s.o.driver, s.o.lpAccepted, s.o.status], [LP.TCB, '', '', false, W.ORDER.PLAN]);
  assert.match(s.o.history.at(-1).note, /truck B1234XX released/);
});
test('unchanged rows are not counted; no authorisation -> 403; DB error -> 500 and nothing applied', () => {
  const s = setup();
  assert.strictEqual(D.maintSave([{ key: 'A', o: s.o, r: s.r, values: { ...s.v } }], s.ctx).updated, 0);
  assert.strictEqual(D.maintSave([{ key: 'A', o: s.o, r: s.r, cancel: true }], { ...s.ctx, actor: { role: 'IP', name: 'IELP Admin' } }).status, 403);
  const res = D.maintSave([{ key: 'A', o: s.o, r: s.r, cancel: true }], { ...s.ctx, fail: true });
  assert.deepStrictEqual([res.status, s.orders.length, s.recs.length], [500, 1, 1]);
  assert.strictEqual(D.maintSave([], s.ctx).status, 400);
});
test('order without DTP record (other DTP types): order fields and maintenance values are kept on the order', () => {
  const o = W.newOrder({ date: '2026-11-11', type: 'DTP2', supplier: LP.TCA, from: FROM.D3, to: TO.S1E, renban: 'TMP', shift: '-', planned: 1 }, planner, at, 'SEED1');
  const ctx = { ...setup().ctx };
  const v = D.maintValues(o, null, names);
  assert.deepStrictEqual([v.lp, v.from, v.to, v.shift], ['TCA', 'D3', 'S1E', '']);
  const bad = D.maintSave([{ key: 'S', o, r: null, values: { ...v, renban: '', to: 'D3' } }], ctx);
  assert.deepStrictEqual(Object.keys(bad.errors.S).sort(), ['renban', 'to']);
  const ok = D.maintSave([{ key: 'S', o, r: null, values: { ...v, shift: 'NIGHT', agent: 'MAERSK', lp: 'TCB' } }], ctx);
  assert.deepStrictEqual([ok.updated, o.shift, o.supplier, o.maint.agent, D.maintValues(o, null, names).agent], [1, 'NIGHT', LP.TCB, 'MAERSK', 'MAERSK']);
});

test('KM-15 in maintenance: Payment Type can be changed while the driver has not started; must be a type of the company', () => {
  const s = setup(); s.r.payType = 'By Resources';
  const ctx = { ...s.ctx, payTypes: lp => lp === 'TCA' ? ['By Resources', 'By Trip'] : ['By Resources'] };
  assert.strictEqual(D.maintValues(s.o, s.r, names).payType, 'By Resources');
  const bad = D.maintSave([{ key: 'A', o: s.o, r: s.r, values: { ...s.v, payType: 'By Resources', lp: 'TCB' } }], { ...ctx, payTypes: () => ['By Trip'] });
  assert.match(bad.errors.A.payType, /TCB has no By Resources/);
  const ok = D.maintSave([{ key: 'A', o: s.o, r: s.r, values: { ...s.v, payType: 'By Trip' } }], ctx);
  assert.deepStrictEqual([ok.updated, s.r.payType, s.o.dtp.payType], [1, 'By Trip', 'By Trip']);
  assert.match(s.o.history.at(-1).note, /payType changed/);
});

let fail = 0;
for (const [n, f] of tests) { try { f(); console.log('ok  -', n); } catch (e) { fail++; console.log('FAIL-', n, '\n   ', e.message); } }
console.log(`\n${tests.length - fail}/${tests.length} passed`);
process.exit(fail ? 1 : 0);
