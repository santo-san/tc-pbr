# 08 - Missing, Revised and Unchanged / Validated UISS

## A. Missing UISS - created in this review (rev 0.1)

| New UISS | Covers | Source of content | Main TBD |
|---|---|---|---|
| UISS_Screen_TCPBR_Menu_Authorization | COM-01, COM-02 (menu tree, role access matrix) | `index.html`, `master.html`, `monthly.html`, `workflow.js:57`, `dtp-rules.js canCreate`, `truck-assign.js:8`, `sa.js:10-11`, `sa-monitoring.js:15-17`, `pr-creation-rules.js canCreate`, `monthly-workflow.js`; ELIPS `MASTER_MENU`, `USERID_*` | USERID_CLASS per role, MENU_ID, master-screen roles |
| UISS_Batch_SA_PAS_Interface | INT-04, SA-06 (send SA to PAS, PAS feedback) | `sa-pas-rules.js` (SM-04..SM-14), `tests/sa-monitoring.test.js`; ELIPS `SA_DETAIL.PAS_*`, `LOG_ITGPAS` | PAS transport, status values, correlation id storage |
| UISS_Batch_IPMS_DTP_Interface | INT-05, DTP-05 (Load / Refresh from IPMS) | `dtp.js:44-74, :703`; ELIPS `DTP_2_DETAIL` (inferred) | IPMS system, source tables, record key |

Sections added to existing UISS for incomplete functions: Daily Monitoring "Print / PDF" (DM-05) and SA Monitoring
"Export Excel" (SA-07) - see U01 / U11 operation description.

## B. Revised UISS (all 28 existing UISS)

Every existing UISS received one revision marked **[DB-R1]**: database mapping revised to the ELIPS schema
(Item Desc data source / field / type / length from the DDL, Data Map destination columns checked against the
table with every non-existing column tagged `[Conflict: ...]`, batch table definitions of existing tables taken
from the DDL, new section **Database Specification (ELIPS AE070_ILS_DB)** with field-level status, conflicts and TBD).
Functional content (items, modes, operation, messages) was kept because it matches the code.

| UISS | Rev before -> after | Field-level result (Verified / Revised / Conflict / TBD / Missing) |
|---|---|---|
| UISS_Screen_Master_Trucking_Company | 0.3 -> 0.4 | 2 / 7 / 5 / 2 / 0 |
| UISS_Screen_Master_Location | 0.1 -> 0.2 | 0 / 10 / 4 / 3 / 0 |
| UISS_Screen_Master_Mileage | 0.5 -> 0.6 | 0 / 9 / 3 / 0 / 0 |
| UISS_Batch_Master_Mileage_Upload | 0.3 -> 0.4 | 0 / 3 / 2 / 0 / 1 |
| UISS_Screen_Master_Price | 0.1 -> 0.2 | 0 / 8 / 1 / 4 / 0 |
| UISS_Screen_Master_Priority | 0.1 -> 0.2 | 0 / 3 / 0 / 2 / 1 |
| UISS_Screen_Master_KPI | 0.3 -> 0.4 | 0 / 4 / 3 / 7 / 0 |
| UISS_Screen_Master_Route_Percentage | 0.1 -> 0.2 | 0 / 8 / 2 / 1 / 0 |
| UISS_Screen_Master_Renban | 0.1 -> 0.2 | 7 / 2 / 0 / 0 / 0 |
| UISS_Screen_DTP_Creation | 0.7 -> 0.8 | 1 / 20 / 8 / 6 / 0 |
| UISS_Batch_DTP_Excel_Upload | 0.3 -> 0.4 | 1 / 4 / 3 / 2 / 0 |
| UISS_Batch_DTP_Queue_Processing | 0.2 -> 0.3 | 0 / 4 / 2 / 2 / 0 |
| UISS_Batch_DTP_Switching | 0.3 -> 0.4 | 0 / 3 / 0 / 1 / 1 |
| UISS_Batch_Driver_Order_Sync | 0.2 -> 0.3 | 0 / 4 / 0 / 1 / 1 |
| UISS_Screen_Daily_Order_Monitoring | 0.3 -> 0.4 (+ Print / PDF) | 1 / 16 / 0 / 7 / 0 |
| UISS_Report_Download_Daily_Order_Monitoring | 0.2 -> 0.3 | 0 / 11 / 0 / 4 / 0 |
| UISS_Report_Delivery_Note | 0.2 -> 0.3 | 0 / 8 / 0 / 4 / 0 |
| UISS_Screen_Planning_Truck_Assignment | 0.2 -> 0.3 | 0 / 8 / 3 / 1 / 0 |
| UISS_Screen_SA_Approval | 0.3 -> 0.4 | 0 / 11 / 3 / 5 / 0 |
| UISS_Screen_SA_Monitoring | 0.4 -> 0.5 (+ Export Excel) | 0 / 8 / 3 / 3 / 0 |
| UISS_Screen_PR_Creation | 0.2 -> 0.3 | 0 / 8 / 2 / 2 / 0 |
| UISS_Screen_PR_Inquiry | 0.2 -> 0.3 | 0 / 10 / 1 / 2 / 0 |
| UISS_Screen_PR_Approval | 0.2 -> 0.3 | 0 / 11 / 1 / 3 / 0 |
| UISS_Screen_PO_Approval | 0.2 -> 0.3 | 0 / 7 / 1 / 3 / 0 |
| UISS_Screen_PO_Inquiry | 0.2 -> 0.3 | 0 / 7 / 1 / 3 / 0 |
| UISS_Batch_ELIPS_PAS_PR_Interface | 0.1 -> 0.2 | 0 / 2 / 0 / 5 / 0 |
| UISS_Batch_PAS_ELIPS_PR_PO_Callback | 0.1 -> 0.2 | 0 / 5 / 0 / 1 / 0 |
| UISS_Batch_ELIPS_PAS_GR_Attachment | 0.1 -> 0.2 | 0 / 2 / 0 / 2 / 0 |

## C. Unchanged / validated

- **No UISS was left completely unchanged**: none had a schema-confirmed database part.
- **Validated without change (functional part)**: items, screen modes, button control, screen flows, operation
  rules and display messages of all 28 UISS were compared with the code (`01`, `03`) and kept - they describe the
  implemented behaviour. Only the database parts and the conflicts were revised / added.
- **Validated database elements (status Verified, 12)**: Master Renban (Dest, Renban Code, Created / Changed By / Dt,
  Version - `MS_RENBAN_TCPBR` matches the UISS), Master Trucking Company (Phone, Mobile Phone), DTP Creation /
  DTP Excel Upload (Container No varchar(11)), Daily Monitoring (Container No).
- **UISS whose function is outside this repository** (kept, database side revised only): Driver Order Sync,
  ELIPS -> PAS PR Interface, PAS -> ELIPS Callback, GR Attachment.
