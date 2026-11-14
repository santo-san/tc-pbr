"""Decision 14-Nov-26 (user): for every conflict follow the EXISTING application logic (mock-up code).
Per conflict: the logic that is kept, and the DB Change Request (DCR) needed so the existing ELIPS tables can hold it
(None = no structural change: the existing columns can store it with the mapping rule given).
Writes decisions.json (read by db_decision.py and make_matrices.py)."""
import json
E = 'Existing logic kept'
D = {
 # ---- Master Trucking Company
 'G-MTC-01': (f'{E}: e-mail up to 100 characters (master-trucking.js).', 'ALTER ielp.MS_TRUCKING_COMPANY.EMAIL varchar(50) -> varchar(100)'),
 'G-MTC-02': (f'{E}: Vendor Code 3 letters / numbers, SAP Vendor Code 10 digits (master-trucking.js validate).', None),
 'G-MTC-03': (f'{E}: optimistic lock by VERSION on Update / Delete (msg 15).', 'ADD ielp.MS_TRUCKING_COMPANY.VERSION int NOT NULL default 1'),
 'G-MTC-04': (f'{E}: Service Type (MRO) on the vendor.', "ADD ielp.MS_TRUCKING_COMPANY.SERVICE_TYPE varchar(10) NOT NULL default 'MRO' (BUSINESS_TYPE left unchanged)"),
 'G-MTC-05': (f"{E}: logical delete flag; stored in IS_DELETE ('0' active, '1' deleted).", None),
 # ---- Master Location
 'G-MLC-01': (f'{E}: numeric coordinates with 7 decimals, validated -90..90 / -180..180; stored as text in LOCATION_LATITUDE / LOCATION_LANGITUDE.', None),
 'G-MLC-02': (f'{E}: numeric radius > 0 in metres; stored as text in RADIUS (max 5 digits).', None),
 'G-MLC-03': (f'{E}: Active / Inactive status separate from delete (master-location.js deactivate / remove).', "ADD ielp.MS_LOCATION.STATUS varchar(8) NOT NULL default 'ACTIVE'"),
 'G-MLC-04': (f'{E}: optimistic lock by VERSION.', 'ADD ielp.MS_LOCATION.VERSION int NOT NULL default 1'),
 # ---- Master Mileage
 'G-MML-01': (f'{E}: mileage > 0 with up to 2 decimals (master-mileage.js parseMileage).', 'ALTER ielp.TB_M_MILEAGE.MILEAGE decimal(18,0) -> decimal(9,2)'),
 'G-MML-02': (f'{E}: a route is unique by From + To (directional).', 'ALTER ielp.TB_M_MILEAGE: TO_CODE NOT NULL; primary key (LOC_NAME_FROM, FROM_CODE) -> (FROM_CODE, TO_CODE)'),
 'G-MML-03': (f'{E}: names shown from Master Location; LOC_NAME_FROM / LOC_NAME_TO filled with a copy of MS_LOCATION.LOCATION_NAME on save.', None),
 'G-MML-04': (f'{E}: Active / Inactive status and VERSION.', "ADD ielp.TB_M_MILEAGE.STATUS varchar(8) NOT NULL default 'Active'; ADD VERSION int NOT NULL default 1"),
 'G-MML-05': (f'{E}: upload with temp rows, upload log and mileage history (UISS-Batch Route Mileage Upload).', 'ADD ielp.TB_M_MILEAGE.LAST_UPLOAD_ID bigint NULL; CREATE TB_T_MILEAGE_UPLOAD, TB_R_MILEAGE_UPLOAD_LOG, TB_H_MILEAGE (definitions in the UISS-Batch Appendix)'),
 # ---- Master Price / Priority / KPI / Route % / Renban
 'G-MPR-01': (f'{E}: price components FIX (per month) and KM (per km) per partner and period (master-price.js).', 'ADD ielp.MS_ROUTE_PRICE.PRICE_COMPONENT varchar(3) (FIX / KM)'),
 'G-MPR-02': (f'{E}: period YYYYMM derived from the validity dates (master-price.js periodStart / periodEnd).', None),
 'G-MPY-01': (f'{E}: route priority per From / To with renumbering (master-priority.js).', 'CREATE ielp.TB_M_ROUTE_PRIORITY (FROM_CODE varchar(10), TO_CODE varchar(10), PRIORITY_NO int, VERSION int, CREATED_BY / CREATED_DT / CHANGED_BY / CHANGED_DT) - PK FROM_CODE + TO_CODE'),
 'G-MKP-01': (f'{E}: KPI row per trucking company with payment type, score, KPI item values, order sharing % and daily trip (master-kpi.js).', 'CREATE ielp.TB_M_KPI_COMPANY (COMPANY_ID, PAYMENT_TYPE varchar(12), SCORE int, ORDER_SHARING decimal(5,2), DAILY_TRIP int, UOM, VERSION, audit) and ielp.TB_M_KPI_COMPANY_VALUE (COMPANY_ID, KPI_ID, KPI_VALUE int); KPI items stay in MS_KPI'),
 'G-MKP-02': (f'{E}: Payment Type By Resources / By Trip, Daily Trip, Trips per day for By Trip.', "Columns in TB_M_KPI_COMPANY (DCR of G-MKP-01); Trips per day = row in ielp.TB_M_SYSTEM (SYS_CAT 'TCPBR', SYS_CD 'DAILY_TRIPS' - key TBD)"),
 'G-MKP-03': (f'{E}: grade thresholds fixed in master-kpi.js (MS_KPI_PERCENTAGE not used).', None),
 'G-MRP-01': (f'{E}: route = ordered stops (Location Pick) with leg distance (master-route-percentage.js).', 'CREATE ielp.MS_ROUTE_STOP (ROUTE_HEADER_ID varchar(10), SEQ_NO int, LOCATION_ID varchar(10), STOP_TYPE varchar(10), LEG_KM decimal(9,2), audit) - PK ROUTE_HEADER_ID + SEQ_NO'),
 'G-MRP-02': (f'{E}: route distance (sum of legs, 2 decimals) on the route.', 'ADD ielp.MS_ROUTE_HEADER.DISTANCE_KM decimal(9,2), DISTANCE_EST_FLG varchar(1)'),
 'G-MRP-03': (f'{E}: percentage 0 < % <= 100 with 2 decimals; stored in MS_ROUTE_HEADER.ROUTE_PERCENTAGE_VALUE (float).', None),
 'G-MRB-01': (f'{E}: plant list as coded in master-renban.js (code - description).', None),
 # ---- DTP
 'G-DTP-01': (f'{E}: one record list per plan date for the Universal DTP model; stored as DTP_HEADER (date) + DTP_2_DETAIL rows (inferred DTP type).', None),
 'G-DTP-02': (f'{E}: order number is assigned by queue processing, records exist before that.', 'ALTER ielp.DTP_2_DETAIL: ORDER_NO NULL; primary key ORDER_NO -> DTP_DET_ID'),
 'G-DTP-03': (f'{E}: Payment Type per record chosen by the planner (dtp-rules.js setPayType).', 'ADD ielp.DTP_2_DETAIL.PAY_TYPE varchar(12)'),
 'G-DTP-04': (f'{E}: record statuses Ready to Submit / Error / Queued / Processing / Processed / Failed / Rejected (dtp-rules.js S).', "Register the statuses in ielp.MS_STATUS (STATUS_TYPE for DTP records, STATUS_CODE varchar(3)) - data, no column change"),
 'G-DTP-05': (f'{E}: Exporter, Importer CD, Destination and Data Source (Excel / Manual / IPMS) on the record.', 'ADD ielp.DTP_2_DETAIL.EXPORTER varchar(50), IMPORTER_CD varchar(20), DEST_CD varchar(20), DATA_SOURCE varchar(6)'),
 'G-DTP-06': (f"{E}: one container size value ('20', '40', '40 HC'); stored as CTR_SIZE (20 / 40) + CTR_TYPE ('HC').", None),
 'G-DTP-07': (f'{E}: Excel / Manual records not yet submitted are deleted physically.', None),
 'G-DTP-08': (f'{E}: optimistic lock by VERSION.', 'ADD ielp.DTP_2_DETAIL.VERSION int NOT NULL default 1'),
 'G-DTQ-01': (f'{E}: retry with attempt count, failure reason, submitted by / at.', 'ADD ielp.DTP_2_DETAIL.ATTEMPT_CNT int default 0, FAIL_REASON varchar(500), SUBMITTED_BY varchar(500), SUBMITTED_DT datetime'),
 'G-DTS-01': (f'{E}: switching cancels the daily order with reason and user.', 'ADD ielp.ORDER_CYCLE.CANCEL_BY varchar(500) (CANCEL_DATE, CANCEL_REMARKS existing)'),
 'G-DRV-01': (f'{E} as specified in the UISS (HiveMQ outbox).', 'CREATE TB_T_DRIVER_SYNC_QUEUE, TB_R_DRIVER_ORDER, TB_R_DRIVER_MQ_OUTBOX, TB_R_DRIVER_SYNC_LOG (definitions in the UISS-Batch Appendix)'),
 # ---- Daily Monitoring / Delivery Note / Truck Assignment
 'G-DM-01': (f'{E}: order header with up to 5 cycles; order = DTP_2_DETAIL row, cycle = ORDER_CYCLE row (CYCLE_SEQ).', None),
 'G-DM-02': (f'{E}: order / cycle statuses of workflow.js (ORDER, CYCLE).', 'Register the statuses in ielp.MS_STATUS - data, no column change'),
 'G-DM-03': (f'{E}: status history with from / to status, role, reason, note (workflow.js log).', 'ADD ielp.LOG_ACTIVITY_ORDER.FROM_STS_CODE varchar(3), ROLE varchar(50)'),
 'G-DM-04': (f'{E}: FA flag, planned cycles and PO received date on the order.', 'ADD ielp.DTP_2_DETAIL.FA_FLAG varchar(1), PLANNED_CYCLE int; ADD ielp.ORDER_CYCLE.PO_RECEIVED_DATE datetime'),
 'G-DN-01': (f'{E}: deliveryId = No Cycle Order YYMMDDC2XXX999 (dn-rules.js); stored in ORDER_CYCLE.ORDER_CYCLE_ID varchar(20).', None),
 'G-TA-01': (f'{E}: LP Accept / Reject with reason (workflow.js:194, 202).', 'ADD ielp.DTP_2_DETAIL.LP_STATUS varchar(20), LP_REJECT_REASON varchar(500), LP_ACTION_BY varchar(500), LP_ACTION_DATE datetime'),
 'G-TA-02': (f'{E}: one active truck per order, every assign / change kept in an audit trail.', 'ADD ielp.ORDER_TRUCK_H.ACTION varchar(30), PREV_LICENSE_PLATE varchar(20), DRIVER_ID varchar(10)'),
 # ---- SA
 'G-SA-01': (f'{E}: SA number ILS/TR/<LP>/<YYMMDD><NNNN> up to 22 characters (sa-rules.js saNumber).', 'ALTER ielp.SA_DETAIL.SA_CODE and ielp.ORDER_CYCLE.SA_CODE varchar(16) -> varchar(25)'),
 'G-SA-02': (f'{E}: numeric KM / price / cost; stored as plain numbers in the existing varchar columns.', None),
 'G-SA-03': (f'{E}: Total KM, rate per KM and currency kept on the SA (sa-rules.js calculate).', 'ADD ielp.SA_DETAIL.TOTAL_KM decimal(9,2), RATE_PER_KM decimal(15,2), CURRENCY varchar(3)'),
 'G-SA-04': (f'{E}: SA statuses and types of sa-rules.js / sa-pas-rules.js.', 'Register code values (SA_HEADER.STATUS_CODE, SA_TYPE, SA_DETAIL.STATUS_CODE) - data, no column change'),
 'G-SA-05': (f'{E}: approval request (idempotent), SA sequence per scope and SA history.', 'CREATE TB_R_SA_APPROVAL_REQUEST, TB_M_SA_SEQUENCE, TB_H_SA (as specified in the UISS)'),
 'G-SAM-01': (f'{E}: interface tracking with correlation id, attempts, error code / message (sa-pas-rules.js).', 'ADD ielp.SA_DETAIL.CORRELATION_ID varchar(60), INTERFACE_ATTEMPT int, ERROR_CD varchar(30), ERROR_MSG varchar(500)'),
 'G-SAM-02': (f'{E}: VISION columns are not used by the TC-PBR logic.', None),
 # ---- Monthly
 'G-MO-01': (f'{E}: one PR per trucking company (PR_NO_DET) under the period PR (CRITERIA_SCORE_HEADER).', None),
 'G-MO-02': (f"{E}: approval levels SH / DpH / DH; stored as APPROVAL_CLASS values with APPROVAL_STS.", 'Register APPROVAL_CLASS / APPROVAL_STS values - data, no column change'),
 'G-MO-03': (f'{E}: approval history with from / to status, role, reason (monthly-workflow.js log).', 'CREATE ielp.TB_H_PR_PO_APPROVAL (DOC_TYPE, DOC_NO, ACTION, FROM_STATUS, TO_STATUS, ROLE, REASON, NOTE, CREATED_BY, CREATED_DT)'),
 'G-MO-04': (f'{E}: 3-letter trucking code shown = MS_TRUCKING_COMPANY.COMPANY_CODE (joined by COMPANY_ID).', None),
 'G-PO-01': (f'{E}: PO number created by ELIPS when DH approves the PR (monthly-workflow.js createPO); stored in PO_DETAIL.PO_NUMBER.', None),
 'G-PRC-01': (f'{E}: Monthly Fixed Cost PR and Route-Based PR as calculated in pr-creation-rules.js; stored in CRITERIA_SCORE_* (type in CRITERIA_SCORE_HEADER.BUSINESS_TYPE).', None),
 # ---- review-level items (07 EXTRA)
 'G-GEN-04': (f'{E}: optimistic lock by VERSION in every rule module.', 'VERSION columns as listed per table (DCR of G-MTC-03, G-MLC-04, G-MML-04, G-DTP-08)'),
 'G-MLC-05': (f'{E}: map and geocoding with Leaflet + OpenStreetMap / Nominatim as implemented (location.js); Google Maps of the reference screen TBD.', None),
 'G-DM-05': (f'{E}: legacy "+ Create DTP" dialog for IELP Admin stays in Daily Monitoring and is documented in its UISS.', None),
 'G-COM-01': (f'{E}: Master screens have no role restriction (any logged-in role); the "IELP Admin only" badge is informational.', None),
}
out, n = {}, 0
for k, (dec, dcr) in D.items():
    if dcr:
        n += 1
    out[k] = {'decision': dec, 'dcr': dcr, 'dcr_id': f'DCR-{n:02d}' if dcr else None}
json.dump(out, open('decisions.json', 'w'), indent=1)
print(len(out), 'decisions,', n, 'DCR')
