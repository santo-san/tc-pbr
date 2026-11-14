import re, json, sys
src = open(sys.argv[1]).read()
tables = {}
# CREATE TABLE blocks
for m in re.finditer(r'CREATE TABLE \[(\w+)\]\.\[(\w+)\]\((.*?)\n\)\s*ON', src, re.S):
    sch, name, body = m.groups()
    key = f'{sch}.{name}'
    cols, pk = [], []
    for line in body.split('\n'):
        line = line.strip().rstrip(',')
        cm = re.match(r'\[(\w+)\]\s+\[(\w+)\](\(([^)]*)\))?\s*(IDENTITY\([^)]*\))?\s*(NOT NULL|NULL)?', line)
        if cm:
            cols.append({'name': cm.group(1), 'type': cm.group(2) + (f'({cm.group(4)})' if cm.group(4) else ''),
                         'identity': bool(cm.group(5)), 'null': cm.group(6) != 'NOT NULL'})
    pm = re.search(r'PRIMARY KEY (?:CLUSTERED|NONCLUSTERED)?\s*\((.*?)\)', body, re.S)
    if pm:
        pk = re.findall(r'\[(\w+)\]', pm.group(1))
    uq = [re.findall(r'\[(\w+)\]', u) for u in re.findall(r'UNIQUE (?:CLUSTERED|NONCLUSTERED)?\s*\((.*?)\)', body, re.S)]
    tables[key] = {'schema': sch, 'name': name, 'columns': cols, 'pk': pk, 'unique': uq, 'defaults': {}, 'fks': [], 'checks': []}
# defaults
for m in re.finditer(r'ALTER TABLE \[(\w+)\]\.\[(\w+)\] ADD\s+(?:CONSTRAINT \[\w+\]\s+)?DEFAULT \((.*?)\) FOR \[(\w+)\]', src):
    k = f'{m.group(1)}.{m.group(2)}'
    if k in tables: tables[k]['defaults'][m.group(4)] = m.group(3)
for m in re.finditer(r'ALTER TABLE \[(\w+)\]\.\[(\w+)\]\s+WITH (?:NO)?CHECK ADD\s+CONSTRAINT \[(\w+)\] FOREIGN KEY\((.*?)\)\s*REFERENCES \[(\w+)\]\.\[(\w+)\] \((.*?)\)', src, re.S):
    k = f'{m.group(1)}.{m.group(2)}'
    if k in tables: tables[k]['fks'].append({'name': m.group(3), 'cols': re.findall(r'\[(\w+)\]', m.group(4)), 'ref': f'{m.group(5)}.{m.group(6)}', 'ref_cols': re.findall(r'\[(\w+)\]', m.group(7))})
for m in re.finditer(r'ALTER TABLE \[(\w+)\]\.\[(\w+)\]\s+WITH (?:NO)?CHECK ADD\s+CONSTRAINT \[(\w+)\] CHECK \((.*?)\)\s*\nGO', src, re.S):
    k = f'{m.group(1)}.{m.group(2)}'
    if k in tables: tables[k]['checks'].append(m.group(4).strip())
json.dump(tables, open(sys.argv[2], 'w'), indent=1)
print(len(tables), 'tables;', sum(len(t['columns']) for t in tables.values()), 'columns;', sum(len(t['fks']) for t in tables.values()), 'FKs;',
      sum(1 for t in tables.values() if t['pk']), 'with PK;', sum(len(t['defaults']) for t in tables.values()), 'defaults;', sum(len(t['checks']) for t in tables.values()), 'checks')
# Usage: python3 parse_schema.py ../ELIPS_Schema.sql ../schema.json   (input converted from UTF-16 to UTF-8)
