import json, sys
BASE = sys.argv[1]; IMG = BASE + '/img/'
T_TC = 'Trucking Company Master (TBD)'
C = lambda c: f'{c} (TBD)'   # proposed column name, physical name TBD

def it(name, source='', field='', type_='', len_='', io='O', control='Label', just='Left', initial='', req='N', fmt='', val='', desc=''):
    return {"name": name, "source": source, "field": field, "type": type_, "len": len_, "io": io, "control": control,
            "justified": just, "initial": initial, "required": req, "format": fmt, "validation": val, "description": desc}
def node(i, label, t='process'): return {"id": i, "label": label, "type": t}
def H(t): return {"type": "heading", "text": t, "level": 0}
def P(t, lv=2): return {"type": "text", "text": t, "level": lv}
def I(m, t, lv=2): return {"type": "item", "marker": m, "text": t, "level": lv}
def B(items, marker='1.', lv=3): return {"type": "bullets", "items": items, "marker": marker, "level": lv}
def TB(cols, rows, lv=2): return {"type": "table", "columns": [{"title": c, "width": w} for c, w in cols], "rows": rows, "level": lv, "row_lines": "all"}

# ---------------------------------------------------------------- Display messages
MSG, N = [], {}
def g(t): MSG.append({"group": t})
def m(key, ev, cause, typ, text, act, mid="TBD"):
    MSG.append({"event": ev, "cause": cause, "type": typ, "msg_id": mid, "message": text, "action": act}); N[key] = sum(1 for x in MSG if 'event' in x)
g("Save Operation (Add / Update) - field messages, shown under the field")
m('req', "Click [Save] button", "Mandatory field blank: Vendor Name, Vendor Code, SAP Vendor Code, NPWP (MT-01)", "Error", "{Field} is required.", "Fill in the field")
m('maxlen', "Click [Save] button", "Vendor Name / Contact Name / E-Mail > 100, Address > 300 characters (MT-02, MT-11)", "Error", "Maximum {n} characters.", "Shorten the text")
m('codeFmt', "Click [Save] button", "Vendor Code is not 3 letters / numbers (MT-03)", "Error", "Vendor Code must be 3 letters / numbers (example: DNX).", "Correct Vendor Code")
m('codeDup', "Click [Save] button", "Vendor Code used by another active vendor (MT-04)", "Error", "Vendor Code {code} is already used.", "Use another code")
m('sapFmt', "Click [Save] button", "SAP Vendor Code is not 10 digits (MT-05)", "Error", "SAP Vendor Code must be 10 digits (example: 4000006763).", "Correct SAP Vendor Code")
m('sapDup', "Click [Save] button", "SAP Vendor Code used by another active vendor (MT-05)", "Error", "SAP Vendor Code {sap} is already used.", "Check the SAP vendor")
m('svc', "Click [Save] button", "Service Type not in the list (MT-06)", "Error", "Service Type is not valid.", "Select from the list")
m('npwpFmt', "Click [Save] button", "NPWP does not have 16 digits (MT-07)", "Error", "NPWP must be 16 digits (format 999.999.999.9-999.999).", "Correct NPWP")
m('npwpDup', "Click [Save] button", "NPWP used by another active vendor (MT-07)", "Error", "NPWP is already used by another vendor.", "Check NPWP")
m('email', "Click [Save] button", "E-Mail filled with invalid format (MT-08)", "Error", "E-Mail format is not valid.", "Correct E-Mail")
m('phone', "Click [Save] button", "Phone has other characters or not 6-20 characters (MT-09)", "Error", "Phone may contain only numbers, space, +, -, ( ) (6-20 characters).", "Correct Phone")
m('mobile', "Click [Save] button", "Mobile Phone does not start with 08 / +628 / 628 or not 10-15 digits (MT-10)", "Error", "Mobile Phone must start with 08 / +628 (10-15 digits).", "Correct Mobile Phone")
g("Save Operation (Add / Update) - result")
m('codeLock', "Click [Save] button (Update)", "Vendor Code changed in Update Mode (MT-12)", "Error", "Vendor Code cannot be changed.", "Cancel and add a new vendor if needed")
m('updDeleted', "Click [Save] button (Update)", "Vendor deleted by another user meanwhile (MT-12)", "Error", "Vendor {code} has been deleted and cannot be updated.", "Click Cancel")
m('conc', "Click [Save] (Update) / [Delete]", "VERSION changed since the data was loaded (MT-13)", "Error", "Data has been changed by another user. Please click Cancel and Update again.", "Click Cancel, then Update again", "MSTD0114AERR")
m('created', "Click [Save] button (Add)", "Inserted", "Info", "{code} - {name} has been added successfully.", "-")
m('updated', "Click [Save] button (Update)", "Updated", "Info", "{code} - {name} has been updated successfully.", "-")
m('cleared', "Click [Cancel] button", "Form cleared", "Info", "Form has been cleared.", "-")
g("Delete Operation")
m('delConf', "Click [Delete] button in the list", "Confirmation (MT-20)", "Confirmation", "Delete {code} - {name}? The data is not deleted permanently: Deletion becomes Yes and this trucking company cannot be selected in new transactions.", "Click Delete or Cancel")
m('inUse', "Click [Delete] in the confirmation", "Vendor still used by an open transaction (MT-21)", "Error", "Vendor {code} is still used in {transaction}, it cannot be deleted.", "Finish / close the transaction first")
m('deleted', "Click [Delete] in the confirmation", "Logically deleted", "Info", "{code} - {name} has been deleted (Deletion = Yes).", "-")
g("Search / Export Operation")
m('nodata', "Open screen / key-in [Search]", "No row (or no row matches the keyword)", "Info", "No Data Found", "Change or clear the keyword")
m('export', "Click [Export .xls] button", "File generated", "Info", "{n} rows exported.", "-")
g("System Error")
m('sys', "Any server call", "Unexpected DB / server error (transaction rolled back)", "Error", "System error. Please contact administrator. ({Error ID})", "Retry or contact administrator")

LOG = [
  {"event": "Click [Save] (Add)", "cause": "Row inserted", "type": "Info", "msg_id": "TBD", "message": "Trucking company {code} - {name} created by {User}.", "exception": "N", "action": "Audit: CREATED_BY / CREATED_DT"},
  {"event": "Click [Save] (Update)", "cause": "Row updated", "type": "Info", "msg_id": "TBD", "message": "Trucking company {code} updated by {User}: {changed fields old -> new}.", "exception": "N", "action": "Audit: CHANGED_BY / CHANGED_DT"},
  {"event": "Click [Delete]", "cause": "Logical delete", "type": "Info", "msg_id": "TBD", "message": "Trucking company {code} - {name} deleted (DELETION_FLAG = Y) by {User}.", "exception": "N", "action": "Audit: CHANGED_BY / CHANGED_DT"},
  {"event": "Click [Delete]", "cause": "Delete rejected, vendor in use", "type": "Warning", "msg_id": "TBD", "message": "Delete of trucking company {code} rejected: used in {transaction}.", "exception": "N", "action": f"Display Message no. {N['inUse']}"},
  {"event": "Click [Save] / [Delete]", "cause": "Concurrency check failed", "type": "Warning", "msg_id": "MSTD0114AERR", "message": "Concurrency check failed for trucking company {code} (version {v}).", "exception": "Y", "action": f"Display Message no. {N['conc']}"},
  {"event": "Any server call", "cause": "DB / server error", "type": "Error", "msg_id": "TBD", "message": "Master Trucking Company {operation} failed: {Exception}.", "exception": "Y", "action": f"Rollback; Display Message no. {N['sys']}"},
]

# ---------------------------------------------------------------- Item description
items = [
  {"group": "<Header Section>"},
  it('Page title', 'Fixed', '--', desc="'Master Trucking Company'."),
  it('Breadcrumb', 'Fixed', '--', desc="'Master - Trucking Company'. Menu: Master > Trucking Company (first submenu of Master)."),
  {"group": "<Input Form Section>  (one form for Add and Update; * = mandatory)"},
  it('Vendor Name', 'Key-in', C('VENDOR_NAME'), 'Varchar', 100, 'I', 'Text box', 'Left', 'Blank', 'Y', 'Upper case',
     f"Mandatory (msg {N['req']}); max 100 (msg {N['maxlen']})", 'Trimmed, double spaces reduced to one, saved in upper case (e.g. "pt.  maju bersama" -> "PT. MAJU BERSAMA").'),
  it('Vendor Code', 'Key-in', C('VENDOR_CD'), 'Char', 3, 'I', 'Text box', 'Left', 'Blank', 'Y', 'XXX upper',
     f"Mandatory; ^[A-Z0-9]{{3}}$ (msg {N['codeFmt']}); unique among active vendors (msg {N['codeDup']})", 'Converted to upper case while typing (mbl -> MBL). Read only in Update Mode (MT-12). Same code as Trucking Code in Daily / Monthly (TBD, OP-08).'),
  it('SAP Vendor Code', 'Key-in', C('SAP_VENDOR_CD'), 'Char', 10, 'I', 'Text box', 'Left', 'Blank', 'Y', '9999999999',
     f"Mandatory; 10 digits (msg {N['sapFmt']}); unique among active vendors (msg {N['sapDup']})", 'Vendor number in SAP / PAS (e.g. 4000006763). Numeric keyboard on mobile.'),
  it('Service Type', 'Fixed list', C('SERVICE_TYPE'), 'Varchar', 10, 'I', 'Combo Box', 'Left', "'MRO'", 'Y', '',
     f"In the list (msg {N['svc']})", 'Options: MRO only (other types TBD, OP-01). Default MRO.'),
  it('NPWP', 'Key-in', C('NPWP'), 'Varchar', 21, 'I', 'Text box', 'Left', "Placeholder '999.999.999.9-999.999'", 'Y', '999.999.999.9-999.999',
     f"Mandatory; 16 digits (msg {N['npwpFmt']}); unique among active vendors (msg {N['npwpDup']})", 'Formatted automatically when leaving the field (3171234567890123 -> 317.123.456.7-890.123). 15-digit NPWP: TBD (OP-03).'),
  it('Contact Name', 'Key-in', C('CONTACT_NAME'), 'Varchar', 100, 'I', 'Text box', 'Left', 'Blank', 'N', '', f"Max 100 (msg {N['maxlen']})", 'PIC of the trucking company.'),
  it('E-Mail', 'Key-in', C('EMAIL'), 'Varchar', 100, 'I', 'Text box', 'Left', 'Blank', 'N', 'Lower case', f"If filled: name@domain.xx (msg {N['email']})", 'Saved in lower case.'),
  it('Phone', 'Key-in', C('PHONE'), 'Varchar', 20, 'I', 'Text box', 'Left', 'Blank', 'N', '', f"If filled: numbers, space, + - ( ), 6-20 (msg {N['phone']})", 'Office phone, e.g. 021-4401234.'),
  it('Mobile Phone', 'Key-in', C('MOBILE_PHONE'), 'Varchar', 20, 'I', 'Text box', 'Left', 'Blank', 'N', '', f"If filled: 08 / +628 / 628, 10-15 digits (msg {N['mobile']})", 'e.g. 081234567801. Spaces and - are ignored in the check.'),
  it('Address', 'Key-in', C('ADDRESS'), 'Varchar', 300, 'I', 'Text area', 'Left', 'Blank', 'N', '', f"Max 300 (msg {N['maxlen']})", 'Full width field.'),
  it('Save', control='Button', desc='Add Mode: insert; Update Mode: update (refer 5.3). Disabled until the server responds (no double submission).'),
  it('Cancel', control='Button', desc=f"Clear the form and errors and return to Add Mode (msg {N['cleared']})."),
  it('Mode info', 'System', '--', control='Label', desc="'Mode: Add trucking company baru' / 'Mode: Update {code} - {name} (Vendor Code cannot be changed)'."),
  it('Error text (under field)', 'System', '--', control='Label (red)', desc='Field turns red and the message is shown under it; all errors are shown at once and the first error field gets the focus.'),
  {"group": "<Trucking Company List Section>"},
  it('Section title', 'Fixed', '--', desc="'Trucking Company List'."),
  it('Search', 'Key-in', '--', 'Varchar', 'TBD', 'I', 'Text box', 'Left', "Placeholder 'Search'", 'N', '', f"No result: msg {N['nodata']}", 'Filters while typing on all columns of the table (also Deletion Yes / No and dates); partial, case-insensitive; returns to page 1 (MT-30).'),
  it('Table View', control='Button (drop-down)', desc='Check box per column to show / hide it. Default hidden: Created By, Created Date, Updated By, Updated Date.'),
  it('Export .xls', control='Button', desc=f"Exports ALL rows of the current search (all pages) with the visible columns (MT-31) to 'Master_Trucking_Company_YYYYMMDD.xls' (msg {N['export']})."),
  it('Column header', control='Label (sortable)', desc='Click to sort ascending / descending (▲ / ▼). Default sort: Vendor Name ascending.'),
  it('Vendor Name', T_TC, C('VENDOR_NAME'), 'Varchar', 100, 'O', 'Grid', 'Left'),
  it('Vendor Code', T_TC, C('VENDOR_CD'), 'Char', 3, 'O', 'Grid', 'Left'),
  it('SAP Vendor Code', T_TC, C('SAP_VENDOR_CD'), 'Char', 10, 'O', 'Grid', 'Left'),
  it('Service Type', T_TC, C('SERVICE_TYPE'), 'Varchar', 10, 'O', 'Grid', 'Left'),
  it('NPWP', T_TC, C('NPWP'), 'Varchar', 21, 'O', 'Grid', 'Left', '', '', '999.999.999.9-999.999'),
  it('Contact Name', T_TC, C('CONTACT_NAME'), 'Varchar', 100, 'O', 'Grid', 'Left'),
  it('E-Mail', T_TC, C('EMAIL'), 'Varchar', 100, 'O', 'Grid', 'Left'),
  it('Phone', T_TC, C('PHONE'), 'Varchar', 20, 'O', 'Grid', 'Left'),
  it('Mobile Phone', T_TC, C('MOBILE_PHONE'), 'Varchar', 20, 'O', 'Grid', 'Left'),
  it('Address', T_TC, C('ADDRESS'), 'Varchar', 300, 'O', 'Grid', 'Left', desc='Wrapped in the cell.'),
  it('Deletion', T_TC, C('DELETION_FLAG'), 'Char', 1, 'O', 'Badge', 'Center', '', '', 'Yes / No', '', "Y -> 'Yes' (red badge), N -> 'No' (green badge)."),
  it('Created By / Created Date', T_TC, C('CREATED_BY') + ' / ' + C('CREATED_DT'), 'Varchar / Datetime', '20 / 16', 'O', 'Grid', 'Left', '', '', 'DD.MM.YYYY HH:MI', '', 'Hidden by default (Table View).'),
  it('Updated By / Updated Date', T_TC, C('CHANGED_BY') + ' / ' + C('CHANGED_DT'), 'Varchar / Datetime', '20 / 16', 'O', 'Grid', 'Left', '', '', 'DD.MM.YYYY HH:MI', '', 'Hidden by default (Table View).'),
  it('Delete (🗑)', control='Button (red)', desc=f"Confirmation msg {N['delConf']} (refer 5.5). Disabled when Deletion = Yes."),
  it('Update (✎)', control='Button (yellow)', desc='Loads the row into the form (Update Mode); the row is highlighted. Disabled when Deletion = Yes.'),
  it('Empty list text', 'System', '--', control='Label', desc=f"msg {N['nodata']} ('No Data Found')."),
  {"group": "<Paging Section>"},
  it('Paging info', 'System', '--', control='Label', desc="'Showing n to m of x records' + '(filtered from y total entries)' when Search is used."),
  it('Rows per page (Tampilkan)', 'Fixed', '--', 'Number', 2, 'I', 'Combo Box', 'Left', '10', 'N', '', '', '10 / 25 / 50. A change returns to page 1.'),
  it('Previous / page number / Next (‹ 1 2 ›)', control='Button', desc='Current page highlighted; ‹ disabled on page 1, › disabled on the last page.'),
  {"group": "<Delete Confirmation Dialog>"},
  it('Title', 'Fixed', '--', desc="'Delete Trucking Company'."),
  it('Message', 'System', '--', desc=f"msg {N['delConf']}."),
  it('Cancel (Batal)', control='Button', desc='Close the dialog, nothing changes.'),
  it('Delete', control='Button (red)', desc='Logical delete (refer 5.5).'),
]

# ---------------------------------------------------------------- General description
BTN = ['Form fields', 'Save', 'Cancel', 'Search', 'Table View', 'Export .xls', 'Sort', 'Update', 'Delete', 'Paging']
def mo(en): return {b: ('E' if b in en else 'D') for b in BTN}
LIST = ['Search', 'Table View', 'Export .xls', 'Sort', 'Update', 'Delete', 'Paging']
general = {
  "objective": [
    "To register and maintain the trucking companies (vendors of TC-PBR): add, update, delete, search and export.",
    "To keep Vendor Code, SAP Vendor Code and NPWP unique among active trucking companies, so that every vendor in Daily, Monthly, SA and PAS can be identified without ambiguity.",
    "To keep deleted trucking companies for history (logical delete): they stay visible with Deletion = Yes but can no longer be updated or used in new transactions.",
  ],
  "display_order": [{"section": "Trucking Company List", "fields": [{"field": "Vendor Name", "order": "Ascending (default, changeable by column header)"}]}],
  "buttons": [
    {"name": "Form fields", "function": "Vendor Name, Vendor Code, SAP Vendor Code, Service Type, NPWP, Contact Name, E-Mail, Phone, Mobile Phone, Address."},
    {"name": "Save", "function": "To validate and save: insert in Add Mode, update in Update Mode."},
    {"name": "Cancel", "function": "Clear the form and reset the screen to Add Mode."},
    {"name": "Search", "function": "To filter the list by keyword (all columns)."},
    {"name": "Table View", "function": "To show / hide list columns."},
    {"name": "Export .xls", "function": "To export the filtered list (all pages) to Excel."},
    {"name": "Sort", "function": "To sort the list by the clicked column."},
    {"name": "Update", "function": "Change the screen into Update Mode with the selected row loaded."},
    {"name": "Delete", "function": "To delete the trucking company logically after confirmation."},
    {"name": "Paging", "function": "To move between pages and set rows per page."}],
  "screen_modes": [
    {"mode": "Add Mode (initial)", "sections": [
      {"section": "Input Form", "description": "all fields blank, Service Type = MRO", "buttons": mo(['Form fields', 'Save', 'Cancel'])},
      {"section": "Trucking Company List", "description": "all rows, refer below 1)", "buttons": mo(LIST)}]},
    {"mode": "Update Mode", "sections": [
      {"section": "Input Form", "description": "row loaded; Vendor Code read only, refer below 2)", "buttons": mo(['Form fields', 'Save', 'Cancel'])},
      {"section": "Trucking Company List", "description": "edited row highlighted", "buttons": mo(LIST)}]},
    {"mode": "Saving Mode", "sections": [
      {"section": "Input Form", "description": "request in progress", "buttons": mo([])},
      {"section": "Trucking Company List", "description": "unchanged until saved", "buttons": mo(LIST)}]},
    {"mode": "Delete Confirmation", "sections": [
      {"section": "Input Form", "description": "behind the dialog", "buttons": mo([])},
      {"section": "Trucking Company List", "description": "behind the dialog", "buttons": mo([])}]}],
  "screen_mode_remarks": [
    "1) Rows with Deletion = Yes: Update and Delete buttons are disabled (tooltip 'Already deleted').",
    "2) Update Mode: all fields except Vendor Code can be changed; the VERSION of the row is kept for the concurrency check (MT-13).",
    f"3) Empty table or no search result: message no. {N['nodata']} in the table body."],
}

# ---------------------------------------------------------------- Screen flow
def flow(title, d, n, e, sr=None):
    f = {"direction": d, "nodes": n, "edges": e}
    if sr: f["same_rank"] = sr
    return {"title": title, "flow": f}
flows = [
  flow("Screen Flow for Master Trucking Company", "LR",
       [{"id": "s", "label": "Master Trucking Company", "type": "screen", "screen_id": "TBD"}, node('db', T_TC, 'db'),
        {"id": "x", "label": "Excel file", "type": "document"},
        {"id": "u", "label": "Daily / Monthly / SA / PAS interface (Trucking Code, SAP Vendor Code)", "type": "subprocess"}],
       [{"from": "s", "to": "db", "label": "Add / Update / Delete"}, {"from": "s", "to": "x", "label": "Export .xls"}, {"from": "db", "to": "u", "label": "active vendors"}]),
  flow("Screen Flow for Save - Validation", "TB",
       [node('s', 'START', 'start'), node('ev', 'On Click of Save button', 'event'), node('n', 'Normalise: trim, upper case, NPWP format'),
        node('q1', 'Mandatory filled?', 'decision'), node('e1', f"Message no. {N['req']} under the field", 'message'),
        node('q2', 'Formats OK (code, SAP, NPWP, e-mail, phones, length)?', 'decision'), node('e2', f"Messages no. {N['maxlen']}-{N['mobile']}", 'message'),
        node('q3', 'Unique among active vendors?', 'decision'), node('e3', f"Message no. {N['codeDup']} / {N['sapDup']} / {N['npwpDup']}", 'message'),
        node('c', 'Continue to Store', 'end')],
       [{"from": "s", "to": "ev"}, {"from": "ev", "to": "n"}, {"from": "n", "to": "q1"}, {"from": "q1", "to": "e1", "label": "No"}, {"from": "q1", "to": "q2", "label": "Yes"},
        {"from": "q2", "to": "e2", "label": "No"}, {"from": "q2", "to": "q3", "label": "Yes"}, {"from": "q3", "to": "e3", "label": "No"}, {"from": "q3", "to": "c", "label": "Yes"}],
       [["q1", "e1"], ["q2", "e2"], ["q3", "e3"]]),
  flow("Screen Flow for Save - Store", "TB",
       [node('s', 'From validation', 'start'), node('q', 'Mode?', 'decision'),
        node('i', 'INSERT, DELETION_FLAG = N, VERSION = 1'),
        node('q5', 'Update: not deleted, code unchanged, VERSION unchanged?', 'decision'), node('e5', f"Message no. {N['codeLock']} / {N['updDeleted']} / {N['conc']}", 'message'),
        node('u', 'UPDATE ... VERSION = VERSION + 1'), node('db', T_TC, 'db'),
        node('e', f"Reset to Add Mode, refresh list, message no. {N['created']} / {N['updated']}", 'end')],
       [{"from": "s", "to": "q"}, {"from": "q", "to": "i", "label": "Add"}, {"from": "q", "to": "q5", "label": "Update"},
        {"from": "q5", "to": "e5", "label": "No"}, {"from": "q5", "to": "u", "label": "Yes"},
        {"from": "i", "to": "db", "style": "dashed"}, {"from": "u", "to": "db", "style": "dashed"}, {"from": "i", "to": "e"}, {"from": "u", "to": "e"}],
       [["q5", "e5"]]),
  flow("Screen Flow for Delete (logical)", "TB",
       [node('s', 'START', 'start'), node('ev', 'On Click of Delete in a row', 'event'), node('c', f"Confirmation message no. {N['delConf']}", 'message'),
        node('q', 'Delete clicked?', 'decision'), node('x', 'Close dialog, no change', 'end'),
        node('q2', 'Used by an open transaction?', 'decision'), node('e2', f"Message no. {N['inUse']}", 'message'),
        node('d', 'UPDATE DELETION_FLAG = Y, VERSION + 1'), node('db', T_TC, 'db'),
        node('e', f"Row shows Deletion Yes, buttons disabled, message no. {N['deleted']}", 'end')],
       [{"from": "s", "to": "ev"}, {"from": "ev", "to": "c"}, {"from": "c", "to": "q"}, {"from": "q", "to": "x", "label": "No"}, {"from": "q", "to": "q2", "label": "Yes"},
        {"from": "q2", "to": "e2", "label": "Yes"}, {"from": "q2", "to": "d", "label": "No"}, {"from": "d", "to": "db", "style": "dashed"}, {"from": "d", "to": "e"}],
       [["q", "x"], ["q2", "e2"], ["d", "db"]]),
]

layout = [{"caption": c, "image": IMG + f} for c, f in [
  ("1. Add Mode - initial display (HTML mock-up)", "t01_initial.png"),
  ("2. Validation - mandatory fields", "t02_mandatory.png"),
  ("3. Validation - format errors (Vendor Code, SAP Vendor Code, NPWP, E-Mail, Phone, Mobile Phone)", "t03_format.png"),
  ("4. Validation - Vendor Code / SAP Vendor Code / NPWP already used", "t04_duplicate.png"),
  ("5. Add - form filled (NPWP formatted automatically)", "t05_add_filled.png"),
  ("6. Add - saved: name in upper case, e-mail in lower case", "t06_added.png"),
  ("7. Update Mode - Vendor Code read only, row highlighted", "t07_update.png"),
  ("8. Update - concurrency check (changed by another user)", "t08_concurrency.png"),
  ("9. Delete confirmation", "t09_delete_confirm.png"),
  ("10. Deleted - Deletion = Yes, Update / Delete disabled", "t10_deleted.png"),
  ("11. Delete rejected - vendor still used by an open transaction", "t11_delete_blocked.png"),
  ("12. Deleted code re-used by an active vendor (PNJ)", "t12_deleted_rows.png"),
  ("13. Search without result", "t13_no_result.png"),
  ("14. Table View - show audit columns", "t14_table_view.png"),
]]

# ---------------------------------------------------------------- Data map
FORM = [("Vendor Name", "VENDOR_NAME", "TRIM, single spaces, UPPER"), ("Vendor Code", "VENDOR_CD", "TRIM + UPPER"), ("SAP Vendor Code", "SAP_VENDOR_CD", "TRIM"),
        ("Service Type", "SERVICE_TYPE", "Selected option"), ("NPWP", "NPWP", "Formatted 999.999.999.9-999.999"), ("Contact Name", "CONTACT_NAME", "TRIM"),
        ("E-Mail", "EMAIL", "TRIM + LOWER"), ("Phone", "PHONE", "TRIM"), ("Mobile Phone", "MOBILE_PHONE", "TRIM"), ("Address", "ADDRESS", "TRIM")]
K = [{"field": C('VENDOR_ID') + ' / ' + C('VENDOR_CD'), "value": "Row loaded into the form"}, {"field": C('VERSION'), "value": "Version loaded into the form"}]
data_map = {"blocks": [
  {"source": "Key-in from screen", "destination": {"table": T_TC, "operation": "Insert", "description": "Add Mode - [Save]", "keys": []},
   "mappings": [{"source_field": s, "dest_field": C(d), "description": t} for s, d, t in FORM] + [
     {"dest_field": C('DELETION_FLAG'), "description": "'N'"}, {"dest_field": C('CREATED_BY'), "description": "Login user ID"},
     {"dest_field": C('CREATED_DT'), "description": "Server system date"}, {"dest_field": C('CHANGED_BY'), "description": "Login user ID"},
     {"dest_field": C('CHANGED_DT'), "description": "Server system date"}, {"dest_field": C('VERSION'), "description": "1"}]},
  {"source": "Key-in from screen", "destination": {"table": T_TC, "operation": "Update", "description": "Update Mode - [Save]", "keys": K},
   "mappings": [{"source_field": s, "dest_field": C(d), "description": t if d != 'VENDOR_CD' else 'Not changed (read only)'} for s, d, t in FORM] + [
     {"dest_field": C('CHANGED_BY'), "description": "Login user ID"}, {"dest_field": C('CHANGED_DT'), "description": "Server system date"},
     {"dest_field": C('VERSION'), "description": "VERSION + 1"}, {"dest_field": C('DELETION_FLAG') + ', CREATED_BY / DT', "description": "Not changed"}]},
  {"source": "Screen row", "destination": {"table": T_TC, "operation": "Update", "description": "[Delete] - confirmed (logical delete)", "keys": K},
   "mappings": [{"dest_field": C('DELETION_FLAG'), "description": "'Y'"}, {"dest_field": C('CHANGED_BY'), "description": "Login user ID"},
                {"dest_field": C('CHANGED_DT'), "description": "Server system date"}, {"dest_field": C('VERSION'), "description": "VERSION + 1"},
                {"dest_field": "(other columns)", "description": "Not changed; the row is kept"}]},
]}

# ---------------------------------------------------------------- Operation description
op = [
  H("5.1 Initial Display"),
  I("a.", "Title 'Master Trucking Company', breadcrumb 'Master - Trucking Company'."),
  I("b.", "Form in Add Mode: all fields blank, Service Type = MRO, mode info 'Mode: Add'."),
  I("c.", f"List: all trucking companies, active and deleted, sorted by Vendor Name; 10 rows per page; audit columns hidden. No data: message no. {N['nodata']}."),
  P(f"SELECT VENDOR_NAME, VENDOR_CD, SAP_VENDOR_CD, SERVICE_TYPE, NPWP, CONTACT_NAME, EMAIL, PHONE, MOBILE_PHONE, ADDRESS, DELETION_FLAG, CREATED_BY, CREATED_DT, CHANGED_BY, CHANGED_DT, VERSION FROM {T_TC} ORDER BY VENDOR_NAME (column names TBD)", lv=3),
  H("5.2 Input Normalisation (client and again server)"),
  TB([("Field", 10), ("Rule", 20), ("Example", 15)], [
     ["Vendor Name", "Trim, double spaces -> one, UPPER", "pt.  maju bersama -> PT. MAJU BERSAMA"], ["Vendor Code", "Trim, UPPER while typing", "mbl -> MBL"],
     ["NPWP", "Digits only, then 999.999.999.9-999.999 (on leaving the field)", "3171234567890123 -> 317.123.456.7-890.123"],
     ["E-Mail", "Trim, lower case", "Budi@Maju.co.id -> budi@maju.co.id"], ["Others", "Trim", "-"]]),
  H("5.3 Save (Add / Update)"),
  B([f"Step 1 - Mandatory (MT-01): Vendor Name, Vendor Code, SAP Vendor Code, NPWP (message no. {N['req']}). Service Type always has a value.",
     f"Step 2 - Length and format (MT-02..MT-11): lengths (no. {N['maxlen']}); Vendor Code 3 letters / numbers (no. {N['codeFmt']}); SAP Vendor Code 10 digits (no. {N['sapFmt']}); Service Type in list (no. {N['svc']}); NPWP 16 digits (no. {N['npwpFmt']}); E-Mail (no. {N['email']}), Phone (no. {N['phone']}), Mobile Phone (no. {N['mobile']}) only when filled.",
     f"Step 3 - Uniqueness among ACTIVE vendors (DELETION_FLAG = 'N'), the edited row excluded: Vendor Code (no. {N['codeDup']}), SAP Vendor Code (no. {N['sapDup']}), NPWP compared on digits (no. {N['npwpDup']}). A code of a deleted vendor may be used again (OP-04).",
     f"Step 4 - Update only (MT-12 / MT-13): Vendor Code unchanged (no. {N['codeLock']}); row not deleted (no. {N['updDeleted']}); VERSION unchanged (no. {N['conc']}).",
     "Step 5 - Add: INSERT (Data Map block 1). Update: UPDATE ... WHERE key AND VERSION = :version (block 2).",
     f"Step 6 - COMMIT; on exception ROLLBACK and message no. {N['sys']}.",
     f"Success: form reset to Add Mode, search cleared, list refreshed; message no. {N['created']} / {N['updated']}.",
     "All errors of steps 1-3 are shown together under their fields; the first error field gets the focus."]),
  TB([("Case", 14), ("Input", 16), ("Result", 15)], [
     ["New vendor", "MBL / 4000007001 / 3171234567890123", f"Saved (no. {N['created']})"], ["Vendor Code used", "DNX (active)", f"Rejected (no. {N['codeDup']})"],
     ["Code of deleted vendor", "PNJ (old PNJ deleted)", "Allowed"], ["Short codes", "MB / 40001 / 12345", f"Rejected (no. {N['codeFmt']}, {N['sapFmt']}, {N['npwpFmt']})"]]),
  {"type": "column_break"},
  H("5.4 Update"),
  I("a.", "Update (✎) loads all fields and the VERSION into the form; Vendor Code is read only; the row is highlighted; the page scrolls to the form."),
  I("b.", "Cancel discards the changes and returns to Add Mode."),
  I("c.", "Rows with Deletion = Yes cannot be updated (button disabled; server check no. %d)." % N['updDeleted']),
  H("5.5 Delete (logical)"),
  I("a.", f"Delete (🗑) shows confirmation no. {N['delConf']}."),
  I("b.", f"MT-21: rejected when the vendor is used by an open transaction (message no. {N['inUse']}). Mock-up examples: PO Monthly in status Pending, active Daily Order, PR Monthly not finished. Exact list TBD (OP-05)."),
  I("c.", f"Otherwise UPDATE DELETION_FLAG = 'Y' (block 3) WHERE key AND VERSION; 0 rows -> no. {N['conc']}. The row stays in the list with Deletion = Yes, Update / Delete disabled; message no. {N['deleted']}."),
  I("d.", "Deleted vendors cannot be selected in new transactions (Daily, Monthly, DTP data mapping). There is no Restore (OP-06)."),
  H("5.6 Search, Sort, Table View, Export .xls"),
  I("a.", f"Search (MT-30): while typing, partial and case-insensitive on all columns (Deletion as Yes / No, dates as DD.MM.YYYY HH:MI); returns to page 1; no match: no. {N['nodata']}."),
  I("b.", "Sort: click a column header; again to reverse. Default Vendor Name ascending."),
  I("c.", "Table View: show / hide columns; default hidden Created By / Date, Updated By / Date."),
  I("d.", f"Export .xls (MT-31): SpreadsheetML (Excel), sheet 'Trucking Company', bold header; all rows of the current search (all pages), visible columns only; file 'Master_Trucking_Company_YYYYMMDD.xls'; message no. {N['export']}."),
  H("5.7 Paging"),
  I("a.", "Rows per page (Tampilkan) 10 / 25 / 50, default 10; ‹ pages ›; 'Showing n to m of x records (filtered from y total entries)'."),
  H("5.8 Concurrency, Security and Audit"),
  I("a.", "Optimistic locking with VERSION on Update and Delete; each Save / Delete is one DB transaction."),
  I("b.", "Access: IELP Admin (assumed; View / Add / Update / Delete / Export, TBD OP-07)."),
  I("c.", "MT-22: CREATED_BY / CREATED_DT on insert; CHANGED_BY / CHANGED_DT on update and delete (login user, server time)."),
  H("5.9 Open points"),
  TB([("ID", 5), ("Question", 40)], [
     ["OP-01", "Service Type options besides MRO?"], ["OP-02", "Vendor Code 3 characters and SAP Vendor Code 10 digits confirmed? Old data 'PNJ' with SAP code 'PNJ' does not meet the rule. The Master KPI reference uses 'PS' (PT. Putra Soputan, 2 characters) and 'IBL' / 'IBT' for Iron Bird; PS is in the mock-up data as an exception."],
     ["OP-03", "NPWP 16 digits only, or must old 15-digit NPWP still be accepted?"], ["OP-04", "Uniqueness only among active vendors (codes of deleted vendors re-usable) - confirm."],
     ["OP-05", "Which open transactions block Delete (active Daily Order, PR / PO Monthly pending, SA not completed, ...)?"], ["OP-06", "Restore of a deleted vendor needed?"],
     ["OP-07", "Who may add / update / delete (IELP Admin assumed)?"], ["OP-08", "Vendor Code = Trucking Code in Daily / Monthly / DTP (e.g. DNX, PBM) - confirm; physical table / column names."]]),
]

spec = {"doc_type": "screen",
  "header": {"phase": "DR", "project_name": "ELIPS Enhancement (TC-PBR)", "block_name": "Screen", "function_name": "TBD Master Trucking Company",
             "created_date": "12-Nov-26", "created_by": "Susanto"},
  "revisions": [{"revision": "0.1", "author": "Susanto", "date": "12-Nov-26", "reviewed_by": "",
                 "description": "Initial draft based on the Master Trucking Company HTML mock-up and rules (docs/master-trucking-company-rules.md, MT-01..MT-31)"},
                {"revision": "0.2", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "",
                 "description": "Mock-up data aligned with Master KPI By Trip: PT. PUTRA SOPUTAN (PS, 2-character code, exception to MT-03, OP-02) added; Iron Bird kept as IBT; screenshots refreshed"}],
  "general": general, "screen_flow": flows, "screen_layout": layout, "items": items, "data_map": data_map,
  "operation": op, "operation_layout": "two", "display_messages": MSG, "logging_messages": LOG}
json.dump(spec, open(BASE + '/spec.json', 'w'), indent=1)
print(sum(1 for x in items if 'group' not in x), 'items', len(N), 'msgs', len(flows), 'flows')
