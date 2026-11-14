# Master KPI rev 0.2: Payment Type By Trip (Order Sharing %, Total By Trip, daily trip allocation of the trips per day)
import json, sys
S = sys.argv[1]; d = json.load(open(f"{S}/kuiss/master_kpi_spec.json")); IMG = f"{S}/kpitrip/img/"
d['revisions'].append({"revision": "0.2", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "",
  "description": "Added Payment Type By Trip: one row per company and payment type, Order Sharing in % (Total By Trip = 100%), trips per day and daily trip allocation (1 trip each, rest by %), tabs All / By Resources / By Trip, No column; Grade GOLD from 666"})
d['header'].update({"updated_date": "13-Nov-26", "updated_by": "Susanto"})
g = d['general']
g['objective'] += ["To maintain the By Trip trucking companies with their Order Sharing in % (total 100%) and to share the trips per day (reference 20) into a daily trip limit per company, used by the DTP Creation slot monitoring like By Resources."]
g['buttons'] += [{"name": "Payment Type (new row)", "function": "To choose By Resources or By Trip for the trucking company to add."},
                 {"name": "Tabs All / By Resources / By Trip", "function": "To show all rows or the rows of one payment type."},
                 {"name": "Trips per day", "function": "To set the trips per day (By Trip) and see the daily trip allocation per company."}]
for m in g['screen_modes']:
    for sec in m['sections']:
        en = 'E' if m['mode'].startswith('View') else 'D'
        for b in ("Payment Type (new row)", "Tabs All / By Resources / By Trip", "Trips per day"): sec['buttons'][b] = en
g['screen_mode_remarks'].append("By Trip rows without Order Sharing are hatched (not eligible, KP-14). Total By Trip turns red when it is not 100.00%.")

it = lambda name, io="O", control="Label", source="", field="", type_="", len_="", just="Center", init="", req="N", fmt="", val="", desc="": {"name": name, "source": source, "field": field, "type": type_, "len": len_, "io": io, "control": control, "justified": just, "initial": init, "required": req, "format": fmt, "validation": val, "description": desc}
n0 = sum(1 for m in d['display_messages'] if 'event' in m)
MDUP, MPCT, MSUM, MTRIP = n0 + 1, n0 + 2, n0 + 3, n0 + 4
T = "KPI Master (TBD)"
for i in d['items']:
    if i.get('name') == 'Payment Type':
        i.update(desc="'By Resources' (yellow) or 'By Trip' (green), chosen with Payment Type when the company is added; part of the row key (KP-01). Not editable in the grid.")
    if i.get('name') == 'Order Sharing':
        i.update(type="Number", len="2 / 5,2", format="Z9 / ZZ9.99%", validation=f"By Resources: whole number 0-99 (msg 12); By Trip: 0-100, max 2 decimals (msg {MPCT})",
                 description="By Resources: trucks per day (daily limit, PR daily QTY). By Trip: % of the trips by trip, shown 'x.xx%' (total 100%, KP-14 / KP-15).")
idx = next(k for k, i in enumerate(d['items']) if i.get('group') == '<KPI Grid Section>')
d['items'][idx:idx] = [
 it("Payment Type (new row)", "I", "Combo Box", "Fixed list", "--", "Varchar", 12, "Left", "'By Resources'", "Y", "", "By Resources / By Trip", "Before Select Trucking Company; the company list shows only companies not yet registered with that payment type."),
 it("Tabs All / By Resources / By Trip", "I", "Segmented button", init="'All'", desc="Filters the grid by payment type; All shows the two groups with a group header row."),
]
idx = next(k for k, i in enumerate(d['items']) if i.get('group') == '<Footer Section>')
d['items'][idx:idx] = [
 it("Group header row", source="System", desc="'By Resources · Order Sharing = trucks per day' / 'By Trip · Order Sharing = % of the trips by trip (total must be 100%)' (All tab)."),
 it("No", source="System", field="--", type_="Number", len_=3, desc="Sequence within the payment type (as the reference tables)."),
 it("Not eligible row", source="System", desc="By Trip row with Order Sharing 0 is hatched with tooltip 'Not eligible' (e.g. SGL, SILVER)."),
]
d['items'] += [
 it("Total By Trip", source="System", field="--", type_="Number", len_="5,2", control="Label (teal bar)", fmt="ZZ9.99%", desc=f"Sum of Order Sharing % of the By Trip rows (KP-14); red with 'must be 100%' when not 100.00% (msg {MSUM})."),
 {"group": "<By Trip - Daily Trip Allocation Section>"},
 it("Trips per day", "I", "Text box", "Key-in (TBD master)", "DAILY_TRIPS (TBD)", "Number", 3, "Center", "20", "Y", "ZZ9", f"Whole number 0-999 (msg {MTRIP})", "Trips per day shared over the By Trip companies (KP-16). Source / maintenance TBD."),
 it("Allocation note", source="System", desc="'n eligible companies · 1 trip each first, the rest by Order Sharing %'."),
 it("No / Trucking Company / Order Sharing / Trip per day", source="Calculation", control="Grid", desc="Eligible By Trip companies sorted by Order Sharing desc; Trip per day = KP-15 allocation."),
 it("Total row", source="Calculation", desc="Total % and total trips (= trips per day)."),
]
H = lambda t: {"type": "heading", "text": t, "level": 0}
I = lambda m, t: {"type": "item", "marker": m, "text": t, "level": 2}
TB = lambda cols, rows: {"type": "table", "columns": [{"title": c, "width": w} for c, w in cols], "rows": rows, "level": 2, "row_lines": "all"}
d['operation'] += [
 H("5.10 Payment Type By Trip (KP-01, KP-04, KP-14)"),
 I("a.", f"A company may have one By Resources row and one By Trip row (key Trucking Company + Payment Type). Same company and type again: message no. {MDUP}."),
 I("b.", f"By Trip Order Sharing = % with max 2 decimals, 0-100 (message no. {MPCT}). Total By Trip must be 100.00%: not blocking, the bar turns red and the save message adds message no. {MSUM}. A By Trip row with 0% is not eligible."),
 I("c.", "Grade: GOLD from 666 (reference 667 GOLD, 665 SILVER), SILVER 600-665, BRONZE below 600 (TBD)."),
 H("5.11 Daily Trip Allocation (KP-15, KP-16)"),
 I("a.", "Trips per day (default 20) are shared over the eligible By Trip companies: 1 trip each first, the rest by Order Sharing % with the largest remainder (ties: higher %, then code). Fewer trips than companies: 1 trip each to the highest shares."),
 TB([("Company", 8), ("%", 7), ("1 + share of 9", 12), ("Trip / day", 7)], [["GIB", "14.16%", "1 + 1.27 -> 1", "2"], ["DNX / IBT", "10.09%", "1 + 0.91 -> 1 (remainder)", "2"], ["PBM", "7.71%", "1 + 0.69 -> 1 (remainder)", "2"], ["AGR", "4.25%", "1 + 0.38 -> 0", "1"], ["PS", "3.34%", "1 + 0.30 -> 0", "1"], ["Total (11)", "100%", "11 + 9", "20"]]),
 I("b.", "The daily trip limit per company is used by DTP Creation vs Master KPI (By Trip table, KM-09..KM-12)."),
]
d['display_messages'] += [{"group": "By Trip"},
 {"event": "Click [+ Add Company]", "cause": "Company already registered with the selected payment type (KP-01)", "type": "Error", "msg_id": "TBD", "message": "Trucking Company {code} is already registered in Master KPI as {payment type}.", "action": "Select another company or payment type"},
 {"event": "Click [✓] / Enter (By Trip row)", "cause": "Order Sharing not a % 0-100 with max 2 decimals (KP-04)", "type": "Error", "msg_id": "TBD", "message": "Order Sharing (By Trip) must be a percentage between 0 and 100 with at most 2 decimals.", "action": "Correct the value"},
 {"event": "Click [✓] / Enter (By Trip row)", "cause": "Saved, Total By Trip not 100% (KP-14, not blocking)", "type": "Warning", "msg_id": "TBD", "message": "Total By Trip is {x}%; it must be 100.00%.", "action": "Adjust the By Trip Order Sharing"},
 {"event": "Key-in [Trips per day]", "cause": "Not a whole number 0-999 (KP-16)", "type": "Error", "msg_id": "TBD", "message": "Trips per day (By Trip) must be a whole number between 0 and 999.", "action": "Correct the value"}]
for b in d['data_map']['blocks']:
    for m in b.get('mappings', []):
        f = m.get('dest_field', '')
        if 'PAYMENT_TYPE' in f: m['description'] = "Selected Payment Type ('By Resources' / 'By Trip'); key with PARTNER (KP-01)"
        if 'ORDER_SHARING' in f: m['description'] = "By Resources: whole number; By Trip: % (2 decimals)"
d['data_map']['blocks'].append({"source": "Key-in from screen", "destination": {"table": "Master KPI setting (TBD)", "operation": "Update", "description": "Trips per day (By Trip) - TBD (KP-16)", "keys": []},
   "mappings": [{"source_field": "Trips per day", "dest_field": "DAILY_TRIPS (TBD)", "description": "Whole number 0-999 (mock-up: screen value only, not stored)"}]})
lay = d['screen_layout']
lay[1] = {"caption": "2. View Mode - By Resources and By Trip groups, Total By Resource / By Trip (HTML mock-up, rev 0.2)", "image": IMG + "k01_all.png"}
lay += [{"caption": c, "image": IMG + f} for c, f in [("13. Tab By Trip (rev 0.2)", "k02_trip_tab.png"), ("14. By Trip Order Sharing invalid (2 decimals max)", "k03_pct_error.png"),
        ("15. Total By Trip not 100% (red, not blocking)", "k04_total_not_100.png"), ("16. Daily trip allocation - 20 trips per day", "k05_alloc.png")]]
json.dump(d, open(f"{S}/kuiss/master_kpi_spec_v02.json", 'w'), indent=1)
print(len(d['items']), n0, len(lay))
