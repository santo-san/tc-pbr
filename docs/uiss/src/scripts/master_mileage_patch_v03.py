# UISS-Screen Master Mileage rev 0.3: Excel upload function and placement like Planning Order (DTP Creation):
# accordions Upload Excel / Manual Entry, validate on Choose File, error modal Row / Column / Error, save immediately (no preview).
# Usage: python3 master_mileage_patch_v03.py <docs/uiss/src> <screenshot dir>
import json, sys
SRC, IMG = sys.argv[1], sys.argv[2].rstrip('/') + '/'
p = f"{SRC}/UISS_Screen_Master_Mileage.json"; d = json.load(open(p))
if any(r['revision'] == '0.3' for r in d['revisions']): sys.exit('already rev 0.3')
d['revisions'].append({"revision": "0.3", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "",
  "description": "Excel upload aligned with Planning Order: accordions Upload Excel (Filename, Choose File, *) Download Template) and Manual Entry; "
                 "file validated on Choose File and saved immediately when valid (no preview / Confirm Upload); errors shown in modal "
                 "'Upload validation failed' (Row / Column / Error, Download error list); busy indicator; uploaded rows highlighted"})
d['header'].update({"updated_date": "13-Nov-26", "updated_by": "Susanto"})
g = d['general']
g['objective'][-1] = "To create or update many routes at once from an Excel template (same layout and function as the Planning Order upload): the file is validated when chosen and saved at once when every row is valid."

# Buttons: Upload Excel -> Choose File; Confirm Upload removed; error modal buttons added
FN = {"Choose File": "To select the Excel file; the file is validated and, when every row is valid, saved immediately (all-or-nothing).",
      "Download Template": "Link '*) Download Template': downloads the Excel template (Route Mileage, Active Locations, Notes).",
      "Download error list": "Error modal: downloads the Row / Column / Error list as CSV.",
      "Close and correct the file": "Error modal: closes the modal; nothing was saved."}
g['buttons'] = [b for b in g['buttons'] if b['name'] not in ('Upload Excel', 'Confirm Upload', 'Download Template')]
g['buttons'] += [{"name": n, "function": f} for n, f in FN.items()]
for m in g['screen_modes']:
    for sec in m['sections']:
        b = sec['buttons']; b.pop('Upload Excel', None); b.pop('Confirm Upload', None); b.pop('Download Template', None)
g['screen_modes'] = [m for m in g['screen_modes'] if not m['mode'].startswith('Upload Preview')]
for m in g['screen_modes']:
    for sec in m['sections']:
        on = m['mode'].startswith('Add')
        sec['buttons'].update({"Choose File": 'E' if on else 'D', "Download Template": 'E' if on else 'D',
                               "Download error list": 'D', "Close and correct the file": 'D'})
    if m['mode'].startswith('Add'):
        m['sections'].insert(0, {"section": "Upload Excel (accordion)", "description": "Filename 'No file chosen', open by default, refer below 3)",
                                 "buttons": {k: ('E' if k in ('Choose File', 'Download Template') else 'D') for k in m['sections'][0]['buttons']}})
btns = list(g['screen_modes'][0]['sections'][0]['buttons'].keys())
g['screen_modes'] += [
  {"mode": "Upload Validating (busy)", "sections": [{"section": "Whole screen", "description": "'Validating Excel file...' mask", "buttons": {k: 'D' for k in btns}}]},
  {"mode": "Upload validation failed (modal)", "sections": [{"section": "Error modal", "description": "refer below 4)",
     "buttons": {k: ('E' if k in ('Download error list', 'Close and correct the file') else 'D') for k in btns}}]}]
g['screen_mode_remarks'] = [r for r in g['screen_mode_remarks'] if not r.startswith('4)')]
g['screen_mode_remarks'] += [
  "3) Accordions as in Planning Order: 'Upload Excel' above 'Manual Entry'; both open by default, the header collapses / expands them. Clicking a list row opens Manual Entry in Edit Mode.",
  "4) Upload validation failed: opened for a file error (one message) or row errors (Row / Column / Error table); nothing is saved. Valid file: no modal, saved immediately."]

# Items: replace the rev 0.2 upload items
it = lambda name, io="O", control="Label", source="", field="", type_="", len_="", just="Center", init="", req="N", fmt="", val="", desc="": {"name": name, "source": source, "field": field, "type": type_, "len": len_, "io": io, "control": control, "justified": just, "initial": init, "required": req, "format": fmt, "validation": val, "description": desc}
i0 = next(i for i, x in enumerate(d['items']) if x.get('group') == '<Route Mileage List Section - Upload>')
d['items'] = d['items'][:i0]
M = {'type': 16, 'header': 17, 'empty': 18, 'many': 19, 'rows': 20, 'nothing': 21, 'saved': 22, 'tpl': 23}
upload = [
 {"group": "<Upload Excel Accordion> (top of page, like Planning Order)"},
 it("Upload Excel (accordion header)", "I", "Accordion", init="Open", desc="Collapses / expands the upload area."),
 it("Filename", "O", "Text Box (read only)", source="File", field="File name", type_="Char", len_="TBD", just="Left", init="'No file chosen'", desc="Name of the last chosen file."),
 it("Choose File", "I", "Button", desc=f"Opens the file dialog (.xlsx / .xls). Shows 'Validating Excel file...' and validates the file (refer UISS-Batch 'Master Mileage - Route Mileage Upload'). File / row errors: modal 'Upload validation failed' (msg {M['type']}-{M['rows']}, {M['nothing']}); valid: all rows saved, list refreshed, uploaded rows highlighted, msg {M['saved']}."),
 it("*) Download Template", "I", "Link", desc=f"Downloads 'Template_Route_Mileage.xlsx': sheet Route Mileage (FROM CODE, TO CODE, MILEAGE (KM) + 2 examples), Active Locations (code, name), Notes (msg {M['tpl']})."),
 it("Upload note", source="System", just="Left", desc="'new route = created, existing Active route = mileage updated · one error in the file = nothing is saved'."),
 {"group": "<Manual Entry Accordion>"},
 it("Manual Entry (accordion header)", "I", "Accordion", init="Open", desc="Contains the Input Section (From, To, Mileage, Save, Cancel). Opened automatically by a row click (Edit Mode)."),
 {"group": "<Busy Indicator>"},
 it("Validating Excel file...", source="System", desc="Spinner mask over the screen while the file is read and validated."),
 {"group": "<Upload validation failed Modal>"},
 it("Title", source="System", desc="'Upload validation failed'."),
 it("Message", source="System", just="Left", desc=f"Row errors: msg {M['rows']}; file error: msg {M['type']}-{M['many']}; nothing to save: msg {M['nothing']}."),
 it("File", source="File", just="Left", desc="'File: {file name}'."),
 it("Row", source="Validation", field="Excel row number", type_="Number", len_=5, desc="One line per error (a row can have several)."),
 it("Column", source="Validation", type_="Char", len_=20, just="Left", desc="FROM CODE / TO CODE / MILEAGE (KM) / ROUTE."),
 it("Error", source="Validation", type_="Char", len_="TBD", just="Left", desc="Error message of the row (screen validation messages, 'Route is repeated in the file (row n).', inactive route)."),
 it("Download error list", "I", "Button", desc="Downloads 'Route_Mileage_Upload_Errors.csv' (Row, Column, Error); shown only for row errors."),
 it("Close and correct the file / ×", "I", "Button", desc="Closes the modal; nothing was saved."),
]
d['items'] += upload

# Operation 5.10
h = next(i for i, o in enumerate(d['operation']) if o['type'] == 'heading' and o['text'].startswith('5.10'))
H = lambda t: {"type": "heading", "text": t, "level": 0}
I = lambda m, t: {"type": "item", "marker": m, "text": t, "level": 2}
d['operation'] = d['operation'][:h] + [
 H("5.10 Excel Upload, layout and function like Planning Order (MM-20 to MM-29, refer UISS-Batch 'Master Mileage - Route Mileage Upload')"),
 I("a.", "Placement: accordion 'Upload Excel' (Filename, Choose File, *) Download Template) on top, accordion 'Manual Entry' (Input Section) below; both open by default."),
 I("b.", f"*) Download Template: Excel with sheet Route Mileage (header FROM CODE | TO CODE | MILEAGE (KM)), Active Locations and Notes (msg {M['tpl']})."),
 I("c.", f"Choose File: 'Validating Excel file...' is shown; the file is checked (type, template columns, 1-1,000 rows; msg {M['type']} / {M['header']} / {M['empty']} / {M['many']}) and every row is validated with the screen rules (MM-01..MM-03, MM-06), duplicates in the file and inactive existing routes."),
 I("d.", f"Any error: modal 'Upload validation failed' with Row / Column / Error (msg {M['rows']}), Download error list (CSV) and Close and correct the file; nothing is saved. All routes with the same mileage: msg {M['nothing']}."),
 I("e.", f"No error: saved immediately in one transaction (all-or-nothing): New route = insert Active, existing Active route with other mileage = update, same mileage = skipped. List refreshed, uploaded rows highlighted, msg {M['saved']} (+ 'n route(s) unchanged')."),
]
# Messages: events renamed (no preview / confirm)
for m in d['display_messages']:
    if m.get('event') in ('Click [Upload Excel]',): m['event'] = 'Click [Choose File]'
    if m.get('event') == 'Upload Preview': m['event'] = 'Click [Choose File]'; m['action'] = m['action'] if m['action'] != 'Correct the rows shown' else 'Modal Row / Column / Error; correct the file'
    if m.get('event') == 'Click [Confirm Upload]': m['event'] = 'Click [Choose File] (valid file)'
    if m.get('event') == 'Click [Download Template]': m['event'] = 'Click [*) Download Template]'
# Screen flow
f = next(x for x in d['screen_flow'] if x['title'] == 'Screen Flow for Excel Upload')
f['flow'] = {"direction": "TB", "nodes": [
  {"id": "s", "label": "START", "type": "start"}, {"id": "ev", "label": "Upload Excel accordion: Choose File", "type": "event"},
  {"id": "bz", "label": "Validating Excel file...", "type": "process"},
  {"id": "q1", "label": "File OK (type, template, rows)?", "type": "decision"},
  {"id": "q2", "label": "Every row valid?", "type": "decision"},
  {"id": "e1", "label": f"Modal 'Upload validation failed' msg {M['type']}-{M['rows']}, nothing saved", "type": "message"},
  {"id": "sv", "label": "Save all rows (UISS-Batch)", "type": "process"},
  {"id": "e", "label": f"Refresh list, highlight rows, msg {M['saved']}", "type": "end"}],
  "same_rank": [["q2", "e1"]],
  "edges": [{"from": "s", "to": "ev"}, {"from": "ev", "to": "bz"}, {"from": "bz", "to": "q1"}, {"from": "q1", "to": "e1", "label": "No"},
            {"from": "q1", "to": "q2", "label": "Yes"}, {"from": "q2", "to": "e1", "label": "No"}, {"from": "q2", "to": "sv", "label": "Yes"}, {"from": "sv", "to": "e"}]}
# Screen layout
d['screen_layout'][1] = {"caption": "2. Add Mode - accordions Upload Excel / Manual Entry, like Planning Order (rev 0.3)", "image": IMG + "u01_buttons.png"}
d['screen_layout'] = [c for c in d['screen_layout'] if not c['caption'].split('.')[0] in ('10', '11', '12', '13')]
d['screen_layout'] += [{"caption": c, "image": IMG + f} for c, f in [
  ("10. Choose File - validating Excel file (rev 0.3)", "u03_validating.png"),
  ("11. Upload validation failed - Row / Column / Error, nothing saved (rev 0.3)", "u02_upload_errors.png"),
  ("12. Valid file - saved immediately, list refreshed, uploaded rows highlighted (rev 0.3)", "u04_saved.png"),
  ("13. Upload validation failed - template columns not found (rev 0.3)", "u05_wrong_template.png")]]
json.dump(d, open(p, 'w'), indent=1)
print('ok', len(d['items']), len(d['display_messages']))
