"""ST test specs (compact) for the Daily UISS: Daily Order Monitoring (+ download), DTP Creation (+ upload, queue, switching, IPMS),
Planning Truck Assignment (+ driver sync), Delivery Note (+ GR attachment). Database names follow the revised UISS (ELIPS + DCR)."""
from common import C, LOGCHK

D2, OC, LAO = 'ielp.DTP_2_DETAIL', 'ielp.ORDER_CYCLE', 'ielp.LOG_ACTIVITY_ORDER'
DCRN = 'Columns marked [DCR] in the UISS Data Map need the DB change requests of docs/review/12 (existing logic kept).'


def R(*ns, p='Msg no.'):
    return ', '.join(f'{p}{n}' for n in ns)


# ------------------------------------------------------------------ Daily Order Monitoring
def daily_monitoring(u):
    M, L = u.M, u.L
    OPEN = 'Open menu Daily > Daily Monitoring.'
    g = [
     {'title': 'Initial', 'items': [
      C('open', 'Open screen per role and data scope', 'UISS: Item 1-30, 5.1, 5.2.1, Msg no.4',
        ['Login as IELP Admin. ' + OPEN, 'Login as LP Admin of DNX, open the screen; open the URL of an order of PNJ.', 'Login as Supplier Viewer of DNX.'],
        ['IELP Admin: all orders of today, tabs ALL / DTP 1..4, Last Sync at, paging 10 rows.', 'LP Admin: only DNX orders (list, paging total, export); other order: ' + M(4, {'Order No': 'ORD-PNJ-01'}),
         'Supplier Viewer: DNX orders, no action buttons.'])]},
     {'title': 'Search Operation', 'items': [
      C('search', 'Find / Clear / keyword / tabs / no data', 'UISS: Item 3-13, 28-30, 5.2.2, Msg no.1, Msg no.2',
        ['Date From = 15-Nov-2026, Date To = 14-Nov-2026, [Find].', 'Date From = Date To = 14-Nov-2026, From Loc. = D1, [Find]; click tab DTP 2; Search "SNT".', 'Date = 01-Jan-2020, [Find].', '[Clear].'],
        [M(1), 'Orders of the date, From Loc. D1, DTP 2, keyword match; paging updated.', M(2), 'Criteria reset to today, full list.'])]},
     {'title': 'Order Detail and Print', 'items': [
      C('detail', 'Order detail, cycles, files, status history', 'UISS: Item 31-54, 5.3', ['Click an order with 2 cycles.'],
        ['Summary (No. Order, Date / Shift, LP, plate, driver, planned / actual cycle, statuses, SA / PO), action buttons by role and status, cycle cards with activity list and files, Status History from ' + LAO + '.']),
      C('print', 'Print Surat Jalan / PDF with pop-up blocked', 'UISS: Item 52-53, Print / PDF, Msg no.5', ['Block pop-ups in the browser; click Surat Jalan ELIPS of cycle 1.', 'Allow pop-ups, click again.'],
        [M(5), 'Delivery Note PDF opens (refer ST Delivery Note).']),
      C('export', 'Export with no data', 'UISS: Item 14, Msg no.3', ['Filter to a date without orders; [Export] > Excel.'], [M(3) + ' (refer ST Download Daily Order Monitoring).'])]},
     {'title': 'Action Operation (IELP Admin)', 'items': [
      C('assign', 'Assign Truck', 'UISS: 5.6.1, Item 55-62, Msg no.10, Msg no.11, Msg no.12, Msg no.13, Data Map blk 1, Data Map blk 10, Log 1',
        ['IELP Admin opens order in Planning Order, action Assign Truck.', 'Truck = B 9999 XX (other LP), [Submit]; truck with license expired before order date; truck already used on the same shift / date.', 'Truck = B 1234 DN (valid), [Submit].'],
        [M(11, {'Truck No': 'B 9999 XX', 'Trucking Company': 'DNX'}) + ' / ' + M(12) + ' / ' + M(13), M(10, {'Action': 'Assign Truck', 'Order Status': 'Order Release', 'Cycle Status': 'DTP Creation Release'}),
         f'DB (SQL TD-10): {D2}.LICENSE_PLATE, STATUS_CODE, UPDATED_BY / UPDATED_DATE; {LAO} row with ACT, STS_CODE, REMARK; ' + L(1)]),
      C('sa', 'Process to SA and Process to PAS', 'UISS: 5.6.6, Msg no.24, Msg no.25, Msg no.26, Msg no.27, Data Map blk 8, Data Map blk 9, Log 2, Log 3, Log 5',
        ['Order with a cycle not finished: Process to SA.', 'Order complete; SA interface returns an error (stub).', 'SA OK: Process to SA, then Process to PAS with PO Number "4512345" and then "4500001234"; PAS stub returns no PO.', 'PAS returns PO.'],
        [M(24), M(25, {'Order No': 'ORD-01', 'SA Error': 'stub error'}) + '; ' + L(2), M(27) + ' / ' + M(26) + '; ' + L(3),
         'SA Approved then PO received: DB (SQL TD-10) STATUS_CODE, PO_NUMBER, UPDATED_BY; ' + L(5)], tbd='SA / PAS interface TBD'),
      C('legacy', 'Legacy Create DTP dialog', 'UISS: Item 63-72, Legacy Create DTP dialog, Msg no.28, Msg no.29, Msg no.30',
        ['Login as LP Admin; open Create DTP.', 'IELP Admin: blank Shift; date yesterday; Loc. To = Loc. From; Renban "12A", [Check].', 'Valid data, [Submit].'],
        [M(28), M(29) + ' (each variant)', M(30)])]},
     {'title': 'Action Operation (LP Admin)', 'items': [
      C('release', 'Order Release with driver', 'UISS: 5.6.2, Msg no.6, Msg no.14, Msg no.15, Msg no.16, Data Map blk 2',
        ['LP Admin opens order in Planning Order, Order Release; [Submit] blank.', 'Reason = "short"; Driver inactive; driver without truck.', 'Reason = "release to driver A", Driver = A, [Submit].'],
        [M(6), M(14) + ' / ' + M(15, {'Driver': 'X', 'Trucking Company': 'DNX'}) + ' / ' + M(16, {'Driver': 'Y'}), 'Order Release; DB (SQL TD-10): DRIVER_ID, LICENSE_PLATE, STATUS_CODE.']),
      C('pickup', 'Pickup Container and cycles', 'UISS: 5.6.3, 5.5, Msg no.17, Msg no.18, Msg no.19, Msg no.20, Msg no.21, Msg no.22, Data Map blk 3, Data Map blk 4, Data Map blk 5',
        ['Pickup on an order in Planning Order.', 'Order Release: Container "ABC123"; "MSKU1234560" (bad check digit); a number used twice in the order; a number active in another order.', 'Valid "MSKU1234565", [Submit].', 'After Finish Cycle of cycle 5, Pickup again.'],
        [M(21), M(17) + ' / ' + M(18, {'Container No': 'MSKU1234560'}) + ' / ' + M(19, {'Container No': 'MSKU1234565'}) + ' / ' + M(20, {'Container No': 'TCLU7654321', 'Order No': 'ORD-02'}),
         f'Start Daily Order, cycle Pickup Container; DB {OC}.CONTAINER_NO, STATUS_CODE, PICKUP_DATE; next cycle inserted after Finish Cycle (blk 4).', M(22)], tbd='OP-07'),
      C('finish', 'Finish Cycle and Finish Order', 'UISS: 5.6.4, 5.6.5, Msg no.23, Data Map blk 6, Data Map blk 7',
        ['Finish Order while cycle 2 has no Container Number.', 'Finish Cycle (reason), then Finish Order.'], [M(23, {'n': '2'}), f'Cycle Finish Cycle (COMPLETE_DATE), order Finish Daily Order; DB {OC} / {D2} STATUS_CODE, COMPLETE_DATE.']),
      C('rules', 'Status / role rule check', 'UISS: 5.5, Msg no.7, Msg no.8', ['Send Finish Order for an order in Planning Order (request).', 'Supplier Viewer sends Order Release (request).'],
        [M(7, {'Action': 'Finish Order', 'Allowed Status': 'Start Daily Order'}), M(8, {'Role': 'Supplier Viewer', 'Action': 'Order Release'})])]}]
    ab = [C('version', 'Concurrency check', 'UISS: Msg no.9', ['Users A and B open the same order; B submits an action first, then A.'], [M(9)]),
          C('iferr', 'SA / PAS interface not reachable', 'UISS: Log 4', ['Stop the SA interface stub; Process to SA.'], [L(4, {'SA/PAS': 'SA'}), 'Status not changed.'])]
    td = {'precondition': ['Users: IELP Admin, LP Admin DNX, Supplier Viewer DNX, Planner VPLD.', 'Orders of 14-Nov-2026 for DNX (Planning Order, Order Release, Start Daily Order) and PNJ; trucks B 1234 DN (valid), license-expired truck.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:assign}, {tc:release}, {tc:sa}', 'title': 'Order and log', 'sql': f"SELECT ORDER_NO, LICENSE_PLATE, DRIVER_ID, STATUS_CODE, PO_NUMBER, UPDATED_BY, UPDATED_DATE FROM {D2} WHERE ORDER_NO = :order_no;\nSELECT ORDER_NO, CYCLE_SEQ, CONTAINER_NO, STATUS_CODE, PICKUP_DATE, COMPLETE_DATE FROM {OC} WHERE ORDER_NO = :order_no;\nSELECT * FROM {LAO} WHERE ORDER_NO = :order_no ORDER BY CREATED_DATE;"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def download_dom(u):
    L = u.L
    E = ['Login as IELP Admin, open Daily > Daily Monitoring, set the criteria of the case, click [Export] > [Export ke Excel (.xlsx)].']
    n = [C('file', 'Export file: header, criteria, body, footer', 'UISS: Item 1-28, 1., 2.3, 3., 4., Log no.6',
           ['Open the downloaded file.'], ['Header Report Title, Printed By, Printed Date; Print Criteria = screen criteria.', 'One row per order (all pages, grid sort), cycles 1..5 Time / Status / Container, Order Status, SA Approved At, PO Number; Total row.', L(6, {'0': 'n'})], execution=E),
         C('scope', 'Data scope by role and filters', 'UISS: 2.3 a-e', ['Export as LP Admin of DNX with tab DTP 2 and keyword "SNT".'], ['Only DNX DTP 2 orders containing "SNT"; same rows as the grid.'],
           execution=['Login as LP Admin DNX, open Daily Monitoring, click tab DTP 2, Search "SNT", Export.'])]
    ab = [C('nodata', 'No data', 'UISS: 2.3 f, Log no.3', ['Check the screen and the download folder.'], [L(3), 'No file.'], execution=['Export with a date without orders.']),
          C('max', 'Over the maximum rows', 'UISS: Log no.4', ['Check the screen.'], [L(4, {'0': 'max (TBD)'})], execution=['Export a range above the maximum rows (TBD).'], tbd='Max rows TBD'),
          C('session', 'Session expired', 'UISS: 2.1, Log no.1', ['Check the screen.'], [L(1)], execution=['Let the session expire, click Export.']),
          C('db', 'DB not reachable / generation error', 'UISS: 2.2, Log no.2, Log no.5', ['Check the screen and log.'], [L(2), L(5)], execution=['Stop the DB connection; export. Then make the file generation fail (test hook).'])]
    td = {'precondition': ['Orders of 14-Nov-2026 for DNX and PNJ, some with 5 cycles, SA approved and PO number.'],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:file}', 'title': 'Rows expected', 'sql': f"SELECT d.ORDER_NO, d.LICENSE_PLATE, d.STATUS_CODE, d.PO_NUMBER, c.CYCLE_SEQ, c.STATUS_CODE, c.CONTAINER_NO\nFROM {D2} d JOIN {OC} c ON c.ORDER_NO = d.ORDER_NO ORDER BY d.ORDER_NO, c.CYCLE_SEQ;"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


# ------------------------------------------------------------------ DTP Creation
def dtp_creation(u):
    M, L = u.M, u.L
    PL = 'Login as Planner VPLD.'
    OPEN = 'Open menu Daily > Planning Order, click date 15-Nov-2026, select the Universal DTP, [Next].'
    g = [
     {'title': 'Initial', 'items': [
      C('cal', 'Calendar and date range', 'UISS: Item 1-12, 5.1, 5.2, Msg no.1, Msg no.2, Msg no.3, Msg no.5',
        [PL, 'Open Daily > Planning Order.', 'Click a date before the backdate range, then after the advance range.', 'Click a valid date, click [Next] without a DTP card.', 'Remove the System Master date range parameter (test DB), reopen.'],
        ['Calendar Month view with entries, +n more, open / in queue badges, legend.', M(2) + ' / ' + M(3), M(5), M(1)]),
      C('ro', 'View-only roles', 'UISS: Item 17, 5.10, Msg no.4, Msg no.51', ['Login as IELP Admin, open a date.', 'Send a submit request as IELP Admin.'], [M(4), 'Upload, Manual Entry, Submit disabled.', M(51)]),
      C('hdr', 'DTP Creation header and grid', 'UISS: Item 13-16, 34-46, 121-127', [PL, OPEN], ['Daily Plan Date, DTP Model, Operation Type, Planner; Upload, Manual Entry, IPMS sections; grid with filters, status, paging; Summary / History dialogs.'])]},
     {'title': 'Manual Entry and Edit', 'items': [
      C('add', 'Add to Grid and DB', 'UISS: Item 21-33, 5.5, Msg no.15, Data Map blk 1, Data Map blk 5, Log 4',
        [PL, OPEN, 'Manual Entry: Export, Round Use N, LP DNX, Renban "STM01", From D1, To S1, ETD 15-Nov-2026, 40, Agent MAERSK, Container "MSKU1234565", Truck Type TRAILER, Shift 1; [+ Add to Grid].'],
        [M(15), f'Row status Available; DB (SQL TD-10) {D2} row (DTP_DATE, COMPANY_ID, RENBAN, FROM_LOC, TO_LOC, CONTAINER_NO ...); {LAO} row; ' + L(4, {'DTP_DET_ID': 'id', 'added|edited|deleted|retried': 'added', 'user': 'planner'})]),
      C('val', 'Record validation (all errors at once)', 'UISS: 5.5, Msg no.6, Msg no.7, Msg no.8, Msg no.9, Msg no.10, Msg no.11, Msg no.12, Msg no.13, Msg no.14',
        ['Manual Entry: enter the invalid values of Test Data table A, [+ Add to Grid].'],
        ['Each field shows its message: ' + M(6) + ', ' + M(7), M(8) + ', ' + M(9) + ', ' + M(10) + ', ' + M(11), M(12) + ', ' + M(13) + ', ' + M(14), 'Nothing added.']),
      C('edit', 'Edit a record', 'UISS: Item 126, Msg no.16, Data Map blk 2', ['Options > Edit on a Validation Error row, correct the field, [Save].'], [M(16), 'Status Available; DB: changed columns, VERSION + 1 [DCR].']),
      C('del', 'Delete records', 'UISS: Item 37, Msg no.33, Msg no.34, Data Map blk 7', ['Select 2 Manual / Excel rows and 1 IPMS row, [Delete], confirm.'], [M(33), M(34, {'n': '2'}) + '; IPMS row kept.'])]},
     {'title': 'Upload and IPMS', 'items': [
      C('upload', 'Excel upload from the screen', 'UISS: Item 18-20, 125, 5.4, Msg no.18, Msg no.19, Msg no.20, Msg no.21, Msg no.22, Msg no.23',
        ['Click Download Template.', 'Upload wrong.csv; a file with renamed columns; an empty template; a file with 3 row errors; a valid file of 5 rows.'],
        [M(23), M(18) + ' / ' + M(19) + ' / ' + M(20), M(21, {'n': '3'}) + '; Upload error dialog Row / Column / Error.', M(22, {'n': '5'}) + ' (backend: ST DTP Excel Upload).']),
      C('ipms', 'Load / Refresh from IPMS', 'UISS: Item 34-35, 5.6, Msg no.24, Msg no.25, Msg no.26, Log 1',
        ['Click Load / Refresh from IPMS (stub with 3 new records).', 'Click again (no new data).', 'Stop the IPMS stub, click again.'],
        [M(24, {'n': '3'}), M(25), M(26) + '; ' + L(1)])]},
     {'title': 'Select and Submit', 'items': [
      C('submit', 'Submit selected records', 'UISS: Item 36, 39, 124, 5.7, 5.8, Msg no.27, Msg no.28, Msg no.31, Data Map blk 4, Data Map blk 5, Log 2',
        ['[Submit DTP] with nothing selected.', 'Select 3 Available rows, [Submit DTP (3)], [Cancel], then again and confirm.'],
        [M(27), M(28, {'n': '3'}), M(31, {'n': '3'}), f'DB (SQL TD-11): {D2} STATUS SUBMITTED, SUBMITTED_BY / SUBMITTED_DT, VERSION + 1 [DCR]; ' + L(2)]),
      C('subfail', 'Submit rejected / server error', 'UISS: Msg no.17, Msg no.29, Msg no.30, Log 3',
        ['Select a row that another user submitted meanwhile; submit.', 'Submit a key already submitted on another date.', 'Stop the server during submit.'],
        [M(29, {'n': '1'}), M(17), M(30) + '; ' + L(3)]),
      C('retry', 'Retry failed record', 'UISS: Item 40, Msg no.32, Data Map blk 6', ['Options > Retry on a Failed record.'], [M(32), 'STATUS QUEUED, FAIL_REASON cleared (refer ST DTP Queue Processing).'])]},
     {'title': 'Master KPI and Payment Type', 'items': [
      C('kpi', 'DTP Creation vs Master KPI (By Resources / By Trip)', 'UISS: Item 52-72, 5.11, 5.14, Msg no.36, Msg no.52',
        ['Select DTP above the Daily Trip of DNX; select a LP without Order Sharing.', 'Set Master KPI By Trip total = 95%.'],
        [M(36) + ' (not blocking)', M(52, {'x': '95.00'})]),
      C('pay', 'Payment Type per DTP', 'UISS: Item 47-51, 5.15, Msg no.53, Msg no.54, Msg no.55, Msg no.56, Data Map blk 11',
        ['Submit a record without Payment Type.', 'Set Payment Type By Trip for a LP without By Trip in Master KPI.', 'Change Payment Type of a submitted record.', 'Set Payment Type ▾ = By Resources for 2 selected rows.'],
        [M(53, {'n': '1'}), M(54, {'Payment Type': 'By Trip'}), M(55), M(56, {'n': '2', 'type': 'By Resources'}) + '; DB PAY_TYPE (DCR-17).'])]},
     {'title': 'DTP Switching and Maintenance', 'items': [
      C('switch', 'DTP Switching (rollback)', 'UISS: Item 73-79, 5.12, Msg no.37, Msg no.38, Msg no.39, Msg no.40, Msg no.41, Data Map blk 8',
        ['Tick DTP Switching on a Processed record, [DTP Switching (1)].', 'Confirm Rollback.', 'Repeat for a record whose driver has started; for a record changed meanwhile; with the DB stopped.'],
        [M(41), M(37) + ' (backend: ST DTP Switching).', M(38) + ' / ' + M(39) + ' / ' + M(40)]),
      C('maint', 'DTP Maintenance: delete / restore / change / save', 'UISS: Item 80-120, 5.13, Msg no.42, Msg no.43, Msg no.44, Msg no.45, Msg no.49, Msg no.50, Data Map blk 9, Data Map blk 10',
        ['Click a calendar entry DTP 2 of 15-Nov-2026 (maintenance).', '[Save] without change.', 'Select 2 rows, Delete Selected; Restore 1; change Renban of a row; [Save], confirm.', 'Change a cell, click Back.'],
        [M(49), M(42, {'n': '2'}) + ', ' + M(43, {'n': '1'}), M(44, {'date': '15-Nov-2026'}) + '; ' + M(45, {'n': '1', 'm': '1'}), M(50)])]}]
    ab = [C('mfail', 'Maintenance save rejected', 'UISS: Msg no.46, Msg no.47, Msg no.48', ['Driver starts an order after the change; [Save].', 'Clear a mandatory cell, [Save].', 'Stop DB, [Save].'], [M(46, {'n': '1'}), M(47, {'n': '1'}), M(48)]),
          C('version', 'Concurrency check', 'UISS: Msg no.35', ['A and B edit the same record; B saves first, A saves.'], [M(35)])]
    td = {'precondition': ['Users Planner VPLD, IELP Admin; System Master backdate / advance days set (TB_M_SYSTEM).', 'Master: LP DNX, PNJ (Master KPI), locations D1, S1; IPMS stub.', DCRN],
          'data': [['{tc:val}', 'A LP / Renban', 'blank / "ST-M01" (21 chars)', 'Msg 6 / Msg 10'], ['{tc:val}', 'A Round Use / Ctr Size', '"X" / "30"', 'Msg 7'], ['{tc:val}', 'A From / To', 'unknown "ZZ" / To = From', 'Msg 8 / Msg 9'],
                   ['{tc:val}', 'A ETD / Arrival time', '"31-02-2026" / "25:00"', 'Msg 11'], ['{tc:val}', 'A Container', '"MSKU1234560"', 'Msg 12'], ['{tc:val}', 'A Container (dup)', 'in grid / submitted', 'Msg 13 / Msg 14']],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:add}', 'title': 'DTP record', 'sql': f"SELECT * FROM {D2} WHERE DTP_DATE = '2026-11-15' AND CONTAINER_NO = 'MSKU1234565';\nSELECT * FROM {LAO} WHERE DTP_DET_ID = :id;"},
                         {'id': 'TD-11', 'tc': '{tc:submit}', 'title': 'Submitted', 'sql': f"SELECT DTP_DET_ID, STATUS, SUBMITTED_BY, SUBMITTED_DT, VERSION FROM {D2} WHERE DTP_DET_ID IN (:ids);  -- STATUS / VERSION [DCR]"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def dtp_upload(u):
    L = u.L
    E = ['Login as Planner VPLD, open Planning Order 15-Nov-2026 (Universal DTP).', 'Upload Excel: [Choose File] with the test file (Test Data).']
    LC = LOGCHK
    n = [C('start', 'Upload started: log', 'UISS: Func Flow step 1, Log no.1, Data Map blk 1', [LC(), 'Check TB_R_DTP_UPLOAD_LOG (SQL TD-10).'], [L(1, {'UPLOAD_ID': 'id', 'USER': 'planner', 'DTP_DATE': '15-Nov-2026', 'FILE_NAME': 'dtp_ok.xlsx'}), 'STATUS PROCESSING, START_DT, CREATED_BY.'], execution=E),
         C('temp', 'Rows to temp and validation', 'UISS: Func Flow step 4-5, 4.1, Data Map blk 2, Data Map blk 3', ['Check TB_T_DTP_UPLOAD (SQL TD-11).'], ['One row per data row (*_TXT as typed), VALIDATION_STATUS V, ERROR_MSG empty.'], execution=E),
         C('ins', 'Records inserted', 'UISS: Func Flow step 7, 4.2, Data Map blk 4, Data Map blk 5', ['Check DTP records and activity log (SQL TD-12).'], [f'{D2}: 5 rows, DTP_DATE, COMPANY_ID, RENBAN, FROM_LOC, TO_LOC, CONTAINER_NO, status Available; {LAO} one row each.'], execution=E),
         C('end', 'Upload completed', 'UISS: Func Flow step 8, 4.3, Log no.17, Data Map blk 6, Data Map blk 7', [LC(), 'Check log and temp table.'], [L(17, {'ADDED_ROWS': '5', 'FILE_NAME': 'dtp_ok.xlsx'}), 'Log STATUS SUCCESS, counts, END_DT; temp rows deleted.'], execution=E)]
    ab = [C('lock', 'Upload while another is running', 'UISS: Log no.2', [LC()], [L(2)], execution=['Start a large upload; upload again with the same user.']),
          C('file', 'File errors', 'UISS: Func Flow step 3, Log no.3, Log no.4, Log no.5, Log no.6', [LC()], [L(3), L(4), L(5), L(6), 'Nothing in temp / DTP tables.'], execution=['Upload wrong.csv; a file above the size limit (TBD); a file with renamed columns; an empty template.'], tbd='Max size TBD'),
          C('rows', 'Row errors: nothing added', 'UISS: 4.1.1-4.1.4, Log no.7, Log no.8, Log no.9, Log no.10, Log no.11, Log no.12, Log no.13, Log no.14, Log no.15',
            [LC(), 'Check temp rows (SQL TD-11) and DTP table.'], ['One log per error: ' + ', '.join(f'Log no.{i}' for i in range(7, 15)) + ' (Test Data table A rows 1-8).', L(15, {'ERROR_ROWS': '8'}), 'Temp rows E with ERROR_MSG; no DTP record added.'],
            execution=['Upload dtp_errors.xlsx (Test Data table A).']),
          C('db', 'Insert failed', 'UISS: Log no.16', [LC()], [L(16), 'Rollback; log STATUS ERROR.'], execution=['Lock ielp.DTP_2_DETAIL in the test DB; upload dtp_ok.xlsx.']),
          C('sys', 'Unexpected error', 'UISS: Log no.18', [LC()], [L(18)], execution=['Stop the DB during validation.'])]
    td = {'precondition': ['Planner VPLD; LP DNX, PNJ; locations D1, S1; DTP of 15-Nov-2026 open.', 'Proposed tables TB_T_DTP_UPLOAD / TB_R_DTP_UPLOAD_LOG (not in ELIPS - DCR) created in the test DB.'],
          'data': [['{tc:start}', 'dtp_ok.xlsx', '5 valid rows (format_DTP2_1.xlsx)', '5 added'],
                   ['{tc:rows}', 'A row 1-8', 'blank LP; Ctr Size 30; unknown From; To = From; Renban 21 chars / bad date; bad check digit; same container twice; container submitted', 'Log 7..14']],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:start}, {tc:end}', 'title': 'Upload log', 'sql': 'SELECT * FROM TB_R_DTP_UPLOAD_LOG ORDER BY UPLOAD_ID DESC;'},
                         {'id': 'TD-11', 'tc': '{tc:temp}, {tc:rows}', 'title': 'Temp rows', 'sql': 'SELECT ROW_NO, VALIDATION_STATUS, ERROR_MSG FROM TB_T_DTP_UPLOAD WHERE UPLOAD_ID = :upload_id ORDER BY ROW_NO;'},
                         {'id': 'TD-12', 'tc': '{tc:ins}', 'title': 'DTP records', 'sql': f"SELECT * FROM {D2} WHERE DTP_DATE = '2026-11-15' ORDER BY DTP_DET_ID;\nSELECT * FROM {LAO} WHERE DTP_DET_ID IN (:ids);"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


def dtp_queue(u):
    L = u.L
    E = ['Submit 3 DTP records on Planning Order (Planner VPLD); the queue job runs (scheduler / trigger TBD).']
    LC = LOGCHK
    n = [C('start', 'Queue started', 'UISS: Func Flow step 1-2, Log no.1, Data Map blk 1, Data Map blk 2', [LC(), 'Check the records (SQL TD-10).'], [L(1, {'N': '3'}), 'STATUS QUEUED [DCR]; LOG_ACTIVITY_ORDER rows QUEUED.'], execution=E),
         C('proc', 'Daily order created', 'UISS: Func Flow step 3-6, 4.1, 4.2, Log no.8, Data Map blk 3, Data Map blk 4, Data Map blk 5, Data Map blk 6, Data Map blk 7, Data Map blk 8',
           [LC(), 'Check ORDER_CYCLE and DTP record (SQL TD-10, TD-11).'], [L(8), f'{OC}: ORDER_NO, cycle 1 DTP Creation Release, PAY_TYPE (DCR-17); {D2}: STATUS PROCESSED, ORDER_NO; history PROCESSING / PROCESSED.'], execution=E),
         C('end', 'Queue finished', 'UISS: Log no.9', [LC()], [L(9, {'PROCESSED': '3', 'FAILED': '0'})], execution=E),
         C('empty', 'Nothing waiting', 'UISS: Log no.4', [LC()], [L(4)], execution=['Run the job with no submitted record.']),
         C('nodouble', 'No double processing', 'UISS: 4.3', ['Run two job instances at the same time; check ORDER_CYCLE.'], ['Each record processed once; one order per record.'], execution=E)]
    ab = [C('db', 'DB not reachable / parameter missing', 'UISS: Log no.2, Log no.3', [LC()], [L(2), L(3)], execution=['Stop the DB; run. Then remove the queue parameter in TB_M_SYSTEM; run.']),
          C('invalid', 'Record no longer valid', 'UISS: 4.4, Log no.5, Data Map blk 9, Data Map blk 10', [LC(), 'Check the record.'], [L(5), 'STATUS FAILED, FAIL_REASON; history FAILED.'], execution=['Deactivate the LP of a submitted record; run.']),
          C('retry', 'Order creation fails (retryable)', 'UISS: Log no.6, Log no.7', [LC()], [L(6), L(7) + ' after the attempt limit (TBD).'], execution=['Make the order insert fail (test hook); run several times.']),
          C('stop', 'Unexpected stop', 'UISS: Log no.10', [LC()], [L(10)], execution=['Kill the DB connection during processing.'])]
    td = {'precondition': ['3 records of 15-Nov-2026 submitted; queue parameters in ielp.TB_M_SYSTEM.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:start}, {tc:proc}', 'title': 'Records', 'sql': f"SELECT DTP_DET_ID, STATUS, ORDER_NO, FAIL_REASON, ATTEMPT_CNT, VERSION FROM {D2} WHERE DTP_DET_ID IN (:ids);\nSELECT * FROM {LAO} WHERE DTP_DET_ID IN (:ids) ORDER BY CREATED_DATE;"},
                         {'id': 'TD-11', 'tc': '{tc:proc}', 'title': 'Daily order', 'sql': f"SELECT ORDER_NO, CYCLE_SEQ, STATUS_CODE, DTP_HEADER_ID, PAY_TYPE FROM {OC} WHERE ORDER_NO IN (:orders);"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


def dtp_switching(u):
    L = u.L
    E = ['Login as Planner VPLD, open Planning Order 15-Nov-2026, tick DTP Switching on the records of the case, [DTP Switching], [Confirm Rollback].']
    LC = LOGCHK
    n = [C('start', 'Request started', 'UISS: Func Flow step 1, Log no.1, Data Map blk 1', [LC(), 'Check TB_R_DTP_SWITCH_REQ (SQL TD-10).'], [L(1, {'n': '2'}), 'STATUS PROCESSING, TOTAL_RECORDS 2.'], execution=E),
         C('queued', 'Rollback of a record not yet processed', 'UISS: 4.1, Data Map blk 2, Data Map blk 7, Data Map blk 8', ['Check the record (SQL TD-11).'], ['Queue row removed; record back to Available; history row.'], execution=['Roll back a Queued record.']),
         C('processed', 'Rollback of a processed record with truck', 'UISS: Func Flow step 5-7, 4.4, 4.5, Log no.10, Data Map blk 3, Data Map blk 4, Data Map blk 5, Data Map blk 6, Data Map blk 9',
           [LC(), 'Check order, truck, driver sync queue, audit (SQL TD-11).'], [L(10), f'{OC} cancelled, truck released, ORDER_TRUCK_H row, TB_T_DRIVER_SYNC_QUEUE REMOVE event, TB_H_DTP_SWITCH snapshot.'], execution=['Roll back a Processed record with truck B 1234 DN, driver not started.']),
         C('end', 'Request finished', 'UISS: Log no.11, Data Map blk 10', [LC()], [L(11, {'n': '2'}), 'STATUS SUCCESS, SWITCHED_RECORDS 2, END_DT.'], execution=E),
         C('idem', 'Same request sent again', 'UISS: 4.3, Log no.2', [LC()], [L(2), 'Same result, nothing changed again.'], execution=['Resend the same REQUEST_ID (browser tools).'])]
    ab = [C('auth', 'Not allowed / nothing selected', 'UISS: Log no.3, Log no.4', [LC()], [L(3), L(4)], execution=['Send the request as IELP Admin; send with an empty list.']),
          C('db', 'DB not reachable', 'UISS: Log no.5', [LC()], [L(5)], execution=['Stop the DB; send.']),
          C('elig', 'Record not eligible', 'UISS: 4.1, Log no.6, Log no.7, Log no.8', [LC(), 'Check that nothing changed.'], [L(6), L(7), L(8), 'Batch rule: nothing rolled back (4.2).'], execution=['Send an Available record; a record changed meanwhile; a record whose driver started.']),
          C('fail', 'Rollback failed / stopped', 'UISS: Log no.9, Log no.12', [LC()], [L(9), L(12), 'Transaction rolled back.'], execution=['Lock ielp.ORDER_CYCLE; send. Then kill the connection during step 5.'])]
    td = {'precondition': ['Records of 15-Nov-2026: one Queued, one Processed with truck (driver not started), one started.', 'Proposed tables TB_R_DTP_SWITCH_REQ / TB_H_DTP_SWITCH / TB_T_DRIVER_SYNC_QUEUE (DCR) created.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:start}, {tc:end}', 'title': 'Request', 'sql': 'SELECT * FROM TB_R_DTP_SWITCH_REQ ORDER BY START_DT DESC;'},
                         {'id': 'TD-11', 'tc': '{tc:queued}, {tc:processed}', 'title': 'Effects', 'sql': f"SELECT DTP_DET_ID, STATUS, ORDER_NO, VERSION FROM {D2} WHERE DTP_DET_ID IN (:ids);\nSELECT * FROM {OC} WHERE ORDER_NO = :order_no;\nSELECT * FROM ielp.ORDER_TRUCK_H WHERE ORDER_NO = :order_no;\nSELECT * FROM TB_T_DRIVER_SYNC_QUEUE WHERE ORDER_NO = :order_no;\nSELECT * FROM TB_H_DTP_SWITCH WHERE REQUEST_ID = :req;"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


def ipms(u):
    L = u.L
    E = ['Login as Planner VPLD, open Planning Order 15-Nov-2026, click [Load / Refresh from IPMS].']
    n = [C('load', 'New records received', 'UISS: Func Flow, 4., Log no.2, Data Map blk 1', ['Check the grid and DTP table (SQL TD-10).'], [L(2, {'n': '3'}), f'{D2}: 3 rows Data Source IPMS (new columns: DCR); invalid ones Validation Error.'], execution=E),
         C('none', 'No new data', 'UISS: Log no.3', ['Click again.'], [L(3), 'No duplicate rows.'], execution=E)]
    ab = [C('down', 'IPMS not responding', 'UISS: Log no.1', ['Check the screen.'], [L(1), 'Nothing inserted.'], execution=['Stop the IPMS stub; click Load / Refresh.'])]
    td = {'precondition': ['IPMS stub with 3 records for 15-Nov-2026 (one invalid).'],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:load}', 'title': 'IPMS records', 'sql': f"SELECT * FROM {D2} WHERE DTP_DATE = '2026-11-15';  -- Data Source IPMS (column TBD)"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


# ------------------------------------------------------------------ Planning Truck Assignment
def truck_assignment(u):
    M, L = u.M, u.L
    LP = 'Login as LP Admin of DNX, open Daily > Planning Truck Assignment.'
    TH = 'ielp.ORDER_TRUCK_H'
    g = [
     {'title': 'Initial', 'items': [
      C('open', 'Open screen per role', 'UISS: Item 1-7, 5.1, 5.2, Msg no.1, Msg no.2', [LP, 'Login as Planner VPLD, open the screen.', 'LP Admin DNX opens an order of PNJ (URL).'],
        ['Calendar with entries per date, legend, last refresh.', M(1, {'Role': 'Planner VPLD'}), M(2)]),
      C('list', 'Order list, filters, refresh, no data', 'UISS: Item 18-32, 5.8, Msg no.27, Msg no.28', [LP, 'Filter Delivery Date, Status, License Plate; [Clear].', 'Click Refresh.', 'Filter a date without orders.'],
        ['Matching DNX orders.', M(27), M(28)]),
      C('detail', 'Order detail and audit trail', 'UISS: Item 8-17, 37-39, 5.7, 5.9', ['Open the Assignment Order List of a date; open Detail and Audit Trail of an order.'], ['Orders with truck, status, seal; Audit Trail from ' + TH + '.'])]},
     {'title': 'Accept / Reject', 'items': [
      C('accept', 'Accept orders', 'UISS: 5.4, Msg no.3, Msg no.4, Msg no.10, Data Map blk 1, Data Map blk 2, Log 1', ['[Accept] without selection.', 'Select 2 Planning Order orders, [Accept], confirm.'],
        [M(10), M(3, {'n': '2'}), M(4, {'n': '2'}), f'DB (SQL TD-10): {OC}.LP_STATUS Accepted, LP_ACCEPTED_BY / DT, VERSION + 1; {TH} row; ' + L(1)]),
      C('reject', 'Reject orders', 'UISS: Item 33, 5.4, Msg no.6, Msg no.7, Msg no.8, Data Map blk 3, Data Map blk 4', ['[Reject] with blank reason, then "too far".', 'Reject an accepted order.', 'Reject with reason "truck not available".'],
        [M(6), M(7), M(8, {'n': '1'}) + '; DB LP_STATUS Rejected, LP_REJECT_REASON.']),
      C('accerr', 'Accept not allowed', 'UISS: Msg no.5', ['Accept a rejected order; an accepted order; an order with truck.'], [M(5)])]},
     {'title': 'Assign / Change Truck', 'items': [
      C('assign', 'Assign Truck', 'UISS: Item 9, 34, 5.5, Msg no.9, Msg no.11, Msg no.21, Data Map blk 5, Data Map blk 6, Data Map blk 7, Log 2',
        ['Select 2 orders, [Assign].', 'Select 1 accepted order, [Assign] with blank truck.', 'Truck = B 1234 DN, [Assign].'],
        [M(11), M(9), M(21, {'plate': 'B 1234 DN'}), f'DB: {D2}.LICENSE_PLATE / DRIVER_ID, {OC} ACTIVE_PLATE, STATUS, {TH} row; ' + L(2) + '; driver sync event (ST Driver Order Sync).']),
      C('asgerr', 'Assign validation', 'UISS: 5.5, 5.10, Msg no.12, Msg no.13, Msg no.14, Msg no.15, Msg no.16, Msg no.17, Msg no.18, Msg no.19, Msg no.20',
        ['Assign to: a not accepted order; a rejected order; an order with truck.', 'Truck: unknown; of PNJ; in maintenance; license expired; used on the same shift; other truck type.'],
        [M(12) + ' / ' + M(13) + ' / ' + M(14), M(15) + ' / ' + M(16) + ' / ' + M(17) + ' / ' + M(18, {'date': '10-Nov-2026'}) + ' / ' + M(19) + ' / ' + M(20)]),
      C('change', 'Change Truck', 'UISS: Item 35-36, 5.6, Msg no.22, Msg no.23, Msg no.24, Msg no.25, Data Map blk 8, Data Map blk 9, Data Map blk 10, Data Map blk 11',
        ['Change Truck on an order without truck; on a started order.', 'Same plate.', 'New plate B 5678 DN, reason, confirm.'],
        [M(22), M(23), M(24) + ' then ' + M(25, {'plate': 'B 5678 DN'}), 'DB: old assignment released, new one active, ' + TH + ' row (PREV / NEW plate).']),
      C('multi', 'Bulk result with failures', 'UISS: Msg no.26', ['Accept 3 orders where one was rejected meanwhile.'], [M(26, {'n': '2'})])]}]
    ab = [C('version', 'Concurrency check', 'UISS: Msg no.29', ['A and B open the same order; B accepts first.'], [M(29)]),
          C('syserr', 'System error with rollback', 'UISS: Msg no.30, Log 3', ['Stop DB; Assign.'], [M(30), L(3)])]
    td = {'precondition': ['LP Admin DNX, Planner VPLD; orders of 15-Nov-2026 in Planning Order for DNX and PNJ.', 'Trucks of DNX: B 1234 DN, B 5678 DN (active), maintenance truck, license-expired truck.', DCRN],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:accept}, {tc:assign}, {tc:change}', 'title': 'Order and history', 'sql': f"SELECT ORDER_NO, LP_STATUS, ACTIVE_PLATE, STATUS_CODE, VERSION FROM {OC} WHERE ORDER_NO = :order_no;  -- LP_* [DCR]\nSELECT ORDER_NO, LICENSE_PLATE, DRIVER_ID FROM {D2} WHERE ORDER_NO = :order_no;\nSELECT * FROM {TH} WHERE ORDER_NO = :order_no ORDER BY UPDATED_DT;"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def driver_sync(u):
    L = u.L
    E = ['Assign truck B 1234 DN to order ORD-01 on Planning Truck Assignment (writes TB_T_DRIVER_SYNC_QUEUE); the sync job runs (trigger TBD).']
    LC = LOGCHK
    n = [C('start', 'Sync started', 'UISS: Func Flow step 1-2, Log no.1, Data Map blk 1, Data Map blk 9', [LC(), 'Check TB_R_DRIVER_SYNC_LOG (SQL TD-10).'], [L(1, {'SYNC_ID': 'id', 'TRIGGER': 'EVENT'}), 'STATUS PROCESSING; queue row of ORD-01.'], execution=E),
         C('add', 'Driver order added and published', 'UISS: 4.3, 4.5, Log no.13, Data Map blk 2, Data Map blk 5, Data Map blk 6, Data Map blk 7', [LC(), 'Check TB_R_DRIVER_ORDER, outbox, queue (SQL TD-11); MQTT client on the topic.'],
           [L(13), 'TB_R_DRIVER_ORDER rows per cycle (plate, driver, route, lat / lng); outbox STATUS PUBLISHED; queue DONE; message received on the topic.'], execution=E),
         C('upd', 'Update / remove on change truck', 'UISS: 4.3, Data Map blk 3, Data Map blk 4', ['Check TB_R_DRIVER_ORDER.'], ['Old plate rows ACTIVE_FLAG N (REMOVE), new plate rows ADD; one message per change.'], execution=['Change Truck of ORD-01 to B 5678 DN; run the job.']),
         C('end', 'Sync finished', 'UISS: Log no.16, Data Map blk 8', [LC()], [L(16)], execution=E),
         C('none', 'No event / no assignment', 'UISS: Log no.5, Log no.7', [LC()], [L(5), L(7)], execution=['Run the job with an empty queue; then queue an order without active truck.'])]
    ab = [C('lock', 'Run still processing', 'UISS: Log no.2', [LC()], [L(2)], execution=['Start a second run while the first is running.']),
          C('cfg', 'DB / parameter / broker errors', 'UISS: Log no.3, Log no.4, Log no.11', [LC()], [L(3), L(4), L(11)], execution=['Stop DB; remove the sync parameter in TB_M_SYSTEM; stop the HiveMQ broker (one per run).']),
          C('data', 'Data errors per event', 'UISS: 4.2, Log no.6, Log no.8, Log no.9, Log no.10', [LC(), 'Check queue rows ERROR.'], [L(6), L(8), L(9), L(10)],
            execution=['Queue an unknown order; an order with inactive truck; a truck without driver; an order without From location.']),
          C('pub', 'Publish / save errors and retry limit', 'UISS: Log no.12, Log no.14, Log no.15', [LC()], [L(12), L(14), L(15)], execution=['Deny the topic ACL; lock TB_R_DRIVER_ORDER; repeat failure up to the attempt limit (TBD).']),
          C('stop', 'Unexpected stop', 'UISS: Log no.17', [LC()], [L(17)], execution=['Kill the job during step 7.'])]
    td = {'precondition': ['Order ORD-01 with 2 cycles; trucks B 1234 DN, B 5678 DN with active drivers; HiveMQ test broker.', 'Proposed tables TB_T_DRIVER_SYNC_QUEUE, TB_R_DRIVER_ORDER, TB_R_DRIVER_MQ_OUTBOX, TB_R_DRIVER_SYNC_LOG (not in ELIPS) created.'],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:start}, {tc:end}', 'title': 'Sync log', 'sql': 'SELECT * FROM TB_R_DRIVER_SYNC_LOG ORDER BY START_DT DESC;'},
                         {'id': 'TD-11', 'tc': '{tc:add}, {tc:upd}', 'title': 'Driver orders', 'sql': "SELECT * FROM TB_R_DRIVER_ORDER WHERE ORDER_NO = 'ORD-01';\nSELECT * FROM TB_R_DRIVER_MQ_OUTBOX WHERE SYNC_ID = :sync_id;\nSELECT * FROM TB_T_DRIVER_SYNC_QUEUE WHERE ORDER_NO = 'ORD-01';"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


# ------------------------------------------------------------------ Delivery Note
def delivery_note(u):
    L = u.L
    E = ['Login as IELP Admin, open Daily Monitoring, open order ORD-01, click Surat Jalan ELIPS of cycle 1.']
    n = [C('pdf', 'Delivery Note PDF content', 'UISS: Item 1-22, 1., 2.2, 3., Log no.13', ['Open the PDF.'],
           ['Header: Printed By / Date, logo, company, title, Nama, No. Telp, No Polisi, Tanggal, SA Number, No Order, No Cycle Order, Cycle.', 'Body: NO, LOKASI ASAL, LOKASI TUJUAN, CTR NO, KETERANGAN.', 'Footer: officer label, stamp, division, watermark.', L(13, {'0': 'ORD-01-1', '1': '1', '2': 'size'})], execution=E),
         C('attach', 'PAS GR attachment', 'UISS: 4., Log no.16, Log no.15', ['Check the attachment and the log.'], [L(16), 'Second time: ' + L(15)], execution=['Trigger the GR attachment of the delivery (refer ST GR Attachment); run twice.'])]
    ab = [C('svc', 'Service / authorization errors', 'UISS: 2.1, Log no.1, Log no.2, Log no.7', ['Check the response and log.'], [L(1), L(2), L(7)], execution=['Stop the service; call without token; LP Admin of PNJ opens a DNX delivery.']),
          C('param', 'Parameter errors', 'UISS: 2.1, Log no.3, Log no.4, Log no.5, Log no.6', ['Check the response.'], [L(3), L(4), L(5), L(6)], execution=['Call without deliveryId; with "abc!"; unknown id; an id matching two deliveries.']),
          C('data', 'Incomplete data (DN-R01)', 'UISS: 2.3, Log no.8', ['Check the response.'], [L(8)], execution=['Delivery without driver phone.']),
          C('gen', 'Generation errors', 'UISS: 3., Log no.9, Log no.10, Log no.11, Log no.12', ['Check the response.'], [L(9), L(10), L(11), L(12)], execution=['Slow the generator past the timeout (TBD); make the generator fail; return an invalid PDF; request twice in parallel.'], tbd='SLA TBD'),
          C('gr', 'GR attachment failed', 'UISS: Log no.14', ['Check the log.'], [L(14)], execution=['Stop the PAS FTP stub; trigger the attachment.'])]
    td = {'precondition': ['Order ORD-01 with 2 cycles, driver, plate, SA number.'],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:pdf}', 'title': 'Data printed', 'sql': f"SELECT c.ORDER_NO, c.CYCLE_SEQ, c.CONTAINER_NO, c.FROM_LOC, c.TO_LOC FROM {OC} c WHERE c.ORDER_NO = 'ORD-01';\nSELECT * FROM ielp.ORDER_FILES WHERE ORDER_NO = 'ORD-01';"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


def gr_attachment(u):
    L = u.L
    E = ['Run the Talend job ELIPS-PAS GR attachment (scheduler / manual run, context of the test environment).']
    LC = LOGCHK
    n = [C('start', 'Run started', 'UISS: Func Flow step 1, Log no.1, Data Map blk 1', [LC(), 'Check the run log (SQL TD-10).'], [L(1), 'Run row with START_DT, RUN_STATUS RUNNING.'], execution=E),
         C('upload', 'Surat Jalan uploaded to PAS FTP', 'UISS: 4.1-4.3, Log no.16, Data Map blk 2', [LC(), 'Check the FTP folder and the file log.'], [L(16), 'File name pattern, size and hash logged (UPLOAD_STATUS SUCCESS).'], execution=E),
         C('ind', 'Indicators updated', 'UISS: 4.4, Log no.21, Data Map blk 3, Data Map blk 4, Data Map blk 5', [LC(), 'Check PAS TB_R_PR_H / TB_R_GR_IR (SQL TD-11).'], [L(21), 'PR_NOTES updated, GR_IR.SOURCE_TYPE 1, one log per GR.'], execution=E),
         C('end', 'Run finished', 'UISS: Log no.23, Data Map blk 6', [LC()], [L(23)], execution=E),
         C('idem', 'Rerun: already uploaded / already 1 / nothing waiting', 'UISS: 4.5, Log no.14, Log no.19, Log no.5', [LC()], [L(14), L(19), L(5)], execution=['Run the job again.'])]
    ab = [C('conn', 'Connection / FTP errors', 'UISS: Log no.2, Log no.3, Log no.4', [LC()], [L(2), L(3), L(4)], execution=['Stop the PAS DB; stop the FTP; wrong FTP password (one per run).']),
          C('ident', 'Identification errors', 'UISS: 4.1, Log no.6, Log no.7, Log no.8, Log no.9, Log no.10, Log no.11', [LC()], [L(6), L(7), L(8), L(9), L(10), L(11)],
            execution=['Prepare GR with unexpected PR_NOTES; without PO; SA not found / callback pending; two ELIPS matches; no Surat Jalan; delivery with several cycles.']),
          C('file', 'PDF / upload errors', 'UISS: 4.2, 4.3, Log no.12, Log no.13, Log no.15', [LC()], [L(12), L(13), L(15)], execution=['Empty PDF; file already in FTP; FTP write denied.']),
          C('indfail', 'Indicator errors and retry', 'UISS: 4.4, 4.5, Log no.17, Log no.18, Log no.20, Log no.22', [LC()], [L(17), L(18), L(20), L(22)],
            execution=['PR_NOTES changed meanwhile; indicator update disabled by context; lock TB_R_GR_IR; repeat failure up to the retry limit.']),
          C('stop', 'Unexpected stop', 'UISS: Log no.24', [LC()], [L(24)], execution=['Kill the job.'])]
    td = {'precondition': ['PAS test DB with GR waiting (TB_R_GR_IR SOURCE_TYPE <> 1) for ELIPS SA with Surat Jalan; PAS FTP test folder.'],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:start}, {tc:end}', 'title': 'Run log', 'sql': 'SELECT * FROM ielp.LOG_ITGPAS ORDER BY CREATED_DATE DESC;  -- run / file / GR log columns inferred (TBD)'},
                         {'id': 'TD-11', 'tc': '{tc:ind}', 'title': 'PAS indicators', 'sql': "SELECT PR_NO, PR_NOTES, CHANGED_BY, CHANGED_DT FROM TB_R_PR_H WHERE PR_NO = :pr_no;  -- PAS DB\nSELECT SOURCE_TYPE FROM TB_R_GR_IR WHERE <GR key>;"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


SPECS = {'UISS_Screen_Daily_Order_Monitoring': daily_monitoring, 'UISS_Report_Download_Daily_Order_Monitoring': download_dom,
         'UISS_Screen_DTP_Creation': dtp_creation, 'UISS_Batch_DTP_Excel_Upload': dtp_upload, 'UISS_Batch_DTP_Queue_Processing': dtp_queue,
         'UISS_Batch_DTP_Switching': dtp_switching, 'UISS_Batch_IPMS_DTP_Interface': ipms,
         'UISS_Screen_Planning_Truck_Assignment': truck_assignment, 'UISS_Batch_Driver_Order_Sync': driver_sync,
         'UISS_Report_Delivery_Note': delivery_note, 'UISS_Batch_ELIPS_PAS_GR_Attachment': gr_attachment}
