// Unit tests for the Delivery Note rules (dn-rules.js) and PDF renderer (dn-pdf.js). Run: node tests/delivery-note.test.js
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
const look = { sjNo: (o, i) => `261027C2PBM${100 + i}`, phone: () => '87894756019', saNo: o => o.saNo || '', loc: (o, n) => n, keterangan: () => 'PENGIRIMAN CONTAINER' };
const canView = (a, o) => a.role === 'IP_ADMIN' || (a.role === 'SUPPLIER' && a.supplier === o.supplier);
let NOW = new Date('2026-11-03T01:00:00Z');
const mkCtx = orders => ({ orders, canView, look, generate: (m, at) => { gens++; return DNPDF.render(jsPDF, m, at); }, now: () => NOW });
const IP = { role: 'IP_ADMIN' }, PBM = { role: 'SUPPLIER', supplier: 'PBM' }, SRL = { role: 'SUPPLIER', supplier: 'SRL' };
const req = (id, o = {}) => Object.assign({ deliveryId: id, token: 't', actor: IP, simulate: '' }, o);
const tests = [];
const test = (n, f) => tests.push([n, f]);

test('missing(): complete delivery has no missing field', () => assert.deepStrictEqual(DN.missing(order()), []));
test('missing(): lists every empty mandatory field', () => {
  const m = DN.missing(order({ truck: '', driver: '-', cycles: [{ from: 'A', to: 'B', startAt: null }] }));
  assert.deepStrictEqual(m, ['Nama (Driver)', 'No Polisi', 'Cycle (minimal 1 cycle sudah Start)']);
  assert.deepStrictEqual(DN.missing(order({ cycles: [{ from: '', to: 'B', startAt: at(7) }] })), ['Lokasi Asal (Cycle 1)']);
});
test('model(): one Surat Jalan page per started cycle, reference layout fields only', () => {
  const m = DN.model(order({ saNo: 'ILS/TC/PBM/26102701' }), look);
  assert.strictEqual(m.pages.length, 2);
  assert.deepStrictEqual(m.pages[0].left, [['Nama', 'BUDI'], ['No. Telp', '87894756019'], ['No Polisi', 'B9001UIZ'], ['Tanggal', '27 October 2026']]);
  assert.deepStrictEqual(m.pages[0].right, [['SA Number', 'ILS/TC/PBM/26102701'], ['No Order', '261027C20000020425'], ['No Cycle Order', '261027C2PBM100'], ['Cycle', '1']]);
  assert.deepStrictEqual(m.pages[0].columns, ['NO', 'LOKASI ASAL', 'LOKASI TUJUAN', 'CTR NO', 'KETERANGAN']);
  assert.deepStrictEqual(m.pages[0].rows, [['1', 'Depo Cakung Marunda', '(Empty) CY TMMIN Sunter 1', 'SELU4384522', 'PENGIRIMAN CONTAINER']]);
  assert.deepStrictEqual(m.pages[1].rows[0].slice(3, 4), ['-']);
  assert.strictEqual(DN.model(order(), look).pages[0].right[0][1], '-');
  assert.strictEqual(DN.model(order(), look, 1).pages.length, 1);
});
test('API 200: Base64 decodes to a valid PDF, same data gives same document (View = Download)', () => {
  const c = mkCtx([order()]), a = DN.api(req('261027C20000020425'), c), b = DN.api(req('261027C20000020425'), c);
  NOW = new Date('2026-11-03T02:00:00Z'); const d = DN.api(req('261027C20000020425'), c);
  assert.strictEqual(d.body.dataHash, a.body.dataHash); assert.notStrictEqual(d.body.base64, a.body.base64);
  assert.strictEqual(a.body.pages, 2);
  assert.strictEqual(a.status, 200);
  assert.strictEqual(DN.checkPdfBase64(a.body.base64), null);
  assert.strictEqual(Buffer.from(a.body.base64, 'base64').toString('binary').slice(0, 5), '%PDF-');
  assert.strictEqual(a.body.base64, b.body.base64);
  assert.strictEqual(a.body.size, Buffer.from(a.body.base64, 'base64').length);
  assert.strictEqual(a.body.fileName, 'SJ_261027C20000020425.pdf');
  assert.strictEqual(DN.api(req('261027C20000020425', { cycle: 0 }), c).body.fileName, 'SJ_261027C20000020425_C1.pdf');
});
test('API on-the-fly: every call regenerates from latest data', () => {
  const o = order(), c = mkCtx([o]); gens = 0;
  const a = DN.api(req(o.orderNo), c); o.cycles[1].container = 'TGCU1234560';
  const b = DN.api(req(o.orderNo), c);
  assert.strictEqual(gens, 2);
  assert.notStrictEqual(a.body.dataHash, b.body.dataHash);
});
test('API errors: 400 missing / invalid, 401, 404', () => {
  const c = mkCtx([order()]);
  assert.strictEqual(DN.api(req(''), c).body.error, 'MISSING_PARAMETER');
  assert.strictEqual(DN.api(req("261027C2' OR 1=1"), c).body.error, 'INVALID_PARAMETER');
  assert.strictEqual(DN.api(req('261027C20000020425', { token: '' }), c).status, 401);
  assert.strictEqual(DN.api(req('261027C29999999999'), c).status, 404);
});
test('API security: other trucking company gets 403 and no Base64', () => {
  const c = mkCtx([order()]), r = DN.api(req('261027C20000020425', { actor: SRL }), c);
  assert.strictEqual(r.status, 403); assert.strictEqual(r.body.base64, undefined);
  assert.strictEqual(DN.api(req('261027C20000020425', { actor: PBM }), c).status, 200);
});
test('API 422 incomplete data, 500 generation failure / corrupt, 503, 504', () => {
  const c = mkCtx([order(), order({ orderNo: '261027C20000020426', driver: '' })]);
  const r = DN.api(req('261027C20000020426'), c);
  assert.strictEqual(r.status, 422); assert.deepStrictEqual(r.body.missingFields, ['Nama (Driver)']);
  assert.strictEqual(DN.api(req('261027C20000020425', { simulate: 'genfail' }), c).body.error, 'GENERATION_FAILED');
  assert.strictEqual(DN.api(req('261027C20000020425', { simulate: 'corrupt' }), c).body.error, 'CORRUPTED_PDF');
  assert.strictEqual(DN.api(req('261027C20000020425', { simulate: 'unavailable' }), c).status, 503);
  assert.strictEqual(DN.api(req('261027C20000020425', { simulate: 'timeout' }), c).status, 504);
});
test('checkPdfBase64(): rejects invalid Base64 and non-PDF content', () => {
  assert.strictEqual(DN.checkPdfBase64('not base64!'), 'INVALID_BASE64');
  assert.strictEqual(DN.checkPdfBase64(Buffer.from('hello world!').toString('base64')), 'CORRUPTED_PDF');
});
test('PAS attach: idempotent retry, failure then retry, replace on change', () => {
  const o = order(), c = mkCtx([o]), store = {};
  const f = DN.attachPAS(store, DN.api(req(o.orderNo), c), { fail: 'timeout' });
  assert.strictEqual(f.ok, false); assert.strictEqual(store[o.orderNo].status, 'Failed'); assert.strictEqual(store[o.orderNo].dataHash, null);
  assert.strictEqual(DN.attachPAS(store, DN.api(req(o.orderNo), c)).code, 'ATTACHED');
  NOW = new Date('2026-11-04T05:00:00Z'); // retry later: printed date differs, data same
  assert.strictEqual(DN.attachPAS(store, DN.api(req(o.orderNo), c)).code, 'ALREADY_ATTACHED');
  assert.strictEqual(store[o.orderNo].revisions, 1);
  o.cycles[1].container = 'TGCU1234560';
  assert.strictEqual(DN.attachPAS(store, DN.api(req(o.orderNo), c)).code, 'REPLACED');
  assert.strictEqual(Object.keys(store).length, 1); assert.strictEqual(store[o.orderNo].revisions, 2);
});
test('PAS attach: refused when API did not return a valid PDF', () => {
  const store = {}, c = mkCtx([order({ driver: '' })]);
  assert.strictEqual(DN.attachPAS(store, DN.api(req('261027C20000020425'), c)).code, 'NO_PDF');
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
