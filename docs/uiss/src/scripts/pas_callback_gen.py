import json, sys
OUT = sys.argv[1]
TBDP = "TBD - Requires PAS table/column confirmation"
TBDE = "TBD - Requires ELIPS table/column confirmation"
RUN, DET = "<ELIPS_PAS_CALLBACK_RUN_LOG>", "<ELIPS_PAS_CALLBACK_DETAIL_LOG>"
H = lambda t, n=None: {"type": "heading", "text": t, **({"num": n} if n else {})}
T = lambda t, l=1, b=True: {"type": "text", "text": t, "level": l, "bold": b}
I = lambda m, t, l=2: {"type": "item", "marker": m, "text": t, "level": l}
def tbl(cols, rows, l=1): return {"type": "table", "level": l, "columns": [{"title": c, "width": w} for c, w in cols], "rows": rows, "row_lines": "all"}

LOG = [
 ("start", "Process start", "Scheduled run started", "Info", "PAS-ELIPS PR/PO callback started. Run <RUN_ID>, mode <A|B>.", "Insert run log", "-"),
 ("pas", "Connect to database server", "PAS connection failed", "Critical", "Cannot connect to PAS database: <DB_ERROR>.", "Stop; no ELIPS change; run log FAILED", "Check PAS DB; next schedule retries"),
 ("elips", "Connect to database server", "ELIPS connection failed", "Critical", "Cannot connect to ELIPS database: <DB_ERROR>.", "Stop; log to file", "Check ELIPS DB"),
 ("none", "Select candidates", "No pending SA / no released PO", "Info", "No callback candidates (pending SA <n>, released PO 0).", "End the run", "-"),
 ("chunk", "PAS query", "Query error for one chunk", "Error", "PAS query failed for chunk <k> (<n> SA): <DB_ERROR>.", "Skip chunk, continue", "-"),
 ("prnf", "Record validation", "No TB_R_PR_H with PR_DESC = SA (mode B: PO without PR)", "Warning", "SA <SA_NUMBER> / PO <PO_NO>: PAS PR not found.", "Skip; stays pending (count only, detail after wait days)", "-"),
 ("notrel", "Record validation", "PR found but no released PO (status 44)", "Info", "SA <SA_NUMBER>: PR <PR_NO> has no released PO yet.", "Skip; stays pending (count only)", "-"),
 ("nnull", "Record validation", "PR_NOTES NULL or empty", "Warning", "SA <SA_NUMBER>: PR <PR_NO> PR_NOTES empty - not eligible.", "Skip (NOTES_EMPTY)", "PAS check PR_NOTES"),
 ("n0", "Record validation", "PR_NOTES does not end with '0'", "Info", "SA <SA_NUMBER>: PR <PR_NO> PR_NOTES '<PR_NOTES>' not eligible.", "Skip (NOTES_NOT_0)", "-"),
 ("ampr", "Record validation", "Several PRs with the same PR_DESC", "Error", "SA <SA_NUMBER>: <n> PAS PRs found (<PR_NO list>); not updated.", "FAILED AMBIGUOUS_PR", "PAS / ELIPS admin decide"),
 ("ampo", "Record validation", "Several released POs for one PR (header link) or one PR item", "Error", "SA <SA_NUMBER>: PR <PR_NO> has <n> released POs (<PO list>); not updated.", "FAILED AMBIGUOUS_PO", "Confirm the PO"),
 ("sanf", "Identify ELIPS SA", "SA_DETAIL not found for PR_DESC", "Error", "SA <SA_NUMBER> (PR <PR_NO>, PO <PO_NO>) not found in SA_DETAIL.", "FAILED SA_NOT_FOUND", "Check SA number"),
 ("mult", "Identify ELIPS SA", "Item link: ITEM_NO matches 0 or more than 1 row; or row count <> PR items", "Error", "SA <SA_NUMBER> item <ITEM_NO>: <n> SA_DETAIL rows match; not updated.", "FAILED MULTIPLE_DETAIL_MATCH / DETAIL_MISMATCH", "Check SA detail"),
 ("conf", "Update ELIPS", "Target row already has a different PR / PO", "Error", "SA <SA_NUMBER>: stored PR/PO <OLD> differs from PAS <PR_NO>/<PO_NO>; not overwritten.", "Rollback SA; FAILED VALUE_CONFLICT", "Business decides (OQ-C10)"),
 ("same", "Update ELIPS", "All rows already equal", "Info", "SA <SA_NUMBER>: PR <PR_NO> / PO <PO_NO> already stored.", "No update (NO_CHANGE)", "-"),
 ("cnt", "Update ELIPS", "Rows affected <> expected", "Error", "SA <SA_NUMBER>: <n> rows updated, <m> expected; rolled back.", "Rollback SA; FAILED UPDATE_COUNT_MISMATCH", "-"),
 ("upf", "Update ELIPS", "DB error on UPDATE / COMMIT", "Error", "SA <SA_NUMBER>: update failed: <DB_ERROR>; rolled back.", "Rollback SA; FAILED UPDATE_FAILED; continue", "Next run retries"),
 ("ok", "Update ELIPS", "SA updated", "Info", "SA <SA_NUMBER>: <n> SA_DETAIL rows set PR <PR_NO>, PO <PO_NO>.", "Commit; detail log UPDATED", "-"),
 ("end", "Process end", "Run finished", "Info", "Callback finished: pending <n>, released PO <n>, eligible <n>, updated <n> (<rows> rows), no change <n>, skipped <n>, failed <n>.", "Update run log", "Check FAILED rows"),
 ("sys", "Processing", "Unexpected Talend error", "Critical", "Callback stopped: <ERROR>.", "Rollback current SA; run log FAILED", "Contact system administrator"),
]
N = {l[0]: i for i, l in enumerate(LOG, 1)}
n = lambda k: f"log message no. {N[k]}"

opflow = {"direction": "LR", "nodes": [
  {"id": "e", "label": "ELIPS SA -> PAS (forward interface)", "type": "process"},
  {"id": "p", "label": "PAS budget / Auto-PO / Auto-Approval", "type": "process"},
  {"id": "po", "label": "TB_R_PO_H (44) / TB_R_PR_H", "type": "db"},
  {"id": "t", "label": "Talend callback (scheduled)", "type": "process"},
  {"id": "sd", "label": "ELIPS SA_DETAIL", "type": "db"}],
 "edges": [{"from": "e", "to": "p"}, {"from": "p", "to": "po", "label": "PO released"}, {"from": "po", "to": "t"}, {"from": "t", "to": "sd", "label": "PR / PO No"}]}

ff = {"direction": "TB", "nodes": [
  {"id": "s", "label": "START", "type": "start"},
  {"id": "p1", "label": "Connect PAS / ELIPS, run log", "type": "process", "step": 1},
  {"id": "lg", "label": RUN, "type": "db", "lane": "output"},
  {"id": "p2", "label": "Read pending SA (PR / PO empty)", "type": "process", "step": 2},
  {"id": "sd1", "label": "SA_DETAIL", "type": "db", "lane": "input"},
  {"id": "p3", "label": "Query PAS PR + released PO by PR_DESC (chunk)", "type": "process", "step": 3},
  {"id": "pas", "label": "TB_R_PR_H / link / TB_R_PO_H", "type": "db", "lane": "input"},
  {"id": "p4", "label": "Classify: released, PR_NOTES ends '0'", "type": "process", "step": 4},
  {"id": "p5", "label": "Per SA: unique PR/PO, rows, conflict", "type": "process", "step": 5},
  {"id": "d5", "label": "Valid and changed?", "type": "decision", "step": 6},
  {"id": "x5", "label": "SKIPPED / FAILED / NO_CHANGE", "type": "message"},
  {"id": "p6", "label": "UPDATE SA_DETAIL, commit / rollback", "type": "process", "step": 7},
  {"id": "sd2", "label": "SA_DETAIL", "type": "db", "lane": "output"},
  {"id": "p7", "label": "Detail log; next SA", "type": "process", "step": 8},
  {"id": "dl", "label": DET, "type": "db", "lane": "output"},
  {"id": "p8", "label": "Run log totals", "type": "process", "step": 9},
  {"id": "e", "label": "END", "type": "end"}],
 "same_rank": [["d5", "x5"]],
 "edges": [{"from": "s", "to": "p1"}, {"from": "p1", "to": "lg"}, {"from": "p1", "to": "p2"}, {"from": "sd1", "to": "p2"}, {"from": "p2", "to": "p3"}, {"from": "pas", "to": "p3"},
   {"from": "p3", "to": "p4"}, {"from": "p4", "to": "p5"}, {"from": "p5", "to": "d5"}, {"from": "d5", "to": "x5", "label": "No"}, {"from": "d5", "to": "p6", "label": "Yes"},
   {"from": "p6", "to": "sd2"}, {"from": "p6", "to": "p7"}, {"from": "p7", "to": "dl"}, {"from": "p7", "to": "p8"}, {"from": "p8", "to": "e"}]}

steps = [
 {"text": f"Scheduled start (TMC / TAC, single instance, interval TBD). Open cnx_PAS (read only) and cnx_ELIPS (auto-commit OFF) from context variables; no credentials in logs. Insert {RUN} (START); {n('start')}.",
  "children": [f"PAS connection error: {n('pas')}; ELIPS connection error: {n('elips')}. Stop."]},
 {"text": f"Read pending SAs from SA_DETAIL: PAS_PR_NUMBER or PAS_PO_NUMBER empty, SA interfaced to PAS (condition {TBDE}), SA date within CB_LOOKBACK_DAYS; group by SA number (<SA_NUMBER_COL>: {TBDE}).",
  "children": [f"None: {n('none')}; go to step 9."]},
 {"text": f"Per chunk of CB_CHUNK_SIZE SA numbers: SELECT TB_R_PR_H (PR_NO, PR_DESC, PR_NOTES) WHERE PR_DESC IN (chunk) LEFT JOIN <PAS_PO_PR_LINK> LEFT JOIN TB_R_PO_H with <PO_STATUS_COL> = '44' ({TBDP}). Mode B (optional): released POs since the watermark.",
  "children": [f"Chunk error: {n('chunk')}."]},
 {"text": "Classify each row (Functional Description 4.1): PR not found, PO not released, PR_NOTES NULL / empty, PR_NOTES not ending '0', or ELIGIBLE. PR_NOTES only via RTRIM / RIGHT / LEN, so no format can fail the job.",
  "children": [f"{n('prnf')}; {n('notrel')}; {n('nnull')}; {n('n0')}."]},
 {"text": "Per SA with eligible rows: exactly one PR; one released PO (per PR, or per PR item if the link is item level); SA_DETAIL rows exist and match (SA_NUMBER [+ ITEM_NO]); no row with a different non-empty PR / PO. Target rows are never searched by PAS numbers.",
  "children": [f"{n('ampr')}; {n('ampo')}; {n('sanf')}; {n('mult')}."]},
 {"text": "Decision: in the ELIPS transaction lock the target rows and count TOTAL / SAME / CONFLICT.",
  "children": [f"CONFLICT > 0: {n('conf')}. SAME = TOTAL: {n('same')} (no UPDATE). Otherwise step 7."]},
 {"text": "UPDATE SA_DETAIL SET PAS_PR_NUMBER, PAS_PO_NUMBER (+ audit columns if they exist) WHERE SA [+ ITEM] AND value empty or equal AND NOT already equal. Rows affected must be TOTAL - SAME, then COMMIT.",
  "children": [f"Mismatch: {n('cnt')}. DB error: {n('upf')}. Success: {n('ok')}."]},
 {"text": f"Insert {DET} (UPDATED / NO_CHANGE / SKIPPED / FAILED with reason, PR, PO, SA); continue with the next SA. Waiting states (PR not found / PO not released) only as counts until CB_WAIT_ALERT_DAYS."},
 {"text": f"Update {RUN}: END_DT, counts, RUN_STATUS SUCCESS / PARTIAL / FAILED; {n('end')}. Unexpected error: {n('sys')}."},
]

RUNC = [["RUN_ID", "VARCHAR(50)", "Y", "N", "Talend pid / run id"], ["START_DT", "DATETIME", "", "N", "Job start"], ["END_DT", "DATETIME", "", "Y", "Job end"],
 ["PENDING_SA_CNT", "INT", "", "Y", "SAs read in step 2"], ["RELEASED_PO_CNT", "INT", "", "Y", "Released POs found (status 44)"], ["ELIGIBLE_CNT", "INT", "", "Y", "Released and PR_NOTES ends '0'"],
 ["UPDATED_CNT", "INT", "", "Y", "SAs updated"], ["UPDATED_ROW_CNT", "INT", "", "Y", "SA_DETAIL rows updated"], ["NO_CHANGE_CNT", "INT", "", "Y", "Already up to date"],
 ["SKIPPED_CNT", "INT", "", "Y", "Skipped"], ["FAILED_CNT", "INT", "", "Y", "Failed"], ["WATERMARK", "DATETIME", "", "Y", "Mode B only"],
 ["RUN_STATUS", "VARCHAR(10)", "", "N", "RUNNING / SUCCESS / PARTIAL / FAILED"], ["MESSAGE", "VARCHAR(2000)", "", "Y", "Summary / fatal error (no credentials)"]]
DETC = [["RUN_ID", "VARCHAR(50)", "Y", "N", "Run"], ["SEQ", "INT", "Y", "N", "Sequence in the run"], ["SA_NUMBER", "VARCHAR(TBD)", "", "N", "ELIPS SA (= PR_DESC)"],
 ["ITEM_NO", "VARCHAR(TBD)", "", "Y", "Item (item-level link only)"], ["PAS_PR_NUMBER", "VARCHAR(20)", "", "Y", "PAS PR"], ["PAS_PO_NUMBER", "VARCHAR(20)", "", "Y", "PAS PO"],
 ["PR_NOTES", "VARCHAR(TBD)", "", "Y", "Value seen (skipped records)"], ["RESULT", "VARCHAR(20)", "", "N", "UPDATED / NO_CHANGE / SKIPPED / FAILED"],
 ["REASON_CD", "VARCHAR(30)", "", "Y", "Reason code (Functional Description 4.3)"], ["MESSAGE", "VARCHAR(2000)", "", "Y", "Error text"], ["ROWS_AFFECTED", "INT", "", "Y", "Updated rows"], ["CREATED_DT", "DATETIME", "", "N", "Log time"]]
SDC = [["<SA_NUMBER_COL>", "TBD", "", "", f"SA number - {TBDE}"], ["<ITEM_NO_COL>", "TBD", "", "", f"Item number (= PR_ITEM_NO) - {TBDE}"],
 ["PAS_PR_NUMBER", "VARCHAR(TBD)", "", "Y", "PAS PR number (character)"], ["PAS_PO_NUMBER", "VARCHAR(TBD)", "", "Y", "PAS PO number (character)"],
 ["<CHANGED_BY_COL>", "TBD", "", "", "Audit column if it exists"], ["<CHANGED_DT_COL>", "TBD", "", "", "Audit column if it exists"]]
tables = [
 {"name": "SA_DETAIL", "kind": "transaction", "proposed": False, "description": "ELIPS SA detail (existing); only the columns used by the callback are listed", "columns": SDC},
 {"name": RUN, "kind": "log", "proposed": True, "description": f"One row per run. Placeholder name: {TBDE} (OQ-C11)", "columns": RUNC},
 {"name": DET, "kind": "log", "proposed": True, "description": f"One row per SA (or SA + item) result. Placeholder name: {TBDE}", "columns": DETC},
]
data_map = {"blocks": [
 {"source": {"table": "Talend run"}, "destination": {"table": RUN, "operation": "Insert", "description": "Step 1 - start"},
  "mappings": [{"dest_field": c[0], "description": {"RUN_ID": "Talend pid", "START_DT": "Server date-time", "RUN_STATUS": "'RUNNING'"}.get(c[0], "NULL")} for c in RUNC]},
 {"source": {"table": "TB_R_PR_H / <PAS_PO_PR_LINK> / TB_R_PO_H", "keys": [{"field": "PR_DESC", "value": "SA number (pending)"}, {"field": "<PO_STATUS_COL>", "value": "'44'"}, {"field": "RIGHT(PR_NOTES,1)", "value": "'0'"}]},
  "destination": {"table": "SA_DETAIL", "operation": "Update", "description": "Step 7 - per SA, one transaction",
   "keys": [{"field": "<SA_NUMBER_COL>", "value": "PR_DESC"}, {"field": "<ITEM_NO_COL>", "value": "PR_ITEM_NO (item link only)"}, {"field": "PAS_PR/PO_NUMBER", "value": "NULL or equal; not both equal"}]},
  "mappings": [{"dest_field": "<SA_NUMBER_COL>", "description": "Key, not changed"}, {"dest_field": "<ITEM_NO_COL>", "description": "Key, not changed"},
   {"source_field": "PR_NO", "dest_field": "PAS_PR_NUMBER", "description": "TB_R_PR_H.PR_NO (character, trimmed)"},
   {"source_field": "<PO_NO_COL>", "dest_field": "PAS_PO_NUMBER", "description": "TB_R_PO_H PO number, status 44 (character, trimmed)"},
   {"dest_field": "<CHANGED_BY_COL>", "description": "Context CB_USER (if the column exists)"}, {"dest_field": "<CHANGED_DT_COL>", "description": "Server date-time (if the column exists)"}]},
 {"source": {"table": "Result per SA"}, "destination": {"table": DET, "operation": "Insert", "description": "Step 8"},
  "mappings": [{"dest_field": c[0], "description": {"RUN_ID": "Run", "SEQ": "Counter", "SA_NUMBER": "PR_DESC / pending SA", "ITEM_NO": "PR_ITEM_NO (item link) or NULL", "PAS_PR_NUMBER": "PR_NO or NULL",
     "PAS_PO_NUMBER": "PO number or NULL", "PR_NOTES": "PR_NOTES (skipped only)", "RESULT": "'UPDATED' / 'NO_CHANGE' / 'SKIPPED' / 'FAILED'", "REASON_CD": "Reason code", "MESSAGE": "Log message text",
     "ROWS_AFFECTED": "Rows updated", "CREATED_DT": "Server date-time"}[c[0]]} for c in DETC]},
 {"source": {"table": "Talend run"}, "destination": {"table": RUN, "operation": "Update", "description": "Step 9 - end", "keys": [{"field": "RUN_ID", "value": "Run"}]},
  "mappings": [{"dest_field": c[0], "description": {"RUN_ID": "Key", "START_DT": "Not changed", "END_DT": "Server date-time", "WATERMARK": "Max PO timestamp read (mode B)", "RUN_STATUS": "'SUCCESS' / 'PARTIAL' / 'FAILED'", "MESSAGE": "Summary"}.get(c[0], "Count")} for c in RUNC]},
]}
OQ = [["OQ-C01", "PO-PR relation: table / columns (PO item -> PR_NO + PR_ITEM_NO, or PR on PO header)? One PR -> several POs?"],
 ["OQ-C02", "PR_NOTES: forward interface inserts NULL (computed value ends '1'). Who sets PR_NOTES ending '0' and what do 0 / 1 mean?"],
 ["OQ-C03", "TB_R_PO_H: PO status column (44 = Released) and PO number column; data types"], ["OQ-C04", "SA_DETAIL: SA number / item number columns, PK, audit columns"],
 ["OQ-C05", "Types / lengths of PAS_PR_NUMBER / PAS_PO_NUMBER"], ["OQ-C06", "PR / PO on SA_DETAIL vs SA header (SA Monitoring proposal)"],
 ["OQ-C07", "TB_R_PO_H change / release timestamp for incremental mode B?"], ["OQ-C08", "Index on TB_R_PR_H.PR_DESC; read access for the Talend user"],
 ["OQ-C09", "ELIPS DB engine; connection per environment"], ["OQ-C10", "Overwrite a different stored PR / PO (PO re-created)? Proposed: no"],
 ["OQ-C11", "Log tables in ELIPS (proposed) or file / AMC only; who is notified"], ["OQ-C12", "Also set ELIPS SA / daily order status (PO Received)? Not in scope"],
 ["OQ-C13", "Schedule interval and lookback window"]]
func_desc = [
 H("DESCRIPTION", "4."),
 T("After PAS budget processing, Auto-PO and Auto-Approval, a scheduled Talend job writes the PAS PR number and the released PAS PO number back to the ELIPS SA_DETAIL rows of the SA that was sent to PAS (PR_DESC = SA_NUMBER). DB-to-DB, read-only on PAS, no API. Example: PR 5000269261 / PO 4450288442.", 1, False),
 T("4.1 Eligibility (per PAS row)"),
 tbl([("Result", 8), ("Condition", 37)], [["PR_NOT_FOUND", "No TB_R_PR_H with PR_DESC = SA number (skip, stays pending)"], ["PO_NOT_RELEASED", "No linked PO with status 44 (skip)"],
   ["NOTES_EMPTY", "PR_NOTES NULL or blank (skip)"], ["NOTES_NOT_0", "RIGHT(RTRIM(PR_NOTES),1) <> '0' (skip)"], ["ELIGIBLE", "Released PO and PR_NOTES ends with '0'"]]),
 T("4.2 Identification of the ELIPS rows"),
 I("a.", "Key = SA_NUMBER sent by the forward interface as TB_R_PR_H.PR_DESC; plus ITEM_NO (= TB_R_PR_ITEM.PR_ITEM_NO) when the PO link is item level (OQ-C01)."),
 I("b.", "Never search SA_DETAIL by PAS_PR_NUMBER / PAS_PO_NUMBER; these are only compared (conflict)."),
 I("c.", "Exactly one PR per SA and one released PO per PR (or per PR item); otherwise FAILED, not updated."),
 T("4.3 Idempotency / transaction"),
 I("a.", "One ELIPS transaction per SA; rows locked; TOTAL / SAME / CONFLICT counted first."),
 I("b.", "SAME = TOTAL: NO_CHANGE, no UPDATE. CONFLICT > 0: FAILED VALUE_CONFLICT, never overwritten (OQ-C10)."),
 I("c.", "Rows affected must equal TOTAL - SAME, else rollback. A failed SA does not stop the others."),
 I("d.", "Reason codes: PR_NOT_FOUND, PO_NOT_RELEASED, NOTES_EMPTY, NOTES_NOT_0, AMBIGUOUS_PR, AMBIGUOUS_PO, SA_NOT_FOUND, DETAIL_MISMATCH, MULTIPLE_DETAIL_MATCH, VALUE_CONFLICT, PR_MISMATCH, UPDATE_COUNT_MISMATCH, UPDATE_FAILED."),
 {"type": "column_break"},
 T("4.4 Performance"),
 I("a.", "Start from the small ELIPS pending set; query PAS only by PR_DESC IN (chunk) with PO status 44 in the join; no full read of TB_R_PO_H / TB_R_PR_H. Index on TB_R_PR_H.PR_DESC requested (OQ-C08)."),
 I("b.", "Mode B (PO-driven, watermark) only if TB_R_PO_H has a change timestamp (OQ-C07)."),
 T("4.5 Context variables"),
 I("a.", "PAS_DB_HOST / PORT / NAME / USER / PASSWORD, ELIPS_DB_HOST / PORT / NAME / USER / PASSWORD (Password type, never logged)."),
 I("b.", "CB_PO_RELEASED_STATUS '44', CB_NOTES_SUFFIX '0', CB_LOOKBACK_DAYS, CB_CHUNK_SIZE, CB_USER, CB_WAIT_ALERT_DAYS, CB_MODE."),
 T("4.6 Critical finding"),
 I("a.", "The current forward interface inserts PR_NOTES = NULL (computed value ends with '1'), so RIGHT(PR_NOTES,1) = '0' never matches unless PAS or the forward interface sets it (OQ-C02)."),
 T("4.7 Open questions"),
 tbl([("ID", 6), ("Question", 39)], OQ),
]
spec = {
 "doc_type": "batch",
 "header": {"phase": "DR", "project_name": "ELIPS Enhancement (TC-PBR)", "block_name": "Batch / Interface", "function_name": "TBD PAS to ELIPS Callback - PR / PO Number (Talend DB-to-DB)", "created_date": "06-Nov-26", "created_by": "Susanto"},
 "revisions": [{"revision": "0.1", "author": "Susanto", "date": "06-Nov-26", "reviewed_by": "", "description": "Initial draft: callback of PAS PR / released PO number to ELIPS SA_DETAIL"}],
 "general": {
  "objective": ["To write the PAS PR number and the released PAS PO number (status 44) back to the ELIPS SA_DETAIL rows of the SA that was interfaced to PAS.",
                "To run as a scheduled Talend job, DB-to-DB, without API and without changing PAS data.",
                "To update only the correct SA_DETAIL rows, idempotently and per SA transaction, and log every result."],
  "operation_flow": {"flow": opflow},
  "inputs": [{"name": "SA_DETAIL", "type": "DB (ELIPS)", "description": "Pending SAs: PAS_PR_NUMBER / PAS_PO_NUMBER empty"},
             {"name": "TB_R_PR_H", "type": "DB (PAS)", "description": "PR_NO, PR_DESC (= SA number), PR_NOTES"},
             {"name": "<PAS_PO_PR_LINK>", "type": "DB (PAS)", "description": f"PO-PR relation - {TBDP}"},
             {"name": "TB_R_PO_H", "type": "DB (PAS)", "description": f"PO number, PO status 44 (column names {TBDP})"}],
  "outputs": [{"name": "SA_DETAIL", "type": "DB (ELIPS)", "description": "PAS_PR_NUMBER, PAS_PO_NUMBER"},
              {"name": RUN, "type": "DB (ELIPS)", "description": "Run totals (proposed)"},
              {"name": DET, "type": "DB (ELIPS)", "description": "Result per SA (proposed)"},
              {"name": "Talend log file", "type": "File", "description": "tLogCatcher / tStatCatcher; fallback when ELIPS is down"}],
  "extra_tables": [{"title": "Execution", "columns": [{"title": "Item", "width": 10}, {"title": "Description", "width": 30}],
     "rows": [["Tool", "Talend scheduled job (TMC / TAC), DB-to-DB"], ["Schedule", "Every N minutes (TBD, proposed 30), no overlap"], ["Unit of work", "One SA = one ELIPS transaction"],
              ["PAS access", "Read only"], ["Idempotency", "Compare stored values; update only empty / equal"]]}],
  "constraints": ["PO-PR relation, PO status / number columns and SA_DETAIL key columns are placeholders until confirmed.", "No join or column is assumed beyond the supplied code and requirement."],
 },
 "func_flow": {"flow": ff, "steps": steps},
 "data_map": data_map,
 "func_desc": func_desc,
 "func_desc_layout": "two",
 "logging_messages": [{"event": e, "cause": c, "type": t, "msg_id": "TBD", "message": m, "action": {"system": sy, "user": us}} for _, e, c, t, m, sy, us in LOG],
 "tables": tables,
}
json.dump(spec, open(f"{OUT}/spec.json", "w"), indent=1)
print("ok")
