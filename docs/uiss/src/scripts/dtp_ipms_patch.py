# BEST -> IPMS: the DTP interface source of Planning Order is IPMS, not BEST.
import json, re, sys
S = sys.argv[1]
sub = lambda o: re.sub(r'\bBEST\b', 'IPMS', o) if isinstance(o, str) else [sub(x) for x in o] if isinstance(o, list) else {sub(k): sub(v) for k, v in o.items()} if isinstance(o, dict) else o

d = json.load(open(f"{S}/duiss/dtp_screen_spec_v03.json"))
revs = d['revisions']; d = sub({k: v for k, v in d.items() if k != 'revisions'}); d['revisions'] = revs
d['revisions'].append({"revision": "0.4", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "",
                       "description": "Interface source corrected: DTP records are received from IPMS (not BEST); labels, data source value, messages and screenshots updated"})
d['header']['updated_date'] = '13-Nov-26'
json.dump(d, open(f"{S}/duiss/dtp_screen_spec_v04.json", 'w'), indent=1)

u = json.load(open(f"{S}/duiss/dtp_upload_spec.json"))
revs = u['revisions']; u = sub({k: v for k, v in u.items() if k != 'revisions'}); u['revisions'] = revs
u['revisions'].append({"revision": "0.2", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "", "description": "DATA_SOURCE value BEST renamed to IPMS (interface source is IPMS)"})
u['header'].update({"updated_date": "13-Nov-26", "updated_by": "Susanto"})
json.dump(u, open(f"{S}/duiss/dtp_upload_spec_v02.json", 'w'), indent=1)
print(json.dumps(d).count('IPMS'), json.dumps(d).count('BEST'), json.dumps(u).count('IPMS'))
