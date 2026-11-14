"""Mapping definitions for the Daily UISS (DTP, orders, truck assignment, delivery note). Links are Inferred
from names / structure; columns, types and lengths come from the ELIPS DDL. No sample data."""
import json
from maps_master import F, X, C, NOTBD, L, T
H, D, OC = 'ielp.DTP_HEADER', 'ielp.DTP_2_DETAIL', 'ielp.ORDER_CYCLE'
TR, DR, TH, LOG = 'ielp.MS_TRUCK_REGISTRATION', 'ielp.MS_DRIVER', 'ielp.ORDER_TRUCK_H', 'ielp.LOG_ACTIVITY_ORDER'
MAPS = {}
DTP_NOTE = 'DTP records are stored per DTP type in ielp.DTP_1_DETAIL .. DTP_4_DETAIL; the Universal DTP template columns (round use, booking no., shipping agent, ETD, arrival date / time) match ielp.DTP_2_DETAIL (inferred).'
rep_dtp = {'TB_R_DTP_RECORD': D, 'TB_H_DTP_RECORD_STS': LOG, 'Daily Order (TB_R_DAILY_ORDER, TBD)': OC, 'TB_R_DAILY_ORDER': OC, 'Daily Order Cycle (TBD)': OC,
  'Daily Order (TBD)': D, 'Daily Cycle (TBD)': OC, 'Cycle (TBD)': OC, 'TB_M_KPI': 'ielp.MS_KPI', 'Trucking Company Master (TBD)': T, 'Location Master (TBD)': L,
  'DTP_REC_ID': 'DTP_DET_ID', 'PLAN_DT': 'DTP_DATE', 'IO_TYPE': 'SERVICE_TYPE', 'ROUND_USE': 'IS_ROUNDUSE', 'LP_CD': 'COMPANY_ID', 'FROM_LOC_CD': 'FROM_LOC',
  'TO_LOC_CD': 'TO_LOC', 'ETD_DT': 'ETD', 'VESSEL_NAME': 'VESSEL', 'CTR_DG_FLAG': 'IS_DG', 'ARRIVAL_DT': 'ARRIVAL_DATE', 'DAILY_TRIP (TBD)': 'DAILY_TRIP (no column - Conflict)',
  'DAILY_TRIPS (TBD)': 'DAILY_TRIPS (no column - Conflict)', 'PAY_TYPE (proposed)': 'PAY_TYPE (proposed, no column in ELIPS - Conflict)',
  'CHANGED_BY': 'UPDATED_BY', 'CHANGED_DT': 'UPDATED_DATE', 'CREATED_DT': 'CREATED_DATE'}
def dtp_fields(prefix=''):
    return [F('Daily Plan Date', H, 'DTP_DATE', items=['Daily Plan Date'], mapping='Selected calendar date', note='date NOT NULL.'),
     F('DTP Model / type', H, 'DTP_TYPE', items=['DTP Model', 'Universal DTP card'], status='TBD', note='varchar(1); DTP 1-4 meaning TBD.'),
     F('DTP header status', H, 'DTP_STATUS', items=[], rw='W', status='TBD', note='varchar(100) NOT NULL; values TBD.'),
     F('Import / Export (Service Type)', D, 'SERVICE_TYPE', items=['Operation Type', 'Import/Export', 'Service Type'], note='varchar(5); UISS IO_TYPE.'),
     X('Exporter / Importer CD', items=['Exporter / Importer CD'], status='Conflict', note='No exporter / importer column in DTP_2_DETAIL (SOURCES varchar(10)? TBD).'),
     F('Round Use', D, 'IS_ROUNDUSE', items=['Round Use'], mapping="Y/N -> '1'/'0' (values TBD, default '0')"),
     F('LP (Trucking Company)', D, 'COMPANY_ID', items=['LP', 'Truck Company', 'Trucking Company'], mapping='MS_TRUCKING_COMPANY.COMPANY_ID (inferred)'),
     F('Renban', D, 'RENBAN', items=['Renban / Destination', 'Renban'], note='varchar(500).'),
     X('Destination', items=['Destination'], status='Conflict', note='No destination column in DTP_2_DETAIL (COUNTRY varchar(100)? TBD).'),
     F('From / To Location', D, 'FROM_LOC', items=['From / To Location', 'From'], note='varchar(10); TO_LOC same.'), F('To', D, 'TO_LOC', items=['To']),
     F('ETD', D, 'ETD', items=['ETD / Arrival Date', 'ETD']), F('Arrival Date', D, 'ARRIVAL_DATE', items=['Arr. Date']), F('Arrival Time', D, 'ARRIVAL_TIME', items=['Arr. Time'], note='varchar(10).'),
     F('Container Size', D, 'CTR_SIZE', items=['Container Size', 'Ctr Size'], status='Conflict', note="int; UI values like '40 HC' (HC -> CTR_TYPE varchar(10), inferred)."),
     F('Ctr Type', D, 'CTR_TYPE', items=['Ctr Type']),
     F('Shipping Agent', D, 'SHIPPING_AGENT', items=['Shipping Agent / Ctr Booking No / Vessel Name / Description', 'Agent']),
     F('Ctr Booking No', D, 'CTR_BOOKING_NO', items=['Ctr Book No'], note='varchar(50).'), F('Vessel', D, 'VESSEL', items=['Vessel']),
     F('Description', D, 'DESCRIPTION', items=['Description']), F('Truck Type', D, 'TRUCK_TYPE', items=['Truck Type'], note='varchar(5).'),
     F('Container No', D, 'CONTAINER_NO', items=['Container No'], status='Verified', note='varchar(11).'),
     F('Shift', D, 'SHIFT', items=['Shift / Ctr DG Flag / Arrival Time', 'Shift']), F('Ctr DG flag', D, 'IS_DG', items=['Ctr DG ?'], mapping="DG -> '1' (default '0')"),
     F('Record status', D, 'STATUS_CODE', items=['Status', 'Open / in queue badge'], status='Conflict', note='varchar(3); UISS STATUS text values (Ready to Submit, Queued, Processed, Failed ...) - codes TBD (MS_STATUS).'),
     F('Order No', D, 'ORDER_NO', items=['Order No', 'LP / Order No'], status='Conflict', note='varchar(20) NOT NULL and PK of DTP_2_DETAIL, while the UISS assigns it only at queue processing.'),
     X('Data Source (Excel / Manual / IPMS)', items=['Data Source', 'Received count'], status='TBD', note='No data-source column (SOURCES varchar(10)? TBD).'),
     X('Payment Type', items=['Payment Type (grid column)', 'Payment Type (Manual Entry / Edit)', 'Payment Type (DTP Maintenance)'], status='Conflict', note='No payment type column.'),
     F('Delete', D, 'IS_DELETE', items=[], rw='W', mapping="'1' on delete (default '0'; values TBD)", note='UISS physical delete vs ELIPS IS_DELETE flag.'),
     F('History', LOG, 'ACT', items=['History dialog'], rw='W/R', status='TBD', note='LOG_ACTIVITY_ORDER (ACT, STS_CODE, STS_MESSAGE, DTP_DET_ID, CRETED_DATE) inferred as status history.'),
     F('System parameters', 'ielp.TB_M_SYSTEM', 'SYS_VALUE', items=['System Master info'], rw='R', status='TBD', note='SYS_CAT / SYS_SUB_CAT / SYS_CD for back-date / advance days TBD.'),
     F('Daily order / cycle', OC, 'ORDER_NO', items=['Calendar entry', 'Driver Status'], rw='R', note='ORDER_CYCLE: one row per cycle (CYCLE_SEQ), STATUS_CODE, START_DATE.'),
     F('Order Sharing % (KPI)', 'ielp.CRITERIA_LAST_ORDER', 'ORDER_SHARING', items=['Order Sharing % (By Resources)', 'Order Sharing (By Trip %)'], rw='R', status='Conflict', note='Per period, not a master value.'),
     X('Daily Trip (KPI)', items=['Daily Trip (By Resources)', 'Sub title By Trip'], status='Conflict', note='No column.'),
     F('Uploaded file', 'ielp.DTP_FILES', 'FILE_NAME', items=[], rw='W', status='TBD', note='DTP_FILES (DTP_HEADER_ID, FILE_NAME, FILE_NEW_NAME) inferred for the uploaded Excel.')]
dtp_conf = [C('G-DTP-01', 'Record table', 'TB_R_DTP_RECORD (one table, all models)', 'DTP_HEADER + DTP_1..4_DETAIL per DTP type', 'Re-base on DTP_HEADER / DTP_n_DETAIL; confirm the DTP type of the Universal DTP'),
  C('G-DTP-02', 'Order number at creation', 'ORDER_NO assigned by queue processing', 'DTP_2_DETAIL.ORDER_NO NOT NULL, PK', 'Confirm when ORDER_NO is generated in ELIPS'),
  C('G-DTP-03', 'Payment type', 'PAY_TYPE per record (dtp-rules.js setPayType)', 'No column', 'DB change request'),
  C('G-DTP-04', 'Status values', 'Text statuses', 'STATUS_CODE varchar(3) + MS_STATUS', 'Map statuses to MS_STATUS codes (data needed)'),
  C('G-DTP-05', 'Exporter / Importer / Destination / Data source', 'Fields on the record', 'No matching columns', 'Confirm columns (COUNTRY, SOURCES?)'),
  C('G-DTP-06', 'Container size', "'40 HC' text", 'CTR_SIZE int + CTR_TYPE varchar(10)', 'Split size and type'),
  C('G-DTP-07', 'Delete', 'Physical delete', 'IS_DELETE flag', 'Soft delete with IS_DELETE'),
  C('G-DTP-08', 'Concurrency', 'VERSION', 'No VERSION column', 'Use UPDATED_DATE')]
MAPS['UISS_Screen_DTP_Creation'] = dict(
 revision='Database mapping revised to the ELIPS schema: DTP_HEADER + DTP_n_DETAIL (Universal DTP = DTP_2_DETAIL, inferred), ORDER_CYCLE, LOG_ACTIVITY_ORDER, TB_M_SYSTEM, DTP_FILES; proposed tables replaced; conflicts recorded (payment type, order no., status codes, KPI); no sample data',
 replace=rep_dtp, fields=dtp_fields(), conflicts=dtp_conf, tbd=[DTP_NOTE, 'DTP_HEADER_ID / DTP_DET_ID generation', 'MS_STATUS codes for DTP / order / cycle', 'TB_M_SYSTEM keys for back-date / advance days', 'IPMS interface source'])
MAPS['UISS_Batch_DTP_Excel_Upload'] = dict(
 revision='Database mapping revised: records -> ielp.DTP_2_DETAIL (definition from the ELIPS DDL), history -> ielp.LOG_ACTIVITY_ORDER (inferred); upload temp / log stay proposed (ELIPS has DTP_1_DETAIL_TMP / DTP_4_DETAIL_TMP for other DTP types, DTP_FILES for files); conflicts recorded; no sample data',
 replace=rep_dtp, fields=[f for f in dtp_fields() if f['ui'] in ('LP (Trucking Company)', 'Renban', 'From / To Location', 'ETD', 'Container No', 'Record status', 'Order No', 'Payment Type', 'Uploaded file', 'History')],
 conflicts=dtp_conf, tbd=[DTP_NOTE, 'Whether ELIPS uploads use DTP_n_DETAIL_TMP tables (exist for DTP 1 and 4 only)'])
MAPS['UISS_Batch_DTP_Queue_Processing'] = dict(
 revision='Database mapping revised: records -> ielp.DTP_2_DETAIL, daily order / cycle -> ielp.ORDER_CYCLE (one row per cycle), history -> ielp.LOG_ACTIVITY_ORDER (inferred); conflicts recorded; no sample data',
 replace=rep_dtp, fields=[F('Order No', OC, 'ORDER_NO', items=[], rw='W'), F('Cycle sequence', OC, 'CYCLE_SEQ', items=[], rw='W', note='varchar(2) NOT NULL.'),
  F('DTP header', OC, 'DTP_HEADER_ID', items=[], rw='W', note='NOT NULL.'), F('DTP detail', OC, 'DTP_DET_ID', items=[], rw='W'),
  F('Cycle status', OC, 'STATUS_CODE', items=[], rw='W', status='TBD', note='Codes TBD.'), F('Record status', D, 'STATUS_CODE', items=[], rw='W', status='Conflict'),
  X('Attempt count / fail reason', items=[], status='Conflict', note='No ATTEMPT_CNT / FAIL_REASON columns.'), F('Activity log', LOG, 'STS_CODE', items=[], rw='W', status='TBD')],
 conflicts=dtp_conf[:4] + [C('G-DTQ-01', 'Retry counters', 'ATTEMPT_CNT, FAIL_REASON', 'No columns', 'Keep in LOG_ACTIVITY_ORDER or add columns')],
 tbd=[DTP_NOTE, 'ORDER_CYCLE_ID / ORDER_NO generation', 'Planned cycles: one ORDER_CYCLE row created per cycle at start or all at once?'])
MAPS['UISS_Batch_DTP_Switching'] = dict(
 revision='Database mapping revised: rollback history -> ielp.ORDER_CYCLE_ROLLBACK_H (inferred), truck history -> ielp.ORDER_TRUCK_H, records -> ielp.DTP_2_DETAIL, orders -> ielp.ORDER_CYCLE; request / switch-audit / driver-sync queue tables stay proposed; no sample data',
 replace={**rep_dtp, 'TB_H_ORDER_ASSIGN': TH, 'TB_R_ORDER_TRUCK_ASSIGN': f'{D} (LICENSE_PLATE / DRIVER_ID)', 'Daily Order (TBD)': OC},
 fields=[F('Rollback history', 'ielp.ORDER_CYCLE_ROLLBACK_H', 'ROLLBACK_REMARKS', items=[], rw='W', status='TBD', note='ROLLBACK_ID, ORDER_CYCLE_ID, CURR_STATUS_CODE, ROLLBACK_BY / DATE.'),
  F('Truck history', TH, 'LICENSE_PLATE', items=[], rw='W'), F('Released truck', D, 'LICENSE_PLATE', items=[], rw='W', mapping='Cleared on rollback (inferred)'),
  F('Order cancel', OC, 'CANCEL_REMARKS', items=[], rw='W', note='CANCEL_DATE, CANCEL_REMARKS exist; UISS CANCEL_FLAG / CANCEL_BY proposed.'),
  X('Switch request / audit', items=[], status='Missing', note='TB_R_DTP_SWITCH_REQ, TB_H_DTP_SWITCH proposed.')],
 conflicts=dtp_conf[:2] + [C('G-DTS-01', 'Cancel columns', 'CANCEL_FLAG / CANCEL_BY proposed', 'ORDER_CYCLE.CANCEL_DATE, CANCEL_REMARKS (no cancel-by)', 'Use existing columns; IS_DELETE for cancelled orders?')],
 tbd=['Is "DTP Switching" the same as ELIPS rollback (ORDER_CYCLE_ROLLBACK_H)?'])
MAPS['UISS_Batch_Driver_Order_Sync'] = dict(
 revision='Database review: sync / outbox / log tables are proposed (not in ELIPS); read side mapped to ielp.ORDER_CYCLE, DTP_n_DETAIL, MS_DRIVER, MS_LOCATION, MS_TRUCKING_COMPANY; ELIPS driver push uses TB_M_DRIVER.FIREBASE_TOKEN / DEVICE_ID (existing mechanism TBD); no sample data',
 replace={'Daily Cycle (TBD)': OC, 'Location Master (TBD)': L, 'System Master (TBD)': 'ielp.TB_M_SYSTEM', 'TB_R_DTP_RECORD': D, 'TB_R_ORDER_TRUCK_ASSIGN': f'{D} (LICENSE_PLATE / DRIVER_ID)',
   'CYCLE_ORDER_NO (TBD)': 'ORDER_CYCLE_ID (inferred)', 'CYCLE_SEQ (TBD)': 'CYCLE_SEQ', 'DRIVER_NAME (TBD)': 'DRIVER_NAME', 'PLATE_NO (TBD)': 'LICENSE_PLATE',
   'FROM_LOC_CD (TBD)': 'FROM_LOC', 'TO_LOC_CD (TBD)': 'TO_LOC', 'LP_NAME (TBD)': 'COMPANY_NAME', 'STATUS (TBD)': 'STATUS_CODE'},
 fields=[F('Cycle order', OC, 'ORDER_CYCLE_ID', items=[], rw='R'), F('Plate', OC, 'LICENSE_PLATE', items=[], rw='R'), F('Driver', DR, 'DRIVER_NAME', items=[], rw='R'),
  F('Location name / coordinates', L, 'LOCATION_NAME', items=[], rw='R'), F('Driver device token', 'ielp.TB_M_DRIVER', 'FIREBASE_TOKEN', items=[], rw='R', status='TBD', note='Existing ELIPS push mechanism?'),
  X('Sync tables', items=[], status='Missing', note='TB_T_DRIVER_SYNC_QUEUE, TB_R_DRIVER_ORDER, TB_R_DRIVER_MQ_OUTBOX, TB_R_DRIVER_SYNC_LOG proposed.')],
 conflicts=[C('G-DRV-01', 'Sync mechanism', 'HiveMQ outbox (proposed tables)', 'No sync tables; TB_M_DRIVER has FIREBASE_TOKEN / DEVICE_ID', 'Confirm the existing driver app channel before building')],
 tbd=['MS_DRIVER vs TB_M_DRIVER as driver master'])

rep_dm = {'Daily Order Status History (TBD)': LOG, 'Daily Order Cycle (TBD)': OC, 'Daily Order (TBD)': D, 'Daily Cycle (TBD)': OC, 'Location Master (TBD)': L,
  'Truck Master (TBD)': TR, 'Driver Master (TBD)': DR, 'Master Driver (TBD)': DR, 'Master Trucking Company (TBD)': T, 'Service Acceptance (TBD)': 'ielp.SA_DETAIL',
  'ORDER_NO (TBD)': 'ORDER_NO', 'DTP_TYPE (TBD)': 'DTP_TYPE (DTP_HEADER)', 'SUPPLIER_CD (TBD)': 'COMPANY_ID', 'TRUCK_NO (TBD)': 'LICENSE_PLATE', 'FROM_LOC (TBD)': 'FROM_LOC',
  'TO_LOC (TBD)': 'TO_LOC', 'RENBAN (TBD)': 'RENBAN', 'SHIFT (TBD)': 'SHIFT', 'FA_FLAG (TBD)': 'FA flag (no column - TBD)', 'CYCLE_NO (TBD)': 'CYCLE_SEQ', 'CYCLE_STATUS (TBD)': 'STATUS_CODE',
  'CONTAINER_NO (TBD)': 'CONTAINER_NO', 'ORDER_STATUS (TBD)': 'STATUS_CODE', 'START_DT (TBD)': 'START_DATE', 'PICKUP_DT (TBD)': 'PICKUP_DATE', 'FINISH_DT (TBD)': 'COMPLETE_DATE',
  'DRIVER_ID (TBD)': 'DRIVER_ID', 'SA_APPROVED_DT (TBD)': 'SA approval date (SA_DETAIL.APPROVED_DATE, inferred)', 'PO_NO (TBD)': 'PO_NUMBER', 'PO_RECEIVED_DT (TBD)': 'PO received date (no column - TBD)',
  'UPDATED_BY (TBD)': 'UPDATED_BY', 'UPDATED_DT (TBD)': 'UPDATED_DATE', 'CREATED_BY (TBD)': 'CREATED_BY', 'CREATED_DT (TBD)': 'CREATED_DATE', 'CYCLE_ORDER_NO (TBD)': 'ORDER_CYCLE_ID (inferred)',
  'PLANNED_CYCLE (TBD)': 'planned cycles (no column - TBD)', 'LOCATION_NAME (TBD)': 'LOCATION_NAME', 'ORDER_DATE (TBD)': 'ORDER_DATE', 'ACTION (TBD)': 'ACT', 'REASON (TBD)': 'REMARK',
  'NOTE (TBD)': 'STS_MESSAGE', 'TO_STATUS (TBD)': 'STS_CODE', 'FROM_STATUS (TBD)': 'from status (no column - TBD)', 'ROLE (TBD)': 'role (no column - TBD)', 'File storage (TBD)': 'ielp.ORDER_FILES'}
dm_fields = [F('Date', OC, 'ORDER_DATE', items=['Date', 'Date / Shift'], rw='R', note='date; DTP_HEADER.DTP_DATE for the plan date.'),
  F('No. Order', OC, 'ORDER_NO', items=['No. Order', 'Order / current status'], rw='R'), F('Type (DTP 1-4)', H, 'DTP_TYPE', items=['Type', 'Type / Renban'], rw='R', status='TBD'),
  F('Trucking Comp.', OC, 'COMPANY_ID', items=['Trucking Comp.', 'Trucking Company'], rw='R', mapping='Name from MS_TRUCKING_COMPANY'),
  F('License Plate', OC, 'LICENSE_PLATE', items=['License Plate', 'Police No'], rw='R/W'), F('Driver', OC, 'DRIVER_ID', items=['Driver'], rw='R/W', mapping='Name from MS_DRIVER'),
  F('From / To', OC, 'FROM_LOC', items=['DTP Loc. From', 'From Loc.', 'Route From -> To'], rw='R'), F('To', OC, 'TO_LOC', items=['DTP Loc. To', 'To Loc.'], rw='R'),
  F('Renban', OC, 'RENBAN', items=['Renban'], rw='R'), F('Shift', OC, 'SHIFT', items=['Shift'], rw='R'), X('FA', items=['FA'], note='No FA flag column (PO_NUMBER_FA?).'),
  F('Cycle status', OC, 'STATUS_CODE', items=['Cycle 1 - Cycle 5', 'Cycle Status', 'CYCLE n + Cycle Status', 'Order Status'], rw='R/W', status='TBD', note='Codes via MS_STATUS (data needed).'),
  F('Cycle sequence', OC, 'CYCLE_SEQ', items=['Order No (cycle)'], rw='R'), F('Container No', OC, 'CONTAINER_NO', items=['Container No', 'Container Number'], rw='R/W', status='Verified'),
  F('Start / Pick Up / Finish', OC, 'START_DATE', items=['Activity List: Start Cycle / Pick Up / Finish Cycle'], rw='W', note='PICKUP_DATE, COMPLETE_DATE; *_BY_LP flags, lat / long, geofence flags also exist.'),
  F('SA approved', 'ielp.SA_DETAIL', 'APPROVED_DATE', items=['SA Approved'], rw='R', status='TBD'), F('PO Number', OC, 'PO_NUMBER', items=['PO Number'], rw='R/W'),
  X('Planned / Actual Cycle', items=['Planned / Actual Cycle'], note='No planned-cycle column; actual = count of ORDER_CYCLE rows.'),
  F('Files', 'ielp.ORDER_FILES', 'FILE_NAME', items=['Files: Foto Surat Jalan / Finish Cycle Foto + View'], rw='R', note='FILE_TYPE, FILE_PATH.'),
  F('Status history', LOG, 'ACT', items=['Status History grid'], rw='R/W', status='TBD', note='Inferred; columns ACT, STS_CODE, STS_MESSAGE, REMARK, CREATED_BY, CRETED_DATE.'),
  F('Truck Number (picker)', TR, 'LICENSE_PLATE', items=['Truck Number'], rw='R', note='STNK_EXPIRED for license check.'), F('Driver (picker)', DR, 'DRIVER_ID', items=[], rw='R', note='DRIVER_LICENSE_EXPIRED.'),
  F('Truck change history', TH, 'LICENSE_PLATE', items=[], rw='W', note='ORDER_TRUCK_H: ORDER_NO, LICENSE_PLATE, REMARK.'), X('Reason (release / reject)', items=['Reason'], note='LOG_ACTIVITY_ORDER.REMARK or ORDER_REMARK (inferred).')]
MAPS['UISS_Screen_Daily_Order_Monitoring'] = dict(
 revision='Database mapping revised to the ELIPS schema: orders / cycles = ielp.ORDER_CYCLE (+ DTP_HEADER / DTP_n_DETAIL), history = LOG_ACTIVITY_ORDER (inferred), files = ORDER_FILES, truck history = ORDER_TRUCK_H, masters MS_TRUCK_REGISTRATION / MS_DRIVER / MS_LOCATION; conflicts recorded; no sample data',
 replace=rep_dm, fields=dm_fields,
 conflicts=[C('G-DM-01', 'Order vs cycle', 'Daily Order + Daily Order Cycle tables', 'ORDER_CYCLE (one row per cycle) + DTP_n_DETAIL (order)', 'Order-level status = latest cycle / DTP_n_DETAIL.STATUS_CODE (confirm)'),
  C('G-DM-02', 'Status codes', 'Text statuses (Planning Order, Order Release, ...)', 'STATUS_CODE varchar(3), MS_STATUS', 'Map with MS_STATUS data'),
  C('G-DM-03', 'Status history columns', 'FROM_STATUS, ROLE, REASON', 'LOG_ACTIVITY_ORDER has ACT, STS_CODE, REMARK only', 'Confirm the history table'),
  C('G-DM-04', 'FA / planned cycle / PO received date', 'Columns on the order', 'No columns', 'Confirm source')],
 tbd=['MS_STATUS codes (order, cycle)', 'Which DTP_n_DETAIL per DTP type', 'Accept / reject by LP storage'])
MAPS['UISS_Report_Download_Daily_Order_Monitoring'] = dict(
 revision='Database mapping revised: report items sourced from ielp.ORDER_CYCLE, DTP_HEADER, MS_TRUCKING_COMPANY, MS_DRIVER, MS_LOCATION, SA_DETAIL; FA and PO received date TBD; no sample data',
 replace={**rep_dm, 'Order Date (TBD)': 'ORDER_DATE', 'Order No. (TBD)': 'ORDER_NO', 'DTP Type (TBD)': 'DTP_TYPE', 'Company Name (TBD)': 'COMPANY_NAME', 'Truck Plate (TBD)': 'LICENSE_PLATE',
   'Driver Name (TBD)': 'DRIVER_NAME (MS_DRIVER)', 'From Location Name (TBD)': 'LOCATION_NAME (FROM_LOC)', 'To Location Name (TBD)': 'LOCATION_NAME (TO_LOC)', 'Renban (TBD)': 'RENBAN', 'Shift (TBD)': 'SHIFT',
   'FA (TBD)': 'FA (no column - TBD)', 'Cycle Status (TBD)': 'STATUS_CODE', 'Container No. (TBD)': 'CONTAINER_NO', 'Order Status (TBD)': 'STATUS_CODE', 'SA Approved Date (TBD)': 'APPROVED_DATE (SA_DETAIL, inferred)',
   'PO Number from PAS (TBD)': 'PO_NUMBER', 'Finish / Pick Up / Start time (TBD)': 'COMPLETE_DATE / PICKUP_DATE / START_DATE', 'Daily Order / Master Location (TBD)': f'{OC} / {L}'},
 fields=[F('Date', OC, 'ORDER_DATE', items=['Date'], rw='R'), F('No. Order', OC, 'ORDER_NO', items=['No. Order'], rw='R'), F('Type', H, 'DTP_TYPE', items=['Type'], rw='R', status='TBD'),
  F('Trucking Comp.', T, 'COMPANY_NAME', items=['Trucking Comp.'], rw='R'), F('License Plate', OC, 'LICENSE_PLATE', items=['License Plate'], rw='R'), F('Driver', DR, 'DRIVER_NAME', items=['Driver'], rw='R'),
  F('DTP Loc. From / To', L, 'LOCATION_NAME', items=['DTP Loc. From', 'DTP Loc. To'], rw='R'), F('Renban', OC, 'RENBAN', items=['Renban'], rw='R'), F('Shift', OC, 'SHIFT', items=['Shift'], rw='R'),
  X('FA', items=['FA']), F('Cycle n - Time', OC, 'START_DATE', items=['Cycle n - Time'], rw='R', note='Latest of START / PICKUP / COMPLETE_DATE.'), F('Cycle n - Status', OC, 'STATUS_CODE', items=['Cycle n - Status', 'Order Status'], rw='R', status='TBD'),
  F('Cycle n - Container', OC, 'CONTAINER_NO', items=['Cycle n - Container No.'], rw='R'), F('SA Approved At', 'ielp.SA_DETAIL', 'APPROVED_DATE', items=['SA Approved At'], rw='R', status='TBD'), F('PO Number', OC, 'PO_NUMBER', items=['PO Number'], rw='R')],
 conflicts=[], tbd=['Status names from MS_STATUS', 'FA flag source'])
MAPS['UISS_Report_Delivery_Note'] = dict(
 revision='Database mapping revised: Surat Jalan items sourced from ielp.ORDER_CYCLE (cycle = delivery), MS_DRIVER, MS_LOCATION, SA_DETAIL; deliveryId mapped to ORDER_CYCLE_ID (inferred); KETERANGAN, logo, stamp TBD; no sample data',
 replace={'Daily Order (TBD)': OC, 'Daily Cycle (TBD)': OC, 'Master Driver (TBD)': DR, 'Service Acceptance (TBD)': 'ielp.SA_DETAIL', 'Daily Cycle / Master Location (TBD)': f'{OC} / {L}',
   'Driver Name (TBD)': 'DRIVER_NAME (MS_DRIVER by DRIVER_ID)', 'Phone (TBD)': 'MOBILE_PHONE', 'License Plate (TBD)': 'LICENSE_PLATE', 'Start Cycle date-time (TBD)': 'START_DATE', 'SA Number (TBD)': 'SA_CODE',
   'No. Order (TBD)': 'ORDER_NO', 'Cycle Order No. (TBD)': 'ORDER_CYCLE_ID (inferred)', 'Cycle Sequence (TBD)': 'CYCLE_SEQ', 'From Location Code - Name (TBD)': 'FROM_LOC + LOCATION_NAME',
   'To Location Code - Name (TBD)': 'TO_LOC + LOCATION_NAME', 'Container No. (TBD)': 'CONTAINER_NO'},
 fields=[F('Nama (driver)', DR, 'DRIVER_NAME', items=['Nama'], rw='R', note='by ORDER_CYCLE.DRIVER_ID.'), F('No. Telp', DR, 'MOBILE_PHONE', items=['No. Telp'], rw='R', status='TBD', note='PHONE or MOBILE_PHONE?'),
  F('No Polisi', OC, 'LICENSE_PLATE', items=['No Polisi'], rw='R'), F('Tanggal', OC, 'START_DATE', items=['Tanggal'], rw='R'), F('SA Number', OC, 'SA_CODE', items=['SA Number'], rw='R', note='varchar(16); also SA_DETAIL.SA_CODE.'),
  F('No Order', OC, 'ORDER_NO', items=['No Order'], rw='R'), F('No Cycle Order (deliveryId)', OC, 'ORDER_CYCLE_ID', items=['No Cycle Order'], rw='R', status='TBD', note='varchar(20); format YYMMDDC2XXX999 to confirm.'),
  F('Cycle', OC, 'CYCLE_SEQ', items=['Cycle'], rw='R'), F('Lokasi Asal / Tujuan', L, 'LOCATION_NAME', items=['LOKASI ASAL', 'LOKASI TUJUAN'], rw='R'), F('CTR NO', OC, 'CONTAINER_NO', items=['CTR NO'], rw='R'),
  X('KETERANGAN', items=['KETERANGAN']), F('Delivery note file / GR attachment', 'ielp.ORDER_FILES', 'FILE_PATH', items=[], rw='W', status='TBD', note='Attachment record table TBD.')],
 conflicts=[C('G-DN-01', 'deliveryId', 'No Cycle Order YYMMDDC2XXX999', 'ORDER_CYCLE_ID varchar(20) PK (format unknown)', 'Confirm the cycle order number field')],
 tbd=['KETERANGAN source', 'Logo / stamp images', 'PAS GR attachment record'])
MAPS['UISS_Screen_Planning_Truck_Assignment'] = dict(
 revision='Database mapping revised: orders = ielp.ORDER_CYCLE / DTP_2_DETAIL (LICENSE_PLATE, DRIVER_ID), truck history = ielp.ORDER_TRUCK_H, trucks = MS_TRUCK_REGISTRATION, drivers = MS_DRIVER; LP accept / reject and assignment table have no ELIPS columns (conflicts); no sample data',
 replace={'TB_R_DAILY_ORDER (TBD)': OC, 'TB_R_DAILY_ORDER': OC, 'TB_R_ORDER_TRUCK_ASSIGN (proposed)': f'{D} (LICENSE_PLATE / DRIVER_ID; no assignment table)', 'TB_H_ORDER_ASSIGN (proposed)': TH,
   'Truck Master (TBD)': TR, 'PLATE_NO': 'LICENSE_PLATE', 'ORDER_DT': 'ORDER_DATE', 'CHANGED_BY': 'UPDATED_BY', 'CHANGED_DT': 'UPDATED_DATE'},
 fields=[F('Order list', OC, 'ORDER_NO', items=['DTP / Order Number', 'Calendar entry', 'Order Detail'], rw='R'), F('Delivery Date', OC, 'ORDER_DATE', items=['Delivery Date'], rw='R'),
  F('Trucking Company', OC, 'COMPANY_ID', items=['Trucking Company'], rw='R'), F('Origin / Destination', OC, 'FROM_LOC', items=['Origin / Destination'], rw='R'), F('Truck Type', OC, 'TRUCK_TYPE', items=['Truck Type'], rw='R'),
  F('Truck picker', TR, 'LICENSE_PLATE', items=['Truck', 'Truck picker'], rw='R', note='TRUCK_TYPE, STNK_EXPIRED, DRIVER_ID.'), F('Assigned plate', D, 'LICENSE_PLATE', items=['Assign To', 'Assigned License Plate / Driver', 'Current truck'], rw='W', note='Also ORDER_CYCLE.LICENSE_PLATE.'),
  F('Assigned driver', D, 'DRIVER_ID', items=[], rw='W'), F('Audit trail', TH, 'LICENSE_PLATE', items=['Audit Trail'], rw='W/R', status='Conflict', note='ORDER_TRUCK_H has ORDER_NO, LICENSE_PLATE, REMARK, UPDATED_BY, CREATED_DATE only (no action / prev status).'),
  X('LP status (accept / reject)', items=['Order Status', 'Order Status / Assignment'], status='Conflict', note='No LP status column.'), X('Reject Reason', items=['Reject Reason'], status='Conflict', note='ORDER_REMARK (inferred) or no column.'),
  X('Seal No', items=['Seal No'], status='TBD', note='SEAL_NO exists in ORDER_CYCLE / DTP_2_DETAIL.')],
 conflicts=[C('G-TA-01', 'LP accept / reject', 'LP_STATUS, LP_REJECT_REASON', 'No columns', 'Confirm storage (ORDER_REMARK? new columns)'),
  C('G-TA-02', 'Assignment table', 'TB_R_ORDER_TRUCK_ASSIGN with active flag', 'Plate / driver directly on DTP_n_DETAIL / ORDER_CYCLE, history in ORDER_TRUCK_H', 'Use existing columns; ORDER_TRUCK_H as history')],
 tbd=['Seal No source (SEAL_NO columns exist)', 'Truck maintenance status source'])
for k, v in MAPS.items():
    json.dump({'uiss': k, **v}, open(f'{k}.json', 'w'), indent=1)
print('written', len(MAPS))
