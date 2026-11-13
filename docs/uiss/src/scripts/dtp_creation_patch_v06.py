# DTP Creation rev 0.6: slot monitoring tables aligned (Order Sharing % + Daily Trip in By Resources and By Trip)
import json, sys
S = sys.argv[1]; d = json.load(open(f"{S}/duiss/dtp_screen_spec_v05.json"))
d['revisions'].append({"revision": "0.6", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "",
  "description": "DTP Creation vs Master KPI: By Resources and By Trip tables aligned - Order Sharing % and Daily Trip columns in both (By Resources Daily Trip typed in Master KPI, By Trip Daily Trip calculated)"})
it = lambda name, io="O", control="Label", source="", field="", type_="", len_="", just="Center", init="", req="N", fmt="", val="", desc="": {"name": name, "source": source, "field": field, "type": type_, "len": len_, "io": io, "control": control, "justified": just, "initial": init, "required": req, "format": fmt, "validation": val, "description": desc}
out = []
for i in d['items']:
    if i.get('name') == 'Master KPI Limit':
        out.append(it("Order Sharing % (By Resources)", source="Master KPI (TB_M_KPI, TBD)", field="ORDER_SHARING", type_="Numeric", len_="5,2", fmt="ZZ9.99%", desc="Information only (does not change the Daily Trip yet)."))
        i.update(name="Daily Trip (By Resources)", field="DAILY_TRIP (TBD)", description="Typed Daily Trip of the applicable By Resources Master KPI row = limit per day (KM-02); '-' if none.")
    if i.get('name') == 'Trip Limit per day':
        i.update(name="Daily Trip (By Trip)", description="Limit per day = trips per day shared by Order Sharing %: 1 each, the rest by % (Master KPI KP-15). Reference 20 -> 2 / 1.")
    if i.get('name') == 'Remaining Trip':
        i['description'] = i['description'].replace('Trip Limit', 'Daily Trip')
    out.append(i)
d['items'] = out
for x in d['operation']:
    if x.get('type') == 'item' and 'Trip Limit' in x.get('text', ''): x['text'] = x['text'].replace('Trip Limit', 'Daily Trip')
d['operation'].append({"type": "item", "marker": "e.", "level": 2, "text": "Both tables show Order Sharing % and Daily Trip (limit per day): By Resources Daily Trip is typed in Master KPI and its % is information only; By Trip Daily Trip is calculated from the trips per day."})
for l in d['screen_layout']:
    if l['caption'].startswith('30.'): l['caption'] = "30. DTP Creation vs Master KPI - By Resources and By Trip tables with Order Sharing % and Daily Trip (rev 0.6)"
json.dump(d, open(f"{S}/duiss/dtp_screen_spec_v06.json", 'w'), indent=1)
print(sum(1 for i in d['items'] if 'Daily Trip' in i.get('name', '')))
