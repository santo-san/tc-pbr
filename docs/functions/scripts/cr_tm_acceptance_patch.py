"""CR (16-Nov-26): Finish Order acceptance by VPLD Transportation Management (VPLD TM).
Patches the source JSON of: UISS_Screen_Daily_Order_Monitoring (0.6), UISS_Screen_SA_Approval (0.6),
UISS_Report_Download_Daily_Order_Monitoring (0.5), UISS_Batch_Driver_Order_Sync (0.5). Changed parts are prefixed [CR].
Usage: python3 cr_tm_acceptance_patch.py <repo> <screenshot dir>   (run once; refuses to run twice)"""
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uiss_paths import locate
R, SHOTS = sys.argv[1], sys.argv[2]
DATE, WHO = '16-Nov-26', 'Susanto'
CRD = 'CR: Finish Order acceptance by VPLD Transportation Management'
WAIT, FIN = 'Waiting TM Acceptance', 'Finish Daily Order'
OPS = [  # Open points of the CR (not decided by the user): default assumption used in this UISS
    ('OP-CR-01', 'Can VPLD TM reject / return a Finish Order (e.g. wrong scan)? If yes: status after return, reason mandatory, driver scans again?', 'No reject / return in this CR. A wrong finish is corrected outside this screen (TBD).'),
    ('OP-CR-02', 'Can VPLD TM finish an order manually when the driver did not scan (driver phone problem)? Which data is mandatory?', 'No. Manual Finish Order stays with LP Admin (Reason mandatory, 5.6.5) and also waits for TM acceptance.'),
    ('OP-CR-03', 'Can VPLD TM correct data (finish time, container, ...) before Accept?', 'No correction on the Accept confirmation; data is shown read only for verification.'),
    ('OP-CR-04', 'Is bulk accept needed or per row only?', 'Both: [Accept] per row / Order Detail and [Accept Finish Order (n)] for the selected rows (all-or-nothing).'),
    ('OP-CR-05', 'Time limit / reminder / auto-accept for acceptance?', 'None. Orders stay Waiting TM Acceptance until accepted.'),
    ('OP-CR-06', 'Orders already Finish Daily Order before go-live of this CR?', 'They stay Finish Daily Order and go to SA Approval directly (no TM acceptance, TM_ACCEPT_BY / DATE empty).'),
    ('OP-CR-07', 'Notification (e-mail / dashboard) to VPLD TM for orders waiting acceptance?', 'No notification; the [Waiting TM Acceptance (n)] counter on this screen only.'),
]


def load(name):
    p = locate(name, R)
    return p, json.load(open(p['src']))


def save(p, s, rev, desc):
    assert not any(r['description'].startswith(CRD) for r in s['revisions']), f"{p['src']}: CR already applied"
    s['revisions'].append({'revision': rev, 'author': WHO, 'date': DATE, 'reviewed_by': '', 'description': f'{CRD}. {desc}'})
    s['header']['updated_date'], s['header']['updated_by'] = DATE, WHO
    json.dump(s, open(p['src'], 'w'), indent=1, ensure_ascii=False)
    print('patched', os.path.basename(p['src']), rev)


def item(name, source, field, typ, ln, io, control, desc, initial='', req='N', fmt='', val='', just='Left'):
    return {'name': '[CR] ' + name, 'source': source, 'field': field, 'type': typ, 'len': ln, 'io': io, 'control': control, 'justified': just,
            'initial': initial, 'required': req, 'format': fmt, 'validation': val, 'description': desc}


def find(lst, pred):
    for i, x in enumerate(lst):
        if pred(x): return i
    raise SystemExit('not found')


def shots(p, names):
    d = os.path.join(p['src_dir'], 'img', os.path.basename(p['src'])[:-5]); os.makedirs(d, exist_ok=True)
    for n in names: shutil.copyfile(os.path.join(SHOTS, n), os.path.join(d, n))


# ======================================================================= Daily Order Monitoring
p, s = load('UISS_Screen_Daily_Order_Monitoring')
g = s['general']
g['objective'].append(f'[CR] To let VPLD Transportation Management (VPLD TM) verify and accept the Finish Order scanned by the driver (or done by LP Admin): the order waits in status {WAIT} and becomes {FIN} - and is sent to SA Approval - only after the TM acceptance.')
NEWB = {'[CR] Waiting TM Acceptance (n)': 'To filter the Order List on Order Status Waiting TM Acceptance; the counter shows the number of waiting orders in the user data scope.',
        '[CR] Accept Finish Order (n)': 'VPLD TM: to accept the Finish Order of the selected orders (check box, status Waiting TM Acceptance). Opens the Accept Finish Order confirmation.',
        '[CR] Accept (row) / Accept Finish Order (Order Detail)': 'VPLD TM: to accept the Finish Order of one order. Opens the Accept Finish Order confirmation.',
        '[CR] Confirm Accept': 'To accept the listed orders: Order Status becomes Finish Daily Order (5.6.7).',
        '[CR] Cancel (confirmation)': 'To close the confirmation without change.'}
g['buttons'] += [{'name': k, 'function': v} for k, v in NEWB.items()]
for m in g['screen_modes']:
    for sec in m['sections']:
        on = sec['buttons'].get('Find') == 'E'
        sec['buttons'].update({'[CR] Waiting TM Acceptance (n)': 'E' if on else 'D', '[CR] Accept Finish Order (n)': 'D',
                               '[CR] Accept (row) / Accept Finish Order (Order Detail)': 'D', '[CR] Confirm Accept': 'D', '[CR] Cancel (confirmation)': 'D'})
base = {k: 'D' for k in g['screen_modes'][0]['sections'][0]['buttons']}
g['screen_modes'].append({'mode': '[CR] Order List / Order Detail Mode - VPLD TM', 'sections': [
    {'section': 'Order List', 'description': 'all orders (view); check box and [Accept] only on rows Waiting TM Acceptance, refer below 4)',
     'buttons': {**base, **{k: 'E' for k in ['Download Driver App', 'Landing Page', 'Find', 'Clear', 'Tab ALL / DTP 1 - DTP 4', 'Refresh', 'Kolom', 'Export', 'Detail (Action icon)',
                                            '[CR] Waiting TM Acceptance (n)', '[CR] Accept Finish Order (n)', '[CR] Accept (row) / Accept Finish Order (Order Detail)']}}},
    {'section': 'Accept Finish Order confirmation', 'description': 'read-only summary of the orders to accept',
     'buttons': {**base, '[CR] Confirm Accept': 'E', '[CR] Cancel (confirmation)': 'E'}}]})
g['screen_mode_remarks'].append(f'4) [CR] VPLD TM: the selection check box and [Accept] are shown only for rows in {WAIT}; [Accept Finish Order (n)] is enabled when at least one row is selected. Other roles do not see the check box / Accept buttons (view only).')

sf = s['screen_flow']
sf[0]['flow']['nodes'].append({'id': 'c', 'label': '[CR] Accept Finish Order confirmation', 'type': 'screen'})
sf[0]['flow']['edges'] += [{'from': 'm', 'to': 'c', 'label': '[CR] Accept / Accept Finish Order (n)'}, {'from': 'd', 'to': 'c', 'label': '[CR] Accept Finish Order'},
                           {'from': 'c', 'to': 'm', 'label': 'Confirm OK / Cancel'}]
fl = sf[1]['flow']
fl['nodes'].insert(find(fl['nodes'], lambda n: n['id'] == 'f'), {'id': 'w', 'label': f'[CR] {WAIT}', 'type': 'process'})
e = fl['edges'][find(fl['edges'], lambda x: x['from'] == 'st' and x['to'] == 'f')]
e.update({'to': 'w', 'label': '[CR] Finish Order (Driver scan / LP)'})
fl['edges'].insert(fl['edges'].index(e) + 1, {'from': 'w', 'to': 'f', 'label': '[CR] Accept Finish Order (VPLD TM)'})

s['screen_layout'] += [
    {'caption': f'[CR] 10. VPLD TM - Order List filtered on {WAIT} (counter, highlighted rows, check box, [Accept], [Accept Finish Order (n)])', 'image': 'img/UISS_Screen_Daily_Order_Monitoring/10_cr_tm_waiting_list.png'},
    {'caption': '[CR] 11. Accept Finish Order confirmation (data to verify before Accept)', 'image': 'img/UISS_Screen_Daily_Order_Monitoring/11_cr_tm_accept_confirm.png'},
    {'caption': '[CR] 12. Accept refused: order changed by another user, nothing accepted (message no. 33 / 36)', 'image': 'img/UISS_Screen_Daily_Order_Monitoring/12_cr_tm_accept_error.png'},
    {'caption': f'[CR] 13. After Accept: Order Status {FIN}, columns Finish Scan / Accepted By / Accepted Date', 'image': 'img/UISS_Screen_Daily_Order_Monitoring/13_cr_tm_accepted_list.png'},
    {'caption': f'[CR] 14. Order Detail of an order {WAIT} (VPLD TM): Finish Scan, TM Accepted, action Accept Finish Order', 'image': 'img/UISS_Screen_Daily_Order_Monitoring/14_cr_tm_detail.png'}]
shots(p, [os.path.basename(x['image']) for x in s['screen_layout'][-5:]])

ST = 'ielp.DTP_2_DETAIL'
s['items'] += [
    {'group': '<[CR] Search Criteria Section - addition>'},
    item('Order Status', 'ielp.DTP_2_DETAIL', 'STATUS_CODE', 'Varchar', '3', 'I', 'Combo Box', f'All / Planning Order / Order Release / Start Daily Order / {WAIT} / {FIN} / SA Approved / SA Approved with PO Number (workflow sequence). Applied on [Find] with the other criteria; [Clear] resets to All.\nDB: ielp.DTP_2_DETAIL.STATUS_CODE varchar(3); code of {WAIT} = new ielp.MS_STATUS row - TBD - Not confirmed from existing schema/data/code.', initial='All'),
    {'group': '<[CR] Order List Section - additions>'},
    item('Waiting TM Acceptance (n)', 'ielp.DTP_2_DETAIL', 'count of STATUS_CODE = Waiting TM Acceptance', 'Number', '', 'O', 'Button (chip)', f'Counter of orders {WAIT} in the user data scope (all dates). Click: Order Status filter = {WAIT} (click again: All). Highlighted when the filter is active.'),
    item('Accept Finish Order (n)', '', '', '', '', 'O', 'Button', 'Shown for VPLD TM only; n = selected rows; disabled when n = 0. Refer 5.6.7.'),
    item('Select (check box) / Select all (header)', '', '', '', '', 'I', 'Check box', f'VPLD TM only. Enabled only on rows {WAIT}; header check box selects / clears all such rows of the filtered list. Selection is kept over pages and cleared after Accept or a role change.', initial='Unchecked'),
    item('Accept (row)', '', '', '', '', 'O', 'Button', f'Below the Action icon, VPLD TM only, rows {WAIT} only. Opens the confirmation for this order.'),
    item('Row highlight', '', '', '', '', 'O', 'Grid row', f'Rows {WAIT} are shown with a light orange background (all roles).'),
    item('Finish Scan', 'ielp.ORDER_CYCLE', 'FINISH_ORDER_DATE / FINISH_ORDER_BY', 'Datetime', '', 'O', 'Grid', 'Date-time of the Finish Order (driver scan or LP Admin) and below it the user. Sortable.\nDB: ielp.ORDER_CYCLE.FINISH_ORDER_DATE datetime, FINISH_ORDER_BY varchar(500) of the last cycle (existing columns).', fmt='YYYY-MM-DD HH:MI:SS', just='Center'),
    item('Accepted By', 'ielp.DTP_2_DETAIL', 'TM_ACCEPT_BY', 'Varchar', '500', 'O', 'Grid', 'VPLD TM user who accepted the Finish Order; "-" when not accepted.\nDB: ielp.DTP_2_DETAIL.TM_ACCEPT_BY varchar(500) - new column, DCR-44.', just='Center'),
    item('Accepted Date', 'ielp.DTP_2_DETAIL', 'TM_ACCEPT_DATE', 'Datetime', '', 'O', 'Grid', 'Date-time of the TM acceptance. Sortable.\nDB: ielp.DTP_2_DETAIL.TM_ACCEPT_DATE datetime - new column, DCR-44.', fmt='YYYY-MM-DD HH:MI:SS', just='Center'),
    item('Order Status (sub text)', '', '', '', '', 'O', 'Grid', f'Below the badge: {WAIT} -> "Finish scan <date-time>"; {FIN} accepted by TM -> "TM accepted <date-time>".'),
    {'group': '<[CR] Order Detail Modal - Summary additions>'},
    item('Finish Scan', 'ielp.ORDER_CYCLE', 'FINISH_ORDER_DATE / FINISH_ORDER_BY', 'Datetime', '', 'O', 'Label', '"<date-time> · <user>"; "-" when not finished.', fmt='YYYY-MM-DD HH:MI:SS · X..X'),
    item('TM Accepted', 'ielp.DTP_2_DETAIL', 'TM_ACCEPT_BY / TM_ACCEPT_DATE', 'Varchar / Datetime', '', 'O', 'Label', '"<user> · <date-time>"; "-" when not accepted (DCR-44).'),
    item('Accept Finish Order (action button)', '', '', '', '', 'O', 'Button', f'In the Action section for VPLD TM when Order Status = {WAIT} (5.5). Opens the Accept Finish Order confirmation (not the Action Input modal).'),
    {'group': '<[CR] Accept Finish Order Confirmation Modal>'},
    item('Confirmation text', 'Fixed', '--', '', '', 'O', 'Label', 'Message no. 31.'),
    item('No. Order', 'ielp.DTP_2_DETAIL', 'ORDER_NO', 'Varchar', '20', 'O', 'Grid', 'One row per order to accept.'),
    item('Trucking Comp.', 'ielp.MS_TRUCKING_COMPANY', 'COMPANY_NAME', 'Varchar', '', 'O', 'Grid', 'Via DTP_2_DETAIL.COMPANY_ID.'),
    item('License Plate / Driver', 'ielp.DTP_2_DETAIL', 'LICENSE_PLATE / DRIVER_ID', 'Varchar', '20 / 10', 'O', 'Grid', 'Driver name from ielp.MS_DRIVER.'),
    item('Finish Scan / Finished By', 'ielp.ORDER_CYCLE', 'FINISH_ORDER_DATE / FINISH_ORDER_BY / FINISH_BY_LP', 'Datetime / Varchar', '', 'O', 'Grid', 'Finished By shows "Driver scan" or "LP Admin (manual)" (FINISH_BY_LP = Y).'),
    item('Cycle (Act / Plan)', 'ielp.ORDER_CYCLE', 'count of rows / planned cycle (DCR-26)', 'Number', '', 'O', 'Grid', 'Actual cycles / planned cycles.', fmt='9 / 9'),
    item('Container No.', 'ielp.ORDER_CYCLE', 'CONTAINER_NO', 'Varchar', '11', 'O', 'Grid', 'Container Number of every cycle, one per line.'),
    item('Last Destination', 'ielp.ORDER_CYCLE', 'TO_LOC', 'Varchar', '10', 'O', 'Grid', 'Destination of the last cycle (location name from ielp.MS_LOCATION).'),
    item('Error area', '', '', '', '', 'O', 'Label', 'Message no. 33 with the list "<No. Order>: <reason>" (messages no. 34 / 36); shown above the list, the modal stays open.'),
    item('Cancel / Close (x)', '', '', '', '', 'O', 'Button', 'Close without change.'),
    item('Confirm Accept', '', '', '', '', 'O', 'Button', 'Refer 5.6.7.'),
]

D = s['data_map']['blocks']
fo = D[find(D, lambda b: 'Finish Order' in b['destination'].get('description', ''))]
fo['mappings'][find(fo['mappings'], lambda m: m['dest_field'] == 'STATUS_CODE')]['description'] = f"[CR] '{WAIT}' (new ielp.MS_STATUS code - TBD; was '{FIN}')"
D += [
    {'source': '[CR] Finish Order (Driver App scan / LP Admin [Submit])', 'destination': {'table': 'ielp.ORDER_CYCLE', 'operation': 'Update', 'description': '[CR] Finish Order - finish scan data',
     'keys': [{'field': 'ORDER_NO', 'value': 'Selected No. Order'}, {'field': 'CYCLE_SEQ', 'value': 'Last cycle'}]},
     'mappings': [{'dest_field': 'FINISH_ORDER_DATE', 'description': 'Server system date-time (existing column)'}, {'dest_field': 'FINISH_ORDER_BY', 'description': 'Login user ID (driver / LP Admin) (existing column)'},
                  {'dest_field': 'FINISH_BY_LP', 'description': "'Y' when done by LP Admin, else 'N' (existing column)"}, {'dest_field': 'UPDATED_BY', 'description': 'Login user ID'}, {'dest_field': 'UPDATED_DATE', 'description': 'Server system date'}]},
    {'source': '[CR] Accept Finish Order confirmation', 'destination': {'table': ST, 'operation': 'Update', 'description': '[CR] Accept Finish Order - [Confirm Accept] (one per order)',
     'keys': [{'field': 'ORDER_NO', 'value': 'Each listed No. Order'}, {'field': 'STATUS_CODE', 'value': f"'{WAIT}'"}, {'field': 'VERSION', 'value': 'Version when displayed [DCR-36]'}]},
     'mappings': [{'dest_field': 'STATUS_CODE', 'description': f"'{FIN}'"}, {'dest_field': 'TM_ACCEPT_BY', 'description': 'Login user ID (VPLD TM) [DCR-44: new column]'},
                  {'dest_field': 'TM_ACCEPT_DATE', 'description': 'Server system date-time [DCR-44: new column]'}, {'dest_field': 'UPDATED_BY', 'description': 'Login user ID'},
                  {'dest_field': 'UPDATED_DATE', 'description': 'Server system date'}, {'dest_field': 'VERSION', 'description': 'VERSION + 1 [DCR-36]'}]},
]

O = s['operation']
O[2]['rows'].append(['[CR] VPLD TM (Transportation Management)', 'All orders (view)', f'Accept Finish Order (orders {WAIT}); no other action'])
O.insert(3, {'type': 'text', 'text': f'[CR] Only VPLD TM can accept a Finish Order. Planner VPLD (SA Approval), IELP Admin, Supplier and Driver see {WAIT} orders read only (no check box / Accept button); a request from another role gets message no. 35.', 'level': 2})
i = find(O, lambda o: o.get('marker') == 'g.' and 'Kolom' in o.get('text', ''))
O[i + 1:i + 1] = [{'type': 'item', 'marker': 'h.', 'text': f'[CR] Criteria Order Status: applied on [Find] together with the other criteria; [Clear] resets it to All.', 'level': 2},
                  {'type': 'item', 'marker': 'i.', 'text': f'[CR] User clicks [Waiting TM Acceptance (n)]: Order Status filter = {WAIT} at once (all dates within the other criteria); click again to remove the filter. The counter is recalculated on every refresh of the list.', 'level': 2}]
t = O[find(O, lambda o: o.get('type') == 'table' and o['columns'][0]['title'] == 'Order Status')]
k = find(t['rows'], lambda r: r[0] == 'Start Daily Order')
t['rows'].insert(k + 1, [f'[CR] {WAIT}', 'Driver scans Finish Order (Driver App) or LP Admin does Finish Order; the order waits for the acceptance of VPLD TM and is not yet visible in SA Approval'])
t['rows'][find(t['rows'], lambda r: r[0] == FIN)][1] = '[CR] VPLD TM accepted the Finish Order (5.6.7). Only orders in this status are listed in SA Approval'
t = O[find(O, lambda o: o.get('type') == 'table' and o['columns'][0]['title'] == 'Action')]
fr = t['rows'][find(t['rows'], lambda r: r[0] == 'Finish Order')]; fr[3] = f'[CR] {WAIT}'
t['rows'].insert(t['rows'].index(fr) + 1, ['[CR] Accept Finish Order', 'VPLD TM', WAIT, f'{FIN} (accepted by / date)'])
b = O[find(O, lambda o: o.get('type') == 'bullets' and any('Set Order Status = Finish Daily Order' in x for x in o['items']))]
b['items'][1] = (f"[CR] Set Order Status = {WAIT} (was {FIN}); finish data on the last cycle: FINISH_ORDER_DATE, FINISH_ORDER_BY, FINISH_BY_LP = 'Y'. "
                 "If actual cycles < planned cycles, note 'Actual x of planned y cycles' in history (allowed, TBD OP-06).")
i = find(O, lambda o: o.get('type') == 'heading' and o['text'].startswith('5.7'))
O[i:i] = [
    {'type': 'text', 'text': '5.6.7 [CR] Accept Finish Order (VPLD TM)', 'level': 1, 'bold': True},
    {'type': 'bullets', 'marker': '1.', 'level': 3, 'items': [
        'Open: [Accept] of a row, [Accept Finish Order] of the Order Detail, or [Accept Finish Order (n)] for the selected rows. If no row is selected, display message no. 37. Stop.',
        f'Show the confirmation (message no. 31) with No. Order, Trucking Comp., License Plate, Driver, Finish Scan, Finished By (Driver scan / LP Admin), Cycle (Act / Plan), Container No. of every cycle and Last Destination, for verification. Data is read only.',
        '[Cancel]: close, no change. [Confirm Accept]: send the list (No. Order + VERSION shown) to the server.',
        'Server, for every order: role must be VPLD TM (else message no. 35 for the whole request); Order Status must still be ' + WAIT + ' (else message no. 34); VERSION must equal the displayed version (else message no. 36).',
        'If any order fails, nothing is accepted (all-or-nothing, one transaction): display message no. 33 with the list "<No. Order>: <reason>"; the modal stays open; failed rows are unselected and must be selected again after refresh. Log no. 7.',
        f'Otherwise for every order: Order Status = {FIN}, TM_ACCEPT_BY = login user, TM_ACCEPT_DATE = server date-time, VERSION + 1 (Data Edit Mapping [CR] Accept Finish Order), insert status history ' +
        "'Accept Finish Order' (Log no. 1 / 6). Close the modal, clear the selection, refresh the list and counter, display message no. 32.",
        f'The accepted orders now meet the SA Approval eligibility (Order Status {FIN}, no SA Number). Orders {WAIT} are never listed in SA Approval.']},
    {'type': 'text', 'text': '5.6.8 [CR] Open Points of the CR (not decided - default assumption used in this UISS)', 'level': 1, 'bold': True},
    {'type': 'table', 'level': 2, 'row_lines': 'all', 'columns': [{'title': 'No', 'width': 6}, {'title': 'Open point', 'width': 22}, {'title': 'Default assumption', 'width': 20}], 'rows': [list(x) for x in OPS]},
]
c = O[find(O, lambda o: o.get('marker') == 'c.' and 'Driver App - Start Order' in o.get('text', ''))]
c['text'] += f' [CR] Finish Order in the Driver App sets Order Status {WAIT} (not {FIN}); the order is finished only after the VPLD TM acceptance.'
db = O[find(O, lambda o: o.get('type') == 'table' and o.get('columns', [{}])[0].get('title') == 'UI field / element')]
db['rows'] += [['[CR] Order Status Waiting TM Acceptance', 'ielp.DTP_2_DETAIL.STATUS_CODE', 'varchar(3)', 'N', 'R/W', 'new ielp.MS_STATUS row (code TBD)', 'TBD'],
               ['[CR] Finish Scan', 'ielp.ORDER_CYCLE.FINISH_ORDER_DATE / FINISH_ORDER_BY / FINISH_BY_LP', 'datetime / varchar(500) / varchar(1)', 'N', 'R/W', 'last cycle', 'Verified'],
               ['[CR] Accepted By', 'ielp.DTP_2_DETAIL.TM_ACCEPT_BY', 'varchar(500)', 'N', 'R/W', 'new column', 'Revised (DCR)'],
               ['[CR] Accepted Date', 'ielp.DTP_2_DETAIL.TM_ACCEPT_DATE', 'datetime', 'N', 'R/W', 'new column', 'Revised (DCR)']]
O[find(O, lambda o: o.get('type') == 'bullets' and any(x.startswith('G-DM-01') for x in o.get('items', [])))]['items'].append(
    f'G-DM-06 [CR] TM acceptance: acceptance user / date of the Finish Order are not in ELIPS. DCR-44: ADD ielp.DTP_2_DETAIL.TM_ACCEPT_BY varchar(500), TM_ACCEPT_DATE datetime; new ielp.MS_STATUS row \'{WAIT}\' (code TBD). Finish scan uses the existing ORDER_CYCLE.FINISH_ORDER_DATE / FINISH_ORDER_BY / FINISH_BY_LP.')
O[find(O, lambda o: o.get('type') == 'bullets' and 'MS_STATUS codes (order, cycle)' in o.get('items', []))]['items'].append(f'[CR] MS_STATUS code of {WAIT}; VPLD TM user class / role code (ielp.USERID_CLASS)')

s['display_messages'] += [
    {'group': '[CR] Accept Finish Order (VPLD TM)'},
    {'event': 'Click [Accept] / [Accept Finish Order (n)]', 'cause': 'Confirmation of the orders to accept', 'type': 'Confirmation', 'msg_id': 'TBD', 'message': f'Accept Finish Order of {{n}} order(s)? Accepted orders become {FIN} and are sent to SA Approval.', 'action': 'Confirm Accept / Cancel'},
    {'event': 'Click [Confirm Accept]', 'cause': 'All orders accepted', 'type': 'Info', 'msg_id': 'TBD', 'message': f'{{n}} order(s) accepted. Order Status: {FIN}.', 'action': '-'},
    {'event': 'Click [Confirm Accept]', 'cause': 'At least one order failed the server check (all-or-nothing)', 'type': 'Error', 'msg_id': 'TBD', 'message': '{x} of {n} order(s) cannot be accepted. Nothing was accepted. (+ list "<No. Order>: <reason>")', 'action': 'Refresh, select again and accept'},
    {'event': 'Click [Confirm Accept]', 'cause': f'Order Status is no longer {WAIT}', 'type': 'Error', 'msg_id': 'TBD', 'message': f'Order {{Order No}} is no longer {WAIT} (current status: {{Status}}). Please refresh the data.', 'action': 'Refresh the list'},
    {'event': 'Accept request', 'cause': 'Login role is not VPLD TM', 'type': 'Error', 'msg_id': 'TBD', 'message': 'Only VPLD Transportation Management can accept Finish Order.', 'action': 'Login as VPLD TM'},
    {'event': 'Click [Confirm Accept]', 'cause': 'Order changed by another user after display (VERSION)', 'type': 'Error', 'msg_id': 'TBD', 'message': 'Order {Order No} was changed by another user. Please refresh the data.', 'action': 'Refresh the list'},
    {'event': 'Click [Accept Finish Order (n)]', 'cause': 'No order selected', 'type': 'Warning', 'msg_id': 'TBD', 'message': f'Please select at least one order with status {WAIT}.', 'action': 'Select orders'},
]
s['logging_messages'] += [
    {'event': '[CR] Accept Finish Order', 'cause': 'Order accepted by VPLD TM', 'type': 'Info', 'msg_id': 'TBD', 'message': f'Accept Finish Order by {{User}} (VPLD TM) on {{Order No}}: {WAIT} -> {FIN}.', 'exception': 'N', 'action': 'Insert into status history (ielp.LOG_ACTIVITY_ORDER)'},
    {'event': '[CR] Accept Finish Order', 'cause': 'Request refused (revalidation / role)', 'type': 'Warning', 'msg_id': 'TBD', 'message': 'Accept Finish Order by {User} refused: {x} of {n} order(s) failed ({Order No}: {reason}).', 'exception': 'Y', 'action': 'Display Message no. 33 / 35'},
]
save(p, s, '0.6', f'New status {WAIT} between Start Daily Order and {FIN} (Finish Order by driver / LP Admin); new role VPLD TM; Accept Finish Order per row, from Order Detail and in bulk with confirmation; Order Status filter, '
     'Waiting TM Acceptance counter and row highlight; columns Finish Scan / Accepted By / Accepted Date; Data Map [CR] blocks 11-12 and Finish Order status changed; messages no. 31-37, logs no. 6-7; Open Points OP-CR-01..07; DCR-44. Changed parts marked [CR].')

# ======================================================================= SA Approval
p, s = load('UISS_Screen_SA_Approval')
s['general']['objective'].append(f'[CR] Only deliveries whose Finish Order was accepted by VPLD Transportation Management on Daily Order Monitoring (Daily status {FIN}) are listed; deliveries {WAIT} are not.')
O = s['operation']
a = O[find(O, lambda o: o.get('marker') == 'a.' and "Delivery is listed when Daily status" in o.get('text', ''))]
a['text'] = (f"Delivery is listed when Daily status = '{FIN}' and SA_CODE is empty, and Order Date is within the criteria (SA-01). Delivery with an SA Number never appears again. "
             f"[CR] Since CR 16-Nov-26, '{FIN}' is set only by the VPLD TM acceptance on Daily Order Monitoring (Accept Finish Order); deliveries finished by the driver / LP Admin wait in '{WAIT}' and are not listed "
             f"(no delivery reaches SA Approval without TM acceptance, except orders already {FIN} before go-live - OP-CR-06 of Daily Order Monitoring).")
O.insert(O.index(a) + 1, {'type': 'item', 'marker': 'a2.', 'text': '[CR] The list shows TM Accepted (user / date) and the Calculation Detail shows Finish Scan and TM Accepted By / Date for information; they do not change the calculation or validation.', 'level': 2})
v = O[find(O, lambda o: o.get('type') == 'table' and o['columns'][0]['title'] == 'ID' and any(r[0] == 'SA-V01' for r in o['rows']))]
v['rows'][0][2] = f'Daily status is not {FIN} ([CR] includes {WAIT})'
s['items'] += [
    {'group': '<[CR] Order List Grid - addition>'},
    item('TM Accepted', 'ielp.DTP_2_DETAIL', 'TM_ACCEPT_BY / TM_ACCEPT_DATE', 'Varchar / Datetime', '500 / -', 'O', 'Grid', 'VPLD TM user and below it the acceptance date-time (column after Order Date; Kolom can hide it). "-" for orders finished before go-live (OP-CR-06).\nDB: new columns, DCR-44.', fmt='X..X / YYYY-MM-DD HH:MI', just='Center'),
    {'group': '<[CR] Calculation Detail Popup - addition>'},
    item('Finish Scan', 'ielp.ORDER_CYCLE', 'FINISH_ORDER_DATE / FINISH_ORDER_BY', 'Datetime / Varchar', '', 'O', 'Label', 'Delivery info: "<date-time> · <user>" of the Finish Order.', fmt='YYYY-MM-DD HH:MI · X..X'),
    item('TM Accepted By / Date', 'ielp.DTP_2_DETAIL', 'TM_ACCEPT_BY / TM_ACCEPT_DATE', 'Varchar / Datetime', '', 'O', 'Label', 'Delivery info: "<user> · <date-time>" (DCR-44).', fmt='X..X · YYYY-MM-DD HH:MI'),
]
s['screen_layout'] += [{'caption': '[CR] Order List with column TM Accepted (only deliveries accepted by VPLD TM are listed)', 'image': 'img/UISS_Screen_SA_Approval/20_cr_sa_tm_column.png'},
                       {'caption': '[CR] Calculation Detail with Finish Scan and TM Accepted By / Date', 'image': 'img/UISS_Screen_SA_Approval/21_cr_sa_calc_tm.png'}]
shots(p, ['20_cr_sa_tm_column.png', '21_cr_sa_calc_tm.png'])
save(p, s, '0.6', f'Eligibility clarified: Daily status {FIN} is set only by the VPLD TM acceptance (orders {WAIT} are not listed); TM Accepted column in the list and Finish Scan / TM Accepted By / Date in the Calculation Detail (DCR-44); SA-V01 text. Changed parts marked [CR].')

# ======================================================================= Download Daily Order Monitoring (report)
p, s = load('UISS_Report_Download_Daily_Order_Monitoring')
O = s['operation']
O[2]['items'][0] = 'Header filters: Date From, Date To, From Loc., To Loc., [CR] Order Status.'
f = O[find(O, lambda o: o.get('marker') == 'b.' and o.get('text', '').startswith('Filter: Order Date'))]
f['text'] += f' [CR] Order Status = selected status (if not All; also set by the [Waiting TM Acceptance (n)] counter).'
O.insert(O.index(f) + 1, {'type': 'item', 'marker': 'b2.', 'text': f'[CR] Order Status values include {WAIT} (between Start Daily Order and {FIN}). Finish Scan / Accepted By / Accepted Date columns of the screen are not exported (no layout change).', 'level': 2})
i = find(s['items'], lambda r: r.get('name') == 'DTP Type')
s['items'].insert(i + 1, item('Order Status', 'Screen criteria', 'Order Status', 'Varchar', '30', 'O', 'Label', 'Print criteria row "Order Status : <value>" (All when not selected). Inserted after DTP Type.', fmt='X..30..X'))
save(p, s, '0.5', f'Print criteria Order Status added (new screen filter); Order Status values include {WAIT}. Changed parts marked [CR].')

# ======================================================================= Driver Order Sync (batch)
p, s = load('UISS_Batch_Driver_Order_Sync')
t = s['func_desc'][find(s['func_desc'], lambda o: o.get('type') == 'table' and o['columns'][0]['title'] == 'Condition' and any('Finish Daily Order' in r[0] for r in o['rows']))]
r = t['rows'][find(t['rows'], lambda r: 'Finish Daily Order' in r[0])]
r[0] = f'Cycle Finish Cycle, or order [CR] {WAIT} / Finish Daily Order / SA'
s['func_desc'].insert(s['func_desc'].index(t) + 1, {'type': 'text', 'text': f'[CR] After the driver scans Finish Order the order is {WAIT} (VPLD TM acceptance on Daily Order Monitoring). For the APK this is a finished order: the card moves to history (HISTORY); the later TM acceptance ({FIN}) needs no new card.', 'level': 1})
save(p, s, '0.5', f'Order status {WAIT} (after Finish Order scan, before VPLD TM acceptance) handled as finished: HISTORY. Changed parts marked [CR].')
