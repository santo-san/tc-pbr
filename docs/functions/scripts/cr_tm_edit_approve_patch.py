"""CR (16-Nov-26): Edit & Approve Finish Order by VPLD Transportation Management (VPLD TM).
Supersedes the content of cr_tm_acceptance_patch.py (rev 0.6 'Finish Order acceptance'): the UISS content is rebuilt from the
version before both CRs (git commit 1a8ca9a) so it shows the final design; the revision history keeps the 0.6 row
(acceptance) and adds the new row. Changed parts are prefixed [CR].
UISS: UISS_Screen_Daily_Order_Monitoring (0.7), UISS_Screen_SA_Approval (0.7), UISS_Report_Download_Daily_Order_Monitoring (0.6),
UISS_Batch_Driver_Order_Sync (0.6).
Usage: python3 cr_tm_edit_approve_patch.py <repo> <screenshot dir>"""
import json, os, shutil, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uiss_paths import locate
R, SHOTS = sys.argv[1], sys.argv[2]
BASE, PREV = '1a8ca9a', '4cf5964'          # before both CRs / after the acceptance CR (rev 0.6 row)
DATE, WHO = '16-Nov-26', 'Susanto'
CRD = 'CR: Edit & Approve finish order by VPLD Transportation Management'
WAIT, FIN = 'Waiting TM Approval', 'Finish Daily Order'
SUPERSEDE = ("Supersedes the 0.6 acceptance design: status Waiting TM Acceptance -> Waiting TM Approval, Accept -> Approve, "
             "DCR-44 columns TM_ACCEPT_* -> TM_APPROVE_BY / TM_APPROVE_DATE + TM_EDIT_BY / TM_EDIT_DATE.")
OPS = [  # Open points of the CR (not decided by the user): default assumption used in this UISS
    ('OP-CR-01', 'Final list of the fields VPLD TM may edit (table 5.6.8).', 'As table 5.6.8: License Plate, Driver, Container No. and Start / Pickup / Finish Cycle time per cycle, Finish Order time, Remarks. Route, cycles, planning data not editable.'),
    ('OP-CR-02', 'Can VPLD TM reject / return the Finish Order to the driver (wrong scan)? Status after return, driver scans again?', 'No reject / return in this CR; wrong data is corrected with Edit.'),
    ('OP-CR-03', 'Can VPLD TM finish an order manually when the driver did not scan (driver phone problem)? Mandatory data?', 'No. Manual Finish Order stays with LP Admin (Reason mandatory, 5.6.5); it then waits for TM edit / approval.'),
    ('OP-CR-04', 'Is edit allowed after approval (e.g. until SA Approval)? What if SA Approval rejects?', 'No. After Approve the order is Finish Daily Order and locked on this screen; a correction after approval / SA rejection is outside this CR (TBD).'),
    ('OP-CR-05', 'Bulk approve or per row only?', 'Both: [Approve] per row / Order Detail and [Approve Finish Order (n)] for the selected rows (all-or-nothing).'),
    ('OP-CR-06', 'Time limit / reminder / auto-approve?', 'None. Orders stay Waiting TM Approval until approved.'),
    ('OP-CR-07', 'Orders already Finish Daily Order before go-live of this CR?', 'They stay Finish Daily Order and go to SA Approval directly (TM columns empty).'),
    ('OP-CR-08', 'Notification (e-mail / dashboard) to VPLD TM for orders waiting approval?', 'No notification; the [Waiting TM Approval (n)] counter on this screen only.'),
    ('OP-CR-09', 'Edit history storage: dedicated history table or the existing activity log?', 'Existing ielp.LOG_ACTIVITY_ORDER (one row per save: ACT, REMARK = reason, PARAM_REQ / PARAM_RES = before / after JSON); no new table.'),
    ('OP-CR-10', 'Should a TM edit of truck / driver / container be sent again to the Driver App?', 'No; the order is already finished in the APK (HISTORY).'),
]
EDITABLE = [  # Field | Editable | Reason / validation
    ('No. Order, Date, Shift, Type, Renban, FA', 'N', 'Order key and DTP planning data (changed only in Planning Order / DTP Maintenance).'),
    ('Trucking Company', 'N', 'Vendor; PO and SA are per trucking company.'),
    ('DTP Loc. From / To, route of every cycle', 'N', 'Defines Order Route and Total KM of SA Approval.'),
    ('Planned cycle / number of actual cycles', 'N', 'Planning data; adding / removing a cycle is not part of this CR (OP-CR-01).'),
    ('License Plate', 'Y', 'Wrong truck at login / scan. Registered truck of the same trucking company, license valid on the order date (messages no. 11 / 12).'),
    ('Driver', 'Y', 'Wrong driver. Registered, active driver of the same trucking company (message no. 15).'),
    ('Container No. (per cycle)', 'Y', 'Typing error. Mandatory, ISO 6346 + check digit, unique in the order, not active in another order (messages no. 17-20).'),
    ('Start Cycle / Pickup / Finish Cycle time (per cycle)', 'Y', 'Actual times. Mandatory; Start <= Pickup <= Finish; Start of cycle n >= Finish of cycle n-1; not in the future (messages no. 41 / 42).'),
    ('Finish Order time', 'Y', 'Actual finish. Mandatory; >= Finish Cycle time of the last cycle; not in the future (messages no. 41 / 42).'),
    ('Remarks', 'Y', 'Optional note of TM, max 500 characters (ORDER_CYCLE.FINISH_REMARKS).'),
    ('Edit Reason', 'Y (mandatory)', 'Why the data is changed; minimum 10 characters; stored in the edit history (message no. 40).'),
    ('Order / Cycle Status, SA Number, PO Number, photos / files', 'N', 'Set by the system / Driver App.'),
]


def git_json(path):
    return json.loads(subprocess.run(['git', '-C', R, 'show', f'{BASE}:{path}'], check=True, capture_output=True, text=True).stdout)


def prev_rev(path):
    s = json.loads(subprocess.run(['git', '-C', R, 'show', f'{PREV}:{path}'], check=True, capture_output=True, text=True).stdout)
    return s['revisions'][-1]


def load(name):
    p = locate(name, R)
    rel = os.path.relpath(p['src'], R)
    return p, git_json(rel), prev_rev(rel)


def save(p, s, r06, rev, desc):
    s['revisions'].append(r06)
    s['revisions'].append({'revision': rev, 'author': WHO, 'date': DATE, 'reviewed_by': '', 'description': f'{CRD}. {desc} Changed parts marked [CR].'})
    s['header']['updated_date'], s['header']['updated_by'] = DATE, WHO
    json.dump(s, open(p['src'], 'w'), indent=1, ensure_ascii=False)
    print('patched', os.path.basename(p['src']), r06['revision'], '+', rev)


def item(name, source, field, typ, ln, io, control, desc, initial='', req='N', fmt='', val='', just='Left'):
    return {'name': '[CR] ' + name, 'source': source, 'field': field, 'type': typ, 'len': ln, 'io': io, 'control': control, 'justified': just,
            'initial': initial, 'required': req, 'format': fmt, 'validation': val, 'description': desc}


def find(lst, pred):
    for i, x in enumerate(lst):
        if pred(x): return i
    raise SystemExit('not found')


def shots(p, names, drop_prefix):
    d = os.path.join(p['src_dir'], 'img', os.path.basename(p['src'])[:-5]); os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        if any(f.startswith(x) for x in drop_prefix): os.remove(os.path.join(d, f))
    for n in names: shutil.copyfile(os.path.join(SHOTS, n), os.path.join(d, n))


# ======================================================================= Daily Order Monitoring
p, s, r06 = load('UISS_Screen_Daily_Order_Monitoring')
g = s['general']
g['objective'].append(f'[CR] To let VPLD Transportation Management (VPLD TM) check, correct (Edit) and approve the delivery data after the driver scans Finish Order (or LP Admin finishes it): the order waits in status {WAIT} and becomes {FIN} - locked, and sent to SA Approval - only after the TM approval.')
B = ['[CR] Waiting TM Approval (n)', '[CR] Approve Finish Order (n)', '[CR] Edit (row) / Edit Finish Order (Order Detail)', '[CR] Approve (row) / Approve Finish Order (Order Detail)',
     '[CR] Edited (Y) - history', '[CR] Save / Back / Confirm Save (edit)', '[CR] Confirm Approve', '[CR] Cancel (edit / approve)']
NEWB = dict(zip(B, [
    f'To filter the Order List on Order Status {WAIT}; the counter shows the number of waiting orders in the user data scope.',
    f'VPLD TM: to approve the selected orders (check box, status {WAIT}). Opens the Approve Finish Order confirmation (5.6.9).',
    f'VPLD TM: to open the Edit Finish Order form of an order {WAIT} (5.6.7).',
    'VPLD TM: to approve one order. Opens the Approve Finish Order confirmation (5.6.9).',
    'To show the TM Edit History of the order (before / after, who, when, reason).',
    'Edit form: [Save] validates and shows the changes for confirmation; [Back] returns to the form; [Confirm Save] saves (status unchanged).',
    f'To approve the listed orders: Order Status becomes {FIN}; data locked for edit.',
    'To close the form / confirmation without change.']))
g['buttons'] += [{'name': k, 'function': v} for k, v in NEWB.items()]
for m in g['screen_modes']:
    for sec in m['sections']:
        on = sec['buttons'].get('Find') == 'E'
        sec['buttons'].update({k: ('E' if on and k in (B[0], B[4]) else 'D') for k in B})
base = {k: 'D' for k in g['screen_modes'][0]['sections'][0]['buttons']}
LIST_E = ['Download Driver App', 'Landing Page', 'Find', 'Clear', 'Tab ALL / DTP 1 - DTP 4', 'Refresh', 'Kolom', 'Export', 'Detail (Action icon)', B[0], B[1], B[2], B[3], B[4]]
g['screen_modes'].append({'mode': '[CR] Order List / Order Detail Mode - VPLD TM', 'sections': [
    {'section': 'Order List / Order Detail', 'description': f'all orders (view); check box, [Edit] and [Approve] only on orders {WAIT}, refer below 4)', 'buttons': {**base, **{k: 'E' for k in LIST_E}}},
    {'section': 'Edit Finish Order form', 'description': 'editable fields of table 5.6.8; Edit Reason mandatory', 'buttons': {**base, B[5]: 'E', B[7]: 'E'}},
    {'section': 'Approve Finish Order confirmation', 'description': 'read-only summary of the orders to approve', 'buttons': {**base, B[6]: 'E', B[7]: 'E'}}]})
g['screen_mode_remarks'].append(f'4) [CR] VPLD TM: the selection check box, [Edit] and [Approve] are shown only for orders {WAIT}; [Approve Finish Order (n)] is enabled when at least one row is selected. '
                                f'After approval ({FIN}) Edit / Approve are not shown (locked). Other roles (incl. Planner VPLD of SA Approval) see the data read only.')

sf = s['screen_flow']
sf[0]['flow']['nodes'] += [{'id': 'ed', 'label': '[CR] Edit Finish Order form', 'type': 'screen'}, {'id': 'c', 'label': '[CR] Approve Finish Order confirmation', 'type': 'screen'},
                           {'id': 'h', 'label': '[CR] TM Edit History', 'type': 'screen'}]
sf[0]['flow']['edges'] += [{'from': 'm', 'to': 'ed', 'label': '[CR] Edit'}, {'from': 'd', 'to': 'ed', 'label': '[CR] Edit Finish Order'}, {'from': 'ed', 'to': 'm', 'label': 'Confirm Save / Cancel'},
                           {'from': 'm', 'to': 'c', 'label': '[CR] Approve / Approve (n)'}, {'from': 'd', 'to': 'c', 'label': '[CR] Approve Finish Order'}, {'from': 'c', 'to': 'm', 'label': 'Confirm OK / Cancel'},
                           {'from': 'm', 'to': 'h', 'label': '[CR] Edited (Y)'}]
fl = sf[1]['flow']
fl['nodes'].insert(find(fl['nodes'], lambda n: n['id'] == 'f'), {'id': 'w', 'label': f'[CR] {WAIT}', 'type': 'process'})
fl['nodes'].insert(find(fl['nodes'], lambda n: n['id'] == 'f'), {'id': 'we', 'label': '[CR] Edit by VPLD TM (status unchanged)', 'type': 'note'})
e = fl['edges'][find(fl['edges'], lambda x: x['from'] == 'st' and x['to'] == 'f')]
e.update({'to': 'w', 'label': '[CR] Finish Order (Driver scan / LP)'})
k = fl['edges'].index(e)
fl['edges'][k + 1:k + 1] = [{'from': 'w', 'to': 'we', 'label': '[CR] Edit (optional, repeatable)'}, {'from': 'we', 'to': 'w'}, {'from': 'w', 'to': 'f', 'label': '[CR] Approve Finish Order (VPLD TM)'}]
fl.setdefault('same_rank', []).append(['w', 'we'])

IMG = 'img/UISS_Screen_Daily_Order_Monitoring/'
LAY = [('10_cr_tm_waiting_list.png', f'[CR] 10. VPLD TM - Order List filtered on {WAIT} (counter, highlighted rows, check box, [Edit], [Approve], [Approve Finish Order (n)])'),
       ('11_cr_tm_edit_errors.png', '[CR] 11. Edit Finish Order - validation errors (container check digit, time order, Edit Reason)'),
       ('12_cr_tm_edit_form.png', '[CR] 12. Edit Finish Order form (editable fields of table 5.6.8, Remarks, Edit Reason)'),
       ('13_cr_tm_edit_confirm.png', '[CR] 13. Edit confirmation: changed fields before / after (message no. 38)'),
       ('14_cr_tm_edit_history.png', '[CR] 14. TM Edit History (from column Edited = Y)'),
       ('15_cr_tm_approve_confirm.png', '[CR] 15. Approve Finish Order confirmation with Edited column'),
       ('16_cr_tm_approve_error.png', '[CR] 16. Approve refused: order changed by another user, nothing approved (messages no. 33 / 36)'),
       ('17_cr_tm_approved_list.png', f'[CR] 17. After approval: {FIN}, columns Finish Scan / Edited / Approved By / Approved Date'),
       ('18_cr_tm_detail_locked.png', '[CR] 18. Order Detail after approval: TM Edit History, no Edit / Approve action (locked)')]
s['screen_layout'] += [{'caption': c, 'image': IMG + f} for f, c in LAY]
shots(p, [f for f, _ in LAY], [f'{n}_cr' for n in range(10, 19)])

D2 = 'ielp.DTP_2_DETAIL'
s['items'] += [
    {'group': '<[CR] Search Criteria Section - addition>'},
    item('Order Status', D2, 'STATUS_CODE', 'Varchar', '3', 'I', 'Combo Box', f'All / Planning Order / Order Release / Start Daily Order / {WAIT} / {FIN} / SA Approved / SA Approved with PO Number. Applied on [Find]; [Clear] resets to All.\nDB: {D2}.STATUS_CODE varchar(3); code of {WAIT} = new ielp.MS_STATUS row - TBD - Not confirmed from existing schema/data/code.', initial='All'),
    {'group': '<[CR] Order List Section - additions>'},
    item('Waiting TM Approval (n)', D2, 'count of STATUS_CODE = Waiting TM Approval', 'Number', '', 'O', 'Button (chip)', f'Counter of orders {WAIT} in the user data scope (all dates). Click: Order Status filter = {WAIT} (click again: All).'),
    item('Approve Finish Order (n)', '', '', '', '', 'O', 'Button', 'VPLD TM only; n = selected rows; disabled when n = 0. Refer 5.6.9.'),
    item('Select (check box) / Select all (header)', '', '', '', '', 'I', 'Check box', f'VPLD TM only, enabled only on rows {WAIT}. Selection kept over pages; cleared after Approve or a role change.', initial='Unchecked'),
    item('Edit (row)', '', '', '', '', 'O', 'Button', f'Below the Action icon, VPLD TM only, rows {WAIT} only. Opens the Edit Finish Order form (5.6.7).'),
    item('Approve (row)', '', '', '', '', 'O', 'Button', f'Below [Edit], VPLD TM only, rows {WAIT} only. Opens the Approve Finish Order confirmation (5.6.9).'),
    item('Row highlight', '', '', '', '', 'O', 'Grid row', f'Rows {WAIT} have a light orange background (all roles).'),
    item('Finish Scan', 'ielp.ORDER_CYCLE', 'FINISH_ORDER_DATE / FINISH_ORDER_BY', 'Datetime', '', 'O', 'Grid', 'Finish Order date-time (driver scan / LP Admin, or as edited by TM) and below it the user who finished. Sortable.\nDB: ielp.ORDER_CYCLE.FINISH_ORDER_DATE datetime, FINISH_ORDER_BY varchar(500) of the last cycle (existing).', fmt='YYYY-MM-DD HH:MI:SS', just='Center'),
    item('Edited', D2, 'TM_EDIT_BY (not empty = Y)', 'Char', '1', 'O', 'Grid / Link', 'Y (pencil icon, click = TM Edit History popup) when VPLD TM saved at least one edit; otherwise N.\nDB: TM_EDIT_BY / TM_EDIT_DATE - new columns, DCR-44.', just='Center'),
    item('Approved By', D2, 'TM_APPROVE_BY', 'Varchar', '500', 'O', 'Grid', 'VPLD TM user who approved; "-" when not approved.\nDB: new column, DCR-44.', just='Center'),
    item('Approved Date', D2, 'TM_APPROVE_DATE', 'Datetime', '', 'O', 'Grid', 'Date-time of the TM approval. Sortable.\nDB: new column, DCR-44.', fmt='YYYY-MM-DD HH:MI:SS', just='Center'),
    item('Order Status (sub text)', '', '', '', '', 'O', 'Grid', f'Below the badge: {WAIT} -> "Finish scan <date-time>"; {FIN} approved by TM -> "TM approved <date-time>".'),
    {'group': '<[CR] Order Detail Modal - additions>'},
    item('Finish Scan', 'ielp.ORDER_CYCLE', 'FINISH_ORDER_DATE / FINISH_ORDER_BY', 'Datetime', '', 'O', 'Label', '"<date-time> · <user>"; "-" when not finished.'),
    item('TM Edited', D2, 'TM_EDIT_BY / TM_EDIT_DATE', 'Varchar / Datetime', '', 'O', 'Label', '"Y · <user> · <date-time>" of the last TM edit, else "N" (DCR-44).'),
    item('TM Approved', D2, 'TM_APPROVE_BY / TM_APPROVE_DATE', 'Varchar / Datetime', '', 'O', 'Label', '"<user> · <date-time>"; "-" when not approved (DCR-44).'),
    item('Edit Finish Order / Approve Finish Order (action buttons)', '', '', '', '', 'O', 'Button', f'In the Action section for VPLD TM when Order Status = {WAIT} (5.5); open the edit form / approve confirmation. Not shown after approval.'),
    item('TM Edit History section', 'ielp.LOG_ACTIVITY_ORDER', 'PARAM_REQ / PARAM_RES / REMARK (ACT = Edit Finish Order)', 'Grid', '', 'O', 'Grid', 'Shown when the order has TM edits: same columns as the TM Edit History popup, latest first.'),
    {'group': '<[CR] Edit Finish Order Form>'},
    item('Order header (read only)', D2, 'ORDER_NO, date / shift, COMPANY_ID, FROM_LOC -> TO_LOC, STATUS_CODE, FINISH_ORDER_BY', '', '', 'O', 'Label', 'No. Order, Date / Shift, Trucking Company, Route, Order Status, Finished By (Driver scan / LP Admin). Not editable (table 5.6.8).'),
    item('License Plate', D2, 'LICENSE_PLATE', 'Varchar', '20', 'I', 'Combo Box', 'Trucks of the order trucking company with license date. Also written to ielp.ORDER_CYCLE.LICENSE_PLATE of every cycle.', initial='Current value', req='Y', val='Registered for the trucking company (msg 11); license >= order date (msg 12)'),
    item('Driver', D2, 'DRIVER_ID', 'Varchar', '10', 'I', 'Combo Box', 'Drivers of the order trucking company (inactive marked). Also written to ielp.ORDER_CYCLE.DRIVER_ID.', initial='Current value', req='Y', val='Active and registered for the trucking company (msg 15)'),
    item('Cycle / Route (read only)', 'ielp.ORDER_CYCLE', 'CYCLE_SEQ, FROM_LOC -> TO_LOC', '', '', 'O', 'Grid', 'One row per cycle; route not editable.'),
    item('Container No.', 'ielp.ORDER_CYCLE', 'CONTAINER_NO', 'Varchar', '11', 'I', 'Text (grid)', 'Per cycle; normalised upper case without space / dash.', initial='Current value', req='Y', fmt='AAAU9999999', val='Format (msg 17), check digit (msg 18), unique in the order (msg 19), not active in another order (msg 20)'),
    item('Start Cycle', 'ielp.ORDER_CYCLE', 'START_DATE', 'Datetime', '', 'I', 'Date-time picker (grid)', 'Per cycle.', initial='Current value', req='Y', fmt='DD/MM/YYYY HH:MI', val='>= Finish Cycle of the previous cycle (msg 41); not future (msg 42)'),
    item('Pickup', 'ielp.ORDER_CYCLE', 'PICKUP_DATE', 'Datetime', '', 'I', 'Date-time picker (grid)', 'Per cycle.', initial='Current value', req='Y', fmt='DD/MM/YYYY HH:MI', val='>= Start Cycle (msg 41); not future (msg 42)'),
    item('Finish Cycle', 'ielp.ORDER_CYCLE', 'COMPLETE_DATE', 'Datetime', '', 'I', 'Date-time picker (grid)', 'Per cycle.', initial='Current value', req='Y', fmt='DD/MM/YYYY HH:MI', val='>= Pickup (msg 41); not future (msg 42)'),
    item('Finish Order time', 'ielp.ORDER_CYCLE', 'FINISH_ORDER_DATE (last cycle)', 'Datetime', '', 'I', 'Date-time picker', 'Finish Order date-time.', initial='Current value', req='Y', fmt='DD/MM/YYYY HH:MI', val='>= Finish Cycle of the last cycle (msg 41); not future (msg 42)'),
    item('Remarks', 'ielp.ORDER_CYCLE', 'FINISH_REMARKS (last cycle)', 'Varchar', '500', 'I', 'Text area', 'Optional note of TM.', initial='Current value', fmt='X..500..X', val='Max 500 characters'),
    item('Edit Reason', 'ielp.LOG_ACTIVITY_ORDER', 'REMARK', 'Varchar', '500', 'I', 'Text area', 'Why the data is changed; stored in the edit history only.', initial='Blank', req='Y', val='Minimum 10 characters (msg 40)'),
    item('Error display', '', '', '', '', 'O', 'Label', 'Field errors below each field (all at once); form-level errors (messages no. 34 / 35 / 36 / 43) above the form.'),
    item('Cancel / Close (x)', '', '', '', '', 'O', 'Button', 'Close without change.'),
    item('Save', '', '', '', '', 'O', 'Button', 'Validate and show the change confirmation (5.6.7).'),
    item('Change confirmation (Field / Cycle / Before / After)', '', '', '', '', 'O', 'Grid', 'Message no. 38, list of the changed fields with old and new value, and the Edit Reason.'),
    item('Back', '', '', '', '', 'O', 'Button', 'Return to the form with the entered values.'),
    item('Confirm Save', '', '', '', '', 'O', 'Button', 'Save the edit (Data Edit Mapping [CR] Edit blocks 13-15).'),
    {'group': '<[CR] TM Edit History Popup>'},
    item('Edited At', 'ielp.LOG_ACTIVITY_ORDER', 'CRETED_DATE', 'Datetime', '', 'O', 'Grid', 'One group per save, latest first.', fmt='YYYY-MM-DD HH:MI:SS'),
    item('Edited By', 'ielp.LOG_ACTIVITY_ORDER', 'CREATED_BY', 'Varchar', '100', 'O', 'Grid', 'VPLD TM user.'),
    item('Field / Cycle', 'ielp.LOG_ACTIVITY_ORDER', 'PARAM_REQ / PARAM_RES (field name, cycle)', 'Varchar', '', 'O', 'Grid', 'Changed field and cycle no ("-" for order-level fields).'),
    item('Before / After', 'ielp.LOG_ACTIVITY_ORDER', 'PARAM_REQ (before) / PARAM_RES (after)', 'nvarchar(max)', '', 'O', 'Grid', 'Old and new value of the field.'),
    item('Edit Reason', 'ielp.LOG_ACTIVITY_ORDER', 'REMARK', 'Varchar', '500', 'O', 'Grid', 'Reason entered by TM.'),
    {'group': '<[CR] Approve Finish Order Confirmation Modal>'},
    item('Confirmation text', 'Fixed', '--', '', '', 'O', 'Label', 'Message no. 31.'),
    item('No. Order / Trucking Comp. / License Plate / Driver', D2, 'ORDER_NO, COMPANY_ID, LICENSE_PLATE, DRIVER_ID', 'Varchar', '', 'O', 'Grid', 'One row per order to approve (current data, after TM edits).'),
    item('Finish Scan / Finished By', 'ielp.ORDER_CYCLE', 'FINISH_ORDER_DATE / FINISH_ORDER_BY / FINISH_BY_LP', 'Datetime / Varchar', '', 'O', 'Grid', 'Finished By = "Driver scan" or "LP Admin (manual)".'),
    item('Cycle (Act / Plan) / Container No. / Last Destination', 'ielp.ORDER_CYCLE', 'count, CONTAINER_NO, TO_LOC of last cycle', '', '', 'O', 'Grid', 'Container Number of every cycle, one per line.'),
    item('Edited', D2, 'TM_EDIT_BY / TM_EDIT_DATE', '', '', 'O', 'Grid', 'Y with user and date-time of the last TM edit, or N.'),
    item('Error area', '', '', '', '', 'O', 'Label', 'Message no. 33 with "<No. Order>: <reason>" (messages no. 34 / 36); modal stays open.'),
    item('Cancel / Confirm Approve', '', '', '', '', 'O', 'Button', 'Refer 5.6.9.'),
]

D = s['data_map']['blocks']
fo = D[find(D, lambda b: 'Finish Order' in b['destination'].get('description', ''))]
fo['mappings'][find(fo['mappings'], lambda m: m['dest_field'] == 'STATUS_CODE')]['description'] = f"[CR] '{WAIT}' (new ielp.MS_STATUS code - TBD; was '{FIN}')"
U = [{'dest_field': 'UPDATED_BY', 'description': 'Login user ID'}, {'dest_field': 'UPDATED_DATE', 'description': 'Server system date'}]
D += [
    {'source': '[CR] Finish Order (Driver App scan / LP Admin [Submit])', 'destination': {'table': 'ielp.ORDER_CYCLE', 'operation': 'Update', 'description': '[CR] Finish Order - finish scan data',
     'keys': [{'field': 'ORDER_NO', 'value': 'Selected No. Order'}, {'field': 'CYCLE_SEQ', 'value': 'Last cycle'}]},
     'mappings': [{'dest_field': 'FINISH_ORDER_DATE', 'description': 'Server system date-time (existing column)'}, {'dest_field': 'FINISH_ORDER_BY', 'description': 'Login user ID (driver / LP Admin) (existing column)'},
                  {'dest_field': 'FINISH_BY_LP', 'description': "'Y' when done by LP Admin, else 'N' (existing column)"}, *U]},
    {'source': '[CR] Approve Finish Order confirmation', 'destination': {'table': D2, 'operation': 'Update', 'description': '[CR] Approve Finish Order - [Confirm Approve] (one per order)',
     'keys': [{'field': 'ORDER_NO', 'value': 'Each listed No. Order'}, {'field': 'STATUS_CODE', 'value': f"'{WAIT}'"}, {'field': 'VERSION', 'value': 'Version when displayed [DCR-36]'}]},
     'mappings': [{'dest_field': 'STATUS_CODE', 'description': f"'{FIN}'"}, {'dest_field': 'TM_APPROVE_BY', 'description': 'Login user ID (VPLD TM) [DCR-44: new column]'},
                  {'dest_field': 'TM_APPROVE_DATE', 'description': 'Server system date-time [DCR-44: new column]'}, *U, {'dest_field': 'VERSION', 'description': 'VERSION + 1 [DCR-36]'}]},
    {'source': '[CR] Edit Finish Order form', 'destination': {'table': D2, 'operation': 'Update', 'description': '[CR] Edit Finish Order - [Confirm Save] (order level)',
     'keys': [{'field': 'ORDER_NO', 'value': 'Edited No. Order'}, {'field': 'STATUS_CODE', 'value': f"'{WAIT}'"}, {'field': 'VERSION', 'value': 'Version when the form was opened [DCR-36]'}]},
     'mappings': [{'source_field': 'License Plate', 'dest_field': 'LICENSE_PLATE', 'description': 'Selected truck'}, {'source_field': 'Driver', 'dest_field': 'DRIVER_ID', 'description': 'Selected driver'},
                  {'dest_field': 'STATUS_CODE', 'description': f"Not changed ('{WAIT}')"}, {'dest_field': 'TM_EDIT_BY', 'description': 'Login user ID (VPLD TM) [DCR-44: new column]'},
                  {'dest_field': 'TM_EDIT_DATE', 'description': 'Server system date-time [DCR-44: new column]'}, *U, {'dest_field': 'VERSION', 'description': 'VERSION + 1 [DCR-36]'}]},
    {'source': '[CR] Edit Finish Order form', 'destination': {'table': 'ielp.ORDER_CYCLE', 'operation': 'Update', 'description': '[CR] Edit Finish Order - [Confirm Save] (one per cycle)',
     'keys': [{'field': 'ORDER_NO', 'value': 'Edited No. Order'}, {'field': 'CYCLE_SEQ', 'value': 'Cycle no of the grid row'}]},
     'mappings': [{'source_field': 'Container No.', 'dest_field': 'CONTAINER_NO', 'description': 'Upper case, no space / dash'}, {'source_field': 'Start Cycle', 'dest_field': 'START_DATE', 'description': 'Entered date-time'},
                  {'source_field': 'Pickup', 'dest_field': 'PICKUP_DATE', 'description': 'Entered date-time'}, {'source_field': 'Finish Cycle', 'dest_field': 'COMPLETE_DATE', 'description': 'Entered date-time'},
                  {'source_field': 'License Plate / Driver', 'dest_field': 'LICENSE_PLATE / DRIVER_ID', 'description': 'Same as the order'},
                  {'source_field': 'Finish Order time', 'dest_field': 'FINISH_ORDER_DATE', 'description': 'Last cycle only'}, {'source_field': 'Remarks', 'dest_field': 'FINISH_REMARKS', 'description': 'Last cycle only; varchar(500)'}, *U]},
    {'source': '[CR] Edit Finish Order form', 'destination': {'table': 'ielp.LOG_ACTIVITY_ORDER', 'operation': 'Insert', 'description': '[CR] Edit Finish Order - edit history (one row per save)', 'keys': []},
     'mappings': [{'dest_field': 'LOG_ID', 'description': 'Next id (rule TBD - Not confirmed from existing schema/data/code)'}, {'dest_field': 'ORDER_NO', 'description': 'Edited No. Order'},
                  {'dest_field': 'ACT', 'description': "'Edit Finish Order'"}, {'dest_field': 'REMARK', 'description': 'Edit Reason'},
                  {'dest_field': 'PARAM_REQ', 'description': 'JSON of the changed fields before: [{field, cycle, value}]'}, {'dest_field': 'PARAM_RES', 'description': 'JSON of the changed fields after: [{field, cycle, value}]'},
                  {'dest_field': 'STS_CODE', 'description': f"Code of '{WAIT}' (unchanged)"}, {'dest_field': 'CREATED_BY', 'description': 'Login user ID'}, {'dest_field': 'CRETED_DATE', 'description': 'Server system date-time'}]},
]

O = s['operation']
O[2]['rows'].append(['[CR] VPLD TM (Transportation Management)', 'All orders (view)', f'Edit Finish Order and Approve Finish Order (orders {WAIT}); no other action'])
O.insert(3, {'type': 'text', 'text': f'[CR] Only VPLD TM can edit or approve a Finish Order. Planner VPLD (SA Approval), IELP Admin, Supplier and Driver see {WAIT} orders read only (no check box / Edit / Approve); a request from another role gets message no. 35.', 'level': 2})
i = find(O, lambda o: o.get('marker') == 'g.' and 'Kolom' in o.get('text', ''))
O[i + 1:i + 1] = [{'type': 'item', 'marker': 'h.', 'text': '[CR] Criteria Order Status: applied on [Find] together with the other criteria; [Clear] resets it to All.', 'level': 2},
                  {'type': 'item', 'marker': 'i.', 'text': f'[CR] User clicks [Waiting TM Approval (n)]: Order Status filter = {WAIT} at once; click again to remove it. The counter is recalculated on every refresh of the list.', 'level': 2},
                  {'type': 'item', 'marker': 'j.', 'text': '[CR] User clicks Edited = Y: open the TM Edit History popup of the order (all roles).', 'level': 2}]
t = O[find(O, lambda o: o.get('type') == 'table' and o['columns'][0]['title'] == 'Order Status')]
k = find(t['rows'], lambda r: r[0] == 'Start Daily Order')
t['rows'].insert(k + 1, [f'[CR] {WAIT}', 'Driver scans Finish Order (Driver App) or LP Admin does Finish Order; VPLD TM can edit the delivery data and must approve; not yet visible in SA Approval'])
t['rows'][find(t['rows'], lambda r: r[0] == FIN)][1] = '[CR] VPLD TM approved the Finish Order (5.6.9); data locked on this screen. Only orders in this status are listed in SA Approval'
t = O[find(O, lambda o: o.get('type') == 'table' and o['columns'][0]['title'] == 'Action')]
fr = t['rows'][find(t['rows'], lambda r: r[0] == 'Finish Order')]; fr[3] = f'[CR] {WAIT}'
k = t['rows'].index(fr)
t['rows'][k + 1:k + 1] = [['[CR] Edit Finish Order', 'VPLD TM', WAIT, f'{WAIT} (data changed, edited by / date)'], ['[CR] Approve Finish Order', 'VPLD TM', WAIT, f'{FIN} (approved by / date, locked)']]
b = O[find(O, lambda o: o.get('type') == 'bullets' and any('Set Order Status = Finish Daily Order' in x for x in o['items']))]
b['items'][1] = (f"[CR] Set Order Status = {WAIT} (was {FIN}); finish data on the last cycle: FINISH_ORDER_DATE, FINISH_ORDER_BY, FINISH_BY_LP = 'Y'. "
                 "If actual cycles < planned cycles, note 'Actual x of planned y cycles' in history (allowed, TBD OP-06).")
i = find(O, lambda o: o.get('type') == 'heading' and o['text'].startswith('5.7'))
O[i:i] = [
    {'type': 'text', 'text': '5.6.7 [CR] Edit Finish Order (VPLD TM)', 'level': 1, 'bold': True},
    {'type': 'bullets', 'marker': '1.', 'level': 3, 'items': [
        f'Open: [Edit] of a row or [Edit Finish Order] of the Order Detail (VPLD TM, Order Status {WAIT}). The form shows the current data (driver scan, or the last TM edit) and remembers the VERSION.',
        'Read-only part: No. Order, Date / Shift, Trucking Company, route, Order Status, Finished By. Editable fields: table 5.6.8. Edit Reason is mandatory.',
        '[Save]: check all fields at once (Item Desc validation): mandatory, container format / check digit / duplicate / active elsewhere (messages no. 17-20), truck and driver master (messages no. 11, 12, 15), '
        'time order Start <= Pickup <= Finish, cycle n >= Finish of cycle n-1, Finish Order >= last Finish Cycle (message no. 41), no future time (message no. 42), Remarks <= 500, Edit Reason >= 10 characters (message no. 40). '
        'Errors are shown below the fields; nothing saved.',
        'If no field differs from the current data, display message no. 43. Stop.',
        'Otherwise show the confirmation (message no. 38) with the changed fields (Field, Cycle, Before, After) and the Edit Reason. [Back] returns to the form with the entered values.',
        f'[Confirm Save] - server: role VPLD TM (else message no. 35), Order Status still {WAIT} (else message no. 34), VERSION unchanged (else message no. 36); then in one transaction update the order and cycles '
        '(Data Edit Mapping [CR] Edit blocks 13 / 14), set TM_EDIT_BY / TM_EDIT_DATE, VERSION + 1, insert the edit history (block 15, Log no. 8). Status is NOT changed.',
        'Close the form, refresh the list (Edited = Y) and display message no. 39. Edit can be repeated until approval; every save adds one history row.']},
    {'type': 'text', 'text': '5.6.8 [CR] Editable fields (proposal - to be confirmed, OP-CR-01)', 'level': 1, 'bold': True},
    {'type': 'table', 'level': 2, 'row_lines': 'all', 'columns': [{'title': 'Field', 'width': 14}, {'title': 'Editable', 'width': 5}, {'title': 'Reason / validation', 'width': 29}], 'rows': [list(x) for x in EDITABLE]},
    {'type': 'text', 'text': '5.6.9 [CR] Approve Finish Order (VPLD TM)', 'level': 1, 'bold': True},
    {'type': 'bullets', 'marker': '1.', 'level': 3, 'items': [
        'Open: [Approve] of a row, [Approve Finish Order] of the Order Detail, or [Approve Finish Order (n)] for the selected rows. If no row is selected, display message no. 37. Stop.',
        'Show the confirmation (message no. 31) with No. Order, Trucking Comp., License Plate, Driver, Finish Scan, Finished By (Driver scan / LP Admin), Cycle (Act / Plan), Container No. of every cycle, Last Destination and Edited (Y with user / date, or N). Data is read only.',
        '[Cancel]: close, no change. [Confirm Approve]: send the list (No. Order + VERSION shown) to the server.',
        f'Server, for every order: role VPLD TM (else message no. 35 for the whole request); Order Status still {WAIT} (else message no. 34); VERSION equal to the displayed version (else message no. 36).',
        'If any order fails, nothing is approved (all-or-nothing, one transaction): display message no. 33 with "<No. Order>: <reason>"; the modal stays open; failed rows are unselected and must be selected again after refresh. Log no. 7.',
        f"Otherwise for every order: Order Status = {FIN}, TM_APPROVE_BY = login user, TM_APPROVE_DATE = server date-time, VERSION + 1 (Data Edit Mapping block 12), status history 'Approve Finish Order' (Log no. 1 / 6). "
        'Close, clear the selection, refresh list and counter, display message no. 32.',
        f'After approval the order is locked on this screen (no Edit / Approve). It now meets the SA Approval eligibility ({FIN}, no SA Number); SA Approval uses the data after the TM edits. Orders {WAIT} are never listed in SA Approval.']},
    {'type': 'text', 'text': '5.6.10 [CR] Open Points of the CR (not decided - default assumption used in this UISS)', 'level': 1, 'bold': True},
    {'type': 'table', 'level': 2, 'row_lines': 'all', 'columns': [{'title': 'No', 'width': 6}, {'title': 'Open point', 'width': 22}, {'title': 'Default assumption', 'width': 20}], 'rows': [list(x) for x in OPS]},
]
c = O[find(O, lambda o: o.get('marker') == 'c.' and 'Driver App - Start Order' in o.get('text', ''))]
c['text'] += f' [CR] Finish Order in the Driver App sets Order Status {WAIT} (not {FIN}); the order is finished only after the VPLD TM approval.'
db = O[find(O, lambda o: o.get('type') == 'table' and o.get('columns', [{}])[0].get('title') == 'UI field / element')]
db['rows'] += [[f'[CR] Order Status {WAIT}', f'{D2}.STATUS_CODE', 'varchar(3)', 'N', 'R/W', 'new ielp.MS_STATUS row (code TBD)', 'TBD'],
               ['[CR] Finish Scan / Finish Order time', 'ielp.ORDER_CYCLE.FINISH_ORDER_DATE / FINISH_ORDER_BY / FINISH_BY_LP', 'datetime / varchar(500) / varchar(1)', 'N', 'R/W', 'last cycle', 'Verified'],
               ['[CR] Edit: cycle times / container / remarks', 'ielp.ORDER_CYCLE.START_DATE / PICKUP_DATE / COMPLETE_DATE / CONTAINER_NO / FINISH_REMARKS', 'datetime / varchar(11) / varchar(500)', 'N', 'R/W', 'per cycle', 'Verified'],
               ['[CR] Edit: truck / driver', f'{D2}.LICENSE_PLATE / DRIVER_ID (+ ORDER_CYCLE)', 'varchar(20) / varchar(10)', 'N', 'R/W', '-', 'Verified'],
               ['[CR] Edited By / Date', f'{D2}.TM_EDIT_BY / TM_EDIT_DATE', 'varchar(500) / datetime', 'N', 'R/W', 'new columns', 'Revised (DCR)'],
               ['[CR] Approved By / Date', f'{D2}.TM_APPROVE_BY / TM_APPROVE_DATE', 'varchar(500) / datetime', 'N', 'R/W', 'new columns', 'Revised (DCR)'],
               ['[CR] TM Edit History', 'ielp.LOG_ACTIVITY_ORDER.ACT / REMARK / PARAM_REQ / PARAM_RES', 'varchar(100) / varchar(500) / nvarchar(max)', 'N', 'W', 'before / after JSON', 'Verified']]
O[find(O, lambda o: o.get('type') == 'bullets' and any(x.startswith('G-DM-01') for x in o.get('items', [])))]['items'].append(
    f"G-DM-06 [CR] TM edit / approval: edit and approval user / date are not in ELIPS. DCR-44: ADD {D2}.TM_EDIT_BY varchar(500), TM_EDIT_DATE datetime, TM_APPROVE_BY varchar(500), TM_APPROVE_DATE datetime; "
    f"new ielp.MS_STATUS row '{WAIT}' (code TBD). Edited data uses existing columns; edit history in the existing ielp.LOG_ACTIVITY_ORDER (OP-CR-09).")
O[find(O, lambda o: o.get('type') == 'bullets' and 'MS_STATUS codes (order, cycle)' in o.get('items', []))]['items'].append(f'[CR] MS_STATUS code of {WAIT}; VPLD TM user class / role code (ielp.USERID_CLASS); LOG_ID rule of the edit history row')

M = lambda event, cause, typ, msg, action: {'event': event, 'cause': cause, 'type': typ, 'msg_id': 'TBD', 'message': msg, 'action': action}
s['display_messages'] += [
    {'group': '[CR] Edit & Approve Finish Order (VPLD TM)'},
    M('Click [Approve] / [Approve Finish Order (n)]', 'Confirmation of the orders to approve', 'Confirmation', f'Approve Finish Order of {{n}} order(s)? Approved orders become {FIN}, are locked for edit and are sent to SA Approval.', 'Confirm Approve / Cancel'),
    M('Click [Confirm Approve]', 'All orders approved', 'Info', f'{{n}} order(s) approved. Order Status: {FIN}.', '-'),
    M('Click [Confirm Approve]', 'At least one order failed the server check (all-or-nothing)', 'Error', '{x} of {n} order(s) cannot be approved. Nothing was approved. (+ list "<No. Order>: <reason>")', 'Refresh, select again and approve'),
    M('Click [Confirm Approve] / [Confirm Save]', f'Order Status is no longer {WAIT}', 'Error', f'Order {{Order No}} is no longer {WAIT} (current status: {{Status}}). Please refresh the data.', 'Refresh the list'),
    M('Edit / Approve request', 'Login role is not VPLD TM', 'Error', 'Only VPLD Transportation Management can edit or approve Finish Order.', 'Login as VPLD TM'),
    M('Click [Confirm Approve] / [Confirm Save]', 'Order changed by another user after display (VERSION)', 'Error', 'Order {Order No} was changed by another user. Please refresh the data.', 'Refresh the list'),
    M('Click [Approve Finish Order (n)]', 'No order selected', 'Warning', f'Please select at least one order with status {WAIT}.', 'Select orders'),
    M('Edit form - click [Save]', 'Valid changes', 'Confirmation', f'Save the changes of order {{Order No}}? The order stays {WAIT} until it is approved. (+ list Field / Cycle / Before / After)', 'Confirm Save / Back'),
    M('Edit form - click [Confirm Save]', 'Edit saved', 'Info', 'Order {Order No} updated ({n} field(s) changed). Approve the order to finish it.', '-'),
    M('Edit form - click [Save]', 'Edit Reason blank or shorter than 10 characters', 'Error', 'Edit Reason is required (minimum 10 characters).', 'Enter the reason'),
    M('Edit form - click [Save]', 'Time earlier than the previous step (Start <= Pickup <= Finish, cycle n >= cycle n-1, Finish Order >= last Finish Cycle)', 'Error', '{Time field} of cycle {n} must not be earlier than {previous time field}.', 'Correct the time'),
    M('Edit form - click [Save]', 'Time later than now', 'Error', '{Time field} must not be later than the current date-time.', 'Correct the time'),
    M('Edit form - click [Save]', 'No field changed', 'Info', 'There is no change to save.', 'Change a field or Cancel'),
]
s['logging_messages'] += [
    M('[CR] Approve Finish Order', 'Order approved by VPLD TM', 'Info', f'Approve Finish Order by {{User}} (VPLD TM) on {{Order No}}: {WAIT} -> {FIN}. Edited: {{Y/N}}.', 'Insert into status history (ielp.LOG_ACTIVITY_ORDER)'),
    M('[CR] Approve Finish Order', 'Request refused (revalidation / role)', 'Warning', 'Approve Finish Order by {User} refused: {x} of {n} order(s) failed ({Order No}: {reason}).', 'Display Message no. 33 / 35'),
    M('[CR] Edit Finish Order', 'Edit saved by VPLD TM', 'Info', 'Edit Finish Order by {User} (VPLD TM) on {Order No}: {Field} (cycle {n}) {Before} -> {After}; ... Reason: {Edit Reason}.', 'Insert edit history (ielp.LOG_ACTIVITY_ORDER PARAM_REQ / PARAM_RES)'),
]
for m in s['logging_messages'][-3:]: m['exception'] = 'N' if m['type'] == 'Info' else 'Y'
save(p, s, r06, '0.7', f'Status renamed {WAIT}; VPLD TM can Edit the delivery data (truck, driver, container, cycle times, finish time, remarks; Edit Reason mandatory; edit history before / after) and Approve '
     f'(per row, Order Detail, bulk); after approval {FIN} and locked; editable-field table 5.6.8; columns Finish Scan / Edited / Approved By / Approved Date; Data Map [CR] blocks 11-15; '
     f'messages no. 31-43, logs no. 6-8; Open Points OP-CR-01..10; screenshots 10-18. {SUPERSEDE}')

# ======================================================================= SA Approval
p, s, r06 = load('UISS_Screen_SA_Approval')
s['general']['objective'].append(f'[CR] Only deliveries approved by VPLD Transportation Management on Daily Order Monitoring (Daily status {FIN}) are listed, with the data after the TM edits; deliveries {WAIT} are not.')
O = s['operation']
a = O[find(O, lambda o: o.get('marker') == 'a.' and "Delivery is listed when Daily status" in o.get('text', ''))]
a['text'] = (f"Delivery is listed when Daily status = '{FIN}' and SA_CODE is empty, and Order Date is within the criteria (SA-01). Delivery with an SA Number never appears again. "
             f"[CR] Since CR 16-Nov-26, '{FIN}' is set only by the VPLD TM approval on Daily Order Monitoring (Approve Finish Order, after optional TM Edit); deliveries finished by the driver / LP Admin wait in '{WAIT}' and are not listed "
             f"(no delivery reaches SA Approval without TM approval, except orders already {FIN} before go-live - OP-CR-07 of Daily Order Monitoring).")
O.insert(O.index(a) + 1, {'type': 'item', 'marker': 'a2.', 'text': '[CR] Route, cycles, containers, truck and driver used by the calculation are the order data after the VPLD TM edits (route is not editable, so Total KM is not affected by an edit). '
                          'The list shows TM Approved (user / date, "Edited" marker when TM changed the data) and the Calculation Detail shows Finish Scan, TM Approved By / Date and TM Edited, for information only.', 'level': 2})
v = O[find(O, lambda o: o.get('type') == 'table' and o['columns'][0]['title'] == 'ID' and any(r[0] == 'SA-V01' for r in o['rows']))]
v['rows'][0][2] = f'Daily status is not {FIN} ([CR] includes {WAIT})'
s['items'] += [
    {'group': '<[CR] Order List Grid - addition>'},
    item('TM Approved', 'ielp.DTP_2_DETAIL', 'TM_APPROVE_BY / TM_APPROVE_DATE / TM_EDIT_BY', 'Varchar / Datetime', '500 / -', 'O', 'Grid', 'VPLD TM user, below it the approval date-time and the marker "Edited" when TM_EDIT_BY is filled (column after Order Date; Kolom can hide it). "-" for orders finished before go-live (OP-CR-07).\nDB: new columns, DCR-44.', fmt='X..X / YYYY-MM-DD HH:MI', just='Center'),
    {'group': '<[CR] Calculation Detail Popup - addition>'},
    item('Finish Scan', 'ielp.ORDER_CYCLE', 'FINISH_ORDER_DATE / FINISH_ORDER_BY', 'Datetime / Varchar', '', 'O', 'Label', 'Delivery info: "<date-time> · <user>" of the Finish Order (after TM edit).', fmt='YYYY-MM-DD HH:MI · X..X'),
    item('TM Approved By / Date', 'ielp.DTP_2_DETAIL', 'TM_APPROVE_BY / TM_APPROVE_DATE', 'Varchar / Datetime', '', 'O', 'Label', 'Delivery info: "<user> · <date-time>" (DCR-44).', fmt='X..X · YYYY-MM-DD HH:MI'),
    item('TM Edited', 'ielp.DTP_2_DETAIL', 'TM_EDIT_BY / TM_EDIT_DATE', 'Varchar / Datetime', '', 'O', 'Label', 'Delivery info: "Y · <user> · <date-time>" of the last TM edit, else "N" (DCR-44). The edit history is on Daily Order Monitoring.'),
]
s['screen_layout'] += [{'caption': '[CR] Order List with column TM Approved and marker Edited (only deliveries approved by VPLD TM are listed)', 'image': 'img/UISS_Screen_SA_Approval/20_cr_sa_tm_column.png'},
                       {'caption': '[CR] Calculation Detail with Finish Scan, TM Approved By / Date and TM Edited', 'image': 'img/UISS_Screen_SA_Approval/21_cr_sa_calc_tm.png'}]
shots(p, ['20_cr_sa_tm_column.png', '21_cr_sa_calc_tm.png'], ['20_cr', '21_cr'])
save(p, s, r06, '0.7', f'Eligibility: Daily status {FIN} is set only by the VPLD TM approval (orders {WAIT} are not listed); calculation uses the data after TM edits; TM Approved column with Edited marker; '
     f'Finish Scan / TM Approved By / Date / TM Edited in the Calculation Detail (DCR-44); SA-V01 text. {SUPERSEDE}')

# ======================================================================= Download Daily Order Monitoring (report)
p, s, r06 = load('UISS_Report_Download_Daily_Order_Monitoring')
O = s['operation']
O[2]['items'][0] = 'Header filters: Date From, Date To, From Loc., To Loc., [CR] Order Status.'
f = O[find(O, lambda o: o.get('marker') == 'b.' and o.get('text', '').startswith('Filter: Order Date'))]
f['text'] += ' [CR] Order Status = selected status (if not All; also set by the [Waiting TM Approval (n)] counter).'
O.insert(O.index(f) + 1, {'type': 'item', 'marker': 'b2.', 'text': f'[CR] Order Status values include {WAIT} (between Start Daily Order and {FIN}). License Plate, Driver, cycle times and Container No. are exported as currently stored (after VPLD TM edits). '
                          'Finish Scan / Edited / Approved By / Approved Date columns of the screen are not exported (no layout change).', 'level': 2})
i = find(s['items'], lambda r: r.get('name') == 'DTP Type')
s['items'].insert(i + 1, item('Order Status', 'Screen criteria', 'Order Status', 'Varchar', '30', 'O', 'Label', 'Print criteria row "Order Status : <value>" (All when not selected). Inserted after DTP Type.', fmt='X..30..X'))
save(p, s, r06, '0.6', f'Status renamed {WAIT}; exported data = data after VPLD TM edits. {SUPERSEDE}')

# ======================================================================= Driver Order Sync (batch)
p, s, r06 = load('UISS_Batch_Driver_Order_Sync')
t = s['func_desc'][find(s['func_desc'], lambda o: o.get('type') == 'table' and o['columns'][0]['title'] == 'Condition' and any('Finish Daily Order' in r[0] for r in o['rows']))]
r = t['rows'][find(t['rows'], lambda r: 'Finish Daily Order' in r[0])]
r[0] = f'Cycle Finish Cycle, or order [CR] {WAIT} / Finish Daily Order / SA'
s['func_desc'].insert(s['func_desc'].index(t) + 1, {'type': 'text', 'text': f'[CR] After the driver scans Finish Order the order is {WAIT} (VPLD TM edit / approval on Daily Order Monitoring). For the APK this is a finished order: the card moves to history (HISTORY). '
                                                    f'A later TM edit (truck, driver, container, times) or the approval ({FIN}) creates no sync event and no new card (OP-CR-10 of Daily Order Monitoring).', 'level': 1})
save(p, s, r06, '0.6', f'Status {WAIT} handled as finished (HISTORY); TM edits / approval are not synchronised to the APK. {SUPERSEDE}')
