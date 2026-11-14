"""Markdown data dictionary of the ELIPS tables used (or candidate) for TC-PBR functions. Source of truth: ELIPS_Schema.sql.
Usage: python3 make_dictionary.py ../schema.json ../schema-dictionary.md"""
import json, sys
t = json.load(open(sys.argv[1]))
GROUPS = [
 ('Master data', ['ielp.MS_TRUCKING_COMPANY', 'ielp.MS_TRUCKING_COMPANY_CY', 'ielp.MS_LOCATION', 'ielp.TB_M_MILEAGE', 'ielp.MS_ROUTE', 'ielp.MS_ROUTE_HEADER',
   'ielp.MS_ROUTE_DETAIL', 'ielp.MS_ROUTE_PRICE', 'ielp.MS_ROUTE_PERCENTAGE_HIST', 'ielp.MS_KPI', 'ielp.MS_KPI_PERCENTAGE', 'ielp.MS_RENBAN', 'ielp.MS_RENBAN_TCPBR',
   'ielp.MS_DRIVER', 'ielp.MS_TRUCK_REGISTRATION', 'ielp.MS_TRUCK', 'ielp.MS_STATUS', 'ielp.MS_SYSCODE', 'ielp.MS_WBS', 'ielp.TB_M_SYSTEM', 'ielp.ITG_ECAT']),
 ('DTP / Daily order', ['ielp.DTP_HEADER', 'ielp.DTP_1_DETAIL', 'ielp.DTP_2_DETAIL', 'ielp.DTP_3_DETAIL', 'ielp.DTP_4_DETAIL', 'ielp.DTP_FILES', 'ielp.ORDER_CYCLE',
   'ielp.ORDER_CYCLE_ROLLBACK_H', 'ielp.ORDER_CYCLE_MAINTENANCE_H', 'ielp.ORDER_TRUCK_H', 'ielp.ORDER_CTR_H', 'ielp.ORDER_FILES', 'ielp.ORDER_REMARK', 'ielp.LOG_CANCEL_FINISH_ORDER']),
 ('Service Acceptance', ['ielp.SA_HEADER', 'ielp.SA_DETAIL', 'ielp.SA_WBS_PERCENTAGE', 'ielp.SA_ROUTE_PRICE_TMP']),
 ('Monthly PR / PO (criteria)', ['ielp.CRITERIA_SCORE_HEADER', 'ielp.CRITERIA_SCORE_DETAIL', 'ielp.CRITERIA_SCORE_DETAIL_FINAL', 'ielp.CRITERIA_SCORE_DETAIL_ROUTE',
   'ielp.CRITERIA_SCORE_APPROVAL', 'ielp.CRITERIA_VOLUME_DETAIL', 'ielp.CRITERIA_LAST_ORDER', 'ielp.PO_HEADER', 'ielp.PO_DETAIL', 'ielp.PO_APPROVAL', 'ielp.PO_APPROVAL_EST',
   'ielp.TB_R_PR_DAILY', 'ielp.TB_R_PR_DAILY_DETAIL', 'ielp.TB_R_PR_SUMMARY']),
 ('Log / interface / user', ['ielp.LOG_ACTIVITY_ORDER', 'ielp.LOG_ACTIVITY_MASTER', 'ielp.LOG_ITGPAS', 'ielp.ITG_LOG', 'dbo.TB_R_LOG_H', 'dbo.TB_R_LOG_D', 'dbo.TB_M_MESSAGE',
   'ielp.TB_R_NOTIFICATION', 'ielp.USERID', 'ielp.USERID_DETAIL', 'ielp.USERID_CLASS', 'ielp.USERID_MENU_OPTION', 'ielp.MASTER_MENU']),
]
L = ['# ELIPS schema - data dictionary of the tables relevant to TC-PBR', '',
     'Generated from `docs/db/ELIPS_Schema.sql` (script date 11/14/2026, database AE070_ILS_DB) by `scripts/make_dictionary.py`.',
     'Everything below is **confirmed by schema**. No sample data was provided, so value patterns are not described here.',
     'Legend: PK = primary key column, NN = NOT NULL, default as scripted.', '',
     f'Schema totals: {len(t)} tables, {sum(len(v["columns"]) for v in t.values())} columns, {sum(1 for v in t.values() if v["pk"])} tables with a PK, '
     f'{sum(len(v["fks"]) for v in t.values())} foreign keys, {sum(len(v["defaults"]) for v in t.values())} defaults, no views / procedures / triggers in the script.', '']
for g, names in GROUPS:
    L += [f'## {g}', '']
    for n in names:
        v = t.get(n)
        if not v:
            L += [f'### {n}', '', '_Not in the schema._', '']; continue
        L += [f'### {n}', '', f'PK: {", ".join(v["pk"]) or "**none**"}' + (f' · FK: ' + '; '.join(f'{",".join(f["cols"])} -> {f["ref"]}({",".join(f["ref_cols"])})' for f in v['fks']) if v['fks'] else ' · FK: none'), '',
              '| # | Column | Type | NN | PK | Default |', '|---|---|---|---|---|---|']
        for i, c in enumerate(v['columns'], 1):
            L.append(f'| {i} | {c["name"]} | {c["type"]}{" IDENTITY" if c["identity"] else ""} | {"" if c["null"] else "Y"} | {"Y" if c["name"] in v["pk"] else ""} | {v["defaults"].get(c["name"], "")} |')
        L.append('')
open(sys.argv[2], 'w').write('\n'.join(L) + '\n')
print('ok', sum(len(n) for _, n in GROUPS), 'tables')
