"""ST test specs (compact) for SA Approval / SA Monitoring / SA-PAS interface, Monthly PR Creation / PR-PO Approval / Inquiry,
ELIPS-PAS PR interface + callback, and TC-PBR Menu & Authorization. Database names follow the revised UISS (ELIPS + DCR)."""
from common import C, LOGCHK

DCRN = 'Columns marked [DCR] in the UISS Data Map need the DB change requests of docs/review/12 (existing logic kept).'
SH, SD, OC = 'ielp.SA_HEADER', 'ielp.SA_DETAIL', 'ielp.ORDER_CYCLE'
CSF, CSA, POH = 'ielp.CRITERIA_SCORE_DETAIL_FINAL', 'ielp.CRITERIA_SCORE_APPROVAL', 'ielp.PO_HEADER'


# ------------------------------------------------------------------ SA
def sa_approval(u):
    M, L = u.M, u.L
    V = 'Login as Planner VPLD, open Service Acceptance > SA Approval.'
    g = [
     {'title': 'Initial', 'items': [
      C('open', 'Open screen per role', 'UISS: Item 1-12, 5.1, Msg no.1, Msg no.2, Msg no.3, Log 3', [V, 'Login as IELP Admin, open the screen.', 'Login as LP Admin, open the URL.', 'Search a period without eligible delivery.'],
        ['Order From / To, Regular Trip / Monthly tabs, list with ready / issue count.', M(1, {'Role': 'IELP Admin'}) + '; Approve hidden.', M(2) + '; ' + L(3), M(3)])]},
     {'title': 'Search and Calculation', 'items': [
      C('list', 'Eligible deliveries and calculation', 'UISS: Item 13-31, 42-45, 5.2, 5.3, 5.4', [V, 'Order From = 01-Nov-2026, Order To = 14-Nov-2026, [Search].', 'Open Calculation of an order; open Order Detail.'],
        ['One row per finished delivery without SA, sorted Order Date, Order Number; Total KM (sum of route legs from ielp.TB_M_MILEAGE), PO (ielp.PO_HEADER valid on order date), Rate / KM (ielp.MS_ROUTE_PRICE), Price = KM x rate.', 'Popup: route & KM, PO & cost, validation list.']),
      C('issue', 'Validation issues shown per row', 'UISS: 5.3.5, Item 16, Msg no.4', ['Search a period with an SRL delivery without valid PO and a route without mileage.'], [M(4) + ' ; row not selectable.'])]},
     {'title': 'Approve Operation', 'items': [
      C('approve', 'Approve deliveries (SA per LP + PO)', 'UISS: Item 7-9, 46-49, 5.5-5.8, Msg no.5, Msg no.6, Data Map blk 1, Data Map blk 2, Data Map blk 3, Data Map blk 4, Data Map blk 5, Data Map blk 9, Log 1',
        ['[Approve] without selection.', 'Select 3 ready deliveries of DNX (same PO) and 1 of PNJ, [Approve], [Cancel], again [Confirm Approve].'],
        ['Message: ' + M(9), M(5, {'n': '4'}), M(6, {'n': '2', 'm': '4'}), f'DB (SQL TD-10): 2 {SH} rows (SA_CODE, COMPANY_ID, PO_NUMBER, TOTAL_KM / TOTAL_COST, APPROVED_BY), 4 {SD} rows, {OC} SA_CODE / status; ' + L(1)]),
      C('monthly', 'Approve Monthly Truck (fixed cost)', 'UISS: Item 32-41, 5.9, Msg no.12, Msg no.13, Data Map blk 6, Data Map blk 7, Data Map blk 8',
        ['Tab Monthly Truck: select 2 released monthly PO, [Approve], confirm.', 'Select a PO approved by another user meanwhile, approve.'],
        [M(12, {'n': '2'}), 'SA per PO; ielp.PO_DETAIL SA_CODE.', M(13, {'x': '1', 'n': '1'})])]}]
    ab = [C('reval', 'Revalidation fails: nothing approved', 'UISS: 5.6, Msg no.7, Log 2', ['Select 2 deliveries; another user changes the PO of one; confirm.'], [M(7, {'x': '1', 'n': '2'}), L(2)]),
          C('role', 'Approve request by non VPLD / empty', 'UISS: Msg no.8, Msg no.9', ['Send the approve request as IELP Admin (browser tools); send an empty list.'], [M(8), M(9)]),
          C('tx', 'Transaction error / request in progress', 'UISS: Msg no.10, Msg no.11, Log 4', ['Lock ielp.SA_HEADER; confirm.', 'Double click Confirm Approve.'], [M(10) + '; ' + L(4), M(11)]),
          C('seq', 'SA Number conflict / sequence overflow', 'UISS: 5.7, Log 5', ['Set the SA sequence (proposed table) to 9999; approve.'], [L(5)], tbd='SA sequence table proposed')]
    td = {'precondition': ['Users Planner VPLD, IELP Admin, LP Admin.', 'Finished deliveries 01-14 Nov 2026 for DNX (PO valid) and PNJ; SRL without valid PO; released monthly PO.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:approve}, {tc:monthly}', 'title': 'SA created', 'sql': f"SELECT * FROM {SH} WHERE APPROVED_DT >= CAST(GETDATE() AS date);\nSELECT * FROM {SD} WHERE SA_CODE IN (:sa);\nSELECT ORDER_NO, SA_CODE, STATUS_CODE FROM {OC} WHERE ORDER_NO IN (:orders);"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def sa_monitoring(u):
    M, L = u.M, u.L
    A = 'Login as IELP Admin, open Service Acceptance > SA Monitoring.'
    g = [
     {'title': 'Initial', 'items': [C('open', 'Open screen per role', 'UISS: Item 1-19, 5.1, Msg no.1', [A, 'Login as Driver, open the URL.'], ['Criteria, status chips, tabs, list of SA details.', M(1)])]},
     {'title': 'Search Operation', 'items': [
      C('search', 'Search, no data, export', 'UISS: Item 2-14, 19, 5.2, Export Excel, Msg no.2, Msg no.3', ['SA Date 01-14 Nov 2026, Status, Truck Company DNX, [Search].', 'SA Number "ZZZ".', 'Export Excel with no data.'],
        [f'Rows of {SD} / {SH} matching all criteria.', M(2), M(3)]),
      C('cols', 'List, WBS group and detail', 'UISS: Item 20-52, 5.3-5.7', ['Check columns; tab WBS group; open Detail and Interface Log.'],
        ['ELIPS vs PAS data, WBS columns (ielp.SA_WBS_PERCENTAGE), interface status; detail sections A-G; event table from ielp.LOG_ITGPAS.'])]},
     {'title': 'Retry Interface', 'items': [
      C('retry', 'Retry a failed SA', 'UISS: 5.8, Msg no.4, Data Map blk 1, Data Map blk 2, Data Map blk 3, Log 1', ['Options > Retry Interface on a FAILED SA (PAS stub OK).'],
        [M(4, {'SA Number': 'SA-01'}), 'DB: PAS_STATUS, INTERFACE_ATTEMPT + 1, CORRELATION_ID; LOG_ITGPAS row; ' + L(1)]),
      C('rerr', 'Retry refused', 'UISS: 5.8, Msg no.5, Msg no.6, Msg no.7, Msg no.8, Log 2', ['Retry with PAS stub returning TIMEOUT.', 'Retry as a user without retry authorization.', 'Retry an SA where PAS already returned PR.', 'Retry a SENT SA.'],
        [M(5) + '; ' + L(2), M(6), M(7), M(8)])]},
     {'title': 'PAS Feedback', 'items': [
      C('fb', 'Feedback shown on the screen', 'UISS: 5.9, Log 3, Log 4, Log 5', ['PAS sends PR / PO feedback; an error feedback; a feedback while the DB is locked (ST SA PAS Interface).'], [L(3), L(4), L(5)])]}]
    td = {'precondition': ['SA of Nov 2026 in statuses SENT, FAILED, PR_RECEIVED, COMPLETED; PAS stub.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:retry}', 'title': 'Retry', 'sql': f"SELECT SA_CODE, PAS_STATUS, INTERFACE_ATTEMPT, CORRELATION_ID FROM {SH} WHERE SA_CODE = 'SA-01';  -- [DCR]\nSELECT * FROM ielp.LOG_ITGPAS ORDER BY CRETED_DATE DESC;"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': [], 'test_data': td}


def sa_pas(u):
    L = u.L
    E = ['Approve an SA on SA Approval (or Retry Interface on SA Monitoring); the send service calls the PAS stub.']
    F = ['Call the feedback endpoint as PAS (API client) with the payload of the case.']
    n = [C('send', 'SA sent to PAS', 'UISS: Func Flow, Log no.6, Data Map blk 1, Data Map blk 3', ['Check SA_DETAIL and LOG_ITGPAS (SQL TD-10).'], [L(6, {'SA': 'SA-01'}), 'IS_PAS, PAS_STATUS SENT, LOG_ITG_SEND_ID; log row with PARAM_REQ / PARAM_RES.'], execution=E),
         C('fb', 'PR / PO feedback saved', 'UISS: Log no.13, Data Map blk 2', ['Check SA_DETAIL (SQL TD-10).'], [L(13, {'SA': 'SA-01'}), 'PAS_PR_NUMBER / DATE, PAS_PO_NUMBER / DATE, PAS_CALLBACK_STATUS.'], execution=F),
         C('dup', 'Duplicate feedback', 'UISS: Log no.8', ['Send the same feedback id again.'], [L(8, {'ID': 'FB-1'})], execution=F)]
    ab = [C('notsend', 'Send refused', 'UISS: Log no.1, Log no.2, Log no.3, Log no.4, Log no.5', ['Check the response and log.'], [L(1, {'SA': 'SA-02', 'STATUS': 'SENT'}), L(2), L(3), L(4), L(5)],
            execution=['Send a SENT SA; retry without authorization; retry after PAS returned data; SA without deliveries; PAS stub TIMEOUT.']),
          C('fberr', 'Feedback rejected', 'UISS: Log no.7, Log no.9, Log no.10, Log no.11, Log no.12, Log no.14', ['Check the response.'], [L(7), L(9, {'SA': 'SA-X'}), L(10), L(11), L(12, {'CODE': 'E01'}), L(14)],
            execution=['Feedback without id; unknown SA; wrong correlation; missing PR_NO / different PR; PAS error code; DB locked.'])]
    td = {'precondition': ['SA-01 approved; PAS stub; API client.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:send}, {tc:fb}', 'title': 'SA interface', 'sql': f"SELECT SA_CODE, IS_PAS, PAS_STATUS, PAS_PR_NUMBER, PAS_PR_DATE, PAS_PO_NUMBER, PAS_PO_DATE, PAS_CALLBACK_STATUS FROM {SD} WHERE SA_CODE = 'SA-01';\nSELECT * FROM ielp.LOG_ITGPAS WHERE PROCESS_ID = :pid;"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


# ------------------------------------------------------------------ Monthly
def pr_creation(u):
    M, L = u.M, u.L
    S = 'Login as VPLD Staff, open Monthly > PR Creation.'
    g = [
     {'title': 'Initial', 'items': [
      C('open', 'Open screen and parameters', 'UISS: Item 1-11, 5.1, Msg no.17', [S, 'Login as Planner VPLD, open the URL.'], ['PR Creation Type, Operational Month (next month), Logistics Partner, info chips.', M(17)])]},
     {'title': 'Generate Route Plan', 'items': [
      C('param', 'Mandatory and period rules', 'UISS: 5.1, Msg no.1, Msg no.2, Msg no.3, Msg no.4, Msg no.5, Msg no.6, Msg no.7, Msg no.24',
        ['[Create PR] before generate.', '[Generate Route Plan] with blank fields.', 'Operational Month = current month (System Master N); = last month; = month N+2.', 'Remove the System Master parameter.'],
        [M(24), M(1) + ', ' + M(2) + ', ' + M(3), M(5) + ' / ' + M(6) + ' / ' + M(7), M(4)]),
      C('gen', 'Route plan calculated', 'UISS: Item 12-28, 5.2-5.4, Msg no.16, Log 1', ['Type Route-based, Month 2026-12, LP All, [Generate Route Plan].'],
        [M(16, {'Month YYYY': 'December 2026', 'n': '3'}), 'Per LP: mileage cost, fixed cost, working days, delivery cost, PR amount, status Ready; ' + L(1)]),
      C('generr', 'Data source errors per LP', 'UISS: 5.2, 5.3, Msg no.8, Msg no.9, Msg no.10, Msg no.11, Msg no.12, Msg no.15',
        ['Generate with: no TMMIN calendar; no active route percentage; LP without Order Sharing; LP with 0 planned orders; LP without price; LP with price 0.'],
        [M(8), M(9), M(10), M(11), M(12), M(15)], tbd='OP-01'),
      C('detail', 'PR detail pop-up and export', 'UISS: Item 25, 29-39, 5.7, 5.8, Msg no.23', ['Click Detail of DNX.', 'Click [Export].'], ['Routes, %, orders, days, distance, planned cost, components, total.', M(23)])]},
     {'title': 'Create PR', 'items': [
      C('create', 'Create PR and DB', 'UISS: Item 3, 14, 5.5, 5.6, Msg no.18, Msg no.19, Msg no.21, Data Map blk 1, Data Map blk 2, Data Map blk 3, Data Map blk 4, Log 2',
        ['[Create PR] with nothing selected.', 'Select DNX and PNJ (Ready), [Create PR], confirm.'],
        [M(18), M(19), M(21, {'n': '2'}), f'DB (SQL TD-10): {CSF} per LP (PR_NO_DET, COMPANY_ID, CRITERIA_PERIODE, PR_SEQ, totals), ielp.CRITERIA_SCORE_DETAIL_ROUTE per component, {CSA} per level; ' + L(2)]),
      C('sh', 'Section Head creates PR (SH skip)', 'UISS: 5.6, Log 3', ['Login as VPLD Section Head; create a PR.'], [L(3), 'Approval starts at DpH.']),
      C('seq', 'Duplicate components and sequence', 'UISS: 5.5, Msg no.13, Msg no.14, Msg no.20, Msg no.22, Log 4',
        ['Generate again for DNX (monthly cost already in PR).', 'All routes already in PR.', 'Another user created sequence 2 meanwhile; create.', 'Create for 2 LP where one fails.'],
        [M(13), M(14), M(20), M(22) + '; ' + L(4)])]}]
    ab = [C('syserr', 'System error', 'UISS: Msg no.25, Log 5', ['Stop DB; generate.'], [M(25), L(5)])]
    td = {'precondition': ['VPLD Staff / Section Head; Master KPI, Route Percentage, Price, TMMIN calendar for 2026-12.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:create}', 'title': 'PR created', 'sql': f"SELECT * FROM {CSF} WHERE CRITERIA_PERIODE = '202612';\nSELECT * FROM ielp.CRITERIA_SCORE_DETAIL_ROUTE WHERE CRITERIA_DETAIL_FINAL_ID IN (:ids);\nSELECT * FROM {CSA} WHERE CRITERIA_PERIODE = '202612';"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def _inquiry(u, doc):
    M, L = u.M, u.L
    pre = 'PR' if doc == 'PR' else 'PO'
    n_items = '1-26' if doc == 'PR' else '1-27'
    modal = '27-37' if doc == 'PR' else '28-38'
    g = [
     {'title': 'Initial', 'items': [C('open', 'Open screen and access', f'UISS: Item 1-9, 5.1, 5.2.1, Msg no.3, Log no.1', [f'Login as VPLD Staff, open Monthly > {pre} Inquiry.', f'Login as LP Admin, open a {pre} of another company (URL).'],
        [f'{pre} of the current production month, read only (no Approve / Reject); no data change, Log no.1 not applicable.', M(3, {'Document No': f'{pre}-X'})])]},
     {'title': 'Search Operation', 'items': [C('search', 'Search, no data, list', f'UISS: Item {n_items}, 5.2.2, 5.4, Msg no.1, Msg no.2',
        ['Prod. Month From 2026-12, To 2026-11, [Search].', f'{pre} Number "ZZZ", [Search].', 'Valid range, Status, [Search]; [Clear].'], [M(1), M(2), f'Matching {pre}s with status, order sharing and paging; Clear resets.'])]},
     {'title': 'Detail and Download', 'items': [C('detail', 'Detail modal and download', f'UISS: Item {modal}, 5.3', [f'Click a {pre} Number; click Download.'], ['Routes, %, qty, price, footer, approval history; file downloaded.'])]}]
    td = {'sql_verify': [{'id': 'TD-10', 'tc': '{tc:search}', 'title': 'Documents', 'sql': (f"SELECT * FROM {CSF} WHERE CRITERIA_PERIODE BETWEEN '202611' AND '202612';" if doc == 'PR' else f"SELECT * FROM {POH} WHERE CRITERIA_PERIODE BETWEEN '202611' AND '202612';")}]}
    return {'header': u.header(), 'groups': g, 'abnormal': [], 'test_data': td}


def pr_inquiry(u): return _inquiry(u, 'PR')
def po_inquiry(u): return _inquiry(u, 'PO')


def pr_approval(u):
    M, L = u.M, u.L
    g = [
     {'title': 'Initial', 'items': [C('open', 'Open screen and access', 'UISS: Item 1-9, 5.1, 5.2.1, Msg no.3', ['Login as VPLD SH, open Monthly > PR Approval.', 'Open a PR of another scope (URL).'], ['PR waiting for the user level; Approve / Reject.', M(3, {'Document No': 'PR-X'})])]},
     {'title': 'Search Operation', 'items': [C('search', 'Search and detail', 'UISS: Item 10-50, 5.2.2, 5.3, 5.4, Msg no.1, Msg no.2', ['From > To, [Search]; "ZZZ"; valid search; open detail.'], [M(1), M(2), 'List with status SH / DpH / DH, current PIC; detail with history.'])]},
     {'title': 'Approve / Reject', 'items': [
      C('approve', 'Approve by SH, DpH, DH (PO created)', 'UISS: 5.5, Msg no.4, Msg no.10, Data Map blk 1, Data Map blk 2, Data Map blk 4, Data Map blk 5, Data Map blk 6, Log 1, Log 3',
        ['[Approve] without selection.', 'SH selects 2 PR, [Approve], confirm; DpH and DH approve the same PR.'],
        [M(4), M(10, {'n': '2'}), f'DB (SQL TD-10): {CSA} APPROVAL_STS / BY / DATE per level; DH: {POH} row (PO_NUMBER, PR_NO_DET, APPROVAL_STS); ' + L(1) + '; ' + L(3)]),
      C('reject', 'Reject with reason', 'UISS: 5.5, Msg no.5, Msg no.6, Data Map blk 3, Log 2', ['[Reject] with blank reason; "no"; "route data wrong", confirm.'], [M(5), M(6), 'APPROVAL_STS rejected, APPROVAL_REMARK; ' + L(2)]),
      C('rule', 'Role and level rules', 'UISS: Msg no.7, Msg no.8', ['VPLD Staff sends approve (request).', 'SH approves a PR already approved by SH.'], [M(7), M(8, {'Level': 'SH', 'Status': 'Approved'})])]}]
    ab = [C('version', 'Concurrency check', 'UISS: Msg no.9', ['SH in two browsers approves the same PR.'], [M(9)])]
    td = {'precondition': ['PR of 2026-12 waiting SH; users SH, DpH, DH, VPLD Staff.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:approve}, {tc:reject}', 'title': 'Approval', 'sql': f"SELECT * FROM {CSA} WHERE CRITERIA_DETAIL_FINAL_ID = :id ORDER BY APV_APPROVAL_CLASS;\nSELECT * FROM {POH} WHERE PR_NO_DET = :pr;"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def po_approval(u):
    M, L = u.M, u.L
    g = [
     {'title': 'Initial', 'items': [C('open', 'Open screen and access', 'UISS: Item 1-9, 5.1, 5.2.1, Msg no.3', ['Login as GA user, open Monthly > PO Approval.', 'Open a PO of another scope (URL).'], ['PO waiting approval with Auto Approve At.', M(3, {'Document No': 'PO-X'})])]},
     {'title': 'Search Operation', 'items': [C('search', 'Search and detail', 'UISS: Item 10-52, 5.2.2, 5.3, 5.4, Msg no.1, Msg no.2', ['From > To; "ZZZ"; valid search; open detail.'], [M(1), M(2), 'List and detail with route, qty, price, history.'])]},
     {'title': 'Approve / Reject', 'items': [
      C('approve', 'Approve PO', 'UISS: 5.5, Msg no.4, Msg no.11, Data Map blk 1, Data Map blk 6, Log 1', ['[Approve] without selection.', 'Select 2 PO, [Approve], confirm.'], [M(4), M(11, {'n': '2'}), f'DB (SQL TD-10): {POH} APPROVAL_STS, APPROVAL_BY / DATE; ' + L(1)]),
      C('reject', 'Reject PO (PR returned)', 'UISS: 5.5, Msg no.5, Msg no.6, Data Map blk 2, Data Map blk 3, Data Map blk 4, Log 2', ['[Reject] blank reason; "no"; "price not agreed", confirm.'],
        [M(5), M(6), f'{POH} rejected with remark; {CSF} PR status back to PR Creation; {CSA} levels cleared; ' + L(2)]),
      C('rule', 'Role, status and deadline rules', 'UISS: Msg no.7, Msg no.8, Msg no.9', ['VPLD Staff sends approve (request).', 'Approve an approved PO.', 'Approve a PO past its deadline.'], [M(7), M(8, {'Status': 'Approved'}), M(9)]),
      C('auto', 'Auto approve job', 'UISS: Item 12, 5.6, Msg no.12, Data Map blk 5, Log 3', ['Click Jalankan Auto Approve with a PO past the deadline; click again.'], [M(12, {'n': '1'}), f'{POH} APPROVAL_BY SYSTEM; ' + L(3)])]}]
    ab = [C('version', 'Concurrency check', 'UISS: Msg no.10', ['Two GA users approve the same PO.'], [M(10)]), C('autoerr', 'Auto approve job fails', 'UISS: Log 4', ['Lock ielp.PO_HEADER; run auto approve.'], [L(4)])]
    td = {'precondition': ['PO of 2026-12 waiting; one past its deadline; GA user, VPLD Staff.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:approve}, {tc:reject}, {tc:auto}', 'title': 'PO', 'sql': f"SELECT PO_NUMBER, APPROVAL_STS, APPROVAL_BY, APPROVAL_DATE, APPROVAL_REMARK FROM {POH} WHERE PO_NUMBER IN (:po);"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


# ------------------------------------------------------------------ PAS interfaces
def pas_pr(u):
    L = u.L
    E = ['Run the Talend job ELIPS-PAS PR interface (test context) with approved SA waiting.']
    LC = LOGCHK
    n = [C('start', 'Run started and SA claimed', 'UISS: Func Flow step 1-4, 4.1, Log no.1, Data Map blk 1', [LC(), 'Check SA_DETAIL (SQL TD-10).'], [L(1), 'INTERFACE_STATUS PROCESSING, PROCESS_ID, START_DT.'], execution=E),
         C('pr', 'PR created in PAS', 'UISS: Func Flow step 7-8, Log no.13, Data Map blk 2, Data Map blk 3, Data Map blk 4, Data Map blk 5, Data Map blk 6, Data Map blk 7, Data Map blk 8, Data Map blk 9, Data Map blk 10',
           [LC(), 'Check PAS tables (SQL TD-11).'], [L(13), 'TB_R_LOG_H, TB_M_DOC_NUMBERING + 1, TB_H_DOCUMENT_NUMBER, TB_R_PR_H / ITEM / SUBITEM and TB_T_PR_* copies.'], execution=E),
         C('autopo', 'Auto PO job and ELIPS status', 'UISS: 4.5, Data Map blk 11, Data Map blk 12', ['Check TB_T_JOB_AUTOPO and SA_DETAIL.'], ['Job row when eligible; SA_DETAIL INTERFACE_STATUS SUCCESS, PR_NO.'], execution=E),
         C('end', 'Run finished / nothing to send', 'UISS: Log no.19, Log no.3', [LC()], [L(19), 'Next run: ' + L(3)], execution=E),
         C('idem', 'Reconciliation', 'UISS: 4.3, Log no.4, Log no.5, Log no.7', [LC()], [L(4), L(5), L(7)], execution=['SA stuck PROCESSING; two runs in parallel; SA already in PAS.'])]
    ab = [C('conn', 'Connection errors', 'UISS: Log no.2', [LC()], [L(2)], execution=['Stop the PAS DB.']),
          C('val', 'Invalid SA', 'UISS: 4.2, Log no.6, Log no.15', [LC()], [L(6), L(15)], execution=['SA without WBS; SA not approved by VPLD.']),
          C('pas', 'PAS step errors (rolled back)', 'UISS: 4.4, Log no.8, Log no.9, Log no.10, Log no.11, Log no.12, Log no.17, Data Map blk 13', [LC(), 'Check that no PAS row remains.'],
            [L(8), L(9), L(10), L(11), L(12), L(17), 'SA_DETAIL FAILED, ERROR_MESSAGE, RETRY_COUNT + 1.'], execution=['Fail each step with a test hook: numbering, insert, SP_ILS_GENERATE_PR_ITEM, budget, Auto PO, transaction.']),
          C('after', 'Status update / rollback failures and retry limit', 'UISS: Log no.14, Log no.16, Log no.18', [LC()], [L(14), L(16), L(18)], execution=['Lock SA_DETAIL after PR creation; fail the rollback; fail one SA up to the retry limit.']),
          C('stop', 'Unexpected stop', 'UISS: Log no.20', [LC()], [L(20)], execution=['Kill the job.'])]
    td = {'precondition': ['ELIPS: approved SA with WBS %; PAS test DB.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:start}, {tc:autopo}', 'title': 'ELIPS', 'sql': f"SELECT SA_CODE, PROCESS_ID, PR_NO, INTERFACE_STATUS, ERROR_MESSAGE, RETRY_COUNT FROM {SD} WHERE SA_CODE = :sa;  -- interface columns [DCR]"},
                         {'id': 'TD-11', 'tc': '{tc:pr}', 'title': 'PAS', 'sql': "SELECT * FROM TB_R_PR_H WHERE PROCESS_ID = :pid;\nSELECT * FROM TB_R_PR_ITEM WHERE PR_NO = :pr;\nSELECT * FROM TB_R_PR_SUBITEM WHERE PR_NO = :pr;\nSELECT * FROM TB_T_JOB_AUTOPO WHERE PROCESS_ID = :pid;"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


def pas_callback(u):
    L = u.L
    E = ['Run the Talend job PAS-ELIPS PR/PO callback (mode A, test context).']
    LC = LOGCHK
    n = [C('start', 'Run started', 'UISS: Func Flow step 1, Log no.1, Data Map blk 1', [LC()], [L(1), 'Run log row.'], execution=E),
         C('upd', 'PR / PO stored in ELIPS', 'UISS: 4.1-4.3, Log no.18, Data Map blk 2, Data Map blk 3', [LC(), 'Check SA_DETAIL (SQL TD-10).'], [L(18), 'PAS_PR_NUMBER, PAS_PO_NUMBER of all rows of the SA.'], execution=E),
         C('end', 'Run finished', 'UISS: Log no.19, Data Map blk 4', [LC()], [L(19)], execution=E),
         C('skip', 'Not eligible / no change', 'UISS: 4.1, Log no.4, Log no.6, Log no.7, Log no.8, Log no.9, Log no.15', [LC()], [L(4), L(6), L(7), L(8), L(9), L(15)],
           execution=['No pending SA; PR missing in PAS; PR without released PO; PR_NOTES empty / other; already stored.'])]
    ab = [C('conn', 'Connection / query errors', 'UISS: Log no.2, Log no.3, Log no.5', [LC()], [L(2), L(3), L(5)], execution=['Stop PAS DB; stop ELIPS DB; break the PAS query.']),
          C('ident', 'Identification errors', 'UISS: 4.2, Log no.10, Log no.11, Log no.12, Log no.13, Log no.14', [LC()], [L(10), L(11), L(12), L(13), L(14)],
            execution=['Two PAS PR for one SA; PR with two released PO; SA not in ELIPS; duplicate SA_DETAIL rows; different PR stored.']),
          C('upderr', 'Update errors', 'UISS: Log no.16, Log no.17', [LC()], [L(16), L(17), 'Rolled back.'], execution=['Row count mismatch (test hook); lock SA_DETAIL.']),
          C('stop', 'Unexpected stop', 'UISS: Log no.20', [LC()], [L(20)], execution=['Kill the job.'])]
    td = {'precondition': ['SA sent to PAS with PR / PO released in the PAS test DB.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:upd}', 'title': 'Callback', 'sql': f"SELECT SA_CODE, PAS_PR_NUMBER, PAS_PO_NUMBER FROM {SD} WHERE SA_CODE = :sa;"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


# ------------------------------------------------------------------ Menu & Authorization
def menu_auth(u):
    M = u.M
    rows = [('IELP Admin', 'Daily Monitoring X, Planning Order V, Truck Assignment V, SA Approval V, SA Monitoring X, Master X, PR Creation V, PR / PO Approval V, Inquiry V'),
            ('Planner VPLD', 'Daily Monitoring X, Planning Order X, Truck Assignment V, SA Approval X, SA Monitoring V, Master X; no Monthly menus'),
            ('LP Admin', 'Daily Monitoring X, Truck Assignment X, SA Monitoring V, Master X; no Planning Order, SA Approval, Monthly'),
            ('Supplier Viewer', 'Daily Monitoring V, Truck Assignment V, SA Monitoring V, Master X, PR / PO Approval V, Inquiry V'),
            ('Driver', 'Daily Monitoring X, Master X only'),
            ('VPLD Staff / SH', 'Master X, PR Creation X, PR / PO Approval V, Inquiry V'),
            ('Approver (SH / DpH / DH)', 'Master X, PR Creation V, PR / PO Approval X, Inquiry V'),
            ('GA', 'Master X, PR / PO Approval V (PO approve per ST PO Approval), Inquiry V')]
    items = [C(f'r{i}', f'Menu and access: {r}', 'UISS: Item 1-11, 5.1, Msg no.1', [f'Login as {r}.', 'Check the side menu and the header.', 'Open each menu; open the URL of every menu not shown.'],
               [f'Matrix 5.1: {t} (X = execute, V = view only).', "Header 'Login sebagai' shows the role; hidden menus by URL show " + M(1) + '.'], tbd='Role-to-USERID_CLASS mapping TBD') for i, (r, t) in enumerate(rows, 1)]
    g = [{'title': 'Role Access', 'items': items},
         {'title': 'Database', 'items': [C('db', 'Menus and classes from ELIPS user tables', 'UISS: 5.2, 5.3', ['Run SQL TD-10 for each test user.', 'Compare with the menus shown.'], ['Menus = ielp.USERID_MENU_OPTION of the user classes (ielp.USERID_DETAIL); labels from ielp.MASTER_MENU_LANG.'], tbd='TC-PBR APP_ID TBD')]}]
    td = {'precondition': ['One test user per role in ielp.USERID / USERID_DETAIL.'],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:db}', 'title': 'Menus of a user', 'sql': "SELECT m.MENU_ID, m.MENU_ITEM, m.MENU_PARENT FROM ielp.USERID_DETAIL d\nJOIN ielp.USERID_MENU_OPTION o ON o.USERID_CLASS = d.USERID_CLASS AND o.SITE_ID = d.SITE_ID\nJOIN ielp.MASTER_MENU m ON m.MENU_ID = o.MENU_ID WHERE d.USERNAME = :user ORDER BY m.MENU_INDEX;"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': [], 'test_data': td}


SPECS = {'UISS_Screen_SA_Approval': sa_approval, 'UISS_Screen_SA_Monitoring': sa_monitoring, 'UISS_Batch_SA_PAS_Interface': sa_pas,
         'UISS_Screen_PR_Creation': pr_creation, 'UISS_Screen_PR_Inquiry': pr_inquiry, 'UISS_Screen_PR_Approval': pr_approval,
         'UISS_Screen_PO_Approval': po_approval, 'UISS_Screen_PO_Inquiry': po_inquiry,
         'UISS_Batch_ELIPS_PAS_PR_Interface': pas_pr, 'UISS_Batch_PAS_ELIPS_PR_PO_Callback': pas_callback,
         'UISS_Screen_TCPBR_Menu_Authorization': menu_auth}
