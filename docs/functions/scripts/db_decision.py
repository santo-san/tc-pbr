"""Apply the conflict decision of 14-Nov-26 ("follow the existing application logic") to the UISS revised in [DB-R1].
For every UISS with a mapping file: conflict list -> decision + DB Change Request, field status Conflict -> Revised
(existing logic kept), Item Desc / Data Map conflict tags -> decision tags, revision row [DB-R2].
Also updates the mapping JSON (status / decision) so docs/review matrices can be regenerated.
Usage: python3 db_decision.py [repo]"""
import json, glob, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uiss_paths import locate
R = sys.argv[1] if len(sys.argv) > 1 else '.'
MARK, DATE, BY = '[DB-R2]', '14-Nov-26', 'Susanto'
DEC = json.load(open(os.path.join(R, 'docs/review/db-mapping/decisions.json')))
OLD_HEAD = 'Conflicts (UISS / code vs ELIPS schema) - application not changed'
NEW_HEAD = 'Conflicts resolved (decision 14-Nov-26): existing application logic kept; DB change requests (DCR) where the table cannot hold it'
missing_cols = {}

def walk(o, fn):
    if isinstance(o, dict):
        return {k: walk(v, fn) for k, v in o.items()}
    if isinstance(o, list):
        return [walk(x, fn) for x in o]
    return fn(o) if isinstance(o, str) else o

def apply(name):
    mp_path = os.path.join(R, 'docs/review/db-mapping', name + '.json')
    mp = json.load(open(mp_path)); src = locate(name, R)['src']; spec = json.load(open(src))
    if any(MARK in r['description'] for r in spec['revisions']):
        return 'already'
    conf = {c['id']: c for c in mp.get('conflicts', [])}
    def line(c):
        d = DEC[c['id']]
        return f"{c['id']} {c['topic']}: {d['decision']} " + (f"{d['dcr_id']}: {d['dcr']}." if d['dcr'] else 'No DB change: ' + 'mapping as stated.')
    def fix(s):
        s = s.replace(OLD_HEAD, NEW_HEAD)
        if s.startswith('G-') and s.split(' ')[0] in conf and 'Recommendation:' in s:
            return line(conf[s.split(' ')[0]])
        s = s.replace('] [Conflict]', '] [Revised - existing logic kept, see DCR]').replace(' [Conflict]', ' [Revised - existing logic kept, see DCR]')
        s = s.replace('DB: Conflict - ', 'DB: Existing logic kept (DCR) - ')
        def dm(m):
            col, tab = m.group(1), m.group(2)
            missing_cols.setdefault(tab, {}).setdefault(col, set()).add(name)
            return f'[DCR: {col} not in {tab} - existing logic kept, see DCR list]'
        s = re.sub(r'\[Conflict: (\w+) is not a column of ([\w.]+)\]', dm, s)
        return s
    spec = walk(spec, fix)
    # status column of the Database Specification table
    for blocks in (spec.get('operation') or [], spec.get('appendix') or []):
        for b in blocks:
            if b.get('type') == 'table' and b.get('columns') and b['columns'][-1]['title'] == 'Status':
                for r in b['rows']:
                    if r[-1] == 'Conflict':
                        r[-1] = 'Revised (DCR)'
                if not any('Revised (DCR)' in str(x) for x in b['columns']):
                    pass
            if b.get('type') == 'text' and b.get('text', '').startswith('Source of truth for tables'):
                b['text'] = b['text'].replace('Conflict = code / UISS rule not supported by the table',
                                              'Revised (DCR) = existing application logic kept, the table needs the DB change request listed below')
    spec['revisions'].append({'revision': f"{float(spec['revisions'][-1]['revision']) + 0.1:.1f}", 'author': BY, 'date': DATE, 'reviewed_by': '',
                              'description': f'{MARK} Conflicts resolved by decision 14-Nov-26: existing application logic kept; required DB changes listed as DB change requests (' +
                                             ', '.join(sorted({DEC[c]["dcr_id"] for c in conf if DEC[c]["dcr_id"]})) + ')' if any(DEC[c]['dcr_id'] for c in conf) else
                                             f'{MARK} Conflicts resolved by decision 14-Nov-26: existing application logic kept; no DB change needed'})
    spec['header']['updated_date'] = DATE
    json.dump(spec, open(src, 'w'), indent=1, ensure_ascii=False)
    # mapping file
    for f in mp['fields']:
        if f.get('status') == 'Conflict':
            f['status'] = 'Revised'; f['note'] = (f.get('note', '') + ' Decision: existing logic kept (DCR).').strip()
    for c in mp.get('conflicts', []):
        c.update(DEC[c['id']])
    json.dump(mp, open(mp_path, 'w'), indent=1)
    return spec['revisions'][-1]['revision']

for p in sorted(glob.glob(os.path.join(R, 'docs/review/db-mapping/UISS_*.json'))):
    n = os.path.basename(p)[:-5]
    print(n, apply(n))
json.dump({t: {c: sorted(u) for c, u in cols.items()} for t, cols in missing_cols.items()},
          open(os.path.join(R, 'docs/review/db-mapping/datamap_missing_columns.json'), 'w'), indent=1)
print('tables with data-map columns not in ELIPS:', len(missing_cols))
