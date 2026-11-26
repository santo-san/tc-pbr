"""User review 2 (26-Nov-26): PR Detail pop-up of PR Creation without Route Percentage and Number of Orders.
UISS_Screen_PR_Creation 0.6. Usage: python3 pr_creation_detail_v06.py <repo> <screenshot dir>   (run once)"""
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uiss_paths import locate
R, SHOTS = sys.argv[1], sys.argv[2]
p = locate('UISS_Screen_PR_Creation', R); s = json.load(open(p['src']))
assert s['revisions'][-1]['revision'] == '0.5'

# Item Desc: drop the two pop-up columns (they are the last group, so earlier item numbers do not change)
grp = next(i for i, r in enumerate(s['items']) if r.get('group', '').startswith('<PR Detail Pop-up'))
s['items'] = s['items'][:grp + 1] + [r for r in s['items'][grp + 1:] if r.get('name') not in ('Route Percentage', 'Number of Orders')]
for r in s['items'][grp + 1:]:
    if r.get('name') == 'Total Cost (row)':
        r['description'] = ("'Total Cost (IDR/Day)' = Delivery Cost (IDR/Day) of the List Summary = Σ (Planned Cost × orders per day of the route). "
                            "The orders per day (Order Sharing × Route % ÷ Σ active Route %) are used in the calculation (5.3) but not shown (OP-14).\n"
                            + r['description'].split('\n', 1)[1])
    if r.get('name') == 'Route':
        r['description'] = r['description'].replace('Active routes of Master Route Percentage', 'Active routes of Master Route Percentage (code and description)')

for o in s['operation']:
    if o.get('type') == 'item' and o.get('text', '').startswith('No header information. Table:'):
        o['text'] = ('No header information. Table: Route, Distance (Km), Planned Cost (IDR), then the Total Cost (IDR/Day) row (= Delivery Cost of the List Summary). '
                     'Route Percentage and Number of Orders are not shown (user review 26-Nov-26); they remain part of the calculation (5.3). Data from Master Route Percentage. Sticky header / footer; scrolls.')
    if o.get('type') == 'bullets':
        o['items'] = [x.replace('the pop-up shows the sum in the Total Cost row.', 'only the sum is shown, as the Total Cost row of the pop-up (orders per day not displayed).')
                      if isinstance(x, str) else x for x in o['items']]
for c in s['screen_layout']:
    if c['image'].endswith('c03_detail.png'):
        c['caption'] = '5. PR Detail pop-up - read only: Route, Distance, Planned Cost, Total Cost (IDR/Day) row, close with x (HTML mock-up)'
shutil.copyfile(os.path.join(SHOTS, 'c03_detail.png'), os.path.join(p['src_dir'], 'img', 'UISS_Screen_PR_Creation', 'c03_detail.png'))
s['revisions'].append({'revision': '0.6', 'author': 'Susanto', 'date': '26-Nov-26', 'reviewed_by': '',
                       'description': 'PR Detail pop-up: columns Route Percentage and Number of Orders removed (user review); Item Desc of the pop-up renumbered (24-28), Operation Desc 5.3 / 5.7 and screenshot 5 updated. Calculation unchanged.'})
s['header']['updated_date'] = '26-Nov-26'
json.dump(s, open(p['src'], 'w'), indent=1, ensure_ascii=False)
print('patched PR Creation 0.6')
