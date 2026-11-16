"""UI change after CR Edit & Approve (16-Nov-26, user review): remove the [Waiting TM Approval (n)] counter button (count shown in the
Order Status filter option instead) and move Edit / Approve from below the Action icon to a new column 'TM Review'.
UISS_Screen_Daily_Order_Monitoring 0.8, UISS_Report_Download_Daily_Order_Monitoring 0.7. Run once on the 0.7 / 0.6 source JSON.
Usage: python3 cr_tm_review_column_v08.py <repo> <screenshot dir>"""
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uiss_paths import locate
R, SHOTS = sys.argv[1], sys.argv[2]
DATE, WHO, WAIT = '16-Nov-26', 'Susanto', 'Waiting TM Approval'


def rev(s, n, d):
    assert s['revisions'][-1]['revision'] != n, 'already applied'
    s['revisions'].append({'revision': n, 'author': WHO, 'date': DATE, 'reviewed_by': '', 'description': d})
    s['header']['updated_date'], s['header']['updated_by'] = DATE, WHO


# ---------------------------------------------------------------- Daily Order Monitoring
p = locate('UISS_Screen_Daily_Order_Monitoring', R); s = json.load(open(p['src']))
OLD_CHIP = '[CR] Waiting TM Approval (n)'
REN = {'[CR] Edit (row) / Edit Finish Order (Order Detail)': '[CR] TM Review: Edit / Edit Finish Order (Order Detail)',
       '[CR] Approve (row) / Approve Finish Order (Order Detail)': '[CR] TM Review: Approve / Approve Finish Order (Order Detail)'}
g = s['general']
g['buttons'] = [b for b in g['buttons'] if b['name'] != OLD_CHIP]
for b in g['buttons']:
    if b['name'] in REN:
        b['name'] = REN[b['name']]
        b['function'] = b['function'].replace('to open the Edit Finish Order form', 'button [Edit] in column TM Review (or Order Detail): to open the Edit Finish Order form').replace('to approve one order', 'button [Approve] in column TM Review (or Order Detail): to approve one order')
for m in g['screen_modes']:
    for sec in m['sections']:
        sec['buttons'] = {REN.get(k, k): v for k, v in sec['buttons'].items() if k != OLD_CHIP}
g['screen_mode_remarks'][-1] = (f"4) [CR] VPLD TM: the selection check box and column TM Review ([Edit] outline button + [Approve] green button side by side) are shown only to VPLD TM; "
                                f"the buttons only on orders {WAIT}, approved orders show 'Approved', others '-'. [Approve Finish Order (n)] is enabled when at least one row is selected. "
                                "Other roles (incl. Planner VPLD of SA Approval) do not see the check box / TM Review column (read only).")
for e in s['screen_flow'][0]['flow']['edges']:
    if e.get('label') == '[CR] Edit': e['label'] = '[CR] TM Review: Edit'
    if e.get('label') == '[CR] Approve / Approve (n)': e['label'] = '[CR] TM Review: Approve / Approve (n)'

it = s['items']
for r in it:
    n = r.get('name')
    if n == '[CR] Order Status':
        r['description'] = r['description'].replace('Applied on [Find]', f"The option {WAIT} shows the number of waiting orders in the user data scope, e.g. '{WAIT} (5)' (refreshed with the list). Applied on [Find]")
    elif n == OLD_CHIP:
        r.update({'name': '[CR] Order Status option count', 'source': 'ielp.DTP_2_DETAIL', 'field': f'count of STATUS_CODE = {WAIT}', 'type': 'Number', 'io': 'O', 'control': 'Combo Box option text',
                  'description': f"Number of orders {WAIT} in the user data scope (all dates), shown in the Order Status option '{WAIT} (n)'. Replaces the counter button of rev 0.7 (removed)."})
    elif n == '[CR] Edit (row)':
        r.update({'name': '[CR] TM Review (column)', 'control': 'Grid column', 'justified': 'Center',
                  'description': f"Column after Action, VPLD TM only (hidden for other roles). Rows {WAIT}: buttons [Edit] and [Approve] side by side; approved orders: 'Approved' (green check); other rows: '-'."})
    elif n == '[CR] Approve (row)':
        r.update({'name': '[CR] TM Review - [Edit] / [Approve] buttons', 'control': 'Button', 'justified': 'Center',
                  'description': '[Edit] (blue outline, pencil icon) opens the Edit Finish Order form (5.6.7); [Approve] (green, check icon) opens the Approve Finish Order confirmation of the row (5.6.9). Same height, one line.'})
    elif n == '[CR] Select (check box) / Select all (header)':
        r['description'] = r['description'].replace('VPLD TM only, enabled', 'First column, VPLD TM only, enabled')
O = s['operation']
for o in O:
    if o.get('marker') == 'i.' and 'Waiting TM Approval (n)' in o.get('text', ''):
        o['text'] = f"[CR] The Order Status option '{WAIT} (n)' shows how many orders wait for TM review; select it and [Find] to list them (rows highlighted). The count is recalculated on every refresh of the list."
    if o.get('type') == 'bullets':
        o['items'] = [x.replace('[Edit] of a row', '[Edit] in column TM Review').replace('[Approve] of a row', '[Approve] in column TM Review') if isinstance(x, str) else x for x in o['items']]
    if o.get('type') == 'text' and o.get('text', '').startswith('[CR] Only VPLD TM can edit or approve'):
        o['text'] = o['text'].replace('(no check box / Edit / Approve)', '(no check box / TM Review column)')
for c in s['screen_layout']:
    if c['image'].endswith('10_cr_tm_waiting_list.png'):
        c['caption'] = f"[CR] 10. VPLD TM - Order Status '{WAIT} (n)', highlighted rows, check box, column TM Review ([Edit] / [Approve]), [Approve Finish Order (n)]"
d = os.path.join(p['src_dir'], 'img', 'UISS_Screen_Daily_Order_Monitoring')
for f in os.listdir(SHOTS):
    if f[:2] in {str(n) for n in range(10, 19)} and '_cr_' in f: shutil.copyfile(os.path.join(SHOTS, f), os.path.join(d, f))
rev(s, '0.8', "[CR] UI review of CR Edit & Approve (user 16-Nov-26): counter button [Waiting TM Approval (n)] removed - the count is shown in the Order Status option; "
    "Edit / Approve moved from below the Action icon to the new column TM Review (Item 74, 77, 78 redefined, numbering unchanged); screenshots 10-18 retaken. No change of rules, messages or database.")
json.dump(s, open(p['src'], 'w'), indent=1, ensure_ascii=False); print('patched Daily 0.8')

# ---------------------------------------------------------------- Download report
p = locate('UISS_Report_Download_Daily_Order_Monitoring', R); s = json.load(open(p['src']))
for o in s['operation']:
    if o.get('marker') == 'b.' and 'counter' in o.get('text', ''):
        o['text'] = o['text'].replace('(if not All; also set by the [Waiting TM Approval (n)] counter)', f"(if not All; option '{WAIT} (n)' = {WAIT})")
rev(s, '0.7', '[CR] Text: Order Status filter no longer set by a counter button (removed on the screen, rev 0.8); no functional change.')
json.dump(s, open(p['src'], 'w'), indent=1, ensure_ascii=False); print('patched Download 0.7')
