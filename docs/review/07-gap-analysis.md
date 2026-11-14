# 07 - UISS vs Code vs Database Gap Analysis

Every discrepancy found when the UISS were revised against the ELIPS schema (from `db-mapping/*.json`) plus the review findings
of `04` that are not database related. "Existing Data Indicates" is always *No sample data* - no data was provided.
Decision rule: the application was **not** changed. Database facts follow the schema; behaviour follows the code; where both cannot hold, the item stays a Conflict for a decision (DB change request or rule change).

| ID | Module/Screen | UISS Says | Code Says | Database Says | Existing Data Indicates | Recommended Revision |
|---|---|---|---|---|---|---|
| G-DTP-01 | Daily / Planning Order (upload) - Record table | TB_R_DTP_RECORD (one table, all models) | - | DTP_HEADER + DTP_1..4_DETAIL per DTP type | No sample data | Re-base on DTP_HEADER / DTP_n_DETAIL; confirm the DTP type of the Universal DTP |
| G-DTP-02 | Daily / Planning Order (upload) - Order number at creation | ORDER_NO assigned by queue processing | - | DTP_2_DETAIL.ORDER_NO NOT NULL, PK | No sample data | Confirm when ORDER_NO is generated in ELIPS |
| G-DTP-03 | Daily / Planning Order (upload) - Payment type | PAY_TYPE per record (dtp-rules.js setPayType) | - | No column | No sample data | DB change request |
| G-DTP-04 | Daily / Planning Order (upload) - Status values | Text statuses | - | STATUS_CODE varchar(3) + MS_STATUS | No sample data | Map statuses to MS_STATUS codes (data needed) |
| G-DTP-05 | Daily / Planning Order (upload) - Exporter / Importer / Destination / Data source | Fields on the record | - | No matching columns | No sample data | Confirm columns (COUNTRY, SOURCES?) |
| G-DTP-06 | Daily / Planning Order (upload) - Container size | '40 HC' text | - | CTR_SIZE int + CTR_TYPE varchar(10) | No sample data | Split size and type |
| G-DTP-07 | Daily / Planning Order (upload) - Delete | Physical delete | - | IS_DELETE flag | No sample data | Soft delete with IS_DELETE |
| G-DTP-08 | Daily / Planning Order (upload) - Concurrency | VERSION | - | No VERSION column | No sample data | Use UPDATED_DATE |
| G-DTP-01 | Daily / Planning Order (queue) - Record table | TB_R_DTP_RECORD (one table, all models) | - | DTP_HEADER + DTP_1..4_DETAIL per DTP type | No sample data | Re-base on DTP_HEADER / DTP_n_DETAIL; confirm the DTP type of the Universal DTP |
| G-DTP-02 | Daily / Planning Order (queue) - Order number at creation | ORDER_NO assigned by queue processing | - | DTP_2_DETAIL.ORDER_NO NOT NULL, PK | No sample data | Confirm when ORDER_NO is generated in ELIPS |
| G-DTP-03 | Daily / Planning Order (queue) - Payment type | PAY_TYPE per record (dtp-rules.js setPayType) | - | No column | No sample data | DB change request |
| G-DTP-04 | Daily / Planning Order (queue) - Status values | Text statuses | - | STATUS_CODE varchar(3) + MS_STATUS | No sample data | Map statuses to MS_STATUS codes (data needed) |
| G-DTQ-01 | Daily / Planning Order (queue) - Retry counters | ATTEMPT_CNT, FAIL_REASON | - | No columns | No sample data | Keep in LOG_ACTIVITY_ORDER or add columns |
| G-DTP-01 | Daily / Planning Order (switching) - Record table | TB_R_DTP_RECORD (one table, all models) | - | DTP_HEADER + DTP_1..4_DETAIL per DTP type | No sample data | Re-base on DTP_HEADER / DTP_n_DETAIL; confirm the DTP type of the Universal DTP |
| G-DTP-02 | Daily / Planning Order (switching) - Order number at creation | ORDER_NO assigned by queue processing | - | DTP_2_DETAIL.ORDER_NO NOT NULL, PK | No sample data | Confirm when ORDER_NO is generated in ELIPS |
| G-DTS-01 | Daily / Planning Order (switching) - Cancel columns | CANCEL_FLAG / CANCEL_BY proposed | - | ORDER_CYCLE.CANCEL_DATE, CANCEL_REMARKS (no cancel-by) | No sample data | Use existing columns; IS_DELETE for cancelled orders? |
| G-DRV-01 | Daily / Driver APK sync - Sync mechanism | HiveMQ outbox (proposed tables) | - | No sync tables; TB_M_DRIVER has FIREBASE_TOKEN / DEVICE_ID | No sample data | Confirm the existing driver app channel before building |
| G-MML-01 | Master / Mileage (upload) - Mileage decimals | Number 7,2 (max 2 decimals) | master-mileage.js parseMileage | MILEAGE decimal(18,0) - no decimals | No sample data | Round to whole KM in the UI or change the column (DB change request) |
| G-MML-02 | Master / Mileage (upload) - Route key | From + To unique | - | PK = LOC_NAME_FROM + FROM_CODE; TO_CODE nullable, not in key | No sample data | Only one route per From is possible with this PK - confirm the table or change the PK |
| G-MML-03 | Master / Mileage (upload) - Location names stored | Names read from Master Location | - | LOC_NAME_FROM / LOC_NAME_TO NOT NULL in TB_M_MILEAGE (denormalised) | No sample data | Copy names on insert / update; define refresh when a location is renamed |
| G-MML-04 | Master / Mileage (upload) - Active / Inactive and VERSION | STATUS, VERSION | - | Only IS_DELETE varchar(5); no VERSION | No sample data | Map status to IS_DELETE; concurrency by CHANGED_DT |
| G-MML-05 | Master / Mileage (upload) - LAST_UPLOAD_ID | Column on the route master | - | No such column in TB_M_MILEAGE | No sample data | Drop or add the column (DB change request) |
| G-DN-01 | Daily / Order Detail (Surat Jalan) - deliveryId | No Cycle Order YYMMDDC2XXX999 | - | ORDER_CYCLE_ID varchar(20) PK (format unknown) | No sample data | Confirm the cycle order number field |
| G-DTP-01 | Daily / Planning Order - Record table | TB_R_DTP_RECORD (one table, all models) | - | DTP_HEADER + DTP_1..4_DETAIL per DTP type | No sample data | Re-base on DTP_HEADER / DTP_n_DETAIL; confirm the DTP type of the Universal DTP |
| G-DTP-02 | Daily / Planning Order - Order number at creation | ORDER_NO assigned by queue processing | - | DTP_2_DETAIL.ORDER_NO NOT NULL, PK | No sample data | Confirm when ORDER_NO is generated in ELIPS |
| G-DTP-03 | Daily / Planning Order - Payment type | PAY_TYPE per record (dtp-rules.js setPayType) | - | No column | No sample data | DB change request |
| G-DTP-04 | Daily / Planning Order - Status values | Text statuses | - | STATUS_CODE varchar(3) + MS_STATUS | No sample data | Map statuses to MS_STATUS codes (data needed) |
| G-DTP-05 | Daily / Planning Order - Exporter / Importer / Destination / Data source | Fields on the record | - | No matching columns | No sample data | Confirm columns (COUNTRY, SOURCES?) |
| G-DTP-06 | Daily / Planning Order - Container size | '40 HC' text | - | CTR_SIZE int + CTR_TYPE varchar(10) | No sample data | Split size and type |
| G-DTP-07 | Daily / Planning Order - Delete | Physical delete | - | IS_DELETE flag | No sample data | Soft delete with IS_DELETE |
| G-DTP-08 | Daily / Planning Order - Concurrency | VERSION | - | No VERSION column | No sample data | Use UPDATED_DATE |
| G-DM-01 | Daily / Daily Monitoring - Order vs cycle | Daily Order + Daily Order Cycle tables | - | ORDER_CYCLE (one row per cycle) + DTP_n_DETAIL (order) | No sample data | Order-level status = latest cycle / DTP_n_DETAIL.STATUS_CODE (confirm) |
| G-DM-02 | Daily / Daily Monitoring - Status codes | Text statuses (Planning Order, Order Release, ...) | - | STATUS_CODE varchar(3), MS_STATUS | No sample data | Map with MS_STATUS data |
| G-DM-03 | Daily / Daily Monitoring - Status history columns | FROM_STATUS, ROLE, REASON | - | LOG_ACTIVITY_ORDER has ACT, STS_CODE, REMARK only | No sample data | Confirm the history table |
| G-DM-04 | Daily / Daily Monitoring - FA / planned cycle / PO received date | Columns on the order | - | No columns | No sample data | Confirm source |
| G-MKP-01 | Master / KPI - Per-company KPI master | KPI Master per trucking company (score, values, payment type, order sharing, daily trip) | - | Only MS_KPI (items) and period tables CRITERIA_SCORE_DETAIL / CRITERIA_LAST_ORDER | No sample data | New master table or confirm the period tables are the source |
| G-MKP-02 | Master / KPI - Payment type / daily trip | By Resources / By Trip, Daily Trip, Trips per day | - | No columns | No sample data | DB change request |
| G-MKP-03 | Master / KPI - Grade thresholds | Fixed in code (master-kpi.js) | - | MS_KPI_PERCENTAGE (FROM / TO_PERCENTAGE -> VALUE) | No sample data | Read thresholds from MS_KPI_PERCENTAGE |
| G-MLC-01 | Master / Location Code - Coordinates type | Number(10,7) | - | LOCATION_LATITUDE / LOCATION_LANGITUDE varchar(100) NOT NULL | No sample data | Store as text with 7 decimals; validate in the application |
| G-MLC-02 | Master / Location Code - Radius | Number | - | RADIUS varchar(5) default '50' | No sample data | Max 5 characters |
| G-MLC-03 | Master / Location Code - Active / Inactive | STATUS + Deactivate | master-location.js deactivate | Only IS_DELETE varchar(100) | No sample data | Confirm deactivate = IS_DELETE or add a status column |
| G-MLC-04 | Master / Location Code - Concurrency | VERSION | - | No VERSION column | No sample data | Use UPDATED_DATE or add VERSION |
| G-MML-01 | Master / Mileage - Mileage decimals | Number 7,2 (max 2 decimals) | master-mileage.js parseMileage | MILEAGE decimal(18,0) - no decimals | No sample data | Round to whole KM in the UI or change the column (DB change request) |
| G-MML-02 | Master / Mileage - Route key | From + To unique | - | PK = LOC_NAME_FROM + FROM_CODE; TO_CODE nullable, not in key | No sample data | Only one route per From is possible with this PK - confirm the table or change the PK |
| G-MML-03 | Master / Mileage - Location names stored | Names read from Master Location | - | LOC_NAME_FROM / LOC_NAME_TO NOT NULL in TB_M_MILEAGE (denormalised) | No sample data | Copy names on insert / update; define refresh when a location is renamed |
| G-MML-04 | Master / Mileage - Active / Inactive and VERSION | STATUS, VERSION | - | Only IS_DELETE varchar(5); no VERSION | No sample data | Map status to IS_DELETE; concurrency by CHANGED_DT |
| G-MPR-01 | Master / Price - Price component | FIX / KM components | - | No component column in MS_ROUTE_PRICE | No sample data | Confirm component identification (material code?) |
| G-MPR-02 | Master / Price - Period | Periode YYYYMM column | - | Only VALID_DT_FROM / VALID_DT_TO | No sample data | Derive period from validity dates |
| G-MPY-01 | Master / Priority - Route priority storage | Route Priority Master | - | No table in ELIPS | No sample data | New table needed (DB change request) or confirm existing storage |
| G-MRB-01 | Master / Renban - Plant name | PLANT_CD + PLANT_NAME from Plant Master | - | No plant master with PLANT_CD varchar(10) found (TB_M_LOGISTIC_POINT.PLANT_CD is char(1)) | No sample data | Confirm the plant list source |
| G-MRP-01 | Master / Route Percentage - Route stops | Ordered stops with leg distance | - | MS_ROUTE_DETAIL has only ROUTE_CODE / ROUTE_DESCR | No sample data | New table or encode stops in ROUTE_CODE (confirm) |
| G-MRP-02 | Master / Route Percentage - Distance | DISTANCE_KM on the route | - | Only MS_ROUTE_PERCENTAGE_HIST.DISTANCE int (per period) | No sample data | Confirm source; decimals not stored |
| G-MRP-03 | Master / Route Percentage - Percentage storage | Number 5,2 | - | MS_ROUTE_HEADER float; HIST varchar(4) | No sample data | Confirm which table is maintained by the screen |
| G-MTC-01 | Master / Trucking Company - E-Mail length | Varchar 100 | master-trucking.js | EMAIL varchar(50) | No sample data | Limit UI to 50 or extend the column (DB change request) |
| G-MTC-02 | Master / Trucking Company - Vendor / SAP code format | 3 chars / 10 digits | - | COMPANY_CODE / SAP_COMPANY_CODE varchar(20) | No sample data | Confirm the rules against existing codes |
| G-MTC-03 | Master / Trucking Company - Concurrency check | VERSION (msg 15) | - | No VERSION column | No sample data | Use UPDATED_DATE as optimistic lock or add VERSION |
| G-MTC-04 | Master / Trucking Company - Service Type | SERVICE_TYPE MRO | - | No column (BUSINESS_TYPE int) | No sample data | Confirm whether BUSINESS_TYPE holds the service type |
| G-MTC-05 | Master / Trucking Company - Deletion flag | DELETION_FLAG Y / N | - | IS_DELETE varchar(1) default 0 | No sample data | Use IS_DELETE (values to confirm) |
| G-MO-02 | Monthly / PO Approval - Approval levels | SH / DpH / DH per PR | - | CRITERIA_SCORE_APPROVAL.APPROVAL_CLASS + APPROVAL_STS varchar(2) | No sample data | Level codes TBD |
| G-MO-03 | Monthly / PO Approval - Approval history | History grid with from / to status, role | - | No history table | No sample data | Show approval rows or add a history table |
| G-MO-04 | Monthly / PO Approval - Trucking code | Varchar 3 | - | COMPANY_ID varchar(10) | No sample data | Align with Master Trucking Company |
| G-PO-01 | Monthly / PO Approval - PO number source | PO number created in ELIPS (monthly-workflow.js createPO) | - | PO_DETAIL.PO_NUMBER varchar(16); PAS returns PO numbers (SA_DETAIL.PAS_PO_NUMBER) | No sample data | Confirm whether the monthly PO number is ELIPS or PAS generated |
| G-MO-02 | Monthly / PO Inquiry - Approval levels | SH / DpH / DH per PR | - | CRITERIA_SCORE_APPROVAL.APPROVAL_CLASS + APPROVAL_STS varchar(2) | No sample data | Level codes TBD |
| G-MO-03 | Monthly / PO Inquiry - Approval history | History grid with from / to status, role | - | No history table | No sample data | Show approval rows or add a history table |
| G-MO-04 | Monthly / PO Inquiry - Trucking code | Varchar 3 | - | COMPANY_ID varchar(10) | No sample data | Align with Master Trucking Company |
| G-PO-01 | Monthly / PO Inquiry - PO number source | PO number created in ELIPS (monthly-workflow.js createPO) | - | PO_DETAIL.PO_NUMBER varchar(16); PAS returns PO numbers (SA_DETAIL.PAS_PO_NUMBER) | No sample data | Confirm whether the monthly PO number is ELIPS or PAS generated |
| G-MO-01 | Monthly / PR Approval - PR document | PR Header per trucking company with own PR number | - | CRITERIA_SCORE_HEADER (period, PR_NO) + CRITERIA_SCORE_DETAIL_FINAL (company, PR_NO_DET) | No sample data | Use PR_NO_DET per company (confirm) |
| G-MO-02 | Monthly / PR Approval - Approval levels | SH / DpH / DH per PR | - | CRITERIA_SCORE_APPROVAL.APPROVAL_CLASS + APPROVAL_STS varchar(2) | No sample data | Level codes TBD |
| G-MO-03 | Monthly / PR Approval - Approval history | History grid with from / to status, role | - | No history table | No sample data | Show approval rows or add a history table |
| G-MO-04 | Monthly / PR Approval - Trucking code | Varchar 3 | - | COMPANY_ID varchar(10) | No sample data | Align with Master Trucking Company |
| G-MO-01 | Monthly / PR Creation - PR document | PR Header per trucking company with own PR number | - | CRITERIA_SCORE_HEADER (period, PR_NO) + CRITERIA_SCORE_DETAIL_FINAL (company, PR_NO_DET) | No sample data | Use PR_NO_DET per company (confirm) |
| G-MO-02 | Monthly / PR Creation - Approval levels | SH / DpH / DH per PR | - | CRITERIA_SCORE_APPROVAL.APPROVAL_CLASS + APPROVAL_STS varchar(2) | No sample data | Level codes TBD |
| G-PRC-01 | Monthly / PR Creation - Fixed-cost PR | Monthly Fixed Cost PR per LP (pr-creation-rules.js) | - | TB_R_PR_DAILY / TB_R_PR_SUMMARY (truck / driver / DOT / HOT model) | No sample data | Confirm the fixed-cost calculation model against these tables |
| G-MO-01 | Monthly / PR Inquiry - PR document | PR Header per trucking company with own PR number | - | CRITERIA_SCORE_HEADER (period, PR_NO) + CRITERIA_SCORE_DETAIL_FINAL (company, PR_NO_DET) | No sample data | Use PR_NO_DET per company (confirm) |
| G-MO-02 | Monthly / PR Inquiry - Approval levels | SH / DpH / DH per PR | - | CRITERIA_SCORE_APPROVAL.APPROVAL_CLASS + APPROVAL_STS varchar(2) | No sample data | Level codes TBD |
| G-MO-03 | Monthly / PR Inquiry - Approval history | History grid with from / to status, role | - | No history table | No sample data | Show approval rows or add a history table |
| G-MO-04 | Monthly / PR Inquiry - Trucking code | Varchar 3 | - | COMPANY_ID varchar(10) | No sample data | Align with Master Trucking Company |
| G-TA-01 | Daily / Planning Truck Assignment - LP accept / reject | LP_STATUS, LP_REJECT_REASON | - | No columns | No sample data | Confirm storage (ORDER_REMARK? new columns) |
| G-TA-02 | Daily / Planning Truck Assignment - Assignment table | TB_R_ORDER_TRUCK_ASSIGN with active flag | - | Plate / driver directly on DTP_n_DETAIL / ORDER_CYCLE, history in ORDER_TRUCK_H | No sample data | Use existing columns; ORDER_TRUCK_H as history |
| G-SA-01 | SA / SA Approval - SA number length | SA_NO Char 22 (sa-rules.js saNumber) | - | SA_CODE varchar(16); SA_HEADER_ID varchar(20) | No sample data | Shorten the SA number format or widen SA_CODE (DB change request) |
| G-SA-02 | SA / SA Approval - Amounts as text | Numeric KM / price / cost | - | SA_DETAIL.PRICE, TOTAL_PRICE varchar(100); TOTAL_TRIP varchar(10); SA_HEADER.SA_TOTAL varchar(5) | No sample data | Store numbers as text with fixed format or change types |
| G-SA-03 | SA / SA Approval - Total KM / rate per KM | TOTAL_KM, RATE_PER_KM, CURRENCY on SA | - | No such columns (ROUTE_PRICE_ID -> MS_ROUTE_PRICE) | No sample data | Derive from MS_ROUTE_PRICE / TB_M_MILEAGE |
| G-SA-04 | SA / SA Approval - Status codes | Text statuses | - | SA_HEADER.STATUS_CODE varchar(1), SA_DETAIL.STATUS_CODE varchar(2), SA_TYPE varchar(1) | No sample data | Code values TBD |
| G-SA-05 | SA / SA Approval - Approval request / sequence / history | TB_R_SA_APPROVAL_REQUEST, TB_M_SA_SEQUENCE, TB_H_SA | - | Not in ELIPS | No sample data | Confirm whether needed (DB change request) |
| G-SA-01 | SA / SA Monitoring - SA number length | SA_NO Char 22 (sa-rules.js saNumber) | - | SA_CODE varchar(16); SA_HEADER_ID varchar(20) | No sample data | Shorten the SA number format or widen SA_CODE (DB change request) |
| G-SA-02 | SA / SA Monitoring - Amounts as text | Numeric KM / price / cost | - | SA_DETAIL.PRICE, TOTAL_PRICE varchar(100); TOTAL_TRIP varchar(10); SA_HEADER.SA_TOTAL varchar(5) | No sample data | Store numbers as text with fixed format or change types |
| G-SA-03 | SA / SA Monitoring - Total KM / rate per KM | TOTAL_KM, RATE_PER_KM, CURRENCY on SA | - | No such columns (ROUTE_PRICE_ID -> MS_ROUTE_PRICE) | No sample data | Derive from MS_ROUTE_PRICE / TB_M_MILEAGE |
| G-SA-04 | SA / SA Monitoring - Status codes | Text statuses | - | SA_HEADER.STATUS_CODE varchar(1), SA_DETAIL.STATUS_CODE varchar(2), SA_TYPE varchar(1) | No sample data | Code values TBD |
| G-SAM-01 | SA / SA Monitoring - Interface tracking | CORRELATION_ID, INTERFACE_ATTEMPT, FEEDBACK_STS, ERROR_CD on SA header | - | SA_DETAIL PAS_* per detail; log in LOG_ITGPAS | No sample data | Track per SA_DETAIL; attempts / correlation id TBD |
| G-SAM-02 | SA / SA Monitoring - VISION columns | - | - | SA_DETAIL.IS_VISION / VISION_* exist | No sample data | Meaning TBD (other interface?) |
| G-GEN-01 | All UISS | Proposed / logical table names (TB_R_DTP_RECORD, Trucking Company Master (TBD) ...) | In-memory arrays (no DB access) | ELIPS tables DTP_HEADER / DTP_n_DETAIL, ORDER_CYCLE, MS_*, SA_*, CRITERIA_*, PO_* | No sample data | Revised in rev [DB-R1] of every UISS |
| G-GEN-02 | All UISS | Audit CREATED_DT / CHANGED_BY / CHANGED_DT | - | Most ELIPS tables: CREATED_DATE / UPDATED_BY / UPDATED_DATE; TB_M_* and MS_RENBAN_TCPBR: *_DT / CHANGED_* | No sample data | Per-table names applied |
| G-GEN-03 | All UISS | MSG ID TBD | - | dbo.TB_M_MESSAGE exists | No sample data | Assign IDs when TB_M_MESSAGE data is available |
| G-GEN-04 | All UISS | Concurrency by VERSION (msg "changed by another user") | version compared in every rule module | Only MS_RENBAN_TCPBR has VERSION | No sample data | Use UPDATED_DATE as optimistic lock or add VERSION columns |
| G-MLC-05 | Master / Location Code | Map = Google Maps (existing) | Leaflet + OpenStreetMap Nominatim (location.js:99, :117) | - | No sample data | Keep UISS (Google Maps = ELIPS); the mock-up uses OSM as a stand-in - note in UISS |
| G-DM-05 | Daily / Daily Monitoring | DTP creation only in Planning Order by Planner VPLD (U04) | Legacy "+ Create DTP" dialog for IELP Admin still in Daily Monitoring (app.js:558, workflow.js:84-97) | - | No sample data | Potential application issue BUG-01; decide remove or document |
| G-COM-01 | Master (all) | Role access not specified (Master Mileage shows "IELP Admin only") | No role check in master.js / master-*.js | USERID_MENU_OPTION decides menu access | No sample data | Specify in UISS Menu & Authorization; BUG-02 |

Total discrepancies: 97.
