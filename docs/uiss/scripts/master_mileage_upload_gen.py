# UISS-Batch Master Mileage - Route Mileage Upload (backend of the Route Mileage Excel upload, MM-20..MM-29)
# rev 0.2: one call like the Planning Order upload (validate, then save at once when every row is valid; errors return Row / Column / Error)
# Usage: python3 master_mileage_upload_gen.py <docs/uiss/src>
import json, sys
SRC = sys.argv[1]
T_M, T_T, T_L, T_H = "Route Mileage Master (TBD)", "TB_T_MILEAGE_UPLOAD", "TB_R_MILEAGE_UPLOAD_LOG", "TB_H_MILEAGE"
H = lambda t, n=None: {"type": "heading", "text": t, **({"num": n} if n else {})}
T = lambda t, l=1, b=True: {"type": "text", "text": t, "level": l, "bold": b}
I = lambda m, t, l=2: {"type": "item", "marker": m, "text": t, "level": l}
def tbl(cols, rows, l=1): return {"type": "table", "level": l, "columns": [{"title": c, "width": w} for c, w in cols], "rows": rows, "row_lines": "all"}
USER = "Login user (IELP Admin, TBD)"

LOG = [
 ("start", "Process start", "Upload requested", "Info", "Route Mileage upload <UPLOAD_ID> started by <USER>: file <FILE_NAME>.", "Insert upload log (PROCESSING)", "-"),
 ("lock", "Lock", "Another upload of the user is still PROCESSING", "Error", "Another Route Mileage upload is still in progress. Please wait.", "Reject request; nothing changed", "Wait and upload again"),
 ("type", "File check", "Not .xlsx / .xls or unreadable", "Error", "File format is not valid. Please upload the Excel template (.xlsx / .xls).", "Log ERROR; stop", "Use the template"),
 ("head", "File check", "Template columns not found", "Error", "Template is not valid: column <COLUMNS> not found. Please use the Download Template file.", "Log ERROR; stop", "Download Template"),
 ("empty", "File check", "No data row", "Error", "The file has no mileage data.", "Log ERROR; stop", "Fill the template"),
 ("many", "File check", "More than 1,000 data rows", "Error", "The file has <n> rows; maximum 1000 rows per upload.", "Log ERROR; stop", "Split the file"),
 ("row", "Row validation", "Row rule failed (MM-22 / MM-23)", "Error", "Row <ROW_NO>: <ERROR_MSG>.", "Temp row VALIDATION_STATUS 'E'", "Correct the file"),
 ("rows", "Row validation", "One or more rows with errors (MM-25)", "Error", "<n> row(s) have errors. Nothing was saved; correct the file and upload again.", "Log ERROR with counts; return Row / Column / Error list (modal on screen)", "Correct the file, upload again"),
 ("nothing", "Row validation", "All rows No change", "Info", "All routes in the file already have the same mileage. Nothing to save.", "Log ERROR (nothing to save)", "-"),
 ("db", "Save", "DB error on insert / update", "Error", "Route Mileage upload <UPLOAD_ID> failed: <DB_ERROR>. Nothing was saved.", "Rollback; log ERROR", "Try again"),
 ("ok", "Save", "Saved", "Info", "Upload completed: <n> route(s) created, <m> route(s) updated.", "Commit; log SUCCESS; delete temp rows", "-"),
 ("sys", "Processing", "Unexpected error", "Critical", "Route Mileage upload <UPLOAD_ID> stopped: <ERROR>.", "Rollback; log ERROR", "Contact system administrator"),
]
N = {l[0]: i for i, l in enumerate(LOG, 1)}
n = lambda k: f"log message no. {N[k]}"

opflow = {"direction": "LR", "nodes": [
  {"id": "s", "label": "Route Mileage screen: Choose File", "type": "screen"}, {"id": "v", "label": "Upload: validate, then save", "type": "process"},
  {"id": "t", "label": f"{T_T} / {T_L}", "type": "db"}, {"id": "x", "label": "Error modal: Row / Column / Error", "type": "screen"},
  {"id": "m", "label": T_M, "type": "db"}],
 "edges": [{"from": "s", "to": "v"}, {"from": "v", "to": "t"}, {"from": "v", "to": "x", "label": "any error"}, {"from": "v", "to": "m", "label": "all valid: 1 transaction"}]}

ff = {"direction": "TB", "nodes": [
  {"id": "s", "label": "START (Choose File)", "type": "start"},
  {"id": "p1", "label": "Upload ID, log PROCESSING, lock", "type": "process", "step": 1},
  {"id": "lg", "label": T_L, "type": "db", "lane": "output"},
  {"id": "p2", "label": "File check: type, header, rows", "type": "process", "step": 2},
  {"id": "d2", "label": "File OK?", "type": "decision", "step": 3},
  {"id": "x2", "label": "Log ERROR, message", "type": "message"},
  {"id": "p3", "label": "Load rows to temp as text", "type": "process", "step": 4},
  {"id": "tt", "label": T_T, "type": "db", "lane": "output"},
  {"id": "p4", "label": "Validate rows: format, masters, file duplicates, existing route", "type": "process", "step": 5},
  {"id": "ms", "label": "Master Location / Route Mileage", "type": "db", "lane": "input"},
  {"id": "p5", "label": "Any row error / nothing to save?", "type": "decision", "step": 6},
  {"id": "x5", "label": "Log ERROR, return Row / Column / Error", "type": "message"},
  {"id": "p6", "label": "BEGIN TRAN, re-read routes (UPDLOCK)", "type": "process", "step": 7},
  {"id": "p7", "label": "Insert New, update Update, history; COMMIT", "type": "process", "step": 8},
  {"id": "mm", "label": T_M, "type": "db", "lane": "output"},
  {"id": "p8", "label": "Log SUCCESS, delete temp", "type": "process", "step": 9},
  {"id": "e", "label": "END", "type": "end"}],
 "same_rank": [["d2", "x2"], ["p5", "x5"]],
 "edges": [{"from": "s", "to": "p1"}, {"from": "p1", "to": "lg"}, {"from": "p1", "to": "p2"}, {"from": "p2", "to": "d2"}, {"from": "d2", "to": "x2", "label": "No"},
   {"from": "d2", "to": "p3", "label": "Yes"}, {"from": "p3", "to": "tt"}, {"from": "p3", "to": "p4"}, {"from": "ms", "to": "p4"}, {"from": "p4", "to": "p5"},
   {"from": "p5", "to": "x5", "label": "Yes"}, {"from": "p5", "to": "p6", "label": "No"}, {"from": "p6", "to": "p7"}, {"from": "p7", "to": "mm"}, {"from": "p7", "to": "p8"}, {"from": "p8", "to": "e"}]}

steps = [
 {"text": f"[Choose File] (one call, like the Planning Order upload): create UPLOAD_ID (sequence) and insert {T_L} with STATUS 'PROCESSING', FILE_NAME, START_DT; {n('start')}.",
  "children": [f"Lock: the user has another upload in PROCESSING: {n('lock')}. Stop."]},
 {"text": "File check before any data row is stored: extension .xlsx / .xls, readable; sheet with the header row containing FROM CODE (title rows above allowed); columns FROM CODE, TO CODE, MILEAGE (KM) present (other columns ignored); 1 to 1,000 data rows (empty rows skipped)."},
 {"text": "Decision: file OK?", "children": [f"{n('type')} / {n('head')} / {n('empty')} / {n('many')}: log STATUS 'ERROR' with MESSAGE, END_DT; stop (nothing in temp)."]},
 {"text": f"Insert every data row into {T_T} as text with UPLOAD_ID and the Excel ROW_NO; VALIDATION_STATUS 'N'."},
 {"text": "Validate every row and collect all its errors (Functional Description 4.2): format / mandatory -> Master Location (active) -> From <> To -> Mileage > 0, 2 decimals -> duplicate route in the file -> existing route (Inactive = error; Active same mileage = SAME; other mileage = UPDATE; none = NEW).",
  "children": [f"Each failed row: {n('row')}; temp VALIDATION_STATUS 'E', ERROR_COLUMN, ERROR_MSG, ACTION 'ERROR'. Valid rows: 'V' with ACTION."]},
 {"text": f"Update {T_L} counts. Decision: any error or nothing to save?",
  "children": [f"Errors: STATUS 'ERROR', END_DT, {n('rows')}; return the error list (ROW_NO, ERROR_COLUMN, ERROR_MSG) for the modal 'Upload validation failed'. Stop, nothing saved.",
               f"All SAME: STATUS 'ERROR', {n('nothing')}. Stop."]},
 {"text": "No error: BEGIN TRANSACTION in the same call (no preview / confirm step); read the routes of the file again with UPDLOCK so the result of step 5 is still valid."},
 {"text": f"INSERT {T_M} for ACTION 'NEW'; UPDATE {T_M} for ACTION 'UPDATE' (WHERE route AND VERSION read in step 7); INSERT {T_H} for each update (old / new mileage, proposed); COMMIT (all-or-nothing).",
  "children": [f"DB error: ROLLBACK, log 'ERROR', {n('db')}."]},
 {"text": f"Update {T_L}: STATUS 'SUCCESS', ADDED_ROWS, UPDATED_ROWS, END_DT; delete the temp rows; {n('ok')}. Unexpected error at any step: {n('sys')}."},
]

MCOL = [["FROM_LOCATION (TBD)", "VARCHAR(TBD)", "Y", "N", "Location From (Master Location code)"], ["TO_LOCATION (TBD)", "VARCHAR(TBD)", "Y", "N", "Location To (Master Location code)"],
  ["MILEAGE_KM (TBD)", "DECIMAL(9,2)", "", "N", "Mileage > 0"], ["STATUS (TBD)", "VARCHAR(10)", "", "N", "Active / Inactive"],
  ["LAST_UPLOAD_ID", "BIGINT", "", "Y", "Upload that created / changed the route last (proposed)"],
  ["CREATED_BY (TBD)", "VARCHAR(20)", "", "N", "Creator"], ["CREATED_DT (TBD)", "DATETIME", "", "N", "Created date"],
  ["UPDATED_BY (TBD)", "VARCHAR(20)", "", "N", "Last change by"], ["UPDATED_DT (TBD)", "DATETIME", "", "N", "Last change date"], ["VERSION (TBD)", "INT", "", "N", "Optimistic lock"]]
TCOL = [["UPLOAD_ID", "BIGINT", "Y", "N", "Upload"], ["ROW_NO", "INT", "Y", "N", "Excel row number"], ["FROM_CODE_TXT", "VARCHAR(50)", "", "Y", "FROM CODE as in the file"],
  ["TO_CODE_TXT", "VARCHAR(50)", "", "Y", "TO CODE as in the file"], ["MILEAGE_TXT", "VARCHAR(50)", "", "Y", "MILEAGE (KM) as in the file"],
  ["ACTION", "VARCHAR(10)", "", "Y", "NEW / UPDATE / SAME / ERROR"], ["OLD_MILEAGE", "DECIMAL(9,2)", "", "Y", "Current mileage (UPDATE / SAME)"],
  ["VALIDATION_STATUS", "CHAR(1)", "", "N", "N new / V valid / E error"], ["ERROR_COLUMN", "VARCHAR(100)", "", "Y", "Column of each error (FROM CODE / TO CODE / MILEAGE (KM) / ROUTE)"], ["ERROR_MSG", "VARCHAR(2000)", "", "Y", "All errors of the row"],
  ["CREATED_BY", "VARCHAR(20)", "", "N", "Uploader"], ["CREATED_DT", "DATETIME", "", "N", "Upload date"]]
LCOL = [["UPLOAD_ID", "BIGINT", "Y", "N", "Sequence"], ["FUNCTION_ID", "VARCHAR(20)", "", "N", "Route Mileage upload (TBD)"], ["FILE_NAME", "VARCHAR(255)", "", "N", "Uploaded file"],
  ["STATUS", "VARCHAR(12)", "", "N", "PROCESSING / ERROR / SUCCESS"], ["TOTAL_ROWS", "INT", "", "Y", "Data rows"],
  ["ADDED_ROWS", "INT", "", "Y", "NEW rows (saved on success)"], ["UPDATED_ROWS", "INT", "", "Y", "UPDATE rows"], ["SAME_ROWS", "INT", "", "Y", "No change rows"],
  ["ERROR_ROWS", "INT", "", "Y", "Rows with errors"], ["MESSAGE", "VARCHAR(2000)", "", "Y", "Result / error message"], ["START_DT", "DATETIME", "", "N", "Start"],
  ["END_DT", "DATETIME", "", "Y", "End"], ["CREATED_BY", "VARCHAR(20)", "", "N", "Uploader"]]
HCOL = [["HIST_ID", "BIGINT", "Y", "N", "Sequence"], ["FROM_LOCATION", "VARCHAR(TBD)", "", "N", "Route From"], ["TO_LOCATION", "VARCHAR(TBD)", "", "N", "Route To"],
  ["EVENT_TITLE", "VARCHAR(50)", "", "N", "'Mileage changed by upload'"], ["FIELD_NAME", "VARCHAR(30)", "", "N", "'MILEAGE_KM'"], ["OLD_VALUE", "VARCHAR(50)", "", "Y", "Old mileage"],
  ["NEW_VALUE", "VARCHAR(50)", "", "Y", "New mileage"], ["SOURCE", "VARCHAR(10)", "", "N", "UPLOAD / SCREEN"], ["UPLOAD_ID", "BIGINT", "", "Y", "Upload"],
  ["CREATED_BY", "VARCHAR(20)", "", "N", "User"], ["CREATED_DT", "DATETIME", "", "N", "Server date-time"]]
tables = [
 {"name": T_M, "kind": "transaction", "proposed": False, "description": "Route Mileage master (existing, refer UISS-Screen Master Mileage); LAST_UPLOAD_ID proposed", "columns": MCOL},
 {"name": T_T, "kind": "temp", "proposed": True, "description": "Rows of one upload as text + validation result", "columns": TCOL},
 {"name": T_L, "kind": "log", "proposed": True, "description": "One row per upload (status, counts), read by the screen", "columns": LCOL},
 {"name": T_H, "kind": "history", "proposed": True, "description": "Mileage change history (OQ-04)", "columns": HCOL},
]
def m(cols, desc, dflt="NULL"): return [{"dest_field": c[0], "description": desc.get(c[0], dflt)} for c in cols]
data_map = {"blocks": [
 {"source": {"table": "Upload request"}, "destination": {"table": T_L, "operation": "Insert", "description": "Step 1"},
  "mappings": m(LCOL, {"UPLOAD_ID": "Sequence", "FUNCTION_ID": "Route Mileage upload ID (TBD)", "FILE_NAME": "Uploaded file name", "STATUS": "'PROCESSING'", "START_DT": "Server date-time", "CREATED_BY": USER})},
 {"source": {"table": "Excel file (sheet with FROM CODE)"}, "destination": {"table": T_T, "operation": "Insert", "description": "Step 4 - each data row"},
  "mappings": [{"source_field": "(row number)", "dest_field": "ROW_NO", "description": "Excel row number"}, {"source_field": "FROM CODE", "dest_field": "FROM_CODE_TXT", "description": "Text, trimmed"},
   {"source_field": "TO CODE", "dest_field": "TO_CODE_TXT", "description": "Text, trimmed"}, {"source_field": "MILEAGE (KM)", "dest_field": "MILEAGE_TXT", "description": "Text as typed"},
   {"dest_field": "UPLOAD_ID", "description": "Upload"}, {"dest_field": "ACTION", "description": "NULL"}, {"dest_field": "OLD_MILEAGE", "description": "NULL"},
   {"dest_field": "VALIDATION_STATUS", "description": "'N'"}, {"dest_field": "ERROR_COLUMN", "description": "NULL"}, {"dest_field": "ERROR_MSG", "description": "NULL"}, {"dest_field": "CREATED_BY", "description": USER}, {"dest_field": "CREATED_DT", "description": "Server date-time"}]},
 {"source": {"table": T_T}, "destination": {"table": T_T, "operation": "Update", "description": "Step 5 - each row", "keys": [{"field": "UPLOAD_ID / ROW_NO", "value": "Row"}]},
  "mappings": [{"dest_field": "ACTION", "description": "NEW / UPDATE / SAME / ERROR"}, {"dest_field": "OLD_MILEAGE", "description": "Current mileage of the route (UPDATE / SAME)"},
               {"dest_field": "VALIDATION_STATUS", "description": "'V' or 'E'"}, {"dest_field": "ERROR_COLUMN", "description": "Column of each error, separated by ' | '"}, {"dest_field": "ERROR_MSG", "description": "All errors of the row, separated by ' | '"}]},
 {"source": {"table": T_T}, "destination": {"table": T_L, "operation": "Update", "description": "Step 3 / 6 - file or row errors", "keys": [{"field": "UPLOAD_ID", "value": "Upload"}]},
  "mappings": [{"dest_field": "STATUS", "description": "'ERROR'"}, {"dest_field": "TOTAL_ROWS / ADDED_ROWS / UPDATED_ROWS / SAME_ROWS / ERROR_ROWS", "description": "Counts by ACTION"},
               {"dest_field": "MESSAGE", "description": "Log message text"}, {"dest_field": "END_DT", "description": "Server date-time"}]},
 {"source": {"table": T_T, "keys": [{"field": "ACTION", "value": "'NEW'"}]}, "destination": {"table": T_M, "operation": "Insert", "description": "Step 8 - NEW rows"},
  "mappings": m(MCOL, {"FROM_LOCATION (TBD)": "UPPER(FROM_CODE_TXT)", "TO_LOCATION (TBD)": "UPPER(TO_CODE_TXT)", "MILEAGE_KM (TBD)": "MILEAGE_TXT as number (comma = decimal sign), rounded to 2 decimals",
    "STATUS (TBD)": "'Active'", "LAST_UPLOAD_ID": "UPLOAD_ID", "CREATED_BY (TBD)": USER, "CREATED_DT (TBD)": "Server date-time", "UPDATED_BY (TBD)": USER, "UPDATED_DT (TBD)": "Server date-time", "VERSION (TBD)": "1"})},
 {"source": {"table": T_T, "keys": [{"field": "ACTION", "value": "'UPDATE'"}]}, "destination": {"table": T_M, "operation": "Update", "description": "Step 8 - UPDATE rows",
   "keys": [{"field": "FROM_LOCATION / TO_LOCATION", "value": "Route of the row"}, {"field": "VERSION", "value": "Version read in step 7"}]},
  "mappings": m(MCOL, {"FROM_LOCATION (TBD)": "Key, not changed", "TO_LOCATION (TBD)": "Key, not changed", "MILEAGE_KM (TBD)": "New mileage of the row", "STATUS (TBD)": "Not changed (Active)",
    "LAST_UPLOAD_ID": "UPLOAD_ID", "UPDATED_BY (TBD)": USER, "UPDATED_DT (TBD)": "Server date-time", "VERSION (TBD)": "VERSION + 1"}, "Not changed")},
 {"source": {"table": "UPDATE rows"}, "destination": {"table": T_H, "operation": "Insert", "description": "Step 8 - each UPDATE row (proposed)"},
  "mappings": m(HCOL, {"HIST_ID": "Sequence", "FROM_LOCATION": "Route From", "TO_LOCATION": "Route To", "EVENT_TITLE": "'Mileage changed by upload'", "FIELD_NAME": "'MILEAGE_KM'",
    "OLD_VALUE": "OLD_MILEAGE", "NEW_VALUE": "New mileage", "SOURCE": "'UPLOAD'", "UPLOAD_ID": "UPLOAD_ID", "CREATED_BY": USER, "CREATED_DT": "Server date-time"})},
 {"source": {"table": "Result"}, "destination": {"table": T_L, "operation": "Update", "description": "Step 9 - success / DB error", "keys": [{"field": "UPLOAD_ID", "value": "Upload"}]},
  "mappings": [{"dest_field": "STATUS", "description": "'SUCCESS' / 'ERROR'"}, {"dest_field": "ADDED_ROWS / UPDATED_ROWS", "description": "Saved counts"}, {"dest_field": "MESSAGE", "description": "Log message text"}, {"dest_field": "END_DT", "description": "Server date-time"}]},
 {"source": {"table": T_T}, "destination": {"table": T_T, "operation": "Delete", "description": "Step 9 - success", "keys": [{"field": "UPLOAD_ID", "value": "Upload"}]},
  "mappings": [{"dest_field": "(all rows of the upload)", "description": "Deleted; ERROR uploads kept N days for the error list (TBD)"}]},
]}

func_desc = [
 H("DESCRIPTION", "4."),
 T("Backend of the Excel upload on the Route Mileage screen (Master > Mileage). One call, like the Planning Order upload: [Choose File] uploads and validates the file; with any error nothing is saved and the Row / Column / Error list is returned (modal on the screen); without errors all New and Update rows are saved at once in one transaction.", 1, False),
 T("4.1 Template (Download Template: Template_Route_Mileage.xlsx)"),
 tbl([("Column", 9), ("Rule", 27), ("Example", 9)], [["FROM CODE", "Mandatory; active Master Location code; upper case", "SNT"], ["TO CODE", "Mandatory; active Master Location code; <> FROM CODE", "CKR"],
   ["MILEAGE (KM)", "Mandatory; number > 0; max 2 decimals; comma = decimal sign", "42 / 16,5"]]),
 I("a.", "Sheets: Route Mileage (header + 2 examples), Active Locations (code, name), Notes. Title rows above the header are allowed; other columns are ignored. Max 1,000 data rows (TBD)."),
 T("4.2 Row validation (all errors of a row are collected)"),
 tbl([("ID", 5), ("Check", 22), ("Result", 18)], [["MM-22", "Mandatory From / To / Mileage", "Location From / To / Mileage is required."],
   ["MM-22", "From / To active in Master Location", "Location X is not an active location in Master Location."], ["MM-22", "From <> To", "Location From and Location To cannot be the same."],
   ["MM-22", "Mileage > 0, 2 decimals", "Mileage must be greater than 0 KM."], ["MM-23", "Route repeated in the file", "Route is repeated in the file (row n)."],
   ["MM-23", "Existing route Inactive", "Route X -> Y exists but is Inactive; activate it on the screen first."],
   ["MM-24", "Existing Active route", "same mileage = SAME (skipped); other mileage = UPDATE"], ["MM-24", "Route not existing", "NEW"]]),
 {"type": "column_break"},
 T("4.3 Save rules"),
 I("a.", "All-or-nothing (MM-25): saved only when ERROR_ROWS = 0 and ADDED + UPDATED > 0, in the same call (no preview / confirm). The routes are re-read with UPDLOCK inside the transaction."),
 I("b.", "NEW = insert Active with audit; UPDATE = mileage, updated by / date, VERSION + 1, created by / date kept; SAME = nothing written."),
 I("c.", "One upload per user at a time (lock while PROCESSING)."),
 T("4.4 Open questions"),
 tbl([("ID", 5), ("Question", 40)], [["OQ-01", "Existing route by upload: update (implemented) or reject (new routes only)?"], ["OQ-02", "Inactive route in the file: error (implemented) or update and re-activate?"],
   ["OQ-03", "Max rows (1,000), partial save of valid rows instead of all-or-nothing?"], ["OQ-04", "Mileage history table needed (proposed TB_H_MILEAGE)?"],
   ["OQ-05", "Keep temp rows of error uploads how many days?"], ["OQ-06", "Physical table / column names of Route Mileage Master and the role allowed to upload"]]),
]
spec = {
 "doc_type": "batch",
 "header": {"phase": "DR", "project_name": "ELIPS Enhancement (TC-PBR)", "block_name": "Batch / Upload", "function_name": "TBD Master Mileage - Route Mileage Upload", "created_date": "13-Nov-26", "created_by": "Susanto"},
 "revisions": [{"revision": "0.1", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "", "description": "Initial draft: backend of the Route Mileage Excel upload (template, temp table, validation, all-or-nothing save, log) - MM-20..MM-29"},
               {"revision": "0.2", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "", "description": "One call like the Planning Order upload: validate then save immediately when every row is valid (no preview / Confirm Upload); errors return Row / Column / Error (new temp column ERROR_COLUMN); removed VALIDATED / CANCELLED status, expiry, cancel and re-check messages"}],
 "general": {
  "objective": ["To create and update many Route Mileage records at once from the Excel template uploaded on the Route Mileage screen.",
                "To validate every row with the same rules as the screen and return the Row / Column / Error list when any row fails (nothing saved).",
                "To save all valid New and Update rows in one transaction (all-or-nothing) and keep a log of every upload."],
  "operation_flow": {"flow": opflow},
  "inputs": [{"name": "Excel file (Template_Route_Mileage.xlsx)", "type": "File", "description": "FROM CODE, TO CODE, MILEAGE (KM)"},
             {"name": "Master Location", "type": "DB", "description": "Active location codes"}, {"name": T_M, "type": "DB", "description": "Existing routes (status, mileage, version)"}],
  "outputs": [{"name": T_M, "type": "DB", "description": "New / updated routes"}, {"name": T_T, "type": "DB", "description": "Rows + validation (proposed)"},
              {"name": T_L, "type": "DB", "description": "Upload result (proposed)"}, {"name": T_H, "type": "DB", "description": "Mileage history (proposed)"}],
  "extra_tables": [{"title": "Execution", "columns": [{"title": "Item", "width": 10}, {"title": "Description", "width": 30}],
     "rows": [["Trigger", "Online: [Choose File] in the Upload Excel accordion of Route Mileage"], ["Transaction", "Same call, one transaction, all-or-nothing"],
              ["Lock", "One open upload per user"], ["Limits", "1,000 rows (TBD)"]]}],
  "constraints": ["Table names marked proposed / TBD must follow the project convention.", "Same validation rules as the screen (refer UISS-Screen Master Mileage MM-01..MM-06)."],
 },
 "func_flow": {"flow": ff, "steps": steps},
 "data_map": data_map,
 "func_desc": func_desc,
 "func_desc_layout": "two",
 "logging_messages": [{"event": e, "cause": c, "type": t, "msg_id": "TBD", "message": mm, "action": {"system": sy, "user": us}} for _, e, c, t, mm, sy, us in LOG],
 "tables": tables,
}
json.dump(spec, open(f"{SRC}/UISS_Batch_Master_Mileage_Upload.json", "w"), indent=1)
print("ok")
