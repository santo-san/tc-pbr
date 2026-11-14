"""Build ST test scripts. Usage: python3 run.py [module ...]  (module = file name without .py; default all)"""
import importlib, os, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from common import U, build
mods = sys.argv[1:] or sorted(os.path.basename(p)[:-3] for p in glob.glob(os.path.join(HERE, 'f*.py')))
for m in mods:
    mod = importlib.import_module(m)
    for name, fn in mod.SPECS.items():
        u = U(name)
        build(u, fn(u))
