# UISS-Screen Master Mileage rev 0.4: accordions exactly like Planning Order - Manual Entry collapsed by default,
# role badge 'IP Admin only' on both accordion headers, upload note 'Status of uploaded routes = Active'.
# Usage: python3 master_mileage_patch_v04.py <docs/uiss/src> <screenshot dir>
import json, sys
SRC, IMG = sys.argv[1], sys.argv[2].rstrip('/') + '/'
p = f"{SRC}/UISS_Screen_Master_Mileage.json"; d = json.load(open(p))
if any(r['revision'] == '0.4' for r in d['revisions']): sys.exit('already rev 0.4')
d['revisions'].append({"revision": "0.4", "author": "Susanto", "date": "13-Nov-26", "reviewed_by": "",
  "description": "Accordions aligned with Planning Order: Upload Excel open and Manual Entry collapsed on screen open (row click opens Manual Entry); role badge 'IP Admin only' on both headers; upload note changed"})
g = d['general']
g['screen_mode_remarks'] = [r for r in g['screen_mode_remarks'] if not r.startswith('3)')]
g['screen_mode_remarks'].insert(2, "3) Accordions as in Planning Order: 'Upload Excel' (open) above 'Manual Entry' (collapsed on screen open); both headers carry the badge 'IP Admin only' and collapse / expand on click. Clicking a list row opens Manual Entry in Edit Mode.")
for m in g['screen_modes']:
    for sec in m['sections']:
        if m['mode'].startswith('Add') and sec['section'] == 'Input': sec['description'] = "inside Manual Entry (collapsed on open); From / To = placeholder, Mileage blank"
by = {i.get('name'): i for i in d['items'] if 'name' in i}
by['Upload Excel (accordion header)'].update(desc="Collapses / expands the upload area. Badge 'IP Admin only' (role allowed to maintain Master Mileage, TBD).")
by['Manual Entry (accordion header)'].update(initial="Closed", desc="Collapsed when the screen opens (as in Planning Order). Contains the Input Section (From, To, Mileage, Save, Cancel). Opened by clicking the header or a list row (Edit Mode). Badge 'IP Admin only'.")
by['Upload note'].update(desc="'· Status of uploaded routes = Active (existing route = mileage updated)'.")
for o in d['operation']:
    if o['type'] == 'item' and o['text'].startswith("Placement: accordion 'Upload Excel'"):
        o['text'] = "Placement as in Planning Order: accordion 'Upload Excel' (Filename, Choose File, *) Download Template) open on top, accordion 'Manual Entry' (Input Section) below and collapsed; both headers show 'IP Admin only'."
d['screen_layout'][1] = {"caption": "2. Add Mode - Upload Excel open, Manual Entry collapsed, like Planning Order (rev 0.4)", "image": IMG + "u01_buttons.png"}
json.dump(d, open(p, 'w'), indent=1)
print('ok')
