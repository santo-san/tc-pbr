// Unit tests for TC-PBR DTP Creation (Universal DTP). Run: node tests/dtp-creation.test.js
const assert = require('assert');
const D = require('../dtp-rules.js'), W = require('../workflow.js');
let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok ${n} - ${name}`); };
const ctx = { lps: ['PNJ', 'PBM', 'SRL'], from: ['D1', 'D2', 'D3'], to: ['K1E', 'S1E'], containerError: W.containerError };
const planner = { role: 'PLANNER', name: 'Planner VPLD' };
const cfg = { backdateDays: 3, advanceDays: 14 };
const good = { roundUse: 'N', lp: 'PNJ', renban: 'C1244', from: 'D1', to: 'K1E', dest: 'STM', etd: '2026-11-10', ctrSize: '40 HC', agent: 'CMA',
  bookNo: '89902678188223993', vessel: 'CMA', truckType: 'TRAILER', container: '', shift: 'DAY', dg: 'DG', arrDate: '2026-11-11', arrTime: '08:00:00', io: 'EXPORT' };
// Template rows as read by SheetJS (header in row 7 as in format_DTP2_1.xlsx)
const head = ['No', 'ROUNDUSE *', 'LP*', 'RENBAN*', 'FROM LOCATION*', 'TO LOCATION *', 'DESTINATION *', 'ETD *', 'CONTAINER SIZE *', 'SHIPPING AGENT', 'CTR BOOKING NO',
  'VESSEL NAME', 'TRUCK TYPE *', 'CONTAINER NO', 'DESCRIPTION', 'SHIFT ', 'CTR DG FLAG', 'ARRIVAL DATE', 'ARRIVAL TIME'];
const sheet = rows => [[], [null, null, 'PT. TOYOTA MOTOR MANUFACTURING INDONESIA'], [], [], [], [], head, ...rows];
const row = (i, o = {}) => { const g = { ...good, ...o }; return [i, g.roundUse, g.lp, g.renban, g.from, g.to, g.dest, new Date(2026, 10, 10), g.ctrSize, g.agent, g.bookNo, g.vessel, g.truckType, g.container, '', g.shift, g.dg, new Date(2026, 10, 11), g.arrTime]; };

test('date range from System Master: backdate / advance, not configured', () => {
  assert.deepStrictEqual(D.dateRange('2026-11-02', cfg), { min: '2026-10-30', max: '2026-11-16' });
  assert.strictEqual(D.dateCheck('2026-11-02', '2026-11-02', cfg), null);
  assert.strictEqual(D.dateCheck('2026-10-29', '2026-11-02', cfg), D.MSG.backdate('29-Oct-2026', 3));
  assert.strictEqual(D.dateCheck('2026-11-17', '2026-11-02', cfg), D.MSG.advance('17-Nov-2026', 14));
  assert.strictEqual(D.dateCheck('2026-11-02', '2026-11-02', {}), D.MSG.noConfig);
});

test('only the VPLD Planner may create DTP', () => {
  assert(D.canCreate(planner) && !D.canCreate({ role: 'IP_ADMIN' }) && !D.canCreate({ role: 'SUPPLIER', lpAdmin: true }));
});

test('field validation: required, options, data mapping, format, container check digit', () => {
  assert.deepStrictEqual(D.validate(good, ctx).errors, {});
  const e = D.validate({ ...good, lp: 'XYZ', from: 'D9', to: 'K1E', ctrSize: '30', roundUse: 'X', etd: '', container: 'ABCU1234567', arrTime: '25:00', io: '' }, ctx).errors;
  assert(e.lp.includes('not registered') && e.from.includes('not registered') && e.ctrSize.includes('not valid') && e.roundUse.includes('not valid'));
  assert.strictEqual(e.etd, D.MSG.req('ETD')); assert.strictEqual(e.io, D.MSG.req('IMPORT/EXPORT'));
  assert(e.container.includes('Check digit')); assert.strictEqual(e.arrTime, D.MSG.time('ARRIVAL TIME'));
  assert.strictEqual(D.validate({ ...good, to: 'D1', from: 'D1' }, { ...ctx, to: ['D1'] }).errors.to, D.MSG.same);
  assert.strictEqual(D.validate({ ...good, container: 'cmau 123456-7' }, ctx).record.container, 'CMAU1234567');
});

test('Excel upload: template header in row 7, dates converted, Operation Type from the screen', () => {
  const res = D.upload(sheet([row(1), row(2, { bookNo: '89902678188223991', ctrSize: '40', dg: '' })]), { io: 'EXPORT', grid: [], ctx });
  assert(res.ok, JSON.stringify(res));
  assert.strictEqual(res.records.length, 2); assert.strictEqual(res.records[0].etd, '2026-11-10'); assert.strictEqual(res.records[0].arrTime, '08:00');
  assert.strictEqual(res.records[0].io, 'EXPORT'); assert.strictEqual(res.records[0].row, 8);
});

test('Excel serial dates and times are converted', () => {
  const r = D.normalize({ ...good, etd: 46336, arrDate: 46337.5, arrTime: 0.3333333333 });
  assert.strictEqual(r.etd, '2026-11-10'); assert.strictEqual(r.arrDate, '2026-11-11'); assert.strictEqual(r.arrTime, '08:00');
});

test('Excel upload: invalid format or rows reject the whole file with row-level errors', () => {
  assert.strictEqual(D.upload([['A', 'B'], [1, 2]], { io: 'IMPORT', grid: [], ctx }).error, D.MSG.header('ROUNDUSE'));
  assert.strictEqual(D.upload([head.filter(h => h !== 'LP*'), [1]], { io: 'IMPORT', grid: [], ctx }).error, D.MSG.header('LP'));
  assert.strictEqual(D.upload(sheet([]), { io: 'IMPORT', grid: [], ctx }).error, D.MSG.empty);
  const bad = D.upload(sheet([row(1), row(2, { lp: '', bookNo: '89902678188223993' })]), { io: 'IMPORT', grid: [], ctx });
  assert(!bad.ok && bad.records === undefined);
  assert.deepStrictEqual(bad.rowErrors.map(e => [e.row, e.column]), [[9, 'LP'], [9, 'BOOKING']]);
  assert.strictEqual(bad.error, D.MSG.uploadErr(1));
});

test('duplicates against grid and submitted records', () => {
  const grid = [D.makeRecord(good, { id: 1, date: '2026-11-10', source: D.SOURCE.IPMS, grid: [], ctx })];
  const again = D.upload(sheet([row(1)]), { io: 'EXPORT', grid, ctx });
  assert(again.rowErrors[0].message.includes('already exists in the grid'));
  D.submit([grid[0]], { at: new Date(), actor: planner, date: '2026-11-10', today: '2026-11-02', cfg });
  const sub = D.upload(sheet([row(1)]), { io: 'EXPORT', grid, ctx });
  assert(sub.rowErrors[0].message.includes('has already been submitted'));
  grid[0].status = D.STATUS.FAILED;   // failed records do not block a new upload
  assert(D.upload(sheet([row(1)]), { io: 'EXPORT', grid, ctx }).ok);
});

test('interface records keep Validation Error and can be corrected', () => {
  const grid = [];
  const r = D.makeRecord({ ...good, lp: '' }, { id: 7, date: '2026-11-10', source: D.SOURCE.IPMS, grid, ctx });
  assert.strictEqual(r.status, D.STATUS.ERROR); assert(!D.selectable(r));
  grid.push(r);
  assert(!D.revalidate(r, { lp: 'ABC' }, grid, ctx).ok);
  assert(D.revalidate(r, { lp: 'PBM' }, grid, ctx).ok); assert.strictEqual(r.status, D.STATUS.AVAILABLE); assert(D.selectable(r));
});

test('submit: eligible only, authorized, inside the date range; no second submission', () => {
  const recs = [1, 2].map(i => D.makeRecord({ ...good, bookNo: `B${i}` }, { id: i, date: '2026-11-10', source: D.SOURCE.EXCEL, grid: [], ctx }));
  assert.strictEqual(D.submit(recs, { at: new Date(), actor: { role: 'IP_ADMIN', name: 'x' }, date: '2026-11-10', today: '2026-11-02', cfg }).error, D.MSG.noAuth);
  assert.strictEqual(D.submit(recs, { at: new Date(), actor: planner, date: '2026-12-31', today: '2026-11-02', cfg }).error, D.MSG.advance('31-Dec-2026', 14));
  assert.strictEqual(D.submit([], { at: new Date(), actor: planner, date: '2026-11-10', today: '2026-11-02', cfg }).error, D.MSG.noSelect);
  assert(D.submit(recs, { at: new Date(), actor: planner, date: '2026-11-10', today: '2026-11-02', cfg }).ok);
  assert(recs.every(r => r.status === D.STATUS.SUBMITTED && !D.selectable(r)));
  assert.strictEqual(D.submit(recs, { at: new Date(), actor: planner, date: '2026-11-10', today: '2026-11-02', cfg }).error, D.MSG.notEligible(2));
  assert(!D.revalidate(recs[0], { lp: 'PBM' }, recs, ctx).ok);
});

test('queue: processed record becomes a Daily order in Planning Order; failed can be retried', () => {
  const r = D.makeRecord(good, { id: 1, date: '2026-11-10', source: D.SOURCE.MANUAL, grid: [], ctx });
  D.submit([r], { at: new Date(), actor: planner, date: '2026-11-10', today: '2026-11-02', cfg });
  D.step(r, D.STATUS.QUEUED, new Date()); D.step(r, D.STATUS.PROCESSING, new Date()); D.step(r, D.STATUS.FAILED, new Date(), 'timeout');
  assert(D.canRetry(r));
  D.step(r, D.STATUS.QUEUED, new Date()); D.step(r, D.STATUS.PROCESSED, new Date());
  const p = D.orderPayload(r, { lp: c => `LP ${c}`, from: c => `F ${c}`, to: c => `T ${c}` });
  const o = W.newOrder(p, planner, new Date(), 'X1', 'DTP Creation (Universal)');
  assert.strictEqual(o.status, W.ORDER.PLAN); assert.strictEqual(W.current(o).status, W.CYCLE.DTP);
  assert.strictEqual(o.supplier, 'LP PNJ'); assert.strictEqual(o.planned, 1); assert.deepStrictEqual(r.history.map(h => h.status), ['Submitted', 'Queued', 'Processing', 'Failed', 'Queued', 'Processed']);
});

test('calendar status of the orders of a date', () => {
  const o = s => ({ status: s, truck: '', lpRejected: null });
  assert.strictEqual(D.calStatus([o(W.ORDER.PLAN)], W), D.CAL.WAIT);
  assert.strictEqual(D.calStatus([{ ...o(W.ORDER.PLAN), lpRejected: { reason: 'x' } }, o(W.ORDER.REL)], W), D.CAL.REJECTED);
  assert.strictEqual(D.calStatus([o(W.ORDER.REL), o(W.ORDER.START)], W), D.CAL.ASSIGNED);
  assert.strictEqual(D.calStatus([o(W.ORDER.FIN), o(W.ORDER.PO)], W), D.CAL.FINISH);
  assert.strictEqual(D.calLabel('Universal', '2026-11-10', [o(W.ORDER.REL), o(W.ORDER.PLAN)], W), 'DTP - U ( 10/11/2026 ) [ 1 / 2 ]');
});

test('LP Admin can reject a planned order; the planner flow sees Rejected by LP', () => {
  const ord = W.newOrder({ date: '2026-11-10', type: 'Universal', supplier: 'PT. Puninar Jaya', from: 'a', to: 'b', renban: 'C1', shift: 'DAY', planned: 1 }, planner, new Date(), 'X2', 'DTP');
  const lp = { role: 'SUPPLIER', lpAdmin: true, supplier: 'PT. Puninar Jaya', name: 'LP Admin PNJ' };
  const c = { orders: [ord], master: { trucks: [], drivers: [] } };
  assert(!W.perform(ord, 'lpReject', { reason: 'short' }, lp, new Date(), c).ok);
  assert(W.perform(ord, 'lpReject', { reason: 'Truck tidak tersedia untuk shift ini' }, lp, new Date(), c).ok);
  assert(ord.lpRejected && W.blockReason(ord, 'assignTruck', { role: 'IP_ADMIN', name: 'IP' }, c).includes('ditolak LP'));
});

console.log(`\n${n} tests passed`);
