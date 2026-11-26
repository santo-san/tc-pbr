"""User review 3 (26-Nov-26): PR Creation Status column only for the price (Price per KM not found or 0); info chips and the
abnormality alert removed - the problems are listed in a dialog when Submit PR is clicked. UISS_Screen_PR_Creation 0.7.
Usage: python3 pr_creation_status_v07.py <repo> <screenshot dir>   (run once)"""
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uiss_paths import locate
R, SHOTS = sys.argv[1], sys.argv[2]
p = locate('UISS_Screen_PR_Creation', R); s = json.load(open(p['src']))
assert s['revisions'][-1]['revision'] == '0.6'

# ---- Gen Desc
for m in s['general']['screen_modes']:
    if m['mode'].startswith('Calculated - abnormality'):
        m['sections'][0]['buttons']['Submit PR'] = 'E'
        m['sections'][0]['description'] = 'Status shows a price problem; Submit PR opens the problem list (message no. 15)'
s['general']['screen_mode_remarks'][1] = ('2) Submit PR is enabled for authorized users. It submits only after Create PR, with a valid creation period, no abnormality in any trucking company '
                                          'and at least one trucking company with new routes (PC-12); otherwise it shows message no. 20 / 2-5 or the problem list dialog (message no. 15 / 16).')
s['general']['buttons'] = [b if b['name'] != 'Submit PR' else {**b, 'function': 'To send the bundle of all trucking companies to approval after confirmation (formerly Create PR); when not possible, shows the list of problems.'}
                           for b in s['general']['buttons']]

# ---- Item Desc: no info chips; Alert / Submit PR / Status redefined
s['items'] = [r for r in s['items'] if r.get('name') != 'Info chips']
for r in s['items']:
    n = r.get('name')
    if n == 'Alert':
        r['description'] = 'Only the view-only notice for unauthorized users (msg 14) and the creation period error (msg 2-5). No info chips and no abnormality alert (user review 26-Nov-26).'
    if n == 'Submit PR':
        r['description'] = ('Formerly Create PR. Enabled for authorized users (msg 14 otherwise). Before Create PR: msg 20. Valid case: opens the confirmation (5.6). '
                            "When not possible: dialog 'Submit PR not possible' with msg 15 / 16 and the problem list - price problems (msg 10), other data errors (msg 6-9, 11), trucking companies already in an active PR (msg 12).")
    if n == 'Status':
        r['description'] = ('Empty. Filled (red) only when the Price per KM used in the detail is not found in Master Price or is 0 (msg 10). '
                            "Other data errors and 'already in PR' are not shown here; they are listed when Submit PR is clicked (5.6).")
    if n == 'Mileage Cost (IDR/Km)':
        r['description'] = r['description'].replace("'-' if not available (abnormality, tooltip = reason).", "'-' if not available; not found or 0 fills the Status (msg 10).")

# ---- Operation Desc
for o in s['operation']:
    t = o.get('text', '')
    if o.get('type') == 'item' and t.startswith('The Status column shows only an abnormality'):
        o['text'] = ('Status column (user review 26-Nov-26): empty, filled in red only when the Price per KM of the detail is not found / expired / duplicated in Master Price, or is 0 (no. 10). '
                     'The other abnormalities - TMMIN Calendar missing (no. 6), no active Route Percentage (no. 7), no Order Sharing (no. 8) or 0 (no. 9), amount <= 0 (no. 11) - are not shown on the list; '
                     'they block Submit PR and are listed in its dialog (5.6). Definition TBD (OP-12).')
    if o.get('type') == 'item' and t.startswith("No abnormality: Status empty"):
        o['text'] = ("All routes already in an active PR of the month: the trucking company is not in the new bundle; it is listed in the Submit PR dialog (no. 12) and in the confirmation. "
                     "'Ready', 'Created {PR No}' and the grey status are not shown. No info chips above the list.")
    if o.get('type') == 'bullets':
        o['items'] = [x.replace('Submit PR: if not authorized message no. 14; before Create PR no. 20; any abnormality no. 15 (whole bundle blocked, OP-13); no trucking company with new routes no. 16.',
                                "Submit PR (enabled for authorized users; otherwise message no. 14): before Create PR no. 20; period error no. 2-5. Any abnormality: dialog 'Submit PR not possible' with no. 15 "
                                'and the problem list (price no. 10, data no. 6-9 / 11, already in PR no. 12) - whole bundle blocked (OP-13); no trucking company with new routes: no. 16 in the same dialog.')
                      .replace("['Already in PR' on every row; Submit PR: message no. 16]", "Submit PR: message no. 16")
                      if isinstance(x, str) else x for x in o['items']]
    if o.get('type') == 'table' and o['columns'][0]['title'] == 'Seq':
        for row in o['rows']:
            if row[1] == 'after sequence 2': row[2] = 'Submit PR: dialog with message no. 16 (all trucking companies already in PR, no. 12)'
    if o.get('type') == 'table' and o['columns'][0]['title'] == 'No':
        for row in o['rows']:
            if row[0] == 'OP-12':
                row[2] = 'Status = price problem only (Price per KM not found or 0, user review). Other abnormalities (calendar, route percentage, Order Sharing, amount) block Submit PR and are listed in its dialog; "Created" / grey status not shown.'

# ---- Display Message: price 0, where the messages are shown
k = 0
for msg in s['display_messages']:
    if 'event' not in msg: continue
    k += 1
    if k in (6, 7, 8, 9, 11):
        msg['event'] = 'Click [Submit PR] (problem list of the dialog)'
    if k == 10:
        msg['event'] = 'Create PR (Status column)'
        msg['cause'] = 'Price per KM not found / expired / duplicated, or 0 (PC-04)'
        msg['message'] = 'No Price per KM found in Master Price for {LP} period {YYYYMM}. (or expired / more than one valid price) / Price per KM of {LP} for period {YYYYMM} is 0 in Master Price.'
    if k == 12:
        msg['event'] = 'Click [Submit PR] (problem list of the dialog)'
        msg['type'] = 'Info'
    if k == 15:
        msg['message'] = 'Submit PR is not possible: {n} trucking company(ies) have an abnormality (see the list below and the Status column). Please correct the data first. (+ problem list)'
        msg['cause'] = 'At least one trucking company has an abnormality (PC-12, OP-13): dialog Submit PR not possible'
    if k == 16:
        msg['event'] = 'Click [Submit PR] (dialog)'

# ---- Screen Layout
IMG = 'img/UISS_Screen_PR_Creation/'
for c in s['screen_layout']:
    if c['image'].endswith('c07_abnormal_blocked.png'):
        c['caption'] = '9. Status filled only for the price problem (Price per KM missing for GIB); no info chips / alert (HTML mock-up)'
i = next(n for n, c in enumerate(s['screen_layout']) if c['image'].endswith('c07_abnormal_blocked.png'))
s['screen_layout'].insert(i + 1, {'caption': "9b. Submit PR clicked: dialog 'Submit PR not possible' with the problem list (HTML mock-up)", 'image': IMG + 'c12_submit_blocked.png'})
d = os.path.join(p['src_dir'], 'img', 'UISS_Screen_PR_Creation')
for f in ['c01_ip_view_only.png', 'c02_staff_list.png', 'c03_detail.png', 'c04_submit_confirm.png', 'c05_loading.png', 'c06_submitted.png', 'c07_abnormal_blocked.png',
          'c08_mandatory.png', 'c11_inquiry_detail.png', 'c12_submit_blocked.png']:
    shutil.copyfile(os.path.join(SHOTS, f), os.path.join(d, f))

s['revisions'].append({'revision': '0.7', 'author': 'Susanto', 'date': '26-Nov-26', 'reviewed_by': '',
                       'description': 'User review: Status empty, filled only when the Price per KM of the detail is not found or is 0 (message no. 10, price 0 added); info chips and abnormality alert removed '
                                      "(Item 'Info chips' deleted - items renumbered from 7); Submit PR enabled for authorized users and shows the problem list dialog (messages no. 6-9, 11, 12, 15, 16); "
                                      'Operation Desc 5.4 / 5.6, OP-12, screenshots retaken.'})
s['header']['updated_date'] = '26-Nov-26'
json.dump(s, open(p['src'], 'w'), indent=1, ensure_ascii=False)
print('patched PR Creation 0.7')
