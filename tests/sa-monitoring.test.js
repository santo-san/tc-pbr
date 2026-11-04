// Unit tests for the SA Monitoring / PAS interface rules (sa-pas-rules.js). Run: node tests/sa-monitoring.test.js
const assert = require('assert');
const P = require('../sa-pas-rules.js');
const SA = require('../sa-rules.js');

const at = h => new Date(2026, 10, 4, h, 0);
const SYS = { role: 'SYSTEM', name: 'PAS Interface' }, VPLD = { role: 'PLANNER', name: 'planner1' }, IP = { role: 'IP_ADMIN', name: 'admin' };
const canRetry = a => a.role === 'IP_ADMIN';
const sa = (no = 'ILS/TR/DNX/2611040001', over = {}) => Object.assign({
  saNo: no, lpCode: 'DNX', poNo: 'PO-RATE-001', totalKm: 100, totalCost: 2000000, currency: 'IDR', approvedAt: at(9),
  details: [{ orderNo: 'DLV-001', totalKm: 100, rate: 20000, cost: 2000000, poNo: 'PO-RATE-001', route: 'D3S1' }], pas: P.init(), pasLog: [],
}, over);
const store = (...sas) => ({ sas, processed: {} });
const sent = (h = sa()) => { P.send(h, { at: at(10), actor: SYS, result: 'ok', canRetry }); return h; };
const fb = (o) => Object.assign({ feedbackId: 'F1', saNo: 'ILS/TR/DNX/2611040001', type: 'PR', prNo: 'PR-001', prDate: '2026-11-04' }, o);
const tests = [];
const test = (n, f) => tests.push([n, f]);

test('approved SA starts NOT_SENT with SA Det No (SA Approval)', () => {
  const o = { orderNo: 'A', date: '2026-11-03', supplier: 'D', status: 'F', saNo: '', cycles: [{ from: 'x', to: 'y', finishAt: at(8) }] };
  const c = { orders: [o], finStatus: 'F', lpCode: () => 'DNX', locCode: n => n.toUpperCase(), mileage: () => ({ km: 100, status: 'ACTIVE' }),
    pos: [{ poNo: 'PO-RATE-001', type: 'TC-PBR', lpCode: 'DNX', validFrom: '2026-11-01', validTo: '2026-11-30', status: 'Approved', ratePerKm: 20000, currency: 'IDR' }],
    sas: [], seq: {}, requests: {}, scope: 'LP_DATE', canApprove: () => true, commitOrder: x => { x.saNo = 'set'; } };
  assert.ok(SA.approve({ orderNos: ['A'] }, VPLD, at(9), c).ok);
  assert.strictEqual(c.sas[0].pas.status, 'NOT_SENT'); assert.strictEqual(c.sas[0].details[0].detNo, '2611C00001');
  assert.strictEqual(c.sas[0].pas.prNo, ''); assert.strictEqual(c.sas[0].poNo, 'PO-RATE-001');
});
test('send: NOT_SENT -> SENT with stable correlation id; second send refused', () => {
  const h = sa(), r = P.send(h, { at: at(10), actor: SYS, result: 'ok', canRetry });
  assert.ok(r.ok); assert.strictEqual(h.pas.status, 'SENT'); assert.strictEqual(h.pas.correlationId, 'ELIPS-SA-ILS-TR-DNX-2611040001');
  assert.deepStrictEqual(h.pasLog.map(e => e.event), ['SA_SENT_TO_PAS', 'PAS_REQUEST_SUCCESS']);
  assert.strictEqual(P.send(h, { at: at(11), actor: SYS, result: 'ok', canRetry }).code, 'NOT_SENDABLE');
});
test('send failures -> FAILED with error; retry needs authorization and keeps correlation id', () => {
  [['unavailable', 'PAS_UNAVAILABLE'], ['timeout', 'TIMEOUT'], ['invalid', 'INVALID_REQUEST'], ['rejected', 'PAS_REJECTED']].forEach(([res, code]) => {
    const h = sa(); P.send(h, { at: at(10), actor: SYS, result: res, canRetry });
    assert.deepStrictEqual([h.pas.status, h.pas.errorCode], ['FAILED', code]);
  });
  const h = sa(); P.send(h, { at: at(10), actor: SYS, result: 'timeout', canRetry }); const cid = h.pas.correlationId;
  assert.strictEqual(P.send(h, { at: at(11), actor: VPLD, result: 'ok', canRetry }).status, 403);
  assert.ok(P.send(h, { at: at(11), actor: IP, result: 'ok', canRetry }).ok);
  assert.strictEqual(h.pas.correlationId, cid); assert.strictEqual(h.pas.attempts, 2); assert.strictEqual(h.pas.errorCode, '');
});
test('send: invalid SA data is not sent', () => {
  const h = sa('ILS/TR/DNX/2611040001', { totalCost: null });
  assert.strictEqual(P.send(h, { at: at(10), actor: SYS, result: 'ok', canRetry }).code, 'INVALID_REQUEST');
  assert.strictEqual(P.send(sa('BAD-NO'), { at: at(10), actor: SYS, result: 'ok', canRetry }).code, 'INVALID_REQUEST');
});
test('staged feedback: PR then PO updates the same SA to COMPLETED; snapshot unchanged', () => {
  const h = sent(), s = store(h);
  const r1 = P.applyFeedback(s, fb({ correlationId: h.pas.correlationId }), { at: at(11) });
  assert.strictEqual(r1.code, 'UPDATED'); assert.deepStrictEqual([h.pas.status, h.pas.prNo, h.pas.prDate, h.pas.poNo], ['PR_RECEIVED', 'PR-001', '2026-11-04', '']);
  const r2 = P.applyFeedback(s, fb({ feedbackId: 'F2', type: 'PO', poNo: 'PO-001', prNo: undefined }), { at: at(12) });
  assert.ok(r2.poReceived); assert.strictEqual(h.pas.status, 'COMPLETED'); assert.strictEqual(h.pas.poNo, 'PO-001');
  assert.deepStrictEqual([h.poNo, h.totalCost, h.totalKm, h.details[0].rate], ['PO-RATE-001', 2000000, 100, 20000]);
  assert.deepStrictEqual(h.pasLog.map(e => e.event).slice(2), ['PAS_PR_RECEIVED', 'PAS_PO_RECEIVED', 'PAS_PROCESS_COMPLETED']);
  assert.strictEqual(s.sas.length, 1);
});
test('PR + PO in one feedback; PO before PR gives PO_RECEIVED', () => {
  const h = sent(); P.applyFeedback(store(h), fb({ type: 'PR_PO', poNo: 'PO-001' }), { at: at(11) });
  assert.strictEqual(h.pas.status, 'COMPLETED');
  const g = sent(); P.applyFeedback(store(g), fb({ type: 'PO', poNo: 'PO-9' }), { at: at(11) });
  assert.strictEqual(g.pas.status, 'PO_RECEIVED');
});
test('idempotency: same feedback id ignored; same values with new id = NO_CHANGE', () => {
  const h = sent(), s = store(h);
  P.applyFeedback(s, fb(), { at: at(11) }); const v = h.pas.version, n = h.pasLog.length;
  const d = P.applyFeedback(s, fb(), { at: at(12) });
  assert.ok(d.duplicate); assert.strictEqual(h.pas.version, v); assert.strictEqual(h.pasLog.length, n);
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'F9' }), { at: at(12) }).code, 'NO_CHANGE');
});
test('conflicting values are not overwritten (PR and PO)', () => {
  const h = sent(), s = store(h);
  P.applyFeedback(s, fb({ type: 'PR_PO', poNo: 'PO-001' }), { at: at(11) });
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'F2', prNo: 'PR-XXX' }), { at: at(12) }).code, 'PR_CONFLICT');
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'F3', type: 'PO', poNo: 'PO-XXX' }), { at: at(12) }).code, 'PO_CONFLICT');
  assert.deepStrictEqual([h.pas.prNo, h.pas.poNo, h.pas.status, h.pas.feedbackStatus], ['PR-001', 'PO-001', 'COMPLETED', 'REJECTED']);
});
test('invalid feedback: format, unknown SA, correlation, not sent, missing PR No / Date / PO No', () => {
  const h = sent(), s = store(h, sa('ILS/TR/DNX/2611040002'));
  assert.strictEqual(P.applyFeedback(s, { saNo: h.saNo }, { at: at(11) }).code, 'INVALID_FORMAT');
  assert.strictEqual(P.applyFeedback(s, fb({ type: 'X' }), { at: at(11) }).code, 'INVALID_FORMAT');
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'U', saNo: 'ILS/TR/XXX/2611049999' }), { at: at(11) }).status, 404);
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'C', correlationId: 'WRONG' }), { at: at(11) }).code, 'CORRELATION_MISMATCH');
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'N', saNo: 'ILS/TR/DNX/2611040002' }), { at: at(11) }).code, 'NOT_SENT');
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'M1', prNo: '' }), { at: at(11) }).code, 'MISSING_PR_NO');
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'M2', prDate: '' }), { at: at(11) }).code, 'MISSING_PR_DATE');
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'M3', prDate: '04/11/2026' }), { at: at(11) }).code, 'MISSING_PR_DATE');
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'M4', type: 'PO', poNo: '' }), { at: at(11) }).code, 'MISSING_PO_NO');
  assert.deepStrictEqual([h.pas.status, h.pas.prNo, h.pas.feedbackStatus], ['SENT', '', 'REJECTED']);
});
test('duplicate PAS PR Number across SA refused; PAS PO shared allowed unless uniquePo', () => {
  const a = sent(), b = sent(sa('ILS/TR/DNX/2611040002')), s = store(a, b);
  P.applyFeedback(s, fb({ type: 'PR_PO', poNo: 'PO-001' }), { at: at(11) });
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'B1', saNo: b.saNo }), { at: at(11) }).code, 'DUPLICATE_PR');
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'B2', saNo: b.saNo, type: 'PO', poNo: 'PO-001' }), { at: at(11), uniquePo: true }).code, 'DUPLICATE_PO');
  assert.strictEqual(P.applyFeedback(s, fb({ feedbackId: 'B3', saNo: b.saNo, type: 'PO', poNo: 'PO-001' }), { at: at(11) }).code, 'UPDATED');
});
test('PAS error feedback (PR / PO creation failed) -> FAILED, PAS values kept, no resend', () => {
  const h = sent(), s = store(h);
  P.applyFeedback(s, fb(), { at: at(11) });
  P.applyFeedback(s, { feedbackId: 'E1', saNo: h.saNo, type: 'ERROR', errorCode: 'PO_CREATION_FAILED', errorMessage: 'x' }, { at: at(12) });
  assert.deepStrictEqual([h.pas.status, h.pas.prNo, h.pas.errorCode], ['FAILED', 'PR-001', 'PO_CREATION_FAILED']);
  assert.strictEqual(P.send(h, { at: at(13), actor: IP, result: 'ok', canRetry }).code, 'PAS_STEP_FAILED');
  P.applyFeedback(s, fb({ feedbackId: 'F5', type: 'PO', poNo: 'PO-001' }), { at: at(14) });
  assert.strictEqual(h.pas.status, 'COMPLETED'); // PAS fixed it and sent the PO later
});
test('database failure during feedback: nothing changed, same feedback can be processed again', () => {
  const h = sent(), s = store(h);
  assert.strictEqual(P.applyFeedback(s, fb(), { at: at(11), dbFail: true }).status, 500);
  assert.deepStrictEqual([h.pas.status, h.pas.prNo], ['SENT', '']); assert.deepStrictEqual(s.processed, {});
  assert.strictEqual(P.applyFeedback(s, fb(), { at: at(12) }).code, 'UPDATED');
});
test('overdue flag and WBS split', () => {
  const h = sent();
  assert.ok(!P.overdue(h.pas, at(20), 24)); assert.ok(P.overdue(h.pas, new Date(2026, 10, 5, 11), 24));
  assert.deepStrictEqual(P.wbsSplit(1000, ['CE', 'CE']).pct.CE, 100);
  const w = P.wbsSplit(1001, ['CE', 'SP']);
  assert.deepStrictEqual([w.pct.CE, w.pct.SP, w.amt.CE + w.amt.SP], [50, 50, 1001]);
  assert.strictEqual(P.wbsSplit(null, ['CE']).amt.CE, 0);
});

let fail = 0;
for (const [n, f] of tests) { try { f(); console.log('ok  -', n); } catch (e) { fail++; console.log('FAIL-', n, '\n   ', e.message); } }
console.log(`\n${tests.length - fail}/${tests.length} passed`);
process.exit(fail ? 1 : 0);
