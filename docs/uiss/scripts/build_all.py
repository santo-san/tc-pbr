"""Rebuild UISS workbooks from docs/uiss/<NN_Function>/src/<name>.json into docs/uiss/<NN_Function>/<name>.xlsx.
Usage: python3 build_all.py [<name> ...]   (no name = all)   [--repo .]
Screenshots are referenced as img/<name>/<file> relative to the src folder, so the build runs with cwd = src folder."""
import os, subprocess, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uiss_paths import locate, all_names
B = os.environ.get('UISS_BUILD', '/root/.claude/skills/synced/30108b0d-7bd1-4920-bfbd-a76581bc6013_353c87ad-7aa3-4c99-9601-f7d22005723e/uiss-generator/scripts/build_uiss.py')
ap = argparse.ArgumentParser(); ap.add_argument('names', nargs='*'); ap.add_argument('--repo', default='.')
a = ap.parse_args()
for n in a.names or all_names(a.repo):
    p = locate(n, a.repo)
    r = subprocess.run(['python3', B, os.path.abspath(p['src']), '-o', os.path.abspath(p['xlsx'])], capture_output=True, text=True, cwd=p['src_dir'])
    print(n, 'OK' if r.returncode == 0 else 'FAIL ' + r.stderr[-400:], flush=True)
