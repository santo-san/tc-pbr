# 05 - Database Candidate Mapping (preliminary, before sample data)

Purpose: prepare Phase 4 / 5. For every function the ELIPS tables that **probably** hold its data are listed. The
table and column definitions are **[Schema]** (see `docs/db/schema-dictionary.md`); the *link* between a function and
a table is **[Inferred]** from names / structure only and must be confirmed with sample data and the team before any
UISS database section is revised.

Database: `AE070_ILS_DB`, schemas `ielp` (190 tables) and `dbo` (11 tables). 124 tables have a primary key, only
6 foreign keys exist (`TB_M_FUNCTION -> TB_M_MODULE`, `TB_R_LOG_D -> TB_R_LOG_H`, `TB_R_LOG_H -> TB_M_FUNCTION / TB_M_MODULE`,
`DTP_1_DETAIL_TMP.COMPANY_ID -> MS_TRUCKING_COMPANY`, `TB_R_INV_ADMIN_VIN_D -> TB_R_INV_ADMIN_H`). No views,
procedures or triggers are in the script.

| Function IDs | Function | Candidate ELIPS tables [Inferred link] | Key columns [Schema] | Open points for confirmation |
|---|---|---|---|---|
| MTC-01..03 | Master Trucking Company | `ielp.MS_TRUCKING_COMPANY`; `MS_TRUCKING_COMPANY_TMP` (upload temp); `MS_TRUCKING_COMPANY_CY` (company - CY location) | PK `COMPANY_ID` vc(10); `COMPANY_CODE`, `SAP_COMPANY_CODE`, `COMPANY_NAME`, `NPWP` NN; `IS_DELETE` def 0; `APP_ID` def 'ENVITRUCK' | Sample data: code length, `BUSINESS_TYPE` values, `APP_ID` values; CY link not in mock-up |
| MLC-01..03 | Master Location | `ielp.MS_LOCATION` | PK `LOCATION_ID` vc(10); `LOCATION_ALIAS`, lat / long as vc(100); `RADIUS` vc(5) def '50'; `AUTO_FINISH`, `AUTO_CYCLE`, `CYCLE_LOC_TO`, `LOCATION_AREA`, `LOCATION_SUB` | Values of `LOCATION_AREA` / `LOCATION_SUB` (sub area source?); `IS_DELETE` values |
| MML-01..04 | Master Mileage | `ielp.TB_M_MILEAGE` | PK (`LOC_NAME_FROM`, `FROM_CODE`); `TO_CODE` nullable; `MILEAGE` decimal(18,0); `IS_DELETE` vc(5) | Is this table used by TC-PBR? key / decimals conflict (04 Q3) |
| MPR-01 | Master Price | `ielp.MS_ROUTE_PRICE`, `ielp.ITG_ECAT`, `ielp.ITG_LOG` | PK (`ROUTE_HEADER_ID`, `ROUTE_PRICE_ID`); `ROUTE_PRICE_VALUE` float; `VALID_DT_FROM/TO`; `COMPANY_CODE`; ITG_ECAT `PRICE_AMOUNT` real, `VENDOR_CD`, `MAT_NO` | Component FIX / KM mapping; which table the screen reads |
| MPY-01..02 | Master Priority | none found | - | **TBD - Not confirmed from existing schema/data/code** |
| MKP-01..02 | Master KPI | `ielp.MS_KPI`, `ielp.MS_KPI_PERCENTAGE`, `ielp.CRITERIA_LAST_ORDER`, `ielp.CRITERIA_SCORE_DETAIL` | MS_KPI `KPI_ID`, `KPI_NAME` vc(50), `WEIGHT`, `ORDER_SEQ`; CRITERIA_LAST_ORDER `ORDER_SHARING` float per `COMPANY_ID`, `ROUTE`, `CRITERIA_PERIODE` | Payment type / daily trip storage (04 Q5) |
| MRP-01..02 | Master Route Percentage | `ielp.MS_ROUTE_HEADER`, `MS_ROUTE_DETAIL`, `MS_ROUTE`, `MS_ROUTE_PERCENTAGE_HIST` | `ROUTE_PERCENTAGE_VALUE` float; `ROUTE_CODE`; HIST `ROUTE_PERIOD` vc(6), `DISTANCE` int | Stop sequence; HIST vs HEADER role |
| MRB-01..02 | Master Renban | `ielp.MS_RENBAN_TCPBR` (and legacy `MS_RENBAN`) | PK (`PLANT_CD`, `DEST_CD`, `RENBAN_CD`); `SOURCE_LOCATION_ID` NN; `VERSION` def 1 | Legacy `MS_RENBAN` still used? |
| DTP-01..13 | Planning Order / DTP | `ielp.DTP_HEADER`, `DTP_1_DETAIL` .. `DTP_4_DETAIL`, `DTP_1_DETAIL_TMP`, `DTP_4_DETAIL_TMP`, `DTP_FILES`, `ielp.MS_STATUS` | DTP_HEADER PK `DTP_HEADER_ID` vc(10), `DTP_DATE`, `DTP_TYPE` vc(1), `DTP_STATUS` vc(100) NN; details `DTP_DET_ID`, `ORDER_NO`, `COMPANY_ID`, `LICENSE_PLATE`, `DRIVER_ID`, `FROM_LOC`, `TO_LOC`, `CONTAINER_NO` vc(11), `CTR_SIZE`, `RENBAN`, `SHIFT`, `IS_DG`, `IS_SA`, `STATUS_CODE` vc(3), `IS_DELETE` | Meaning of DTP 1-4 (types) and their columns; status values (`MS_STATUS`); payment type (04 Q10) |
| DTP-10, DM-01..11 | Daily order / cycles | `ielp.ORDER_CYCLE`, `ORDER_CTR_H`, `ORDER_TRUCK_H`, `ORDER_FILES`, `ORDER_REMARK`, `LOG_ACTIVITY_ORDER`, `LOG_CANCEL_FINISH_ORDER` | ORDER_CYCLE PK `ORDER_CYCLE_ID`; `ORDER_NO`, `DTP_HEADER_ID`, `DTP_DET_ID`, `CYCLE_SEQ` vc(2), `STATUS_CODE`, `START_DATE`, `PICKUP_DATE`, `COMPLETE_DATE`, `*_BY_LP`, lat / long, `SA_CODE` vc(16) | Status codes; cycle numbering; how LP accept / reject is stored |
| DTP-11 | DTP Switching | `ielp.ORDER_CYCLE_ROLLBACK_H` | `ROLLBACK_ID`, `ORDER_CYCLE_ID`, `CURR_STATUS_CODE`, `ROLLBACK_BY / DATE / REMARKS` | Confirm "switching" = rollback |
| DTP-12 | DTP Maintenance | `ielp.ORDER_CYCLE_MAINTENANCE_H`, `LOG_CANCEL_FINISH_ORDER` | `MAINTENANCE_BY / DATE / REMARKS / TYPE` + full cycle snapshot | Maintenance types |
| TA-01..05, DM-07..09 | Truck assignment | `DTP_n_DETAIL.LICENSE_PLATE / DRIVER_ID`, `ORDER_CYCLE.LICENSE_PLATE`, `ORDER_TRUCK_H`, `ielp.MS_TRUCK_REGISTRATION`, `ielp.MS_DRIVER` (also `MS_TRUCK`, `TB_M_DRIVER`) | MS_TRUCK_REGISTRATION PK (`TRUCK_ID`, `COMPANY_ID`), `LICENSE_PLATE`, `TRUCK_TYPE`, `STNK_EXPIRED`; MS_DRIVER `DRIVER_LICENSE_EXPIRED`, `COMPANY_ID` | Which truck / driver master is current; maintenance status source |
| SA-01..03 | SA Approval | `ielp.SA_HEADER`, `SA_DETAIL`, `SA_ROUTE_PRICE_TMP`; flags `DTP_n_DETAIL.IS_SA`, `ORDER_CYCLE.SA_CODE` | SA_HEADER `SA_HEADER_ID`, `SA_PERIODE` date, `STATUS_CODE` vc(1), `SA_TYPE` vc(1), `PO_NUMBER`; SA_DETAIL `SA_CODE` vc(16), `TOTAL_TRIP`, `PRICE`, `TOTAL_PRICE` (vc), `APPROVED_BY / DATE` | SA_TYPE values (daily / monthly), SA number format |
| SA-04..07, INT-04 | SA Monitoring / PAS | `SA_DETAIL.PAS_* / VISION_*`, `ielp.SA_WBS_PERCENTAGE`, `ielp.MS_WBS`, `ielp.LOG_ITGPAS` | `PAS_STATUS`, `PAS_PR_NUMBER`, `PAS_PO_NUMBER`, `LOG_ITG_SEND_ID`; WBS `WBS_PERCENTAGE`, `WBS_COST` | VISION vs PAS meaning; status values |
| DM-12..14, INT-03 | Delivery Note / GR attachment | `ORDER_CYCLE`, `MS_DRIVER`, `MS_LOCATION`, `SA_DETAIL`, `ORDER_FILES` | `ORDER_FILES.FILE_TYPE`, `FILE_PATH`, `FILE_NEW_NAME` | Where the attachment record lives |
| PRC, PRI, PRA | PR Creation / Inquiry / Approval | `ielp.CRITERIA_SCORE_HEADER`, `CRITERIA_SCORE_DETAIL_FINAL`, `CRITERIA_SCORE_DETAIL_ROUTE`, `CRITERIA_SCORE_DETAIL`, `CRITERIA_VOLUME_DETAIL`, `CRITERIA_SCORE_APPROVAL`; by-resource: `TB_R_PR_DAILY`, `TB_R_PR_DAILY_DETAIL`, `TB_R_PR_SUMMARY`, `TB_R_PLAN_BY_RESOURCE_*` | HEADER `CRITERIA_PERIODE` vc(7), `PR_NO` vc(11), `PR_SEQ` def 1, `APPROVAL_STS` vc(2), `PERIODE_FR / TO`; FINAL `TOTAL_TRIP`, `TOTAL_ORDER_SHARING`, `TOTAL_PRICE`, `PR_NO_DET`; APPROVAL `APPROVAL_CLASS` | Approval status codes, levels (`APPROVAL_CLASS`), fixed-cost vs route-based PR |
| POA, POI | PO Approval / Inquiry | `ielp.PO_HEADER`, `PO_DETAIL`, `PO_APPROVAL`, `PO_APPROVAL_EST` | PO_DETAIL `PO_NUMBER` vc(16), `COMPANY_ID`, `ROUTE`, `PO_TYPE` vc(1); `PO_APPROVAL_EST.APPROVAL_LIMIT` (auto-approve deadline?) | Status codes; PO number source (PAS) |
| COM-01, COM-02 | Menu / authorization | `MASTER_APP`, `MASTER_MENU`, `MASTER_MENU_LANG`, `USERID`, `USERID_CLASS`, `USERID_DETAIL`, `USERID_MENU_OPTION`, `USERID_APP` | `USERID_CLASS` per `APP_NAME` + `SITE_ID`; menu per class | Class names for IELP Admin, Planner VPLD, LP Admin, Supplier, Driver |
| COM-05 | Messages / logs | `dbo.TB_M_MESSAGE`, `dbo.TB_R_LOG_H`, `dbo.TB_R_LOG_D`, `LOG_ACTIVITY_MASTER`, `LOG_ACTIVITY_ORDER` | log header / detail with `PROCESS_ID`, `FUNCTION_ID` FK | Function IDs per TC-PBR screen (`dbo.TB_M_FUNCTION`) |

## ELIPS tables with no matching TC-PBR mock-up function (for the record, not removed)

`MS_DRIVER` / `MS_TRUCK_REGISTRATION` / `MS_TRUCK` maintenance screens, `MS_TRUCKING_COMPANY_CY`, `MS_WBS` maintenance,
`MS_QR`, `MS_BLAST_SERVICE`, `TB_R_NOTIFICATION`, the Milk Run tables (`TB_R_MR_*`), shipping / SD / invoice tables
(`TB_R_SD_*`, `TB_R_INVOICE_*`, `TB_R_SHIPPING_*`) and vehicle / PDI tables belong to other ELIPS modules or to
functions that the TC-PBR mock-up does not show. They are out of the current UISS scope unless you say otherwise.

## Sample data needed for Phase 3-5

To confirm the links above without guessing, please provide (anonymised is fine) a few rows of:

1. `MS_STATUS`, `MS_SYSCODE`, `TB_M_SYSTEM` (status codes, code types, system parameters) - **most important**
2. `MS_TRUCKING_COMPANY`, `MS_LOCATION`, `TB_M_MILEAGE`, `MS_ROUTE_PRICE`, `MS_ROUTE_HEADER` / `MS_ROUTE_DETAIL`, `MS_ROUTE_PERCENTAGE_HIST`, `MS_KPI`, `MS_KPI_PERCENTAGE`, `MS_RENBAN_TCPBR`
3. `DTP_HEADER` with matching rows of `DTP_1..4_DETAIL`, `ORDER_CYCLE`, `ORDER_TRUCK_H`, `ORDER_CYCLE_ROLLBACK_H`, `ORDER_CYCLE_MAINTENANCE_H`
4. `SA_HEADER`, `SA_DETAIL`, `SA_WBS_PERCENTAGE`, `LOG_ITGPAS`
5. `CRITERIA_SCORE_HEADER`, `CRITERIA_SCORE_DETAIL_FINAL`, `CRITERIA_SCORE_DETAIL_ROUTE`, `CRITERIA_SCORE_APPROVAL`, `PO_HEADER`, `PO_DETAIL`, `PO_APPROVAL`, `PO_APPROVAL_EST`
6. `USERID_CLASS`, `USERID_MENU_OPTION`, `MASTER_MENU` (APP_NAME of TC-PBR), `dbo.TB_M_MESSAGE`, `dbo.TB_M_FUNCTION`
