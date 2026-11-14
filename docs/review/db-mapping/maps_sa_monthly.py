"""Mapping definitions for SA, Monthly PR / PO and PAS interface UISS. Links Inferred from names / structure; columns from the DDL."""
import json
from maps_master import F, X, C, NOTBD, L, T, M, P, RH, RD
SH, SD, SW, WB, LP = 'ielp.SA_HEADER', 'ielp.SA_DETAIL', 'ielp.SA_WBS_PERCENTAGE', 'ielp.MS_WBS', 'ielp.LOG_ITGPAS'
OC, D = 'ielp.ORDER_CYCLE', 'ielp.DTP_2_DETAIL'
CH, CF, CR, CA = 'ielp.CRITERIA_SCORE_HEADER', 'ielp.CRITERIA_SCORE_DETAIL_FINAL', 'ielp.CRITERIA_SCORE_DETAIL_ROUTE', 'ielp.CRITERIA_SCORE_APPROVAL'
PH, PD, PA, PE = 'ielp.PO_HEADER', 'ielp.PO_DETAIL', 'ielp.PO_APPROVAL', 'ielp.PO_APPROVAL_EST'
MAPS = {}
rep_sa = {'TB_R_SA_HEADER - PAS block (proposed)': f'{SD} (PAS_* columns)', 'TB_R_SA_HEADER (proposed)': SH, 'TB_R_SA_DETAIL (proposed)': SD, 'TB_R_SA_HEADER': SH, 'TB_R_SA_DETAIL': SD,
  'TB_H_SA_INTERFACE (proposed)': f'{LP} (inferred)', 'TB_R_SA_PAS_OUTBOX (proposed)': 'PAS outbox (proposed, not in ELIPS)', 'TB_H_SA (proposed)': 'SA history (proposed, not in ELIPS)',
  'TB_R_SA_APPROVAL_REQUEST (proposed)': 'SA approval request (proposed, not in ELIPS)', 'TB_M_SA_SEQUENCE (proposed)': 'SA sequence (proposed, not in ELIPS)',
  'TB_R_DAILY_ORDER (TBD)': OC, 'TB_R_DTP_RECORD': D, 'Daily Cycle (TBD)': OC, 'Trucking Company Master (TBD)': T, 'Master Mileage (TBD)': M,
  'WBS Consumption Master (TBD)': f'{WB} / {SW}', 'Daily order history (TBD)': 'ielp.LOG_ACTIVITY_ORDER (inferred)', 'PO / PR (Monthly, TBD)': f'{PD} / {CF}', 'PO (Monthly, TBD)': PD, 'PO (TBD)': f'{PD} / {P} (rate, inferred)'}
sa_conf = [C('G-SA-01', 'SA number length', 'SA_NO Char 22 (sa-rules.js saNumber)', 'SA_CODE varchar(16); SA_HEADER_ID varchar(20)', 'Shorten the SA number format or widen SA_CODE (DB change request)'),
  C('G-SA-02', 'Amounts as text', 'Numeric KM / price / cost', 'SA_DETAIL.PRICE, TOTAL_PRICE varchar(100); TOTAL_TRIP varchar(10); SA_HEADER.SA_TOTAL varchar(5)', 'Store numbers as text with fixed format or change types'),
  C('G-SA-03', 'Total KM / rate per KM', 'TOTAL_KM, RATE_PER_KM, CURRENCY on SA', 'No such columns (ROUTE_PRICE_ID -> MS_ROUTE_PRICE)', 'Derive from MS_ROUTE_PRICE / TB_M_MILEAGE'),
  C('G-SA-04', 'Status codes', 'Text statuses', 'SA_HEADER.STATUS_CODE varchar(1), SA_DETAIL.STATUS_CODE varchar(2), SA_TYPE varchar(1)', 'Code values TBD')]
MAPS['UISS_Screen_SA_Approval'] = dict(
 revision='Database mapping revised to the ELIPS schema: SA = ielp.SA_HEADER / SA_DETAIL (SA_CODE), orders = ORDER_CYCLE (SA_CODE) and DTP_n_DETAIL (IS_SA), rate = MS_ROUTE_PRICE (inferred), monthly PO = PO_DETAIL; proposed request / sequence / history tables flagged; conflicts recorded; no sample data',
 replace={**rep_sa, 'SA_NO': 'SA_CODE', 'ORDER_DT': 'ORDER_DATE', 'LP_CD': 'COMPANY_ID', 'PO_NO': 'PO_NUMBER', 'CHANGED_BY': 'UPDATED_BY', 'CHANGED_DT': 'UPDATED_DATE', 'CREATED_DT': 'CREATED_DATE'},
 fields=[F('Order Number / Date', OC, 'ORDER_NO', items=['Order Number', 'Order Date', 'Delivery info'], rw='R'), F('DTP Type', 'ielp.DTP_HEADER', 'DTP_TYPE', items=['DTP Type'], rw='R', status='TBD'),
  F('Truck Company', T, 'COMPANY_NAME', items=['Truck Company'], rw='R'), F('PO Number', SD, 'PO_NUMBER', items=['PO Number', 'PO Number / PR Number'], rw='R/W', note='varchar(100); PO_DETAIL.PO_NUMBER varchar(16).'),
  X('PO Validity / Currency', items=['PO Validity', 'Currency', 'Price / Currency'], status='TBD', note='No validity / currency on SA; MS_ROUTE_PRICE.VALID_DT_FROM / TO, ROUTE_PRICE_CURRENCY (inferred).'),
  F('CTR Size', SD, 'CTR_SIZE', items=['CTR Size'], rw='W', note='varchar(2).'), F('Total KM', M, 'MILEAGE', items=['Total KM'], rw='R', status='Conflict', note='Sum of route mileage; no column on SA.'),
  F('Rate / KM', P, 'ROUTE_PRICE_VALUE', items=['Rate / KM'], rw='R', status='TBD'), F('Price (cost)', SD, 'TOTAL_PRICE', items=['Price'], rw='W', status='Conflict', note='varchar(100).'),
  F('Order Route', SD, 'ORDER_ROUTE', items=['Order Route'], rw='W', note='varchar(100).'), F('Cycle route', OC, 'FROM_LOC', items=['Cycle n - Order Cycle (n = 1..5)'], rw='R'),
  F('SA number', SD, 'SA_CODE', items=[], rw='W', status='Conflict', note='varchar(16) vs 22-char SA number.'), F('SA header', SH, 'SA_HEADER_ID', items=[], rw='W', note='+ SA_PERIODE, COMPANY_ID, PO_NUMBER, SA_TYPE, STATUS_CODE.'),
  F('Approved by / date', SD, 'APPROVED_BY', items=[], rw='W'), F('Order flag', OC, 'SA_CODE', items=[], rw='W', mapping='SA number written to the cycle'), F('DTP flag', D, 'IS_SA', items=[], rw='W', mapping="'1' when SA approved (inferred)"),
  F('Production Month (monthly)', CH, 'CRITERIA_PERIODE', items=['Production Month'], rw='R', note='varchar(7).'), F('PO status (monthly)', PH, 'APPROVAL_STS', items=['PO Status / PO Released'], rw='R', status='TBD'),
  F('SA type', SH, 'SA_TYPE', items=[], rw='W', status='TBD', note='varchar(1): daily / monthly values TBD.')],
 conflicts=sa_conf + [C('G-SA-05', 'Approval request / sequence / history', 'TB_R_SA_APPROVAL_REQUEST, TB_M_SA_SEQUENCE, TB_H_SA', 'Not in ELIPS', 'Confirm whether needed (DB change request)')],
 tbd=['SA_HEADER_ID / SA_DETAIL_ID generation', 'STATUS_CODE / SA_TYPE values', 'SA_ROUTE_PRICE_TMP use (route price per order)'])
MAPS['UISS_Screen_SA_Monitoring'] = dict(
 revision='Database mapping revised to the ELIPS schema: SA = ielp.SA_HEADER / SA_DETAIL, PAS status = SA_DETAIL.PAS_* columns, interface log = LOG_ITGPAS (inferred), WBS = SA_WBS_PERCENTAGE / MS_WBS; proposed outbox / history tables flagged; no sample data',
 replace={**rep_sa, 'SA_NO': 'SA_CODE', 'SA_DET_NO': 'SA_DETAIL_ID', 'ORDER_DT': 'ORDER_DATE', 'LP_CD': 'COMPANY_ID', 'PAS_PR_NO': 'PAS_PR_NUMBER', 'PAS_PO_NO': 'PAS_PO_NUMBER', 'PAS_PR_DT': 'PAS_PR_DATE', 'INTERFACE_STS': 'PAS_STATUS',
   'APPROVED_DT': 'APPROVED_DATE', 'PO_NO': 'PO_NUMBER'},
 fields=[F('SA No', SD, 'SA_CODE', items=['SA No', 'SA Number / SA Approval Date / Approved By', 'A. SA Information'], rw='R', status='Conflict', note='varchar(16) vs Char 22.'),
  F('SA Type', SH, 'SA_TYPE', items=['SA Type'], rw='R', status='TBD'), F('SA Det No', SD, 'SA_DETAIL_ID', items=['SA Det No'], rw='R'), F('Delivery No / Date', SD, 'DTP_DET_ID', items=['Delivery No / Delivery Date', 'C. Delivery Information'], rw='R', note='Order via DTP_DET_ID / ORDER_CYCLE (inferred).'),
  F('Truck Company', SH, 'COMPANY_ID', items=['Truck Company', 'B. Trucking Information', 'Truck Company / Delivery Count / Total KM / Total Cost / Currency'], rw='R'),
  F('PAS PR / PO No / PR Date', SD, 'PAS_PR_NUMBER', items=['PAS PR No / PAS PO No / PAS PR Date', 'PAS PR Number / PAS PR Date / PAS PO Number', 'E. PAS Information'], rw='R', note='PAS_PO_NUMBER varchar(20), PAS_PR_DATE / PAS_PO_DATE date.'),
  F('Interface Status', SD, 'PAS_STATUS', items=['Interface Status', 'Interface Status / Feedback / Last Update'], rw='R/W', status='TBD', note='IS_PAS, PAS_CREATED_DATE, IS_PAS_CALLBACK, PAS_CALLBACK_STATUS, PAS_CALLBACK_DATE.'),
  F('Route Code', SD, 'ROUTE_HEADER_ID', items=['Route Code'], rw='R', note='Route via MS_ROUTE_HEADER (inferred).'), F('Ctr Size', SD, 'CTR_SIZE', items=['Ctr Size'], rw='R'),
  X('Total KM / Rate / Currency', items=['Total KM', 'ELIPS PO No / Rate / KM / Currency', 'D. Cost Calculation'], status='Conflict', note='No KM / rate / currency columns on SA.'),
  F('Price', SD, 'TOTAL_PRICE', items=['Price'], rw='R', status='Conflict', note='varchar(100).'), F('WBS %', SW, 'WBS_PERCENTAGE', items=['WBS Consumption Master (Percentage) CS..CI'], rw='R', note='varchar(20); WBS_COST varchar(100).'),
  F('Approval Date', SD, 'APPROVED_DATE', items=['Approval Date'], rw='R'), F('Integration log', LP, 'STS_CODE', items=['F. Integration Information', 'G. Audit Information + event log', 'Event table'], rw='R/W', status='TBD', note='LOG_ITGPAS: ACT, PARAM_REQ / RES, STS_CODE, STS_MESSAGE; SA_DETAIL.LOG_ITG_SEND_ID / LOG_ITG_CALLBACK_ID.')],
 conflicts=sa_conf + [C('G-SAM-01', 'Interface tracking', 'CORRELATION_ID, INTERFACE_ATTEMPT, FEEDBACK_STS, ERROR_CD on SA header', 'SA_DETAIL PAS_* per detail; log in LOG_ITGPAS', 'Track per SA_DETAIL; attempts / correlation id TBD'),
  C('G-SAM-02', 'VISION columns', '-', 'SA_DETAIL.IS_VISION / VISION_* exist', 'Meaning TBD (other interface?)')],
 tbd=['PAS_STATUS values', 'Meaning of VISION_* columns', 'Monthly SA detail (fixed cost) rows in SA_DETAIL'])

rep_mo = {'PR Header (TBD)': CF, 'PR Route Detail (TBD)': CR, 'PR Approval (TBD)': CA, 'PO Header (TBD)': PH, 'Trucking Master (TBD)': T, 'Trucking Company Master (TBD)': T,
  'Approval History (TBD)': 'approval history (no ELIPS table - TBD)', 'PR History (TBD)': 'PR history (no ELIPS table - TBD)', 'PR Detail (TBD)': CR,
  'E-Catalogue Price / Master Price (TBD)': P, 'Master Price (TBD)': P, 'TMMIN Calendar (TBD)': 'ielp.TB_M_WORKING_CALENDAR', 'Route Percentage Master (TBD)': RH, 'KPI Master (TBD)': 'ielp.MS_KPI',
  'PROD_MONTH, PR_SEQ (TBD)': 'CRITERIA_PERIODE, PR_SEQ', 'PR_NO (TBD)': 'PR_NO_DET', 'PR_SEQ (TBD)': 'PR_SEQ', 'TRUCKING_CD (TBD)': 'COMPANY_ID', 'TRUCKING_NAME (TBD)': 'COMPANY_NAME',
  'SHARING_PCT (TBD)': 'TOTAL_ORDER_SHARING', 'TOTAL_QTY (TBD)': 'TOTAL_TRIP', 'TOTAL_PRICE (TBD)': 'TOTAL_PRICE', 'QTY_20, QTY_40 (TBD)': 'ROUTE_QTY_20, ROUTE_QTY_40', 'PRICE_20, PRICE_40 (TBD)': 'PRICE_20, PRICE_40',
  'PRICE_40 (TBD)': 'PRICE_40', 'APPROVAL_STATUS per level (TBD)': 'APPROVAL_STS per APPROVAL_CLASS', 'APPROVED_BY, APPROVED_DT per level (TBD)': 'APPROVAL_BY, APPROVAL_DATE per APPROVAL_CLASS',
  'APPROVED_DT per level (TBD)': 'APPROVAL_DATE per APPROVAL_CLASS', 'APPROVAL_STATUS (TBD)': 'APPROVAL_STS', 'APPROVED_BY (TBD)': 'APPROVAL_BY', 'APPROVED_DT (TBD)': 'APPROVAL_DATE', 'LEVEL (TBD)': 'APPROVAL_CLASS',
  'PR_DATE (TBD)': 'CREATED_DATE', 'CREATED_DT (TBD)': 'CREATED_DATE', 'CREATED_BY (TBD)': 'CREATED_BY', 'PO_NO (TBD)': 'PO_NUMBER', 'PO_STATUS (TBD)': 'APPROVAL_STS', 'PO_DATE (TBD)': 'CREATED_DATE',
  'AUTO_APPROVE_DT (TBD)': 'APPROVAL_LIMIT (PO_APPROVAL_EST)', 'NOTE (TBD)': 'APPROVAL_REMARK', 'REASON (TBD)': 'APPROVAL_REMARK', 'VENDOR_CD + VENDOR_NAME (TBD)': 'COMPANY_CODE + COMPANY_NAME', 'VENDOR_CD (TBD)': 'COMPANY_ID',
  'OPR_MONTH (TBD)': 'CRITERIA_PERIODE', 'WORKING_DAYS (TBD)': 'count of WORKING_FLAG = 1', 'ROUTE_CD + ROUTE_DESC (TBD)': 'ROUTE_CODE + ROUTE_DESCR', 'PERCENTAGE (TBD)': 'ROUTE_PERCENTAGE_VALUE', 'DISTANCE_KM (TBD)': 'distance (no column - TBD)',
  'PRICE (component KM) (TBD)': 'ROUTE_PRICE_VALUE (component KM - TBD)', 'PRICE (component FIX) (TBD)': 'ROUTE_PRICE_VALUE (component FIX - TBD)', 'PRICE (TBD)': 'ROUTE_PRICE_VALUE', 'PR_TYPE (TBD)': 'BUSINESS_TYPE (inferred)'}
mo_fields = [F('Production Month / PR seq', CH, 'CRITERIA_PERIODE', items=['Production Month', 'Operational Month'], rw='R', note='varchar(7); PR_SEQ int default 1.'),
  F('PR Number (per trucking company)', CF, 'PR_NO_DET', items=['PR Number'], rw='R', note='varchar(11); period PR_NO on CRITERIA_SCORE_HEADER.'),
  F('Trucking Code / Name', CF, 'COMPANY_ID', items=['Trucking Code', 'Trucking Name', 'Logistics Partner', 'Trucking Company'], rw='R', status='Conflict', note='UISS Trucking Code Varchar 3 vs COMPANY_ID varchar(10) / COMPANY_CODE varchar(20).'),
  F('Order Sharing %', CF, 'TOTAL_ORDER_SHARING', items=['Order Sharing - Percentage'], rw='R', note='float.'), F('Order Sharing Qty', CF, 'TOTAL_TRIP', items=['Order Sharing - Qty'], rw='R'),
  F('Order Sharing Total Price', CF, 'TOTAL_PRICE', items=['Order Sharing - Total Price', 'Footer: Sharing Percentage / Total QTY / Total. Price'], rw='R', note='float.'),
  F('Approval status per level', CA, 'APPROVAL_STS', items=['Status SH / DpH / DH', 'Released By SH / DpH / DH'], rw='R/W', status='TBD', note='varchar(2); APPROVAL_CLASS = level (values TBD).'),
  F('Route', CR, 'ROUTE_HEADER_ID', items=['Route'], rw='R', note='+ ROUTE varchar(500).'), F('Route Percentage', CR, 'ROUTE_PERCENTAGE_VALUE', items=['Route Percentage'], rw='R'),
  F('Qty 20 / 40', CR, 'ROUTE_QTY_20', items=['Qty 20 / 40 / Total'], rw='R', note='ROUTE_QTY_40, ROUTE_QTY.'), F('Price 20 / 40', CR, 'PRICE_20', items=['Price 20 / 40 / Total'], rw='R', note='PRICE_40, TOTAL_PRICE_ALL.'),
  X('Approval History', items=['Approval History grid'], note='No history table; approvals in CRITERIA_SCORE_APPROVAL / PO_APPROVAL rows.'), F('Current PIC / PR date', CF, 'CREATED_BY', items=['Current PIC', 'PR date'], rw='R')]
mo_conf = [C('G-MO-01', 'PR document', 'PR Header per trucking company with own PR number', 'CRITERIA_SCORE_HEADER (period, PR_NO) + CRITERIA_SCORE_DETAIL_FINAL (company, PR_NO_DET)', 'Use PR_NO_DET per company (confirm)'),
  C('G-MO-02', 'Approval levels', 'SH / DpH / DH per PR', 'CRITERIA_SCORE_APPROVAL.APPROVAL_CLASS + APPROVAL_STS varchar(2)', 'Level codes TBD'),
  C('G-MO-03', 'Approval history', 'History grid with from / to status, role', 'No history table', 'Show approval rows or add a history table'),
  C('G-MO-04', 'Trucking code', 'Varchar 3', 'COMPANY_ID varchar(10)', 'Align with Master Trucking Company')]
for name, extra in [('UISS_Screen_PR_Inquiry', []), ('UISS_Screen_PR_Approval', [F('Approve / Reject', CA, 'APPROVAL_BY', items=[], rw='W', note='APPROVAL_DATE, APPROVAL_REMARK.'), F('PR status', CF, 'APPROVAL_STS', items=[], rw='W', status='TBD')])]:
    MAPS[name] = dict(revision='Database mapping revised to the ELIPS schema: PR = ielp.CRITERIA_SCORE_HEADER / CRITERIA_SCORE_DETAIL_FINAL (PR_NO_DET per company), routes = CRITERIA_SCORE_DETAIL_ROUTE, approvals = CRITERIA_SCORE_APPROVAL; conflicts recorded; no sample data',
      replace=rep_mo, fields=mo_fields + extra, conflicts=mo_conf, tbd=['APPROVAL_STS / APPROVAL_CLASS values', 'CRITERIA_HEADER_ID / PR number generation'])
po_fields = [F('PO Number', PD, 'PO_NUMBER', items=['PO Number', 'Selected PO list'], rw='R', note='varchar(16) per COMPANY_ID (+ ROUTE, PO_TYPE).'), F('Production Month', PH, 'PO_PERIODE', items=['Production Month'], rw='R', note='varchar(7); PO_SEQ.'),
  F('PR Number', CF, 'PR_NO_DET', items=['PR Number'], rw='R'), F('PO Status', PH, 'APPROVAL_STS', items=['PO Status'], rw='R/W', status='TBD'), F('Auto Approve At', PE, 'APPROVAL_LIMIT', items=['Auto Approve At'], rw='R', status='TBD', note='Per PO_PERIODE + APPROVAL_CLASS (inferred).'),
  F('Approved By', PA, 'APPROVAL_BY', items=['Approved By'], rw='R/W', note='APPROVAL_DATE, APPROVAL_REMARK, APPROVAL_CLASS.'), F('PO date', PH, 'CREATED_DATE', items=['PO date'], rw='R'),
  F('Trucking Code / Name', PD, 'COMPANY_ID', items=['Trucking Code', 'Trucking Name'], rw='R', status='Conflict'), F('Order Sharing', CF, 'TOTAL_ORDER_SHARING', items=['Order Sharing - Percentage', 'Order Sharing - Qty', 'Order Sharing - Total Price', 'Footer: Sharing Percentage / Total QTY / Total. Price'], rw='R'),
  F('Route lines', CR, 'ROUTE_HEADER_ID', items=['Route', 'Route Percentage', 'Qty 20 / 40 / Total', 'Price 20 / 40 / Total'], rw='R'), X('Approval History', items=['Approval History grid'], note='Approvals in PO_APPROVAL rows.')]
for name in ['UISS_Screen_PO_Approval', 'UISS_Screen_PO_Inquiry']:
    MAPS[name] = dict(revision='Database mapping revised to the ELIPS schema: PO = ielp.PO_HEADER (period) / PO_DETAIL (PO_NUMBER per company), approval = PO_APPROVAL, auto-approve deadline = PO_APPROVAL_EST.APPROVAL_LIMIT (inferred), PR lines = CRITERIA_SCORE_*; conflicts recorded; no sample data',
      replace=rep_mo, fields=po_fields, conflicts=mo_conf[1:] + [C('G-PO-01', 'PO number source', 'PO number created in ELIPS (monthly-workflow.js createPO)', 'PO_DETAIL.PO_NUMBER varchar(16); PAS returns PO numbers (SA_DETAIL.PAS_PO_NUMBER)', 'Confirm whether the monthly PO number is ELIPS or PAS generated')],
      tbd=['PO APPROVAL_STS values', 'PO_TYPE values', 'APPROVAL_LIMIT meaning'])
MAPS['UISS_Screen_PR_Creation'] = dict(
 revision='Database mapping revised to the ELIPS schema: PR = CRITERIA_SCORE_HEADER / _DETAIL_FINAL / _DETAIL_ROUTE / _APPROVAL (route-based) and TB_R_PR_DAILY / TB_R_PR_SUMMARY (fixed cost, inferred); prices = MS_ROUTE_PRICE; calendar = TB_M_WORKING_CALENDAR; routes = MS_ROUTE_HEADER / DETAIL; conflicts recorded; no sample data',
 replace=rep_mo,
 fields=[F('PR Creation Type', CH, 'BUSINESS_TYPE', items=['PR Creation Type'], rw='W', status='TBD', note='varchar(1) (inferred).'), F('Operational Month', CH, 'CRITERIA_PERIODE', items=['Operational Month'], note='varchar(7); PERIODE_FR / PERIODE_TO date.'),
  F('Trucking Company', T, 'COMPANY_CODE', items=['Logistics Partner', 'Trucking Company'], rw='R'), F('Mileage / Fixed cost price', P, 'ROUTE_PRICE_VALUE', items=['Mileage Cost (IDR/Km)', 'Fixed Cost (IDR/Month)', 'Cost components (Fixed type)'], rw='R', status='Conflict', note='Component FIX / KM not identifiable.'),
  F('Working Days', 'ielp.TB_M_WORKING_CALENDAR', 'WORKING_FLAG', items=['Working Days (Days)', 'Working Days'], rw='R', mapping='COUNT(WORKING_DATE) WHERE WORKING_FLAG = 1 in the month (inferred)'),
  F('Route', RD, 'ROUTE_CODE', items=['Route'], rw='R'), F('Route Percentage', RH, 'ROUTE_PERCENTAGE_VALUE', items=['Route Percentage'], rw='R'), X('Distance (Km)', items=['Distance (Km)'], status='Conflict', note='No route distance column (MS_ROUTE_PERCENTAGE_HIST.DISTANCE int?).'),
  F('PR per company', CF, 'PR_NO_DET', items=[], rw='W', note='TOTAL_TRIP, TOTAL_ORDER_SHARING, TOTAL_PRICE.'), F('PR route lines', CR, 'TOTAL_PRICE_ALL', items=[], rw='W'), F('PR approval levels', CA, 'APPROVAL_CLASS', items=[], rw='W'),
  F('Fixed cost (by resource) lines', 'ielp.TB_R_PR_DAILY', 'TOTAL_PRICE', items=[], rw='W', status='TBD', note='TB_R_PR_DAILY / _DETAIL / TB_R_PR_SUMMARY (truck, driver, DOT / HOT) inferred for the fixed-cost PR.')],
 conflicts=mo_conf[:2] + [C('G-PRC-01', 'Fixed-cost PR', 'Monthly Fixed Cost PR per LP (pr-creation-rules.js)', 'TB_R_PR_DAILY / TB_R_PR_SUMMARY (truck / driver / DOT / HOT model)', 'Confirm the fixed-cost calculation model against these tables')],
 tbd=['Sequence of PR numbers (PR_NO vc11, PR_SEQ)', 'Which of CRITERIA_* vs TB_R_PR_* is used per PR type'])

rep_pas = {'<ELIPS_SA_HEADER>': SH, '<ELIPS_SA_DETAIL>': SD, '<ELIPS_SA_SUBITEM>': f'{SW} (inferred)', '<ELIPS_SA_INTERFACE_STATUS>': SD,
  '<ELIPS_APPROVAL_HISTORY>': 'approval history (TBD)', '<ELIPS_PAS_FIX_PARAMETER>': 'ielp.TB_M_SYSTEM (inferred)'}
MAPS['UISS_Batch_ELIPS_PAS_PR_Interface'] = dict(
 revision='Database mapping revised (ELIPS side): placeholders resolved to ielp.SA_HEADER / SA_DETAIL (status = PAS_* columns), sub items = SA_WBS_PERCENTAGE (inferred), fixed parameters = TB_M_SYSTEM (inferred); PAS tables unchanged (outside ELIPS); no sample data',
 replace=rep_pas,
 fields=[F('SA header', SH, 'SA_HEADER_ID', items=[], rw='R'), F('SA detail', SD, 'SA_CODE', items=[], rw='R'), F('Interface status', SD, 'PAS_STATUS', items=[], rw='W', status='TBD', note='IS_PAS, PAS_CREATED_DATE, LOG_ITG_SEND_ID.'),
  F('Sub items (WBS)', SW, 'WBS_NUMBER', items=[], rw='R', status='TBD'), F('Fixed parameters', 'ielp.TB_M_SYSTEM', 'SYS_VALUE', items=[], rw='R', status='TBD'), F('Interface log', LP, 'STS_CODE', items=[], rw='W', status='TBD'),
  X('PAS tables (TB_R_PR_H ...)', items=[], status='TBD', note='Outside ELIPS - not verifiable with this schema.')],
 conflicts=[], tbd=['Approval history source', 'Mapping of SA sub items'])
MAPS['UISS_Batch_PAS_ELIPS_PR_PO_Callback'] = dict(
 revision='Database mapping revised (ELIPS side): target = ielp.SA_DETAIL (PAS_PR_NUMBER, PAS_PR_DATE, PAS_PO_NUMBER, PAS_PO_DATE, IS_PAS_CALLBACK, PAS_CALLBACK_*), SA key = SA_CODE / SA_DETAIL_ID (inferred), run logs -> LOG_ITGPAS (inferred); no sample data',
 replace={'<SA_NUMBER_COL>': 'SA_CODE', '<ITEM_NO_COL>': 'SA_DETAIL_ID (inferred)', '<ELIPS_PAS_CALLBACK_RUN_LOG>': f'{LP} (inferred)', '<ELIPS_PAS_CALLBACK_DETAIL_LOG>': f'{LP} (inferred)', 'SA_DETAIL': SD},
 fields=[F('PR number', SD, 'PAS_PR_NUMBER', items=[], rw='W'), F('PR date', SD, 'PAS_PR_DATE', items=[], rw='W'), F('PO number', SD, 'PAS_PO_NUMBER', items=[], rw='W'), F('PO date', SD, 'PAS_PO_DATE', items=[], rw='W'),
  F('Callback flag / status', SD, 'IS_PAS_CALLBACK', items=[], rw='W', note='PAS_CALLBACK_STATUS, PAS_CALLBACK_DATE, LOG_ITG_CALLBACK_ID.'), F('Run log', LP, 'STS_CODE', items=[], rw='W', status='TBD')],
 conflicts=[], tbd=['SA item key column', 'Callback status values'])
MAPS['UISS_Batch_ELIPS_PAS_GR_Attachment'] = dict(
 revision='Database mapping revised (ELIPS side): SA / cycle source = ielp.SA_DETAIL / ORDER_CYCLE, run / file / GR logs -> LOG_ITGPAS (inferred); PAS tables unchanged; no sample data',
 replace={'<GR_ATTACH_RUN_LOG>': f'{LP} (inferred)', '<GR_ATTACH_FILE_LOG>': f'{LP} (inferred)', '<GR_ATTACH_GR_LOG>': f'{LP} (inferred)', 'SA_DETAIL / cycles': f'{SD} / {OC}'},
 fields=[F('SA / PO link', SD, 'PAS_PO_NUMBER', items=[], rw='R'), F('Cycles of the SA', OC, 'SA_CODE', items=[], rw='R'), F('Run log', LP, 'STS_CODE', items=[], rw='W', status='TBD'),
  X('PAS tables (TB_R_GR_IR, TB_R_PR_H)', items=[], status='TBD', note='Outside ELIPS.')], conflicts=[], tbd=['Surat Jalan API endpoint', 'PDF storage (ORDER_FILES?)'])
for k, v in MAPS.items():
    json.dump({'uiss': k, **v}, open(f'{k}.json', 'w'), indent=1)
print('written', len(MAPS))
