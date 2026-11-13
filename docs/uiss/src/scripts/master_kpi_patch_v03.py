# Master KPI rev 0.3: same columns for both payment types (Order Sharing % + Daily Trip), one summary per payment type, allocation table removed
import json, sys
S = sys.argv[1]; d = json.load(open(f"{S}/kuiss/master_kpi_spec_v02.json")); IMG = f"{S}/kpitrip/img/"
d['revisions'].append({"revision": "0.3", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "",
  "description": "By Resources and By Trip aligned: Order Sharing % and Daily Trip for both (By Resources: Daily Trip typed, % information only; By Trip: % typed, Daily Trip calculated); summary per payment type shown above the grid; daily trip allocation table removed"})
g = d['general']
g['objective'][-1] = ("To maintain By Resources and By Trip trucking companies with the same columns: Order Sharing % and Daily Trip. By Resources: Daily Trip typed (Order Sharing % information only). "
                      "By Trip: Order Sharing % typed (total 100%), Daily Trip calculated from the trips per day (reference 20). Both are used by the DTP Creation slot monitoring.")
for b in g['buttons']:
    if b['name'] == 'Trips per day': b['function'] = "To set the trips per day (By Trip summary); the By Trip Daily Trip column is recalculated."
it = lambda name, io="O", control="Label", source="", field="", type_="", len_="", just="Center", init="", req="N", fmt="", val="", desc="": {"name": name, "source": source, "field": field, "type": type_, "len": len_, "io": io, "control": control, "justified": just, "initial": init, "required": req, "format": fmt, "validation": val, "description": desc}
n0 = sum(1 for m in d['display_messages'] if 'event' in m)
T = "KPI Master (TBD)"
items, out, skip = d['items'], [], False
for i in items:
    if i.get('group') == '<By Trip - Daily Trip Allocation Section>': skip = True; continue
    if skip and 'group' not in i: continue
    skip = False
    if i.get('name') == 'Order Sharing':
        i.update(name="Order Sharing %", type="Number", len="5,2", io="I/O", format="ZZ9.99%", validation="0-100, max 2 decimals (both types)",
                 description="Both payment types. By Resources: information only (does not change Daily Trip yet). By Trip: drives the Daily Trip; total must be 100% (KP-14).")
        out.append(i)
        out.append(it("Daily Trip", "I/O", "Grid / Text box (Edit Mode, By Resources)", T + " / Calculation", "DAILY_TRIP (TBD)", "Number", 2, "Center", "0", "Y", "Z9",
                      "By Resources: whole number 0-99 (msg 12)",
                      "By Resources: typed trucks per day (daily limit, daily order assignment KP-08, PR daily QTY KP-09). By Trip: calculated, italic, read only = trips per day shared by Order Sharing % (1 per company, rest by %, KP-15); tooltip shows the rule."))
        continue
    if i.get('name') == 'Total By Resource':
        out.append(it("By Resources summary", source="Calculation", control="Panel (green), above the grid", desc="Total Order Sharing % (information only) and Total Daily Trip (= Total By Resource, KP-07). Hidden on the By Trip tab."))
        continue
    if i.get('name') == 'Total By Trip':
        out.append(it("By Trip summary", source="Calculation", control="Panel (teal), above the grid", desc=f"Total Order Sharing % (must be 100%, red with note otherwise, msg {n0 - 1}), Trips per day input, Total Daily Trip (KP-14..KP-16). Hidden on the By Resources tab."))
        out.append(it("Trips per day", "I", "Text box (in By Trip summary)", "Key-in (TBD master)", "DAILY_TRIPS (TBD)", "Number", 3, "Center", "20", "Y", "ZZ9", f"Whole number 0-999 (msg {n0})", "Recalculates the By Trip Daily Trip column and the Total Daily Trip."))
        continue
    if i.get('name') == 'Group header row':
        i['description'] = "'By Resources · Daily Trip typed per company (Order Sharing % is information only for now)' / 'By Trip · Daily Trip = n trips per day shared by Order Sharing % (total % must be 100%)'."
    out.append(i)
d['items'] = out
ops = d['operation']
k = next(j for j, x in enumerate(ops) if x.get('type') == 'heading' and x['text'].startswith('5.11'))
H = lambda t: {"type": "heading", "text": t, "level": 0}
I = lambda m, t: {"type": "item", "marker": m, "text": t, "level": 2}
TB = lambda cols, rows: {"type": "table", "columns": [{"title": c, "width": w} for c, w in cols], "rows": rows, "level": 2, "row_lines": "all"}
d['operation'] = ops[:k] + [
 H("5.11 Order Sharing % and Daily Trip per payment type (KP-04, KP-07, KP-14..KP-16)"),
 TB([("Column", 8), ("By Resources", 17), ("By Trip", 17)], [
   ["Order Sharing %", "Typed, 0-100, 2 decimals; information only (no effect on Daily Trip yet)", "Typed, 0-100, 2 decimals; total must be 100%"],
   ["Daily Trip", "Typed, whole number 0-99 (trucks per day)", "Calculated: trips per day shared by %, 1 per company first, rest by % (largest remainder)"],
   ["Summary", "Total Order Sharing %, Total Daily Trip (= Total By Resource)", "Total Order Sharing %, Trips per day (input, default 20), Total Daily Trip"]]),
 I("a.", "Reference: 20 trips per day over 11 By Trip companies -> GIB, VMB, JMP, DNX, IBT, MJR, PLI, PNJ, PBM 2 each; AGR, PS 1 each (By Trip Daily Trip column)."),
 TB([("Company", 8), ("%", 7), ("1 + share of 9", 12), ("Daily Trip", 7)], [["GIB", "14.16%", "1 + 1.27 -> 1", "2"], ["DNX / IBT", "10.09%", "1 + 0.91 -> 1 (remainder)", "2"], ["PBM", "7.71%", "1 + 0.69 -> 1 (remainder)", "2"], ["AGR", "4.25%", "1 + 0.38 -> 0", "1"], ["PS", "3.34%", "1 + 0.30 -> 0", "1"], ["Total (11)", "100%", "11 + 9", "20"]]),
 I("b.", "Changing Trips per day or a By Trip % recalculates the By Trip Daily Trip of every row; the daily limits are used by DTP Creation vs Master KPI (KM-02, KM-09..KM-12)."),
 I("c.", "The separate daily trip allocation table of rev 0.2 is removed: the allocation is the Daily Trip column."),
]
for b in d['data_map']['blocks']:
    for m in b.get('mappings', []):
        if 'ORDER_SHARING' in m.get('dest_field', ''): m['description'] = "Order Sharing % (2 decimals), both payment types"
    if b['destination']['operation'] in ('Insert', 'Update') and any('ORDER_SHARING' in m.get('dest_field', '') for m in b.get('mappings', [])):
        b['mappings'].append({"source_field": "Daily Trip", "dest_field": "DAILY_TRIP (TBD)", "description": "By Resources: typed whole number; By Trip: not stored (calculated)"})
lay = [l for l in d['screen_layout'] if 'allocation' not in l['caption']]
lay[1] = {"caption": "2. View Mode - Order Sharing % and Daily Trip for both payment types, summaries (rev 0.3)", "image": IMG + "k01_all.png"}
for l in lay:
    if l['caption'].startswith('13.'): l['caption'] = "13. Tab By Trip - Daily Trip calculated, By Trip summary with Trips per day (rev 0.3)"
lay += [{"caption": "16. Tab By Resources - Daily Trip typed, By Resources summary (rev 0.3)", "image": IMG + "k06_res_tab.png"},
        {"caption": "17. Summaries By Resources / By Trip (rev 0.3)", "image": IMG + "k05_summary.png"}]
d['screen_layout'] = lay
json.dump(d, open(f"{S}/kuiss/master_kpi_spec_v03.json", 'w'), indent=1)
print(len(d['items']), len(lay))
