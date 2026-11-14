"""Revise a UISS source JSON against the ELIPS schema (AE070_ILS_DB) using a mapping file.

Usage:
    python3 db_revision.py <mapping.json> [--repo <repo root>] [--check]

Mapping file (docs/review/db-mapping/<UISS name>.json):
{
  "uiss": "UISS_Screen_Master_Trucking_Company",          // docs/uiss/<NN_Function>/src/<uiss>.json
  "revision": "Database mapping revised to ELIPS ...",     // revision text (row appended once, marker "[DB-R1]")
  "replace": {"Trucking Company Master (TBD)": "ielp.MS_TRUCKING_COMPANY", ...},   // text replacements, whole spec
  "fields": [                                              // UI element -> DB (drives Item Desc + DB spec table)
    {"ui": "Vendor Name", "items": ["Vendor Name"],        // item names to update (all occurrences); [] = none
     "table": "ielp.MS_TRUCKING_COMPANY", "column": "COMPANY_NAME",
     "rw": "R/W", "mapping": "TRIM, UPPER", "evidence": "Schema; Code master-trucking.js normalize",
     "status": "Verified|Revised|Conflict|TBD|Missing", "note": "..."}
  ],
  "conflicts": [{"id": "G-MTC-01", "topic": "...", "uiss": "...", "code": "...", "db": "...", "data": "...", "recommendation": "..."}],
  "tbd": ["..."]
}
Table / column / type / length / nullability / default always come from docs/db/schema.json (never typed by hand).
"""
import argparse, copy, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uiss_paths import locate

MARK = '[DB-R1]'
DATE = '14-Nov-26'
AUTHOR = 'Susanto'


def load_schema(repo):
    return json.load(open(os.path.join(repo, 'docs/db/schema.json')))


def col_info(schema, table, column):
    t = schema.get(table)
    if not t:
        return None
    for c in t['columns']:
        if c['name'] == column:
            return {**c, 'pk': column in t['pk'], 'default': t['defaults'].get(column)}
    return None


def split_type(tp):
    """'varchar(500)' -> ('Varchar', '500'); 'decimal(18, 0)' -> ('Decimal', '18,0'); 'datetime' -> ('Datetime', '')."""
    m = re.match(r'(\w+)(?:\((.*)\))?', tp)
    name, ln = m.group(1), (m.group(2) or '').replace(' ', '')
    return name[:1].upper() + name[1:], ln


def replace_all(obj, rep):
    keys = sorted(rep, key=len, reverse=True)
    def sub(s):
        for k in keys:
            if k in s:
                s = s.replace(k, rep[k])
        return s
    if isinstance(obj, str):
        return sub(obj)
    if isinstance(obj, list):
        return [replace_all(x, rep) for x in obj]
    if isinstance(obj, dict):
        return {k: replace_all(v, rep) for k, v in obj.items()}
    return obj


def db_text(f, info):
    if not f.get('table'):
        return f"DB: {f.get('status', 'TBD')} - {f.get('note') or 'TBD - Not confirmed from existing schema/data/code'}"
    if not info:
        return f"DB: {f['table']}.{f.get('column', '?')} - column not in ELIPS schema ({f.get('status', 'Conflict')})"
    tp = info['type'] + (' NOT NULL' if not info['null'] else ' NULL') + (' PK' if info['pk'] else '') + (f" default {info['default']}" if info['default'] else '')
    return f"DB: {f['table']}.{f['column']} {tp} [{f.get('status', 'Revised')}]"


def apply(mapping, repo, check=False):
    schema = load_schema(repo)
    p = locate(mapping['uiss'], repo)['src']
    spec = json.load(open(p))
    if any(MARK in r.get('description', '') for r in spec['revisions']):
        print(mapping['uiss'], ': already revised', MARK); return None
    problems = []
    spec = replace_all(spec, mapping.get('replace', {}))
    kind = spec['doc_type']
    # ---- batch table definitions of existing ELIPS tables come from the schema
    for t in spec.get('tables') or []:
        if t.get('name') in schema:
            st = schema[t['name']]
            t['proposed'] = False
            t['description'] = 'Existing ELIPS table (columns from ELIPS_Schema.sql)'
            t['columns'] = [[c['name'], c['type'].upper(), 'Y' if c['name'] in st['pk'] else '', 'Y' if c['null'] else 'N',
                             ('default ' + st['defaults'][c['name']]) if c['name'] in st['defaults'] else ''] for c in st['columns']]
        elif t.get('name'):
            t['proposed'] = True
            if 'not in ELIPS' not in t.get('description', ''):
                t['description'] = (t.get('description', '') + ' - proposed, not in ELIPS schema').strip(' -')
    # ---- items
    items = spec.get('items', [])
    for f in mapping.get('fields', []):
        info = col_info(schema, f['table'], f['column']) if f.get('table') and f.get('column') else None
        if f.get('table') and f.get('column') and not info and f.get('status') not in ('Conflict', 'Missing', 'TBD'):
            problems.append(f"{f['ui']}: {f['table']}.{f['column']} not in schema")
        f['_info'] = info
        for name in (f.get('items', []) if 'items' in spec else []):
            hit = [i for i in items if i.get('name') == name]
            if not hit:
                problems.append(f"item '{name}' not found"); continue
            for i in hit:
                if info:
                    tn, ln = split_type(info['type'])
                    if kind == 'report':
                        i['source'] = f['table']; i['field'] = f['column']
                    else:
                        i['source'] = f['table']; i['field'] = f['column']; i['type'] = tn; i['len'] = ln or '-'
                elif f.get('table') is None:
                    i['source'] = i.get('source') or 'TBD'
                key = 'remarks' if kind == 'report' else 'description'
                note = db_text(f, info) + (f" {f['note']}" if f.get('note') and info else '')
                i[key] = (i.get(key, '') + ('\n' if i.get(key) else '') + note).strip()
    # ---- data map: check destination columns exist
    for b in (spec.get('data_map') or {}).get('blocks', []):
        dest = b.get('destination', {})
        t = dest.get('table')
        if t in schema:
            cols = {c['name'] for c in schema[t]['columns']}
            for m in b.get('mappings', []):
                for fld in re.split(r'\s*/\s*|,\s*', m.get('dest_field', '')):
                    fld = fld.strip()
                    if re.fullmatch(r'[A-Z][A-Z0-9_]{3,}', fld) and fld not in cols:
                        m['description'] = (m.get('description', '') + f' [Conflict: {fld} is not a column of {t}]').strip()
                        problems.append(f'data map {t}: {fld} not in table')
            nn = [c['name'] for c in schema[t]['columns'] if not c['null'] and not schema[t]['defaults'].get(c['name'])]
            mapped = ' '.join(m.get('dest_field', '') for m in b.get('mappings', []))
            miss = [c for c in nn if c not in mapped]
            if dest.get('operation') == 'Insert' and miss:
                b.setdefault('mappings', []).append({'dest_field': ', '.join(miss), 'description': 'NOT NULL in ELIPS without default - value TBD - Not confirmed from existing schema/data/code'})
    # ---- database specification section
    rows = []
    for f in mapping.get('fields', []):
        info = f['_info']
        rows.append([f['ui'], f"{f['table']}.{f['column']}" if f.get('table') else 'TBD',
                     (info['type'] if info else '-'), ('Y' if info and not info['null'] else ('N' if info else '-')),
                     f.get('rw', 'R'), f.get('mapping', '-'), f.get('status', 'TBD')])
    blocks = [{'type': 'heading', 'text': "Database Specification (ELIPS AE070_ILS_DB)"},
              {'type': 'text', 'text': 'Source of truth for tables / columns / types: docs/db/ELIPS_Schema.sql. No sample data was available: value lists and status codes are TBD. Status: Verified = UISS already matched the schema; Revised = changed to the schema in this revision; Conflict = code / UISS rule not supported by the table; TBD = not confirmed.', 'level': 0},
              {'type': 'table', 'level': 0, 'row_lines': 'all',
               'columns': [{'title': 'UI field / element', 'width': 9}, {'title': 'Table.Column', 'width': 13}, {'title': 'Type', 'width': 6},
                           {'title': 'NN', 'width': 2}, {'title': 'R/W', 'width': 3}, {'title': 'Mapping / rule', 'width': 9}, {'title': 'Status', 'width': 4}],
               'rows': rows}]
    if mapping.get('conflicts'):
        blocks.append({'type': 'text', 'text': 'Conflicts (UISS / code vs ELIPS schema) - application not changed', 'bold': True, 'level': 0})
        blocks.append({'type': 'bullets', 'marker': '-', 'level': 0, 'items': [f"{c['id']} {c['topic']}: UISS / code: {c.get('uiss') or c.get('code')}. DB: {c['db']}. Recommendation: {c['recommendation']}" for c in mapping['conflicts']]})
    if mapping.get('tbd'):
        blocks.append({'type': 'text', 'text': 'TBD - Not confirmed from existing schema/data/code', 'bold': True, 'level': 0})
        blocks.append({'type': 'bullets', 'marker': '-', 'level': 0, 'items': mapping['tbd']})
    target = {'screen': 'operation', 'report': 'operation', 'batch': 'appendix'}[kind]
    if kind == 'screen' or kind == 'report':
        spec.setdefault(target, []).extend([{'type': 'page_break'}] + blocks)
    else:
        spec['appendix'] = blocks + (spec.get('appendix') or [])
    # ---- revision
    last = spec['revisions'][-1]['revision']
    new = f"{float(last) + 0.1:.1f}"
    spec['revisions'].append({'revision': new, 'author': AUTHOR, 'date': DATE, 'reviewed_by': '',
                              'description': f"{MARK} {mapping['revision']}"})
    spec['header']['updated_date'] = DATE; spec['header']['updated_by'] = AUTHOR
    for f in mapping.get('fields', []):
        f.pop('_info', None)
    if problems:
        print(mapping['uiss'], 'PROBLEMS:', *problems, sep='\n  ')
    if not check:
        json.dump(spec, open(p, 'w'), indent=1, ensure_ascii=False)
    return new, problems


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('mapping', nargs='+'); ap.add_argument('--repo', default='.'); ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    for m in a.mapping:
        r = apply(json.load(open(m)), a.repo, a.check)
        if r:
            print(os.path.basename(m), '-> rev', r[0], '| problems', len(r[1]))
