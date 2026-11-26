"""Revision 26-Nov-26 (user review of PR Creation): UISS_Screen_PR_Creation 0.5, UISS_Screen_PR_Approval 0.5, UISS_Screen_PR_Inquiry 0.5.
Removes PR Creation Type / Logistics Partner / System Master from the screen, renames the buttons (Generate Route Plan -> Create PR,
Create PR -> Submit PR), bundle approval (one PR Sequence per operational month, approved / rejected together), new List Summary
columns and read-only detail pop-up. Usage: python3 pr_creation_review_v05.py <repo> <screenshot dir>   (run once)"""
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uiss_paths import locate
R, SHOTS = sys.argv[1], sys.argv[2]
DATE, WHO = '26-Nov-26', 'Susanto'
REV = ('Revise PR Creation based on user review: remove PR Creation Type / Logistics Partner / System Master, rename buttons, '
       'bundle approval, column & detail pop-up changes')
OPS = [  # new open points (OP-11..OP-16; OP-01..OP-10 are the earlier ones)
    ('OP-11', 'Without PR Creation Type: does one Submit PR create the Fixed Cost and the Route-Based PR together, or is the Fixed Cost no longer created by this screen?',
     'The screen creates the route-based PR only; Fixed Cost is not created here (TBD where). The list shows the trucking companies paid By Resources (Master KPI).'),
    ('OP-12', 'Definition of the abnormality that fills the Status column and its text. Are "Created {PR No}" / "already in an earlier PR" still shown?',
     'Abnormality = missing TMMIN Calendar, Route Percentage, Order Sharing (or 0), Price per KM, or amount <= 0 (message text). "Created" is not shown; grey "Already in PR {PR No}" is kept.'),
    ('OP-13', 'Submit PR when one trucking company is abnormal: block the whole bundle or not?', 'Blocked: Submit PR is disabled (message no. 15) until every abnormality is corrected.'),
    ('OP-14', 'Total Cost per route: Planned Cost x Number of Orders, or Planned Cost only?',
     'Planned Cost x Number of Orders, with Number of Orders per day (Order Sharing x Route % / total active Route %), so that the sum is the Delivery Cost (IDR/Day).'),
    ('OP-15', 'Reject / Return of a bundle: where do the trucking companies go back to, and does the next Submit PR use a new PR Sequence?',
     'A reject at any level rejects every PR of the bundle and returns them to PR Creation; the next Submit PR uses a new sequence (numbers are never reused). A PO rejected by GA still returns its own PR only.'),
    ('OP-16', 'Is the Fixed Cost still shown in the List Summary, now that the Monthly Delivery Cost does not add it?', 'Shown as information only (column can be hidden with Column).'),
]


def load(name):
    p = locate(name, R)
    return p, json.load(open(p['src']))


def save(p, s, rev, desc):
    assert s['revisions'][-1]['revision'] != rev, f"{p['src']}: already applied"
    s['revisions'].append({'revision': rev, 'author': WHO, 'date': DATE, 'reviewed_by': '', 'description': desc})
    s['header']['updated_date'], s['header']['updated_by'] = DATE, WHO
    json.dump(s, open(p['src'], 'w'), indent=1, ensure_ascii=False)
    print('patched', os.path.basename(p['src']), rev)


def item(name, desc, source='', field='', typ='', ln='', io='O', control='Label', initial='', req='N', fmt='', val='', just='Left'):
    return {'name': name, 'source': source, 'field': field, 'type': typ, 'len': ln, 'io': io, 'control': control, 'justified': just,
            'initial': initial, 'required': req, 'format': fmt, 'validation': val, 'description': desc}


def M(event, cause, typ, msg, action, mid='TBD'):
    return {'event': event, 'cause': cause, 'type': typ, 'msg_id': mid, 'message': msg, 'action': action}


def find(lst, pred):
    return next(x for x in lst if pred(x))


# ============================================================================================ PR Creation
p, s = load('UISS_Screen_PR_Creation')
old = {r['name']: r for r in s['items'] if 'name' in r}


def reuse(name, newname=None, desc=None, **kw):
    r = dict(old[name]); r['name'] = newname or name
    if desc is not None:
        db = r['description'].split('\nDB:', 1)
        r['description'] = desc + ('\nDB:' + db[1] if len(db) > 1 else '')
    r.update(kw); return r


g = s['general']
g['objective'] = [
    'To calculate, per operational month, the route-based PR of every trucking company paid By Resources (Master KPI) from Master Route Percentage, the E-Catalogue Price per KM and the TMMIN Calendar ([Create PR]).',
    'To submit all trucking companies of the operational month as one approval bundle with one PR Sequence ([Submit PR]); the bundle is approved / rejected together in PR Approval (no partial approval).',
    'To show the abnormalities of each trucking company (missing data / price, validation errors) in the Status column and block the submission until they are corrected.',
]
B = ['Operational Month', 'Create PR', 'Submit PR', 'Export', 'Cancel', 'Search / Column', 'Detail', 'x (Detail pop-up)']
g['buttons'] = [{'name': n, 'function': f} for n, f in zip(B, [
    'Parameter of the PR (the only one): operational month of the bundle.',
    'To calculate the List Summary of all trucking companies (formerly Generate Route Plan).',
    'To send the bundle of all trucking companies to approval after confirmation (formerly Create PR).',
    'To export the List Summary or the Route Plan Detail to Excel.',
    'Clear the Operational Month and the list.',
    'To filter rows by trucking company and to show / hide columns.',
    'To open the read-only PR Detail pop-up (routes of Master Route Percentage).',
    'To close the PR Detail pop-up (no other button in the pop-up).'])]


def mode(name, desc, on):
    return {'mode': name, 'sections': [{'section': 'Header / Parameters / List Summary', 'description': desc, 'buttons': {b: ('E' if b in on else 'D') for b in B}}]}


g['screen_modes'] = [
    mode('Initial (authorized user)', 'Operational Month = month + 1; list calculated on open', ['Operational Month', 'Create PR', 'Export', 'Cancel', 'Search / Column', 'Detail', 'Submit PR']),
    mode('Calculated - abnormality or period not allowed', 'Status shows the abnormality; refer below 2)', ['Operational Month', 'Create PR', 'Export', 'Cancel', 'Search / Column', 'Detail']),
    mode('View only (other users)', 'message no. 14; Submit PR disabled', ['Operational Month', 'Create PR', 'Export', 'Cancel', 'Search / Column', 'Detail']),
    mode('Calculating / Submitting', 'loading indicator', []),
    mode('PR Detail pop-up (read only)', 'route table only', ['x (Detail pop-up)']),
]
g['screen_mode_remarks'] = ['1) Users not in the authorization configuration (PC-02) see message no. 14; Submit PR is disabled.',
                            '2) Submit PR is enabled only after Create PR, with a valid creation period, no abnormality in any trucking company and at least one trucking company with new routes (PC-12).',
                            '3) There is no row selection: all trucking companies of the operational month form one bundle.']
g['display_order'] = [{'section': 'List Summary', 'fields': [{'field': 'Trucking Company code', 'order': 'Ascending'}]},
                      {'section': 'PR Detail Pop-up', 'fields': [{'field': 'Master Route Percentage list order', 'order': 'Ascending'}]}]

s['screen_flow'] = [
    {'title': 'Screen Flow for PR Creation', 'flow': {'direction': 'LR', 'nodes': [
        {'id': 'ec', 'label': 'ielp.MS_ROUTE_PRICE', 'type': 'db'}, {'id': 'rp', 'label': 'ielp.MS_ROUTE_HEADER', 'type': 'db'},
        {'id': 'kp', 'label': 'ielp.MS_KPI', 'type': 'db'}, {'id': 'cal', 'label': 'ielp.TB_M_WORKING_CALENDAR', 'type': 'db'},
        {'id': 's', 'label': 'PR Creation - List Summary', 'type': 'screen', 'screen_id': 'TBD'}, {'id': 'd', 'label': 'PR Detail pop-up (read only)', 'type': 'screen'},
        {'id': 'a', 'label': 'PR Approval - bundle (SH / DpH / DH)', 'type': 'screen'}, {'id': 'po', 'label': 'PO per trucking company -> daily order / SA', 'type': 'process'}],
        'edges': [{'from': 'ec', 'to': 's'}, {'from': 'rp', 'to': 's'}, {'from': 'kp', 'to': 's'}, {'from': 'cal', 'to': 's'},
                  {'from': 's', 'to': 'd', 'label': 'Detail'}, {'from': 'd', 'to': 's', 'label': 'x'},
                  {'from': 's', 'to': 'a', 'label': 'Submit PR (bundle)'}, {'from': 'a', 'to': 's', 'label': 'Reject (whole bundle)'}, {'from': 'a', 'to': 'po', 'label': 'DH approve'}]}},
    {'title': 'Screen Flow for Create PR (calculate)', 'flow': {'direction': 'TB', 'nodes': [
        {'id': 'st', 'label': 'START', 'type': 'start'}, {'id': 'c', 'label': 'On Click of Create PR', 'type': 'process'},
        {'id': 'm', 'label': 'Operational Month filled?', 'type': 'decision'}, {'id': 'e1', 'label': 'Show message no. 1', 'type': 'message'},
        {'id': 'p', 'label': 'Check creation period (5.1)', 'type': 'process'}, {'id': 'calc', 'label': 'Per trucking company: prices, working days, Order Sharing, route detail (5.3)', 'type': 'process'},
        {'id': 'ab', 'label': 'Abnormality -> Status (5.4)', 'type': 'process'}, {'id': 'b', 'label': 'Bundle sequence, new routes, total (5.5)', 'type': 'process'},
        {'id': 'l', 'label': 'Show List Summary, message no. 13', 'type': 'message'}, {'id': 'en', 'label': 'END', 'type': 'end'}],
        'edges': [{'from': 'st', 'to': 'c'}, {'from': 'c', 'to': 'm'}, {'from': 'm', 'to': 'e1', 'label': 'No'}, {'from': 'm', 'to': 'p', 'label': 'Yes'},
                  {'from': 'p', 'to': 'calc'}, {'from': 'calc', 'to': 'ab'}, {'from': 'ab', 'to': 'b'}, {'from': 'b', 'to': 'l'}, {'from': 'l', 'to': 'en'}, {'from': 'e1', 'to': 'en'}]}},
    {'title': 'Screen Flow for Creation Period', 'flow': {'direction': 'TB', 'nodes': [
        {'id': 'm', 'label': 'Operational Month', 'type': 'start'}, {'id': 'n1', 'label': 'Month = N+1?', 'type': 'decision'}, {'id': 'ok', 'label': 'Allowed (Month N-1 rule)', 'type': 'process'},
        {'id': 'n', 'label': 'Month = N (current)?', 'type': 'decision'}, {'id': 'e45', 'label': 'Show message no. 4 / 5', 'type': 'message'},
        {'id': 'pc', 'label': 'System Master parameter configured? (read in the background)', 'type': 'decision'}, {'id': 'e2', 'label': 'Show message no. 2', 'type': 'message'},
        {'id': 'pa', 'label': 'Parameter = allowed?', 'type': 'decision'}, {'id': 'e3', 'label': 'Show message no. 3', 'type': 'message'}, {'id': 'ok2', 'label': 'Allowed (Month N)', 'type': 'process'}],
        'edges': [{'from': 'm', 'to': 'n1'}, {'from': 'n1', 'to': 'ok', 'label': 'Yes'}, {'from': 'n1', 'to': 'n', 'label': 'No'}, {'from': 'n', 'to': 'e45', 'label': 'No'},
                  {'from': 'n', 'to': 'pc', 'label': 'Yes'}, {'from': 'pc', 'to': 'e2', 'label': 'No'}, {'from': 'pc', 'to': 'pa', 'label': 'Yes'},
                  {'from': 'pa', 'to': 'e3', 'label': 'No'}, {'from': 'pa', 'to': 'ok2', 'label': 'Yes'}]}},
    {'title': 'Screen Flow for Submit PR (bundle)', 'flow': {'direction': 'TB', 'nodes': [
        {'id': 'st', 'label': 'START', 'type': 'start'}, {'id': 'c', 'label': 'On Click of Submit PR', 'type': 'process'},
        {'id': 'au', 'label': 'Authorized and Create PR done?', 'type': 'decision'}, {'id': 'e1', 'label': 'Show message no. 14 / 20', 'type': 'message'},
        {'id': 'ab', 'label': 'Any abnormality / no new route?', 'type': 'decision'}, {'id': 'e2', 'label': 'Show message no. 15 / 16', 'type': 'message'},
        {'id': 'cf', 'label': 'Confirmation message no. 17', 'type': 'message'}, {'id': 'rc', 'label': 'Recalculate bundle; re-check sequence and abnormality (PC-11)', 'type': 'process'},
        {'id': 'ch', 'label': 'Changed?', 'type': 'decision'}, {'id': 'e3', 'label': 'Rollback, message no. 18 / 15', 'type': 'message'},
        {'id': 'ins', 'label': 'Insert bundle header, PR per trucking company, routes, approval, history (Data Map)', 'type': 'process'},
        {'id': 'ok', 'label': 'Message no. 19; bundle in PR Approval', 'type': 'message'}, {'id': 'en', 'label': 'END', 'type': 'end'}],
        'edges': [{'from': 'st', 'to': 'c'}, {'from': 'c', 'to': 'au'}, {'from': 'au', 'to': 'e1', 'label': 'No'}, {'from': 'au', 'to': 'ab', 'label': 'Yes'},
                  {'from': 'ab', 'to': 'e2', 'label': 'Yes'}, {'from': 'ab', 'to': 'cf', 'label': 'No'}, {'from': 'cf', 'to': 'rc', 'label': 'Submit PR'},
                  {'from': 'rc', 'to': 'ch'}, {'from': 'ch', 'to': 'e3', 'label': 'Yes'}, {'from': 'ch', 'to': 'ins', 'label': 'No'}, {'from': 'ins', 'to': 'ok'}, {'from': 'ok', 'to': 'en'}]}},
]

IMG = 'img/UISS_Screen_PR_Creation/'
LAY = [('ref_summary.png', '1. PR Creation - List Summary - reference screen from user (before the revision of 26-Nov-26)'),
       ('ref_detail.png', '2. PR detail (routes) - reference screen from user (before the revision of 26-Nov-26)'),
       ('c01_ip_view_only.png', '3. View only - IELP Admin: Submit PR disabled (HTML mock-up)'),
       ('c02_staff_list.png', '4. VPLD Staff after Create PR: all trucking companies, PR Sequence of the bundle, Total PR Cost (bundle) (HTML mock-up)'),
       ('c03_detail.png', '5. PR Detail pop-up - read only, routes of Master Route Percentage, Total Cost row, close with x (HTML mock-up)'),
       ('c04_submit_confirm.png', '6. Submit PR confirmation - one bundle (HTML mock-up)'),
       ('c05_loading.png', '7. Submitting - loading indicator (HTML mock-up)'),
       ('c06_submitted.png', '8. Bundle submitted: trucking companies show "Already in PR" (HTML mock-up)'),
       ('c07_abnormal_blocked.png', '9. Abnormality (Price per KM missing for GIB): Status filled, Submit PR blocked (HTML mock-up)'),
       ('c08_mandatory.png', '10. Validation - Operational Month mandatory (HTML mock-up)'),
       ('c11_inquiry_detail.png', '11. Submitted PR in PR Inquiry - detail with bundle (HTML mock-up)')]
s['screen_layout'] = [{'caption': c, 'image': IMG + f} for f, c in LAY]
d = os.path.join(p['src_dir'], 'img', 'UISS_Screen_PR_Creation')
for f in os.listdir(d):
    if f.startswith('c') and f not in {x for x, _ in LAY}: os.remove(os.path.join(d, f))
for f, _ in LAY:
    if f.startswith('c'): shutil.copyfile(os.path.join(SHOTS, f), os.path.join(d, f))

s['items'] = [
    {'group': '<Header Section>'},
    reuse('Page title'),
    item('Create PR', 'Formerly Generate Route Plan. Validate the Operational Month (msg 1) and the creation period (5.1), then calculate the List Summary of all trucking companies (5.2-5.5). Loading indicator while calculating.', control='Button'),
    item('Submit PR', 'Formerly Create PR. Enabled for authorized users after Create PR, with a valid period, no abnormality and at least one trucking company with new routes (msg 14 / 15 / 16 / 20). Opens the confirmation (5.6).', control='Button'),
    reuse('Export'),
    {'group': '<Parameter Section>'},
    reuse('Operational Month', desc='The only parameter (PR Creation Type, Logistics Partner and the System Master parameter are not on the screen). Default = system month + 1 (PR created in Month N-1).', required='Y', val='Mandatory (msg 1); creation period (5.1)'),
    item('PR Sequence', "Read only: 'Sequence n - initial / additional bundle (all trucking companies)'. Next sequence of the operational month (5.5), the same for every trucking company.", source='--', field='--'),
    item('Info chips', 'Creation period result; TMMIN Calendar working days; Route Percentage (active routes, total %); Total By Resource (Master KPI). The System Master parameter is read in the background and not shown (PC-03).', source='--', field='--'),
    item('Alert', 'View-only notice for unauthorized users (msg 14); creation period error (msg 2-5); abnormality (msg 15).', source='--', field='--'),
    reuse('Cancel', desc='Clear the Operational Month and the list.'),
    {'group': '<List Summary Section>'},
    reuse('Search trucking company'), reuse('Column'), reuse('No.'),
    reuse('Trucking Company', desc='All trucking companies paid By Resources (Master KPI), always all of them (no Logistics Partner filter, OP-11).'),
    reuse('Mileage Cost (IDR/Km)', desc="Price per KM of the trucking company and period (E-Catalogue); '-' if not available (abnormality, tooltip = reason)."),
    reuse('Fixed Cost (IDR/Month)', desc='Monthly Price of the trucking company and period: information only, not part of the Monthly Delivery Cost (OP-16).'),
    reuse('Working Days (Days)', desc='Working days of the operational month (TMMIN Calendar; per LP TBD, OP-02).'),
    item('Delivery Cost (IDR/Day)', 'Σ Total Cost of the detail pop-up of the trucking company (5.3).', source='--', field='--', typ='Number', fmt='999,999,999', just='Right'),
    item('Monthly Delivery Cost (IDR)', 'Delivery Cost (IDR/Day) × Working Days (5.3); PR amount of the trucking company. Replaces "Fixed Cost + Σ Planned Cost". The PR Amount column was removed.', source='--', field='--', typ='Number', fmt='999,999,999', just='Right'),
    item('Status', "Empty when there is no abnormality. Abnormality message in red (msg 6-11, 5.4); grey 'Already in PR {PR No}' when all routes are in an active PR (msg 12, OP-12). 'Ready' and 'Created' are not shown any more.", source='--', field='--'),
    reuse('Detail', desc='Opens the read-only PR Detail pop-up (5.7).'),
    item('Total row', 'Σ Fixed Cost, Σ Delivery Cost (IDR/Day), Σ Monthly Delivery Cost.', source='--', field='--', just='Right'),
    reuse('Paging info / pager'),
    item('Total PR Cost (bundle)', "'Total PR Cost (bundle, n trucking companies): IDR x' = Σ amount of the trucking companies in the bundle (new routes). Replaces 'Total PR Cost (selected n)'; there is no row selection.", source='--', field='--', just='Right'),
    {'group': '<PR Detail Pop-up (read only)>'},
    item('Title / Close (x)', "'PR Detail - {code} - {name}'; closed only with x at the top right (no header information, no Close / Confirm & Create PR buttons).", source='--', field='--'),
    reuse('Route', desc='Active routes of Master Route Percentage (status Active, % > 0). Sticky header; scrolls.'),
    reuse('Route Percentage'),
    item('Number of Orders', 'Orders per day of the route = Order Sharing (Master KPI) × Route % ÷ Σ active Route % (2 decimals, 5.3).\nDB: ielp.CRITERIA_SCORE_DETAIL_ROUTE.TOTAL_ORDER_SHARING float NULL - TBD - Not confirmed from existing schema/data/code', source='Calculation', field='--', typ='Number', fmt='9,999.99', just='Right'),
    reuse('Distance (Km)'),
    item('Planned Cost (IDR)', 'Distance (Km) × Mileage Cost (IDR/Km). Replaces "Orders × Distance × Mileage Cost".', source='Calculation', field='--', typ='Number', fmt='999,999,999', just='Right'),
    item('Total Cost (row)', 'Σ (Planned Cost × Number of Orders) of the routes = Delivery Cost (IDR/Day) of the List Summary (OP-14).\nDB: ielp.CRITERIA_SCORE_DETAIL_ROUTE.TOTAL_PRICE_ALL float NULL (per route) - TBD - Not confirmed from existing schema/data/code', source='Calculation', field='--', typ='Number', fmt='999,999,999', just='Right'),
]

DMB = s['data_map']['blocks']
hist = DMB[3]
hist['destination']['description'] = '[Submit PR] - per PR of the bundle'
for m in hist['mappings']:
    if m['dest_field'] == 'ACTION (TBD)': m['description'] = "'Submit PR' (note: bundle {YYYY-MM} sequence {n}, {m} PR)"
s['data_map']['blocks'] = [
    {'source': 'Screen / calculation', 'destination': {'table': 'ielp.CRITERIA_SCORE_HEADER', 'operation': 'Insert', 'description': '[Submit PR] - one per bundle', 'keys': []},
     'mappings': [{'dest_field': 'CRITERIA_HEADER_ID', 'description': 'Next id - TBD - Not confirmed from existing schema/data/code'},
                  {'source_field': 'Operational Month', 'dest_field': 'CRITERIA_PERIODE', 'description': 'YYYY-MM'},
                  {'dest_field': 'PR_SEQ', 'description': 'Bundle sequence = MAX(PR_SEQ) of the operational month + 1 (PC-07), the same for every trucking company'},
                  {'dest_field': 'BUSINESS_TYPE', 'description': 'Route-based code - TBD - Not confirmed from existing schema/data/code'},
                  {'dest_field': 'APPROVAL_STS', 'description': 'Waiting first level (SH, or DpH when submitted by SH) - code TBD (DCR-34)'},
                  {'dest_field': 'CREATED_BY / CREATED_DATE', 'description': 'Login user / system date'}]},
    {'source': 'Screen / calculation', 'destination': {'table': 'ielp.CRITERIA_SCORE_DETAIL_FINAL', 'operation': 'Insert', 'description': '[Submit PR] - per trucking company of the bundle', 'keys': []},
     'mappings': [{'dest_field': 'CRITERIA_DETAIL_FINAL_ID', 'description': 'Next id - TBD'}, {'dest_field': 'CRITERIA_HEADER_ID', 'description': 'Bundle header'},
                  {'source_field': 'Trucking Company', 'dest_field': 'COMPANY_ID', 'description': 'Trucking company'},
                  {'dest_field': 'PR_NO_DET', 'description': '{LP}{YY}{MM}{running no. per month}'},
                  {'dest_field': 'TOTAL_ORDER_SHARING', 'description': 'Order Sharing (orders per day, Master KPI)'},
                  {'dest_field': 'TOTAL_TRIP', 'description': 'Σ Number of Orders of the new routes × Working Days (rounded)'},
                  {'source_field': 'Monthly Delivery Cost', 'dest_field': 'TOTAL_PRICE', 'description': 'Σ Total Cost of the new routes × Working Days (= Monthly Delivery Cost for the first bundle)'},
                  {'dest_field': 'APPROVAL_STS', 'description': 'As the bundle header'}, {'dest_field': 'CREATED_BY / CREATED_DATE', 'description': 'Login user / system date'}]},
    {'source': 'Detail pop-up (Master Route Percentage)', 'destination': {'table': 'ielp.CRITERIA_SCORE_DETAIL_ROUTE', 'operation': 'Insert', 'description': '[Submit PR] - per new route of the trucking company', 'keys': []},
     'mappings': [{'dest_field': 'CRITERIA_DETAIL_ROUTE_ID', 'description': 'Next id - TBD'}, {'dest_field': 'CRITERIA_HEADER_ID / COMPANY_ID', 'description': 'Bundle header / trucking company'},
                  {'source_field': 'Route', 'dest_field': 'ROUTE_HEADER_ID', 'description': 'Route of Master Route Percentage'},
                  {'source_field': 'Route Percentage', 'dest_field': 'ROUTE_PERCENTAGE_VALUE', 'description': 'Route %'},
                  {'source_field': 'Number of Orders', 'dest_field': 'TOTAL_ORDER_SHARING', 'description': 'Orders per day of the route - TBD (column meaning not confirmed)'},
                  {'dest_field': 'ROUTE_QTY', 'description': 'Number of Orders × Working Days (rounded) - TBD'},
                  {'source_field': 'Distance / Planned Cost', 'dest_field': 'distance, planned cost (no column - TBD)', 'description': 'Existing logic kept (DCR, see Database Specification)'},
                  {'source_field': 'Total Cost', 'dest_field': 'TOTAL_PRICE_ALL', 'description': 'Planned Cost × Number of Orders (IDR/Day) - TBD'}]},
    {'source': 'Workflow configuration', 'destination': {'table': 'ielp.CRITERIA_SCORE_APPROVAL', 'operation': 'Insert', 'description': '[Submit PR] - per level for the bundle', 'keys': []},
     'mappings': [{'dest_field': 'CRITERIA_APPROVAL_ID', 'description': 'Next id - TBD'}, {'dest_field': 'CRITERIA_HEADER_ID', 'description': 'Bundle header (approval per bundle, PC-10)'},
                  {'dest_field': 'CRITERIA_DETAIL_FINAL_ID', 'description': 'One row per trucking company, or empty for the bundle - TBD - Not confirmed from existing schema/data/code'},
                  {'dest_field': 'CRITERIA_PERIODE', 'description': 'Operational Month'}, {'dest_field': 'APPROVAL_CLASS', 'description': 'SH / DpH / DH (DCR-34)'},
                  {'dest_field': 'APPROVAL_STS', 'description': 'Pending; Skip up to the submitter level (PC-10)'}]},
    hist,
]

O = s['operation']
dbspec = O[O.index(find(O, lambda o: o.get('type') == 'page_break')):]
for o in dbspec:
    if o.get('type') == 'table' and o.get('columns', [{}])[0].get('title') == 'UI field / element':
        o['rows'] = [r for r in o['rows'] if r[0] not in ('PR Creation Type', 'Fixed cost (by resource) lines')]
        o['rows'] += [['PR bundle (Operational Month + PR Sequence)', 'ielp.CRITERIA_SCORE_HEADER.CRITERIA_PERIODE / PR_SEQ / APPROVAL_STS', 'varchar(7) / int / varchar(2)', 'N', 'W', 'one header per bundle', 'Verified'],
                      ['Number of Orders (per day)', 'ielp.CRITERIA_SCORE_DETAIL_ROUTE.TOTAL_ORDER_SHARING', 'float', 'N', 'W', 'meaning TBD', 'TBD'],
                      ['Monthly Delivery Cost (PR amount)', 'ielp.CRITERIA_SCORE_DETAIL_FINAL.TOTAL_PRICE', 'float', 'N', 'W', '-', 'Revised']]
    if o.get('type') == 'bullets' and any(str(x).startswith('G-MO-01') for x in o.get('items', [])):
        o['items'] = [x for x in o['items'] if not str(x).startswith('G-PRC-01')] + [
            'G-MO-01 (revision 26-Nov-26): one PR bundle per Submit PR = one ielp.CRITERIA_SCORE_HEADER row (CRITERIA_PERIODE + PR_SEQ), one CRITERIA_SCORE_DETAIL_FINAL row (PR_NO_DET) per trucking company. No DB change.',
            'G-PRC-01 (revision 26-Nov-26): the Fixed Cost PR is no longer created by this screen (OP-11); route-based PR only.']
    if o.get('type') == 'bullets' and 'Sequence of PR numbers (PR_NO vc11, PR_SEQ)' in o.get('items', []):
        o['items'] += ['Approval rows per bundle or per trucking company (CRITERIA_SCORE_APPROVAL.CRITERIA_DETAIL_FINAL_ID)', 'Meaning of CRITERIA_SCORE_DETAIL_ROUTE.TOTAL_ORDER_SHARING / TOTAL_PRICE_ALL for orders per day / Total Cost']

H = lambda t: {'type': 'heading', 'text': t, 'level': 0}
I = lambda mk, t: {'type': 'item', 'marker': mk, 'text': t, 'level': 2}
s['operation'] = [
    H('5.1 Initial Display and Creation Period (PC-01 to PC-03)'),
    I('a.', 'Parameters: Operational Month only (mandatory, PC-01; message no. 1). Default = system month + 1; the List Summary of all trucking companies is calculated on open. PR Creation Type, Logistics Partner and the System Master setting are not on the screen.'),
    I('b.', 'Authorization configuration: VPLD Staff and VPLD Section Head may submit PR; other users get view only (message no. 14).'),
    I('c.', 'Period: Month N+1 allowed (created in N-1). Month N only when the System Master parameter (read in the background) = allowed (not configured: no. 2; not allowed: no. 3). Past: no. 4; after N+1: no. 5 (TBD, OP-04).'),
    H('5.2 Data Sources'),
    {'type': 'table', 'columns': [{'title': 'Data', 'width': 14}, {'title': 'Source', 'width': 18}, {'title': 'Rule', 'width': 24}], 'level': 2, 'row_lines': 'all', 'rows': [
        ['Mileage Cost', 'E-Catalogue (Master Price) KM', 'priceForPR: covers the month, not expired, unique; IDR / Km'],
        ['Fixed Cost', 'E-Catalogue (Master Price) FIX', 'Same lookup; information only (OP-16)'],
        ['Working Days', 'TMMIN Calendar', 'Per operational month (per LP TBD, OP-02)'],
        ['Order Sharing', 'Master KPI (By Resources)', 'Orders per day per trucking company; defines the list (OP-11)'],
        ['Routes', 'Master Route Percentage', 'Active routes, % > 0, distance Km']]},
    H('5.3 Calculation (revision 26-Nov-26)'),
    {'type': 'bullets', 'marker': '1.', 'level': 3, 'items': [
        'Number of Orders (route, per day) = Order Sharing × Route % ÷ Σ active Route % (2 decimals). Total below 100%: split proportionally (TBD, OP-07).',
        'Planned Cost (route) = Distance (Km) × Mileage Cost (IDR/Km).',
        'Total Cost (route) = Planned Cost × Number of Orders (TBD, OP-14); the pop-up shows the sum in the Total Cost row.',
        'Delivery Cost (IDR/Day) = Σ Total Cost of the routes.',
        'Monthly Delivery Cost (IDR) = Delivery Cost (IDR/Day) × Working Days = PR amount of the trucking company (Fixed Cost not added, OP-16).',
        'Example DNX, December 2026: 4 orders/day; route DPCMR_CYKRW 15% of 95% -> 0.63 orders; Planned Cost 57 × 2,700 = 153,900; Total Cost 96,957. Delivery Cost 432,405 / day × 22 = 9,512,910.']},
    H('5.4 Status - Abnormality (PC-04, PC-05, PC-09)'),
    I('a.', 'The Status column shows only an abnormality of the detail (red): TMMIN Calendar missing (no. 6), no active Route Percentage (no. 7), no Order Sharing (no. 8) or Order Sharing = 0 (no. 9), Price per KM missing / expired / duplicated (no. 10), amount <= 0 (no. 11). Definition TBD (OP-12).'),
    I('b.', "No abnormality: Status empty ('Ready' removed). All routes already in an active PR of the month: grey 'Already in PR {PR No}' (no. 12, OP-12); the trucking company is not in the new bundle. 'Created {PR No}' is not shown."),
    H('5.5 PR Sequence and Bundle (PC-06 to PC-08)'),
    I('a.', 'PR Sequence = MAX(PR_SEQ) of the operational month (all trucking companies, all statuses) + 1; the same sequence for every trucking company of the bundle; numbers are never reused. Each trucking company keeps its own PR number; sequence > 1 keeps the link to its first PR.'),
    I('b.', 'Components = one per route (ROUTE:{code}). Routes in PRs of the trucking company and month whose status is not Rejected / Returned are not created again; an additional bundle contains only the new routes.'),
    {'type': 'table', 'columns': [{'title': 'Seq', 'width': 5}, {'title': 'Bundle', 'width': 16}, {'title': 'Content', 'width': 28}], 'level': 2, 'row_lines': 'all', 'rows': [
        ['1', '12/2026-1 (5 PR)', 'Rejected by DpH -> whole bundle back to PR Creation (sample data)'],
        ['2', 'new', 'All routes of the 5 trucking companies; Submit PR'],
        ['-', 'after sequence 2', "All rows 'Already in PR'; Submit PR: message no. 16"],
        ['3', 'new route added', 'Only the new route for each trucking company']]},
    {'type': 'column_break'},
    H('5.6 Submit PR - bundle (PC-10 to PC-12)'),
    {'type': 'bullets', 'marker': '1.', 'level': 3, 'items': [
        'Submit PR: if not authorized message no. 14; before Create PR no. 20; any abnormality no. 15 (whole bundle blocked, OP-13); no trucking company with new routes no. 16.',
        'Confirmation no. 17: operational month, PR Sequence, one line per trucking company (routes, amount), Total PR Cost, approval path and Current PIC.',
        'Loading indicator; recalculate the bundle and re-check the sequence and the abnormalities in the same transaction (PC-11). Sequence taken meanwhile: no. 18; new abnormality: no. 15. Nothing is created (all-or-nothing, PC-12).',
        'Insert the bundle header, one PR per trucking company, the routes, the approval levels and the history (Data Map). Message no. 19; the list is recalculated.',
        'Approval levels from the workflow configuration; submitted by VPLD Staff: SH -> DpH -> DH; by VPLD Section Head: SH Skip (history note), starts at DpH. Current PIC = submitter.']},
    H('5.7 PR Detail Pop-up (read only)'),
    I('a.', 'No header information. Table: Route, Route Percentage, Number of Orders, Distance, Planned Cost, then the Total Cost row (= Delivery Cost IDR/Day). Data from Master Route Percentage. Sticky header / footer; scrolls.'),
    I('b.', 'Closed only with x at the top right; no Close / Confirm & Create PR buttons.'),
    H('5.8 Export'),
    I('a.', 'List Summary (.xls) and Route Plan Detail (.xls) of the filtered rows (no. 21); before Create PR: no. 20.'),
    H('5.9 After Submission'),
    I('a.', 'The PRs appear in PR Approval / PR Inquiry (Production Month MM/YYYY-seq, sub text "Bundle · n PR"). Approve / reject applies to the whole bundle (no partial approval); a reject returns every PR of the bundle (OP-15).'),
    I('b.', 'PO creation per trucking company and auto approval follow the existing workflow (monthly-pr-po-rules.md).'),
    H('5.10 Open Points of the revision 26-Nov-26 (default assumption used in this UISS)'),
    {'type': 'table', 'level': 2, 'row_lines': 'all', 'columns': [{'title': 'No', 'width': 5}, {'title': 'Open point', 'width': 22}, {'title': 'Default assumption', 'width': 21}], 'rows': [list(x) for x in OPS]},
] + dbspec

s['display_messages'] = [
    {'group': 'Create PR (calculate)'},
    M('Click [Create PR]', 'Operational Month blank (PC-01)', 'Error', 'Operational Month is required.', 'Select the Operational Month'),
    M('Create PR / Submit PR (Month N)', 'System Master parameter not configured (PC-03)', 'Error', 'System Master parameter "Allow PR creation in current operational month" is not configured. Please contact the system administrator.', 'Contact the system administrator'),
    M('Create PR / Submit PR (Month N)', 'Parameter = not allowed (PC-03)', 'Error', 'PR for the current operational month ({YYYY-MM}) cannot be created: not allowed by System Master. PR is created in Month N-1 for Month N.', 'Select the next month'),
    M('Create PR / Submit PR', 'Operational Month before current month (PC-03)', 'Error', 'Operational Month {YYYY-MM} has already passed. PR cannot be created.', 'Select the next month'),
    M('Create PR / Submit PR', 'Operational Month after N+1 (PC-03, TBD OP-04)', 'Error', 'PR for Operational Month {YYYY-MM} cannot be created yet. PR is created in Month N-1: the next operational month is {YYYY-MM}.', 'Select the next month'),
    M('Create PR (Status per trucking company)', 'No working days in TMMIN Calendar (PC-05)', 'Error', 'TMMIN Calendar (working days) for {YYYY-MM} is not available. Please maintain the TMMIN Calendar first.', 'Maintain the TMMIN Calendar'),
    M('Create PR (Status per trucking company)', 'No active Route Percentage (PC-05)', 'Error', 'No active Route Percentage data. Please maintain Master Route Percentage first.', 'Maintain Master Route Percentage'),
    M('Create PR (Status per trucking company)', 'No Order Sharing in Master KPI (PC-05)', 'Error', 'No Order Sharing for {LP} in Master KPI (By Resources). Route-based PR cannot be calculated.', 'Maintain Master KPI'),
    M('Create PR (Status per trucking company)', 'Order Sharing = 0', 'Error', 'No orders are planned for {LP} in this month (Order Sharing = 0).', 'Maintain Master KPI'),
    M('Create PR (Status per trucking company)', 'Price per KM missing / expired / duplicated (PC-04)', 'Error', 'No Price per KM found in Master Price for {LP} period {YYYYMM}. (or expired / more than one valid price)', 'Maintain Master Price'),
    M('Create PR (Status per trucking company)', 'Calculated amount <= 0 (PC-09)', 'Error', 'Calculated PR amount for {LP} is not valid (must be greater than 0). Please check the price and planning data.', 'Check price and planning data'),
    M('Create PR (Status per trucking company, grey)', 'All routes already in active PRs (PC-08, OP-12)', 'Info', 'All planned routes of {LP} for this operational month are already included in PR {PR Nos}.', '-'),
    M('Click [Create PR]', 'Calculation finished', 'Info', 'PR {Month YYYY} calculated for {n} trucking company(ies).', '-'),
    {'group': 'Submit PR'},
    M('Open screen / Click [Submit PR]', 'User is not VPLD Staff / VPLD Section Head (PC-02)', 'Error', 'You are not authorized to create PR. PR Creation is available to VPLD Staff and VPLD Section Head.', 'Login with an authorized user'),
    M('Click [Submit PR]', 'At least one trucking company has an abnormality (PC-12, OP-13)', 'Error', 'Submit PR is not possible: {n} trucking company(ies) have an abnormality (see Status). Please correct the data first.', 'Correct the master data, click Create PR'),
    M('Click [Submit PR]', 'No trucking company with new routes', 'Warning', 'There is no trucking company with new routes to submit for this operational month.', '-'),
    M('Click [Submit PR]', 'Confirmation (PC-10)', 'Confirmation', 'Submit PR - {Month} - PR Sequence {n}: one bundle of {n} PR (trucking company, routes, amount), Total PR Cost IDR {x}, Approval {path}, Current PIC {user}.', 'Submit PR / Batal'),
    M('Click [Submit PR] in confirmation', 'Sequence created by another user meanwhile (PC-11)', 'Error', 'PR Sequence {n} for {YYYY-MM} already exists. Please click Create PR again.', 'Click Create PR'),
    M('Click [Submit PR] in confirmation', 'Bundle saved', 'Info', 'PR bundle {YYYY-MM} sequence {n} submitted: {n} PR ({PR Nos}). Status: {Waiting SH | Waiting DpH}.', '-'),
    M('Click [Submit PR] / Export', 'Create PR not clicked yet', 'Warning', 'Click Create PR first.', 'Click Create PR'),
    {'group': 'Export'},
    M('Click Export > option', 'File generated', 'Info', 'PR_Creation_{Summary | Route_Plan}_{YYYYMM}.xls exported.', '-'),
    {'group': 'System Error'},
    M('Any server call', 'Unexpected DB / server error (transaction rolled back)', 'Error', 'System error. Please contact administrator. ({Error ID})', 'Contact the administrator'),
]
L = lambda e, c, t, m, a, x='N': {'event': e, 'cause': c, 'type': t, 'msg_id': 'TBD', 'message': m, 'exception': x, 'action': a}
s['logging_messages'] = [
    L('Create PR', 'Calculation finished', 'Info', 'PR {YYYY-MM} calculated by {User} for {n} trucking company(ies) (sequence {n}, {abnormal} abnormal).', 'Write log'),
    L('Submit PR', 'Bundle saved', 'Info', 'PR bundle {YYYY-MM} sequence {n} submitted by {User}: {n} PR ({PR Nos}), total {IDR}; approval starts at {level}.', 'Write log'),
    L('Submit PR', 'Submitted by Section Head', 'Info', 'PR bundle {YYYY-MM} sequence {n}: SH Skip, submitted by Section Head {User}.', 'Write log'),
    L('Submit PR', 'Abnormality / sequence taken', 'Warning', 'PR bundle {YYYY-MM} not submitted: {reason}.', 'Display message no. 15 / 18', 'Y'),
    L('Any', 'DB / server error', 'Error', 'PR Creation {operation} failed: {Exception}.', 'Rollback; display message no. 22', 'Y'),
]
save(p, s, '0.5', REV)

# ============================================================================================ PR Approval / PR Inquiry
DETAIL = [
    item('Route-based PR from PR Creation (bundle): columns', 'Route, Route Percentage, Number of Orders / Day, Distance (Km), Planned Cost (IDR) = Distance × Mileage Cost, Total Cost (IDR/Day) = Planned Cost × Number of Orders.', source='PR Creation', field='--'),
    item('Route-based PR from PR Creation (bundle): footer', "'Delivery Cost: IDR x / day × n working days', Total QTY, 'Total PR Cost (Monthly Delivery Cost)'. Info line: PR type, PR Sequence, 'Bundle MM/YYYY-n: {trucking companies} (approved / rejected together)', working days, next process.", source='PR Creation', field='--'),
]
for name, pref, extra in [('UISS_Screen_PR_Approval', 'pra', True), ('UISS_Screen_PR_Inquiry', 'pri', False)]:
    p, s = load(name)
    for r in s['items']:
        if r.get('name') == 'Production Month':
            r['description'] = r['description'].replace("'-n' = sequence of PR creation for the same production month.", "'-n' = PR Sequence of the operational month; PRs of one Submit PR (bundle) have the same sequence and the sub text 'Bundle · n PR' (PR Creation revision 26-Nov-26).")
        if extra and r.get('name') in ('Approve', 'Reject'):
            r['description'] += ' PR bundle: approve / reject applies to every PR of the bundle (msg 11).'
        if extra and r.get('name') == 'Select (row)':
            r['description'] = (r['description'] + ' ' if r['description'] else '') + 'Ticking a PR of a bundle ticks / unticks all PR of the same bundle (no partial approval).'
        if extra and r.get('name') in ('Approve (modal)', 'Reject (modal)'):
            r['description'] = r['description'].replace('this document only', 'this document - for a PR of a bundle: the whole bundle')
        if extra and r.get('name') == 'Selected PR list':
            r['description'] = "'<n> PR dipilih (<b> bundle; approval per bundle ...)' + one line per document, grouped by bundle (message no. 11)."
    s['items'] += [{'group': '<Detail PR Modal - PR from PR Creation (revision 26-Nov-26)>'}] + [dict(x) for x in DETAIL]
    O = s['operation']
    i = O.index(find(O, lambda o: o.get('type') == 'item' and o.get('text', '').startswith("Route Percentage = route Qty Total")))
    O.insert(i + 1, I('b2.', 'Route-based PR from PR Creation (bundle, revision 26-Nov-26): Number of Orders per day, Planned Cost = Distance × Mileage Cost, Total Cost = Planned Cost × Number of Orders (IDR/Day); footer Delivery Cost × Working Days = Total PR Cost. The info line names the trucking companies of the bundle.'))
    if extra:
        j = O.index(find(O, lambda o: o.get('type') == 'heading' and o.get('text', '').startswith('5.5')))
        O.insert(j + 1, I('a0.', 'PR bundle (PR Creation revision 26-Nov-26): the PRs of one Submit PR (same operational month and PR Sequence, one per trucking company) are approved / rejected together - no partial approval. Ticking one PR ticks the whole bundle; the confirmation lists the bundle (message no. 11); a block on any PR of the bundle (message no. 7 / 8, prefixed with the bundle) stops the whole bundle. Reject returns every PR of the bundle to PR Creation (OP-15 of PR Creation). PO creation stays per trucking company. PRs created before the revision are handled one by one.'))
        s['display_messages'].append(M('Click [Approve] / [Reject] with a PR of a bundle', 'PR bundle (no partial approval)', 'Info', '{n} PR dipilih ({b} bundle; approval per bundle, semua PR dalam bundle di-approve / di-reject sekaligus).', 'Approve / Reject or Batal'))
        imgs = [('c09_approval_bundle_list.png', f'{pref}_07_bundle_selected.png', 'PR bundle: ticking one PR ticks all 5 PR of the bundle (HTML mock-up, revision 26-Nov-26)'),
                ('c10_approval_bundle_confirm.png', f'{pref}_08_bundle_confirm.png', 'Approve confirmation per bundle, message no. 11 (HTML mock-up, revision 26-Nov-26)')]
        desc = 'PR bundle from PR Creation revision 26-Nov-26: approve / reject per bundle (no partial approval), selection of the whole bundle, message no. 11; detail columns of route-based PRs (orders per day, Planned Cost, Total Cost).'
    else:
        imgs = [('c11_inquiry_detail.png', f'{pref}_05_bundle_detail.png', 'Detail of a PR from PR Creation: bundle info line and route columns (HTML mock-up, revision 26-Nov-26)')]
        desc = 'PR bundle from PR Creation revision 26-Nov-26: Production Month sub text "Bundle · n PR"; detail columns of route-based PRs (orders per day, Planned Cost, Total Cost) and bundle info line.'
    dd = os.path.join(p['src_dir'], 'img', name)
    for src, dst, cap in imgs:
        shutil.copyfile(os.path.join(SHOTS, src), os.path.join(dd, dst))
        s['screen_layout'].append({'caption': cap, 'image': f'img/{name}/{dst}'})
    save(p, s, '0.5', desc)
