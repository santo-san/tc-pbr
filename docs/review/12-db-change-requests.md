# 12 - DB Change Requests (keep the existing application logic)

Decision 14-Nov-26 (user): for every conflict between the implemented logic (mock-up code / UISS) and the existing ELIPS tables,
**the existing application logic is kept**. The changes below are what the ELIPS database needs so the implemented logic can be stored.
Items without a DCR are solved by a mapping rule on the existing columns (see `07-gap-analysis.md`). Physical names follow the
naming of the target table; new table names are proposals - TBD - Not confirmed with the DBA.

| DCR | Change | Kept logic (decision) | Conflict | UISS |
|---|---|---|---|---|
| DCR-01 | ALTER ielp.MS_TRUCKING_COMPANY.EMAIL varchar(50) -> varchar(100) | e-mail up to 100 characters (master-trucking.js). | G-MTC-01 | Screen_Master_Trucking_Company |
| DCR-02 | ADD ielp.MS_TRUCKING_COMPANY.VERSION int NOT NULL default 1 | optimistic lock by VERSION on Update / Delete (msg 15). | G-MTC-03 | Screen_Master_Trucking_Company |
| DCR-03 | ADD ielp.MS_TRUCKING_COMPANY.SERVICE_TYPE varchar(10) NOT NULL default 'MRO' (BUSINESS_TYPE left unchanged) | Service Type (MRO) on the vendor. | G-MTC-04 | Screen_Master_Trucking_Company |
| DCR-04 | ADD ielp.MS_LOCATION.STATUS varchar(8) NOT NULL default 'ACTIVE' | Active / Inactive status separate from delete (master-location.js deactivate / remove). | G-MLC-03 | Screen_Master_Location |
| DCR-05 | ADD ielp.MS_LOCATION.VERSION int NOT NULL default 1 | optimistic lock by VERSION. | G-MLC-04 | Screen_Master_Location |
| DCR-06 | ALTER ielp.TB_M_MILEAGE.MILEAGE decimal(18,0) -> decimal(9,2) | mileage > 0 with up to 2 decimals (master-mileage.js parseMileage). | G-MML-01 | Batch_Master_Mileage_Upload, Screen_Master_Mileage |
| DCR-07 | ALTER ielp.TB_M_MILEAGE: TO_CODE NOT NULL; primary key (LOC_NAME_FROM, FROM_CODE) -> (FROM_CODE, TO_CODE) | a route is unique by From + To (directional). | G-MML-02 | Batch_Master_Mileage_Upload, Screen_Master_Mileage |
| DCR-08 | ADD ielp.TB_M_MILEAGE.STATUS varchar(8) NOT NULL default 'Active'; ADD VERSION int NOT NULL default 1 | Active / Inactive status and VERSION. | G-MML-04 | Batch_Master_Mileage_Upload, Screen_Master_Mileage |
| DCR-09 | ADD ielp.TB_M_MILEAGE.LAST_UPLOAD_ID bigint NULL; CREATE TB_T_MILEAGE_UPLOAD, TB_R_MILEAGE_UPLOAD_LOG, TB_H_MILEAGE (definitions in the UISS-Batch Appendix) | upload with temp rows, upload log and mileage history (UISS-Batch Route Mileage Upload). | G-MML-05 | Batch_Master_Mileage_Upload |
| DCR-10 | ADD ielp.MS_ROUTE_PRICE.PRICE_COMPONENT varchar(3) (FIX / KM) | price components FIX (per month) and KM (per km) per partner and period (master-price.js). | G-MPR-01 | Screen_Master_Price |
| DCR-11 | CREATE ielp.TB_M_ROUTE_PRIORITY (FROM_CODE varchar(10), TO_CODE varchar(10), PRIORITY_NO int, VERSION int, CREATED_BY / CREATED_DT / CHANGED_BY / CHANGED_DT) - PK FROM_CODE + TO_CODE | route priority per From / To with renumbering (master-priority.js). | G-MPY-01 | Screen_Master_Priority |
| DCR-12 | CREATE ielp.TB_M_KPI_COMPANY (COMPANY_ID, PAYMENT_TYPE varchar(12), SCORE int, ORDER_SHARING decimal(5,2), DAILY_TRIP int, UOM, VERSION, audit) and ielp.TB_M_KPI_COMPANY_VALUE (COMPANY_ID, KPI_ID, KPI_VALUE int); KPI items stay in MS_KPI | KPI row per trucking company with payment type, score, KPI item values, order sharing % and daily trip (master-kpi.js). | G-MKP-01 | Screen_Master_KPI |
| DCR-13 | Columns in TB_M_KPI_COMPANY (DCR of G-MKP-01); Trips per day = row in ielp.TB_M_SYSTEM (SYS_CAT 'TCPBR', SYS_CD 'DAILY_TRIPS' - key TBD) | Payment Type By Resources / By Trip, Daily Trip, Trips per day for By Trip. | G-MKP-02 | Screen_Master_KPI |
| DCR-14 | CREATE ielp.MS_ROUTE_STOP (ROUTE_HEADER_ID varchar(10), SEQ_NO int, LOCATION_ID varchar(10), STOP_TYPE varchar(10), LEG_KM decimal(9,2), audit) - PK ROUTE_HEADER_ID + SEQ_NO | route = ordered stops (Location Pick) with leg distance (master-route-percentage.js). | G-MRP-01 | Screen_Master_Route_Percentage |
| DCR-15 | ADD ielp.MS_ROUTE_HEADER.DISTANCE_KM decimal(9,2), DISTANCE_EST_FLG varchar(1) | route distance (sum of legs, 2 decimals) on the route. | G-MRP-02 | Screen_Master_Route_Percentage |
| DCR-16 | ALTER ielp.DTP_2_DETAIL: ORDER_NO NULL; primary key ORDER_NO -> DTP_DET_ID | order number is assigned by queue processing, records exist before that. | G-DTP-02 | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Batch_DTP_Switching, Screen_DTP_Creation |
| DCR-17 | ADD ielp.DTP_2_DETAIL.PAY_TYPE varchar(12) | Payment Type per record chosen by the planner (dtp-rules.js setPayType). | G-DTP-03 | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Screen_DTP_Creation |
| DCR-18 | Register the statuses in ielp.MS_STATUS (STATUS_TYPE for DTP records, STATUS_CODE varchar(3)) - data, no column change | record statuses Ready to Submit / Error / Queued / Processing / Processed / Failed / Rejected (dtp-rules.js S). | G-DTP-04 | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Screen_DTP_Creation |
| DCR-19 | ADD ielp.DTP_2_DETAIL.EXPORTER varchar(50), IMPORTER_CD varchar(20), DEST_CD varchar(20), DATA_SOURCE varchar(6) | Exporter, Importer CD, Destination and Data Source (Excel / Manual / IPMS) on the record. | G-DTP-05 | Batch_DTP_Excel_Upload, Screen_DTP_Creation |
| DCR-20 | ADD ielp.DTP_2_DETAIL.VERSION int NOT NULL default 1 | optimistic lock by VERSION. | G-DTP-08 | Batch_DTP_Excel_Upload, Screen_DTP_Creation |
| DCR-21 | ADD ielp.DTP_2_DETAIL.ATTEMPT_CNT int default 0, FAIL_REASON varchar(500), SUBMITTED_BY varchar(500), SUBMITTED_DT datetime | retry with attempt count, failure reason, submitted by / at. | G-DTQ-01 | Batch_DTP_Queue_Processing |
| DCR-22 | ADD ielp.ORDER_CYCLE.CANCEL_BY varchar(500) (CANCEL_DATE, CANCEL_REMARKS existing) | switching cancels the daily order with reason and user. | G-DTS-01 | Batch_DTP_Switching |
| DCR-23 | CREATE TB_T_DRIVER_SYNC_QUEUE, TB_R_DRIVER_ORDER, TB_R_DRIVER_MQ_OUTBOX, TB_R_DRIVER_SYNC_LOG (definitions in the UISS-Batch Appendix) | Existing logic kept as specified in the UISS (HiveMQ outbox). | G-DRV-01 | Batch_Driver_Order_Sync |
| DCR-24 | Register the statuses in ielp.MS_STATUS - data, no column change | order / cycle statuses of workflow.js (ORDER, CYCLE). | G-DM-02 | Screen_Daily_Order_Monitoring |
| DCR-25 | ADD ielp.LOG_ACTIVITY_ORDER.FROM_STS_CODE varchar(3), ROLE varchar(50) | status history with from / to status, role, reason, note (workflow.js log). | G-DM-03 | Screen_Daily_Order_Monitoring |
| DCR-26 | ADD ielp.DTP_2_DETAIL.FA_FLAG varchar(1), PLANNED_CYCLE int; ADD ielp.ORDER_CYCLE.PO_RECEIVED_DATE datetime | FA flag, planned cycles and PO received date on the order. | G-DM-04 | Screen_Daily_Order_Monitoring |
| DCR-27 | ADD ielp.DTP_2_DETAIL.LP_STATUS varchar(20), LP_REJECT_REASON varchar(500), LP_ACTION_BY varchar(500), LP_ACTION_DATE datetime | LP Accept / Reject with reason (workflow.js:194, 202). | G-TA-01 | Screen_Planning_Truck_Assignment |
| DCR-28 | ADD ielp.ORDER_TRUCK_H.ACTION varchar(30), PREV_LICENSE_PLATE varchar(20), DRIVER_ID varchar(10) | one active truck per order, every assign / change kept in an audit trail. | G-TA-02 | Screen_Planning_Truck_Assignment |
| DCR-29 | ALTER ielp.SA_DETAIL.SA_CODE and ielp.ORDER_CYCLE.SA_CODE varchar(16) -> varchar(25) | SA number ILS/TR/<LP>/<YYMMDD><NNNN> up to 22 characters (sa-rules.js saNumber). | G-SA-01 | Screen_SA_Approval, Screen_SA_Monitoring |
| DCR-30 | ADD ielp.SA_DETAIL.TOTAL_KM decimal(9,2), RATE_PER_KM decimal(15,2), CURRENCY varchar(3) | Total KM, rate per KM and currency kept on the SA (sa-rules.js calculate). | G-SA-03 | Screen_SA_Approval, Screen_SA_Monitoring |
| DCR-31 | Register code values (SA_HEADER.STATUS_CODE, SA_TYPE, SA_DETAIL.STATUS_CODE) - data, no column change | SA statuses and types of sa-rules.js / sa-pas-rules.js. | G-SA-04 | Screen_SA_Approval, Screen_SA_Monitoring |
| DCR-32 | CREATE TB_R_SA_APPROVAL_REQUEST, TB_M_SA_SEQUENCE, TB_H_SA (as specified in the UISS) | approval request (idempotent), SA sequence per scope and SA history. | G-SA-05 | Screen_SA_Approval |
| DCR-33 | ADD ielp.SA_DETAIL.CORRELATION_ID varchar(60), INTERFACE_ATTEMPT int, ERROR_CD varchar(30), ERROR_MSG varchar(500) | interface tracking with correlation id, attempts, error code / message (sa-pas-rules.js). | G-SAM-01 | Screen_SA_Monitoring |
| DCR-34 | Register APPROVAL_CLASS / APPROVAL_STS values - data, no column change | approval levels SH / DpH / DH; stored as APPROVAL_CLASS values with APPROVAL_STS. | G-MO-02 | Screen_PO_Approval, Screen_PO_Inquiry, Screen_PR_Approval, Screen_PR_Creation, Screen_PR_Inquiry |
| DCR-35 | CREATE ielp.TB_H_PR_PO_APPROVAL (DOC_TYPE, DOC_NO, ACTION, FROM_STATUS, TO_STATUS, ROLE, REASON, NOTE, CREATED_BY, CREATED_DT) | approval history with from / to status, role, reason (monthly-workflow.js log). | G-MO-03 | Screen_PO_Approval, Screen_PO_Inquiry, Screen_PR_Approval, Screen_PR_Inquiry |
| DCR-36 | VERSION columns as listed per table (DCR of G-MTC-03, G-MLC-04, G-MML-04, G-DTP-08) | optimistic lock by VERSION in every rule module. | G-GEN-04 | all UISS with VERSION |

## Without DB change (mapping rule on existing columns)

| Conflict | Kept logic / mapping |
|---|---|
| G-MTC-02 | Vendor Code 3 letters / numbers, SAP Vendor Code 10 digits (master-trucking.js validate). |
| G-MTC-05 | logical delete flag; stored in IS_DELETE ('0' active, '1' deleted). |
| G-MLC-01 | numeric coordinates with 7 decimals, validated -90..90 / -180..180; stored as text in LOCATION_LATITUDE / LOCATION_LANGITUDE. |
| G-MLC-02 | numeric radius > 0 in metres; stored as text in RADIUS (max 5 digits). |
| G-MML-03 | names shown from Master Location; LOC_NAME_FROM / LOC_NAME_TO filled with a copy of MS_LOCATION.LOCATION_NAME on save. |
| G-MPR-02 | period YYYYMM derived from the validity dates (master-price.js periodStart / periodEnd). |
| G-MKP-03 | grade thresholds fixed in master-kpi.js (MS_KPI_PERCENTAGE not used). |
| G-MRP-03 | percentage 0 < % <= 100 with 2 decimals; stored in MS_ROUTE_HEADER.ROUTE_PERCENTAGE_VALUE (float). |
| G-MRB-01 | plant list as coded in master-renban.js (code - description). |
| G-DTP-01 | one record list per plan date for the Universal DTP model; stored as DTP_HEADER (date) + DTP_2_DETAIL rows (inferred DTP type). |
| G-DTP-06 | one container size value ('20', '40', '40 HC'); stored as CTR_SIZE (20 / 40) + CTR_TYPE ('HC'). |
| G-DTP-07 | Excel / Manual records not yet submitted are deleted physically. |
| G-DM-01 | order header with up to 5 cycles; order = DTP_2_DETAIL row, cycle = ORDER_CYCLE row (CYCLE_SEQ). |
| G-DN-01 | deliveryId = No Cycle Order YYMMDDC2XXX999 (dn-rules.js); stored in ORDER_CYCLE.ORDER_CYCLE_ID varchar(20). |
| G-SA-02 | numeric KM / price / cost; stored as plain numbers in the existing varchar columns. |
| G-SAM-02 | VISION columns are not used by the TC-PBR logic. |
| G-MO-01 | one PR per trucking company (PR_NO_DET) under the period PR (CRITERIA_SCORE_HEADER). |
| G-MO-04 | 3-letter trucking code shown = MS_TRUCKING_COMPANY.COMPANY_CODE (joined by COMPANY_ID). |
| G-PO-01 | PO number created by ELIPS when DH approves the PR (monthly-workflow.js createPO); stored in PO_DETAIL.PO_NUMBER. |
| G-PRC-01 | Monthly Fixed Cost PR and Route-Based PR as calculated in pr-creation-rules.js; stored in CRITERIA_SCORE_* (type in CRITERIA_SCORE_HEADER.BUSINESS_TYPE). |
| G-MLC-05 | the UISS already states that the mock-up map (Leaflet / OpenStreetMap, location.js) is a stand-in for the existing ELIPS Google Maps - no change. |
| G-DM-05 | legacy "+ Create DTP" dialog for IELP Admin stays in Daily Monitoring and is documented in its UISS. |
| G-COM-01 | Master screens have no role restriction (any logged-in role); the "IELP Admin only" badge is informational. |

## Appendix - Data Map columns not in the ELIPS table

Columns named in UISS Data Map blocks (tagged `[DCR: ... not in <table>]`) checked against the DCR list: **DCR** = added by a DCR above;
**align** = the column exists under another ELIPS name (see the UISS Database Specification) - rename in the next UISS revision.

| Table | Column | Covered by | UISS |
|---|---|---|---|
| ielp.CRITERIA_SCORE_APPROVAL | APPROVED_BY | align -> APPROVAL_BY | Screen_PO_Approval |
| ielp.CRITERIA_SCORE_APPROVAL | APPROVED_DT | align -> APPROVAL_DATE / APPROVED_DATE | Screen_PO_Approval |
| ielp.CRITERIA_SCORE_APPROVAL | APV_APPROVAL_CLASS | align -> APPROVAL_CLASS | Screen_PR_Creation |
| ielp.CRITERIA_SCORE_APPROVAL | APV_BY | align -> APPROVAL_BY | Screen_PR_Creation |
| ielp.CRITERIA_SCORE_APPROVAL | PR_NO_DET | align -> CRITERIA_DETAIL_FINAL_ID | Screen_PR_Creation |
| ielp.CRITERIA_SCORE_DETAIL_FINAL | CRITERIA_PERIODE | align -> PO_PERIODE / CRITERIA_SCORE_HEADER | Screen_PR_Creation |
| ielp.CRITERIA_SCORE_DETAIL_FINAL | FIX_COST | DCR-37 | Screen_PR_Creation |
| ielp.CRITERIA_SCORE_DETAIL_FINAL | PARENT_PR_NO_DET | DCR-37 | Screen_PR_Creation |
| ielp.CRITERIA_SCORE_DETAIL_FINAL | PR_SEQ | align -> CRITERIA_SCORE_HEADER.PR_SEQ | Screen_PR_Creation |
| ielp.CRITERIA_SCORE_DETAIL_ROUTE | PR_NO_DET | align -> CRITERIA_DETAIL_FINAL_ID | Screen_PR_Creation |
| ielp.DTP_2_DETAIL | ATTEMPT_CNT | DCR-21 | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | COMPLETE_DATE | align -> ORDER_CYCLE.COMPLETE_DATE | Screen_Daily_Order_Monitoring |
| ielp.DTP_2_DETAIL | DATA_SOURCE | DCR-19 | Batch_DTP_Excel_Upload, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | DEST_CD | DCR-19 | Batch_DTP_Excel_Upload, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | DTP_DATE | align -> DTP_HEADER.DTP_DATE | Batch_DTP_Excel_Upload, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | DTP_MODEL | align -> DTP_HEADER.DTP_TYPE | Batch_DTP_Excel_Upload, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | ERROR_MSG | align -> column of DCR-33 (other table) | Batch_DTP_Excel_Upload, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | EXPORTER | DCR-19 | Batch_DTP_Excel_Upload, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | FAIL_REASON | DCR-21 | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | IMPORTER_CD | DCR-19 | Batch_DTP_Excel_Upload, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | LAST_UPLOAD_ID | align -> column of DCR-09 (other table) | Batch_DTP_Excel_Upload, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | PAY_TYPE | DCR-17 | Batch_DTP_Excel_Upload, Batch_DTP_Switching |
| ielp.DTP_2_DETAIL | STATUS | align -> STATUS_CODE | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | SUBMITTED_BY | DCR-21 | Batch_DTP_Excel_Upload, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | SUBMITTED_DT | DCR-21 | Batch_DTP_Excel_Upload, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.DTP_2_DETAIL | VERSION | DCR-20 | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.LOG_ACTIVITY_ORDER | CREATED_DATE | align -> CRETED_DATE (LOG_ACTIVITY_ORDER) | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Batch_DTP_Switching, Screen_DTP_Creation, Screen_Daily_Order_Monitoring |
| ielp.LOG_ACTIVITY_ORDER | CYCLE_SEQ | align -> ORDER_CYCLE.CYCLE_SEQ | Screen_Daily_Order_Monitoring |
| ielp.LOG_ACTIVITY_ORDER | HIST_ID | DCR-38 | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.LOG_ACTIVITY_ORDER | NOTE | align -> STS_MESSAGE | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.LOG_ACTIVITY_ORDER | STATUS | align -> STATUS_CODE | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Batch_DTP_Switching, Screen_DTP_Creation |
| ielp.MS_ROUTE_HEADER | ROUTE_CODE | align -> MS_ROUTE_DETAIL.ROUTE_CODE | Screen_Master_Route_Percentage |
| ielp.MS_ROUTE_HEADER | ROUTE_DESCR | align -> MS_ROUTE_DETAIL.ROUTE_DESCR | Screen_Master_Route_Percentage |
| ielp.ORDER_CYCLE | ACTIVE_PLATE | align -> LICENSE_PLATE | Screen_Planning_Truck_Assignment |
| ielp.ORDER_CYCLE | CANCEL_BY | DCR-22 | Batch_DTP_Switching |
| ielp.ORDER_CYCLE | CYCLE_NO | align -> CYCLE_SEQ | Batch_DTP_Queue_Processing |
| ielp.ORDER_CYCLE | CYCLE_STATUS | align -> STATUS_CODE | Batch_DTP_Queue_Processing |
| ielp.ORDER_CYCLE | DRIVER | align -> DRIVER_ID | Batch_DTP_Queue_Processing |
| ielp.ORDER_CYCLE | DTP_TYPE | align -> DTP_HEADER.DTP_TYPE | Batch_DTP_Queue_Processing |
| ielp.ORDER_CYCLE | LP_ACCEPTED_BY | DCR-39 | Screen_Planning_Truck_Assignment |
| ielp.ORDER_CYCLE | LP_ACCEPTED_DT | DCR-39 | Screen_Planning_Truck_Assignment |
| ielp.ORDER_CYCLE | LP_REJECT_BY | DCR-39 | Screen_Planning_Truck_Assignment |
| ielp.ORDER_CYCLE | LP_REJECT_DT | DCR-39 | Screen_Planning_Truck_Assignment |
| ielp.ORDER_CYCLE | LP_REJECT_REASON | align -> column of DCR-27 (other table) | Screen_Planning_Truck_Assignment |
| ielp.ORDER_CYCLE | LP_STATUS | align -> column of DCR-27 (other table) | Screen_Planning_Truck_Assignment |
| ielp.ORDER_CYCLE | ORDER_DT | align -> ORDER_DATE | Batch_DTP_Queue_Processing |
| ielp.ORDER_CYCLE | ORDER_STATUS | align -> STATUS_CODE | Batch_DTP_Queue_Processing |
| ielp.ORDER_CYCLE | PLANNED_CYCLE | DCR-26 | Batch_DTP_Queue_Processing |
| ielp.ORDER_CYCLE | SA_BY | DCR-39 | Screen_SA_Approval |
| ielp.ORDER_CYCLE | SA_DT | DCR-39 | Screen_SA_Approval |
| ielp.ORDER_CYCLE | START_DT | align -> START_DATE | Screen_Daily_Order_Monitoring |
| ielp.ORDER_CYCLE | STATUS | align -> STATUS_CODE | Batch_DTP_Switching, Screen_Planning_Truck_Assignment, Screen_SA_Approval |
| ielp.ORDER_CYCLE | TRUCK_NO | align -> LICENSE_PLATE | Batch_DTP_Queue_Processing |
| ielp.ORDER_CYCLE | VERSION | align -> column of DCR-02 (other table) | Batch_DTP_Switching, Screen_Planning_Truck_Assignment, Screen_SA_Approval |
| ielp.ORDER_TRUCK_H | ACTION | DCR-28 | Batch_DTP_Switching, Screen_Planning_Truck_Assignment |
| ielp.ORDER_TRUCK_H | HIST_ID | DCR-40 | Screen_Planning_Truck_Assignment |
| ielp.ORDER_TRUCK_H | NEW_LP_STATUS | DCR-40 | Screen_Planning_Truck_Assignment |
| ielp.ORDER_TRUCK_H | NEW_ORDER_STATUS | DCR-40 | Screen_Planning_Truck_Assignment |
| ielp.ORDER_TRUCK_H | NEW_PLATE | DCR-40 | Screen_Planning_Truck_Assignment |
| ielp.ORDER_TRUCK_H | PLATE | align -> LICENSE_PLATE | Batch_DTP_Switching |
| ielp.ORDER_TRUCK_H | PREV_LP_STATUS | DCR-40 | Screen_Planning_Truck_Assignment |
| ielp.ORDER_TRUCK_H | PREV_ORDER_STATUS | DCR-40 | Screen_Planning_Truck_Assignment |
| ielp.ORDER_TRUCK_H | PREV_PLATE | DCR-40 | Screen_Planning_Truck_Assignment |
| ielp.ORDER_TRUCK_H | REASON | align -> column of DCR-35 (other table) | Screen_Planning_Truck_Assignment |
| ielp.ORDER_TRUCK_H | UPDATED_DT | align -> UPDATED_DATE | Batch_DTP_Switching, Screen_Planning_Truck_Assignment |
| ielp.PO_DETAIL | SA_CODE | align -> SA_DETAIL / SA_HEADER_ID | Screen_SA_Approval |
| ielp.PO_DETAIL | SA_DT | DCR-41 | Screen_SA_Approval |
| ielp.PO_HEADER | COMPANY_ID | align -> PO_DETAIL.COMPANY_ID | Screen_PR_Approval |
| ielp.PO_HEADER | CRITERIA_PERIODE | align -> PO_PERIODE / CRITERIA_SCORE_HEADER | Screen_PR_Approval |
| ielp.PO_HEADER | PO_NUMBER | align -> PO_DETAIL.PO_NUMBER | Screen_PR_Approval |
| ielp.PO_HEADER | PR_NO_DET | align -> CRITERIA_DETAIL_FINAL_ID | Screen_PR_Approval |
| ielp.PO_HEADER | PR_SEQ | align -> CRITERIA_SCORE_HEADER.PR_SEQ | Screen_PR_Approval |
| ielp.PO_HEADER | SHARING_PCT | align -> CRITERIA_SCORE_DETAIL_FINAL.TOTAL_ORDER_SHARING | Screen_PR_Approval |
| ielp.PO_HEADER | TOTAL_PRICE | align -> CRITERIA_SCORE_DETAIL_FINAL.TOTAL_PRICE | Screen_PR_Approval |
| ielp.PO_HEADER | TOTAL_QTY | align -> CRITERIA_SCORE_DETAIL_FINAL.TOTAL_TRIP | Screen_PR_Approval |
| ielp.SA_DETAIL | CALC_DT | DCR-42 | Screen_SA_Approval |
| ielp.SA_DETAIL | CALC_SNAPSHOT | DCR-42 | Screen_SA_Approval |
| ielp.SA_DETAIL | CHANGED_DT | align -> UPDATED_DATE | Batch_ELIPS_PAS_PR_Interface |
| ielp.SA_DETAIL | COST | align -> TOTAL_PRICE | Screen_SA_Approval |
| ielp.SA_DETAIL | CREATED_DT | align -> CREATED_DATE | Batch_ELIPS_PAS_PR_Interface |
| ielp.SA_DETAIL | CURRENCY | DCR-30 | Screen_SA_Approval |
| ielp.SA_DETAIL | DESCRIPTION | DCR-42 | Screen_SA_Approval |
| ielp.SA_DETAIL | DETAIL_KIND | DCR-42 | Screen_SA_Approval |
| ielp.SA_DETAIL | END_DT | DCR-42 | Batch_ELIPS_PAS_PR_Interface |
| ielp.SA_DETAIL | ERROR_MESSAGE | align -> ERROR_MSG (DCR) | Batch_ELIPS_PAS_PR_Interface |
| ielp.SA_DETAIL | FORMULA | DCR-42 | Screen_SA_Approval |
| ielp.SA_DETAIL | INTERFACE_STATUS | align -> PAS_STATUS | Batch_ELIPS_PAS_PR_Interface |
| ielp.SA_DETAIL | ORDER_DATE | DCR-42 | Screen_SA_Approval |
| ielp.SA_DETAIL | ORDER_NO | align -> DTP_DET_ID | Screen_SA_Approval |
| ielp.SA_DETAIL | PO_STATUS_AT_APPROVAL | DCR-42 | Screen_SA_Approval |
| ielp.SA_DETAIL | PROCESS_ID | align -> LOG_ITGPAS.PROCESS_ID | Batch_ELIPS_PAS_PR_Interface |
| ielp.SA_DETAIL | PROD_MONTH | DCR-42 | Screen_SA_Approval |
| ielp.SA_DETAIL | PR_NO | DCR-42 | Batch_ELIPS_PAS_PR_Interface, Screen_SA_Approval |
| ielp.SA_DETAIL | RATE_PER_KM | DCR-30 | Screen_SA_Approval |
| ielp.SA_DETAIL | RETRY_COUNT | DCR-42 | Batch_ELIPS_PAS_PR_Interface |
| ielp.SA_DETAIL | ROUTE_CD | align -> ROUTE_HEADER_ID / ORDER_ROUTE | Screen_SA_Approval |
| ielp.SA_DETAIL | SA_DET_NO | align -> SA_DETAIL_ID | Screen_SA_Approval |
| ielp.SA_DETAIL | SA_NUMBER | align -> SA_CODE | Batch_ELIPS_PAS_PR_Interface |
| ielp.SA_DETAIL | START_DT | align -> START_DATE | Batch_ELIPS_PAS_PR_Interface |
| ielp.SA_DETAIL | TOTAL_KM | DCR-30 | Screen_SA_Approval |
| ielp.SA_HEADER | APPROVED_BY | align -> APPROVAL_BY | Screen_SA_Approval |
| ielp.SA_HEADER | APPROVED_DT | align -> APPROVAL_DATE / APPROVED_DATE | Screen_SA_Approval |
| ielp.SA_HEADER | CORRELATION_ID | align -> column of DCR-33 (other table) | Screen_SA_Monitoring |
| ielp.SA_HEADER | CURRENCY | align -> column of DCR-30 (other table) | Screen_SA_Approval |
| ielp.SA_HEADER | DELIVERY_COUNT | DCR-43 | Screen_SA_Approval |
| ielp.SA_HEADER | ERROR_CD | align -> column of DCR-33 (other table) | Screen_SA_Monitoring |
| ielp.SA_HEADER | ERROR_MSG | align -> column of DCR-33 (other table) | Screen_SA_Monitoring |
| ielp.SA_HEADER | INTERFACE_ATTEMPT | align -> column of DCR-33 (other table) | Screen_SA_Monitoring |
| ielp.SA_HEADER | INTERFACE_DT | DCR-43 | Screen_SA_Monitoring |
| ielp.SA_HEADER | INTERFACE_STS | align -> PAS_STATUS (SA_DETAIL) | Screen_SA_Approval |
| ielp.SA_HEADER | LP_NAME | align -> MS_TRUCKING_COMPANY.COMPANY_NAME | Screen_SA_Approval |
| ielp.SA_HEADER | PAS_STATUS | DCR-43 | Screen_SA_Monitoring |
| ielp.SA_HEADER | PAS_UPDATED_DT | DCR-43 | Screen_SA_Monitoring |
| ielp.SA_HEADER | PAS_VERSION | DCR-43 | Screen_SA_Monitoring |
| ielp.SA_HEADER | PO_VALID_FROM | DCR-43 | Screen_SA_Approval |
| ielp.SA_HEADER | PO_VALID_TO | DCR-43 | Screen_SA_Approval |
| ielp.SA_HEADER | PROD_MONTH | DCR-43 | Screen_SA_Approval |
| ielp.SA_HEADER | PR_NO | DCR-43 | Screen_SA_Approval |
| ielp.SA_HEADER | REQUEST_ID | DCR-43 | Screen_SA_Approval |
| ielp.SA_HEADER | SA_CODE | align -> SA_DETAIL / SA_HEADER_ID | Screen_SA_Approval |
| ielp.SA_HEADER | SA_STATUS | align -> STATUS_CODE | Screen_SA_Approval |
| ielp.SA_HEADER | TOTAL_COST | DCR-43 | Screen_SA_Approval, Screen_SA_Monitoring |
| ielp.SA_HEADER | TOTAL_KM | align -> column of DCR-30 (other table) | Screen_SA_Approval, Screen_SA_Monitoring |
| ielp.SA_HEADER | VERSION | align -> column of DCR-02 (other table) | Screen_SA_Approval |
| ielp.TB_M_MILEAGE | LAST_UPLOAD_ID | DCR-09 | Batch_Master_Mileage_Upload |

## Additional DCR from the Data Map appendix (existing logic kept)

Columns written by the existing logic as specified in the UISS Data Map with no ELIPS column and no other DCR. Types follow the UISS item definitions (TBD where the UISS has none).

| DCR | Change | UISS |
|---|---|---|
| DCR-37 | ADD ielp.CRITERIA_SCORE_DETAIL_FINAL: FIX_COST, PARENT_PR_NO_DET | Screen_PR_Creation |
| DCR-38 | ADD ielp.LOG_ACTIVITY_ORDER: HIST_ID | Batch_DTP_Excel_Upload, Batch_DTP_Queue_Processing, Batch_DTP_Switching, Screen_DTP_Creation |
| DCR-39 | ADD ielp.ORDER_CYCLE: LP_ACCEPTED_BY, LP_ACCEPTED_DT, LP_REJECT_BY, LP_REJECT_DT, SA_BY, SA_DT | Screen_Planning_Truck_Assignment, Screen_SA_Approval |
| DCR-40 | ADD ielp.ORDER_TRUCK_H: HIST_ID, NEW_LP_STATUS, NEW_ORDER_STATUS, NEW_PLATE, PREV_LP_STATUS, PREV_ORDER_STATUS, PREV_PLATE | Screen_Planning_Truck_Assignment |
| DCR-41 | ADD ielp.PO_DETAIL: SA_DT | Screen_SA_Approval |
| DCR-42 | ADD ielp.SA_DETAIL: CALC_DT, CALC_SNAPSHOT, DESCRIPTION, DETAIL_KIND, END_DT, FORMULA, ORDER_DATE, PO_STATUS_AT_APPROVAL, PROD_MONTH, PR_NO, RETRY_COUNT | Batch_ELIPS_PAS_PR_Interface, Screen_SA_Approval |
| DCR-43 | ADD ielp.SA_HEADER: DELIVERY_COUNT, INTERFACE_DT, PAS_STATUS, PAS_UPDATED_DT, PAS_VERSION, PO_VALID_FROM, PO_VALID_TO, PROD_MONTH, PR_NO, REQUEST_ID, TOTAL_COST | Screen_SA_Approval, Screen_SA_Monitoring |
