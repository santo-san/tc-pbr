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
const sjNo = (o, i) => `${o.orderNo.slice(0, 8)}PBM${100 + i}`;
const canView = (a, o) => a.role === 'IP_ADMIN' || (a.role === 'SUPPLIER' && a.supplier === o.supplier);
const mkCtx = orders => ({ orders, canView, sjNo, generate: m => { gens++; return DNPDF.render(jsPDF, m); }, now: () => new Date('2026-11-03T01:00:00Z') });
const IP = { role: 'IP_ADMIN' }, PBM = { role: 'SUPPLIER', supplier: 'PBM' }, SRL = { role: 'SUPPLIER', supplier: 'SRL' };
const req = (id, o = {}) => Object.assign({ deliveryId: id, token: 't', actor: IP, simulate: '' }, o);
const tests = [];
const test = (n, f) => tests.push([n, f]);

test('missing(): complete delivery has no missing field', () => assert.deepStrictEqual(DN.missing(order()), []));
test('missing(): lists every empty mandatory field', () => {
  const m = DN.missing(order({ truck: '', driver: '-', cycles: [{ from: 'A', to: 'B', startAt: null }] }));
  assert.deepStrictEqual(m, ['Police No', 'Driver', 'Cycle (minimal 1 cycle sudah Start)']);
});
test('model(): only started cycles, fields from the Surat Jalan only', () => {
  const m = DN.model(order(), sjNo);
  assert.strictEqual(m.rows.length, 2);
  assert.deepStrictEqual(m.rows[0], ['1', '261027C2PBM100', 'SELU4384522', 'Depo Cakung Marunda', '(Empty) CY TMMIN Sunter 1', '27/10/2026 07:00', '27/10/2026 08:00', '27/10/2026 09:00']);
  assert.deepStrictEqual(m.rows[1].slice(2), ['-', '(Empty) CY TMMIN Sunter 1', 'Depo Cakung Marunda', '27/10/2026 10:00', '-', '-']);
  assert.deepStrictEqual(m.header.map(h => h[0]), ['Tanggal', 'No. Order', 'Trucking Company', 'Police No / Driver']);
  assert.strictEqual(DN.model(order(), sjNo, 1).rows.length, 1);
});
test('API 200: Base64 decodes to a valid PDF, same data gives same bytes (View = Download)', () => {
  const c = mkCtx([order()]), a = DN.api(req('261027C20000020425'), c), b = DN.api(req('261027C20000020425'), c);
  assert.strictEqual(a.status, 200);
  assert.strictEqual(DN.checkPdfBase64(a.body.base64), null);
  assert.strictEqual(Buffer.from(a.body.base64, 'base64').toString('binary').slice(0, 5), '%PDF-');
  assert.strictEqual(a.body.base64, b.body.base64);
  assert.strictEqual(a.body.size, Buffer.from(a.body.base64, 'base64').length);
  assert.strictEqual(a.body.fileName, 'DN_261027C20000020425.pdf');
});
test('API on-the-fly: every call regenerates from latest data', () => {
  const o = order(), c = mkCtx([o]); gens = 0;
  const a = DN.api(req(o.orderNo), c); o.cycles[1].container = 'TGCU1234560';
  const b = DN.api(req(o.orderNo), c);
  assert.strictEqual(gens, 2);
  assert.notStrictEqual(a.body.checksum, b.body.checksum);
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
  assert.strictEqual(r.status, 422); assert.deepStrictEqual(r.body.missingFields, ['Driver']);
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
  assert.strictEqual(f.ok, false); assert.strictEqual(store[o.orderNo].status, 'Failed'); assert.strictEqual(store[o.orderNo].checksum, null);
  assert.strictEqual(DN.attachPAS(store, DN.api(req(o.orderNo), c)).code, 'ATTACHED');
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
