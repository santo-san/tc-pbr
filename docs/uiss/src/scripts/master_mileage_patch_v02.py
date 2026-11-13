# UISS-Screen Master Mileage rev 0.2: Excel upload (screen part); backend = UISS-Batch Master Mileage - Route Mileage Upload
# Usage: python3 master_mileage_patch_v02.py <docs/uiss/src> <screenshot dir>
import json, sys
SRC, IMG = sys.argv[1], sys.argv[2].rstrip('/') + '/'
p = f"{SRC}/UISS_Screen_Master_Mileage.json"; d = json.load(open(p))
if any(r['revision'] == '0.2' for r in d['revisions']): sys.exit('already rev 0.2')
d['revisions'].append({"revision": "0.2", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "",
  "description": "Added Excel upload: Upload Excel / Download Template buttons, upload preview dialog (New / Update / No change / Error per row), Confirm Upload; backend refer UISS-Batch Master Mileage - Route Mileage Upload"})
d['header'].update({"updated_date": "13-Nov-26", "updated_by": "Susanto"})
g = d['general']
g['objective'].append("To create or update many routes at once from an Excel template, with a preview of the result of every row before saving.")
NB = [("Upload Excel", "To select the Excel file and show the upload preview (nothing saved yet)."),
      ("Download Template", "To download the Excel template (Route Mileage, Active Locations, Notes)."),
      ("Confirm Upload", "To save all New and Update rows of the previewed file (all-or-nothing).")]
g['buttons'] += [{"name": n, "function": f} for n, f in NB]
for m in g['screen_modes']:
    for sec in m['sections']:
        on = m['mode'].startswith('Add') and sec['section'] != 'Input'
        sec['buttons'].update({"Upload Excel": 'E' if on else 'D', "Download Template": 'E' if on else 'D', "Confirm Upload": 'D'})
btns = list(g['screen_modes'][0]['sections'][0]['buttons'].keys())
g['screen_modes'].append({"mode": "Upload Preview (dialog)", "sections": [{"section": "Upload preview", "description": "refer below 4)",
    "buttons": {b: ('E' if b in ('Confirm Upload',) else 'D') for b in btns}}]})
g['screen_mode_remarks'].append("4) Upload Preview: Confirm Upload is enabled only when no row has an error and at least one row is New or Update; Cancel / × close the dialog without saving.")
it = lambda name, io="O", control="Label", source="", field="", type_="", len_="", just="Center", init="", req="N", fmt="", val="", desc="": {"name": name, "source": source, "field": field, "type": type_, "len": len_, "io": io, "control": control, "justified": just, "initial": init, "required": req, "format": fmt, "validation": val, "description": desc}
n0 = sum(1 for m in d['display_messages'] if 'event' in m)
M = {k: n0 + i for i, k in enumerate(['type', 'header', 'empty', 'many', 'rows', 'nothing', 'saved', 'tpl'], 1)}
d['items'] += [
 {"group": "<Route Mileage List Section - Upload>"},
 it("Upload Excel", "I", "Button", desc=f"Opens the file dialog (.xlsx / .xls). The file is read and checked (refer UISS-Batch 'Master Mileage - Route Mileage Upload'); file errors: msg {M['type']}-{M['many']}; otherwise the Upload Preview dialog opens."),
 it("Download Template", "I", "Button", desc=f"Downloads 'Template_Route_Mileage.xlsx': sheet Route Mileage (FROM CODE, TO CODE, MILEAGE (KM) + 2 examples), Active Locations (code, name), Notes (msg {M['tpl']})."),
 {"group": "<Upload Preview Dialog>"},
 it("Title", source="System", desc="'Upload Route Mileage - {file name}'."),
 it("Summary chips", source="Calculation", desc="New n (green) · Update n (blue) · No change n (grey) · Error n (red) · Rows n."),
 it("Result message", source="System", desc=f"Errors: msg {M['rows']}; nothing to save: msg {M['nothing']}; otherwise 'All rows are valid. Click Confirm Upload ...'."),
 it("Row", source="File", field="Excel row number", type_="Number", len_=5),
 it("From / To", source="File / Master Location", field="FROM CODE / TO CODE + location name", type_="Char", len_="TBD", just="Left", desc="Code in upper case with the location name below ('(not in Master Location)' if unknown)."),
 it("Mileage (Km)", source="File", field="MILEAGE (KM)", type_="Char", len_=20, desc="As typed in the file."),
 it("Result", source="Calculation", desc="New / Update / No change / Error (colour per result); error rows highlighted red."),
 it("Remark", source="Calculation", just="Left", desc="Error: all reasons of the row; Update: 'old → new Km'; No change: 'Same mileage, skipped'; New: 'New route'."),
 it("Cancel / ×", "I", "Button", desc="Close without saving."),
 it("Confirm Upload", "I", "Button", desc=f"Enabled only without errors and with New / Update rows; saves all rows (refer UISS-Batch), closes the dialog, refreshes the list, msg {M['saved']}."),
]
H = lambda t: {"type": "heading", "text": t, "level": 0}
I = lambda m, t: {"type": "item", "marker": m, "text": t, "level": 2}
d['operation'] += [
 H("5.10 Excel Upload (MM-20 to MM-29, refer UISS-Batch 'Master Mileage - Route Mileage Upload')"),
 I("a.", f"Download Template: Excel with sheet Route Mileage (header FROM CODE | TO CODE | MILEAGE (KM)), Active Locations and Notes (msg {M['tpl']})."),
 I("b.", f"Upload Excel: the file is checked (type, template columns, 1-1,000 rows; msg {M['type']} / {M['header']} / {M['empty']} / {M['many']}) and every row is validated with the screen rules (MM-01..MM-03, MM-06), duplicates in the file and inactive existing routes. Nothing is saved yet."),
 I("c.", "Upload Preview: result per row New (route not existing), Update (existing Active route, other mileage), No change (same mileage), Error (reasons)."),
 I("d.", f"Confirm Upload (only without errors and with New / Update rows): all rows are checked again and saved in one transaction (all-or-nothing); list refreshed, msg {M['saved']}. With errors: msg {M['rows']}; nothing to save: msg {M['nothing']}."),
]
d['display_messages'] += [{"group": "Excel Upload"},
 {"event": "Click [Upload Excel]", "cause": "File is not .xlsx / .xls or cannot be read (MM-27)", "type": "Error", "msg_id": "TBD", "message": "File format is not valid. Please upload the Excel template (.xlsx / .xls).", "action": "Use the template"},
 {"event": "Click [Upload Excel]", "cause": "Template columns not found (MM-21)", "type": "Error", "msg_id": "TBD", "message": "Template is not valid: column {columns} not found. Please use the Download Template file.", "action": "Download Template"},
 {"event": "Click [Upload Excel]", "cause": "No data row", "type": "Error", "msg_id": "TBD", "message": "The file has no mileage data.", "action": "Fill the template"},
 {"event": "Click [Upload Excel]", "cause": "More than 1,000 data rows", "type": "Error", "msg_id": "TBD", "message": "The file has {n} rows; maximum 1000 rows per upload.", "action": "Split the file"},
 {"event": "Upload Preview", "cause": "One or more rows with errors (MM-25)", "type": "Error", "msg_id": "TBD", "message": "{n} row(s) have errors. Nothing was saved; correct the file and upload again.", "action": "Correct the rows shown"},
 {"event": "Upload Preview", "cause": "Every route already has the same mileage", "type": "Info", "msg_id": "TBD", "message": "All routes in the file already have the same mileage. Nothing to save.", "action": "-"},
 {"event": "Click [Confirm Upload]", "cause": "Saved (MM-26)", "type": "Info", "msg_id": "TBD", "message": "Upload completed: {n} route(s) created, {m} route(s) updated.", "action": "-"},
 {"event": "Click [Download Template]", "cause": "Template downloaded", "type": "Info", "msg_id": "TBD", "message": "Template downloaded", "action": "-"}]
d['screen_flow'].append({"title": "Screen Flow for Excel Upload", "flow": {"direction": "TB", "nodes": [
  {"id": "s", "label": "START", "type": "start"}, {"id": "ev", "label": "On Click of Upload Excel, select file", "type": "event"},
  {"id": "q1", "label": "File OK (type, template, rows)?", "type": "decision"}, {"id": "e1", "label": f"Message no. {M['type']}-{M['many']}", "type": "message"},
  {"id": "pv", "label": "Check rows, show Upload Preview", "type": "process"}, {"id": "q2", "label": "No error and New / Update rows?", "type": "decision"},
  {"id": "e2", "label": f"Confirm disabled, message no. {M['rows']} / {M['nothing']}", "type": "message"},
  {"id": "cf", "label": "Confirm Upload: re-check, save all (UISS-Batch)", "type": "process"}, {"id": "e", "label": f"Refresh list, message no. {M['saved']}", "type": "end"}],
  "same_rank": [["q1", "e1"], ["q2", "e2"]],
  "edges": [{"from": "s", "to": "ev"}, {"from": "ev", "to": "q1"}, {"from": "q1", "to": "e1", "label": "No"}, {"from": "q1", "to": "pv", "label": "Yes"},
            {"from": "pv", "to": "q2"}, {"from": "q2", "to": "e2", "label": "No"}, {"from": "q2", "to": "cf", "label": "Yes"}, {"from": "cf", "to": "e"}]}})
d['screen_layout'][1] = {"caption": "2. Add Mode - initial display with Upload Excel / Download Template (rev 0.2)", "image": IMG + "u01_buttons.png"}
d['screen_layout'] += [{"caption": c, "image": IMG + f} for c, f in [
  ("10. Upload Preview - rows with errors, Confirm disabled (rev 0.2)", "u02_preview_errors.png"), ("11. Upload Preview - all rows valid (New / Update / No change)", "u03_preview_ok.png"),
  ("12. After Confirm Upload - list refreshed", "u04_saved.png"), ("13. Upload failed - template columns not found", "u05_wrong_template.png")]]
json.dump(d, open(p, 'w'), indent=1)
print('ok', len(d['items']), len(d['display_messages']))
