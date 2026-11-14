"""12-db-change-requests.md: DB changes needed to keep the existing application logic (decision 14-Nov-26).
Usage: python3 make_dcr.py [repo]"""
import json, glob, os, re, sys
R = sys.argv[1] if len(sys.argv) > 1 else '.'
DEC = json.load(open(os.path.join(R, 'docs/review/db-mapping/decisions.json')))
MISS = json.load(open(os.path.join(R, 'docs/review/db-mapping/datamap_missing_columns.json')))
used = {}
for p in glob.glob(os.path.join(R, 'docs/review/db-mapping/UISS_*.json')):
    for c in json.load(open(p)).get('conflicts', []):
        used.setdefault(c['id'], set()).add(os.path.basename(p)[5:-5])
EXTRA_USE = {'G-GEN-04': {'all UISS with VERSION'}, 'G-MLC-05': {'Screen_Master_Location'}, 'G-DM-05': {'Screen_Daily_Order_Monitoring'}, 'G-COM-01': {'Screen_TCPBR_Menu_Authorization'}}
L = ['# 12 - DB Change Requests (keep the existing application logic)', '',
     'Decision 14-Nov-26 (user): for every conflict between the implemented logic (mock-up code / UISS) and the existing ELIPS tables,',
     '**the existing application logic is kept**. The changes below are what the ELIPS database needs so the implemented logic can be stored.',
     'Items without a DCR are solved by a mapping rule on the existing columns (see `07-gap-analysis.md`). Physical names follow the',
     'naming of the target table; new table names are proposals - TBD - Not confirmed with the DBA.', '',
     '| DCR | Change | Kept logic (decision) | Conflict | UISS |', '|---|---|---|---|---|']
for cid, d in DEC.items():
    if d['dcr_id']:
        L.append(f"| {d['dcr_id']} | {d['dcr']} | {d['decision'].replace('Existing logic kept: ', '')} | {cid} | {', '.join(sorted(used.get(cid, EXTRA_USE.get(cid, set()))))} |")
L += ['', '## Without DB change (mapping rule on existing columns)', '', '| Conflict | Kept logic / mapping |', '|---|---|']
L += [f"| {cid} | {d['decision'].replace('Existing logic kept: ', '')} |" for cid, d in DEC.items() if not d['dcr_id']]
L += ['', '## Appendix - Data Map columns not in the ELIPS table', '',
      'Columns named in UISS Data Map blocks (tagged `[DCR: ... not in <table>]`) checked against the DCR list: **DCR** = added by a DCR above;',
      '**align** = the column exists under another ELIPS name (see the UISS Database Specification) - rename in the next UISS revision.', '',
      '| Table | Column | Covered by | UISS |', '|---|---|---|---|']
ALIGN = {'STATUS': 'STATUS_CODE', 'CREATED_DT': 'CREATED_DATE', 'CREATED_DATE': 'CRETED_DATE (LOG_ACTIVITY_ORDER)', 'CHANGED_DT': 'UPDATED_DATE', 'UPDATED_DT': 'UPDATED_DATE',
         'START_DT': 'START_DATE', 'ORDER_DT': 'ORDER_DATE', 'CYCLE_NO': 'CYCLE_SEQ', 'TRUCK_NO': 'LICENSE_PLATE', 'PLATE': 'LICENSE_PLATE', 'ACTIVE_PLATE': 'LICENSE_PLATE',
         'DRIVER': 'DRIVER_ID', 'CYCLE_STATUS': 'STATUS_CODE', 'ORDER_STATUS': 'STATUS_CODE', 'DTP_DATE': 'DTP_HEADER.DTP_DATE', 'DTP_MODEL': 'DTP_HEADER.DTP_TYPE', 'DTP_TYPE': 'DTP_HEADER.DTP_TYPE',
         'COMPLETE_DATE': 'ORDER_CYCLE.COMPLETE_DATE', 'SA_NUMBER': 'SA_CODE', 'SA_DET_NO': 'SA_DETAIL_ID', 'COST': 'TOTAL_PRICE', 'ROUTE_CD': 'ROUTE_HEADER_ID / ORDER_ROUTE',
         'INTERFACE_STATUS': 'PAS_STATUS', 'INTERFACE_STS': 'PAS_STATUS (SA_DETAIL)', 'ORDER_NO': 'DTP_DET_ID', 'ROUTE_CODE': 'MS_ROUTE_DETAIL.ROUTE_CODE', 'ROUTE_DESCR': 'MS_ROUTE_DETAIL.ROUTE_DESCR',
         'APPROVED_BY': 'APPROVAL_BY', 'APPROVED_DT': 'APPROVAL_DATE / APPROVED_DATE', 'APV_BY': 'APPROVAL_BY', 'APV_APPROVAL_CLASS': 'APPROVAL_CLASS', 'PR_NO_DET': 'CRITERIA_DETAIL_FINAL_ID',
         'CRITERIA_PERIODE': 'PO_PERIODE / CRITERIA_SCORE_HEADER', 'PR_SEQ': 'CRITERIA_SCORE_HEADER.PR_SEQ', 'SA_CODE': 'SA_DETAIL / SA_HEADER_ID', 'TOTAL_PRICE': 'CRITERIA_SCORE_DETAIL_FINAL.TOTAL_PRICE',
         'PO_NUMBER': 'PO_DETAIL.PO_NUMBER', 'COMPANY_ID': 'PO_DETAIL.COMPANY_ID', 'SHARING_PCT': 'CRITERIA_SCORE_DETAIL_FINAL.TOTAL_ORDER_SHARING', 'TOTAL_QTY': 'CRITERIA_SCORE_DETAIL_FINAL.TOTAL_TRIP',
         'LP_NAME': 'MS_TRUCKING_COMPANY.COMPANY_NAME', 'SA_STATUS': 'STATUS_CODE', 'PROCESS_ID': 'LOG_ITGPAS.PROCESS_ID', 'ERROR_MESSAGE': 'ERROR_MSG (DCR)', 'NOTE': 'STS_MESSAGE', 'CYCLE_SEQ': 'ORDER_CYCLE.CYCLE_SEQ'}
auto, rows = {}, []
for t, cols in sorted(MISS.items()):
    tn = t.split('.')[-1]
    for c, u in sorted(cols.items()):
        if c.endswith('_'):
            continue   # fragment of 'PREV_ / NEW_ ...' in a Data Map cell
        dcrs = [d['dcr_id'] for d in DEC.values() if d['dcr'] and tn in d['dcr'] and re.search(r'\b' + re.escape(c) + r'\b', d['dcr'])]
        other = [(d['dcr_id'], d['dcr']) for d in DEC.values() if d['dcr'] and re.search(r'\b' + re.escape(c) + r'\b', d['dcr'])]
        if dcrs:
            cov = ', '.join(dcrs)
        elif c in ALIGN:
            cov = f'align -> {ALIGN[c]}'
        elif other:
            cov = f'align -> column of {other[0][0]} (other table)'
        else:
            auto.setdefault(t, []).append(c); cov = 'AUTO'
        rows.append([t, c, cov, ', '.join(x.replace('UISS_', '') for x in u)])
n = sum(1 for d in DEC.values() if d['dcr_id'])
ids = {}
for t in sorted(auto):
    n += 1; ids[t] = f'DCR-{n:02d}'
for r in rows:
    if r[2] == 'AUTO':
        r[2] = ids[r[0]]
    L.append('| ' + ' | '.join(r) + ' |')
L += ['', '## Additional DCR from the Data Map appendix (existing logic kept)', '',
      'Columns written by the existing logic as specified in the UISS Data Map with no ELIPS column and no other DCR. Types follow the UISS item definitions (TBD where the UISS has none).', '',
      '| DCR | Change | UISS |', '|---|---|---|']
for t in sorted(auto):
    us = sorted({x for c in auto[t] for x in MISS[t][c]})
    L.append(f"| {ids[t]} | ADD {t}: {', '.join(auto[t])} | {', '.join(x.replace('UISS_', '') for x in us)} |")
json.dump({ids[t]: {'table': t, 'columns': auto[t]} for t in auto}, open(os.path.join(R, 'docs/review/db-mapping/dcr_auto.json'), 'w'), indent=1)
open(os.path.join(R, 'docs/review/12-db-change-requests.md'), 'w').write('\n'.join(L) + '\n')
print('DCR', n, '| appendix rows', len(rows), '| auto tables', len(auto))
