# TC-PBR functions - one folder per function

Every folder `<NN_Function>/` has `uiss/` (UISS workbooks of the function - screen plus the batch / report UISS that serve it - the rules / specification `.md`,
and `src/` with the spec JSON of each workbook and its screenshots `src/img/<UISS>/`) and `test/` (ST Integrated Function Test scripts, spec JSON in `test/src/`). The workbook is generated from the JSON with the
`anthropic-skills:uiss-generator` skill; `scripts/build_all.py` rebuilds one or all workbooks (cwd = `src/`, image paths relative).

| Folder | UISS | Type | Rev |
|---|---|---|---|
| [01_Daily_Order_Monitoring](01_Daily_Order_Monitoring/README.md) | [UISS_Screen_Daily_Order_Monitoring](01_Daily_Order_Monitoring/uiss/UISS_Screen_Daily_Order_Monitoring.xlsx) | screen | 0.5 |
| [01_Daily_Order_Monitoring](01_Daily_Order_Monitoring/README.md) | [UISS_Report_Download_Daily_Order_Monitoring](01_Daily_Order_Monitoring/uiss/UISS_Report_Download_Daily_Order_Monitoring.xlsx) | report | 0.4 |
| [02_Planning_Order_DTP](02_Planning_Order_DTP/README.md) | [UISS_Screen_DTP_Creation](02_Planning_Order_DTP/uiss/UISS_Screen_DTP_Creation.xlsx) | screen | 0.9 |
| [02_Planning_Order_DTP](02_Planning_Order_DTP/README.md) | [UISS_Batch_DTP_Excel_Upload](02_Planning_Order_DTP/uiss/UISS_Batch_DTP_Excel_Upload.xlsx) | batch | 0.5 |
| [02_Planning_Order_DTP](02_Planning_Order_DTP/README.md) | [UISS_Batch_DTP_Queue_Processing](02_Planning_Order_DTP/uiss/UISS_Batch_DTP_Queue_Processing.xlsx) | batch | 0.4 |
| [02_Planning_Order_DTP](02_Planning_Order_DTP/README.md) | [UISS_Batch_DTP_Switching](02_Planning_Order_DTP/uiss/UISS_Batch_DTP_Switching.xlsx) | batch | 0.5 |
| [02_Planning_Order_DTP](02_Planning_Order_DTP/README.md) | [UISS_Batch_IPMS_DTP_Interface](02_Planning_Order_DTP/uiss/UISS_Batch_IPMS_DTP_Interface.xlsx) | batch | 0.2 |
| [03_Planning_Truck_Assignment](03_Planning_Truck_Assignment/README.md) | [UISS_Screen_Planning_Truck_Assignment](03_Planning_Truck_Assignment/uiss/UISS_Screen_Planning_Truck_Assignment.xlsx) | screen | 0.4 |
| [03_Planning_Truck_Assignment](03_Planning_Truck_Assignment/README.md) | [UISS_Batch_Driver_Order_Sync](03_Planning_Truck_Assignment/uiss/UISS_Batch_Driver_Order_Sync.xlsx) | batch | 0.4 |
| [04_Delivery_Note](04_Delivery_Note/README.md) | [UISS_Report_Delivery_Note](04_Delivery_Note/uiss/UISS_Report_Delivery_Note.xlsx) | report | 0.4 |
| [04_Delivery_Note](04_Delivery_Note/README.md) | [UISS_Batch_ELIPS_PAS_GR_Attachment](04_Delivery_Note/uiss/UISS_Batch_ELIPS_PAS_GR_Attachment.xlsx) | batch | 0.3 |
| [05_SA_Approval](05_SA_Approval/README.md) | [UISS_Screen_SA_Approval](05_SA_Approval/uiss/UISS_Screen_SA_Approval.xlsx) | screen | 0.5 |
| [06_SA_Monitoring](06_SA_Monitoring/README.md) | [UISS_Screen_SA_Monitoring](06_SA_Monitoring/uiss/UISS_Screen_SA_Monitoring.xlsx) | screen | 0.6 |
| [06_SA_Monitoring](06_SA_Monitoring/README.md) | [UISS_Batch_SA_PAS_Interface](06_SA_Monitoring/uiss/UISS_Batch_SA_PAS_Interface.xlsx) | batch | 0.2 |
| [07_Master_Trucking_Company](07_Master_Trucking_Company/README.md) | [UISS_Screen_Master_Trucking_Company](07_Master_Trucking_Company/uiss/UISS_Screen_Master_Trucking_Company.xlsx) | screen | 0.5 |
| [08_Master_Location](08_Master_Location/README.md) | [UISS_Screen_Master_Location](08_Master_Location/uiss/UISS_Screen_Master_Location.xlsx) | screen | 0.3 |
| [09_Master_Mileage](09_Master_Mileage/README.md) | [UISS_Screen_Master_Mileage](09_Master_Mileage/uiss/UISS_Screen_Master_Mileage.xlsx) | screen | 0.7 |
| [09_Master_Mileage](09_Master_Mileage/README.md) | [UISS_Batch_Master_Mileage_Upload](09_Master_Mileage/uiss/UISS_Batch_Master_Mileage_Upload.xlsx) | batch | 0.5 |
| [10_Master_Price](10_Master_Price/README.md) | [UISS_Screen_Master_Price](10_Master_Price/uiss/UISS_Screen_Master_Price.xlsx) | screen | 0.3 |
| [11_Master_Priority](11_Master_Priority/README.md) | [UISS_Screen_Master_Priority](11_Master_Priority/uiss/UISS_Screen_Master_Priority.xlsx) | screen | 0.3 |
| [12_Master_KPI](12_Master_KPI/README.md) | [UISS_Screen_Master_KPI](12_Master_KPI/uiss/UISS_Screen_Master_KPI.xlsx) | screen | 0.5 |
| [13_Master_Route_Percentage](13_Master_Route_Percentage/README.md) | [UISS_Screen_Master_Route_Percentage](13_Master_Route_Percentage/uiss/UISS_Screen_Master_Route_Percentage.xlsx) | screen | 0.3 |
| [14_Master_Renban](14_Master_Renban/README.md) | [UISS_Screen_Master_Renban](14_Master_Renban/uiss/UISS_Screen_Master_Renban.xlsx) | screen | 0.3 |
| [15_PR_Creation](15_PR_Creation/README.md) | [UISS_Screen_PR_Creation](15_PR_Creation/uiss/UISS_Screen_PR_Creation.xlsx) | screen | 0.4 |
| [16_Monthly_PR_PO_Approval_Inquiry](16_Monthly_PR_PO_Approval_Inquiry/README.md) | [UISS_Screen_PR_Inquiry](16_Monthly_PR_PO_Approval_Inquiry/uiss/UISS_Screen_PR_Inquiry.xlsx) | screen | 0.4 |
| [16_Monthly_PR_PO_Approval_Inquiry](16_Monthly_PR_PO_Approval_Inquiry/README.md) | [UISS_Screen_PR_Approval](16_Monthly_PR_PO_Approval_Inquiry/uiss/UISS_Screen_PR_Approval.xlsx) | screen | 0.4 |
| [16_Monthly_PR_PO_Approval_Inquiry](16_Monthly_PR_PO_Approval_Inquiry/README.md) | [UISS_Screen_PO_Approval](16_Monthly_PR_PO_Approval_Inquiry/uiss/UISS_Screen_PO_Approval.xlsx) | screen | 0.4 |
| [16_Monthly_PR_PO_Approval_Inquiry](16_Monthly_PR_PO_Approval_Inquiry/README.md) | [UISS_Screen_PO_Inquiry](16_Monthly_PR_PO_Approval_Inquiry/uiss/UISS_Screen_PO_Inquiry.xlsx) | screen | 0.4 |
| [17_PAS_PR_Interface](17_PAS_PR_Interface/README.md) | [UISS_Batch_ELIPS_PAS_PR_Interface](17_PAS_PR_Interface/uiss/UISS_Batch_ELIPS_PAS_PR_Interface.xlsx) | batch | 0.3 |
| [17_PAS_PR_Interface](17_PAS_PR_Interface/README.md) | [UISS_Batch_PAS_ELIPS_PR_PO_Callback](17_PAS_PR_Interface/uiss/UISS_Batch_PAS_ELIPS_PR_PO_Callback.xlsx) | batch | 0.3 |
| [18_Menu_Authorization](18_Menu_Authorization/README.md) | [UISS_Screen_TCPBR_Menu_Authorization](18_Menu_Authorization/uiss/UISS_Screen_TCPBR_Menu_Authorization.xlsx) | screen | 0.2 |

Shared scripts (`scripts/`): `uiss_paths.py` (locate a UISS), `build_all.py`, `db_revision.py` (revision against the ELIPS schema with `docs/review/db-mapping/*.json`),
`missing_uiss_gen.py` (UISS created in the review), `make_folder_index.py` (these READMEs) and the historical patch / generator scripts (run before the folder layout; they take the src folder as argument).

Database: `docs/db/` (ELIPS schema, dictionary). Review deliverables: `docs/review/`.
