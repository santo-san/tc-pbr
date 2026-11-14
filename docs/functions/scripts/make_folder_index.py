"""Write docs/functions/<NN_Function>/uiss/README.md and docs/functions/README.md (index) from folders.json, the UISS sources and the
review mapping files. Usage: python3 make_folder_index.py [repo]"""
import json, glob, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uiss_paths import locate
R = sys.argv[1] if len(sys.argv) > 1 else '.'
info = json.load(open(os.path.join(R, 'docs/functions/folders.json')))['folders']
FUNC = {'01': ('DM-01..DM-11, DM-04', 'app.js, workflow.js'), '02': ('DTP-01..DTP-13, DTP-05 (IPMS)', 'dtp.js, dtp-rules.js'), '03': ('TA-01..TA-05, DTP-16', 'truck-assign.js, workflow.js'),
 '04': ('DM-12..DM-14, INT-03', 'delivery-note.js, dn-rules.js, dn-pdf.js'), '05': ('SA-01..SA-03', 'sa.js, sa-rules.js'), '06': ('SA-04..SA-07, INT-04', 'sa-monitoring.js, sa-pas-rules.js'),
 '07': ('MTC-01..03', 'master.js, master-trucking.js'), '08': ('MLC-01..03', 'location.js, master-location.js'), '09': ('MML-01..04', 'mileage.js, master-mileage.js'),
 '10': ('MPR-01', 'price.js, master-price.js'), '11': ('MPY-01..02', 'priority.js, master-priority.js'), '12': ('MKP-01..02', 'kpi.js, master-kpi.js'),
 '13': ('MRP-01..02', 'route-percentage.js, master-route-percentage.js'), '14': ('MRB-01..02', 'renban.js, master-renban.js'), '15': ('PRC-01..02', 'pr-creation.js, pr-creation-rules.js, pr-sources.js'),
 '16': ('PRI-01, PRA-01..02, POA-01, POI-01', 'monthly.js, monthly-workflow.js'), '17': ('INT-01..02', '(Talend - existing tJava in this folder)'), '18': ('COM-01..02', 'index.html, master.html, monthly.html, app.js, workflow.js')}
rows = []
for folder, v in info.items():
    d = os.path.join(R, 'docs/functions', folder, 'uiss'); fd = os.path.join(R, 'docs/functions', folder); fid, code = FUNC[folder[:2]]
    L = [f'# {folder[3:].replace("_", " ")}', '', f'Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): {fid}  ', f'Code: {code}', '',
         '| UISS | Type | Revision | Source | Screenshots |', '|---|---|---|---|---|']
    tables = set()
    for n in v['uiss']:
        p = locate(n, R); s = json.load(open(p['src']))
        img = len(glob.glob(os.path.join(p['src_dir'], 'img', n, '*')))
        L.append(f"| [{n}](uiss/{n}.xlsx) | {s['doc_type']} | {s['revisions'][-1]['revision']} ({s['revisions'][-1]['date']}) | [uiss/src/{n}.json](uiss/src/{n}.json) | {img} |")
        m = os.path.join(R, 'docs/review/db-mapping', n + '.json')
        if os.path.exists(m):
            tables |= {f['table'] for f in json.load(open(m))['fields'] if f.get('table')}
        rows.append((folder, n, s['doc_type'], s['revisions'][-1]['revision']))
    L += ['', 'Rules / specification (`uiss/`):', ''] + [f'- [{x}](uiss/{x})' for x in sorted(os.listdir(d)) if x.endswith(('.md', '.java', '.xlsx')) and not x.startswith('UISS_')]
    tests = sorted(x for x in os.listdir(os.path.join(fd, 'test')) if x.endswith('.xlsx')) if os.path.isdir(os.path.join(fd, 'test')) else []
    L += ['', 'ST test scripts (`test/`, generated with the uiss-test-script skill; spec JSON in `test/src/`):', ''] + ([f'- [{x}](test/{x})' for x in tests] or ['- (none yet)'])
    L += ['', 'ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): ' + (', '.join(f'`{t}`' for t in sorted(tables)) or 'see UISS'), '',
          'Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).', '',
          'Rebuild: `python3 docs/functions/scripts/build_all.py ' + ' '.join(v['uiss']) + '`']
    open(os.path.join(fd, 'README.md'), 'w').write('\n'.join(L) + '\n')
I = ['# TC-PBR functions - one folder per function', '',
     'Every folder `<NN_Function>/` has `uiss/` (UISS workbooks of the function - screen plus the batch / report UISS that serve it - the rules / specification `.md`,',
     'and `src/` with the spec JSON of each workbook and its screenshots `src/img/<UISS>/`) and `test/` (ST Integrated Function Test scripts, spec JSON in `test/src/`). The workbook is generated from the JSON with the',
     '`anthropic-skills:uiss-generator` skill; `scripts/build_all.py` rebuilds one or all workbooks (cwd = `src/`, image paths relative).', '',
     '| Folder | UISS | Type | Rev |', '|---|---|---|---|'] + [f'| [{f}]({f}/README.md) | [{n}]({f}/uiss/{n}.xlsx) | {t} | {r} |' for f, n, t, r in rows] + ['',
     'Shared scripts (`scripts/`): `uiss_paths.py` (locate a UISS), `build_all.py`, `db_revision.py` (revision against the ELIPS schema with `docs/review/db-mapping/*.json`),',
     '`missing_uiss_gen.py` (UISS created in the review), `make_folder_index.py` (these READMEs) and the historical patch / generator scripts (run before the folder layout; they take the src folder as argument).', '',
     'Database: `docs/db/` (ELIPS schema, dictionary). Review deliverables: `docs/review/`.']
open(os.path.join(R, 'docs/functions/README.md'), 'w').write('\n'.join(I) + '\n')
print('written', len(info), 'folder READMEs +', len(rows), 'UISS in index')
