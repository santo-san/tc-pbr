# DTP Creation rev 0.5: DTP Creation vs Master KPI with By Trip (daily trip limit per company)
import json, sys
S = sys.argv[1]; d = json.load(open(f"{S}/duiss/dtp_screen_spec_v04.json"))
d['revisions'].append({"revision": "0.5", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "",
  "description": "DTP Creation vs Master KPI: By Trip table (trip limit per day from the trips per day shared by Order Sharing %, trips above the By Resources limit count by trip), KM-09..KM-12"})
d['header']['updated_date'] = '13-Nov-26'
d['general']['objective'].append("To show per date the By Trip trip limit, the trips by trip and the remaining trips per trucking company (Master KPI Payment Type By Trip).")
it = lambda name, io="O", control="Label", source="", field="", type_="", len_="", just="Center", init="", req="N", fmt="", val="", desc="": {"name": name, "source": source, "field": field, "type": type_, "len": len_, "io": io, "control": control, "justified": just, "initial": init, "required": req, "format": fmt, "validation": val, "description": desc}
KM = "Master KPI (TB_M_KPI, TBD)"
for i in d['items']:
    if i.get('name') == 'Assigned DTP':
        i['description'] += " With a By Trip row the records above the limit count by trip (KM-09); the company cell shows 'total n = x by resource + y by trip'."
    if i.get('name') == 'Status' and 'Available / Near Limit' in i.get('description', ''):
        i['description'] += " 'Full → By Trip' when further trips go by trip; 'By Trip only' is listed in the By Trip table."
idx = next(k for k, i in enumerate(d['items']) if i.get('group') == '<Delivery Grid - DTP Switching>')
n0 = sum(1 for m in d['display_messages'] if 'event' in m)
d['items'][idx:idx] = [
 {"group": "<DTP Creation vs Master KPI - By Trip table>  (eligible By Trip companies of Master KPI, KM-09..KM-12)"},
 it("Sub title By Trip", source="Master KPI", field="DAILY_TRIPS (TBD)", desc="'By Trip · trips per day 20 shared by Order Sharing % (1 trip per company first, the rest by %)'."),
 it("Total % warning", source="Calculation", desc=f"Shown when Total By Trip of Master KPI is not 100.00% (message no. {n0 + 1}); not blocking."),
 it("Trucking Company", source="Master KPI / Master Trucking Company", field="PARTNER, NAME", type_="Char", len_="TBD", just="Left", fmt="CODE - Name"),
 it("Order Sharing (By Trip %)", source=KM, field="ORDER_SHARING (By Trip)", type_="Numeric", len_="5,2", fmt="ZZ9.99%"),
 it("Trip Limit per day", source="Calculation", field="--", type_="Numeric", len_=3, fmt="ZZ9", desc="Trips per day shared by Order Sharing %: 1 each, the rest by % (Master KPI KP-15). Reference 20 -> 2 / 1."),
 it("Trips by trip today", source="TB_R_DTP_RECORD", field="COUNT(*)", type_="Numeric", len_=4, desc="Consuming records of the date and LP above its By Resources limit (or all, for a By Trip only company)."),
 it("Remaining Trip", source="Calculation", field="--", type_="Numeric", len_=4, desc="max(0, Trip Limit - Trips by trip); 'over n' when above the limit; green / yellow / red as By Resources."),
 it("Usage / Status", source="Calculation", field="--", desc="Trips / Trip Limit x 100 with bar; Available / Near Limit / Full / Over Limit +n."),
 it("Selected / After Submit", source="TB_R_DTP_RECORD", field="STATUS = 'Ready to Submit'", desc="Selected records that would go by trip; After Submit = trips + selected / limit, 'exceeds by n'."),
 it("Total By Trip row", source="Calculation", desc="Total %, total trip limit (= trips per day), trips, remaining, over."),
]
H = lambda t: {"type": "heading", "text": t, "level": 0}
I = lambda m, t: {"type": "item", "marker": m, "text": t, "level": 2}
d['operation'] += [
 H("5.14 DTP Creation vs Master KPI - By Trip (KM-09 to KM-12)"),
 I("a.", "KM-09: company with a By Resources row and a By Trip row: records up to the By Resources limit count by resource, the records above it count by trip (no over allocation). By Trip only company: all records by trip. By Resources only: over allocation as 5.11 e."),
 I("b.", "KM-10: Trip Limit = the part of the trips per day (Master KPI, default 20) of each eligible By Trip company (share > 0): 1 trip each, the rest by Order Sharing % (largest remainder)."),
 I("c.", "KM-11: Remaining Trip = max(0, Trip Limit - Trips by trip); Over Limit shown; After Submit uses the same split for the selected records. Not blocking."),
 I("d.", f"KM-12: Total By Trip of Master KPI must be 100.00%, otherwise message no. {n0 + 1} above the table."),
]
d['display_messages'] += [{"group": "DTP Creation vs Master KPI - By Trip"},
 {"event": "Open DTP Creation / grid change", "cause": "Total By Trip of Master KPI is not 100% (KM-12)", "type": "Warning", "msg_id": "TBD", "message": "Total By Trip is {x}%; it must be 100.00%. Check Master KPI.", "action": "Inform the Master KPI owner"}]
d['screen_layout'].append({"caption": "30. DTP Creation vs Master KPI - By Resources and By Trip tables (rev 0.5)", "image": f"{S}/kpitrip/img/d01_kpi_panel.png"})
json.dump(d, open(f"{S}/duiss/dtp_screen_spec_v05.json", 'w'), indent=1)
print(len(d['items']), len(d['screen_layout']))
