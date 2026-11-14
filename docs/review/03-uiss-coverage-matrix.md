# 03 - UISS Coverage Matrix

> **Status after Phase 6-8 (14-Nov-26):** all 60 "Potentially Incorrect" UISS were revised to the ELIPS schema (rev [DB-R1]); the 4 "Missing" are covered by
> UISS_Screen_TCPBR_Menu_Authorization (COM-01/02), UISS_Batch_SA_PAS_Interface (INT-04), UISS_Batch_IPMS_DTP_Interface (INT-05); the "Incomplete" DM-05 / SA-07 got sections in their UISS.
> Remaining open items are Conflicts (`07`) and TBD (`10`). The table below is the Phase 2 baseline.

Compares every function of `01-function-inventory.md` with the UISS of `02-uiss-inventory.md`.

**Implementation Status**: *Implemented* = working in the mock-up code · *Simulated* = the screen simulates an external
system · *External* = runs outside this repository (Talend / HiveMQ / ELIPS), no code here · *Demo* = demo helper only.

**UISS Status** (one of the six classes requested):
- **Complete** - UISS Available and Complete
- **Incomplete** - UISS Available but Incomplete
- **Potentially Incorrect** - UISS Available but Potentially Incorrect
- **Missing** - UISS Missing
- **Not Documented** - Function Exists in Code but Not Documented
- **No Code** - UISS Exists but Function Cannot Be Found in Code

Because no UISS has a database part confirmed by the ELIPS schema (see `02`), a UISS whose functional part matches the
code is still classified **Potentially Incorrect** when it specifies tables / columns / lengths that the schema
contradicts or does not contain. "Functional" below = items, buttons, modes, operation, messages vs. the code.

| Function ID | Function | Implementation Status | UISS Status | Gap | Required Action |
|-------------|----------|-----------------------|-------------|-----|-----------------|
| COM-01 | Side menu navigation | Implemented | Missing | Menu tree and menu IDs only appear as breadcrumbs per UISS; ELIPS has `MASTER_MENU`, `USERID_MENU_OPTION` | Add a common UISS section (or UISS-Screen "TC-PBR Menu & Authorization") with menu IDs and role access from `MASTER_MENU` / `USERID_MENU_OPTION` after sample data |
| COM-02 | Role selection / authorization | Simulated | Missing | Roles are described per screen; no specification of login / user class; ELIPS has `USERID`, `USERID_CLASS`, `USERID_DETAIL` | Same common UISS: role -> `USERID_CLASS` mapping (TBD until sample data); mark "Login sebagai" as mock-up only |
| COM-03 | Table View | Implemented | Complete | - | Keep |
| COM-04 | Pagination / rows per page | Implemented | Complete | - | Keep |
| COM-05 | Toast / dialog / busy | Implemented | Potentially Incorrect | Message IDs are `TBD` in every UISS; ELIPS has `dbo.TB_M_MESSAGE` | Map MSG ID to `TB_M_MESSAGE` after sample data |
| DM-01 | Daily Order Monitoring list | Implemented | Potentially Incorrect | Functional OK; data source is logical `(TBD)`; ELIPS candidates `ORDER_CYCLE` + `DTP_n_DETAIL` + `MS_STATUS` | Revise Item Desc / Data Map to ELIPS columns |
| DM-02 | Search / filter (DTP 1-4 tabs, dates, From / To) | Implemented | Potentially Incorrect | DTP type 1-4 matches ELIPS `DTP_1..4_DETAIL` / `DTP_HEADER.DTP_TYPE`; filter columns TBD | Revise source columns |
| DM-03 | Sort / Table View / Paging | Implemented | Complete | - | Keep |
| DM-04 | Export to Excel | Implemented | Potentially Incorrect | Report items use logical sources | Revise Report Item Desc sources |
| DM-05 | Print / PDF | Implemented | Incomplete | Button exists (`index.html`), behaviour not specified | Add button + operation to U01 |
| DM-06 | Order detail | Implemented | Potentially Incorrect | History / files / remarks: ELIPS has `ORDER_TRUCK_H`, `ORDER_CTR_H`, `ORDER_FILES`, `ORDER_REMARK`, `LOG_ACTIVITY_ORDER` not referenced | Revise detail sections to these tables |
| DM-07 | Assign Truck (IELP Admin) | Implemented | Potentially Incorrect | Truck availability rules (license expired, maintenance) vs ELIPS `MS_TRUCK_REGISTRATION.STNK_EXPIRED`, `MS_DRIVER.DRIVER_LICENSE_EXPIRED`; "Maintenance" has no column | Revise; mark Maintenance as TBD |
| DM-08 | Order Release (LP Admin) | Implemented | Potentially Incorrect | Reason storage not in schema except `ORDER_REMARK` / `LOG_ACTIVITY_ORDER` | Revise / TBD |
| DM-09 | Accept / Reject / Change truck (LP) | Implemented | Potentially Incorrect | Truck change history -> `ORDER_TRUCK_H` (candidate); reject reason TBD | Revise |
| DM-10 | Driver cycle actions | Implemented | Potentially Incorrect | ELIPS `ORDER_CYCLE` has START_DATE, PICKUP_DATE, COMPLETE_DATE, START/PICKUP/FINISH_BY_LP, lat/long, geofence flags, CONTAINER_NO vc(11); UISS uses TBD names | Revise to `ORDER_CYCLE` columns |
| DM-11 | SA Approval / Proses ke SA / PAS (simulated) | Simulated | Potentially Incorrect | `ORDER_CYCLE.SA_CODE`, `SA_DETAIL.PAS_*` exist; UISS uses TBD | Revise |
| DM-12 | Delivery Note View / Download | Implemented | Potentially Incorrect | Report items `(TBD)`; candidates `ORDER_CYCLE`, `MS_DRIVER`, `MS_LOCATION`, `SA_DETAIL.SA_CODE` | Revise Report Item Desc |
| DM-13 | Delivery Note API (Base64) | Simulated | Potentially Incorrect | API endpoint / auth TBD; ELIPS has `PRM_API_CLIENTS`, `PRM_API_RESMSG` (API clients / response messages) | Check sample data of PRM_API_* ; revise |
| DM-14 | Attach Delivery Note to PAS GR | Simulated | Potentially Incorrect | No attachment-record table in ELIPS; PAS tables not in schema | Keep as TBD; document `ORDER_FILES` candidate |
| DM-15 | Create DTP (legacy dialog) | Implemented | Not Documented | Old dialog in Daily Monitoring (`app.js:558`) superseded by Planning Order | **Decision**: remove from mock-up or document; listed as potential inconsistency |
| DTP-01 | DTP calendar | Implemented | Potentially Incorrect | Counts per date: ELIPS `DTP_HEADER.DTP_DATE`, `DTP_TOTAL_ORDER` | Revise |
| DTP-02 | Create DTP (Planner) | Implemented | Potentially Incorrect | UISS uses `TB_R_DTP_RECORD`; ELIPS has `DTP_HEADER` (DTP_DESC NN, DTP_STATUS NN, DTP_TYPE vc1) | Revise to DTP_HEADER |
| DTP-03 | Excel upload | Implemented | Potentially Incorrect | UISS uses `TB_T_DTP_UPLOAD`, `TB_R_DTP_UPLOAD_LOG`; ELIPS has `DTP_1_DETAIL_TMP`, `DTP_4_DETAIL_TMP`, `DTP_FILES` | Revise U04 + U05 |
| DTP-04 | Manual entry | Implemented | Potentially Incorrect | Field lengths vs `DTP_n_DETAIL` (e.g. CONTAINER_NO vc11, RENBAN vc500, VESSEL vc500, SHIFT vc100, IS_DG, CTR_TYPE) | Revise Item Desc |
| DTP-05 | Load from IPMS | Simulated | Incomplete | No interface UISS; source table unknown | See INT-05 |
| DTP-06 | Grid, delete, restore | Implemented | Potentially Incorrect | Delete -> `IS_DELETE` ('0' default) in ELIPS; UISS uses own status table | Revise |
| DTP-07 | Payment Type per DTP | Implemented | Potentially Incorrect | **No column** for payment type in `DTP_HEADER` / `DTP_n_DETAIL` | TBD - Not confirmed from existing schema/data/code; flag as new column request |
| DTP-08 | KPI monitor | Implemented | Potentially Incorrect | Uses Master KPI order sharing / daily trip: no ELIPS columns for daily trip / payment type | TBD |
| DTP-09 | Submit DTP | Implemented | Potentially Incorrect | `DTP_HEADER.DTP_STATUS` vc100 / `STATUS_CODE` vc3 values need `MS_STATUS` data | Revise after sample data |
| DTP-10 | Queue processing | Implemented | Potentially Incorrect | UISS creates `TB_R_DAILY_ORDER`; ELIPS order = `ORDER_CYCLE` (ORDER_NO, CYCLE_SEQ) | Revise U06 |
| DTP-11 | DTP Switching | Implemented | Potentially Incorrect | ELIPS has `ORDER_CYCLE_ROLLBACK_H`; UISS uses `TB_R_DTP_SWITCH_REQ`, `TB_H_DTP_SWITCH` | Revise U07 |
| DTP-12 | DTP Maintenance | Implemented | Potentially Incorrect | ELIPS has `ORDER_CYCLE_MAINTENANCE_H`, `LOG_CANCEL_FINISH_ORDER` | Revise U04 (maintenance part) |
| DTP-13 | Open in Daily Monitoring | Implemented | Complete | - | Keep |
| DTP-14 | Driver start simulation | Demo | Not Documented | Demo helper | No UISS needed; note as mock-up only |
| DTP-15 | Demo reset | Demo | Not Documented | Demo helper | No UISS needed |
| DTP-16 | Driver order sync (HiveMQ) | External | No Code | Specified only; proposed tables not in ELIPS | Keep UISS as "to-be" or confirm existing ELIPS driver sync; mark TBD |
| TA-01 | Truck Assignment calendar | Implemented | Potentially Incorrect | UISS uses `TB_R_DAILY_ORDER` | Revise U09 |
| TA-02 | Order list | Implemented | Potentially Incorrect | Same | Revise |
| TA-03 | Accept / Reject | Implemented | Potentially Incorrect | Accept / reject flag not in schema | TBD |
| TA-04 | Assign / Change truck | Implemented | Potentially Incorrect | `TB_R_ORDER_TRUCK_ASSIGN` vs ELIPS `DTP_n_DETAIL.LICENSE_PLATE`, `ORDER_CYCLE.LICENSE_PLATE`, `ORDER_TRUCK_H`, `MS_TRUCK_REGISTRATION` | Revise |
| TA-05 | Detail / Driver app view | Implemented | Incomplete | Driver app view not specified | Add note / TBD |
| SA-01 | Daily SA list | Implemented | Potentially Incorrect | UISS `TB_R_SA_*`; ELIPS `SA_HEADER`, `SA_DETAIL`, `SA_ROUTE_PRICE_TMP`, `DTP_n_DETAIL.IS_SA` | Revise U10 |
| SA-02 | Approve daily SA | Implemented | Potentially Incorrect | SA number: `SA_DETAIL.SA_CODE` vc(16), `ORDER_CYCLE.SA_CODE`; UISS `TB_M_SA_SEQUENCE` not in ELIPS | Revise |
| SA-03 | Monthly Truck (Fixed Cost) SA | Implemented | Potentially Incorrect | `SA_HEADER.SA_TYPE` / `SA_DETAIL.SA_TYPE` vc1 exist; values TBD | Revise after sample data |
| SA-04 | SA list / WBS group | Implemented | Potentially Incorrect | ELIPS `SA_WBS_PERCENTAGE`, `MS_WBS`; UISS "WBS Consumption Master (TBD)" | Revise U11 |
| SA-05 | SA detail + log | Implemented | Potentially Incorrect | ELIPS `LOG_ITGPAS`, `SA_DETAIL.LOG_ITG_SEND_ID / LOG_ITG_CALLBACK_ID` | Revise |
| SA-06 | Send to PAS / retry | Simulated | Potentially Incorrect | ELIPS `SA_DETAIL.IS_PAS, PAS_STATUS, PAS_CREATED_DATE, IS_PAS_CALLBACK, PAS_PR_NUMBER, PAS_PO_NUMBER`; UISS `TB_R_SA_PAS_OUTBOX` | Revise |
| SA-07 | SA Monitoring Export Excel | Implemented | Incomplete | Button only; no report spec | Add report spec (section in U11 or new UISS-Report) |
| MTC-01 | Trucking Company list / export | Implemented | Potentially Incorrect | Logical `(TBD)` table | Revise U12 to `MS_TRUCKING_COMPANY` |
| MTC-02 | Add / Update vendor | Implemented | Potentially Incorrect | Lengths and columns differ from `MS_TRUCKING_COMPANY` (see 04) ; VERSION not in table | Revise; concurrency -> TBD |
| MTC-03 | Delete (logical) | Implemented | Potentially Incorrect | `IS_DELETE` vc1 default 0 vs UISS `DELETION_FLAG` Y/N | Revise |
| MLC-01 | Location list | Implemented | Potentially Incorrect | `MS_LOCATION` columns differ | Revise U13 |
| MLC-02 | Add / Edit with map | Implemented | Potentially Incorrect | Lat / long stored as vc(100) in `MS_LOCATION` (`LOCATION_LATITUDE`, `LOCATION_LANGITUDE`); UISS Number(10,7); radius `RADIUS` vc(5) default '50' | Revise |
| MLC-03 | Remove / Deactivate | Implemented | Potentially Incorrect | ELIPS only `IS_DELETE` vc(100); no separate Active / Inactive status column | Revise / TBD |
| MML-01 | Mileage list | Implemented | Potentially Incorrect | `TB_M_MILEAGE` (FROM_CODE, TO_CODE, LOC_NAME_FROM, LOC_NAME_TO, MILEAGE) | Revise U14 |
| MML-02 | Add / Edit mileage | Implemented | Potentially Incorrect | `MILEAGE` decimal(18,0) (no decimals) vs UISS 2 decimals; PK = LOC_NAME_FROM + FROM_CODE (TO_CODE not in key) | Revise; report as conflict |
| MML-03 | Mileage Excel upload | Implemented | Potentially Incorrect | Proposed temp / log / history tables not in ELIPS | Revise U15 (mark proposed tables as new) |
| MML-04 | Mileage lookup / variable cost | Implemented | Potentially Incorrect | Same table | Revise |
| MPR-01 | Price monitoring | Implemented | Potentially Incorrect | Candidates `MS_ROUTE_PRICE` (VALID_DT_FROM / TO, ROUTE_PRICE_VALUE, COMPANY_CODE) and `ITG_ECAT` (eCatalogue); "component FIX / KM" has no column | Revise U16; component TBD |
| MPY-01 | Priority list | Implemented | Potentially Incorrect | **No ELIPS table** for route priority | TBD - Not confirmed from existing schema/data/code |
| MPY-02 | Priority maintenance | Implemented | Potentially Incorrect | Same | TBD |
| MKP-01 | KPI list / summaries | Implemented | Potentially Incorrect | ELIPS `MS_KPI` (KPI items, WEIGHT, ORDER_SEQ), `MS_KPI_PERCENTAGE` (score ranges), `CRITERIA_LAST_ORDER.ORDER_SHARING`; no payment type / daily trip column | Revise U18; TBD for payment type / daily trip |
| MKP-02 | KPI edit | Implemented | Potentially Incorrect | Same | Same |
| MRP-01 | Route Percentage list | Implemented | Potentially Incorrect | ELIPS `MS_ROUTE_HEADER` (ROUTE_PERCENTAGE_VALUE float), `MS_ROUTE_DETAIL`, `MS_ROUTE`, `MS_ROUTE_PERCENTAGE_HIST` | Revise U19 |
| MRP-02 | Route Percentage maintenance | Implemented | Potentially Incorrect | Stops / legs: no stop-sequence column in `MS_ROUTE_DETAIL` (only ROUTE_CODE, ROUTE_DESCR) | Revise / TBD |
| MRB-01 | Renban list | Implemented | Potentially Incorrect | ELIPS `MS_RENBAN_TCPBR` matches closely (PLANT_CD, DEST_CD vc10, RENBAN_CD vc3, VERSION) | Revise names; mostly confirm |
| MRB-02 | Renban maintenance | Implemented | Potentially Incorrect | Source = `SOURCE_LOCATION_ID` vc(20) (UISS `SOURCE_CD`); no delete flag -> physical delete | Revise |
| PRC-01 | PR calculation | Implemented | Potentially Incorrect | ELIPS `CRITERIA_SCORE_HEADER / _DETAIL_FINAL / _DETAIL_ROUTE / _DETAIL`, `CRITERIA_VOLUME_DETAIL`, `TB_R_PR_DAILY*`, `TB_R_PR_SUMMARY` | Revise U21 after sample data |
| PRC-02 | Create PR | Implemented | Potentially Incorrect | PR no.: `CRITERIA_SCORE_HEADER.PR_NO` vc(11), `PR_SEQ`; `_DETAIL_FINAL.PR_NO_DET` | Revise |
| PRI-01 | PR Inquiry | Implemented | Potentially Incorrect | Same tables | Revise U22 |
| PRA-01 | PR Approval | Implemented | Potentially Incorrect | ELIPS `CRITERIA_SCORE_APPROVAL` (APPROVAL_CLASS, APPROVAL_STS vc2) | Revise U23 |
| PRA-02 | PR auto approve | Implemented | Potentially Incorrect | Deadline source TBD (`PO_APPROVAL_EST.APPROVAL_LIMIT` exists for PO only) | TBD |
| POA-01 | PO Approval | Implemented | Potentially Incorrect | ELIPS `PO_HEADER`, `PO_DETAIL` (PO_NUMBER vc16), `PO_APPROVAL`, `PO_APPROVAL_EST.APPROVAL_LIMIT` | Revise U24 |
| POI-01 | PO Inquiry | Implemented | Potentially Incorrect | Same | Revise U25 |
| INT-01 | PAS PR interface | External | No Code | Based on existing tJava; PAS tables not in ELIPS schema | Keep; verify ELIPS source tables (CRITERIA_* / TB_R_PR_*) |
| INT-02 | PAS callback PR / PO no. | External | No Code | ELIPS target columns: `SA_DETAIL.PAS_PR_NUMBER / PAS_PO_NUMBER` or `PO_DETAIL.PO_NUMBER` (TBD) | Revise U27 target mapping |
| INT-03 | GR attachment | External / Simulated | No Code | Source PDF location TBD (`ORDER_FILES.FILE_PATH`?) | Revise U28 after sample data |
| INT-04 | SA -> PAS | Simulated | Missing | No UISS-Batch; only screen-side spec in U11 | Create UISS-Batch "SA to PAS Interface" (based on `SA_DETAIL.PAS_*`, `LOG_ITGPAS`) |
| INT-05 | IPMS -> DTP | Simulated | Missing | No UISS-Batch; source system / table unknown | Create UISS-Batch after the IPMS source is confirmed (TBD) |

## Summary

| UISS Status | Count | Functions |
|---|---|---|
| Complete | 4 | COM-03, COM-04, DM-03, DTP-13 |
| Incomplete | 4 | DM-05, DTP-05, TA-05, SA-07 |
| Potentially Incorrect | 60 | all functions whose UISS database part is not confirmed by the schema |
| Missing | 4 | COM-01, COM-02, INT-04, INT-05 |
| Not Documented | 3 | DM-15 (legacy Create DTP), DTP-14, DTP-15 (demo only) |
| No Code | 4 | DTP-16, INT-01, INT-02, INT-03 |
| **Total** | **79** | |

Functional coverage (UI / logic vs UISS): 64 of 79 functions are fully specified functionally (Complete + Potentially Incorrect), 4 partly; 100 % traceable coverage requires the
4 missing UISS (or sections) and a decision on DM-15. Database coverage: 0 % confirmed - to be done in Phase 4-8.
