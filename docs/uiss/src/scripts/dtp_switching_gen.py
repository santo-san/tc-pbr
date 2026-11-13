import json, sys
S = sys.argv[1]; IMG = f"{S}/swout"
H = lambda t, n=None: {"type": "heading", "text": t, **({"num": n} if n else {})}
T = lambda t, l=1, b=True: {"type": "text", "text": t, "level": l, "bold": b}
I = lambda m, t, l=2: {"type": "item", "marker": m, "text": t, "level": l}
B = lambda items, l=2, m="-": {"type": "bullets", "items": items, "level": l, "marker": m}
def tbl(cols, rows, l=1): return {"type": "table", "level": l, "columns": [{"title": c, "width": w} for c, w in cols], "rows": rows, "row_lines": "all"}
BID = "Login user (VPLD Planner)"
LOG = [
 ("start", "Process start", "DTP Switching request received", "Info", "DTP Switching <REQUEST_ID> started by <USER>: <n> record(s).", "Insert request log (PROCESSING)", "-"),
 ("dup", "Process start", "Same request id already processed / processing", "Warning", "DTP Switching request <REQUEST_ID> already processed, result returned.", "Return stored result, no change", "-"),
 ("auth", "Authorization", "User is not VPLD Planner (DT-01)", "Error", "Only the VPLD Planner can create DTP.", "Reject request (403)", "Login as VPLD Planner"),
 ("empty", "Parameter check", "No record selected", "Error", "Select at least one submitted DTP record that the driver has not started.", "Reject request (400)", "Select records"),
 ("db", "Connect to database server", "Cannot connect / lock timeout", "Critical", "Database cannot be connected.", "Stop; nothing changed", "Retry / contact system administrator"),
 ("notsub", "Record validation", "Record not submitted (Available / Ready / Validation Error)", "Error", "DTP <DTP_REC_ID> has not been submitted. There is nothing to roll back.", "Reject request (409), nothing changed", "Refresh"),
 ("proc", "Record validation", "Record Processing, version changed, already rolled back or order missing", "Error", "DTP <DTP_REC_ID> is no longer eligible for rollback. Please refresh the data and try again.", "Reject request (409), nothing changed", "Refresh and try again"),
 ("drv", "Record validation", "Driver started: order not Planning Order / Order Release, or a cycle has Start Cycle", "Error", "DTP <DTP_REC_ID> cannot be rolled back because the driver has already started the process (order <ORDER_NO> <STATUS>).", "Reject request (409), nothing changed", "-"),
 ("upd", "Rollback update", "DB error on any update / insert", "Error", "DTP Switching <REQUEST_ID> failed: <DB_ERROR>. Transaction rolled back.", "Rollback all; request log ERROR (500)", "Try again"),
 ("rec", "Rollback update", "Record rolled back", "Info", "DTP <DTP_REC_ID> rolled back from <PREV_STATUS> to <NEW_STATUS>; order <ORDER_NO> cancelled; truck <PLATE_NO> released.", "-", "-"),
 ("end", "Process end", "All records rolled back", "Info", "DTP Switching <REQUEST_ID> finished: <n> record(s) rolled back.", "Request log SUCCESS (200)", "-"),
 ("sys", "Processing", "Unexpected system error", "Critical", "DTP Switching <REQUEST_ID> stopped: <ERROR>.", "Rollback all; request log ERROR; inform system owner by e-mail (TBD)", "Contact system administrator"),
]
N = {l[0]: i for i, l in enumerate(LOG, 1)}
n = lambda k: f"log message no. {N[k]}"

opflow = {"direction": "TB", "nodes": [
  {"id": "a", "label": "DTP Creation grid: DTP Switching", "type": "screen"},
  {"id": "b", "label": "Confirm DTP Switching", "type": "screen"},
  {"id": "p", "label": "DTP Switching process (1 transaction)", "type": "process"},
  {"id": "r", "label": "TB_R_DTP_RECORD -> Available", "type": "db"},
  {"id": "o", "label": "Daily Order cancelled / truck released", "type": "db"},
  {"id": "d", "label": "Driver sync REMOVE", "type": "db"},
  {"id": "e", "label": "Correct and Submit again", "type": "screen"}],
 "edges": [{"from": "a", "to": "b"}, {"from": "b", "to": "p", "label": "Confirm Rollback"}, {"from": "p", "to": "r"}, {"from": "p", "to": "o", "label": "Processed"}, {"from": "o", "to": "d"}, {"from": "r", "to": "e"}]}
ff = {"direction": "TB", "nodes": [
  {"id": "s", "label": "START", "type": "start"},
  {"id": "p1", "label": "Get request, check role and request id", "type": "process", "step": 1},
  {"id": "lg", "label": "TB_R_DTP_SWITCH_REQ", "type": "db", "lane": "output"},
  {"id": "p2", "label": "Lock DTP records and linked orders", "type": "process", "step": 2},
  {"id": "src", "label": "TB_R_DTP_RECORD / Daily Order / Cycle", "type": "db", "lane": "input"},
  {"id": "p3", "label": "Re-check eligibility of every record (4.1)", "type": "process", "step": 3},
  {"id": "d3", "label": "All eligible?", "type": "decision", "step": 4},
  {"id": "x3", "label": "409: list failed, nothing changed", "type": "message"},
  {"id": "p4", "label": "Remove queue entry / cancel order, release truck", "type": "process", "step": 5},
  {"id": "ord", "label": "Daily Order / Truck Assign / Driver sync", "type": "db", "lane": "output"},
  {"id": "p5", "label": "Record -> Available (re-validate)", "type": "process", "step": 6},
  {"id": "rec", "label": "TB_R_DTP_RECORD", "type": "db", "lane": "output"},
  {"id": "p6", "label": "Insert history and switch log", "type": "process", "step": 7},
  {"id": "his", "label": "TB_H_DTP_RECORD_STS / TB_H_DTP_SWITCH", "type": "db", "lane": "output"},
  {"id": "p7", "label": "Commit; update request log", "type": "process", "step": 8},
  {"id": "e", "label": "END", "type": "end"}],
 "same_rank": [["d3", "x3"]],
 "edges": [{"from": "s", "to": "p1"}, {"from": "p1", "to": "lg"}, {"from": "p1", "to": "p2"}, {"from": "src", "to": "p2"}, {"from": "p2", "to": "p3"}, {"from": "p3", "to": "d3"},
   {"from": "d3", "to": "x3", "label": "No"}, {"from": "d3", "to": "p4", "label": "Yes"}, {"from": "p4", "to": "ord"}, {"from": "p4", "to": "p5"}, {"from": "p5", "to": "rec"},
   {"from": "p5", "to": "p6"}, {"from": "p6", "to": "his"}, {"from": "p6", "to": "p7"}, {"from": "p7", "to": "e"}]}
steps = [
 {"text": f"Receive request {{requestId, records [{{DTP_REC_ID, VERSION}}]}} from the DTP Creation screen; {n('start')}.", "children": [f"User not VPLD Planner: {n('auth')}. Stop.", f"No record: {n('empty')}. Stop.", f"Request id already in TB_R_DTP_SWITCH_REQ: return stored result, {n('dup')}. Stop.", "Insert TB_R_DTP_SWITCH_REQ with STATUS 'PROCESSING'."]},
 {"text": "BEGIN TRANSACTION. Select the DTP records WITH (UPDLOCK) and, for Processed records, the linked Daily order and cycles WITH (UPDLOCK).", "children": [f"Lock / connection error: {n('db')}."]},
 {"text": "Re-check every record with the rules of Functional Description 4.1 (latest data, not the screen data); VERSION must equal the version shown.", "children": []},
 {"text": "If any record fails: ROLLBACK, request log 'REJECTED' with the failed list (409). Nothing changed (all-or-nothing, as Submit DT-15).", "children": [f"Not submitted: {n('notsub')}; Processing / version / order missing: {n('proc')}; driver started: {n('drv')}."]},
 {"text": "Per record, by previous status:", "children": ["Submitted / Queued / Failed: delete the queue entry of the record.",
   "Processed: cancel the Daily order (CANCEL_FLAG 'Y'), release the active truck assignment (ACTIVE_FLAG 'N'), insert TB_H_ORDER_ASSIGN 'DTP Switching', insert TB_T_DRIVER_SYNC_QUEUE 'ORDER_UPDATE' (driver card removed)."]},
 {"text": "Update TB_R_DTP_RECORD: STATUS 'Available', ORDER_NO / SUBMITTED_BY / SUBMITTED_DT / FAIL_REASON null, ATTEMPT_CNT 0, VERSION + 1. Re-validate the record (DTP Creation rules DT-04..DT-10); if invalid: STATUS 'Validation Error' with ERROR_MSG."},
 {"text": f"Insert TB_H_DTP_RECORD_STS (status history) and TB_H_DTP_SWITCH (switch audit with order snapshot); {n('rec')}."},
 {"text": f"COMMIT; request log 'SUCCESS' with counts; {n('end')}. Any DB error in steps 5-7: ROLLBACK everything, request log 'ERROR', {n('upd')}. Unexpected error: {n('sys')}."},
]

REC = ['DTP_REC_ID:BIGINT', 'PLAN_DT:DATE', 'DTP_MODEL:VARCHAR(10)', 'IO_TYPE:VARCHAR(6)', 'EXPORTER:VARCHAR(TBD)', 'IMPORTER_CD:VARCHAR(20)', 'ROUND_USE:CHAR(1)', 'LP_CD:VARCHAR(TBD)', 'RENBAN:VARCHAR(20)', 'FROM_LOC_CD:VARCHAR(TBD)', 'TO_LOC_CD:VARCHAR(TBD)', 'DEST_CD:VARCHAR(20)', 'ETD_DT:DATE', 'CTR_SIZE:VARCHAR(5)', 'SHIPPING_AGENT:VARCHAR(TBD)', 'CTR_BOOKING_NO:VARCHAR(20)', 'VESSEL_NAME:VARCHAR(TBD)', 'TRUCK_TYPE:VARCHAR(TBD)', 'CONTAINER_NO:VARCHAR(11)', 'DESCRIPTION:VARCHAR(TBD)', 'SHIFT:VARCHAR(5)', 'CTR_DG_FLAG:VARCHAR(2)', 'ARRIVAL_DT:DATE', 'ARRIVAL_TIME:CHAR(5)', 'DATA_SOURCE:VARCHAR(6)', 'STATUS:VARCHAR(20)', 'ERROR_MSG:VARCHAR(2000)', 'ORDER_NO:VARCHAR(20)', 'ATTEMPT_CNT:INT', 'FAIL_REASON:VARCHAR(1000)', 'SUBMITTED_BY:VARCHAR(20)', 'SUBMITTED_DT:DATETIME', 'LAST_UPLOAD_ID:BIGINT', 'VERSION:INT', 'CREATED_BY:VARCHAR(20)', 'CREATED_DT:DATETIME', 'CHANGED_BY:VARCHAR(20)', 'CHANGED_DT:DATETIME']
REC = [c.split(':') for c in REC]
CH = {"STATUS": "'Available'; 'Validation Error' when re-validation fails", "ERROR_MSG": "Null, or validation message", "ORDER_NO": "Null (old Order No kept in TB_H_DTP_SWITCH)",
      "ATTEMPT_CNT": "0", "FAIL_REASON": "Null", "SUBMITTED_BY": "Null", "SUBMITTED_DT": "Null", "VERSION": "VERSION + 1", "CHANGED_BY": BID, "CHANGED_DT": "Server date-time", "DTP_REC_ID": "Key, not changed"}
SW = [["SWITCH_ID", "BIGINT", "Y", "N", "Sequence"], ["REQUEST_ID", "VARCHAR(50)", "", "N", "Request id of the screen action"], ["DTP_REC_ID", "BIGINT", "", "N", "DTP record"],
      ["PREV_STATUS", "VARCHAR(20)", "", "N", "Submitted / Queued / Failed / Processed"], ["NEW_STATUS", "VARCHAR(20)", "", "N", "Available / Validation Error"],
      ["ORDER_NO", "VARCHAR(20)", "", "Y", "Cancelled Daily order (Processed only)"], ["ORDER_STATUS", "VARCHAR(30)", "", "Y", "Planning Order / Order Release at rollback"],
      ["LP_STATUS", "VARCHAR(10)", "", "Y", "Waiting / Accepted / Rejected"], ["PLATE_NO", "VARCHAR(TBD)", "", "Y", "Released truck"], ["DRIVER_ID", "VARCHAR(TBD)", "", "Y", "Driver of the released truck"],
      ["ORDER_SNAPSHOT", "NVARCHAR(MAX)", "", "Y", "JSON: order, cycle, history at rollback"], ["CREATED_BY", "VARCHAR(20)", "", "N", "Login user"], ["CREATED_DT", "DATETIME", "", "N", "Server date-time"]]
REQ = [["REQUEST_ID", "VARCHAR(50)", "Y", "N", "Request id from the screen (idempotency)"], ["PLAN_DT", "DATE", "", "N", "Planning date of the grid"], ["STATUS", "VARCHAR(10)", "", "N", "PROCESSING / SUCCESS / REJECTED / ERROR"],
       ["TOTAL_RECORDS", "INT", "", "N", "Selected records"], ["SWITCHED_RECORDS", "INT", "", "N", "Rolled back"], ["FAILED_RECORDS", "INT", "", "N", "Failed re-check"],
       ["RESULT_JSON", "NVARCHAR(MAX)", "", "Y", "Response (failed list)"], ["MESSAGE", "VARCHAR(1000)", "", "Y", "Summary / error"], ["START_DT", "DATETIME", "", "N", "Start"], ["END_DT", "DATETIME", "", "Y", "End"], ["CREATED_BY", "VARCHAR(20)", "", "N", "Login user"]]
tables = [
 {"name": "TB_R_DTP_RECORD", "kind": "transaction", "proposed": False, "description": "DTP record (existing, see UISS-Batch DTP Excel Upload)", "columns": [[c, t, "Y" if c == "DTP_REC_ID" else "", "N", ""] for c, t in REC]},
 {"name": "TB_H_DTP_SWITCH", "kind": "history", "proposed": True, "description": "Audit of every DTP Switching (one row per record)", "columns": SW},
 {"name": "TB_R_DTP_SWITCH_REQ", "kind": "log", "proposed": True, "description": "One row per DTP Switching request (idempotency and result)", "columns": REQ},
]
data_map = {"blocks": [
 {"source": {"table": "Screen request"}, "destination": {"table": "TB_R_DTP_SWITCH_REQ", "operation": "Insert", "description": "Step 1 - start"},
  "mappings": [{"dest_field": c[0], "description": {"REQUEST_ID": "Request id", "PLAN_DT": "Planning date", "STATUS": "'PROCESSING'", "TOTAL_RECORDS": "Count of selected records", "SWITCHED_RECORDS": "0", "FAILED_RECORDS": "0", "RESULT_JSON": "Null", "MESSAGE": "Null", "START_DT": "Server date-time", "END_DT": "Null", "CREATED_BY": BID}[c[0]]} for c in REQ]},
 {"source": {"table": "DTP processing queue (TBD)", "keys": [{"field": "DTP_REC_ID", "value": "Record (prev Submitted / Queued / Failed)"}]}, "destination": {"table": "DTP processing queue (TBD)", "operation": "Delete", "description": "Step 5 - not yet processed", "keys": [{"field": "DTP_REC_ID", "value": "Record"}]},
  "mappings": [{"dest_field": "(queue row)", "description": "Deleted, so the queue service does not create an order"}]},
 {"source": {"table": "Daily Order (TB_R_DAILY_ORDER, TBD)", "keys": [{"field": "ORDER_NO", "value": "TB_R_DTP_RECORD.ORDER_NO"}]}, "destination": {"table": "Daily Order (TB_R_DAILY_ORDER, TBD)", "operation": "Update", "description": "Step 5 - prev Processed", "keys": [{"field": "ORDER_NO", "value": "Linked order"}, {"field": "STATUS", "value": "IN ('Planning Order','Order Release')"}]},
  "mappings": [{"dest_field": "CANCEL_FLAG (proposed)", "description": "'Y' - hidden from Daily Monitoring, Truck Assignment, Driver API, SA (OQ-01)"}, {"dest_field": "CANCEL_REASON (proposed)", "description": "'DTP Switching'"},
               {"dest_field": "CANCEL_BY / CANCEL_DT (proposed)", "description": "Login user / server date-time"}, {"dest_field": "STATUS", "description": "Not changed (no new status)"},
               {"dest_field": "VERSION", "description": "VERSION + 1 (rows affected must = 1, else rollback)"}, {"dest_field": "CHANGED_BY / CHANGED_DT", "description": "Login user / server date-time"}]},
 {"source": {"table": "TB_R_ORDER_TRUCK_ASSIGN", "keys": [{"field": "ORDER_NO", "value": "Linked order"}, {"field": "ACTIVE_FLAG", "value": "'Y'"}]}, "destination": {"table": "TB_R_ORDER_TRUCK_ASSIGN", "operation": "Update", "description": "Step 5 - truck assigned", "keys": [{"field": "ASSIGN_ID", "value": "Active row"}]},
  "mappings": [{"dest_field": "ACTIVE_FLAG", "description": "'N' (truck free for other orders)"}, {"dest_field": "RELEASED_BY / RELEASED_DT", "description": "Login user / server date-time"}]},
 {"source": {"table": "System"}, "destination": {"table": "TB_H_ORDER_ASSIGN", "operation": "Insert", "description": "Step 5 - prev Processed"},
  "mappings": [{"dest_field": "ORDER_NO", "description": "Linked order"}, {"dest_field": "ACTION", "description": "'DTP Switching'"}, {"dest_field": "PREV_ / NEW_ ORDER_STATUS, PLATE", "description": "Before / after (plate released)"}, {"dest_field": "UPDATED_BY / UPDATED_DT", "description": "Login user / server date-time"}]},
 {"source": {"table": "System"}, "destination": {"table": "TB_T_DRIVER_SYNC_QUEUE", "operation": "Insert", "description": "Step 5 - order had a truck"},
  "mappings": [{"dest_field": "ORDER_NO", "description": "Linked order"}, {"dest_field": "EVENT_TYPE", "description": "'ORDER_UPDATE' (cancelled -> REMOVE in Driver APK)"}, {"dest_field": "PREV_PLATE / NEW_PLATE", "description": "Released plate / null"}, {"dest_field": "STATUS", "description": "'N'"}, {"dest_field": "CREATED_BY / CREATED_DT", "description": "Login user / server date-time"}]},
 {"source": {"table": "TB_R_DTP_RECORD", "keys": [{"field": "DTP_REC_ID", "value": "Selected record"}]}, "destination": {"table": "TB_R_DTP_RECORD", "operation": "Update", "description": "Step 6", "keys": [{"field": "DTP_REC_ID", "value": "Selected record"}, {"field": "VERSION", "value": "Version shown"}]},
  "mappings": [{"dest_field": c, "description": CH.get(c, "Not changed")} for c, _ in REC]},
 {"source": {"table": "System"}, "destination": {"table": "TB_H_DTP_RECORD_STS", "operation": "Insert", "description": "Step 7 - status history (existing)"},
  "mappings": [{"dest_field": "HIST_ID", "description": "Sequence"}, {"dest_field": "DTP_REC_ID", "description": "Record"}, {"dest_field": "STATUS", "description": "New status"},
               {"dest_field": "NOTE", "description": "'DTP Switching by {user}: rollback from {prev}; Daily order {no} ({status}, LP {lp}, truck {plate}) cancelled'"}, {"dest_field": "CREATED_BY", "description": BID}, {"dest_field": "CREATED_DT", "description": "Server date-time"}]},
 {"source": {"table": "Record / order before update"}, "destination": {"table": "TB_H_DTP_SWITCH", "operation": "Insert", "description": "Step 7 - switch audit"},
  "mappings": [{"dest_field": c[0], "description": {"SWITCH_ID": "Sequence", "REQUEST_ID": "Request id", "DTP_REC_ID": "Record", "PREV_STATUS": "Status before", "NEW_STATUS": "Status after",
     "ORDER_NO": "Order No before (Processed)", "ORDER_STATUS": "Order status before", "LP_STATUS": "LP status before", "PLATE_NO": "Plate before", "DRIVER_ID": "Driver before",
     "ORDER_SNAPSHOT": "JSON of order, cycle, history", "CREATED_BY": BID, "CREATED_DT": "Server date-time"}[c[0]]} for c in SW]},
 {"source": {"table": "Result of the request"}, "destination": {"table": "TB_R_DTP_SWITCH_REQ", "operation": "Update", "description": "Step 4 / 8 - end", "keys": [{"field": "REQUEST_ID", "value": "Request"}]},
  "mappings": [{"dest_field": c[0], "description": {"REQUEST_ID": "Key, not changed", "PLAN_DT": "Not changed", "STATUS": "'SUCCESS' / 'REJECTED' / 'ERROR'", "TOTAL_RECORDS": "Not changed", "SWITCHED_RECORDS": "Count", "FAILED_RECORDS": "Count",
     "RESULT_JSON": "Response incl. failed list", "MESSAGE": "Summary / error", "START_DT": "Not changed", "END_DT": "Server date-time", "CREATED_BY": "Not changed"}[c[0]]} for c in REQ]},
]}

func_desc = [
 H("DESCRIPTION", "4."),
 T("DTP Switching rolls back DTP records already submitted to the trucking company, as long as the driver has not started, so they can be corrected and submitted again. It is started from the DTP Creation grid (button DTP Switching / row option) after the confirmation 'Confirm DTP Switching'. Existing statuses are reused; no new status is created.", 1, False),
 T("4.1 Eligibility (checked on the screen and again in step 3)"),
 tbl([("DTP status", 9), ("Linked Daily order", 14), ("Result", 22)], [
   ["Available / Ready / Validation Error", "-", f"Not submitted ({n('notsub')})"],
   ["Submitted / Queued", "not created", "Allowed - queue entry deleted"],
   ["Failed", "not created", "Allowed"],
   ["Processing", "being created", f"Not eligible ({n('proc')})"],
   ["Processed", "Planning Order / Order Release, no cycle Start Cycle", "Allowed - order cancelled, truck released"],
   ["Processed", "Start / Finish / SA / PO or a cycle started", f"Driver started ({n('drv')})"],
   ["Processed", "order not found / cancelled", f"Not eligible ({n('proc')})"]]),
 I("a.", "Driver Started = Daily order status not in (Planning Order, Order Release) OR any cycle START_DT not null."),
 I("b.", "VERSION of the record must equal the version shown on the screen (stale data -> not eligible)."),
 T("4.2 Batch rule"),
 I("a.", "All-or-nothing per request, as Submit (DT-15): one record failing the re-check rejects the whole request; the response lists every failed record with its reason. Partial success: OQ-04."),
 T("4.3 Concurrency"),
 I("a.", "Row locks on the records and orders inside the transaction; the Driver APK Start Order and the queue service check the same rows, so either the driver start or the rollback wins, never both."),
 I("b.", "The queue service skips a record whose status is no longer Submitted / Queued / Processing."),
 {"type": "column_break"},
 T("4.4 Data kept for audit"),
 I("a.", "Nothing is physically deleted except the queue entry: the Daily order is logically cancelled, assignment rows are deactivated, all history rows are added; the old Order No and an order snapshot are stored in TB_H_DTP_SWITCH."),
 T("4.5 After rollback"),
 I("a.", "Record Available: Edit, Delete (Excel / Manual), Select and Submit work as before; a new submission creates a new Daily order with a new Order No (OQ-06)."),
 I("b.", "Screen: success 'DTP rollback completed successfully.'; grid refreshed."),
 T("4.6 Open questions"),
 tbl([("ID", 5), ("Question", 40)], [
   ["OQ-01", "Logical cancel of the Daily order (proposed) or delete? Visible in Daily Monitoring?"],
   ["OQ-02", "Who may use DTP Switching (VPLD Planner only, or IELP Admin)? Reason mandatory?"],
   ["OQ-03", "Notify LP Admin / driver when an accepted / assigned order is rolled back?"],
   ["OQ-04", "All-or-nothing (implemented) or partial success with summary?"],
   ["OQ-05", "Allowed for planning dates outside the DTP date range?"],
   ["OQ-06", "Re-use the old Order No on re-submission?"],
   ["OQ-07", "Physical name of the queue table and the CANCEL_* columns of Daily Order."]]),
]
appendix = [
 H("Screens (HTML mock-up, DTP Creation grid)", "A."),
 {"type": "image", "path": f"{IMG}/w03_selected.png", "caption": "Figure A1  DTP Switching selection (amber checkboxes), Driver Status, button DTP Switching (3)", "max_rows": 40},
 {"type": "column_break"},
 {"type": "image", "path": f"{IMG}/w02_confirm.png", "caption": "Figure A2  Confirm DTP Switching", "max_rows": 40},
 {"type": "page_break"},
 {"type": "image", "path": f"{IMG}/w04_dbfail.png", "caption": "Figure A3  Rollback failed - nothing changed", "max_rows": 40},
 {"type": "column_break"},
 {"type": "image", "path": f"{IMG}/w05_history.png", "caption": "Figure A4  Record history after rollback", "max_rows": 40},
 {"type": "page_break"},
]
spec = {
 "doc_type": "batch",
 "header": {"phase": "DR", "project_name": "ELIPS Enhancement (TC-PBR)", "block_name": "Batch", "function_name": "TBD DTP Creation - DTP Switching (Rollback)", "created_date": "05-Nov-26", "created_by": "Susanto"},
 "revisions": [{"revision": "0.1", "author": "Susanto", "date": "05-Nov-26", "reviewed_by": "", "description": "Initial draft: rollback of submitted DTP while the driver has not started"}],
 "general": {
  "objective": ["To roll back DTP records that were submitted to the trucking company while the driver has not started, so they can be corrected and submitted again through DTP Creation.",
                "To revert every related record in one transaction (DTP record, queue, Daily order, truck assignment, driver sync) and keep the history for audit.",
                "In case of any validation failure or error nothing is changed; the reason is returned to the screen."],
  "operation_flow": {"flow": opflow},
  "inputs": [{"name": "DTP Creation screen request", "type": "Screen", "description": "requestId, DTP_REC_ID + VERSION of the selected records, login user"},
             {"name": "TB_R_DTP_RECORD", "type": "DB", "description": "Status, ORDER_NO, VERSION"},
             {"name": "Daily Order / Daily Cycle (TBD)", "type": "DB", "description": "Status, cycle START_DT (driver started)"},
             {"name": "TB_R_ORDER_TRUCK_ASSIGN", "type": "DB", "description": "Active assignment"},
             {"name": "DTP processing queue (TBD)", "type": "DB", "description": "Queue entries of Submitted / Queued records"}],
  "outputs": [{"name": "TB_R_DTP_RECORD", "type": "DB", "description": "Available / Validation Error"},
              {"name": "Daily Order (TBD)", "type": "DB", "description": "Cancelled (CANCEL_FLAG) if Processed"},
              {"name": "TB_R_ORDER_TRUCK_ASSIGN / TB_H_ORDER_ASSIGN", "type": "DB", "description": "Truck released, history"},
              {"name": "TB_T_DRIVER_SYNC_QUEUE", "type": "DB", "description": "ORDER_UPDATE event (Driver APK removes the card)"},
              {"name": "TB_H_DTP_RECORD_STS / TB_H_DTP_SWITCH", "type": "DB", "description": "History and switch audit"},
              {"name": "TB_R_DTP_SWITCH_REQ", "type": "DB", "description": "Request result (also if error occurs)"}],
  "extra_tables": [{"title": "Execution", "columns": [{"title": "Item", "width": 10}, {"title": "Description", "width": 30}],
     "rows": [["Trigger", "Online: [Confirm Rollback] on the DTP Creation grid"], ["Scope", "Selected records of one planning date"], ["Transaction", "One DB transaction per request, all-or-nothing"], ["Idempotency", "Request id (TB_R_DTP_SWITCH_REQ)"]]}],
  "constraints": ["Existing statuses are reused; no new DTP / order status.", "TB_H_DTP_SWITCH and TB_R_DTP_SWITCH_REQ are proposed; align names with the project convention."],
 },
 "func_flow": {"flow": ff, "steps": steps},
 "data_map": data_map,
 "func_desc": func_desc,
 "func_desc_layout": "two",
 "logging_messages": [{"event": e, "cause": c, "type": t, "msg_id": "TBD", "message": m, "action": {"system": sy, "user": us}} for _, e, c, t, m, sy, us in LOG],
 "appendix": appendix,
 "appendix_layout": "two",
 "tables": tables,
}
json.dump(spec, open(f"{S}/swuiss/spec.json", "w"), indent=1)
