"""ST test specs (compact) for the Master data UISS. Database names follow the revised UISS (ELIPS schema + DCR)."""
from common import C, LOGCHK

ADMIN = 'Login as IELP Admin (Master screens: every role, decision G-COM-01).'


def trucking(u):
    """Compact script reviewed by the user (19 cases), database names updated to the revised UISS."""
    T = 'ielp.MS_TRUCKING_COMPANY'
    M = u.M
    OPEN = 'Open menu Master > Trucking Company (Add Mode).'
    VALID = 'Vendor Name = "PT. MAJU BERSAMA", Vendor Code = "MBL", SAP Vendor Code = "4000007001", NPWP = "3171234567890123"'
    g = [
     {'title': 'Initial', 'items': [
      C('open', 'Open screen: initial Add Mode', 'UISS: Item 1-16, Gen Desc 4.a mode 1, Gen Desc 4.b, 5.1 a-b', [ADMIN, 'Click menu Master, then submenu Trucking Company.'],
        ["Title 'Master Trucking Company', breadcrumb 'Master - Trucking Company'.", "Mode info 'Mode: Add trucking company baru'.",
         "All fields blank except Service Type = 'MRO'; NPWP placeholder '999.999.999.9-999.999'.",
         'Button control (mode 1.a / 1.b): form fields, Save, Cancel enabled; Search, Table View, Export .xls, Sort, Update, Delete, Paging enabled.']),
      C('list', 'Initial list and empty master', 'UISS: Item 17-40, Gen Desc 2.b, 5.1 c, 5.7 a, Msg no.22',
        ['Prepare 12 vendors, 1 deleted (SQL TD-01). Open the screen.', 'Empty the master (SQL TD-02) and open the screen again.'],
        ["Active and deleted vendors sorted by Vendor Name ascending; 10 rows per page, 'Showing 1 to 10 of 12 records'.",
         'Created By / Date, Updated By / Date hidden; Deletion Yes (red) / No (green); Update / Delete disabled on deleted rows.', 'Empty master: ' + M(22)])]},
     {'title': 'Search Operation', 'items': [
      C('search', 'Search: partial, case-insensitive, no result', 'UISS: Item 18, 5.6 a, MT-30, Msg no.22', ['Go to page 2.', 'Search = "maju".', 'Search = "yes".', 'Search = "ZZZ-NOT-EXIST".'],
        ["Step 2: rows containing 'MAJU' in any column; back to page 1; '(filtered from y total entries)'.", 'Step 3: only deleted vendors.', 'Step 4: ' + M(22) + '; keyword kept.'])]},
     {'title': 'Add Operation', 'items': [
      C('add', 'Save new vendor: normalisation and DB', 'UISS: Item 3-13, 5.2, 5.3 step 5-7, Msg no.16, Data Map blk 1, Log 1',
        [OPEN, 'Input Vendor Name = "pt.  maju bersama", Vendor Code = "mbl", SAP Vendor Code = "4000007001", NPWP = "3171234567890123" (Tab), Contact Name = "  Budi  ", E-Mail = "Budi@Maju.co.id", Phone = "021-4401234", Mobile Phone = "081234567801", Address = "Jl. Sunter 1".', 'Click [Save].'],
        ["Vendor Code shows 'MBL' while typing; NPWP shows '317.123.456.7-890.123' after Tab.", 'Save / Cancel disabled until the server responds; ' + M(16, {'code': 'MBL', 'name': 'PT. MAJU BERSAMA'}),
         'Form reset to Add Mode; list shows PT. MAJU BERSAMA, e-mail budi@maju.co.id.',
         f'DB (SQL TD-10) {T}: COMPANY_NAME, COMPANY_CODE, SAP_COMPANY_CODE, NPWP formatted, EMAIL lower case, IS_DELETE = 0, VERSION = 1 (DCR-02), SERVICE_TYPE = MRO (DCR-03), CREATED_BY = login user.']),
      C('mand', 'Mandatory fields blank', 'UISS: Item 16, 5.3 step 1, 5.3 step 8, Msg no.1', [OPEN, 'Leave all fields blank, click [Save].'],
        [M(1) + ' under Vendor Name, Vendor Code, SAP Vendor Code and NPWP at once.', 'Focus on Vendor Name; nothing saved.']),
      C('fmt', 'Format and length errors shown together', 'UISS: 5.3 step 2, Msg no.2, Msg no.3, Msg no.5, Msg no.7, Msg no.8, Msg no.10, Msg no.11, Msg no.12, MT-02..MT-11',
        [OPEN, 'Input the invalid values of Test Data table A (one per field), click [Save]; repeat with the other values of table A.', "Send Service Type = 'XYZ' through the request (browser tools)."],
        ['Each field shows its message at once (table A), e.g. ' + M(3), M(7), 'Nothing saved (SQL TD-10 no row).']),
      C('bound', 'Values exactly at the limits are accepted', 'UISS: Item 3, Item 5, Item 7, Item 9-12, DCR-01',
        [OPEN, 'Input the boundary values of Test Data table B (Vendor Name 100 chars, E-Mail 100 chars, SAP 10 digits, NPWP 16 digits, Phone 6 / 20, Mobile 10 / 15 digits, Address 300).', 'Click [Save].'],
        [M(16, {'code': 'MBL'}) + ' ; values saved unchanged (SQL TD-10; EMAIL varchar(100) after DCR-01).']),
      C('dup', 'Duplicate codes among active vendors', 'UISS: 5.3 step 3, Msg no.4, Msg no.6, Msg no.9', [OPEN, 'Vendor Code "DNX", SAP code and NPWP of active vendor DNX (SQL TD-01); click [Save].'],
        [M(4, {'code': 'DNX'}), M(6, {'sap': '4000006763'}), M(9), 'All three at once; nothing saved.']),
      C('reuse', 'Code of a deleted vendor can be reused', 'UISS: 5.3 step 3, Operation Desc Case-Input-Result', [OPEN, f'Input {VALID} with Vendor Code "PNJ" (old PNJ deleted, SQL TD-03); click [Save].'],
        [M(16, {'code': 'PNJ'}) + '; new PNJ active, old PNJ keeps IS_DELETE = 1.'], tbd='OP-04'),
      C('cancel', 'Cancel clears the form (Add and Update)', 'UISS: Item 14, 5.4 b, Msg no.18', [OPEN, 'Trigger an error with [Save], click [Cancel].', 'Update (✎) MBL, change Contact Name, click [Cancel].'],
        [M(18) + '; fields blank, errors removed, Add Mode.', 'Step 2: DB unchanged.'])]},
     {'title': 'Update Operation', 'items': [
      C('upd', 'Update vendor: Update Mode and DB', 'UISS: Item 15, Item 36, 5.4 a, Msg no.17, Data Map blk 2, Log 2', ['Click Update (✎) on MBL.', 'Contact Name = "Budi", E-Mail = "BUDI@MAJU.CO.ID", click [Save].'],
        ['Fields loaded, Vendor Code read only, row highlighted.', M(17, {'code': 'MBL', 'name': 'PT. MAJU BERSAMA'}),
         'DB (SQL TD-11): EMAIL = budi@maju.co.id, VERSION + 1, UPDATED_BY / UPDATED_DATE = login user / now, CREATED_BY unchanged.']),
      C('code', 'Vendor Code changed through the request', 'UISS: MT-12, Msg no.13', ['Load MBL in Update Mode; change COMPANY_CODE in the request to "MBX"; click [Save].'], [M(13) + '; nothing saved.'])]},
     {'title': 'Delete Operation', 'items': [
      C('del', 'Logical delete with confirmation', 'UISS: Item 35, Item 41-44, 5.5 a, 5.5 c, Msg no.19, Msg no.21, Data Map blk 3, Log 3', ['Click Delete (🗑) on MBL, click [Batal].', 'Click Delete again, click [Delete].'],
        ['Dialog with ' + M(19, {'code': 'MBL', 'name': 'PT. MAJU BERSAMA'}), 'Batal: IS_DELETE stays 0.', M(21, {'code': 'MBL', 'name': 'PT. MAJU BERSAMA'}) + '; Update / Delete disabled on the row.',
         'DB (SQL TD-12): IS_DELETE = 1, VERSION + 1, UPDATED_BY = login user.'])]},
     {'title': 'List and Download Operation', 'items': [
      C('util', 'Sort, Table View and Paging', 'UISS: Item 19, Item 21, Item 39, Item 40, 5.6 b-c, 5.7 a', ['Click header Vendor Code twice.', 'Table View: tick Created By, Created Date.', 'Tampilkan = 25, go to the last page.'],
        ['Ascending then descending.', 'Audit columns shown (DD.MM.YYYY HH:MI).', 'Page 1 with 25 rows; › disabled on the last page.']),
      C('export', 'Export .xls of the current search', 'UISS: Item 20, 5.6 d, MT-31, Msg no.23', ['Search "PT", hide Address, click [Export .xls].'],
        ["File 'Master_Trucking_Company_YYYYMMDD.xls', sheet 'Trucking Company', all filtered rows, visible columns only.", M(23)])]}]
    ab = [C('open_tr', 'Delete vendor used by an open transaction', 'UISS: 5.5 b, MT-21, Msg no.20, Log 4', ['PO Monthly Pending for DNX (SQL TD-04).', 'Delete DNX, confirm [Delete].'],
            [M(20, {'code': 'DNX', 'transaction': 'PO Monthly'}), 'IS_DELETE stays 0 (SQL TD-12).'], tbd='OP-05'),
          C('deleted', 'Update a vendor deleted by another user', 'UISS: MT-12, Msg no.14', ['User A loads MBL in Update Mode; user B deletes MBL; A clicks [Save].'], [M(14, {'code': 'MBL'})]),
          C('version', 'Data changed by another user (Update and Delete)', 'UISS: 5.8 a, MT-13, Msg no.15, Log 5, DCR-02',
            ['A and B load MBL; B saves, A clicks [Save].', 'A opens delete confirmation of DNX; B updates DNX; A clicks [Delete].'], ['Both: ' + M(15), "A's change / delete not saved."]),
          C('syserr', 'Server / DB error during Save', 'UISS: 5.3 step 6, Msg no.24, Log 6', ['Stop the DB connection (test environment).', f'Input {VALID}, click [Save].'], [M(24), 'Rolled back: no row inserted.'])]
    td = {'precondition': ['Login user: IELP Admin.', 'Active vendor DNX (SAP 4000006763), deleted vendor PNJ, 12 rows in total.', 'DB change requests DCR-01 (EMAIL 100), DCR-02 (VERSION), DCR-03 (SERVICE_TYPE) applied.'],
          'data': [['{tc:fmt}', 'A Vendor Name / Address', '101 / 301 characters', 'Msg 2'], ['{tc:fmt}', 'A Vendor Code', '"MB", "M-B", "MBLX"', 'Msg 3'],
                   ['{tc:fmt}', 'A SAP Vendor Code', '"400000700", "40000070011", "40000A7001"', 'Msg 5'], ['{tc:fmt}', 'A NPWP', '15 / 17 digits', 'Msg 8 [TBD OP-03]'],
                   ['{tc:fmt}', 'A E-Mail', '"budi@maju", 101 characters', 'Msg 10 / Msg 2'], ['{tc:fmt}', 'A Phone', '"021-44A", "12345", 21 chars', 'Msg 11'],
                   ['{tc:fmt}', 'A Mobile Phone', '"0712345678", "08123", 16 digits', 'Msg 12'], ['{tc:bound}', 'B limits', 'see case', 'Accepted']],
          'sql_setup': [{'id': 'TD-01', 'title': 'Vendors', 'sql': f"INSERT INTO {T} (COMPANY_ID, COMPANY_CODE, SAP_COMPANY_CODE, COMPANY_NAME, NPWP, IS_DELETE, CREATED_DATE, CREATED_BY)\nVALUES ('V001', 'DNX', '4000006763', 'PT. DUNEX', '317.123.456.7-000.001', '0', GETDATE(), 'test');  -- + 11 rows, PNJ with IS_DELETE '1'"},
                        {'id': 'TD-02', 'title': 'Empty master', 'sql': f'DELETE FROM {T};  -- test DB only'},
                        {'id': 'TD-03', 'title': 'Deleted PNJ', 'sql': f"UPDATE {T} SET IS_DELETE = '1' WHERE COMPANY_CODE = 'PNJ';"},
                        {'id': 'TD-04', 'title': 'Open transaction', 'sql': "-- ielp.PO_DETAIL row of COMPANY_ID of DNX with PO_HEADER.APPROVAL_STS pending (value TBD)"}],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:add}, {tc:fmt}, {tc:bound}', 'title': 'Inserted vendor', 'sql': f"SELECT COMPANY_NAME, COMPANY_CODE, SAP_COMPANY_CODE, NPWP, CONTACT_NAME, EMAIL, PHONE, MOBILE_PHONE, COMPANY_ADDRESS,\nIS_DELETE, SERVICE_TYPE, VERSION, CREATED_BY, CREATED_DATE FROM {T} WHERE COMPANY_CODE = 'MBL';"},
                         {'id': 'TD-11', 'tc': '{tc:upd}', 'title': 'Updated vendor', 'sql': f"SELECT EMAIL, CONTACT_NAME, VERSION, UPDATED_BY, UPDATED_DATE, CREATED_BY FROM {T} WHERE COMPANY_CODE = 'MBL';"},
                         {'id': 'TD-12', 'tc': '{tc:del}, {tc:open_tr}', 'title': 'Logical delete', 'sql': f"SELECT COMPANY_CODE, IS_DELETE, VERSION, UPDATED_BY FROM {T} WHERE COMPANY_CODE IN ('MBL', 'DNX');"}],
          'notes': ['Compact script: validations the UISS shows together are tested in one case; value variants in tables A / B.']}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def location(u):
    L, M = 'ielp.MS_LOCATION', u.M
    OPEN = 'Open menu Master > Location Code.'
    g = [
     {'title': 'Initial', 'items': [C('open', 'Open screen: form, map and list', 'UISS: Item 1-38, Gen Desc 4.b, 5.1', [ADMIN, OPEN],
        ['Form blank in Add Mode; map centred on the default area with marker / radius circle controls.', 'List of locations with Location Code, Loc Name, Sub Area, Auto Cycle, Cycle To Area, Auto Finish, Coordinates, Radius, addresses, Status; paging.'])]},
     {'title': 'Search Operation', 'items': [C('search', 'Search and no result', 'UISS: Item 21, 5.6, Msg no.17', ['Search = "sunter".', 'Search = "ZZZ".'],
        ['Rows matching code, name, sub area or addresses.', M(17)]),
      C('view', 'View location', 'UISS: Item 39-40', ['Click Opsi > View on S1.'], ['Modal with all location fields; Close (x) closes it.'])]},
     {'title': 'Add Operation', 'items': [
      C('add', 'Add location with map pick and DB', 'UISS: Item 3-16, 5.2-5.4, Msg no.10, Log 1', ['Location Name = "depo test", Alias = "dt1", Sub Area = DEPO, Radius = 75, Auto Finish = Yes.', 'Type "Cakung" in Location Address Google Map, pick a suggestion.', 'Click [Save].'],
        ['Latitude / Longitude filled (7 decimals), marker and radius circle shown.', M(10, {'Alias': 'DT1', 'Name': 'DEPO TEST'}),
         f'DB (SQL TD-10) {L}: LOCATION_NAME, LOCATION_ALIAS = DT1, LOCATION_LATITUDE / LOCATION_LANGITUDE as text, RADIUS = 75, AUTO_FINISH, STATUS = ACTIVE (DCR-04), VERSION = 1 (DCR-05), CREATED_BY.']),
      C('mand', 'Mandatory and format errors', 'UISS: 5.3, Msg no.1, Msg no.2, Msg no.4, Msg no.5, Msg no.6, Msg no.7', ['Click [Save] with blank form.', 'Then enter the invalid values of Test Data table A one by one, [Save].'],
        [M(1), 'Table A: ' + M(2) + ', Msg no.4, Msg no.5, Msg no.6, Msg no.7 for the related field; nothing saved.']),
      C('dup', 'Duplicate alias', 'UISS: Msg no.3', ['Add a location with Alias = "S1" (existing).'], [M(3, {'Alias': 'S1'})]),
      C('geo', 'Address not found / map service unavailable', 'UISS: Item 6, Msg no.11, Msg no.12', ['Type "xxqqzz" in the address field.', 'Block the map / geocoding service and open the screen.'],
        [M(11), M(12) + '; Latitude / Longitude can be typed.'])]},
     {'title': 'Update Operation', 'items': [
      C('upd', 'Edit location', 'UISS: Item 24, 5.4, Msg no.10, Log 2', ['Opsi > Edit on DT1; Radius = 100; [Save].'], [M(10, {'Alias': 'DT1'}), 'DB (SQL TD-11): RADIUS = 100, VERSION + 1, UPDATED_BY / UPDATED_DATE.']),
      C('inactive', 'Edit an INACTIVE location / change alias of a used location', 'UISS: Msg no.8', ['Edit INACTIVE X9 and save.', 'Edit used S1, change Alias, save.'], [M(8, {'Alias': 'X9'}), 'Alias change rejected (second text of Msg no.8).'])]},
     {'title': 'Deactivate / Delete Operation', 'items': [
      C('deact', 'Deactivate a used location', 'UISS: Item 41-43, 5.5, Msg no.13, Msg no.16, Log 3', ['Opsi > Deactivate on S1 (used in delivery), confirm.'], [M(13, {'Alias': 'S1'}), M(16, {'Alias': 'S1'}), 'DB: STATUS = INACTIVE (DCR-04).']),
      C('delete', 'Delete an unused location', 'UISS: Msg no.14, Msg no.15, Msg no.16, Log 4', ['Opsi > Delete on DT1 (never used), confirm.', 'Try Delete on S1 (used).'], [M(14), 'DT1 deleted (IS_DELETE, values TBD).', M(15, {'Alias': 'S1'})])]},
     {'title': 'Delivery Geofence (driver)', 'items': [
      C('geofence', 'Finish outside the radius / auto finish', 'UISS: 5.7, Msg no.18, Log 5, Log 6', ['Driver closes a delivery 300 m from S1 (radius 75).', 'Driver arrives inside the radius of a destination with Auto Finish = Yes.'],
        [M(18), 'Log no.5 written; ORDER_CYCLE.IS_FINISH_EX_GEOFENCE set (inferred).', 'Log no.6: delivery finished automatically.'], tbd='TBD geofence columns')]}]
    ab = [C('version', 'Concurrency check', 'UISS: Msg no.9, DCR-05', ['Users A and B edit DT1; B saves, A saves.'], [M(9)])]
    td = {'precondition': ['IELP Admin; locations S1 (used, ACTIVE), X9 (INACTIVE), DT1 created by the add case.', 'DCR-04 (STATUS), DCR-05 (VERSION) applied.'],
          'data': [['{tc:mand}', 'A Alias', '"D-1", 11 characters', 'Msg 2'], ['{tc:mand}', 'A Latitude / Longitude', '91 / 181', 'Msg 4'], ['{tc:mand}', 'A Radius', '0, "abc"', 'Msg 5'],
                   ['{tc:mand}', 'A Sub Area', 'value not in list', 'Msg 6'], ['{tc:mand}', 'A Name / addresses', '101 / 301 characters', 'Msg 7']],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:add}', 'title': 'Inserted location', 'sql': f"SELECT LOCATION_NAME, LOCATION_ALIAS, LOCATION_LATITUDE, LOCATION_LANGITUDE, RADIUS, AUTO_FINISH, AUTO_CYCLE, LOCATION_SUB, STATUS, VERSION, CREATED_BY\nFROM {L} WHERE LOCATION_ALIAS = 'DT1';"},
                         {'id': 'TD-11', 'tc': '{tc:upd}, {tc:deact}', 'title': 'Updated location', 'sql': f"SELECT RADIUS, STATUS, IS_DELETE, VERSION, UPDATED_BY, UPDATED_DATE FROM {L} WHERE LOCATION_ALIAS IN ('DT1', 'S1');"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def mileage(u):
    T, M = 'ielp.TB_M_MILEAGE', u.M
    OPEN = 'Open menu Master > Mileage.'
    g = [
     {'title': 'Initial', 'items': [C('open', 'Open screen: accordions and list', 'UISS: Item 1-31, 5.1, Msg no.11', [ADMIN, OPEN, 'Empty the table (SQL TD-02), reopen.'],
        ["Upload Excel accordion open, Manual Entry collapsed; badge 'IELP Admin only'.", 'List From Code / From / To Code / To / Mileage / dates, paging.', 'Empty: ' + M(11)])]},
     {'title': 'Search Operation', 'items': [C('search', 'Search and no result', 'UISS: Item 9, Msg no.12', ['Search = "SNT".', 'Search = "ZZZ".'], ['Matching routes.', M(12)])]},
     {'title': 'Manual Entry', 'items': [
      C('add', 'Add route mileage and DB', 'UISS: Item 3-7, 5.3, Msg no.9, Data Map blk 1, Log 1', ['Open Manual Entry; From = SNT, To = CKR, Mileage = "42,5"; [Save].'],
        [M(9), f'DB (SQL TD-10) {T}: FROM_CODE = SNT, TO_CODE = CKR, LOC_NAME_FROM / LOC_NAME_TO = location names, MILEAGE = 42.50 (DCR-06), STATUS = Active, VERSION = 1 (DCR-08).']),
      C('val', 'Validation errors', 'UISS: 5.3, Msg no.1, Msg no.2, Msg no.3, Msg no.4, Msg no.5, Msg no.6', ['[Save] with blank fields.', 'From = To = SNT.', 'Mileage = 0 / "abc".', 'From = inactive location D9.'],
        [M(1) + ', ' + M(2) + ', ' + M(3), M(4), M(5), M(6, {'Code': 'D9'})]),
      C('dup', 'Duplicate route', 'UISS: Msg no.7, DCR-07', ['From = SNT, To = KRW (existing); [Save].'], [M(7)]),
      C('upd', 'Edit mileage', 'UISS: Item 21, 5.4, Msg no.10, Data Map blk 2, Log 2', ['Click row SNT -> KRW; Mileage = 66; [Save].'], ['From / To locked.', M(10), 'DB (SQL TD-11): MILEAGE = 66.00, VERSION + 1, CHANGED_BY / CHANGED_DT.'])]},
     {'title': 'Upload Operation', 'items': [
      C('tpl', 'Download template', 'UISS: Item 29, Msg no.21', ['Click *) Download Template.'], ["File 'Template_Route_Mileage.xlsx' (Route Mileage, Active Locations, Notes).", M(21)]),
      C('upok', 'Upload a valid file (saved immediately)', 'UISS: Item 26-32, 5.10, Msg no.20', ['Choose File "mileage_ok.xlsx" (Test Data).'], ["'Validating Excel file...' then " + M(20, {'n': '1', 'm': '1'}) + ' + "1 route(s) unchanged"; uploaded rows highlighted.']),
      C('upbad', 'Upload with file / row errors', 'UISS: Item 33-40, Msg no.14, Msg no.15, Msg no.16, Msg no.17, Msg no.18, Msg no.19', ['Choose wrong.csv, a file without columns, an empty template, 1,001 rows, mileage_errors.xlsx, a file with only same mileages.'],
        ['Modal Upload validation failed with ' + M(14) + ' / Msg no.15 / Msg no.16 / Msg no.17 respectively.', 'mileage_errors.xlsx: ' + M(18, {'n': '4'}) + '; Row / Column / Error table; Download error list (CSV).', M(19), 'Nothing saved.'])]},
     {'title': 'List and Download Operation', 'items': [C('export', 'Table View / Export', 'UISS: Item 10-11, 22-24', ['Table View: show Created By; Export .xls.'], ['Column shown; file of the filtered list.'])]}]
    ab = [C('version', 'Concurrency check', 'UISS: Msg no.8, DCR-08', ['A and B edit SNT -> KRW; B saves, A saves.'], [M(8)]),
          C('cost', 'Missing mileage in cost calculation', 'UISS: 5.7, Msg no.13, Log 4', ['Calculate variable cost for a delivery D1 -> X7 without Active mileage.'], [M(13), u.L(4)]),
          C('dberr', 'DB error on save', 'UISS: Log 3', ['Stop DB; save a route.'], [u.L(3), 'Rolled back.'])]
    td = {'precondition': ['IELP Admin; routes SNT->KRW 65, CKR->KRW 28 Active; D9 inactive location.', 'DCR-06 (decimal), DCR-07 (PK FROM_CODE + TO_CODE), DCR-08 (STATUS, VERSION) applied.'],
          'data': [['{tc:upok}', 'mileage_ok.xlsx', 'SNT-CKR 42; SNT-KRW 66,5; CKR-KRW 28', '1 new, 1 update, 1 same'], ['{tc:upbad}', 'mileage_errors.xlsx', 'SNT-SNT 5; D9-KRW 9; CKR-SNT 0; repeated route', '4 row errors']],
          'sql_setup': [{'id': 'TD-02', 'title': 'Empty table', 'sql': f'DELETE FROM {T};  -- test DB only'}],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:add}', 'title': 'Inserted route', 'sql': f"SELECT FROM_CODE, TO_CODE, LOC_NAME_FROM, LOC_NAME_TO, MILEAGE, STATUS, VERSION, CREATED_BY, CREATED_DT FROM {T} WHERE FROM_CODE = 'SNT' AND TO_CODE = 'CKR';"},
                         {'id': 'TD-11', 'tc': '{tc:upd}', 'title': 'Updated route', 'sql': f"SELECT MILEAGE, VERSION, CHANGED_BY, CHANGED_DT FROM {T} WHERE FROM_CODE = 'SNT' AND TO_CODE = 'KRW';"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def mileage_upload(u):
    """Batch spec reviewed earlier, database names updated to the revised UISS."""
    T = 'ielp.TB_M_MILEAGE'
    E = ['Login as IELP Admin, open Master > Mileage.', 'In the Upload Excel accordion click [Choose File] and select the test file (Test Data).']
    LC = LOGCHK
    n = [C('start', 'Upload started: log and lock', 'UISS: Func Flow step 1, Log no.1, Data Map blk 1', [LC(), 'Check TB_R_MILEAGE_UPLOAD_LOG (SQL TD-10).'],
           [{'text': u.L(1, {'USER': 'login user', 'FILE_NAME': 'mileage_ok.xlsx'})}, 'STATUS PROCESSING while running; FILE_NAME, START_DT, CREATED_BY (DCR-10 table).'], execution=E),
         C('load', 'Rows loaded to temp table', 'UISS: Func Flow step 4, Data Map blk 2', ['Check TB_T_MILEAGE_UPLOAD (SQL TD-11).'], ['One row per data row: ROW_NO, *_TXT as typed, VALIDATION_STATUS N -> V, ACTION NEW / UPDATE / SAME.'], execution=E),
         C('new', 'New route inserted', 'UISS: Func Flow step 8, Data Map blk 5, MM-24', ['Check route SNT -> CKR (SQL TD-12).'], [f'{T}: FROM_CODE SNT, TO_CODE CKR, LOC_NAME_FROM / TO, MILEAGE 42.00, STATUS Active, LAST_UPLOAD_ID, VERSION 1, CREATED_BY.'], execution=E),
         C('upd', 'Existing route updated + history', 'UISS: Data Map blk 6, Data Map blk 7', ['Check SNT -> KRW and TB_H_MILEAGE (SQL TD-13).'], ['MILEAGE 66.50, VERSION + 1, CHANGED_BY / CHANGED_DT; TB_H_MILEAGE OLD 65 NEW 66.5.'], execution=E),
         C('ok', 'Upload completed', 'UISS: Func Flow step 9, Log no.11, Data Map blk 8, Data Map blk 9', [LC(), 'Check log and temp rows.'], [u.L(11, {'n': '1', 'm': '1'}), 'Log STATUS SUCCESS, counts; temp rows deleted.'], execution=E)]
    ab = [C('lock', 'Second upload while processing', 'UISS: Log no.2', [LC()], [u.L(2), 'Nothing changed.'], execution=['Start a 1,000-row upload; upload a second file with the same user.']),
          C('file', 'File errors', 'UISS: Func Flow step 3, Log no.3, Log no.4, Log no.5, Log no.6', [LC()], [u.L(3), u.L(4, {'COLUMNS': 'FROM CODE, TO CODE, MILEAGE (KM)'}), u.L(5), u.L(6, {'n': '1001'}), 'STATUS ERROR; nothing in temp / master.'],
            execution=['Upload wrong.csv, a file with header FROM | TO | KM, an empty template, a 1,001-row file (one per run).']),
          C('rows', 'Row errors: nothing saved', 'UISS: Func Flow step 5-6, Log no.7, Log no.8, MM-25', [LC(), 'Check temp table and master.'], [u.L(7, {'ROW_NO': '3', 'ERROR_MSG': 'Location From and Location To cannot be the same'}), u.L(8, {'n': '4'}), 'Temp rows E with ERROR_COLUMN / ERROR_MSG; master unchanged.'],
            execution=['Upload mileage_errors.xlsx (Test Data).']),
          C('same', 'All routes same mileage', 'UISS: Log no.9', [LC()], [u.L(9)], execution=['Upload a file with only CKR -> KRW = 28.']),
          C('db', 'DB error during save', 'UISS: Log no.10', [LC()], [u.L(10), 'Rollback; STATUS ERROR.'], execution=['Lock TB_M_MILEAGE in the test DB; upload mileage_ok.xlsx.']),
          C('sys', 'Unexpected error', 'UISS: Log no.12', [LC()], [u.L(12)], execution=['Stop the DB connection during validation.'])]
    td = {'precondition': ['Routes SNT->KRW 65, CKR->KRW 28 Active; D9 inactive.', 'DCR-06..DCR-10 applied (decimal, PK, STATUS / VERSION, LAST_UPLOAD_ID and the upload tables).'],
          'data': [['{tc:start}-{tc:ok}', 'mileage_ok.xlsx', 'SNT-CKR 42; SNT-KRW 66,5; CKR-KRW 28', '1 new, 1 update, 1 same'], ['{tc:rows}', 'mileage_errors.xlsx', 'SNT-SNT 5; D9-KRW 9; CKR-SNT 0; SNT-KRW twice', '4 row errors']],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:start}, {tc:ok}', 'title': 'Upload log', 'sql': 'SELECT * FROM TB_R_MILEAGE_UPLOAD_LOG ORDER BY UPLOAD_ID DESC;'},
                         {'id': 'TD-11', 'tc': '{tc:load}, {tc:rows}', 'title': 'Temp rows', 'sql': 'SELECT * FROM TB_T_MILEAGE_UPLOAD WHERE UPLOAD_ID = :upload_id ORDER BY ROW_NO;'},
                         {'id': 'TD-12', 'tc': '{tc:new}', 'title': 'Inserted route', 'sql': f"SELECT * FROM {T} WHERE FROM_CODE = 'SNT' AND TO_CODE = 'CKR';"},
                         {'id': 'TD-13', 'tc': '{tc:upd}', 'title': 'Update + history', 'sql': f"SELECT MILEAGE, VERSION, CHANGED_BY FROM {T} WHERE FROM_CODE = 'SNT' AND TO_CODE = 'KRW';\nSELECT * FROM TB_H_MILEAGE WHERE UPLOAD_ID = :upload_id;"}]}
    return {'header': u.header(), 'groups': [{'title': 'Normal Case', 'items': n}], 'abnormal': ab, 'test_data': td}


def price(u):
    P, M = 'ielp.MS_ROUTE_PRICE', u.M
    g = [{'title': 'Initial', 'items': [C('open', 'Open screen: filters and list', 'UISS: Item 1-30, 5.1, Msg no.1', [ADMIN, 'Open Master > Price.', 'Empty the price table (test DB) and reopen.'],
             ['Filters Periode, Trucking Company, Component, Status; list read only with Periode, Trucking Company, Component, Price, Effective Start / End, Status, audit; paging.', M(1)])]},
         {'title': 'Search Operation', 'items': [
          C('filter', 'Filter by period / partner / component / status', 'UISS: Item 3-8, 5.2, Msg no.2', ['Periode = 2026-11, Trucking Company = DNX, Component = KM, [Search].', 'Periode = 2030-01, [Search].', '[Cancel].'],
            [f'Only DNX KM price of 202611 (from {P}.VALID_DT_FROM / VALID_DT_TO, PRICE_COMPONENT = KM - DCR-12).', M(2), 'Filters cleared, full list.']),
          C('quick', 'Quick search and partner lookup', 'UISS: Item 9, Msg no.3, Msg no.4', ['Keyword "zzz".', 'Type "xyz" in Trucking Company.'], [M(3), M(4)]),
          C('status', 'Status column per validity', 'UISS: Item 20, 5.3', ['Check a current, a future and an expired price.'], ['Status Active / Future / Expired by today vs validity dates.'])]},
         {'title': 'Download Operation', 'items': [C('export', 'Export and empty export', 'UISS: Item 11, Msg no.5, Msg no.6, Log 1', ['Export .xls with rows.', 'Filter to no data, Export .xls.'], [M(5), u.L(1), M(6)])]},
         {'title': 'Price lookup (used by PR Creation)', 'items': [
          C('lookup', 'Lookup errors for production month', 'UISS: 5.4, Msg no.7, Msg no.8, Msg no.9, Log 3', ['Create PR for SRL 202611 (no KM price).', 'Partner with only expired price.', 'Partner with two valid prices for the same component.'],
            [M(7), M(8), M(9), u.L(3)])]}]
    ab = [C('readerr', 'Price data cannot be read', 'UISS: Log 2', ['Stop the DB; open the screen.'], [u.L(2)])]
    td = {'precondition': ['Prices synchronised from eCatalogue for DNX, PNJ, PBM, JMP, SRL (SRL without KM price from 202610).', 'DCR-12 (PRICE_COMPONENT) applied.'],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:filter}', 'title': 'Prices', 'sql': f"SELECT COMPANY_CODE, PRICE_COMPONENT, ROUTE_PRICE_VALUE, VALID_DT_FROM, VALID_DT_TO FROM {P} WHERE COMPANY_CODE = 'DNX' ORDER BY VALID_DT_FROM;"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def priority(u):
    M, T = u.M, 'ielp.TB_M_ROUTE_PRIORITY (DCR-13)'
    g = [{'title': 'Initial', 'items': [C('open', 'Open screen', 'UISS: Item 1-28, 5.1, Msg no.14', [ADMIN, 'Open Master > Priority.', 'Empty the priority table, reopen.'], ['Input From / To / Priority; list ordered by priority with Up / Down / Edit / Delete.', M(14)])]},
         {'title': 'Search Operation', 'items': [C('search', 'Search and no result', 'UISS: Item 8, Msg no.15', ['Search "KRW".', 'Search "ZZZ".'], ['Matching routes.', M(15)])]},
         {'title': 'Add Operation', 'items': [
          C('add', 'Add route priority (insert in the middle)', 'UISS: Item 3-7, 5.2, Msg no.9, Log 1', ['From = SNT, To = CKR, Priority = 2; [Save].'], [M(9, {'From': 'SNT', 'To': 'CKR', 'p': '2'}), f'Routes from priority 2 move down by one; DB {T}: PRIORITY_NO renumbered.']),
          C('val', 'Validation errors', 'UISS: 5.2, Msg no.1, Msg no.2, Msg no.3, Msg no.4, Msg no.5, Msg no.6, Msg no.7', ['[Save] blank; From = To; inactive location; existing route; route without mileage; Priority = 0 / 99.'],
            [M(1) + ', ' + M(2), M(3), M(4, {'Code': 'D9'}), M(5, {'From': 'SNT', 'To': 'KRW'}), M(6, {'From': 'X7', 'To': 'D1'}), M(7, {'max': 'n+1'})])]},
         {'title': 'Update Operation', 'items': [
          C('upd', 'Edit priority', 'UISS: Item 13, 5.3, Msg no.10, Log 2', ['Edit SNT -> CKR, Priority = 1; [Save].'], [M(10, {'From': 'SNT', 'To': 'CKR', 'p': '1'})]),
          C('move', 'Move up / down', 'UISS: Item 11-12, Msg no.11', ['Click ↓ on priority 1.'], [M(11), 'Neighbours swapped.'])]},
         {'title': 'Delete Operation', 'items': [C('del', 'Delete with renumbering', 'UISS: Item 14, Msg no.12, Msg no.13, Log 3', ['Delete priority 2, confirm.'], [M(12), M(13), 'Lower routes move up by one.'])]}]
    ab = [C('version', 'Concurrency check', 'UISS: Msg no.8', ['A and B edit the same route; B saves first.'], [M(8)]), C('dberr', 'DB error', 'UISS: Log 4', ['Stop DB; save.'], [u.L(4)])]
    td = {'precondition': ['Active mileage routes SNT->KRW, SNT->CKR; 5 priorities registered.', 'DCR-13 (TB_M_ROUTE_PRIORITY) applied.'],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:add}, {tc:del}', 'title': 'Priorities', 'sql': 'SELECT FROM_CODE, TO_CODE, PRIORITY_NO, VERSION FROM TB_M_ROUTE_PRIORITY ORDER BY PRIORITY_NO;'}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def kpi(u):
    M = u.M
    g = [{'title': 'Initial', 'items': [C('open', 'Open screen: tabs, grid, summaries', 'UISS: Item 1-38, 5.1, Msg no.17', [ADMIN, 'Open Master > KPI.', 'Empty the KPI tables, reopen.'],
             ['Tabs All / By Resources / By Trip, grid with KPI items, Order Sharing %, Daily Trip; summaries By Resources and By Trip above the grid.', M(17)])]},
         {'title': 'Search Operation', 'items': [C('search', 'Search and no result', 'UISS: Item 7, Msg no.18', ['Search "DNX".', 'Search "ZZZ".'], ['Matching row.', M(18)])]},
         {'title': 'KPI Item', 'items': [
          C('item', 'Add KPI item and validation', 'UISS: Item 3-4, Msg no.1, Msg no.2, Msg no.3, Msg no.4, Log 1', ['[Add New] blank; 16 characters; existing name; "Safety".'], [M(1), M(2), M(3, {'Name': 'Quality'}), M(4, {'Name': 'Safety'}) + '; DB ielp.MS_KPI row.']),
          C('itemdel', 'Delete KPI item', 'UISS: Msg no.5, Msg no.6', ['Click x on KPI header Safety, confirm.'], [M(5, {'Name': 'Safety'}), M(6, {'Name': 'Safety'})])]},
         {'title': 'Trucking Company', 'items': [
          C('comp', 'Add company and validation', 'UISS: Item 5-6, Item 10, Msg no.7, Msg no.8, Msg no.9, Msg no.10, Msg no.19, Log 2', ['[+ Add Company] blank; inactive company; company already By Resources added as By Resources; company already By Trip added as By Resources; new company JMP By Trip.'],
            [M(7), M(8, {'Code': 'OLD'}), M(9, {'Code': 'DNX'}), M(19, {'code': 'PBM', 'payment type': 'By Trip'}), M(10, {'Code': 'JMP'}) + '; DB TB_M_KPI_COMPANY (DCR-14).']),
          C('edit', 'Edit row: score, KPI values, order sharing, daily trip', 'UISS: Item 12-23, 5.3, Msg no.11, Msg no.12, Msg no.14, Msg no.20, Msg no.21, Log 3', ['Edit DNX, then click Edit on PBM.', 'Score = 1001; Order Sharing By Trip = 100.555.', 'Valid values, ✓.'],
            [M(11, {'Code': 'DNX'}), M(12) + ' / ' + M(20), M(14, {'Code': 'DNX'}) + '; ' + M(21, {'x': '95.00'}) + ' when By Trip total is not 100%.']),
          C('trips', 'Trips per day (By Trip)', 'UISS: Item 38, Msg no.22', ['Trips per day = 1000; then 20.'], [M(22), 'Daily Trip of By Trip companies recalculated (1 each, rest by %); stored in ielp.TB_M_SYSTEM (DCR-15).']),
          C('compdel', 'Delete company row', 'UISS: Item 13, Msg no.15, Msg no.16', ['Delete JMP, confirm.'], [M(15), M(16, {'Code': 'JMP'})])]}]
    ab = [C('version', 'Concurrency check', 'UISS: Msg no.13', ['A and B edit DNX; B saves first.'], [M(13)]), C('dberr', 'DB error', 'UISS: Log 4', ['Stop DB; ✓.'], [u.L(4)])]
    td = {'precondition': ['KPI items Quality, Delivery; companies DNX, PNJ By Resources, PBM By Trip; OLD inactive.', 'DCR-14 / DCR-15 (TB_M_KPI_COMPANY, Trips per day) applied.'],
          'sql_verify': [{'id': 'TD-10', 'tc': '{tc:edit}', 'title': 'KPI per company', 'sql': 'SELECT COMPANY_ID, PAYMENT_TYPE, SCORE, ORDER_SHARING, DAILY_TRIP, VERSION FROM TB_M_KPI_COMPANY;'}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def route_pct(u):
    M = u.M
    g = [{'title': 'Initial', 'items': [C('open', 'Open screen', 'UISS: Item 1-28, 5.1, Msg no.15', [ADMIN, 'Open Master > Route Percentage.', 'Deactivate all routes (test DB), reopen.'], ['Route Entry with Location Pick and stops table; list of active routes with total percentage.', M(15)])]},
         {'title': 'Search Operation', 'items': [C('search', 'Search and no result', 'UISS: Item 16, Msg no.16', ['Search "KRW".', 'Search "ZZZ".'], ['Matching routes.', M(16)])]},
         {'title': 'Add Operation', 'items': [
          C('add', 'Create route with stops', 'UISS: Item 3-15, 5.2-5.4, Msg no.11, Log 1, Log 4', ['Pick D1, S1, K1E; Percentage = 12.5; [Save].'],
            ['Route Code / Description built from the stops; distance = sum of legs (mileage or straight-line estimate, log no.4).', M(11, {'Code': 'D1-S1-K1E'}),
             'DB: ielp.MS_ROUTE_HEADER (ROUTE_PERCENTAGE_VALUE 12.5, DISTANCE_KM - DCR-21), ielp.MS_ROUTE_DETAIL (ROUTE_CODE, ROUTE_DESCR), MS_ROUTE_STOP rows (DCR-20).']),
          C('val', 'Stop and percentage validation', 'UISS: Item 5-8, Item 12, Msg no.1, Msg no.2, Msg no.3, Msg no.4, Msg no.5, Msg no.6, Msg no.7, Msg no.8, Msg no.9',
            ['Pick inactive X9; pick the last stop again; 11 stops; save with 1 stop; reorder to repeat a stop; existing route code; blank / 0 / 100.5 percentage; total > 100%.'],
            [M(1, {'Code': 'X9'}), M(2, {'Code': 'K1E'}), M(3), M(4), M(5, {'Code': 'S1'}), M(6, {'Code': 'D1-S1'}), M(7), M(8), M(9, {'t': '101'})])]},
         {'title': 'Update Operation', 'items': [C('upd', 'Edit route / percentage in list', 'UISS: Item 18, 5.5, Msg no.12, Log 2', ['Opsi > Edit, move a stop, [Save].', 'Change percentage in the list.'], [M(12, {'Code': 'D1-S1-K1E'}), 'MS_ROUTE_HEADER.ROUTE_PERCENTAGE_VALUE updated.'])]},
         {'title': 'Deactivate Operation', 'items': [C('deact', 'Deactivate route', 'UISS: Msg no.13, Msg no.14, Log 3', ['Opsi > Deactivate, confirm.'], [M(13), M(14, {'Code': 'D1-S1-K1E'}), 'IS_DELETE set; percentage released.'])]}]
    ab = [C('version', 'Concurrency check', 'UISS: Msg no.10', ['A and B edit the same route.'], [M(10)]), C('dberr', 'DB error', 'UISS: Log 5', ['Stop DB; save.'], [u.L(5)])]
    td = {'precondition': ['Active locations D1, S1, K1E; X9 inactive; mileage D1->S1 known, S1->K1E unknown (estimate).', 'DCR-20 / DCR-21 applied.']}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


def renban(u):
    M, T = u.M, 'ielp.MS_RENBAN_TCPBR'
    g = [{'title': 'Initial', 'items': [C('open', 'Open screen', 'UISS: Item 1-30, 5.1, Msg no.15', [ADMIN, 'Open Master > Renban.', 'Empty the table (test DB), reopen.'], ['Input Plant / Dest / Renban Code / Source; list with audit; paging.', M(15)])]},
         {'title': 'Search Operation', 'items': [C('search', 'Search, no result, export', 'UISS: Item 12-14, Msg no.16, Msg no.17', ['Search "STM".', 'Search "ZZZ".', 'Export .xls.'], ['Matching rows.', M(16), M(17)])]},
         {'title': 'Add Operation', 'items': [
          C('add', 'Add renban and DB', 'UISS: Item 4-9, 5.2, Msg no.11, Data Map blk 1, Log 1', ['Plant = KRW 3, Dest = "stm", Renban Code = "c12", Source = D1; [Save].'],
            [M(11), f"DB (SQL TD-10) {T}: PLANT_CD, DEST_CD = STM, RENBAN_CD = C12, SOURCE_LOCATION_ID, VERSION = 1, CREATED_BY / CREATED_DT."]),
          C('val', 'Validation errors', 'UISS: Item 10, 5.3, Msg no.1, Msg no.2, Msg no.3, Msg no.4, Msg no.5, Msg no.6, Msg no.7, Msg no.8', ['[Save] blank.', 'Plant / Source not in list (request).', 'Dest "ST-M", Renban "C123".'],
            [M(1) + ', ' + M(2) + ', ' + M(3) + ', ' + M(4), M(5) + ' / ' + M(6), M(7) + ' / ' + M(8)]),
          C('dup', 'Duplicate key', 'UISS: Msg no.9', ['Add KRW 3 / STM / C12 again.'], [M(9, {'Renban': 'C12', 'Plant': 'KRW 3', 'Dest': 'STM'})])]},
         {'title': 'Update Operation', 'items': [C('upd', 'Edit renban', 'UISS: Item 15, Msg no.12, Data Map blk 2, Log 2', ['Edit C12, Source = S1; [Save].'], [M(12), 'DB (SQL TD-10): SOURCE_LOCATION_ID changed, VERSION + 1, CHANGED_BY / CHANGED_DT.'])]},
         {'title': 'Delete Operation', 'items': [C('del', 'Delete renban', 'UISS: Item 16, Msg no.13, Msg no.14, Data Map blk 3, Log 3', ['Delete C12, confirm.'], [M(13), M(14), 'Row physically deleted.'])]}]
    ab = [C('version', 'Concurrency check', 'UISS: Msg no.10, Log 4', ['A and B edit C12; B saves first.'], [M(10), u.L(4)]), C('syserr', 'System error', 'UISS: Msg no.18, Log 5', ['Stop DB; save.'], [M(18), u.L(5)])]
    td = {'sql_verify': [{'id': 'TD-10', 'tc': '{tc:add}, {tc:upd}', 'title': 'Renban row', 'sql': f"SELECT PLANT_CD, DEST_CD, RENBAN_CD, SOURCE_LOCATION_ID, VERSION, CREATED_BY, CREATED_DT, CHANGED_BY, CHANGED_DT FROM {T} WHERE RENBAN_CD = 'C12';"}]}
    return {'header': u.header(), 'groups': g, 'abnormal': ab, 'test_data': td}


SPECS = {'UISS_Screen_Master_Trucking_Company': trucking, 'UISS_Screen_Master_Location': location, 'UISS_Screen_Master_Mileage': mileage,
         'UISS_Batch_Master_Mileage_Upload': mileage_upload, 'UISS_Screen_Master_Price': price, 'UISS_Screen_Master_Priority': priority,
         'UISS_Screen_Master_KPI': kpi, 'UISS_Screen_Master_Route_Percentage': route_pct, 'UISS_Screen_Master_Renban': renban}
