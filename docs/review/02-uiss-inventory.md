# 02 - Existing UISS Inventory

Source: `docs/uiss/*.xlsx` (workbooks) and `docs/uiss/src/*.json` (their spec sources, kept in sync per `CLAUDE.md`).
Counts are taken from the source JSON (items = Item Desc rows, messages = Display Message rows, logs = Logging Message rows,
TBD = occurrences of "TBD" in the spec). "Rules doc" = the `docs/*.md` that the UISS was written from.

| # | UISS (file) | Type | Function name in UISS | Rev / date | Items | Msg | Logs | TBD | Rules / spec doc | Functions (01) |
|---|---|---|---|---|---|---|---|---|---|---|
| U01 | UISS_Screen_Daily_Order_Monitoring | Screen | Daily Order Monitoring | 0.3 / 13-Nov-26 | 62 | 27 | 5 | 232 | `daily-monitoring-rules.md` | DM-01..DM-11, COM-02 (roles) |
| U02 | UISS_Report_Download_Daily_Order_Monitoring | Report | Download Daily Order Monitoring | 0.2 / 13-Nov-26 | 28 | - | 6 | 58 | `daily-monitoring-rules.md` | DM-04 |
| U03 | UISS_Report_Delivery_Note | Report | Delivery Note (Surat Jalan) | 0.2 / 13-Nov-26 | 22 | - | 16 | 84 | `delivery-note-spec.md`, `tc-pbr/TC-PBR_Delivery_Note.md` | DM-12, DM-13, DM-14 |
| U04 | UISS_Screen_DTP_Creation | Screen | DTP Creation (Planning Order) | 0.7 / 13-Nov-26 | 127 | 56 | 4 | 117 | `dtp-creation-rules.md` | DTP-01..DTP-13 |
| U05 | UISS_Batch_DTP_Excel_Upload | Batch | DTP Creation - Excel Upload | 0.3 / 13-Nov-26 | - | - | 18 | 59 | `dtp-creation-rules.md` | DTP-03 |
| U06 | UISS_Batch_DTP_Queue_Processing | Batch | DTP Creation - Queue Processing | 0.2 / 13-Nov-26 | - | - | 10 | 42 | `dtp-creation-rules.md` | DTP-09, DTP-10 |
| U07 | UISS_Batch_DTP_Switching | Batch | DTP Switching (Rollback) | 0.3 / 13-Nov-26 | - | - | 12 | 31 | `dtp-switching-spec.md` | DTP-11 |
| U08 | UISS_Batch_Driver_Order_Sync | Batch | Driver Order Sync - HiveMQ | 0.2 / 13-Nov-26 | - | - | 17 | 84 | `truck-assignment-spec.md` | DTP-16 (no code) |
| U09 | UISS_Screen_Planning_Truck_Assignment | Screen | Planning Truck Assignment | 0.2 / 13-Nov-26 | 39 | 30 | 3 | 68 | `truck-assignment-spec.md` | TA-01..TA-05, DM-09 |
| U10 | UISS_Screen_SA_Approval | Screen | TC-PBR SA Approval | 0.3 / 13-Nov-26 | 49 | 13 | 5 | 57 | `sa-approval-spec.md` | SA-01..SA-03 |
| U11 | UISS_Screen_SA_Monitoring | Screen | TC-PBR SA Monitoring | 0.4 / 13-Nov-26 | 52 | 8 | 5 | 36 | `sa-monitoring-spec.md` | SA-04..SA-07, INT-04 |
| U12 | UISS_Screen_Master_Trucking_Company | Screen | Master Trucking Company | 0.3 / 13-Nov-26 | 44 | 24 | 6 | 122 | `master-trucking-company-rules.md` | MTC-01..03 |
| U13 | UISS_Screen_Master_Location | Screen | Master Location | 0.1 / 29-Oct-26 | 43 | 18 | 6 | 115 | `master-location-rules.md` | MLC-01..03 |
| U14 | UISS_Screen_Master_Mileage | Screen | Master Mileage (Route Mileage) | 0.5 / 13-Nov-26 | 40 | 21 | 4 | 91 | `master-mileage-rules.md` | MML-01..04 |
| U15 | UISS_Batch_Master_Mileage_Upload | Batch | Master Mileage - Route Mileage Upload | 0.3 / 13-Nov-26 | - | - | 12 | 65 | `master-mileage-rules.md` §3a | MML-03 |
| U16 | UISS_Screen_Master_Price | Screen | Master Price (Pricing Data) | 0.1 / 30-Oct-26 | 30 | 9 | 3 | 62 | `master-price-rules.md` | MPR-01 |
| U17 | UISS_Screen_Master_Priority | Screen | Master Priority | 0.1 / 30-Oct-26 | 28 | 15 | 4 | 101 | `master-priority-rules.md` | MPY-01..02 |
| U18 | UISS_Screen_Master_KPI | Screen | Master KPI | 0.3 / 13-Nov-26 | 38 | 22 | 4 | 118 | `master-kpi-rules.md` | MKP-01..02 |
| U19 | UISS_Screen_Master_Route_Percentage | Screen | Master Route Percentage | 0.1 / 30-Oct-26 | 28 | 16 | 5 | 97 | `master-route-percentage-rules.md` | MRP-01..02 |
| U20 | UISS_Screen_Master_Renban | Screen | Master Renban | 0.1 / 01-Nov-26 | 30 | 18 | 5 | 102 | `master-renban-rules.md` | MRB-01..02 |
| U21 | UISS_Screen_PR_Creation | Screen | PR Creation | 0.2 / 13-Nov-26 | 39 | 25 | 5 | 107 | `pr-creation-rules.md` | PRC-01..02 |
| U22 | UISS_Screen_PR_Inquiry | Screen | PR Inquiry | 0.2 / 13-Nov-26 | 37 | 3 | 1 | 60 | `monthly-pr-po-rules.md` | PRI-01 |
| U23 | UISS_Screen_PR_Approval | Screen | PR Approval | 0.2 / 13-Nov-26 | 50 | 10 | 3 | 129 | `monthly-pr-po-rules.md` | PRA-01..02 |
| U24 | UISS_Screen_PO_Approval | Screen | PO Approval | 0.2 / 13-Nov-26 | 52 | 12 | 4 | 126 | `monthly-pr-po-rules.md` | POA-01 |
| U25 | UISS_Screen_PO_Inquiry | Screen | PO Inquiry | 0.2 / 13-Nov-26 | 38 | 3 | 1 | 60 | `monthly-pr-po-rules.md` | POI-01 |
| U26 | UISS_Batch_ELIPS_PAS_PR_Interface | Batch | ELIPS TC-PBR to PAS PR Interface (Talend) | 0.1 / 05-Nov-26 | - | - | 20 | 43 | `pas-interface/elips-pas-pr-interface-spec.md` | INT-01 (no code) |
| U27 | UISS_Batch_PAS_ELIPS_PR_PO_Callback | Batch | PAS to ELIPS Callback PR / PO No. (Talend) | 0.1 / 06-Nov-26 | - | - | 20 | 41 | `pas-interface/pas-elips-callback-spec.md` | INT-02 (no code) |
| U28 | UISS_Batch_ELIPS_PAS_GR_Attachment | Batch | Surat Jalan PDF to PAS FTP for Auto GR (Talend) | 0.1 / 06-Nov-26 | - | - | 24 | 34 | `pas-interface/elips-pas-gr-attachment-spec.md` | INT-03, DM-14 |

Totals: 28 UISS (18 Screen, 2 Report, 8 Batch), 2,341 "TBD" occurrences.

## State of the database sections in every UISS (all 28)

All UISS were written **before** the ELIPS schema was available. Their database specification therefore uses either
logical names with `(TBD)` or **proposed physical names**. Checked against `docs/db/ELIPS_Schema.sql`:

| Table named in a UISS | In ELIPS schema? | Used by |
|---|---|---|
| `TB_M_SYSTEM` | Yes (`ielp.TB_M_SYSTEM`) | DTP Creation, DTP Queue, PAS PR Interface |
| `TB_R_LOG_H` | Yes (`dbo.TB_R_LOG_H`) | PAS PR Interface |
| `TB_R_DTP_RECORD`, `TB_H_DTP_RECORD_STS`, `TB_R_DAILY_ORDER`, `TB_R_ORDER_TRUCK_ASSIGN`, `TB_H_ORDER_ASSIGN`, `TB_R_DTP_SWITCH_REQ`, `TB_H_DTP_SWITCH`, `TB_T_DTP_UPLOAD`, `TB_R_DTP_UPLOAD_LOG` | **No** - ELIPS uses `DTP_HEADER`, `DTP_1..4_DETAIL`, `ORDER_CYCLE`, `ORDER_TRUCK_H`, `ORDER_CYCLE_ROLLBACK_H`, `ORDER_CYCLE_MAINTENANCE_H`, `DTP_1_DETAIL_TMP` / `DTP_4_DETAIL_TMP` | DTP Creation, DTP Upload / Queue / Switching, Truck Assignment, SA, Driver Sync |
| `TB_R_SA_HEADER`, `TB_R_SA_DETAIL`, `TB_H_SA`, `TB_R_SA_APPROVAL_REQUEST`, `TB_M_SA_SEQUENCE`, `TB_R_SA_PAS_OUTBOX`, `TB_H_SA_INTERFACE` | **No** - ELIPS uses `SA_HEADER`, `SA_DETAIL`, `SA_WBS_PERCENTAGE`, `LOG_ITGPAS` | SA Approval, SA Monitoring |
| `TB_M_KPI` | **No** - ELIPS uses `MS_KPI`, `MS_KPI_PERCENTAGE` | DTP Creation |
| `TB_T_MILEAGE_UPLOAD`, `TB_R_MILEAGE_UPLOAD_LOG`, `TB_H_MILEAGE` | **No** (proposed); master is `TB_M_MILEAGE` | Master Mileage Upload |
| `TB_T_DRIVER_SYNC_QUEUE`, `TB_R_DRIVER_ORDER`, `TB_R_DRIVER_MQ_OUTBOX`, `TB_R_DRIVER_SYNC_LOG` | **No** (proposed) | Driver Order Sync, DTP Switching |
| `TB_R_PR_H`, `TB_R_PR_ITEM`, `TB_R_PR_SUBITEM`, `TB_R_PO_H`, `TB_R_GR_IR`, `TB_T_PR_*`, `TB_T_JOB_AUTOPO`, `TB_M_DOC_NUMBERING`, `TB_H_DOCUMENT_NUMBER`, `TB_M_PROCUREMENT_TYPE`, `TB_M_VALUATION_CLASS` | Not in ELIPS - these are **PAS** tables (from the existing tJava code); cannot be verified with this schema | PAS PR Interface, PAS Callback, GR Attachment |
| Logical names `Trucking Company Master (TBD)`, `Location Master (TBD)`, `Route Mileage Master (TBD)`, `Price Master (TBD)`, `Renban Master (TBD)`, `Route Percentage Master (TBD)`, `KPI Master (TBD)`, `Route Priority Master (TBD)`, `Driver Master (TBD)`, `Truck Master (TBD)` ... | ELIPS candidates exist for most (see `05-database-candidate-mapping.md`); none for Route Priority | all master screens, Daily Monitoring, PR / PO |

Conclusion: **no UISS has a database specification that is confirmed by the schema**. The functional parts (items,
operation, messages) were written from the mock-up code and are traceable to it; the database parts must be revised
in Phase 6 / 8.
