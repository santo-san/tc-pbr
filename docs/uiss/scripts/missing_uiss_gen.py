"""Generate the three UISS that were missing in the review (docs/review/04 M1-M3):
  UISS_Screen_TCPBR_Menu_Authorization, UISS_Batch_SA_PAS_Interface, UISS_Batch_IPMS_DTP_Interface.
Content is taken from the mock-up code (evidence in each sheet); database parts from docs/db/schema.json.
Usage: python3 missing_uiss_gen.py <repo root>"""
import json, sys, os
R = sys.argv[1] if len(sys.argv) > 1 else '.'
S = json.load(open(os.path.join(R, 'docs/db/schema.json')))
DATE, BY = '14-Nov-26', 'Susanto'
NOTBD = 'TBD - Not confirmed from existing schema/data/code'
H = lambda t, n=None: {'type': 'heading', 'text': t, **({'num': n} if n else {})}
T = lambda t, l=1, b=False: {'type': 'text', 'text': t, 'level': l, 'bold': b}
I = lambda m, t, l=2: {'type': 'item', 'marker': m, 'text': t, 'level': l}
def tbl(cols, rows, l=0): return {'type': 'table', 'level': l, 'columns': [{'title': c, 'width': w} for c, w in cols], 'rows': rows, 'row_lines': 'all'}
def tdef(name, kind, desc):
    t = S[name]
    return {'name': name, 'kind': kind, 'proposed': False, 'description': desc,
            'columns': [[c['name'], c['type'].upper(), 'Y' if c['name'] in t['pk'] else '', 'Y' if c['null'] else 'N', ('default ' + t['defaults'][c['name']]) if c['name'] in t['defaults'] else ''] for c in t['columns']]}
def hdr(fn, block):
    return {'phase': 'DR', 'project_name': 'ELIPS Enhancement (TC-PBR)', 'block_name': block, 'function_name': f'TBD {fn}', 'created_date': DATE, 'created_by': BY}
REV = lambda d: [{'revision': '0.1', 'author': BY, 'date': DATE, 'reviewed_by': '', 'description': d}]
out = {}

# ---------------------------------------------------------------- 1. Menu & Authorization (common screen)
ROLES = ['IELP Admin', 'Planner VPLD', 'LP Admin', 'Supplier Viewer', 'Driver', 'VPLD Staff / SH', 'Approver (SH/DpH/DH)', 'GA', 'System']
ACCESS = [  # function, menu path, page#view, access per role (V view, X execute, - none), evidence
 ('Daily Monitoring', 'Daily > Daily Monitoring', 'index.html#monitoring', ['X', 'X', 'X', 'V', 'X', '-', '-', '-', 'X'], 'workflow.js:57 canView, action allow()'),
 ('Planning Order (DTP Creation)', 'Daily > Planning Order', 'index.html#planning-order', ['V', 'X', '-', '-', '-', '-', '-', '-', '-'], 'dtp-rules.js canCreate (PLANNER); dtp.js isPlanner'),
 ('Planning Truck Assignment', 'Daily > Planning Truck Assignment', 'index.html#truck-assignment', ['V', 'V', 'X', 'V', '-', '-', '-', '-', '-'], 'truck-assign.js:8 isLpAdmin'),
 ('SA Approval', 'Service Acceptance > SA Approval', 'index.html#sa-approval', ['V', 'X', '-', '-', '-', '-', '-', '-', '-'], 'sa.js:10-11 isVPLD, canSeeApproval'),
 ('SA Monitoring', 'Service Acceptance > SA Monitoring', 'index.html#sa-monitoring', ['X', 'V', 'V', 'V', '-', '-', '-', '-', 'X'], 'sa-monitoring.js:15-17 canView, canRetry (IELP Admin)'),
 ('Master (8 screens)', 'Master > Trucking Company, Mileage, Price, Location Code, Priority, Renban, KPI, Route Percentage', 'master.html#...', ['X', '?', '?', '?', '-', '?', '?', '?', '-'], 'No role check in master.js / master-*.js (TBD)'),
 ('PR Creation', 'Monthly > PR Creation', 'monthly.html#pr-creation', ['V', '-', '-', '-', '-', 'X', 'V', '-', '-'], 'pr-creation-rules.js canCreate + pr-sources.js PR_CREATORS'),
 ('PR / PO Approval', 'Monthly > PR Approval, PO Approval', 'monthly.html#pr-approval, #po-approval', ['V', '-', '-', 'V', '-', 'V', 'X', 'V', 'X'], 'monthly-workflow.js canView, needsMe (APPROVER), runAutoApprove (SYSTEM)'),
 ('PR / PO Inquiry', 'Monthly > PR Inquiry, PO Inquiry', 'monthly.html#pr-inquiry, #po-inquiry', ['V', '-', '-', 'V', '-', 'V', 'V', 'V', '-'], 'monthly-workflow.js:28 canView (supplier own documents)'),
]
items = [{'group': '<Side Menu>'}]
for f, path, page, acc, ev in ACCESS:
    items.append({'name': path, 'source': 'ielp.MASTER_MENU', 'field': 'MENU_ITEM', 'type': 'Varchar', 'len': '100', 'io': 'I', 'control': 'Link', 'justified': 'Left',
                  'initial': '-', 'required': 'N', 'format': '-', 'validation': 'Shown only for user classes with the menu in USERID_MENU_OPTION (TBD)',
                  'description': f'Opens {page}. Access in the mock-up: ' + ', '.join(f'{r} {a}' for r, a in zip(ROLES, acc) if a != '-') + f'. Evidence: {ev}.'})
items += [{'group': '<Header>'},
 {'name': 'Login sebagai (role selector)', 'source': 'Mock-up only', 'field': '-', 'type': 'Varchar', 'len': '-', 'io': 'I', 'control': 'Combo Box', 'justified': 'Left', 'initial': 'IELP Admin', 'required': 'N', 'format': '-', 'validation': '-',
  'description': 'Simulates the logged-in user (app.js:510 setActor, :519 openLogin; monthly.js:325). In ELIPS the user comes from ielp.USERID + USERID_DETAIL (USERID_CLASS) - not a screen field.'},
 {'name': 'User name / role label', 'source': 'ielp.USERID / ielp.USERID_DETAIL', 'field': 'FULL_NAME / USERID_CLASS', 'type': 'Varchar', 'len': '100 / 50', 'io': 'O', 'control': 'Label', 'justified': 'Left', 'initial': 'Login user', 'required': 'N', 'format': '-', 'validation': '-',
  'description': 'Role label per workflow.js:26 roleLabel / monthly-workflow.js:135. Mapping role -> USERID_CLASS ' + NOTBD + '.'}]
role_rows = [[f, *acc] for f, _, _, acc, _ in ACCESS]
menu = {'doc_type': 'screen', 'header': hdr('TC-PBR Menu & Authorization', 'Screen'),
 'revisions': REV('Newly created in the UISS review (docs/review 04 M1): menu tree and role access of the existing TC-PBR mock-up; ELIPS tables MASTER_MENU, USERID_*; class names TBD'),
 'general': {'objective': ['To document the TC-PBR menu tree and which role may view / execute each function, as implemented in the mock-up.',
   'To map menus and roles to the existing ELIPS authorization tables (MASTER_MENU, USERID_CLASS, USERID_MENU_OPTION, USERID_DETAIL).'],
  'display_order': [{'section': 'Side menu', 'fields': [{'field': 'Fixed order as in the pages', 'order': '-'}]}],
  'buttons': [{'name': 'Menu link', 'function': 'Open the screen of the menu (hash routing).'}, {'name': 'Login sebagai', 'function': 'Mock-up only: switch the acting user.'}],
  'screen_modes': [{'mode': 'Logged in', 'sections': [{'section': 'Side menu', 'description': 'Menus per user class', 'buttons': {'Menu link': 'E', 'Login sebagai': 'E'}}]}]},
 'screen_flow': [{'title': 'Menu access', 'flow': {'direction': 'TB', 'nodes': [{'id': 's', 'label': 'Login (ELIPS)', 'type': 'start'}, {'id': 'u', 'label': 'Read USERID_DETAIL -> USERID_CLASS', 'type': 'process'},
   {'id': 'm', 'label': 'Read USERID_MENU_OPTION + MASTER_MENU', 'type': 'process'}, {'id': 'r', 'label': 'Show allowed menus; screen checks role per action', 'type': 'end'}],
   'edges': [{'from': 's', 'to': 'u'}, {'from': 'u', 'to': 'm'}, {'from': 'm', 'to': 'r'}]}}],
 'screen_layout': [{'caption': 'Side menu (see screen layouts of each function UISS)'}],
 'items': items,
 'data_map': {'blocks': [], 'note': 'Not applicable - read only (menus / user classes are maintained in ELIPS user administration).'},
 'operation': [H('5.1 Role access matrix (mock-up code)'), T('X = execute, V = view only, ? = no role check in the code (TBD), - = no access. Evidence per row in Item Desc.', 0),
   tbl([('Function', 10)] + [(r, 3) for r in ROLES], role_rows),
   H('5.2 Database specification (ELIPS AE070_ILS_DB)'),
   tbl([('Table', 8), ('Columns used', 18), ('Purpose', 10)], [['ielp.MASTER_MENU', 'APP_NAME, MENU_ID (PK), MENU_INDEX, MENU_PARENT, MENU_LEVEL, MENU_ITEM, MENU_ACT', 'Menu tree'],
     ['ielp.MASTER_MENU_LANG', 'MENU_ID, LANG_ID, MENU_ITEM', 'Menu labels per language'], ['ielp.USERID_CLASS', 'APP_NAME, SITE_ID, USERID_CLASS (PK), DESCRIPTION', 'User classes (roles)'],
     ['ielp.USERID_MENU_OPTION', 'USERID_CLASS, APP_NAME, SITE_ID, MENU_ID (PK)', 'Menus per class'], ['ielp.USERID_DETAIL', 'USERNAME, USERID_CLASS, SITE_ID (PK), DEFAULT_YN', 'Classes per user'],
     ['ielp.USERID', 'USER_NAME (PK), FULL_NAME, COMPANY, IS_ADMIN, STATUS', 'Users'], ['ielp.MASTER_APP', 'APP_ID, APP_NAME, APP_URL', 'Application (TC-PBR APP_ID TBD)']]),
   H('5.3 TBD'), {'type': 'bullets', 'marker': '-', 'level': 0, 'items': ['USERID_CLASS values for each mock-up role (' + ', '.join(ROLES) + ') - ' + NOTBD,
     'MENU_ID / APP_NAME of the TC-PBR menus', 'Role rules for the Master screens (no check in the code; Master Mileage shows an "IELP Admin only" badge)',
     'How Driver and LP Admin (supplier users) are linked to MS_DRIVER.USER_NAME / MS_TRUCKING_COMPANY (USERID.COMPANY?)']}],
 'display_messages': [{'group': 'Authorization'}, {'event': 'Open a menu / action', 'cause': 'Role not allowed', 'type': 'Error', 'msg_id': 'TBD', 'message': 'Per screen (e.g. "SA Approval is only available for VPLD (approve) and IELP Admin (view)", PR Creation noAuth)', 'action': 'Login with the right role'}],
 'logging_messages': []}
out['UISS_Screen_TCPBR_Menu_Authorization'] = menu

# ---------------------------------------------------------------- 2. SA -> PAS interface
SD, LG = 'ielp.SA_DETAIL', 'ielp.LOG_ITGPAS'
LOGS = [('Send SA', 'SA not in NOT_SENT / FAILED', 'Error', 'SA {SA} is {STATUS}, cannot be sent (409 NOT_SENDABLE).', 'Reject', '-'),
 ('Send SA (retry)', 'User without retry authorization', 'Error', 'Retry Interface needs the retry authorization (403 FORBIDDEN).', 'Reject', 'IELP Admin retries'),
 ('Send SA (retry)', 'PAS already returned PR / PO', 'Error', 'PAS already returned data; the failed PAS step is handled in PAS (no resend) (409 PAS_STEP_FAILED).', 'Reject', 'Handle in PAS'),
 ('Send SA', 'SA data incomplete', 'Error', 'SA data incomplete (SA Number / deliveries / cost) (422 INVALID_REQUEST).', 'Status FAILED, log', 'Correct the SA'),
 ('Send SA', 'PAS unavailable / timeout / invalid / rejected', 'Error', 'PAS_UNAVAILABLE / TIMEOUT / INVALID_REQUEST / PAS_REJECTED: <message> (502).', 'Status FAILED, log', 'Retry'),
 ('Send SA', 'Accepted by PAS', 'Info', 'SA {SA} sent to PAS (200 SENT).', 'Status SENT, interface time', '-'),
 ('Feedback', 'Missing feedback id / SA / type', 'Error', 'Feedback id, SA Number and type are mandatory (400 INVALID_FORMAT).', 'Reject', 'PAS resends'),
 ('Feedback', 'Same feedback id again', 'Info', 'Feedback {ID} already processed, ignored (DUPLICATE).', 'Ignore', '-'),
 ('Feedback', 'SA unknown', 'Error', 'SA {SA} not found in ELIPS (404 UNKNOWN_SA).', 'Reject', 'Check SA'),
 ('Feedback', 'Correlation id differs / SA not sent', 'Error', '409 CORRELATION_MISMATCH / NOT_SENT.', 'Record REJECTED', '-'),
 ('Feedback', 'PR / PO number missing or conflicting / duplicated', 'Error', '422 MISSING_PR_NO / MISSING_PR_DATE / MISSING_PO_NO; 409 PR_CONFLICT / PO_CONFLICT / DUPLICATE_PR / DUPLICATE_PO.', 'Record REJECTED, values not overwritten', 'Correct in PAS'),
 ('Feedback', 'PAS error feedback', 'Error', 'PAS error {CODE} recorded.', 'Status FAILED', 'Retry Interface'),
 ('Feedback', 'PR / PO received', 'Info', 'SA {SA}: PR_RECEIVED / PO_RECEIVED / COMPLETED.', 'Update PAS columns, log', '-'),
 ('Feedback', 'DB update failed', 'Error', 'Database update failed, feedback not saved (500 DB_ERROR; PAS may resend).', 'Rollback', '-')]
sapas = {'doc_type': 'batch', 'header': hdr('SA to PAS Interface (send + feedback)', 'Batch / Interface'),
 'revisions': REV('Newly created in the UISS review (docs/review 04 M2) from the implemented rules sa-pas-rules.js (SM-04..SM-14) and the SA Monitoring screen; ELIPS columns SA_DETAIL.PAS_* and LOG_ITGPAS (inferred)'),
 'general': {'objective': ['To send an approved SA from ELIPS to PAS and to apply the PAS feedback (PR / PO number or error) to the SA, as implemented in sa-pas-rules.js.',
   'The approved SA snapshot is never changed; only PAS / integration fields are written (SM-10).'],
  'operation_flow': {'flow': {'direction': 'TB', 'nodes': [{'id': 'a', 'label': 'Approved SA (SA Approval)', 'type': 'screen'}, {'id': 's', 'label': 'Send SA to PAS (system / Retry)', 'type': 'process'},
    {'id': 'p', 'label': 'PAS', 'type': 'db'}, {'id': 'f', 'label': 'Apply PAS feedback', 'type': 'process'}, {'id': 'd', 'label': SD, 'type': 'db'}],
    'edges': [{'from': 'a', 'to': 's'}, {'from': 's', 'to': 'p'}, {'from': 'p', 'to': 'f', 'label': 'feedback'}, {'from': 'f', 'to': 'd'}, {'from': 's', 'to': 'd'}]}},
  'inputs': [{'name': 'ielp.SA_HEADER / ielp.SA_DETAIL', 'type': 'DB', 'description': 'Approved SA'}, {'name': 'PAS feedback', 'type': 'API / interface', 'description': 'feedbackId, saNo, correlationId, type PR / PO / PR_PO / ERROR, prNo, prDate, poNo, errorCode'}],
  'outputs': [{'name': SD, 'type': 'DB', 'description': 'PAS_* columns'}, {'name': LG, 'type': 'DB', 'description': 'Interface log (inferred)'}],
  'extra_tables': [{'title': 'Interface status (sa-pas-rules.js STATUS)', 'columns': [{'title': 'Status', 'width': 10}, {'title': 'Meaning', 'width': 30}],
    'rows': [['NOT_SENT', 'Approved, not sent'], ['PROCESSING', 'Sending'], ['SENT', 'Sent - waiting PAS'], ['PR_RECEIVED', 'PAS PR number received'], ['PO_RECEIVED', 'PAS PO received without PR'], ['COMPLETED', 'PR and PO received'], ['FAILED', 'Send or PAS step failed']]}],
  'constraints': ['SA number format ^ILS/TR/[A-Z0-9]{2,5}/\\d{6}\\d{4}$ (sa-pas-rules.js SA_RE) is longer than SA_CODE varchar(16) - conflict G-SA-01.', 'Status code values stored in SA_DETAIL.PAS_STATUS varchar(100): ' + NOTBD]},
 'func_flow': {'flow': {'direction': 'TB', 'nodes': [{'id': 's', 'label': 'START', 'type': 'start'}, {'id': 'c', 'label': 'Sendable? (NOT_SENT / FAILED, retry right)', 'type': 'decision', 'step': 1},
   {'id': 'v', 'label': 'Validate SA data', 'type': 'process', 'step': 2}, {'id': 'x', 'label': 'Call PAS, correlation id', 'type': 'process', 'step': 3},
   {'id': 'r', 'label': 'Result: SENT / FAILED + log', 'type': 'process', 'step': 4}, {'id': 'f', 'label': 'Feedback: validate, apply, log', 'type': 'process', 'step': 5}, {'id': 'e', 'label': 'END', 'type': 'end'}],
   'edges': [{'from': 's', 'to': 'c'}, {'from': 'c', 'to': 'v', 'label': 'Yes'}, {'from': 'v', 'to': 'x'}, {'from': 'x', 'to': 'r'}, {'from': 'r', 'to': 'f'}, {'from': 'f', 'to': 'e'}]},
  'steps': ['Check the SA can be sent: status NOT_SENT or FAILED; a retry by a user needs the retry authorization (IELP Admin in the mock-up); FAILED after PAS data was returned cannot be resent (log 1-3).',
   'Validate SA number format, at least one detail, total cost > 0; otherwise FAILED INVALID_REQUEST (log 4).',
   'Set a stable correlation id ELIPS-SA-<SA number>, attempts + 1, status PROCESSING; call PAS.',
   'PAS error: FAILED with error code / message (log 5); success: SENT with interface time (log 6).',
   'Feedback: mandatory fields, duplicate feedback id ignored, unknown SA, correlation / not-sent checks, PR / PO number and date checks, uniqueness of PAS PR (and optionally PO); apply values, status PR_RECEIVED / PO_RECEIVED / COMPLETED or FAILED for error feedback; every event logged (log 7-14).',
   'Overdue (visual only): SENT / PR_RECEIVED / PO_RECEIVED without feedback for more than the limit (24 h TBD) is highlighted on SA Monitoring (SM-14).']},
 'data_map': {'blocks': [{'source': {'table': 'Send result'}, 'destination': {'table': SD, 'operation': 'Update', 'description': 'Step 3-4 per SA detail', 'keys': [{'field': 'SA_CODE', 'value': 'SA number'}]},
    'mappings': [{'dest_field': 'IS_PAS', 'description': "'1' when sent (values TBD)"}, {'dest_field': 'PAS_STATUS', 'description': 'Interface status'}, {'dest_field': 'PAS_CREATED_DATE', 'description': 'Interface time'},
                 {'dest_field': 'LOG_ITG_SEND_ID', 'description': 'LOG_ITGPAS.LOG_ID of the send'}, {'dest_field': 'UPDATED_BY / UPDATED_DATE', 'description': 'System / server time'}]},
   {'source': {'table': 'PAS feedback'}, 'destination': {'table': SD, 'operation': 'Update', 'description': 'Step 5 per SA detail', 'keys': [{'field': 'SA_CODE', 'value': 'feedback saNo'}]},
    'mappings': [{'dest_field': 'PAS_PR_NUMBER', 'description': 'prNo (not overwritten when different)'}, {'dest_field': 'PAS_PR_DATE', 'description': 'prDate YYYY-MM-DD'}, {'dest_field': 'PAS_PO_NUMBER', 'description': 'poNo'},
                 {'dest_field': 'PAS_PO_DATE', 'description': NOTBD}, {'dest_field': 'IS_PAS_CALLBACK', 'description': "'1' (values TBD)"}, {'dest_field': 'PAS_CALLBACK_STATUS', 'description': 'RECEIVED / ERROR / REJECTED'},
                 {'dest_field': 'PAS_CALLBACK_DATE', 'description': 'Server time'}, {'dest_field': 'LOG_ITG_CALLBACK_ID', 'description': 'LOG_ITGPAS.LOG_ID'}]},
   {'source': {'table': 'Every event'}, 'destination': {'table': LG, 'operation': 'Insert', 'description': 'Interface log (inferred)'},
    'mappings': [{'dest_field': 'LOG_ID', 'description': 'Generated (rule TBD)'}, {'dest_field': 'ACT', 'description': 'SA_SENT_TO_PAS / PAS_REQUEST_SUCCESS / PAS_REQUEST_FAILED / PAS_PR_RECEIVED / PAS_PO_RECEIVED / PAS_FEEDBACK_FAILED / PAS_PROCESS_COMPLETED'},
                 {'dest_field': 'PROCESS_ID', 'description': 'SA number / correlation id (TBD)'}, {'dest_field': 'PARAM_REQ / PARAM_RES', 'description': 'Request / response JSON'}, {'dest_field': 'STS_CODE / STS_MESSAGE', 'description': 'Result code / message'},
                 {'dest_field': 'CREATED_BY / CRETED_DATE', 'description': 'Actor / server time (column spelled CRETED_DATE)'}]}]},
 'func_desc': [H('Description', '4.'), T('Rules SM-04..SM-14 of docs/sa-monitoring-spec.md as implemented in sa-pas-rules.js (tests/sa-monitoring.test.js).', 1),
   T('Open points', 1, True), {'type': 'bullets', 'marker': '-', 'level': 1, 'items': ['PAS endpoint / transport (API vs Talend - see UISS-Batch ELIPS PAS PR Interface)', 'Status code values in PAS_STATUS', 'Correlation id / attempts storage (no column)', 'Overdue limit (24 h)']}],
 'logging_messages': [{'event': e, 'cause': c, 'type': t, 'msg_id': 'TBD', 'message': m, 'action': {'system': s, 'user': u}} for e, c, t, m, s, u in LOGS],
 'tables': [tdef(SD, 'transaction', 'Existing ELIPS table (columns from ELIPS_Schema.sql)'), tdef(LG, 'log', 'Existing ELIPS table (interface log, inferred)')]}
out['UISS_Batch_SA_PAS_Interface'] = sapas

# ---------------------------------------------------------------- 3. IPMS -> DTP interface
D2 = 'ielp.DTP_2_DETAIL'
ipms = {'doc_type': 'batch', 'header': hdr('IPMS to DTP Interface (Load / Refresh from IPMS)', 'Batch / Interface'),
 'revisions': REV('Newly created in the UISS review (docs/review 04 M3) from the simulated IPMS load in dtp.js (pullIpms / loadIpms); IPMS source tables ' + NOTBD),
 'general': {'objective': ['To receive the DTP records of a plan date from IPMS into the Planning Order grid (button "Load / Refresh from IPMS"), as simulated in dtp.js.'],
  'operation_flow': {'flow': {'direction': 'TB', 'nodes': [{'id': 'b', 'label': 'Planning Order: Load / Refresh from IPMS', 'type': 'screen'}, {'id': 'i', 'label': 'IPMS (source TBD)', 'type': 'db'},
    {'id': 'p', 'label': 'Receive new records of the date', 'type': 'process'}, {'id': 'd', 'label': D2 + ' (inferred)', 'type': 'db'}],
    'edges': [{'from': 'b', 'to': 'p'}, {'from': 'i', 'to': 'p'}, {'from': 'p', 'to': 'd'}]}},
  'inputs': [{'name': 'IPMS DTP data', 'type': 'DB / API', 'description': NOTBD}], 'outputs': [{'name': D2, 'type': 'DB', 'description': 'DTP records, data source IPMS (inferred)'}],
  'constraints': ['Only records not received before for the date are added (dtp.js:60 pullIpms: PULLED[date]).', 'Received records are validated like Excel / Manual records (dtp-rules.js makeRecord / validate) and keep their status (Ready / Error).']},
 'func_flow': {'flow': {'direction': 'TB', 'nodes': [{'id': 's', 'label': 'START (button)', 'type': 'start'}, {'id': 'c', 'label': 'Call IPMS for the plan date', 'type': 'process', 'step': 1},
   {'id': 'q', 'label': 'IPMS responding?', 'type': 'decision', 'step': 2}, {'id': 'x', 'label': 'Message: interface error', 'type': 'message'},
   {'id': 'a', 'label': 'Add new records, validate, payment type default', 'type': 'process', 'step': 3}, {'id': 'e', 'label': 'Toast n records / no new data', 'type': 'end'}],
   'same_rank': [['q', 'x']], 'edges': [{'from': 's', 'to': 'c'}, {'from': 'c', 'to': 'q'}, {'from': 'q', 'to': 'x', 'label': 'No'}, {'from': 'q', 'to': 'a', 'label': 'Yes'}, {'from': 'a', 'to': 'e'}]},
  'steps': ['Show "Receiving data from IPMS interface..." and request the records of the selected plan date (dtp.js:703 loadIpms).',
   'IPMS not responding: "IPMS interface is not responding (simulated). No record was received. Please try again later." - nothing added (log 1).',
   'Add only records not received before (first call: initial set, refresh: the rest); each record gets data source IPMS, is validated, gets the default payment type (By Resources while a slot is free, else By Trip - KM-14) and a history entry "Received from IPMS" (dtp.js:67 addRecord).',
   'Result: "n record(s) received from IPMS" or "No new data from IPMS" (log 2 / 3).']},
 'data_map': {'blocks': [{'source': {'table': 'IPMS record (source TBD)'}, 'destination': {'table': D2, 'operation': 'Insert', 'description': 'Step 3 - each new record (inferred)'},
    'mappings': [{'source_field': 'io', 'dest_field': 'SERVICE_TYPE'}, {'source_field': 'roundUse', 'dest_field': 'IS_ROUNDUSE'}, {'source_field': 'lp', 'dest_field': 'COMPANY_ID'}, {'source_field': 'renban', 'dest_field': 'RENBAN'},
                 {'source_field': 'from / to', 'dest_field': 'FROM_LOC / TO_LOC'}, {'source_field': 'etd', 'dest_field': 'ETD'}, {'source_field': 'ctrSize', 'dest_field': 'CTR_SIZE / CTR_TYPE'}, {'source_field': 'agent', 'dest_field': 'SHIPPING_AGENT'},
                 {'source_field': 'bookNo', 'dest_field': 'CTR_BOOKING_NO'}, {'source_field': 'vessel', 'dest_field': 'VESSEL'}, {'source_field': 'truckType', 'dest_field': 'TRUCK_TYPE'}, {'source_field': 'container', 'dest_field': 'CONTAINER_NO'},
                 {'source_field': 'shift', 'dest_field': 'SHIFT'}, {'source_field': 'dg', 'dest_field': 'IS_DG'}, {'source_field': 'arrDate / arrTime', 'dest_field': 'ARRIVAL_DATE / ARRIVAL_TIME'},
                 {'source_field': 'exporter / importerCd / dest', 'dest_field': '(no column - Conflict G-DTP-05)'}, {'dest_field': 'DTP_DET_ID, ORDER_NO, DTP_HEADER_ID, CREATED_DATE, UPDATED_DATE', 'description': 'NOT NULL - generation ' + NOTBD},
                 {'dest_field': 'STATUS_CODE', 'description': 'Validation result (codes TBD)'}, {'dest_field': 'data source / payment type', 'description': 'No column (Conflict G-DTP-03 / G-DTP-05)'}]}]},
 'func_desc': [H('Description', '4.'), T('Implemented only as a simulation (dtp.js:44 ipmsPool generates 10 records per date; the 6th fails once in the queue). The real IPMS interface (system, tables, trigger, record key for "already received") is ' + NOTBD + '.', 1)],
 'logging_messages': [{'event': 'Load from IPMS', 'cause': 'IPMS not responding', 'type': 'Error', 'msg_id': 'TBD', 'message': 'IPMS interface is not responding. No record was received. Please try again later.', 'action': {'system': 'Nothing added', 'user': 'Try again later'}},
   {'event': 'Load from IPMS', 'cause': 'New records', 'type': 'Info', 'msg_id': 'TBD', 'message': '{n} record(s) received from IPMS', 'action': {'system': 'Records added', 'user': '-'}},
   {'event': 'Load from IPMS', 'cause': 'No new records', 'type': 'Info', 'msg_id': 'TBD', 'message': 'No new data from IPMS', 'action': {'system': '-', 'user': '-'}}],
 'tables': [tdef(D2, 'transaction', 'Existing ELIPS table (inferred target for the Universal DTP)')]}
out['UISS_Batch_IPMS_DTP_Interface'] = ipms
DEST = {'UISS_Screen_TCPBR_Menu_Authorization': '18_Menu_Authorization', 'UISS_Batch_SA_PAS_Interface': '06_SA_Monitoring', 'UISS_Batch_IPMS_DTP_Interface': '02_Planning_Order_DTP'}
for n, spec in out.items():
    json.dump(spec, open(os.path.join(R, 'docs/uiss', DEST[n], 'src', n + '.json'), 'w'), indent=1, ensure_ascii=False)
    print('written', n)
