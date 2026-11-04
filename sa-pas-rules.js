// ELIPS TC-PBR SA Monitoring: ELIPS -> PAS interface and PAS feedback rules. Pure logic (no DOM),
// used by sa-monitoring.js and tests/sa-monitoring.test.js. Rule IDs (SM-xx) match docs/sa-monitoring-spec.md.
// Only PAS / integration fields are written here; the approved SA snapshot (SA Number, deliveries, route, KM,
// ELIPS PO, rate, cost, approval) is never changed (SM-10).
(function (root) {
  const STATUS = { NOT_SENT: 'NOT_SENT', PROCESSING: 'PROCESSING', SENT: 'SENT', PR_RECEIVED: 'PR_RECEIVED', PO_RECEIVED: 'PO_RECEIVED', COMPLETED: 'COMPLETED', FAILED: 'FAILED' };
  const LABEL = { NOT_SENT: 'Not Sent', PROCESSING: 'Processing', SENT: 'Sent - Waiting PAS', PR_RECEIVED: 'PR Received', PO_RECEIVED: 'PO Received', COMPLETED: 'Completed', FAILED: 'Failed' };
  const SA_RE = /^ILS\/TR\/[A-Z0-9]{2,5}\/\d{6}\d{4}$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const SEND_ERR = { unavailable: ['PAS_UNAVAILABLE', 'PAS service unavailable'], timeout: ['TIMEOUT', 'No response from PAS within the timeout (TBD)'],
    invalid: ['INVALID_REQUEST', 'PAS rejected the request format'], rejected: ['PAS_REJECTED', 'PAS rejected the SA data'] };
  const WBS = ['CS', 'RRE', 'RRR', 'SP', 'CE', 'CI'];

  const init = () => ({ status: STATUS.NOT_SENT, prNo: '', prDate: '', poNo: '', interfaceAt: null, correlationId: '', attempts: 0,
    lastFeedbackAt: null, feedbackStatus: '', errorCode: '', errorMessage: '', updatedAt: null, version: 1 });
  function log(h, at, actor, event, prev, next, extra = {}) {
    (h.pasLog = h.pasLog || []).push(Object.assign({ at, actor, event, prev, next, correlationId: h.pas.correlationId || '', errorCode: '', errorMessage: '' }, extra));
  }
  // SM-07 interface status from the PAS values received (only when the last step was not a failure)
  const fromValues = p => p.prNo && p.poNo ? STATUS.COMPLETED : p.prNo ? STATUS.PR_RECEIVED : p.poNo ? STATUS.PO_RECEIVED : STATUS.SENT;

  // ---------- Send SA to PAS (SM-04, SM-05, SM-13) ----------
  // opts: { at, actor: {role, name}, result: 'ok' | 'unavailable' | 'timeout' | 'invalid' | 'rejected', canRetry(actor) }
  function send(h, opts) {
    const p = h.pas, at = opts.at, who = opts.actor.name;
    if (![STATUS.NOT_SENT, STATUS.FAILED].includes(p.status)) return { ok: false, status: 409, code: 'NOT_SENDABLE', message: `SA ${h.saNo} is ${p.status}, cannot be sent` };
    if (p.status === STATUS.FAILED && opts.actor.role !== 'SYSTEM' && !opts.canRetry(opts.actor)) return { ok: false, status: 403, code: 'FORBIDDEN', message: 'Retry Interface needs the retry authorization' };
    if (p.status === STATUS.FAILED && (p.prNo || p.poNo)) return { ok: false, status: 409, code: 'PAS_STEP_FAILED', message: 'PAS already returned data; the failed PAS step is handled in PAS (no resend)' };
    if (!SA_RE.test(h.saNo) || !h.details?.length || !(h.totalCost > 0)) {
      const prev = p.status; Object.assign(p, { status: STATUS.FAILED, errorCode: 'INVALID_REQUEST', errorMessage: 'SA data incomplete (SA Number / deliveries / cost)', updatedAt: at });
      log(h, at, who, 'PAS_REQUEST_FAILED', prev, p.status, { errorCode: p.errorCode, errorMessage: p.errorMessage });
      return { ok: false, status: 422, code: 'INVALID_REQUEST', message: p.errorMessage };
    }
    const prev = p.status;
    p.correlationId = p.correlationId || `ELIPS-SA-${h.saNo.replace(/\//g, '-')}`; // stable over retries: PAS can de-duplicate
    p.attempts++; p.status = STATUS.PROCESSING;
    log(h, at, who, 'SA_SENT_TO_PAS', prev, STATUS.PROCESSING, { note: `attempt ${p.attempts}` });
    const err = SEND_ERR[opts.result];
    if (err) {
      Object.assign(p, { status: STATUS.FAILED, errorCode: err[0], errorMessage: err[1], updatedAt: at });
      log(h, at, who, 'PAS_REQUEST_FAILED', STATUS.PROCESSING, STATUS.FAILED, { errorCode: err[0], errorMessage: err[1] });
      return { ok: false, status: 502, code: err[0], message: err[1] };
    }
    Object.assign(p, { status: STATUS.SENT, interfaceAt: at, errorCode: '', errorMessage: '', updatedAt: at });
    log(h, at, who, 'PAS_REQUEST_SUCCESS', STATUS.PROCESSING, STATUS.SENT);
    return { ok: true, status: 200, code: 'SENT', message: `SA ${h.saNo} sent to PAS` };
  }

  // ---------- PAS feedback (SM-06 .. SM-12) ----------
  // fb: { feedbackId, saNo, correlationId, type: 'PR' | 'PO' | 'PR_PO' | 'ERROR', prNo, prDate, poNo, errorCode, errorMessage }
  // store: { sas[], processed{} }   opts: { at, uniquePr (default true), uniquePo (default false), dbFail }
  const res = (status, code, message, extra) => Object.assign({ status, code, message, changed: false }, extra || {});
  function applyFeedback(store, fb, opts) {
    const at = opts.at, uniquePr = opts.uniquePr !== false, uniquePo = !!opts.uniquePo;
    if (!fb || !fb.feedbackId || !fb.saNo || !['PR', 'PO', 'PR_PO', 'ERROR'].includes(fb.type)) return res(400, 'INVALID_FORMAT', 'Feedback id, SA Number and type are mandatory');
    if (store.processed[fb.feedbackId]) return Object.assign({}, store.processed[fb.feedbackId], { duplicate: true, changed: false, code: 'DUPLICATE', message: `Feedback ${fb.feedbackId} already processed, ignored` });
    const h = store.sas.find(s => s.saNo === fb.saNo);
    if (!h) return res(404, 'UNKNOWN_SA', `SA ${fb.saNo} not found in ELIPS`);
    const p = h.pas;
    const reject = (status, code, message) => {
      if (opts.dbFail) return res(500, 'DB_ERROR', 'Database update failed, feedback not saved (PAS may resend)');
      Object.assign(p, { feedbackStatus: 'REJECTED', errorCode: code, errorMessage: message, lastFeedbackAt: at, updatedAt: at });
      log(h, at, 'PAS', 'PAS_FEEDBACK_FAILED', p.status, p.status, { errorCode: code, errorMessage: message, feedbackId: fb.feedbackId });
      const r = res(status, code, message); store.processed[fb.feedbackId] = r; return r;
    };
    if (fb.correlationId && p.correlationId && fb.correlationId !== p.correlationId) return reject(409, 'CORRELATION_MISMATCH', `Correlation ID ${fb.correlationId} does not match ${p.correlationId}`);
    if (p.status === STATUS.NOT_SENT) return reject(409, 'NOT_SENT', 'Feedback received for an SA that was not sent to PAS');
    const next = { prNo: p.prNo, prDate: p.prDate, poNo: p.poNo };
    const events = [];
    if (fb.type === 'ERROR') {
      if (!fb.errorCode) return reject(422, 'INVALID_FORMAT', 'Error feedback without error code');
    } else {
      if (fb.type !== 'PO') {
        if (!fb.prNo) return reject(422, 'MISSING_PR_NO', 'PR feedback without PAS PR Number');
        if (!fb.prDate || !DATE_RE.test(fb.prDate)) return reject(422, 'MISSING_PR_DATE', 'PR feedback without valid PAS PR Date (YYYY-MM-DD)');
        if (p.prNo && (p.prNo !== fb.prNo || p.prDate !== fb.prDate)) return reject(409, 'PR_CONFLICT', `PAS PR ${fb.prNo} / ${fb.prDate} differs from stored ${p.prNo} / ${p.prDate}; not overwritten`);
        if (uniquePr && store.sas.some(s => s !== h && s.pas.prNo === fb.prNo)) return reject(409, 'DUPLICATE_PR', `PAS PR Number ${fb.prNo} is already used by another SA`);
        if (!p.prNo) events.push('PAS_PR_RECEIVED');
        Object.assign(next, { prNo: fb.prNo, prDate: fb.prDate });
      }
      if (fb.type !== 'PR') {
        if (!fb.poNo) return reject(422, 'MISSING_PO_NO', 'PO feedback without PAS PO Number');
        if (p.poNo && p.poNo !== fb.poNo) return reject(409, 'PO_CONFLICT', `PAS PO ${fb.poNo} differs from stored ${p.poNo}; not overwritten`);
        if (uniquePo && store.sas.some(s => s !== h && s.pas.poNo === fb.poNo)) return reject(409, 'DUPLICATE_PO', `PAS PO Number ${fb.poNo} is already used by another SA`);
        if (!p.poNo) events.push('PAS_PO_RECEIVED');
      }
      if (fb.type !== 'PR') next.poNo = fb.poNo;
    }
    if (opts.dbFail) return res(500, 'DB_ERROR', 'Database update failed, feedback not saved (PAS may resend)');
    const prev = p.status;
    if (fb.type === 'ERROR') {
      Object.assign(p, { status: STATUS.FAILED, feedbackStatus: 'ERROR', errorCode: fb.errorCode, errorMessage: fb.errorMessage || '', lastFeedbackAt: at, updatedAt: at, version: p.version + 1 });
      log(h, at, 'PAS', 'PAS_FEEDBACK_FAILED', prev, p.status, { errorCode: fb.errorCode, errorMessage: fb.errorMessage || '', feedbackId: fb.feedbackId });
      const r = res(200, 'PAS_ERROR_RECORDED', `PAS error ${fb.errorCode} recorded`, { changed: true }); store.processed[fb.feedbackId] = r; return r;
    }
    const status = fromValues(next);
    const changed = events.length > 0 || status !== prev;
    Object.assign(p, next, { status, feedbackStatus: 'RECEIVED', errorCode: '', errorMessage: '', lastFeedbackAt: at, updatedAt: at, version: p.version + (changed ? 1 : 0) });
    events.forEach(ev => log(h, at, 'PAS', ev, prev, status, { feedbackId: fb.feedbackId }));
    if (status === STATUS.COMPLETED && prev !== STATUS.COMPLETED) log(h, at, 'PAS', 'PAS_PROCESS_COMPLETED', prev, status, { feedbackId: fb.feedbackId });
    const r = res(200, changed ? 'UPDATED' : 'NO_CHANGE', changed ? `SA ${h.saNo}: ${status}` : 'Same PAS values already stored', { changed, poReceived: events.includes('PAS_PO_RECEIVED') });
    store.processed[fb.feedbackId] = r;
    return r;
  }

  // SM-14 feedback overdue (visual only): sent / PR received and no feedback for more than `hours`
  const overdue = (p, now, hours) => [STATUS.SENT, STATUS.PR_RECEIVED, STATUS.PO_RECEIVED].includes(p.status) && now - new Date(p.lastFeedbackAt || p.interfaceAt) > hours * 3600000;

  // WBS split of a delivery cost by the service type of its cycles (mock rule, source WBS Consumption Master TBD)
  function wbsSplit(cost, services) {
    const n = services.length, pct = {}, amt = {};
    WBS.forEach(k => { pct[k] = 0; amt[k] = 0; });
    if (!n || cost == null) return { pct, amt };
    const cnt = {}; services.forEach(s => { cnt[s] = (cnt[s] || 0) + 1; });
    const keys = Object.keys(cnt).filter(k => WBS.includes(k));
    let rest = cost;
    keys.forEach((k, i) => { pct[k] = Math.round(cnt[k] / n * 10000) / 100; amt[k] = i === keys.length - 1 ? rest : Math.round(cost * cnt[k] / n); rest -= amt[k]; });
    return { pct, amt };
  }

  const api = { STATUS, LABEL, WBS, SA_RE, init, send, applyFeedback, fromValues, overdue, wbsSplit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SAPAS = api;
})(typeof window !== 'undefined' ? window : this);
