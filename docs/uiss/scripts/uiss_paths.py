"""Locate a UISS in the per-function layout docs/uiss/<NN_Function>/{<name>.xlsx, src/<name>.json, src/img/<name>/}."""
import glob, os
def locate(name, repo='.'):
    hits = glob.glob(os.path.join(repo, 'docs/uiss', '*', 'src', name + '.json'))
    if len(hits) != 1:
        raise SystemExit(f'{name}: {len(hits)} source files found')
    src = hits[0]; folder = os.path.dirname(os.path.dirname(src))
    return {'folder': folder, 'src': src, 'src_dir': os.path.dirname(src), 'xlsx': os.path.join(folder, name + '.xlsx')}
def all_names(repo='.'):
    return sorted(os.path.basename(p)[:-5] for p in glob.glob(os.path.join(repo, 'docs/uiss', '*', 'src', 'UISS_*.json')))
