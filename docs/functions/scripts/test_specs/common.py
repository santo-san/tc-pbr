"""Helpers to write ST test-script specs (uiss-test-script skill format) for the TC-PBR UISS.
Message / log texts are read from the UISS source JSON so expected results quote them exactly.
Each <function>.py module defines SPECS = {uiss_name: spec}; run.py builds them into docs/functions/<NN>/test/."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..'))
from uiss_paths import locate
SKILL = os.environ.get('UISS_TEST_SKILL', '/root/.claude/skills/synced/30108b0d-7bd1-4920-bfbd-a76581bc6013_353c87ad-7aa3-4c99-9601-f7d22005723e/uiss-test-script')
PROJECT = 'ELIPS Enhancement (TC-PBR)'


class U:
    """One UISS: messages, logs, header facts."""
    def __init__(self, name):
        self.name = name
        self.p = locate(name, REPO)
        self.s = json.load(open(self.p['src']))
        self.msgs = [m for m in self.s.get('display_messages', []) if 'event' in m]
        self.logs = self.s.get('logging_messages', [])

    def M(self, n, fill=None):
        m = self.msgs[n - 1]
        t = m['message']
        for k, v in (fill or {}).items():
            t = t.replace('{' + k + '}', v)
        return f"Msg no.{n} ({m['type']}): '{t}'"

    def L(self, n, fill=None):
        m = self.logs[n - 1]
        t = m['message']
        for k, v in (fill or {}).items():
            t = t.replace('<' + k + '>', v).replace('{' + k + '}', v)
        return f"Log no.{n} ({m['type']}): '{t}'"

    def header(self, **kw):
        h = self.s['header']
        fn = re.sub(r'^TBD\s+', '', h.get('function_name', self.name))
        return {'doc_type': self.s['doc_type'], 'project': PROJECT, 'function_id': 'TBD', 'function_name': fn,
                'uiss_name': self.name.replace('_', ' ').replace('UISS ', 'UISS-', 1), 'uiss_rev': self.s['revisions'][-1]['revision'],
                'sa_name': h.get('created_by', ''), 'tester': '', 'programmer': '', **kw}


def C(key, case, ref, proc, exp, tbd=None, execution=None, condition=None):
    d = {'key': key, 'case': case, 'ref': ref, 'procedure': proc, 'expected': exp}
    if tbd: d['tbd'] = tbd
    if execution: d['execution'] = execution
    if condition: d['condition'] = condition
    return d


def LOGCHK(fid='TBD'):
    return {'text': 'Open Log Monitoring screen', 'detail': ['Search with the following criteria:', 'Process ID: (Process ID of the run)', f'Function ID: {fid}', 'User Name: (All)']}


def build(u, spec):
    folder = os.path.dirname(u.p['folder'])          # docs/functions/<NN>
    tdir = os.path.join(folder, 'test'); sdir = os.path.join(tdir, 'src')
    os.makedirs(sdir, exist_ok=True)
    fn = re.sub(r'[^A-Za-z0-9]+', '_', spec['header']['function_name']).strip('_')
    out = os.path.join(tdir, f'ST-ELIPS_TBD_{fn}.xlsx')
    sp = os.path.join(sdir, f'{u.name}_test_spec.json')
    json.dump(spec, open(sp, 'w'), indent=1, ensure_ascii=False)
    tmp = os.path.join('/tmp', 'uiss_dump_' + u.name)
    os.makedirs(tmp, exist_ok=True)
    subprocess.run(['python3', os.path.join(SKILL, 'scripts/read_uiss.py'), u.p['xlsx'], '-o', os.path.join(tmp, 'dump.md')], check=True, capture_output=True)
    r = subprocess.run(['python3', os.path.join(SKILL, 'scripts/build_test_script.py'), sp, '--uiss-index', os.path.join(tmp, 'dump_index.json'), '-o', out],
                       capture_output=True, text=True)
    if r.returncode:
        print(u.name, 'FAILED', r.stderr[-800:]); return None
    rep = json.loads(r.stdout)
    short = {k: rep.get(k) for k in ('test_cases', 'messages_not_covered', 'items_not_referenced', 'log_messages_not_covered', 'warnings') if rep.get(k) not in (None, [])}
    print(u.name, '->', os.path.relpath(out, REPO), short)
    return rep
