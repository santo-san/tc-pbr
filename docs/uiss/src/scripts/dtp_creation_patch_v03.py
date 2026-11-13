import json, sys
S = sys.argv[1]; d = json.load(open(f"{S}/duiss/dtp_screen_spec_v02.json"))
IMG = f"{S}/mtout"
d['revisions'].append({"revision": "0.3", "author": "Susanto", "date": "11-Nov-26", "reviewed_by": "",
                       "description": "Added DTP Maintenance (calendar entry > DTP n List): edit / cancel DTP while the driver has not started, with multiple delete (checkbox, Select All, Delete / Restore Selected; no X button per row)"})
d['header']['updated_date'] = '11-Nov-26'; d['header']['updated_by'] = 'Susanto'
g = d['general']
g['objective'] += ["To maintain the DTP of a planning date and DTP type from the calendar (DTP n List): change data, or cancel / delete one or many DTP at once, as long as the driver has not started."]
NB = [("Entry click (DTP n List)", "To open the DTP Maintenance list of the date and DTP type."),
      ("Row Select / Select All", "To select one, several or all DTP of the list that can still be deleted."),
      ("Delete Selected", "To mark all selected DTP for deletion at once (one row: select only that row; there is no X button per row)."),
      ("Restore Selected", "To remove the deletion mark of the selected DTP ."),
      ("Maintenance Save", "To save all deletions and changes of the list after confirmation."),
      ("Maintenance Cancel", "To discard all pending deletions and changes of the list.")]
g['buttons'] += [{"name": n, "function": f} for n, f in NB]
vals = {'Calendar (Planner)': 'DDDDDD', 'DTP Creation (Planner, date in range)': 'DDDDDD', 'Read only (not Planner / date outside range)': 'DDDDDD', 'Processing (upload / BEST / submit)': 'DDDDDD'}
for m in g['screen_modes']:
    for sec in m['sections']:
        for (n, _), v in zip(NB, vals.get(m['mode'], 'DDDDDD')):
            sec['buttons'][n] = 'E' if (n == 'Entry click (DTP n List)' and m['mode'] == 'Calendar (Planner)' and sec['section'] == 'Calendar') else v
all_btns = list(g['screen_modes'][0]['sections'][0]['buttons'].keys())
def mode(name, desc, en):
    return {"mode": name, "sections": [{"section": "DTP Maintenance", "description": desc, "buttons": {b: ('E' if b in en else 'D') for b in all_btns}}]}
g['screen_modes'] += [
    mode("DTP Maintenance (Planner)", "rows not started editable; refer below 4)", {"Back / Filters", "Row Select / Select All", "Delete Selected", "Restore Selected", "Maintenance Save", "Maintenance Cancel"}),
    mode("DTP Maintenance (read only: not Planner)", "all rows read only", {"Back / Filters"}),
]
g['screen_mode_remarks'].append("4) DTP Maintenance: a row whose driver has started (order beyond Order Release or a cycle with Start Cycle) is read only, its checkbox is disabled. Delete Selected is enabled when at least one selected row is not yet marked; Restore Selected when at least one selected row is marked.")
g['display_order'].append({"section": "DTP Maintenance list", "fields": [{"field": "Daily order (order of creation)", "order": "Ascending"}]})

# screen flow: entry click now opens DTP Maintenance
sf = d['screen_flow'][0]['flow']
sf['nodes'].append({"id": "mt", "label": "DTP Maintenance (DTP n List)", "type": "screen", "screen_id": "TBD"})
sf['edges'] = [e for e in sf['edges'] if not (e['from'] == 'c' and e['to'] == 'l')] + [{"from": "c", "to": "mt", "label": "Entry click"}, {"from": "mt", "to": "l", "label": "Open in Daily Monitoring"}]
d['screen_flow'].append({"title": "Screen Flow for DTP Maintenance (multiple delete)", "flow": {"direction": "TB", "nodes": [
    {"id": "s", "label": "START", "type": "start"}, {"id": "ev", "label": "On Click of a calendar entry", "type": "event"},
    {"id": "ls", "label": "Show DTP n List (date + type)", "type": "process"}, {"id": "sel", "label": "Select rows / Select All", "type": "process"},
    {"id": "dl", "label": "[Delete Selected] mark rows", "type": "process"}, {"id": "sv", "label": "[Save] confirmation", "type": "process"},
    {"id": "q", "label": "Driver not started and data valid (re-check)?", "type": "decision"}, {"id": "er", "label": "Show message, nothing saved", "type": "message"},
    {"id": "ok", "label": "Cancel orders / delete DTP, refresh list", "type": "end"}],
  "same_rank": [["q", "er"]],
  "edges": [{"from": "s", "to": "ev"}, {"from": "ev", "to": "ls"}, {"from": "ls", "to": "sel"}, {"from": "sel", "to": "dl"}, {"from": "dl", "to": "sv"}, {"from": "sv", "to": "q"},
            {"from": "q", "to": "er", "label": "No"}, {"from": "q", "to": "ok", "label": "Yes"}]}})

it = lambda name, io="O", control="Label", source="", field="", type_="", len_="", just="Center", init="", req="N", fmt="", val="", desc="": {"name": name, "source": source, "field": field, "type": type_, "len": len_, "io": io, "control": control, "justified": just, "initial": init, "required": req, "format": fmt, "validation": val, "description": desc}
n0 = sum(1 for m in d['display_messages'] if 'event' in m)
MK, MR, MS, MOK, MDRV, MINV, MDB, MNO, MLV, MAUTH = [n0 + i for i in range(1, 11)]
REC, DO = "TB_R_DTP_RECORD", "Daily Order (TBD)"
sel = lambda n, src, fld, desc, req="N": it(n, "I/O", "Dropdown", src, fld, "Char", "TBD", "Left", "", req, "", "Refer 5.13", desc)
txt = lambda n, src, fld, ln, desc="", req="N", fmt="": it(n, "I/O", "Textbox", src, fld, "Char", ln, "Left", "", req, fmt, "Refer 5.13", desc)
new = [
 {"group": "<DTP Maintenance - Header and Bar>  (calendar entry click; #planning-order/maint/YYYY-MM-DD/type)"},
 it("Daily Plan Date", source="Calendar entry", field="PLAN_DT", type_="Date", len_=10, just="Left", fmt="DD/MM/YYYY"),
 it("Open in Daily Monitoring", "I", "Link", desc="Daily Monitoring filtered on the date and DTP type (asks before discarding pending changes)."),
 it("Title DTP n - Maintenance", source="Calendar entry", field="DTP type", desc="'DTP 2 - Maintenance'; 'Universal DTP - Maintenance' for DTP Creation orders."),
 it("List title", source="Calendar entry", field="DTP type", just="Left", desc="'DTP n List'."),
 it("Delete Selected (n)", "I", "Button (red)", desc=f"Marks all selected rows that are not yet marked for deletion; n = count; disabled when 0. Toast message no. {MK}."),
 it("Restore Selected (n)", "I", "Button", desc=f"Removes the deletion mark of the selected marked rows; n = count; disabled when 0. Toast message no. {MR}."),
 it("Selected count", source="Screen", field="--", desc="'n selected'."),
 it("Search", "I", "Textbox", type_="Char", len_=50, just="Left", init="Blank", desc="Placeholder 'Search [ Input 3 characters ]'; filters from 3 characters on all values and Order No."),
 it("Kolom", "I", "Dropdown checklist", desc="Show / hide columns."),
 {"group": "<DTP Maintenance - List>  (Daily orders of the date and DTP type; values from the DTP record, or from the order for DTP 1-4 data)"},
 it("Select All", "I", "Checkbox (Options header)", init="Unchecked", desc="Selects / unselects every row of the current search (all pages) that can still be deleted (driver not started); disabled if none."),
 it("Row checkbox", "I", "Checkbox", init="Unchecked", desc="Disabled with the reason as tooltip when the driver started or the user is not Planner. Selected rows are highlighted; a row whose driver starts meanwhile leaves the selection."),
 it("Delete label", desc="Red label 'Delete' next to the checkbox of a row marked for deletion (row red, struck through, read only); select it and click Restore Selected to undo."),
 sel("Round Use", REC, "ROUND_USE", "Yes / No (Y = 2 cycles)", "Y"),
 sel("Truck Company", REC, "LP_CD", "CODE - Name (DTP data mapping); another company releases the truck (MT-06)", "Y"),
 txt("Renban", REC, "RENBAN", 20, req="Y", fmt="Upper case A-Z 0-9"),
 sel("From", REC, "FROM_LOC_CD", "CODE - Name", "Y"),
 sel("To", REC, "TO_LOC_CD", "CODE - Name; not equal to From", "Y"),
 txt("Destination", REC, "DEST_CD", 20, req="Y", fmt="Upper case"),
 it("ETD", "I/O", "Date picker", REC, "ETD_DT", "Date", 10, "Center", "", "Y", "DD/MM/YYYY", "Refer 5.13"),
 sel("Ctr Size", REC, "CTR_SIZE", "20 / 40 / 45", "Y"),
 txt("Agent", REC, "SHIPPING_AGENT", "TBD"),
 txt("Ctr Book No", REC, "CTR_BOOKING_NO", 20, fmt="Upper case"),
 it("Container No", "O", "Textbox (disabled)", REC + " / Cycle", "CONTAINER_NO", "Char", 11, "Left", "", "N", "", "", "Placeholder 'ENTER VALUE'; entered by the driver at Pick Up."),
 sel("Ctr Type", REC, "CTR_SIZE (suffix HC)", "GP / HC (HC only with 40) (TBD master, MT-OQ3)"),
 sel("Ctr DG ?", REC, "CTR_DG_FLAG", "No / Yes (DG)"),
 txt("Vessel", REC, "VESSEL_NAME", "TBD"),
 sel("Truck Type", REC, "TRUCK_TYPE", "Master truck types", "Y"),
 txt("Description", REC, "DESCRIPTION", "TBD"),
 sel("Service Type", REC, "IO_TYPE", "CONTAINER FOR EXPORT / CONTAINER FOR IMPORT (= Import / Export)", "Y"),
 sel("Shift", REC, "SHIFT", "'Select an option', DAY / NIGHT"),
 it("Arr. Date", "I/O", "Date picker", REC, "ARRIVAL_DT", "Date", 10, "Center", "", "N", "DD/MM/YYYY", "Refer 5.13"),
 it("Arr. Time", "I/O", "Textbox", REC, "ARRIVAL_TIME", "Char", 5, "Center", "", "N", "HH:MM", "Refer 5.13"),
 it("Order No", source=DO, field="ORDER_NO", type_="Char", len_=20, desc="Hidden by Kolom if not needed."),
 it("Driver Status", source=DO + " / Cycle", field="STATUS, START_DT", type_="Char", len_=40, desc="'Not Started (status · plate)' or 'Started (status)' (red)."),
 it("Changed cell", desc="Blue when changed; red with message tooltip when invalid after Save."),
 {"group": "<DTP Maintenance - Footer and Dialogs>"},
 it("Showing x to y of n records / pager", desc="10 rows per page."),
 it("Pending counter", desc="'n to cancel · n changed'."),
 it("Back", "I", "Button", desc=f"Back to the calendar; asks (message no. {MLV}) when changes are pending."),
 it("Cancel", "I", "Button", desc="Discards all pending deletions, marks, selections and changes."),
 it("Save", "I", "Button", desc=f"Confirmation (message no. {MS}) listing every DTP to delete (Cancel DTP) and every change; nothing pending: message no. {MNO}."),
 it("Confirm dialog", desc="Order No, Truck Company, From -> To, Status / truck, Change (Cancel DTP: Daily order cancelled, truck released / Update: fields; truck released when the company changes)."),
]
idx = next(k for k, i in enumerate(d['items']) if i.get('group') == '<Footer and Dialogs>')
d['items'][idx:idx] = new
H = lambda t: {"type": "heading", "text": t, "level": 0}
I = lambda m, t: {"type": "item", "marker": m, "text": t, "level": 2}
d['operation'] += [
 H("5.13 DTP Maintenance (MT-01 to MT-08)"),
 I("a.", "Calendar entry click opens the list of the Daily orders of that date and DTP type. Values: DTP record (Universal DTP) or the order (older DTP 1-4)."),
 I("b.", "MT-01: a row may be changed or deleted only while the driver has not started: order Planning Order / Order Release and no cycle with Start Cycle. MT-02: VPLD Planner only (message no. %d for other roles)." % MAUTH),
 I("c.", "MT-01a Multiple delete: check rows or Select All (current search, all pages, deletable rows only) -> [Delete Selected] marks all of them at once; [Restore Selected] removes the marks of the selected marked rows. No X button per row (rev 0.3). Nothing is deleted before Save."),
 I("d.", "MT-03: changes are validated at Save with the DTP Creation rules (mandatory, mapping codes, From <> To, formats, options; Ctr Size + Ctr Type = 20 / 40 / 40 HC / 45). Invalid: message no. %d, cells highlighted, nothing saved." % MINV),
 I("e.", "MT-04 / MT-05: Save -> confirmation -> backend re-check of the driver status of every row -> one transaction, all-or-nothing (as Submit DT-15). Driver started meanwhile: message no. %d, nothing saved. DB failure: message no. %d." % (MDRV, MDB)),
 I("f.", "Delete: the Daily order is cancelled (hidden for LP Admin, Truck Assignment, Driver; truck released, driver sync REMOVE as DTP Switching) and the DTP record is deleted with history (MT-OQ1). Change: DTP record and Daily order updated, order history 'DTP Maintenance'."),
 I("g.", "MT-06: another Truck Company releases the truck and the LP decision (order back to Planning Order). MT-07: deleted DTP no longer consume the Master KPI Order Sharing. Success: message no. %d; list, calendar and KPI refreshed." % MOK),
]
d['display_messages'] += [{"group": "DTP Maintenance"},
 {"event": "Delete Selected", "cause": "Selected rows marked", "type": "Info", "msg_id": "TBD", "message": "{n} DTP marked for deletion. Click Save to confirm.", "action": "-"},
 {"event": "Restore Selected", "cause": "Marks removed", "type": "Info", "msg_id": "TBD", "message": "{n} DTP restored.", "action": "-"},
 {"event": "Save", "cause": "Confirmation", "type": "Confirm", "msg_id": "TBD", "message": "Save the following change(s) for {date}? The driver status is checked again before saving.", "action": "Back / Save"},
 {"event": "Save", "cause": "Saved", "type": "Info", "msg_id": "TBD", "message": "{n} DTP cancelled, {m} DTP updated.", "action": "-"},
 {"event": "Save", "cause": "Driver started / order missing (re-check)", "type": "Error", "msg_id": "TBD", "message": "{n} DTP row(s) can no longer be changed (driver started / order missing). Nothing was saved.", "action": "Refresh, unselect"},
 {"event": "Save", "cause": "Invalid data", "type": "Error", "msg_id": "TBD", "message": "{n} DTP row(s) have invalid data. Please correct the highlighted fields.", "action": "Correct"},
 {"event": "Save", "cause": "DB failure", "type": "Error", "msg_id": "TBD", "message": "Save failed. No data was changed. Please try again.", "action": "Retry"},
 {"event": "Save", "cause": "Nothing pending", "type": "Info", "msg_id": "TBD", "message": "There is no change to save.", "action": "-"},
 {"event": "Back / Open in Daily Monitoring", "cause": "Pending changes", "type": "Confirm", "msg_id": "TBD", "message": "There are {n} unsaved change(s) in the DTP n list. Leave without saving?", "action": "Stay / Discard and leave"},
 {"event": "Open list", "cause": "Not VPLD Planner", "type": "Warning", "msg_id": "TBD", "message": "Only the VPLD Planner can create DTP.", "action": "Login as Planner"}]
d['screen_layout'] += [{"caption": c, "image": f"{IMG}/{i}"} for c, i in [
    ("22. DTP Maintenance - list from calendar entry (rev 0.3)", "01_list.png"), ("23. Multiple delete - rows selected (Delete Selected (3))", "11_selected.png"),
    ("24. Multiple delete - Select All, all deletable rows marked", "12_all_marked.png"), ("25. Save confirmation (Cancel DTP list)", "13_confirm.png"),
    ("26. Change + single delete pending", "02_pending.png"), ("27. Invalid data after Save", "04_error.png"), ("28. Driver started: row locked, checkbox disabled", "05_started.png"),
    ("29. Read only (not Planner)", "06_ip.png")]]
d['data_map']['blocks'] += [
 {"source": "DTP Maintenance - rows marked for deletion", "destination": {"table": f"{DO} / {REC}", "operation": "Update / Delete", "description": "[Save] - Cancel DTP (one or many)", "keys": [{"field": "ORDER_NO / DTP_REC_ID", "value": "Marked rows"}]},
  "mappings": [{"dest_field": "Daily order", "description": "Cancelled (logical, CANCEL_FLAG 'Y' proposed; mock-up removes it), truck assignment ACTIVE_FLAG 'N', driver sync ORDER_UPDATE (REMOVE)"},
               {"dest_field": REC, "description": "Deleted (MT-OQ1: or status Cancelled); history row 'DTP Maintenance: DTP cancelled; Daily order ... cancelled'"}]},
 {"source": "DTP Maintenance - changed rows", "destination": {"table": f"{REC} / {DO}", "operation": "Update", "description": "[Save] - change", "keys": [{"field": "DTP_REC_ID / ORDER_NO", "value": "Changed rows"}]},
  "mappings": [{"source_field": "List fields", "dest_field": "ROUND_USE, LP_CD, RENBAN, FROM/TO_LOC_CD, DEST_CD, ETD_DT, CTR_SIZE, SHIPPING_AGENT, CTR_BOOKING_NO, CTR_DG_FLAG, VESSEL_NAME, TRUCK_TYPE, DESCRIPTION, IO_TYPE, SHIFT, ARRIVAL_DT/TIME", "description": "As entered (validated 5.13 d)"},
               {"dest_field": "Daily order", "description": "LP, From / To, Renban, Shift, planned cycles; LP changed: truck / LP decision released, status Planning Order; history 'DTP Maintenance'"},
               {"dest_field": "CHANGED_BY / CHANGED_DT / VERSION", "description": "Login user / server date-time / + 1"}]},
]
json.dump(d, open(f"{S}/duiss/dtp_screen_spec_v03.json", 'w'), indent=1)
print(len(d['items']), n0, len(d['screen_layout']), len(d['display_messages']))
