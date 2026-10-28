// ELIPS Monthly PR / PO workflow: 3-level PR approval (VPLD), PO approval by General Affair and auto approval.
// Pure logic (no DOM) so it can be used by monthly.html and tested with Node.
(function (root) {
  const LEVELS = ['SH', 'DpH', 'DH'];
  const LEVEL_NAME = { SH: 'Section Head', DpH: 'Deputy Department Head', DH: 'Department Head' };
  const AP = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', SKIP: 'Skip', NONE: '-' };
  const PR = { WAIT: lv => `Waiting ${lv}`, APPROVED: 'Approved', REJECTED: 'Rejected', RETURNED: 'Returned' };
  const PO = { PENDING: 'Pending', APPROVED: 'Approved', AUTO: 'Auto Approved', REJECTED: 'Rejected' };
  const REASON_MIN = 10;

  const blank = v => !String(v ?? '').trim();
  const reasonError = r => String(r ?? '').trim().length < REASON_MIN ? `Reason minimal ${REASON_MIN} karakter` : null;

  // ---------- PR ----------
  const currentLevel = pr => LEVELS.find(l => pr.approval[l].status === AP.PENDING) || null;
  function prStatus(pr) {
    if (pr.returned) return PR.RETURNED;
    if (LEVELS.some(l => pr.approval[l].status === AP.REJECTED)) return PR.REJECTED;
    const lv = currentLevel(pr);
    return lv ? PR.WAIT(lv) : PR.APPROVED;
  }
  const isPending = pr => prStatus(pr).startsWith('Waiting');
  // Current PIC is always the user who generated the PR
  const currentPic = pr => pr.createdBy;

  function canView(actor, doc) {
    if (['IP_ADMIN', 'APPROVER', 'GA', 'SYSTEM'].includes(actor.role)) return true;
    if (actor.role === 'SUPPLIER') return doc.supplierCode === actor.supplierCode;
    return false;
  }

  const newApproval = () => Object.fromEntries(LEVELS.map(l => [l, { status: AP.PENDING, by: '', at: null, reason: '' }]));
  // Lower levels still Pending when a higher level acts
  const lowerPending = (pr, lv) => LEVELS.slice(0, LEVELS.indexOf(lv)).filter(l => pr.approval[l].status === AP.PENDING);

  // A higher level may approve / reject directly; it does not have to wait for the lower levels
  function prBlock(pr, actor) {
    if (actor.role !== 'APPROVER') return 'Hanya approver VPLD (SH / DpH / DH) yang dapat approve / reject PR';
    const st = prStatus(pr);
    if (st === PR.RETURNED) return `PR ${pr.prNo} dikembalikan ke PR Creation, perlu submit ulang`;
    if (st === PR.REJECTED || st === PR.APPROVED) return `PR ${pr.prNo} sudah ${st}`;
    const mine = pr.approval[actor.level].status;
    if (mine !== AP.PENDING) return `Level ${actor.level} untuk PR ${pr.prNo} sudah ${mine}`;
    return null;
  }
  const needsMe = (pr, actor) => actor.role === 'APPROVER' && !prBlock(pr, actor);

  function log(doc, at, actor, action, from, to, reason, note) {
    doc.history.push({ at, user: actor.userId, role: roleLabel(actor), action, from, to, reason: reason || '', note: note || '' });
  }

  function approvePR(pr, actor, at, ctx) {
    const block = prBlock(pr, actor);
    if (block) return { ok: false, error: block };
    const from = prStatus(pr), lv = actor.level, skipped = lowerPending(pr, lv);
    Object.assign(pr.approval[lv], { status: AP.APPROVED, by: actor.userId, at });
    skipped.forEach(l => Object.assign(pr.approval[l], { status: AP.SKIP, at }));
    let po = null;
    if (prStatus(pr) === PR.APPROVED) { po = createPO(pr, at, ctx.master); ctx.pos.push(po); }
    const notes = [skipped.length ? `${skipped.join(', ')} Skip karena ${lv} approve langsung` : '', po ? `PO ${po.poNo} dibuat` : ''];
    log(pr, at, actor, `Approve ${lv}`, from, prStatus(pr), '', notes.filter(Boolean).join(' · '));
    return { ok: true, po };
  }

  function rejectPR(pr, actor, reason, at) {
    const block = prBlock(pr, actor);
    if (block) return { ok: false, error: block };
    if (blank(reason)) return { ok: false, errors: { reason: 'Reason wajib diisi' } };
    const re = reasonError(reason);
    if (re) return { ok: false, errors: { reason: re } };
    const from = prStatus(pr), lv = actor.level;
    lowerPending(pr, lv).forEach(l => Object.assign(pr.approval[l], { status: AP.SKIP, at }));
    Object.assign(pr.approval[lv], { status: AP.REJECTED, by: actor.userId, at, reason: reason.trim() });
    LEVELS.slice(LEVELS.indexOf(lv) + 1).forEach(l => { if (pr.approval[l].status === AP.PENDING) pr.approval[l].status = AP.NONE; });
    log(pr, at, actor, `Reject ${lv}`, from, PR.REJECTED, reason.trim(), 'Kembali ke PR Creation untuk revisi');
    return { ok: true };
  }

  // ---------- PO ----------
  // Auto approve deadline: PO date + N days (System Master, currently Day + 1)
  function createPO(pr, at, master) {
    const deadline = new Date(at.getTime() + master.poAutoApproveDays * 86400000);
    const po = {
      poNo: `PO${pr.prNo}`, prNo: pr.prNo, prodMonth: pr.prodMonth, ym: pr.ym, rev: pr.rev, supplierCode: pr.supplierCode, supplierName: pr.supplierName,
      percentage: pr.percentage, routes: pr.routes, qty: pr.qty, price: pr.price, poDate: at, deadline,
      status: PO.PENDING, by: '', at: null, reason: '', history: [],
    };
    log(po, at, { role: 'SYSTEM', userId: 'SYSTEM' }, 'PO dibuat dari PR Approved', '-', PO.PENDING, '',
      `Auto approve Day + ${master.poAutoApproveDays} (System Master)`);
    return po;
  }

  function poBlock(po, actor, now) {
    if (actor.role !== 'GA') return 'Approve / reject PO manual hanya oleh General Affair Department';
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
  // PO Rejected: the PR goes back to the state it had right after PR Creation and must be submitted again
  function rejectPO(po, actor, reason, now, ctx) {
    const block = poBlock(po, actor, now);
    if (block) return { ok: false, error: block };
    if (blank(reason)) return { ok: false, errors: { reason: 'Reason wajib diisi' } };
    const re = reasonError(reason);
    if (re) return { ok: false, errors: { reason: re } };
    Object.assign(po, { status: PO.REJECTED, by: actor.userId, at: now, reason: reason.trim() });
    log(po, now, actor, 'Reject PO', PO.PENDING, PO.REJECTED, reason.trim(), `PR ${po.prNo} dikembalikan ke PR Creation`);
    const pr = ctx.prs.find(p => p.prNo === po.prNo);
    if (pr) {
      const from = prStatus(pr);
      pr.returned = true;
      LEVELS.forEach(l => Object.assign(pr.approval[l], { status: AP.NONE, by: '', at: null, reason: '' }));
      log(pr, now, actor, 'Dikembalikan (PO Rejected)', from, PR.RETURNED, reason.trim(), `PO ${po.poNo} di-reject, perlu submit ulang dari PR Creation`);
    }
    return { ok: true, pr };
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
      : a.role === 'IP_ADMIN' ? 'IP Admin' : a.role === 'GA' ? 'General Affair' : a.role === 'SUPPLIER' ? 'Supplier' : 'System';
  }

  const api = {
    LEVELS, LEVEL_NAME, AP, PR, PO, REASON_MIN,
    currentLevel, prStatus, isPending, currentPic, canView, newApproval, prBlock, needsMe, approvePR, rejectPR,
    createPO, poBlock, approvePO, rejectPO, runAutoApprove, roleLabel,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MonthlyWorkflow = api;
})(this);
