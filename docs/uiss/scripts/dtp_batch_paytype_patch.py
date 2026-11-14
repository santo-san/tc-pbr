# Payment Type per DTP (KM-13..KM-15) in the DTP batch UISS: Excel Upload rev 0.3, Queue Processing rev 0.2, DTP Switching rev 0.2
import json, sys
S = sys.argv[1]
COL = ["PAY_TYPE", "VARCHAR(12)", "", "Y", "Payment Type 'By Resources' / 'By Trip' chosen by the planner (proposed, KM-13); default KM-14"]
REV = lambda r, txt: {"revision": r, "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "", "description": txt}
def add_col(spec):
    for t in spec.get('tables', []):
        if t['name'] == 'TB_R_DTP_RECORD' and not any(c[0] == 'PAY_TYPE' for c in t['columns']):
            i = next(k for k, c in enumerate(t['columns']) if c[0] == 'STATUS'); t['columns'].insert(i, COL)

# ---- Excel Upload ----
u = json.load(open(f"{S}/duiss/dtp_upload_spec_v02.json"))
u['revisions'].append(REV("0.3", "TB_R_DTP_RECORD.PAY_TYPE (Payment Type per DTP): default set when the uploaded rows are saved (By Resources while the trucking company has a free By Resources Daily Trip on the date, else By Trip; KM-14)"))
add_col(u)
for b in u['data_map']['blocks']:
    if b['destination']['table'] == 'TB_R_DTP_RECORD' and b['destination']['operation'] == 'Insert':
        i = next(k for k, m in enumerate(b['mappings']) if m['dest_field'] == 'STATUS')
        b['mappings'].insert(i, {"dest_field": "PAY_TYPE", "description": "Default KM-14: 'By Resources' while the LP has a free By Resources Daily Trip on PLAN_DT (records already planned By Resources counted), else 'By Trip'; NULL if the LP has no Master KPI"})
u['func_desc'].append({"type": "text", "level": 1, "bold": True, "text": "4.x Payment Type (rev 0.3)"})
u['func_desc'].append({"type": "item", "marker": "a.", "level": 2, "text": "The template has no Payment Type column (TBD, KM-OQ9). Each saved record gets the default of KM-14; the planner can change it on the DTP Creation screen before submission."})
json.dump(u, open(f"{S}/duiss/dtp_upload_spec_v03.json", 'w'), indent=1)

# ---- Queue Processing ----
q = json.load(open(f"{S}/duiss/dtp_queue_spec.json"))
q['revisions'].append(REV("0.2", "Payment Type of the DTP record (PAY_TYPE) is copied to the Daily order (By Resources / By Trip) for slot monitoring and later processes"))
q['header'].update({"updated_date": "13-Nov-26", "updated_by": "Susanto"})
for b in q['data_map']['blocks']:
    if b['destination']['table'].startswith('Daily Order (TB_R_DAILY_ORDER') and b['destination']['operation'] == 'Insert':
        b['mappings'].append({"source_field": "PAY_TYPE", "dest_field": "PAY_TYPE (proposed)", "description": "Payment Type of the DTP record (By Resources / By Trip)"})
q['func_desc'].append({"type": "text", "level": 1, "bold": True, "text": "4.x Payment Type (rev 0.2)"})
q['func_desc'].append({"type": "item", "marker": "a.", "level": 2, "text": "The Daily order keeps the Payment Type of its DTP record. Submit already guarantees a valid Payment Type for companies with Master KPI (DTP Creation KM-15); the queue does not change it."})
json.dump(q, open(f"{S}/duiss/dtp_queue_spec_v02.json", 'w'), indent=1)

# ---- DTP Switching ----
w = json.load(open(f"{S}/swuiss/spec.json"))
w['revisions'].append(REV("0.2", "TB_R_DTP_RECORD.PAY_TYPE added (Payment Type per DTP): kept on rollback, so the corrected record is submitted again with the same Payment Type unless the planner changes it"))
w['header'].update({"updated_date": "13-Nov-26", "updated_by": "Susanto"})
add_col(w)
for b in w['data_map']['blocks']:
    if b['destination']['table'] == 'TB_R_DTP_RECORD' and b['destination']['operation'] == 'Update':
        i = next(k for k, m in enumerate(b['mappings']) if m['dest_field'] == 'STATUS')
        b['mappings'].insert(i, {"dest_field": "PAY_TYPE", "description": "Not changed (planner may change it before re-submission)"})
json.dump(w, open(f"{S}/swuiss/spec_v02.json", 'w'), indent=1)
print('ok')
