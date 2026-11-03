// Unit tests for the Delivery Note rules (dn-rules.js) and PDF renderer (dn-pdf.js). Run: node tests/delivery-note.test.js
// One Delivery = one cycle; Delivery ID = No Cycle Order.
const assert = require('assert');
const DN = require('../dn-rules.js');
const DNPDF = require('../dn-pdf.js');
const { jsPDF } = require('../vendor/jspdf/jspdf.umd.min.js');

let gens = 0;
const at = h => new Date(2026, 9, 27, h, 0);
const order = (over = {}) => Object.assign({
  orderNo: '261027C20000020425', date: '2026-10-27', supplier: 'PBM', truck: 'B9001UIZ', driver: 'BUDI',
  cycles: [
    { from: 'Depo Cakung Marunda', to: '(Empty) CY TMMIN Sunter 1', container: 'SELU4384522', startAt: at(7), pickupAt: at(8), finishAt: at(9) },
    { from: '(Empty) CY TMMIN Sunter 1', to: 'Depo Cakung Marunda', container: '', startAt: at(10), pickupAt: null, finishAt: null },
    { from: 'Depo Cakung Marunda', to: '(Empty) CY TMMIN Sunter 1', container: '', startAt: null, pickupAt: null, finishAt: null },
  ],
}, over);
const look = { sjNo: (o, i) => `261027C2PBM${o.orderNo.slice(-1)}${10 + i}`, phone: () => '87894756019', saNo: o => o.saNo || '', loc: (o, n) => n, keterangan: () => 'PENGIRIMAN CONTAINER' };
let NOW = new Date('2026-11-03T01:00:00Z');
const mkCtx = (orders, lk = look) => ({
  resolve: id => orders.flatMap(o => o.cycles.map((c, i) => ({ o, i }))).filter(x => lk.sjNo(x.o, x.i) === id),
  canView, look: lk, generate: (m, ts) => { gens++; return DNPDF.render(jsPDF, m, ts); }, now: () => NOW,
});
const canView = (a, o) => a.role === 'IP_ADMIN' || (a.role === 'SUPPLIER' && a.supplier === o.supplier);
const IP = { role: 'IP_ADMIN' }, PBM = { role: 'SUPPLIER', supplier: 'PBM' }, SRL = { role: 'SUPPLIER', supplier: 'SRL' };
const ID1 = '261027C2PBM510', ID2 = '261027C2PBM511';
const req = (id, o = {}) => Object.assign({ deliveryId: id, token: 't', actor: IP, simulate: '' }, o);
const tests = [];
const test = (n, f) => tests.push([n, f]);

test('missing(): complete cycle has no missing field', () => assert.deepStrictEqual(DN.missing(order(), 0), []));
test('missing(): lists every empty mandatory field of the cycle', () => {
  assert.deepStrictEqual(DN.missing(order({ truck: '', driver: '-' }), 2), ['Nama (Driver)', 'No Polisi', 'Tanggal (Start Cycle)']);
  assert.deepStrictEqual(DN.missing(order({ cycles: [{ from: '', to: 'B', startAt: at(7) }] }), 0), ['Lokasi Asal']);
  assert.deepStrictEqual(DN.missing(order(), 7), ['Delivery']);
});
test('model(): one page with the reference layout fields of the selected cycle only', () => {
  const m = DN.model(order({ saNo: 'ILS/TC/PBM/26102701' }), 0, look), p = m.pages[0];
  assert.strictEqual(m.pages.length, 1); assert.strictEqual(m.deliveryId, ID1);
  assert.deepStrictEqual(p.left, [['Nama', 'BUDI'], ['No. Telp', '87894756019'], ['No Polisi', 'B9001UIZ'], ['Tanggal', '27 October 2026']]);
  assert.deepStrictEqual(p.right, [['SA Number', 'ILS/TC/PBM/26102701'], ['No Order', '261027C20000020425'], ['No Cycle Order', ID1], ['Cycle', '1']]);
  assert.deepStrictEqual(p.columns, ['NO', 'LOKASI ASAL', 'LOKASI TUJUAN', 'CTR NO', 'KETERANGAN']);
  assert.deepStrictEqual(p.rows, [['1', 'Depo Cakung Marunda', '(Empty) CY TMMIN Sunter 1', 'SELU4384522', 'PENGIRIMAN CONTAINER']]);
  const p2 = DN.model(order(), 1, look).pages[0];
  assert.strictEqual(p2.rows[0][3], '-'); assert.strictEqual(p2.right[0][1], '-'); assert.strictEqual(p2.right[3][1], '2');
});
test('API 200: Base64 decodes to a valid PDF of the requested cycle, same data = same document', () => {
  const c = mkCtx([order()]), a = DN.api(req(ID1), c), b = DN.api(req(ID1), c);
  assert.strictEqual(a.status, 200);
  assert.strictEqual(DN.checkPdfBase64(a.body.base64), null);
  assert.strictEqual(Buffer.from(a.body.base64, 'base64').toString('binary').slice(0, 5), '%PDF-');
  assert.strictEqual(a.body.base64, b.body.base64);
  assert.deepStrictEqual([a.body.deliveryId, a.body.orderNo, a.body.cycle, a.body.fileName], [ID1, '261027C20000020425', 1, `SJ_${ID1}.pdf`]);
  assert.strictEqual(a.body.size, Buffer.from(a.body.base64, 'base64').length);
  NOW = new Date('2026-11-03T02:00:00Z'); const d = DN.api(req(ID1), c);
  assert.strictEqual(d.body.dataHash, a.body.dataHash); assert.notStrictEqual(d.body.base64, a.body.base64);
  assert.notStrictEqual(DN.api(req(ID2), c).body.dataHash, a.body.dataHash);
});
test('API on-the-fly: every call regenerates from latest data', () => {
  const o = order(), c = mkCtx([o]); gens = 0;
  const a = DN.api(req(ID2), c); o.cycles[1].container = 'TGCU1234560';
  const b = DN.api(req(ID2), c);
  assert.strictEqual(gens, 2);
  assert.notStrictEqual(a.body.dataHash, b.body.dataHash);
});
test('API errors: 400 missing / invalid, 401, 404, 409 ambiguous ID', () => {
  const c = mkCtx([order()]);
  assert.strictEqual(DN.api(req(''), c).body.error, 'MISSING_PARAMETER');
  assert.strictEqual(DN.api(req("261027C2PBM510' OR 1=1"), c).body.error, 'INVALID_PARAMETER');
  assert.strictEqual(DN.api(req(ID1, { token: '' }), c).status, 401);
  assert.strictEqual(DN.api(req('261027C2PBM999'), c).status, 404);
  const dup = { ...look, sjNo: () => ID1 };
  assert.strictEqual(DN.api(req(ID1), mkCtx([order()], dup)).status, 409);
});
test('API security: other trucking company gets 403 and no Base64', () => {
  const c = mkCtx([order()]), r = DN.api(req(ID1, { actor: SRL }), c);
  assert.strictEqual(r.status, 403); assert.strictEqual(r.body.base64, undefined);
  assert.strictEqual(DN.api(req(ID1, { actor: PBM }), c).status, 200);
});
test('API 422 incomplete data, 500 generation failure / corrupt, 503, 504', () => {
  const c = mkCtx([order(), order({ orderNo: '261027C20000020426', driver: '' })]);
  const r = DN.api(req('261027C2PBM610'), c);
  assert.strictEqual(r.status, 422); assert.deepStrictEqual(r.body.missingFields, ['Nama (Driver)']);
  assert.strictEqual(DN.api(req('261027C2PBM512'), c).status, 422); // cycle 3 not started
  assert.strictEqual(DN.api(req(ID1, { simulate: 'genfail' }), c).body.error, 'GENERATION_FAILED');
  assert.strictEqual(DN.api(req(ID1, { simulate: 'corrupt' }), c).body.error, 'CORRUPTED_PDF');
  assert.strictEqual(DN.api(req(ID1, { simulate: 'unavailable' }), c).status, 503);
  assert.strictEqual(DN.api(req(ID1, { simulate: 'timeout' }), c).status, 504);
});
test('checkPdfBase64(): rejects invalid Base64 and non-PDF content', () => {
  assert.strictEqual(DN.checkPdfBase64('not base64!'), 'INVALID_BASE64');
  assert.strictEqual(DN.checkPdfBase64(Buffer.from('hello world!').toString('base64')), 'CORRUPTED_PDF');
});
test('PAS attach: idempotent retry, failure then retry, replace on change, one record per cycle', () => {
  const o = order(), c = mkCtx([o]), store = {};
  const f = DN.attachPAS(store, DN.api(req(ID1), c), { fail: 'timeout' });
  assert.strictEqual(f.ok, false); assert.strictEqual(store[ID1].status, 'Failed'); assert.strictEqual(store[ID1].dataHash, null);
  assert.strictEqual(DN.attachPAS(store, DN.api(req(ID1), c)).code, 'ATTACHED');
  NOW = new Date('2026-11-04T05:00:00Z'); // retry later: printed date differs, data same
  assert.strictEqual(DN.attachPAS(store, DN.api(req(ID1), c)).code, 'ALREADY_ATTACHED');
  assert.strictEqual(store[ID1].revisions, 1);
  o.cycles[0].container = 'TGCU1234560';
  assert.strictEqual(DN.attachPAS(store, DN.api(req(ID1), c)).code, 'REPLACED');
  assert.strictEqual(DN.attachPAS(store, DN.api(req(ID2), c)).code, 'ATTACHED');
  assert.deepStrictEqual(Object.keys(store), [ID1, ID2]); assert.strictEqual(store[ID1].revisions, 2);
  assert.strictEqual(store[ID2].cycle, 2);
});
test('PAS attach: refused when API did not return a valid PDF', () => {
  const store = {}, c = mkCtx([order({ driver: '' })]);
  assert.strictEqual(DN.attachPAS(store, DN.api(req(ID1), c)).code, 'NO_PDF');
  assert.deepStrictEqual(store, {});
});
test('guard: second request for the same delivery is blocked until the first ends', () => {
  const g = DN.createGuard();
  assert.ok(g.begin('A')); assert.ok(!g.begin('A')); assert.ok(g.begin('B'));
  g.end('A'); assert.ok(g.begin('A'));
});

let fail = 0;
for (const [n, f] of tests) { try { f(); console.log('ok  -', n); } catch (e) { fail++; console.log('FAIL-', n, '\n   ', e.message); } }
console.log(`\n${tests.length - fail}/${tests.length} passed`);
process.exit(fail ? 1 : 0);
