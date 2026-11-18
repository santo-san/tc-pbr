"""One-off (18-Nov-26): group the function folders by the application menu (sidebar order: Master, Daily, Monthly,
Service Acceptance) -> docs/functions/<NN_Menu>/<NN_Function>/. Uses git mv; rewrites relative Markdown links and
'docs/functions/<NN_Function>' path mentions in the repository text files. Usage: python3 group_by_menu.py <repo>"""
import json, os, re, subprocess, sys
R = os.path.abspath(sys.argv[1]); F = os.path.join(R, 'docs/functions')
GROUPS = {
    '01_Master': ['07_Master_Trucking_Company', '08_Master_Location', '09_Master_Mileage', '10_Master_Price', '11_Master_Priority', '12_Master_KPI',
                  '13_Master_Route_Percentage', '14_Master_Renban'],
    '02_Daily': ['01_Daily_Order_Monitoring', '02_Planning_Order_DTP', '03_Planning_Truck_Assignment', '04_Delivery_Note'],
    '03_Monthly': ['15_PR_Creation', '16_Monthly_PR_PO_Approval_Inquiry'],
    '04_Service_Acceptance': ['05_SA_Approval', '06_SA_Monitoring', '17_PAS_PR_Interface'],
    '05_Common': ['18_Menu_Authorization'],
}
MOVE = {f'docs/functions/{f}': f'docs/functions/{g}/{f}' for g, fs in GROUPS.items() for f in fs}

# 1. text files to fix (tracked), with their old path
files = subprocess.run(['git', '-C', R, 'ls-files'], check=True, capture_output=True, text=True).stdout.split('\n')
TEXT = ('.md', '.py', '.js', '.html', '.json', '.css')
todo = [f for f in files if f.endswith(TEXT) and '/test/src/' not in f and not f.startswith('docs/review/db-mapping/UISS_')
        and not f.endswith('restructure_folders.py') and not f.endswith('group_by_menu.py')]


def moved(path):
    for o, n in MOVE.items():
        if path == o or path.startswith(o + '/'):
            return n + path[len(o):]
    return path


LINK = re.compile(r'(\]\()([^)\s#]+)((?:#[^)\s]*)?\))')
contents = {f: open(os.path.join(R, f), encoding='utf-8').read() for f in todo}

# 2. move
for g, fs in GROUPS.items():
    os.makedirs(os.path.join(F, g), exist_ok=True)
    for f in fs:
        subprocess.run(['git', '-C', R, 'mv', f'docs/functions/{f}', f'docs/functions/{g}/{f}'], check=True)

# 3. rewrite: Markdown relative links (resolved against the old location) + plain path mentions
changed = 0
for old, s in contents.items():
    new = moved(old)
    t = s
    if old.endswith('.md'):
        def fix(m):
            target = m.group(2)
            if re.match(r'^[a-z]+:', target) or target.startswith('/'):
                return m.group(0)
            absold = os.path.normpath(os.path.join(os.path.dirname(old), target))
            rel = os.path.relpath(moved(absold), os.path.dirname(new))
            return m.group(1) + rel + m.group(3)
        t = LINK.sub(fix, t)
    for o, n in sorted(MOVE.items(), key=lambda x: -len(x[0])):
        t = re.sub(re.escape(o) + r'(?=[/`\s)"\'\],.;:]|$)', n, t)
    if t != s:
        open(os.path.join(R, new), 'w', encoding='utf-8').write(t); changed += 1

# 4. folders.json keys
p = os.path.join(F, 'folders.json'); d = json.load(open(p))
d['folders'] = {f'{g}/{k}': v for g, fs in GROUPS.items() for k in fs for kk, v in d['folders'].items() if kk == k}
d['groups'] = GROUPS
json.dump(d, open(p, 'w'), indent=1)
print('moved', len(MOVE), 'folders into', len(GROUPS), 'menu groups; rewrote', changed, 'files')
