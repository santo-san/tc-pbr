// ELIPS Monthly PR / PO workflow: 3-level PR approval (VPLD) and PO auto approval.
// Pure logic (no DOM) so it can be used by monthly.html and tested with Node.
(function (root) {
  const LEVELS = ['SH', 'DpH', 'DH'];
  const LEVEL_NAME = { SH: 'Section Head', DpH: 'Deputy Department Head', DH: 'Department Head' };
  const AP = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', SKIP: 'Skip', NONE: '-' };
  const PR = { WAIT: lv => `Waiting ${lv}`, APPROVED: 'Approved', REJECTED: 'Rejected' };
  const PO = { PENDING: 'Pending', APPROVED: 'Approved', AUTO: 'Auto Approved', REJECTED: 'Rejected' };
  const REASON_MIN = 10;

  const blank = v => !String(v ?? '').trim();
  const reasonError = r => String(r ?? '').trim().length < REASON_MIN ? `Reason minimal ${REASON_MIN} karakter` : null;

  // ---------- PR ----------
  const currentLevel = pr => LEVELS.find(l => pr.approval[l].status === AP.PENDING) || null;
  function prStatus(pr) {
    if (LEVELS.some(l => pr.approval[l].status === AP.REJECTED)) return PR.REJECTED;
    const lv = currentLevel(pr);
    return lv ? PR.WAIT(lv) : PR.APPROVED;
  }
  const isPending = pr => prStatus(pr).startsWith('Waiting');
  // PIC = approver who must act now; otherwise the PR creator (to follow up / revise)
  const currentPic = (pr, master) => { const lv = currentLevel(pr); return lv && !isRejected(pr) ? master.approvers[lv] : pr.createdBy; };
  const isRejected = pr => prStatus(pr) === PR.REJECTED;

  function canView(actor, doc) {
    if (['IP_ADMIN', 'APPROVER', 'SYSTEM'].includes(actor.role)) return true;
    if (actor.role === 'SUPPLIER') return doc.supplierCode === actor.supplierCode;
    return false;
  }

  function newApproval(skipLevels = []) {
    return Object.fromEntries(LEVELS.map(l => [l, { status: skipLevels.includes(l) ? AP.SKIP : AP.PENDING, by: '', at: null, reason: '' }]));
  }

  function prBlock(pr, actor) {
    if (actor.role !== 'APPROVER') return 'Hanya approver VPLD (SH / DpH / DH) yang dapat approve / reject PR';
    if (isRejected(pr)) return `PR ${pr.prNo} sudah Rejected`;
    const lv = currentLevel(pr);
    if (!lv) return `PR ${pr.prNo} sudah Approved`;
    if (lv !== actor.level) return `PR ${pr.prNo} sedang menunggu approval ${lv}, bukan ${actor.level}`;
    return null;
  }

  function log(doc, at, actor, action, from, to, reason, note) {
    doc.history.push({ at, user: actor.userId, role: roleLabel(actor), action, from, to, reason: reason || '', note: note || '' });
  }

  function approvePR(pr, actor, at, ctx) {
    const block = prBlock(pr, actor);
    if (block) return { ok: false, error: block };
    const from = prStatus(pr), lv = actor.level;
    Object.assign(pr.approval[lv], { status: AP.APPROVED, by: actor.userId, at });
    let po = null;
    if (prStatus(pr) === PR.APPROVED) { po = createPO(pr, at, ctx.master, ctx.pos); ctx.pos.push(po); }
    log(pr, at, actor, `Approve ${lv}`, from, prStatus(pr), '', po ? `PO ${po.poNo} dibuat` : '');
    return { ok: true, po };
  }

  function rejectPR(pr, actor, reason, at) {
    const block = prBlock(pr, actor);
    if (block) return { ok: false, error: block };
    if (blank(reason)) return { ok: false, errors: { reason: 'Reason wajib diisi' } };
    const re = reasonError(reason);
    if (re) return { ok: false, errors: { reason: re } };
    const from = prStatus(pr), lv = actor.level;
    Object.assign(pr.approval[lv], { status: AP.REJECTED, by: actor.userId, at, reason: reason.trim() });
    LEVELS.slice(LEVELS.indexOf(lv) + 1).forEach(l => { if (pr.approval[l].status === AP.PENDING) pr.approval[l].status = AP.NONE; });
    log(pr, at, actor, `Reject ${lv}`, from, PR.REJECTED, reason.trim(), 'Kembali ke PR Creation untuk revisi');
    return { ok: true };
  }

  // ---------- PO ----------
  function createPO(pr, at, master, pos) {
    const deadline = new Date(at.getTime() + master.poAutoApproveHours * 3600000);
    const po = {
      poNo: `PO${pr.prNo}`, prNo: pr.prNo, prodMonth: pr.prodMonth, ym: pr.ym, rev: pr.rev, supplierCode: pr.supplierCode, supplierName: pr.supplierName,
      percentage: pr.percentage, routes: pr.routes, qty: pr.qty, price: pr.price, poDate: at, deadline,
      status: PO.PENDING, by: '', at: null, reason: '', history: [],
    };
    log(po, at, { role: 'SYSTEM', userId: 'SYSTEM' }, 'PO dibuat dari PR Approved', '-', PO.PENDING, '',
      `Auto approve ${master.poAutoApproveHours} jam (System Master)`);
    return po;
  }

  function poBlock(po, actor, now) {
    if (actor.role !== 'SUPPLIER') return 'Hanya supplier (trucking) pemilik PO yang dapat approve / reject PO';
    if (po.supplierCode !== actor.supplierCode) return `PO ${po.poNo} bukan milik supplier Anda`;
    if (po.status !== PO.PENDING) return `PO ${po.poNo} sudah ${po.status}`;
    if (now >= po.deadline) return `Batas waktu PO ${po.poNo} sudah lewat, PO akan di-auto approve oleh sistem`;
    return null;
  }
  function approvePO(po, actor, now) {
    const block = poBlock(po, actor, now);
    if (block) return { ok: false, error: block };
    Object.assign(po, { status: PO.APPROVED, by: actor.userId, at: now });
    log(po, now, actor, 'Approve PO', PO.PENDING, PO.APPROVED);
    return { ok: true };
  }
  function rejectPO(po, actor, reason, now) {
    const block = poBlock(po, actor, now);
    if (block) return { ok: false, error: block };
    if (blank(reason)) return { ok: false, errors: { reason: 'Reason wajib diisi' } };
    const re = reasonError(reason);
    if (re) return { ok: false, errors: { reason: re } };
    Object.assign(po, { status: PO.REJECTED, by: actor.userId, at: now, reason: reason.trim() });
    log(po, now, actor, 'Reject PO', PO.PENDING, PO.REJECTED, reason.trim());
    return { ok: true };
  }
  // Scheduled job: every Pending PO whose deadline has passed becomes Auto Approved
  function runAutoApprove(pos, now) {
    const due = pos.filter(p => p.status === PO.PENDING && now >= p.deadline);
    due.forEach(p => {
      Object.assign(p, { status: PO.AUTO, by: 'SYSTEM', at: now });
      log(p, now, { role: 'SYSTEM', userId: 'SYSTEM' }, 'Auto Approve PO', PO.PENDING, PO.AUTO, '', `Batas waktu ${p.deadline.toISOString()} terlewati`);
    });
    return due;
  }

  function roleLabel(a) {
    return a.role === 'APPROVER' ? `${a.level} ${a.division || 'VPLD'}`
      : a.role === 'IP_ADMIN' ? 'IP Admin' : a.role === 'SUPPLIER' ? 'Supplier' : 'System';
  }

  const api = {
    LEVELS, LEVEL_NAME, AP, PR, PO, REASON_MIN,
    currentLevel, prStatus, isPending, currentPic, canView, newApproval, prBlock, approvePR, rejectPR,
    createPO, poBlock, approvePO, rejectPO, runAutoApprove, roleLabel,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MonthlyWorkflow = api;
})(this);
