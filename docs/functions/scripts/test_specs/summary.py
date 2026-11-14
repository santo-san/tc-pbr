"""Write docs/functions/TEST_SCRIPTS.md: one row per UISS with its ST test script, cases per group and coverage.
Run after run.py (uses the spec JSON in docs/functions/<NN>/test/src/ and the message / log counts of the UISS source)."""
import glob, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from common import U, REPO
rows, tot = [], [0, 0, 0]
for sp in sorted(glob.glob(os.path.join(REPO, 'docs/functions/*/test/src/*_test_spec.json'))):
    name = os.path.basename(sp)[:-len('_test_spec.json')]
    s, u = json.load(open(sp)), U(name)
    fd = os.path.relpath(os.path.dirname(os.path.dirname(os.path.dirname(sp))), os.path.join(REPO, 'docs/functions'))
    fn = re.sub(r'[^A-Za-z0-9]+', '_', s['header']['function_name']).strip('_')
    groups = [(g['title'], sum(1 for i in g['items'] if 'key' in i)) for g in s['groups']] + ([('Abnormal', len(s['abnormal']))] if s['abnormal'] else [])
    n = sum(c for _, c in groups)
    tot[0] += n; tot[1] += len(u.msgs); tot[2] += len(u.logs)
    rows.append(f"| {fd} | {name} ({s['header']['uiss_rev']}) | [ST-ELIPS_TBD_{fn}.xlsx]({fd}/test/ST-ELIPS_TBD_{fn}.xlsx) | {n} | "
                f"{', '.join(f'{t} {c}' for t, c in groups)} | {len(u.msgs)} / {len(u.logs)} |")
out = ['# ST test scripts (Integrated Function Test)', '',
       'Generated with the `anthropic-skills:uiss-test-script` skill from the UISS of each function (compact style: validations the UISS',
       'shows together are one case, value variants in Test Data tables). Every Display Message and Logging Message of the UISS is covered',
       'by at least one case (coverage checked by the build). Database checks use the ELIPS table names of the revised UISS; columns marked',
       '[DCR] need the DB change requests of [../review/12](../review/12-db-change-requests.md).', '',
       'Rebuild after a UISS change: edit `scripts/test_specs/f_*.py` (spec per UISS), then',
       '`python3 docs/functions/scripts/test_specs/run.py [module]` and `python3 docs/functions/scripts/test_specs/summary.py`.', '',
       '| Folder | UISS (rev) | Test script | Cases | Cases per group | Msg / Log covered |', '|---|---|---|---|---|---|', *rows,
       f'| **Total** | {len(rows)} UISS | | **{tot[0]}** | | {tot[1]} / {tot[2]} |', '',
       'Function ID, tester and programmer are blank / TBD in the Cover sheet (not given in the UISS).', '']
open(os.path.join(REPO, 'docs/functions/TEST_SCRIPTS.md'), 'w').write('\n'.join(out))
print(len(rows), 'UISS,', tot[0], 'cases')
