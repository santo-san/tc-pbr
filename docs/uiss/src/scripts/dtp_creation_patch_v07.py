# DTP Creation rev 0.7: Payment Type per DTP chosen by the planner (KM-13..KM-15)
import json, sys
S = sys.argv[1]; d = json.load(open(f"{S}/duiss/dtp_screen_spec_v06.json")); IMG = f"{S}/kpitrip/img/"
d['revisions'].append({"revision": "0.7", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "",
  "description": "Payment Type per DTP chosen by the planner (By Resources / By Trip): grid column, Set for selected records, Manual Entry / Edit, DTP Maintenance, submit check; slot monitoring follows the chosen type (KM-13..KM-15)"})
g = d['general']
g['objective'].append("To let the planner choose the Payment Type (By Resources / By Trip) of each DTP, so that the slot monitoring and the Daily order follow the chosen type.")
g['buttons'].append({"name": "Payment Type", "function": "To set By Resources / By Trip for all selected records (Set By Resources / Set By Trip); per record in the Payment Type column."})
for m in g['screen_modes']:
    for sec in m['sections']:
        sec['buttons']['Payment Type'] = 'E' if m['mode'].startswith('DTP Creation (Planner') else 'D'
g['screen_mode_remarks'].append("Payment Type: enabled when at least one record is selected; the Payment Type column is a dropdown only for records not submitted yet of a company with Master KPI.")
it = lambda name, io="O", control="Label", source="", field="", type_="", len_="", just="Center", init="", req="N", fmt="", val="", desc="": {"name": name, "source": source, "field": field, "type": type_, "len": len_, "io": io, "control": control, "justified": just, "initial": init, "required": req, "format": fmt, "validation": val, "description": desc}
n0 = sum(1 for m in d['display_messages'] if 'event' in m)
MREQ, MNOT, MLOCK, MOK = n0 + 1, n0 + 2, n0 + 3, n0 + 4
REC = "TB_R_DTP_RECORD"
idx = next(k for k, i in enumerate(d['items']) if i.get('group') == '<DTP Creation vs Master KPI Section>  (per planning date, one row per trucking company of the DTP data mapping)')
d['items'][idx:idx] = [
 {"group": "<Payment Type per DTP>  (KM-13..KM-15)"},
 it("Payment Type (grid column)", "I/O", "Dropdown (badge when locked)", REC, "PAY_TYPE (proposed)", "Char", 12, "Center", "Default KM-14", "Y (company with Master KPI)", "",
    f"Type of the company in Master KPI (msg {MNOT}); not submitted records only (msg {MLOCK})", "Yellow By Resources / green By Trip; options = payment types of the LP (By Trip only with Order Sharing > 0); red '- Select -' when empty."),
 it("Payment Type ▾ (Set for selected)", "I", "Button + menu", desc=f"Set By Resources / Set By Trip for all selected (Ready to Submit) records; all-or-nothing, message no. {MOK} or the reasons."),
 it("Payment Type (Manual Entry / Edit)", "I", "Combo Box", REC, "PAY_TYPE (proposed)", "Char", 12, "Left", "Blank = default", "N", "", f"Type of the LP (msg {MNOT})", "Blank: default By Resources while a slot is free, else By Trip (KM-14)."),
 it("Payment Type (DTP Maintenance)", "I/O", "Dropdown", REC + " / Daily Order", "PAY_TYPE", "Char", 12, "Left", "", "Y", "", "Type of the LP, driver not started (MT-01)", "Changed with Save of the maintenance list; the Daily order keeps the Payment Type."),
 it("Submit confirmation - Payment Type", desc="'Payment Type: By Resources n, By Trip n'."),
]
H = lambda t: {"type": "heading", "text": t, "level": 0}
I = lambda m, t: {"type": "item", "marker": m, "text": t, "level": 2}
d['operation'] += [
 H("5.15 Payment Type per DTP (KM-13 to KM-15)"),
 I("a.", "KM-13: every DTP record has a Payment Type By Resources or By Trip chosen by the planner. Slot monitoring: By Resources table counts By Resources records (above the Daily Trip = over allocation), By Trip table counts By Trip records. Records without a type (older data) fill the By Resources Daily Trip first, the rest by trip."),
 I("b.", "KM-14: choices = payment types of the trucking company in Master KPI (By Trip only with Order Sharing > 0). Default for new / imported / edited records: By Resources while the company still has a free By Resources Daily Trip on the date, otherwise By Trip."),
 I("c.", f"KM-15: change per row (column) or for the selected records (Payment Type ▾), in Manual Entry / Edit, only before submission (msg {MLOCK}); after submission in DTP Maintenance while the driver has not started. Submit is blocked when a selected record of a company with Master KPI has no valid type (msg {MREQ}). The type is stored on the Daily order."),
]
d['display_messages'] += [{"group": "Payment Type per DTP"},
 {"event": "Click [Submit DTP]", "cause": "Selected record without valid Payment Type (KM-15)", "type": "Error", "msg_id": "TBD", "message": "Select a valid Payment Type (By Resources / By Trip) for {n} record(s) before submitting.", "action": "Set the Payment Type"},
 {"event": "Change Payment Type / Save", "cause": "Type not in Master KPI of the LP (KM-14)", "type": "Error", "msg_id": "TBD", "message": "{LP} has no {Payment Type} in Master KPI.", "action": "Choose another type"},
 {"event": "Change Payment Type", "cause": "Record already submitted / failed", "type": "Error", "msg_id": "TBD", "message": "{Container / Booking}: {status}, Payment Type cannot be changed.", "action": "Use DTP Maintenance (driver not started)"},
 {"event": "Change Payment Type", "cause": "Changed", "type": "Info", "msg_id": "TBD", "message": "{n} record(s): Payment Type {type}.", "action": "-"}]
d['data_map']['blocks'].append({"source": "Grid / Manual Entry / Edit", "destination": {"table": REC, "operation": "Update", "description": "Payment Type change (before submit)", "keys": [{"field": "DTP_REC_ID", "value": "Selected record(s)"}]},
  "mappings": [{"source_field": "Payment Type", "dest_field": "PAY_TYPE (proposed)", "description": "'By Resources' / 'By Trip' (type of the LP in Master KPI)"},
               {"dest_field": "CHANGED_BY / CHANGED_DT", "description": "Login user / server date-time"}, {"dest_field": "(history)", "description": "TB_H_DTP_RECORD_STS: 'Payment Type {old} -> {new} by {user}'"}]})
d['screen_layout'] += [{"caption": c, "image": IMG + f} for c, f in [("31. Payment Type column - default By Resources up to the Daily Trip, then By Trip (rev 0.7)", "p01_grid_paytype.png"),
    ("32. Submit blocked - Payment Type missing", "p02_submit_check.png"), ("33. Submit confirmation with count per Payment Type", "p03_confirm.png"),
    ("34. Slot monitoring follows the chosen Payment Type", "p04_kpi.png")]]
json.dump(d, open(f"{S}/duiss/dtp_screen_spec_v07.json", 'w'), indent=1)
print(len(d['items']), len(d['screen_layout']))
