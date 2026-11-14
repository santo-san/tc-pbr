"""One-off: move every UISS (workbook + source JSON + screenshots) and its rules / spec .md into one folder per function
under docs/uiss/<NN_Function>/, move the shared scripts to docs/uiss/scripts/, fix links. Uses git mv to keep history.
Usage: python3 restructure_folders.py <repo root> <scratchpad (image source)>"""
import json, os, re, shutil, subprocess, sys
R, SCR = sys.argv[1], sys.argv[2]
U = os.path.join(R, 'docs/uiss')
F = {
 '01_Daily_Order_Monitoring': (['UISS_Screen_Daily_Order_Monitoring', 'UISS_Report_Download_Daily_Order_Monitoring'], ['docs/daily-monitoring-rules.md']),
 '02_Planning_Order_DTP': (['UISS_Screen_DTP_Creation', 'UISS_Batch_DTP_Excel_Upload', 'UISS_Batch_DTP_Queue_Processing', 'UISS_Batch_DTP_Switching', 'UISS_Batch_IPMS_DTP_Interface'],
                           ['docs/dtp-creation-rules.md', 'docs/dtp-switching-spec.md']),
 '03_Planning_Truck_Assignment': (['UISS_Screen_Planning_Truck_Assignment', 'UISS_Batch_Driver_Order_Sync'], ['docs/truck-assignment-spec.md']),
 '04_Delivery_Note': (['UISS_Report_Delivery_Note', 'UISS_Batch_ELIPS_PAS_GR_Attachment'],
                      ['docs/delivery-note-spec.md', 'docs/tc-pbr/TC-PBR_Delivery_Note.md', 'docs/tc-pbr/TC-PBR_Delivery_Note.xlsx', 'docs/pas-interface/elips-pas-gr-attachment-spec.md']),
 '05_SA_Approval': (['UISS_Screen_SA_Approval'], ['docs/sa-approval-spec.md']),
 '06_SA_Monitoring': (['UISS_Screen_SA_Monitoring', 'UISS_Batch_SA_PAS_Interface'], ['docs/sa-monitoring-spec.md']),
 '07_Master_Trucking_Company': (['UISS_Screen_Master_Trucking_Company'], ['docs/master-trucking-company-rules.md']),
 '08_Master_Location': (['UISS_Screen_Master_Location'], ['docs/master-location-rules.md']),
 '09_Master_Mileage': (['UISS_Screen_Master_Mileage', 'UISS_Batch_Master_Mileage_Upload'], ['docs/master-mileage-rules.md']),
 '10_Master_Price': (['UISS_Screen_Master_Price'], ['docs/master-price-rules.md']),
 '11_Master_Priority': (['UISS_Screen_Master_Priority'], ['docs/master-priority-rules.md']),
 '12_Master_KPI': (['UISS_Screen_Master_KPI'], ['docs/master-kpi-rules.md']),
 '13_Master_Route_Percentage': (['UISS_Screen_Master_Route_Percentage'], ['docs/master-route-percentage-rules.md']),
 '14_Master_Renban': (['UISS_Screen_Master_Renban'], ['docs/master-renban-rules.md']),
 '15_PR_Creation': (['UISS_Screen_PR_Creation'], ['docs/pr-creation-rules.md']),
 '16_Monthly_PR_PO_Approval_Inquiry': (['UISS_Screen_PR_Inquiry', 'UISS_Screen_PR_Approval', 'UISS_Screen_PO_Approval', 'UISS_Screen_PO_Inquiry'], ['docs/monthly-pr-po-rules.md']),
 '17_PAS_PR_Interface': (['UISS_Batch_ELIPS_PAS_PR_Interface', 'UISS_Batch_PAS_ELIPS_PR_PO_Callback'],
                         ['docs/pas-interface/elips-pas-pr-interface-spec.md', 'docs/pas-interface/pas-elips-callback-spec.md', 'docs/pas-interface/current-tjava-json-to-pas.java']),
 '18_Menu_Authorization': (['UISS_Screen_TCPBR_Menu_Authorization'], []),
}
git = lambda *a: subprocess.run(['git', '-C', R, *a], check=True)
newpath = {}   # old repo-relative path -> new repo-relative path (md / files)
for folder, (uiss, docs) in F.items():
    d = os.path.join(U, folder); os.makedirs(os.path.join(d, 'src', 'img'), exist_ok=True)
    for n in uiss:
        sp = os.path.join(U, 'src', n + '.json'); spec = json.load(open(sp))
        base = os.path.join(SCR, 'tcuiss') if n.endswith('Trucking_Company') else SCR
        for coll in ([c for c in spec.get('screen_layout', []) if c.get('image')], [f for f in (spec.get('layout') or {}).get('figures', []) if f.get('image')]):
            for c in coll:
                src = c['image'] if c['image'].startswith('/') else os.path.join(base, c['image'])
                dst = os.path.join(d, 'src', 'img', n, os.path.basename(src))
                os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copyfile(src, dst)
                c['image'] = f'img/{n}/{os.path.basename(src)}'
        json.dump(spec, open(sp, 'w'), indent=1, ensure_ascii=False)
        git('mv', f'docs/uiss/src/{n}.json', f'docs/uiss/{folder}/src/{n}.json')
        git('mv', f'docs/uiss/{n}.xlsx', f'docs/uiss/{folder}/{n}.xlsx')
    for doc in docs:
        nd = f'docs/uiss/{folder}/{os.path.basename(doc)}'
        git('mv', doc, nd); newpath[doc] = nd
git('mv', 'docs/uiss/src/scripts', 'docs/uiss/scripts')
git('mv', 'docs/uiss/src/README.md', 'docs/uiss/README.md')
print('moved', len(F), 'folders')
json.dump({'folders': {k: {'uiss': v[0], 'docs': [os.path.basename(x) for x in v[1]]} for k, v in F.items()}, 'moved_docs': newpath},
          open(os.path.join(U, 'folders.json'), 'w'), indent=1)
