"""Consistency fixes after CR Edit & Approve (check mock-up vs UISS, 17-Nov-26):
- Daily Order Monitoring 0.9: message no. 41 generic text (also Finish Order time), new message no. 44 (Remarks length), blank edit field = message no. 6.
- TC-PBR Menu & Authorization 0.3: role VPLD TM added to the access matrix / items (role was added by the CR but not documented).
- DTP Creation 1.0, Planning Truck Assignment 0.5: calendar 'Finish' wording clarified for orders Waiting TM Approval (no logic change).
Usage: python3 cr_tm_gaps_v09.py <repo>   (run once)"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uiss_paths import locate
R = sys.argv[1]
DATE, WHO, WAIT = '17-Nov-26', 'Susanto', 'Waiting TM Approval'


def edit(name, rev, desc, fn):
    p = locate(name, R); s = json.load(open(p['src']))
    assert s['revisions'][-1]['revision'] != rev, f'{name}: already applied'
    fn(s)
    s['revisions'].append({'revision': rev, 'author': WHO, 'date': DATE, 'reviewed_by': '', 'description': desc})
    s['header']['updated_date'], s['header']['updated_by'] = DATE, WHO
    json.dump(s, open(p['src'], 'w'), indent=1, ensure_ascii=False); print('patched', name, rev)


def daily(s):
    msgs = [m for m in s['display_messages'] if 'event' in m]
    m41 = msgs[40]; assert 'must not be earlier than' in m41['message']
    m41['message'] = '{Time field} must not be earlier than {previous time field}. (e.g. "Pickup time of cycle 1 must not be earlier than Start Cycle time of cycle 1.", "Finish Order time must not be earlier than Finish Cycle time of cycle 3.")'
    s['display_messages'].append({'event': 'Edit form - click [Save]', 'cause': 'Remarks longer than 500 characters', 'type': 'Error', 'msg_id': 'TBD',
                                  'message': 'Remarks must be 500 characters or less.', 'action': 'Shorten the remarks'})
    for r in s['items']:
        n = r.get('name', '')
        if n == '[CR] Remarks': r['validation'] = 'Max 500 characters (msg 44)'
        if n in ('[CR] License Plate', '[CR] Driver', '[CR] Container No.', '[CR] Start Cycle', '[CR] Pickup', '[CR] Finish Cycle', '[CR] Finish Order time'):
            r['validation'] = 'Blank: msg 6. ' + r['validation']
    for o in s['operation']:
        if o.get('type') == 'bullets':
            o['items'] = [x.replace("'[Save]: check all fields at once (Item Desc validation): mandatory,", '').replace('[Save]: check all fields at once (Item Desc validation): mandatory, ',
                                                                                                                   '[Save]: check all fields at once (Item Desc validation): mandatory (message no. 6), ')
                          .replace('Remarks <= 500, Edit Reason', 'Remarks <= 500 (message no. 44), Edit Reason') if isinstance(x, str) else x for x in o['items']]
        if o.get('type') == 'table' and o['columns'][0]['title'] == 'Field':
            for row in o['rows']:
                if row[0] == 'Remarks': row[2] = 'Optional note of TM, max 500 characters (ORDER_CYCLE.FINISH_REMARKS, message no. 44).'


def menu(s):
    t = next(o for o in s['operation'] if o.get('rows') and o['columns'][0]['title'] == 'Function')
    i = next(k for k, c in enumerate(t['columns']) if c['title'] == 'System')
    t['columns'].insert(i, {'title': '[CR] VPLD TM', 'width': 3})
    ACC = {'Daily Monitoring': 'X', 'Planning Order (DTP Creation)': 'V', 'Planning Truck Assignment': 'V', 'SA Approval': '-', 'SA Monitoring': '-', 'Master (8 screens)': 'X',
           'PR Creation': '-', 'PR / PO Approval': '-', 'PR / PO Inquiry': '-'}
    for r in t['rows']: r.insert(i, ACC[r[0]])
    ev = {1: ('VPLD TM X (CR: Edit / Approve Finish Order only)', 'workflow.js ACTIONS.tmEdit / tmApprove'), 2: ('VPLD TM V', ''), 3: ('VPLD TM V', ''), 4: ('VPLD TM - (message no. 1)', ''),
          5: ('VPLD TM - (SA Monitoring not available)', ''), 6: ('VPLD TM X (no role check)', '')}
    k = 0
    for r in s['items']:
        if 'group' in r: continue
        k += 1
        if k in ev:
            r['description'] = r['description'].replace('. Evidence:', f', [CR] {ev[k][0]}. Evidence:', 1) + (f' [CR] {ev[k][1]}.' if ev[k][1] else '')
        if r.get('name') == 'Login sebagai (role selector)':
            r['description'] = r.get('description', '') + ' [CR] Option "VPLD TM - tm1 (Transportation Management)" (role VPLD_TM).'
    for o in s['operation']:
        if o.get('type') == 'bullets':
            o['items'] = [x.replace('Driver, VPLD Staff / SH,', 'Driver, [CR] VPLD TM, VPLD Staff / SH,') if isinstance(x, str) else x for x in o['items']]


def cal(row_text):
    def f(s):
        for o in s['operation']:
            for row in o.get('rows', []) or []:
                if isinstance(row, list) and len(row) > 1 and row[1] == row_text:
                    row[1] = row_text + f' ([CR] an order {WAIT} - finished by the driver, not yet approved by VPLD TM - is not finished: the entry stays Assigned until the approval)'
                    return
        raise SystemExit('calendar row not found')
    return f


edit('UISS_Screen_Daily_Order_Monitoring', '0.9', '[CR] Consistency with the mock-up: message no. 41 generic text (also used for Finish Order time); new message no. 44 Remarks length; '
     'blank editable field = message no. 6 (Item Desc validation, 5.6.7, table 5.6.8).', daily)
edit('UISS_Screen_TCPBR_Menu_Authorization', '0.3', '[CR] Role VPLD TM (CR Edit & Approve Finish Order, 16-Nov-26) added: access matrix 5.1 (Daily Monitoring X, Planning Order V, '
     'Truck Assignment V, Master X, other menus -), Item Desc evidence and role selector; USERID_CLASS of VPLD TM TBD.', menu)
edit('UISS_Screen_DTP_Creation', '1.0', f'[CR] Calendar legend Order Finish: orders {WAIT} (CR Edit & Approve, Daily Order Monitoring) count as not finished until VPLD TM approval; no logic change.', cal('All orders Finish / SA Approved / SA Approved with PO'))
edit('UISS_Screen_Planning_Truck_Assignment', '0.5', f'[CR] Calendar legend Finish: orders {WAIT} (CR Edit & Approve, Daily Order Monitoring) count as not finished until VPLD TM approval; no logic change.', cal('All Finish / SA / PO'))
