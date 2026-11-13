import json, sys
S = sys.argv[1]
H = lambda t, n=None: {"type": "heading", "text": t, **({"num": n} if n else {})}
T = lambda t, l=2, b=False: {"type": "text", "text": t, "level": l, "bold": b}
I = lambda m, t, l=2: {"type": "item", "marker": m, "text": t, "level": l}
B = lambda items, l=3, m="-": {"type": "bullets", "items": items, "level": l, "marker": m}
def tbl(cols, rows, l=1):
    return {"type": "table", "level": l, "columns": [{"title": c, "width": w} for c, w in cols], "rows": rows, "row_lines": "all"}
BID = "Batch ID (TBD)"
LOG = [
 ("start", "Batch start", "Batch triggered (event / schedule / manual)", "Info", "Driver Order Sync <SYNC_ID> started. Trigger : <TRIGGER>.", "Insert sync log (Processing)", "-"),
 ("lock", "Batch start", "Previous sync run still Processing", "Warning", "Driver Order Sync skipped: run <SYNC_ID> still processing.", "Stop this run; events stay in queue for next run", "-"),
 ("db", "Connect to database server", "Cannot connect to database", "Critical", "Database cannot be connected.", "Stop batch; inform system owner by e-mail (TBD)", "Contact system administrator"),
 ("param", "Retrieve parameter", "Sync parameter not found in System Master", "Critical", "Sync parameter <PARAM_CD> not found in System Master.", "Stop batch", "Register parameter in System Master"),
 ("none", "Retrieve queue", "No new event in queue", "Info", "Driver Order Sync <SYNC_ID>: no event to process.", "End batch", "-"),
 ("noorder", "Validate event", "Order not found", "Error", "Order <ORDER_NO> not found for queue <QUEUE_ID>.", "Set queue status E", "Check order data"),
 ("noassign", "Validate event", "No active truck assignment (order waiting, accepted without truck, or DTP just processed)", "Info", "Order <ORDER_NO> has no active truck assignment, not sent to driver.", "Set queue status S (skipped)", "-"),
 ("truck", "Validate event", "Truck not in Truck Master or status not Active", "Error", "Truck <PLATE_NO> of order <ORDER_NO> is not active in Truck Master.", "Set queue status E", "LP Admin: check truck / change truck"),
 ("driver", "Validate event", "No active driver registered on the truck", "Warning", "No active driver on truck <PLATE_NO> for order <ORDER_NO>.", "Sync with DRIVER_ID empty; record visible after driver login with the plate", "LP Admin: register driver on truck"),
 ("mand", "Validate event", "Mandatory field empty (order date, order no, cycle order no, from / to location)", "Error", "Mandatory field <FIELD> empty on order <ORDER_NO>.", "Set queue status E", "Correct order data"),
 ("mqconn", "Connect to HiveMQ broker", "Broker not reachable / authentication failed", "Critical", "Cannot connect to HiveMQ broker <HOST>:<PORT> (<REASON>).", "Keep outbox messages pending; retry next run; inform system owner by e-mail (TBD)", "Contact system administrator"),
 ("mqpub", "Publish to HiveMQ", "No PUBACK within timeout (TBD) or publish error", "Error", "Publish of <MSG_ID> to topic <TOPIC> failed: <REASON>.", "Outbox STATUS = 'E', ATTEMPT + 1; retry next run", "-"),
 ("mqok", "Publish to HiveMQ", "Message acknowledged by broker (QoS 1)", "Debug", "Message <MSG_ID> (<ACTION> <CYCLE_ORDER_NO>) published to <TOPIC>.", "Outbox STATUS = 'S'", "-"),
 ("ins", "Insert / update driver order", "DB error on insert / update TB_R_DRIVER_ORDER", "Error", "Failed to save driver order <CYCLE_ORDER_NO>: <DB_ERROR>.", "Rollback the order; set queue status E; retry next run (max TBD)", "-"),
 ("retry", "Retry event", "Queue event failed more than max attempts (TBD)", "Error", "Queue <QUEUE_ID> of order <ORDER_NO> failed <ATTEMPT> times.", "Stop retrying; inform system owner by e-mail (TBD)", "Check error and re-queue"),
 ("end", "Batch end", "All events processed", "Info", "Driver Order Sync <SYNC_ID> finished. Added <n>, updated <n>, removed <n>, skipped <n>, error <n>, published <n>, publish error <n>.", "Update sync log (Success / Warning)", "-"),
 ("sys", "Batch processing", "Unexpected system error", "Critical", "Driver Order Sync <SYNC_ID> stopped: <ERROR>.", "Update sync log (Error); inform system owner by e-mail (TBD)", "Contact system administrator"),
]
N = {l[0]: i for i, l in enumerate(LOG, 1)}
n = lambda k: f"log message no. {N[k]}"

opflow = {"direction": "TB", "nodes": [
  {"id": "a", "label": "DTP Creation (Planner VPLD)", "type": "screen"},
  {"id": "b", "label": "Daily Order (Planning Order)", "type": "db"},
  {"id": "c", "label": "Planning Truck Assignment (LP Admin)", "type": "screen"},
  {"id": "q", "label": "TB_T_DRIVER_SYNC_QUEUE", "type": "db"},
  {"id": "p", "label": "Background service: Driver Order Sync", "type": "process"},
  {"id": "d", "label": "TB_R_DRIVER_ORDER + MQTT outbox", "type": "db"},
  {"id": "mq", "label": "HiveMQ broker: topic per plate", "type": "process"},
  {"id": "apk", "label": "Driver APK: Pesanan list", "type": "screen"}],
 "edges": [{"from": "a", "to": "b", "label": "DTP queue processed"}, {"from": "b", "to": "c"}, {"from": "c", "to": "q", "label": "Accept / Reject / Assign / Change Truck"},
   {"from": "q", "to": "p"}, {"from": "p", "to": "d"}, {"from": "d", "to": "mq", "label": "publish (QoS 1)"}, {"from": "mq", "to": "apk", "label": "subscribe"}]}

ff = {"direction": "TB", "nodes": [
  {"id": "s", "label": "START", "type": "start"},
  {"id": "p1", "label": "Retrieve parameters, check running sync", "type": "process", "step": 1},
  {"id": "sm", "label": "System Master (TBD)", "type": "db", "lane": "input"},
  {"id": "p2", "label": "Insert sync log (Processing)", "type": "process", "step": 2},
  {"id": "lg", "label": "TB_R_DRIVER_SYNC_LOG", "type": "db", "lane": "output"},
  {"id": "p3", "label": "Select queue events STATUS = 'N'", "type": "process", "step": 3},
  {"id": "qu", "label": "TB_T_DRIVER_SYNC_QUEUE", "type": "db", "lane": "input"},
  {"id": "d3", "label": "Any event?", "type": "decision"},
  {"id": "p4", "label": "Get order, cycles, active assignment", "type": "process", "step": 4},
  {"id": "src", "label": "Daily Order / Cycle / Assignment / Masters", "type": "db", "lane": "input"},
  {"id": "p5", "label": "Validate (4.2)", "type": "process", "step": 5},
  {"id": "d5", "label": "Valid?", "type": "decision"},
  {"id": "p6", "label": "Determine action per cycle (4.3)", "type": "process", "step": 6},
  {"id": "p7", "label": "Save driver order + outbox message", "type": "process", "step": 7},
  {"id": "dor", "label": "TB_R_DRIVER_ORDER / TB_R_DRIVER_MQ_OUTBOX", "type": "db", "lane": "output"},
  {"id": "p8", "label": "Update queue status", "type": "process", "step": 8},
  {"id": "d9", "label": "More events?", "type": "decision", "step": 9},
  {"id": "p10", "label": "Publish pending outbox to HiveMQ", "type": "process", "step": 10},
  {"id": "mq", "label": "HiveMQ topic (per plate)", "type": "db", "lane": "output"},
  {"id": "p11", "label": "Update sync log (end)", "type": "process", "step": 11},
  {"id": "e", "label": "END", "type": "end"},
  {"id": "x3", "label": "No event: go to step 10", "type": "message"},
  {"id": "x5", "label": "E / S: go to step 8", "type": "message"},
  {"id": "x9", "label": "Next event: back to step 4", "type": "message"}],
 "same_rank": [["d3", "x3"], ["d5", "x5"], ["d9", "x9"]],
 "edges": [{"from": "s", "to": "p1"}, {"from": "sm", "to": "p1"}, {"from": "p1", "to": "p2"}, {"from": "p2", "to": "lg"}, {"from": "p2", "to": "p3"},
   {"from": "qu", "to": "p3"}, {"from": "p3", "to": "d3"}, {"from": "d3", "to": "x3", "label": "No"}, {"from": "d3", "to": "p4", "label": "Yes"},
   {"from": "src", "to": "p4"}, {"from": "p4", "to": "p5"}, {"from": "p5", "to": "d5"}, {"from": "d5", "to": "x5", "label": "No"},
   {"from": "d5", "to": "p6", "label": "Yes"}, {"from": "p6", "to": "p7"}, {"from": "p7", "to": "dor"}, {"from": "p7", "to": "p8"},
   {"from": "p8", "to": "d9"}, {"from": "d9", "to": "x9", "label": "Yes"}, {"from": "d9", "to": "p10", "label": "No"}, {"from": "p10", "to": "mq"}, {"from": "p10", "to": "p11"}, {"from": "p11", "to": "e"}]}

steps = [
 {"text": "Retrieve parameters from System Master: batch size, max attempts, schedule interval (all TBD).", "children": [f"If a parameter is missing, {n('param')}. Stop.", f"If the last sync log is still Processing, {n('lock')}. Stop."]},
 {"text": f"Insert sync log with STATUS = 'PROCESSING', TRIGGER and START_DT; {n('start')}."},
 {"text": "Select queue events with STATUS = 'N' (and failed events 'E' with ATTEMPT < max), ordered by QUEUE_ID, limited by batch size. Events of the same order are processed together in QUEUE_ID order.", "children": [f"If no event, {n('none')}; go to step 10."]},
 {"text": "For each order: retrieve the Daily Order, its cycles, the active truck assignment (ACTIVE_FLAG = 'Y'), Truck Master, Driver Master, Location Master and the DTP record (arrival date / time)."},
 {"text": "Validate the order (Functional Description 4.2).", "children": ["Order not found / mandatory empty / truck not active: queue STATUS = 'E' with message; go to step 8.", "No active assignment: STATUS = 'S' (skipped) except for remove actions; go to step 8."]},
 {"text": "Determine the sync action per cycle with the rule table 4.3 (ADD, UPDATE, REMOVE, HISTORY)."},
 {"text": "Insert or update TB_R_DRIVER_ORDER per cycle, SYNC_VERSION + 1, and insert one outbox message per changed record (topic of PLATE_NO, JSON payload 4.6) into TB_R_DRIVER_MQ_OUTBOX, in one transaction per order.", "children": [f"On DB error, rollback the order, {n('ins')}; queue STATUS = 'E', ATTEMPT + 1.", f"ATTEMPT >= max: {n('retry')}."]},
 {"text": "Update queue event: STATUS = 'P' (processed) / 'S' / 'E', SYNC_ID, ERROR_MSG."},
 {"text": "If more events remain, go back to step 4."},
 {"text": "Background service connects to HiveMQ and publishes outbox messages with STATUS 'N' (and 'E' with ATTEMPT < max) in MSG_ID order, QoS 1.", "children": [f"Broker not reachable: {n('mqconn')}; messages stay pending.", f"PUBACK received: STATUS 'S', PUBLISHED_DT; {n('mqok')}.", f"No PUBACK / error: STATUS 'E', ATTEMPT + 1; {n('mqpub')}."]},
 {"text": f"Update sync log: STATUS SUCCESS (no error) or WARNING (some events E), counts, END_DT; {n('end')}. Unexpected error at any step: {n('sys')}, STATUS ERROR. Exit."},
]

# ---------------- tables ----------------
DOC = [
 ["CYCLE_ORDER_NO", "VARCHAR(14)", "Y", "N", "No Cycle Order shown on the APK card (e.g. 260606C2PLI121)"],
 ["ORDER_NO", "VARCHAR(18)", "", "N", "Daily Order No."],
 ["CYCLE_SEQ", "INT", "", "N", "Cycle sequence 1..5"],
 ["PLATE_NO", "VARCHAR(TBD)", "", "N", "Truck plate of the active assignment; length follows Truck Master"],
 ["DRIVER_ID", "VARCHAR(TBD)", "", "Y", "Active driver of the truck (Driver Master); empty if none"],
 ["DRIVER_NAME", "VARCHAR(TBD)", "", "Y", "Driver name for the APK header"],
 ["LP_CD", "VARCHAR(TBD)", "", "N", "Trucking company code"],
 ["LP_NAME", "VARCHAR(TBD)", "", "N", "Trucking company name for the APK header"],
 ["ORDER_DT", "DATE", "", "N", "Order date (card date)"],
 ["ORDER_STATUS", "VARCHAR(30)", "", "N", "Daily order status, e.g. Order Release"],
 ["CYCLE_STATUS", "VARCHAR(30)", "", "N", "Cycle status"],
 ["ARRIVAL_DT", "DATE", "", "Y", "KEDATANGAN date (DTP ARRIVAL DATE)"],
 ["ARRIVAL_TIME", "VARCHAR(8)", "", "Y", "KEDATANGAN time HH:MI:SS (DTP ARRIVAL TIME)"],
 ["FROM_LOC_CD", "VARCHAR(TBD)", "", "N", "Lokasi asal code"],
 ["FROM_LOC_NAME", "VARCHAR(TBD)", "", "N", "Lokasi asal name"],
 ["FROM_LAT", "DECIMAL(10,7)", "", "Y", "Lokasi asal latitude (Buka Map)"],
 ["FROM_LNG", "DECIMAL(10,7)", "", "Y", "Lokasi asal longitude"],
 ["TO_LOC_CD", "VARCHAR(TBD)", "", "N", "Lokasi tujuan code"],
 ["TO_LOC_NAME", "VARCHAR(TBD)", "", "N", "Lokasi tujuan name"],
 ["TO_LAT", "DECIMAL(10,7)", "", "Y", "Lokasi tujuan latitude"],
 ["TO_LNG", "DECIMAL(10,7)", "", "Y", "Lokasi tujuan longitude"],
 ["CONTAINER_NO", "VARCHAR(11)", "", "Y", "Nomor Petikemas"],
 ["DISPLAY_TAB", "VARCHAR(10)", "", "N", "ORDER (Pesanan) / HISTORY (Riwayat Pesanan)"],
 ["ACTIVE_FLAG", "CHAR(1)", "", "N", "Y = visible for PLATE_NO; N = removed (truck changed / rejected)"],
 ["SYNC_ACTION", "VARCHAR(10)", "", "N", "Last action ADD / UPDATE / REMOVE / HISTORY"],
 ["SYNC_VERSION", "BIGINT", "", "N", "Increments on every change; APK asks changes since its last version"],
 ["LAST_SYNC_ID", "BIGINT", "", "N", "Sync run that changed the record (traceability)"],
 ["CREATED_BY", "VARCHAR(20)", "", "N", "Batch ID"],
 ["CREATED_DT", "DATETIME", "", "N", "Server date-time"],
 ["CHANGED_BY", "VARCHAR(20)", "", "N", "Batch ID"],
 ["CHANGED_DT", "DATETIME", "", "N", "Server date-time"],
]
QUE = [
 ["QUEUE_ID", "BIGINT", "Y", "N", "Sequence"],
 ["ORDER_NO", "VARCHAR(18)", "", "N", "Daily Order No."],
 ["EVENT_TYPE", "VARCHAR(20)", "", "N", "DTP_PROCESSED / LP_ACCEPT / LP_REJECT / ASSIGN / CHANGE_TRUCK / ORDER_UPDATE / CYCLE_UPDATE"],
 ["PREV_PLATE", "VARCHAR(TBD)", "", "Y", "Plate before the event (Change Truck)"],
 ["NEW_PLATE", "VARCHAR(TBD)", "", "Y", "Plate after the event"],
 ["STATUS", "CHAR(1)", "", "N", "N = new, P = processed, S = skipped, E = error"],
 ["ATTEMPT", "INT", "", "N", "Number of processing attempts"],
 ["SYNC_ID", "BIGINT", "", "Y", "Sync run that processed the event"],
 ["ERROR_MSG", "VARCHAR(1000)", "", "Y", "Error / skip reason"],
 ["CREATED_BY", "VARCHAR(20)", "", "N", "User of the screen action (Planner / LP Admin) or batch ID"],
 ["CREATED_DT", "DATETIME", "", "N", "Server date-time of the event"],
 ["CHANGED_BY", "VARCHAR(20)", "", "Y", "Batch ID"],
 ["CHANGED_DT", "DATETIME", "", "Y", "Server date-time"],
]
LOGT = [
 ["SYNC_ID", "BIGINT", "Y", "N", "Sequence"],
 ["BATCH_ID", "VARCHAR(20)", "", "N", "Batch ID (TBD)"],
 ["TRIGGER_TYPE", "VARCHAR(10)", "", "N", "EVENT / SCHEDULE / MANUAL"],
 ["STATUS", "VARCHAR(10)", "", "N", "PROCESSING / SUCCESS / WARNING / ERROR"],
 ["TOTAL_EVENTS", "INT", "", "N", "Events selected"],
 ["ADDED_ROWS", "INT", "", "N", "Driver order records added"],
 ["UPDATED_ROWS", "INT", "", "N", "Driver order records updated (incl. HISTORY)"],
 ["REMOVED_ROWS", "INT", "", "N", "Driver order records removed (ACTIVE_FLAG N)"],
 ["SKIPPED_EVENTS", "INT", "", "N", "Events without active assignment"],
 ["ERROR_EVENTS", "INT", "", "N", "Events with error"],
 ["PUBLISHED_MSGS", "INT", "", "N", "Messages acknowledged by HiveMQ"],
 ["PUBLISH_ERRORS", "INT", "", "N", "Messages failed to publish"],
 ["MESSAGE", "VARCHAR(1000)", "", "Y", "Summary / error"],
 ["START_DT", "DATETIME", "", "N", "Start"],
 ["END_DT", "DATETIME", "", "Y", "End"],
 ["CREATED_BY", "VARCHAR(20)", "", "N", "Batch ID"],
]
OUT = [
 ["MSG_ID", "BIGINT", "Y", "N", "Sequence; also the MQTT message id in the payload (idempotency on APK)"],
 ["CYCLE_ORDER_NO", "VARCHAR(14)", "", "N", "Driver order record"],
 ["PLATE_NO", "VARCHAR(TBD)", "", "N", "Target plate (old plate for REMOVE)"],
 ["TOPIC", "VARCHAR(200)", "", "N", "MQTT topic, e.g. <prefix>/driver/<PLATE_NO>/orders (naming TBD)"],
 ["ACTION", "VARCHAR(10)", "", "N", "ADD / UPDATE / REMOVE / HISTORY"],
 ["SYNC_VERSION", "BIGINT", "", "N", "SYNC_VERSION of the driver order record"],
 ["PAYLOAD", "NVARCHAR(MAX)", "", "N", "JSON payload (4.6)"],
 ["STATUS", "CHAR(1)", "", "N", "N = new, S = sent (PUBACK), E = error"],
 ["ATTEMPT", "INT", "", "N", "Publish attempts"],
 ["PUBLISHED_DT", "DATETIME", "", "Y", "Date-time of PUBACK"],
 ["ERROR_MSG", "VARCHAR(1000)", "", "Y", "Publish error"],
 ["SYNC_ID", "BIGINT", "", "N", "Sync run that created the message"],
 ["CREATED_BY", "VARCHAR(20)", "", "N", "Batch ID"],
 ["CREATED_DT", "DATETIME", "", "N", "Server date-time"],
 ["CHANGED_BY", "VARCHAR(20)", "", "Y", "Batch ID"],
 ["CHANGED_DT", "DATETIME", "", "Y", "Server date-time"],
]
tables = [
 {"name": "TB_R_DRIVER_ORDER", "kind": "transaction", "proposed": True, "description": "Orders per cycle prepared for the Driver APK (one record per cycle order)", "columns": DOC},
 {"name": "TB_T_DRIVER_SYNC_QUEUE", "kind": "temp", "proposed": True, "description": "Events written by DTP queue processing and Planning Truck Assignment, consumed by this batch", "columns": QUE},
 {"name": "TB_R_DRIVER_MQ_OUTBOX", "kind": "transaction", "proposed": True, "description": "Outbox of MQTT messages to HiveMQ (written with the driver order in one transaction, published by the background service)", "columns": OUT},
 {"name": "TB_R_DRIVER_SYNC_LOG", "kind": "log", "proposed": True, "description": "One record per sync run", "columns": LOGT},
]
DOC_SRC = {
 "CYCLE_ORDER_NO": ("Daily Cycle . CYCLE_ORDER_NO (TBD)", ""), "ORDER_NO": ("Daily Order . ORDER_NO", ""), "CYCLE_SEQ": ("Daily Cycle . CYCLE_SEQ (TBD)", ""),
 "PLATE_NO": ("TB_R_ORDER_TRUCK_ASSIGN . PLATE_NO", "Active assignment (ACTIVE_FLAG = 'Y')"), "DRIVER_ID": ("TB_R_ORDER_TRUCK_ASSIGN . DRIVER_ID", "Empty if no active driver (log no. %d)" % N['driver']),
 "DRIVER_NAME": ("Driver Master . DRIVER_NAME (TBD)", "By DRIVER_ID"), "LP_CD": ("Daily Order . LP_CD", ""), "LP_NAME": ("Trucking Company Master . LP_NAME (TBD)", "By LP_CD"),
 "ORDER_DT": ("Daily Order . ORDER_DT", ""), "ORDER_STATUS": ("Daily Order . STATUS", ""), "CYCLE_STATUS": ("Daily Cycle . STATUS (TBD)", ""),
 "ARRIVAL_DT": ("TB_R_DTP_RECORD . ARRIVAL_DATE", "Null if not given in DTP"), "ARRIVAL_TIME": ("TB_R_DTP_RECORD . ARRIVAL_TIME", "HH:MM -> HH:MI:00; null if not given"),
 "FROM_LOC_CD": ("Daily Cycle . FROM_LOC_CD (TBD)", ""), "FROM_LOC_NAME": ("Location Master . LOCATION_NAME", "By FROM_LOC_CD"), "FROM_LAT": ("Location Master . LATITUDE", "By FROM_LOC_CD"), "FROM_LNG": ("Location Master . LONGITUDE", "By FROM_LOC_CD"),
 "TO_LOC_CD": ("Daily Cycle . TO_LOC_CD (TBD)", ""), "TO_LOC_NAME": ("Location Master . LOCATION_NAME", "By TO_LOC_CD"), "TO_LAT": ("Location Master . LATITUDE", "By TO_LOC_CD"), "TO_LNG": ("Location Master . LONGITUDE", "By TO_LOC_CD"),
 "CONTAINER_NO": ("Daily Cycle . CONTAINER_NO", "If empty: TB_R_DTP_RECORD . CONTAINER_NO (cycle 1)"),
}
def doc_map(op):
    m = []
    for col, *_ in DOC:
        if col in DOC_SRC:
            src, d = DOC_SRC[col]
            if op == "update" and col == "CYCLE_ORDER_NO": d = "Key, not changed"
            m.append({"source_field": src, "dest_field": col, "description": d})
        elif col == "DISPLAY_TAB": m.append({"dest_field": col, "description": "'ORDER'" if op == "insert" else "'HISTORY' if cycle Finish Cycle or order Finish Daily Order / SA, else 'ORDER' (4.3)"})
        elif col == "ACTIVE_FLAG": m.append({"dest_field": col, "description": "'Y'"})
        elif col == "SYNC_ACTION": m.append({"dest_field": col, "description": "'ADD'" if op == "insert" else "'UPDATE' / 'HISTORY' (4.3)"})
        elif col == "SYNC_VERSION": m.append({"dest_field": col, "description": "Next value of global sync sequence"})
        elif col == "LAST_SYNC_ID": m.append({"dest_field": col, "description": "Current SYNC_ID"})
        elif col in ("CREATED_BY", "CREATED_DT"): m.append({"dest_field": col, "description": (BID if col == "CREATED_BY" else "Server date-time") if op == "insert" else "Not changed"})
        elif col == "CHANGED_BY": m.append({"dest_field": col, "description": BID})
        elif col == "CHANGED_DT": m.append({"dest_field": col, "description": "Server date-time"})
    return m
def remove_map():
    m = []
    for col, *_ in DOC:
        d = {"ACTIVE_FLAG": "'N'", "SYNC_ACTION": "'REMOVE'", "SYNC_VERSION": "Next value of global sync sequence", "LAST_SYNC_ID": "Current SYNC_ID",
             "CHANGED_BY": BID, "CHANGED_DT": "Server date-time", "CYCLE_ORDER_NO": "Key, not changed", "PLATE_NO": "Not changed (old plate keeps the removal so its APK deletes the card)"}.get(col, "Not changed")
        m.append({"dest_field": col, "description": d})
    return m
log_ins = [{"dest_field": c[0], "description": {"SYNC_ID": "Sequence", "BATCH_ID": BID, "TRIGGER_TYPE": "Trigger of the run", "STATUS": "'PROCESSING'", "MESSAGE": "Null", "START_DT": "Server date-time", "END_DT": "Null", "CREATED_BY": BID}.get(c[0], "0")} for c in LOGT]
log_upd = [{"dest_field": c[0], "description": {"SYNC_ID": "Key, not changed", "BATCH_ID": "Not changed", "TRIGGER_TYPE": "Not changed", "STATUS": "'SUCCESS' / 'WARNING' / 'ERROR'", "TOTAL_EVENTS": "Count of selected events", "ADDED_ROWS": "Count", "UPDATED_ROWS": "Count", "REMOVED_ROWS": "Count", "SKIPPED_EVENTS": "Count", "ERROR_EVENTS": "Count", "PUBLISHED_MSGS": "Count", "PUBLISH_ERRORS": "Count", "MESSAGE": "Summary or error", "START_DT": "Not changed", "END_DT": "Server date-time", "CREATED_BY": "Not changed"}[c[0]]} for c in LOGT]
data_map = {"blocks": [
 {"source": {"table": "System Master (TBD)"}, "destination": {"table": "TB_R_DRIVER_SYNC_LOG", "operation": "Insert", "description": "Step 2 - batch start"}, "mappings": log_ins},
 {"source": {"table": "Daily Order / Daily Cycle / TB_R_ORDER_TRUCK_ASSIGN / TB_R_DTP_RECORD / Masters", "keys": [{"field": "ORDER_NO", "value": "Queue event ORDER_NO"}, {"field": "ACTIVE_FLAG (assign)", "value": "'Y'"}]},
  "destination": {"table": "TB_R_DRIVER_ORDER", "operation": "Insert", "description": "Step 7 - action ADD (cycle not yet in table for this plate)"}, "mappings": doc_map("insert")},
 {"source": {"table": "Daily Order / Daily Cycle / TB_R_ORDER_TRUCK_ASSIGN / TB_R_DTP_RECORD / Masters", "keys": [{"field": "ORDER_NO", "value": "Queue event ORDER_NO"}]},
  "destination": {"table": "TB_R_DRIVER_ORDER", "operation": "Update", "description": "Step 7 - action UPDATE / HISTORY", "keys": [{"field": "CYCLE_ORDER_NO", "value": "Cycle of the order"}, {"field": "ACTIVE_FLAG", "value": "'Y'"}]}, "mappings": doc_map("update")},
 {"source": {"table": "TB_T_DRIVER_SYNC_QUEUE", "keys": [{"field": "EVENT_TYPE", "value": "CHANGE_TRUCK / LP_REJECT / order cancelled"}]},
  "destination": {"table": "TB_R_DRIVER_ORDER", "operation": "Update", "description": "Step 7 - action REMOVE (old plate)", "keys": [{"field": "ORDER_NO", "value": "Queue event ORDER_NO"}, {"field": "PLATE_NO", "value": "PREV_PLATE"}, {"field": "ACTIVE_FLAG", "value": "'Y'"}]}, "mappings": remove_map()},
 {"source": {"table": "TB_R_DRIVER_ORDER", "keys": [{"field": "CYCLE_ORDER_NO", "value": "Record changed in step 7"}]}, "destination": {"table": "TB_R_DRIVER_MQ_OUTBOX", "operation": "Insert", "description": "Step 7 - one message per changed record"},
  "mappings": [{"dest_field": c[0], "description": {"MSG_ID": "Sequence", "CYCLE_ORDER_NO": "From driver order", "PLATE_NO": "PLATE_NO of the record (old plate for REMOVE)", "TOPIC": "Topic pattern from System Master + PLATE_NO (TBD)",
      "ACTION": "SYNC_ACTION of the record", "SYNC_VERSION": "SYNC_VERSION of the record", "PAYLOAD": "JSON of the record (4.6)", "STATUS": "'N'", "ATTEMPT": "0", "PUBLISHED_DT": "Null", "ERROR_MSG": "Null",
      "SYNC_ID": "Current SYNC_ID", "CREATED_BY": BID, "CREATED_DT": "Server date-time", "CHANGED_BY": "Null", "CHANGED_DT": "Null"}[c[0]]} for c in OUT]},
 {"source": {"table": "TB_R_DRIVER_MQ_OUTBOX", "keys": [{"field": "STATUS", "value": "'N' or 'E' with ATTEMPT < max"}]}, "destination": {"table": "TB_R_DRIVER_MQ_OUTBOX", "operation": "Update", "description": "Step 10 - after publish", "keys": [{"field": "MSG_ID", "value": "Published message"}]},
  "mappings": [{"dest_field": c[0], "description": {"MSG_ID": "Key, not changed", "STATUS": "'S' on PUBACK / 'E' on error", "ATTEMPT": "ATTEMPT + 1", "PUBLISHED_DT": "Server date-time of PUBACK, else not changed",
      "ERROR_MSG": "Publish error, else null", "CHANGED_BY": BID, "CHANGED_DT": "Server date-time"}.get(c[0], "Not changed")} for c in OUT]},
 {"source": {"table": "TB_T_DRIVER_SYNC_QUEUE"}, "destination": {"table": "TB_T_DRIVER_SYNC_QUEUE", "operation": "Update", "description": "Step 8", "keys": [{"field": "QUEUE_ID", "value": "Current event"}]},
  "mappings": [{"dest_field": "STATUS", "description": "'P' processed / 'S' skipped / 'E' error"}, {"dest_field": "ATTEMPT", "description": "ATTEMPT + 1"},
               {"dest_field": "SYNC_ID", "description": "Current SYNC_ID"}, {"dest_field": "ERROR_MSG", "description": "Log message text when S / E, else null"},
               {"dest_field": "CHANGED_BY", "description": BID}, {"dest_field": "CHANGED_DT", "description": "Server date-time"}]},
 {"source": {"table": "Counters of the run"}, "destination": {"table": "TB_R_DRIVER_SYNC_LOG", "operation": "Update", "description": "Step 11 - batch end", "keys": [{"field": "SYNC_ID", "value": "Current run"}]}, "mappings": log_upd},
 {"source": {"table": "Planning Truck Assignment / DTP queue processing (screens & batch, outside this batch)"}, "destination": {"table": "TB_T_DRIVER_SYNC_QUEUE", "operation": "Insert", "description": "Written by the calling function in the same transaction as its own update (4.1)"},
  "mappings": [{"dest_field": c[0], "description": {"QUEUE_ID": "Sequence", "ORDER_NO": "Order of the action", "EVENT_TYPE": "By action (4.1)", "PREV_PLATE": "Plate before (Change Truck / Reject), else null",
      "NEW_PLATE": "Plate after, else null", "STATUS": "'N'", "ATTEMPT": "0", "SYNC_ID": "Null", "ERROR_MSG": "Null", "CREATED_BY": "Login user / batch ID", "CREATED_DT": "Server date-time", "CHANGED_BY": "Null", "CHANGED_DT": "Null"}[c[0]]} for c in QUE]},
]}

apk_map = [
 ["Header", "Driver name", "DRIVER_NAME (or Driver Master of login)", "e.g. HADI"],
 ["Header", "Trucking company", "LP_NAME", "PT. Pancaran Logistik Indonesia"],
 ["Header", "NOPOL", "Login plate = PLATE_NO", "B9581UWW"],
 ["Header", "Version", "APK version", "Not from this batch"],
 ["Tab", "Pesanan (count)", "Count ACTIVE_FLAG = 'Y' and DISPLAY_TAB = 'ORDER'", "'9+' when > 9"],
 ["Tab", "Riwayat Pesanan (count)", "Count DISPLAY_TAB = 'HISTORY' (period TBD)", "'9+' when > 9"],
 ["Card", "Date", "ORDER_DT", "DD/MM/YYYY"],
 ["Card", "Order No", "CYCLE_ORDER_NO", "260606C2PLI121"],
 ["Card", "Status", "ORDER_STATUS (upper case)", "ORDER RELEASE"],
 ["Card", "KEDATANGAN", "ARRIVAL_TIME + ARRIVAL_DT", "HH:MI:SS DD/MM/YYYY; '-' if null"],
 ["Card", "Lokasi asal / tujuan", "FROM_LOC_NAME / TO_LOC_NAME", ""],
 ["Card", "Nomor Petikemas", "CONTAINER_NO", ""],
 ["Card", "Buka Map", "FROM_LAT/LNG, TO_LAT/LNG", "Opens map route"],
 ["Card", "Download Gate Pass", "TBD", "Source document not defined"],
 ["Card", "Download Surat Jalan", "Delivery Note API (CYCLE_ORDER_NO)", "Enabled after Start Cycle"],
 ["Card", "Jalankan", "Driver action Start Cycle (web workflow)", "Enabled for ORDER RELEASE"],
 ["Home", "Scan QR Code", "TBD", "Purpose not defined"],
]
func_desc = [
 H("DESCRIPTION", "4."),
 T("The background service (connected to the HiveMQ MQTT broker) syncs the orders that are assigned to a truck in Planning Truck Assignment into TB_R_DRIVER_ORDER, one record per cycle order, and publishes every change to the HiveMQ topic of the truck plate, so the Driver APK of the driver who logs in with that license plate receives it. It also removes the card from the old plate after Change Truck / Reject and moves finished cycles to Riwayat Pesanan. Prerequisites: DTP Creation queue processing and Planning Truck Assignment write events to TB_T_DRIVER_SYNC_QUEUE (4.1).", 1),
 T("4.1 Trigger and events (Proposed)", 1, True),
 tbl([("Source action", 16), ("EVENT_TYPE", 11), ("Effect on driver", 19)], [
   ["DTP queue processed (Daily order created)", "DTP_PROCESSED", "None yet (no truck) - event skipped"],
   ["LP Admin Accept", "LP_ACCEPT", "None yet (no truck) - skipped"],
   ["LP Admin Reject", "LP_REJECT", "Remove if a card exists"],
   ["LP Admin / IP Admin Assign Truck", "ASSIGN", "ADD card for NEW_PLATE"],
   ["LP Admin Change Truck", "CHANGE_TRUCK", "REMOVE for PREV_PLATE, ADD for NEW_PLATE"],
   ["Order data change (status, SA, cancel)", "ORDER_UPDATE", "UPDATE / HISTORY / REMOVE"],
   ["Cycle change (start, pick up, finish, next cycle)", "CYCLE_UPDATE", "UPDATE / ADD next cycle / HISTORY"]]),
 B(["Event: the calling function inserts the queue row in its own transaction; the batch is started immediately (near real-time).",
    "Schedule: every n minutes (TBD) as safety net for events not processed.",
    "Manual: re-run by system administrator. Only one run at a time (log no. %d)." % N['lock']], 2),
 T("4.2 Validations", 1, True),
 I("1.", f"Order exists in Daily Order; otherwise {n('noorder')}."),
 I("2.", f"Active assignment exists (ACTIVE_FLAG = 'Y'); otherwise {n('noassign')} (skipped, not an error)."),
 I("3.", f"Truck of the assignment exists in Truck Master with status Active; otherwise {n('truck')}."),
 I("4.", f"Active driver registered on the truck; otherwise {n('driver')} (record synced with empty driver)."),
 I("5.", f"Mandatory: ORDER_NO, CYCLE_ORDER_NO, ORDER_DT, FROM / TO location; otherwise {n('mand')}."),
 I("6.", "Events of the same order are processed in QUEUE_ID order; duplicates (same order, same state) give no change (SYNC_VERSION not increased)."),
 {"type": "column_break"},
 T("4.3 Sync action per cycle", 1, True),
 tbl([("Condition", 22), ("Action", 8), ("Result in APK", 16)], [
   ["Active assignment, cycle not in table for PLATE_NO", "ADD", "New card in Pesanan"],
   ["Data of an existing active record changed", "UPDATE", "Card refreshed"],
   ["Cycle Finish Cycle, or order Finish Daily Order / SA", "HISTORY", "Card moves to Riwayat"],
   ["Change Truck: record of PREV_PLATE", "REMOVE", "Card removed from old driver"],
   ["Reject / order cancelled", "REMOVE", "Card removed"],
   ["Next cycle started (Start Next Cycle)", "ADD", "New card for the new cycle"]]),
 T("4.4 Driver APK use of the data (Proposed, API contract TBD)", 1, True),
 B(["Login: Username, Password, Plat Nomor Truck. The plate must be the truck registered on the driver (same rule as Daily Monitoring driver login).",
    "After login and on [Refresh]: GET /api/driver/orders?sinceVersion=n (proposed in Truck Assignment spec) returns records of PLATE_NO with SYNC_VERSION > n, incl. REMOVE so the APK deletes cards.",
    "Pesanan = ACTIVE_FLAG 'Y' and DISPLAY_TAB 'ORDER', sorted by ORDER_DT, ARRIVAL time. Riwayat Pesanan = DISPLAY_TAB 'HISTORY'.",
    "After login the APK subscribes to the topic of its plate (4.6) and applies each message: ADD / UPDATE / HISTORY upsert the card, REMOVE deletes it. Messages with SYNC_VERSION <= the version already held are ignored (duplicate / out of order).",
    "The API pull is still used for the first load after login and for [Refresh] (missed messages, reinstall)."], 2),
 tbl([("Area", 6), ("APK item", 12), ("Source", 17), ("Note", 11)], apk_map),
 T("4.5 HiveMQ / MQTT (Proposed, details TBD)", 1, True),
 tbl([("Item", 10), ("Value", 30)], [
   ["Broker", "HiveMQ (host, port, TLS, credentials from System Master - TBD)"],
   ["Client (service)", "Client ID of the background service (TBD); publish only"],
   ["Client (APK)", "Client ID per device / driver (TBD); subscribe only to own plate topic (ACL)"],
   ["Topic", "<prefix>/driver/<PLATE_NO>/orders (naming TBD)"],
   ["QoS", "1 (at least once); APK de-duplicates by MSG_ID / SYNC_VERSION"],
   ["Session", "Persistent session (clean session = false) so messages wait while the phone is offline; expiry TBD"],
   ["Retained", "No (snapshot via API pull)"],
   ["Payload", "JSON: msgId, action, syncVersion, cycleOrderNo, orderNo, cycleSeq, plateNo, driverName, lpName, orderDate, orderStatus, cycleStatus, arrivalDate, arrivalTime, from {code, name, lat, lng}, to {code, name, lat, lng}, containerNo, displayTab"]]),
 T("4.6 Housekeeping (Proposed)", 1, True),
 B(["Queue rows P / S and outbox rows S older than n days (TBD) are deleted.", "REMOVE records older than n days (TBD) are deleted after all APKs synced.", "Riwayat period shown in APK: TBD."], 2),
 T("Table names are proposed; align them with the project naming convention.", 1),
]
appendix = [
 H("Driver APK reference screens (provided by user)", "A."),
 {"type": "image", "path": f"{S}/../images/29.jpg", "caption": "Figure A1  Driver APK - Login (Username, Password, Plat Nomor Truck)", "max_rows": 40},
 {"type": "column_break"},
 {"type": "image", "path": f"{S}/../images/30.jpg", "caption": "Figure A2  Driver APK - Pesanan list after login", "max_rows": 40},
 {"type": "page_break"},
 H("Open Questions", "B."),
 tbl([("ID", 5), ("Open question", 40)], [
   ["OQ-01", "Batch ID / Function ID and execution schedule interval; event-driven start confirmed?"],
   ["OQ-02", "HiveMQ: topic naming, client IDs, ACL per plate, TLS / credentials, session expiry, PUBACK timeout."],
   ["OQ-03", "Physical names of Daily Order, Daily Cycle, Driver Master, Truck Master tables."],
   ["OQ-04", "Source / content of Download Gate Pass and purpose of Scan QR Code."],
   ["OQ-05", "KEDATANGAN = DTP ARRIVAL DATE / TIME? Value when not given in DTP."],
   ["OQ-06", "Card per cycle (CYCLE_ORDER_NO) or per order? Next cycle as new card?"],
   ["OQ-07", "Riwayat Pesanan period and when a card moves to Riwayat."],
   ["OQ-08", "Driver login: Username = Driver User ID? Password management (who resets)?"],
   ["OQ-09", "Offline APK: how long cached data is valid; conflict when truck changed while offline."],
   ["OQ-10", "Max attempts, batch size, housekeeping days."],
   ["OQ-11", "Is the background service also the consumer of APK events (Start Cycle, Pick Up via MQTT) or only publisher?"]]),
]
spec = {
 "doc_type": "batch",
 "header": {"phase": "DR", "project_name": "ELIPS Enhancement (TC-PBR)", "block_name": "Batch", "function_name": "TBD Driver Order Sync - HiveMQ (TC-PBR to Driver APK)", "created_date": "03-Nov-26", "created_by": "Susanto"},
 "revisions": [{"revision": "0.1", "author": "Susanto", "date": "03-Nov-26", "reviewed_by": "", "description": "Initial draft: sync of assigned orders (DTP Creation -> Truck Assignment) to Driver APK via HiveMQ background service"}],
 "general": {
  "objective": ["To send the daily orders created by DTP Creation and assigned to a truck in Planning Truck Assignment to the Driver APK of that truck (license plate).",
                "The sync is done by a background service through the HiveMQ MQTT broker: one topic per truck plate, the Driver APK subscribes after login.",
                "To keep the driver's list up to date: new assignment, data change, Change Truck (remove from old plate, add to new plate), Reject, and finished cycles to Riwayat Pesanan.",
                "In case of an error the queue event is kept with status E and retried; the log shows the result of every run."],
  "operation_flow": {"flow": opflow},
  "inputs": [
    {"name": "TB_T_DRIVER_SYNC_QUEUE", "type": "DB", "description": "Events STATUS = 'N' (and 'E' with attempts left)"},
    {"name": "Daily Order / Daily Cycle (TBD)", "type": "DB", "description": "Order and cycle data"},
    {"name": "TB_R_ORDER_TRUCK_ASSIGN", "type": "DB", "description": "Active assignment (ACTIVE_FLAG = 'Y')"},
    {"name": "TB_R_DTP_RECORD", "type": "DB", "description": "ARRIVAL DATE / TIME, container"},
    {"name": "Truck / Driver / Trucking Company / Location Master (TBD)", "type": "DB", "description": "Names, status, coordinates"},
    {"name": "System Master (TBD)", "type": "DB", "description": "Batch size, max attempts, interval, HiveMQ connection and topic pattern"}],
  "outputs": [
    {"name": "TB_R_DRIVER_ORDER", "type": "DB", "description": "if successful - read by Driver API / APK"},
    {"name": "TB_R_DRIVER_MQ_OUTBOX", "type": "DB", "description": "one message per change; status N / S / E"},
    {"name": "HiveMQ topic <prefix>/driver/<PLATE_NO>/orders", "type": "MQTT", "description": "if successful - received by the Driver APK"},
    {"name": "TB_T_DRIVER_SYNC_QUEUE", "type": "DB", "description": "status P / S / E per event"},
    {"name": "TB_R_DRIVER_SYNC_LOG", "type": "DB", "description": "one record per run (start, end, counts)"}],
  "extra_tables": [
    {"title": "Execution Schedule", "columns": [{"title": "Item", "width": 10}, {"title": "Description", "width": 30}],
     "rows": [["Trigger", "Event from Truck Assignment / DTP queue (near real-time)"], ["Schedule", "Every n minutes (TBD) - safety net"], ["Manual", "Re-run by administrator"], ["Concurrency", "One run at a time"]]},
    {"title": "Grouping Keys", "columns": [{"title": "Field Name", "width": 20}], "rows": ["ORDER_NO", "CYCLE_ORDER_NO"]}],
  "constraints": ["Only orders with an active truck assignment reach the driver.", "Table names are proposed; align them with the project naming convention."]
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
json.dump(spec, open(f"{S}/syncuiss/spec.json", "w"), indent=1)
