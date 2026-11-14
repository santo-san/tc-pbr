import json, sys
OUT = sys.argv[1]
TP, TE = "TBD - Requires PAS table/column confirmation", "TBD - Requires ELIPS table/column confirmation"
RL, GL, FL = "<GR_ATTACH_RUN_LOG>", "<GR_ATTACH_GR_LOG>", "<GR_ATTACH_FILE_LOG>"
H = lambda t, n=None: {"type": "heading", "text": t, **({"num": n} if n else {})}
T = lambda t, l=1, b=True: {"type": "text", "text": t, "level": l, "bold": b}
I = lambda m, t, l=2: {"type": "item", "marker": m, "text": t, "level": l}
def tbl(cols, rows, l=1): return {"type": "table", "level": l, "columns": [{"title": c, "width": w} for c, w in cols], "rows": rows, "row_lines": "all"}

LOG = [
 ("start", "Process start", "Scheduled run started", "Info", "ELIPS-PAS GR attachment started. Run <RUN_ID>, env <ENV>.", "Insert run log", "-"),
 ("db", "Connect to database server", "PAS / ELIPS DB connection failed", "Critical", "Cannot connect to <PAS|ELIPS> database: <DB_ERROR>.", "Stop; no change (DB_CONNECTION)", "Check DB; next run"),
 ("ftpc", "Connect to FTP", "SFTP / FTP host not reachable", "Critical", "Cannot connect to PAS FTP <HOST_ALIAS>: <ERROR>.", "Stop upload part; indicators unchanged (FTP_CONNECTION)", "Check network / FTP"),
 ("ftpa", "Connect to FTP", "Authentication failed", "Critical", "PAS FTP authentication failed for <HOST_ALIAS>.", "Stop; no credential in log (FTP_AUTH)", "Renew credential in secret store"),
 ("none", "Select candidates", "No eligible GR", "Info", "No GR waiting for ELIPS attachment.", "End the run", "-"),
 ("diag", "Select candidates", "GR of ILS TC PR with PR_NOTES NULL / empty / unexpected", "Warning", "<n> GR skipped: PR_NOTES unexpected (<PR_NO list>).", "Count in run log (PRNOTES_UNEXPECTED)", "PAS check PR_NOTES"),
 ("prnf", "Identify transaction", "GR -> PO -> PR link not found", "Error", "GR <GR_KEY>: <PO|PR> not found.", "GR FAILED (PO_NOT_FOUND / PR_NOT_FOUND)", "-"),
 ("sanf", "Identify transaction", "SA_DETAIL not found / callback not complete", "Error", "GR <GR_KEY>: SA <SA_NUMBER> <not found|callback pending> (PR <PR_NO>, PO <PO_NO>).", "GR FAILED (SA_NOT_FOUND / CALLBACK_PENDING)", "Wait for callback"),
 ("mult", "Identify transaction", "Several SA_DETAIL rows / PRs match one GR", "Error", "GR <GR_KEY>: <n> ELIPS records match; nothing uploaded.", "GR FAILED (MULTIPLE_SA_MATCH)", "Manual check"),
 ("pdfnf", "Get PDF", "No finished cycle / API 404", "Error", "GR <GR_KEY>: no Surat Jalan for order <ORDER_NO> (<DELIVERY_ID>).", "GR FAILED (PDF_NOT_FOUND)", "-"),
 ("pdfm", "Get PDF", "API 409 AMBIGUOUS_DELIVERY", "Error", "Delivery <DELIVERY_ID> matches several cycles; not uploaded.", "GR FAILED (MULTIPLE_PDF)", "ELIPS admin"),
 ("pdfi", "Validate PDF", "422 / 500 / timeout / empty / no %PDF- or %%EOF / size / deliveryId or orderNo mismatch", "Error", "Delivery <DELIVERY_ID>: PDF <EMPTY|INVALID|INCOMPLETE|TIMEOUT>: <REASON>.", "File not uploaded; GR FAILED", "Fix ELIPS data / retry"),
 ("exist", "Upload PDF", "Target file exists, not ours / different dataHash", "Error", "File <FILE_NAME> already exists in <FTP_DEST>; not overwritten.", "GR FAILED (FILE_EXISTS)", "Manual check (OQ-G10)"),
 ("same", "Upload PDF", "Already uploaded with same dataHash", "Info", "File <FILE_NAME> already uploaded (run <RUN_ID>), skipped.", "ALREADY_UPLOADED", "-"),
 ("upf", "Upload PDF", "Put / size check / rename failed", "Error", "Upload of <FILE_NAME> to <FTP_DEST> failed: <ERROR>.", "Delete .part; GR FAILED (FTP_UPLOAD)", "-"),
 ("upok", "Upload PDF", "File uploaded and verified", "Info", "File <FILE_NAME> (<SIZE> bytes) uploaded to <FTP_DEST>.", "File log UPLOADED", "-"),
 ("pnx", "Update PAS", "PR_NOTES changed since read / pattern not matched", "Error", "PR <PR_NO>: PR_NOTES '<PR_NOTES>' unexpected; indicators not updated.", "Rollback; GR FAILED (PRNOTES_UNEXPECTED)", "PAS check"),
 ("pnd", "Update PAS", "PR_NOTES update disabled (format not confirmed)", "Warning", "GR <GR_KEY>: files uploaded; indicator update disabled.", "GR WAIT_PRNOTES_CONFIRMATION", "Confirm OQ-G04"),
 ("st1", "Update PAS", "SOURCE_TYPE already '1'", "Info", "GR <GR_KEY>: SOURCE_TYPE already 1.", "ALREADY_DONE", "-"),
 ("dbu", "Update PAS", "DB error / rows affected <> 1", "Error", "GR <GR_KEY>: indicator update failed: <DB_ERROR>; rolled back.", "Rollback; GR FAILED (DB_UPDATE_FAILED)", "Retry next run"),
 ("ok", "Update PAS", "GR completed", "Info", "GR <GR_KEY>: <n> files; PR <PR_NO> PR_NOTES <UPDATED|ALREADY_1>; SOURCE_TYPE <before> -> 1.", "Commit; GR log SUCCESS", "-"),
 ("max", "Retry", "RETRY_COUNT reached maximum", "Warning", "GR <GR_KEY> failed <n> times: <REASON_CD>.", "Alert; processed once a day", "Support team"),
 ("end", "Process end", "Run finished", "Info", "GR attachment finished: candidates <n>, success <n>, skipped <n>, failed <n>, files <n>.", "Update run log", "-"),
 ("sys", "Processing", "Unexpected Talend error", "Critical", "GR attachment stopped: <ERROR>.", "Rollback current GR; run log FAILED", "Contact system administrator"),
]
N = {l[0]: i for i, l in enumerate(LOG, 1)}
n = lambda k: f"log message no. {N[k]}"

opflow = {"direction": "LR", "nodes": [
  {"id": "g", "label": "TB_R_GR_IR (GR waiting)", "type": "db"},
  {"id": "t", "label": "Talend GR attachment (scheduled)", "type": "process"},
  {"id": "e", "label": "ELIPS SA_DETAIL / Surat Jalan API", "type": "db"},
  {"id": "f", "label": "PAS FTP / SFTP", "type": "file"},
  {"id": "p", "label": "PR_NOTES ..1 / SOURCE_TYPE 1", "type": "db"},
  {"id": "a", "label": "PAS Auto GR (existing)", "type": "process"}],
 "edges": [{"from": "g", "to": "t"}, {"from": "e", "to": "t", "label": "PDF"}, {"from": "t", "to": "f", "label": "upload"}, {"from": "t", "to": "p", "label": "after upload"}, {"from": "p", "to": "a"}]}

ff = {"direction": "TB", "nodes": [
  {"id": "s", "label": "START", "type": "start"},
  {"id": "p1", "label": "Connect PAS / ELIPS / SFTP, run log", "type": "process", "step": 1},
  {"id": "p2", "label": "Select eligible GR -> PO -> PR", "type": "process", "step": 2},
  {"id": "gr", "label": "TB_R_GR_IR / TB_R_PO_H / TB_R_PR_H", "type": "db", "lane": "input"},
  {"id": "p3", "label": "Identify SA_DETAIL, check callback", "type": "process", "step": 3},
  {"id": "sd", "label": "SA_DETAIL / cycles", "type": "db", "lane": "input"},
  {"id": "p4", "label": "Per Delivery ID: get + validate PDF", "type": "process", "step": 4},
  {"id": "api", "label": "ELIPS Surat Jalan API", "type": "db", "lane": "input"},
  {"id": "p5", "label": "Upload .part, verify, rename", "type": "process", "step": 5},
  {"id": "ftp", "label": "PAS FTP / SFTP", "type": "file", "lane": "output"},
  {"id": "d6", "label": "All files of GR uploaded?", "type": "decision", "step": 6},
  {"id": "x6", "label": "GR FAILED, stays eligible", "type": "message"},
  {"id": "p7", "label": "PAS tx: PR_NOTES 0->1, SOURCE_TYPE 1", "type": "process", "step": 7},
  {"id": "pas", "label": "TB_R_PR_H / TB_R_GR_IR", "type": "db", "lane": "output"},
  {"id": "p8", "label": "GR / file log, next GR", "type": "process", "step": 8},
  {"id": "p9", "label": "Run log totals", "type": "process", "step": 9},
  {"id": "e", "label": "END", "type": "end"}],
 "same_rank": [["d6", "x6"]],
 "edges": [{"from": "s", "to": "p1"}, {"from": "p1", "to": "p2"}, {"from": "gr", "to": "p2"}, {"from": "p2", "to": "p3"}, {"from": "sd", "to": "p3"}, {"from": "p3", "to": "p4"},
   {"from": "api", "to": "p4"}, {"from": "p4", "to": "p5"}, {"from": "p5", "to": "ftp"}, {"from": "p5", "to": "d6"}, {"from": "d6", "to": "x6", "label": "No"}, {"from": "d6", "to": "p7", "label": "Yes"},
   {"from": "p7", "to": "pas"}, {"from": "p7", "to": "p8"}, {"from": "p8", "to": "p9"}, {"from": "p9", "to": "e"}]}

steps = [
 {"text": f"Scheduled start (single instance). Connections from context / secret store: cnx_PAS (auto-commit OFF, XACT_ABORT ON), cnx_ELIPS, cnx_FTP (SFTP if PAS supports it). Insert {RL}; {n('start')}.",
  "children": [f"DB error: {n('db')}. FTP: {n('ftpc')} / {n('ftpa')}. Stop."]},
 {"text": f"Select eligible GR (spec D.1): TB_R_GR_IR SOURCE_TYPE <> '1' (waiting condition {TP}) -> TB_R_PO_H -> <PAS_PO_PR_LINK> -> TB_R_PR_H with RIGHT(PR_NOTES,1) IN ('0','1') and TB_T_JOB_AUTOPO CREATED_BY 'ILSTC'; lookback, batch size.",
  "children": [f"None: {n('none')}. Diagnostic count of unexpected PR_NOTES: {n('diag')}."]},
 {"text": f"Per GR: read attachment log; SA_DETAIL where SA number = PR_DESC [+ ITEM_NO = PR_ITEM_NO]; all rows must have PAS_PR_NUMBER = PR_NO and PAS_PO_NUMBER = PO (callback complete); read finished cycles -> Delivery IDs ({TE}).",
  "children": [f"{n('prnf')}; {n('sanf')}; {n('mult')}."]},
 {"text": "Per Delivery ID not yet uploaded: call the existing ELIPS Delivery Note Base64 API; decode; validate (Functional Description 4.2); write staging file.",
  "children": [f"{n('pdfnf')}; {n('pdfm')}; {n('pdfi')}."]},
 {"text": "Check target file (log + FTP list); put <name>.part; compare remote size; rename to <name>.pdf; verify; file log UPLOADED.",
  "children": [f"{n('same')}; {n('exist')}; {n('upf')}; {n('upok')}."]},
 {"text": "Decision: every Delivery ID of the GR is UPLOADED / ALREADY_UPLOADED (same dataHash)?",
  "children": [f"No: GR FAILED with the first reason; PR_NOTES / SOURCE_TYPE NOT updated; retry next run ({n('max')})."]},
 {"text": "PAS transaction: UPDATE TB_R_PR_H last character 0 -> 1 (PR_NO, value as read, pattern CB_PRNOTES_PATTERN); UPDATE TB_R_GR_IR SOURCE_TYPE = '1' by the full GR key (1 row); COMMIT.",
  "children": [f"Already '1': not an error. {n('pnd')}; {n('pnx')}; {n('st1')}; {n('dbu')}; success {n('ok')}."]},
 {"text": f"Insert {GL} (SOURCE_TYPE before / after, PR_NOTES status, result); delete staging files; next GR (errors never affect another GR)."},
 {"text": f"Update {RL} totals and status; {n('end')}. Unexpected error: {n('sys')}."},
]

PRC = [["PR_NO", "as PAS", "Y", "", "Key (WHERE)"], ["PR_NOTES", "as PAS", "", "", "Last character 0 -> 1"], ["CHANGED_BY", "as PAS", "", "", "Only if PAS confirms (OQ-G09)"], ["CHANGED_DT", "as PAS", "", "", "Only if PAS confirms (OQ-G09)"]]
GRC = [["<GR_KEY_COLS>", "as PAS", "Y", "", f"Unique GR key - {TP}"], ["SOURCE_TYPE", "as PAS", "", "", "-> '1' after upload"]]
RLC = [["RUN_ID", "VARCHAR(50)", "Y", "N", "Talend job id / pid"], ["ENV", "VARCHAR(5)", "", "N", "DEV / SIT / UAT / PROD"], ["START_DT", "DATETIME", "", "N", "Start"], ["END_DT", "DATETIME", "", "Y", "End"],
 ["GR_CANDIDATE_CNT", "INT", "", "Y", "Eligible GR"], ["GR_SUCCESS_CNT", "INT", "", "Y", "Completed"], ["GR_SKIPPED_CNT", "INT", "", "Y", "Skipped"], ["GR_FAILED_CNT", "INT", "", "Y", "Failed"],
 ["FILE_UPLOADED_CNT", "INT", "", "Y", "Files uploaded"], ["RUN_STATUS", "VARCHAR(10)", "", "N", "RUNNING / SUCCESS / PARTIAL / FAILED"], ["MESSAGE", "VARCHAR(2000)", "", "Y", "Summary (no credentials)"]]
GLC = [["RUN_ID", "VARCHAR(50)", "Y", "N", "Run"], ["GR_KEY", "VARCHAR(100)", "Y", "N", "GR key (concatenated)"], ["PAS_PR_NUMBER", "VARCHAR(20)", "", "Y", "PR"], ["PAS_PO_NUMBER", "VARCHAR(20)", "", "Y", "PO"],
 ["SA_NUMBER", "VARCHAR(TBD)", "", "Y", "ELIPS SA"], ["FILE_CNT", "INT", "", "Y", "Files of the GR"], ["SOURCE_TYPE_BEFORE", "VARCHAR(10)", "", "Y", "Before"], ["SOURCE_TYPE_AFTER", "VARCHAR(10)", "", "Y", "After"],
 ["PRNOTES_STATUS", "VARCHAR(20)", "", "Y", "UPDATED / ALREADY_1 / DISABLED / UNEXPECTED"], ["RESULT", "VARCHAR(10)", "", "N", "SUCCESS / FAILED / SKIPPED"], ["REASON_CD", "VARCHAR(30)", "", "Y", "Reason"],
 ["MESSAGE", "VARCHAR(2000)", "", "Y", "Error description"], ["RETRY_COUNT", "INT", "", "N", "Failed attempts of the GR"], ["CREATED_DT", "DATETIME", "", "N", "Log time"]]
FLC = [["RUN_ID", "VARCHAR(50)", "Y", "N", "Run"], ["GR_KEY", "VARCHAR(100)", "Y", "N", "GR"], ["DELIVERY_ID", "VARCHAR(20)", "Y", "N", "No Cycle Order"], ["ORDER_NO", "VARCHAR(20)", "", "Y", "Daily order"],
 ["CYCLE_NO", "INT", "", "Y", "Cycle"], ["FILE_NAME", "VARCHAR(200)", "", "Y", "Uploaded name"], ["SOURCE_REF", "VARCHAR(200)", "", "Y", "API + deliveryId"], ["FTP_DESTINATION", "VARCHAR(300)", "", "Y", "Host alias + path"],
 ["FILE_SIZE", "INT", "", "Y", "Bytes"], ["DATA_HASH", "VARCHAR(20)", "", "Y", "API dataHash (idempotency)"], ["UPLOAD_STATUS", "VARCHAR(20)", "", "N", "UPLOADED / ALREADY_UPLOADED / FAILED"],
 ["REASON_CD", "VARCHAR(30)", "", "Y", "Reason"], ["MESSAGE", "VARCHAR(2000)", "", "Y", "Error"], ["CREATED_DT", "DATETIME", "", "N", "Log time"]]
tables = [
 {"name": "TB_R_PR_H", "kind": "transaction", "proposed": False, "description": "PAS PR header (existing); only columns used here", "columns": PRC},
 {"name": "TB_R_GR_IR", "kind": "transaction", "proposed": False, "description": "PAS GR (existing); only columns used here", "columns": GRC},
 {"name": RL, "kind": "log", "proposed": True, "description": "Run log (placeholder name, OQ-G11)", "columns": RLC},
 {"name": GL, "kind": "log", "proposed": True, "description": "Result per GR", "columns": GLC},
 {"name": FL, "kind": "log", "proposed": True, "description": "Result per PDF file (idempotency of uploads)", "columns": FLC},
]
def m(cols, d, dflt="NULL"): return [{"dest_field": c[0], "description": d.get(c[0], dflt)} for c in cols]
data_map = {"blocks": [
 {"source": {"table": "Talend run"}, "destination": {"table": RL, "operation": "Insert", "description": "Step 1"}, "mappings": m(RLC, {"RUN_ID": "Talend job id", "ENV": "Context ENV", "START_DT": "Server date-time", "RUN_STATUS": "'RUNNING'"})},
 {"source": {"table": "ELIPS Surat Jalan API / FTP result"}, "destination": {"table": FL, "operation": "Insert", "description": "Step 5 - per file"},
  "mappings": m(FLC, {"RUN_ID": "Run", "GR_KEY": "GR", "DELIVERY_ID": "API deliveryId", "ORDER_NO": "API orderNo", "CYCLE_NO": "API cycle", "FILE_NAME": "Name per CB_FILE_PATTERN (OQ-G07)",
     "SOURCE_REF": "API + deliveryId", "FTP_DESTINATION": "Host alias + PAS_FTP_TARGET_DIR", "FILE_SIZE": "Decoded size", "DATA_HASH": "API dataHash", "UPLOAD_STATUS": "'UPLOADED' / 'ALREADY_UPLOADED' / 'FAILED'",
     "REASON_CD": "Reason or NULL", "MESSAGE": "Log message", "CREATED_DT": "Server date-time"})},
 {"source": {"table": "TB_R_PR_H (as read)", "keys": [{"field": "PR_NO", "value": "PR of the GR"}]}, "destination": {"table": "TB_R_PR_H", "operation": "Update", "description": "Step 7 - all files uploaded",
   "keys": [{"field": "PR_NO", "value": "PR"}, {"field": "PR_NOTES", "value": "= value read, ends '0', LIKE pattern"}]},
  "mappings": [{"dest_field": "PR_NO", "description": "Key, not changed"}, {"source_field": "PR_NOTES", "dest_field": "PR_NOTES", "description": "LEFT(RTRIM(PR_NOTES), LEN-1) + '1' (only last char); already '1' -> no update"},
   {"dest_field": "CHANGED_BY", "description": "CB_USER if PAS confirms (OQ-G09), else not changed"}, {"dest_field": "CHANGED_DT", "description": "GETDATE() if PAS confirms, else not changed"}]},
 {"source": {"table": "Eligible GR"}, "destination": {"table": "TB_R_GR_IR", "operation": "Update", "description": "Step 7 - same transaction",
   "keys": [{"field": "<GR_KEY_COLS>", "value": "Full unique GR key"}, {"field": "SOURCE_TYPE", "value": "NULL or <> '1'"}]},
  "mappings": [{"dest_field": "<GR_KEY_COLS>", "description": "Key, not changed"}, {"dest_field": "SOURCE_TYPE", "description": "'1' (rows affected must be 1)"}]},
 {"source": {"table": "GR result"}, "destination": {"table": GL, "operation": "Insert", "description": "Step 8 - per GR"},
  "mappings": m(GLC, {"RUN_ID": "Run", "GR_KEY": "GR key", "PAS_PR_NUMBER": "PR_NO", "PAS_PO_NUMBER": "PO number", "SA_NUMBER": "PR_DESC", "FILE_CNT": "Delivery IDs of the GR",
     "SOURCE_TYPE_BEFORE": "Value read", "SOURCE_TYPE_AFTER": "'1' or unchanged", "PRNOTES_STATUS": "UPDATED / ALREADY_1 / DISABLED / UNEXPECTED", "RESULT": "SUCCESS / FAILED / SKIPPED",
     "REASON_CD": "Reason", "MESSAGE": "Log message", "RETRY_COUNT": "Previous + 1 if FAILED", "CREATED_DT": "Server date-time"})},
 {"source": {"table": "Talend run"}, "destination": {"table": RL, "operation": "Update", "description": "Step 9", "keys": [{"field": "RUN_ID", "value": "Run"}]},
  "mappings": m(RLC, {"RUN_ID": "Key", "ENV": "Not changed", "START_DT": "Not changed", "END_DT": "Server date-time", "RUN_STATUS": "SUCCESS / PARTIAL / FAILED", "MESSAGE": "Summary"}, "Count")},
]}
OQ = [["OQ-G01", "ELIPS production: Surat Jalan generated on the fly with a Base64 API (endpoint, auth, service account) or stored (BLOB / path)?"],
 ["OQ-G02", "SA_DETAIL ORDER_NO column; ELIPS cycle table (No Cycle Order, cycle no, finish time)"], ["OQ-G03", "TB_R_GR_IR unique key, PO / PO item columns, created date, GR status"],
 ["OQ-G04", "PR_NOTES format and meaning of 0 / 1; who sets '0' (forward code inserts NULL)"], ["OQ-G05", "SOURCE_TYPE values; condition 'waiting for ELIPS attachment'"],
 ["OQ-G06", "SFTP or FTP, host / port / auth per env, directory, permissions"], ["OQ-G07", "PAS file naming convention (proposal ELIPS_<SA_SAFE>_<PO>_<DELIVERY_ID>.pdf)"],
 ["OQ-G08", "How Auto GR links file to GR; several files per GR or one PDF; does Auto GR read the indicators?"], ["OQ-G09", "Set CHANGED_BY / CHANGED_DT on PAS tables?"],
 ["OQ-G10", "Existing file with other content: replace / version / block?"], ["OQ-G11", "Location of log tables; alert receivers"], ["OQ-G12", "GR granularity: PO / PO item / delivery"],
 ["OQ-G13", "Schedule, lookback, batch size, max retry"]]
func_desc = [
 H("DESCRIPTION", "4."),
 T("A scheduled Talend job gets the ELIPS Surat Jalan PDF(s) of every PAS GR waiting for its attachment, uploads them to the PAS FTP / SFTP and only then sets RIGHT(TB_R_PR_H.PR_NOTES,1) = '1' and TB_R_GR_IR.SOURCE_TYPE = '1', so that PAS Auto GR can continue. No PDF upload = no indicator update.", 1, False),
 T("4.1 Identification"),
 I("a.", "GR -> PO -> PR via PAS keys (TBD); PR_DESC = ELIPS SA_NUMBER; PR_ITEM_NO = ITEM_NO for item-level GR."),
 I("b.", "SA_DETAIL rows must already hold PAS_PR_NUMBER / PAS_PO_NUMBER equal to PAS (callback complete); not identified by weak attributes."),
 I("c.", "Surat Jalan = one PDF per finished cycle (Delivery ID = No Cycle Order); a GR has 1..n PDFs (OQ-G08)."),
 T("4.2 PDF validation"),
 I("a.", "HTTP 200, contentType application/pdf; deliveryId and orderNo equal to the request / SA_DETAIL."),
 I("b.", "Base64 decodes; size > 0 and = API size; starts '%PDF-', ends '%%EOF'; staging file readable; extension .pdf."),
 T("4.3 Upload"),
 I("a.", "SFTP preferred; put .part, compare size, rename .pdf. Existing file: skip only if logged with same dataHash, else FILE_EXISTS (no overwrite unless CB_REPLACE_EXISTING = 'Y')."),
 I("b.", "File name: PAS convention; else proposal ELIPS_<SA_NUMBER '/'->'-'>_<PO>_<DELIVERY_ID>.pdf - not implemented before OQ-G07."),
 {"type": "column_break"},
 T("4.4 Indicator update"),
 I("a.", "One PAS transaction per GR after all files are uploaded. PR_NOTES: last character only, 0 -> 1, value as read, LIKE CB_PRNOTES_PATTERN; already '1' = OK. Disabled by CB_PRNOTES_UPDATE_ENABLED = 'N' until OQ-G04."),
 I("b.", "SOURCE_TYPE = '1' by the full GR key; rows = 1; already '1' = ALREADY_DONE."),
 T("4.5 Idempotency / retry"),
 I("a.", "File log (GR + Delivery ID + dataHash) prevents duplicate uploads; SOURCE_TYPE '1' ends the GR; failed GR stays eligible; RETRY_COUNT, alert at CB_MAX_RETRY."),
 T("4.6 Context / security"),
 I("a.", "ELIPS / PAS DB host, port, name, user, password; PAS FTP host, port, user, password / key, target dir; staging dir; ENV DEV / SIT / UAT / PROD; ELIPS API URL + service account. Secrets in the Talend / environment secret store, never in SQL, code or Git, never logged."),
 T("4.7 Open questions"),
 tbl([("ID", 6), ("Question", 39)], OQ),
]
spec = {
 "doc_type": "batch",
 "header": {"phase": "DR", "project_name": "ELIPS Enhancement (TC-PBR)", "block_name": "Batch / Interface", "function_name": "TBD ELIPS Surat Jalan PDF to PAS FTP for Auto GR (Talend)", "created_date": "06-Nov-26", "created_by": "Susanto"},
 "revisions": [{"revision": "0.1", "author": "Susanto", "date": "06-Nov-26", "reviewed_by": "", "description": "Initial draft: analysis and design of the GR attachment interface"}],
 "general": {
  "objective": ["To deliver the ELIPS Surat Jalan PDF(s) of every PAS GR of an ELIPS SA to the PAS FTP / SFTP location, as attachment for PAS Auto Good Receive.",
                "To reuse the existing ELIPS Surat Jalan generator and the existing PAS / ELIPS references (PR_DESC = SA number, callback PR / PO numbers).",
                "To set the PAS indicators PR_NOTES (last char '1') and TB_R_GR_IR.SOURCE_TYPE ('1') only after a verified upload, idempotently and per GR."],
  "operation_flow": {"flow": opflow},
  "inputs": [{"name": "TB_R_GR_IR", "type": "DB (PAS)", "description": f"GR waiting for attachment - keys {TP}"},
             {"name": "TB_R_PO_H / <PAS_PO_PR_LINK> / TB_R_PR_H", "type": "DB (PAS)", "description": "PO, PR, PR_DESC (= SA), PR_NOTES"},
             {"name": "SA_DETAIL / cycles", "type": "DB (ELIPS)", "description": f"SA detail, ORDER_NO, finished cycles - {TE}"},
             {"name": "ELIPS Surat Jalan Base64 API", "type": "API (ELIPS)", "description": "Existing generator; deliveryId = No Cycle Order (endpoint TBD)"}],
  "outputs": [{"name": "PAS FTP / SFTP", "type": "File", "description": "PDF per Delivery ID (name per OQ-G07)"},
              {"name": "TB_R_PR_H.PR_NOTES", "type": "DB (PAS)", "description": "Last character 0 -> 1"},
              {"name": "TB_R_GR_IR.SOURCE_TYPE", "type": "DB (PAS)", "description": "'1'"},
              {"name": f"{RL} / {GL} / {FL}", "type": "DB", "description": "Logs (proposed)"}],
  "extra_tables": [{"title": "Execution", "columns": [{"title": "Item", "width": 10}, {"title": "Description", "width": 30}],
     "rows": [["Tool", "Talend scheduled job (TMC / TAC)"], ["Schedule", "Every N minutes (TBD), no overlap"], ["Unit of work", "One GR (all its PDFs + 1 PAS transaction)"],
              ["Protocol", "SFTP preferred (OQ-G06)"], ["Rule", "No successful upload = no indicator update"]]}],
  "constraints": ["PAS keys (GR, PO, PO-PR), ELIPS cycle table and SA_DETAIL columns are placeholders until confirmed.", "No new PDF mechanism; no change to Auto GR."],
 },
 "func_flow": {"flow": ff, "steps": steps},
 "data_map": data_map,
 "func_desc": func_desc,
 "func_desc_layout": "two",
 "logging_messages": [{"event": e, "cause": c, "type": t, "msg_id": "TBD", "message": mm, "action": {"system": sy, "user": us}} for _, e, c, t, mm, sy, us in LOG],
 "tables": tables,
}
json.dump(spec, open(f"{OUT}/spec.json", "w"), indent=1)
print("ok")
