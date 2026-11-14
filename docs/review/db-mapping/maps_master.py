"""Mapping definitions (UI -> ELIPS) for the master-data UISS. Writes one JSON per UISS for db_revision.py.
Evidence rule: table / column chosen by name + structure (Inferred link, columns Confirmed by schema). No sample data."""
import json
NOTBD = 'TBD - Not confirmed from existing schema/data/code'
def F(ui, table, col, items=None, rw='R/W', mapping='-', status='Revised', note='', ev='Schema; Code'):
    return dict(ui=ui, items=[ui] if items is None else items, table=table, column=col, rw=rw, mapping=mapping, evidence=ev, status=status, note=note)
def X(ui, items=None, note=NOTBD, status='TBD', rw='R/W', mapping='-'):
    return dict(ui=ui, items=[ui] if items is None else items, table=None, column=None, rw=rw, mapping=mapping, evidence='Schema (no table / column found)', status=status, note=note)
def C(i, topic, uiss, db, rec, code='-'):
    return dict(id=i, topic=topic, uiss=uiss, code=code, db=db, data='No sample data', recommendation=rec)
MAPS = {}

# ---------------- Trucking Company
T = 'ielp.MS_TRUCKING_COMPANY'
MAPS['UISS_Screen_Master_Trucking_Company'] = dict(
 revision='Database mapping revised to the ELIPS schema (ielp.MS_TRUCKING_COMPANY): column names, types and lengths from the DDL; Deletion = IS_DELETE; conflicts recorded (UI lengths vs DB, no VERSION / SERVICE_TYPE column); no sample data',
 replace={'Trucking Company Master (TBD)': T, 'VENDOR_NAME (TBD)': 'COMPANY_NAME', 'VENDOR_CD (TBD)': 'COMPANY_CODE', 'SAP_VENDOR_CD (TBD)': 'SAP_COMPANY_CODE',
   'SERVICE_TYPE (TBD)': 'SERVICE_TYPE (no column in ELIPS - TBD)', 'NPWP (TBD)': 'NPWP', 'CONTACT_NAME (TBD)': 'CONTACT_NAME', 'EMAIL (TBD)': 'EMAIL',
   'PHONE (TBD)': 'PHONE', 'MOBILE_PHONE (TBD)': 'MOBILE_PHONE', 'ADDRESS (TBD)': 'COMPANY_ADDRESS', 'DELETION_FLAG (TBD)': 'IS_DELETE',
   'CREATED_BY (TBD)': 'CREATED_BY', 'CREATED_DT (TBD)': 'CREATED_DATE', 'CHANGED_BY (TBD)': 'UPDATED_BY', 'CHANGED_DT (TBD)': 'UPDATED_DATE',
   'VENDOR_ID (TBD)': 'COMPANY_ID', 'VERSION (TBD)': 'VERSION (no column in ELIPS - Conflict)'},
 fields=[F('Vendor Name', T, 'COMPANY_NAME', mapping='TRIM, single spaces, UPPER', note='UI max 100 < DB 500.'),
  F('Vendor Code', T, 'COMPANY_CODE', mapping='TRIM, UPPER', status='Conflict', note='UI rule 3 chars (master-trucking.js) vs DB varchar(20).'),
  F('SAP Vendor Code', T, 'SAP_COMPANY_CODE', mapping='TRIM', status='Conflict', note='UI rule 10 digits vs DB varchar(20).'),
  X('Service Type', status='Conflict', note='No SERVICE_TYPE column in MS_TRUCKING_COMPANY; BUSINESS_TYPE int exists (meaning TBD).', mapping='Fixed list MRO'),
  F('NPWP', T, 'NPWP', mapping='Digits -> 999.999.999.9-999.999'),
  F('Contact Name', T, 'CONTACT_NAME', mapping='TRIM', note='UI max 100 < DB 200.'),
  F('E-Mail', T, 'EMAIL', mapping='TRIM, LOWER', status='Conflict', note='UI allows 100, DB varchar(50).'),
  F('Phone', T, 'PHONE', mapping='TRIM', status='Verified'), F('Mobile Phone', T, 'MOBILE_PHONE', mapping='TRIM', status='Verified'),
  F('Address', T, 'COMPANY_ADDRESS', mapping='TRIM', note='UI max 300 < DB 500.'),
  F('Deletion', T, 'IS_DELETE', rw='W (delete) / R', mapping="'0' active / '1' deleted (values TBD; default 0)", note='UISS had DELETION_FLAG Y/N.'),
  F('Created By / Created Date', T, 'CREATED_BY', rw='W (insert)', mapping='Login user; CREATED_DATE = server date'),
  F('Updated By / Updated Date', T, 'UPDATED_BY', rw='W (update)', mapping='Login user; UPDATED_DATE = server date'),
  F('(key) Company ID', T, 'COMPANY_ID', items=[], rw='W (insert)', mapping='Generated - rule TBD', status='TBD'),
  F('(system) App ID', T, 'APP_ID', items=[], rw='W (insert)', mapping="Default 'ENVITRUCK'", status='TBD'),
  X('(concurrency) Version', items=[], status='Conflict', note='Optimistic lock by VERSION (master-trucking.js update) has no column.')],
 conflicts=[C('G-MTC-01', 'E-Mail length', 'Varchar 100', 'EMAIL varchar(50)', 'Limit UI to 50 or extend the column (DB change request)', 'master-trucking.js'),
  C('G-MTC-02', 'Vendor / SAP code format', '3 chars / 10 digits', 'COMPANY_CODE / SAP_COMPANY_CODE varchar(20)', 'Confirm the rules against existing codes'),
  C('G-MTC-03', 'Concurrency check', 'VERSION (msg 15)', 'No VERSION column', 'Use UPDATED_DATE as optimistic lock or add VERSION'),
  C('G-MTC-04', 'Service Type', 'SERVICE_TYPE MRO', 'No column (BUSINESS_TYPE int)', 'Confirm whether BUSINESS_TYPE holds the service type'),
  C('G-MTC-05', 'Deletion flag', 'DELETION_FLAG Y / N', "IS_DELETE varchar(1) default 0", "Use IS_DELETE (values to confirm)")],
 tbd=['COMPANY_ID generation rule', 'APP_ID value for TC-PBR records', 'BUSINESS_TYPE meaning', 'Use of MS_TRUCKING_COMPANY_CY / MS_TRUCKING_COMPANY_TMP (not in the mock-up)'])

# ---------------- Location
L = 'ielp.MS_LOCATION'
MAPS['UISS_Screen_Master_Location'] = dict(
 revision='Database mapping revised to the ELIPS schema (ielp.MS_LOCATION): column names / types from the DDL; coordinates and radius are varchar in ELIPS; Active / Inactive and VERSION have no column (conflicts); no sample data',
 replace={'Location Master (TBD)': L, 'LOCATION_ALIAS (TBD)': 'LOCATION_ALIAS', 'LOCATION_NAME (TBD)': 'LOCATION_NAME', 'GMAP_ADDRESS (TBD)': 'LOCATION_ADDRESS_ORI',
   'PHYSICAL_ADDRESS (TBD)': 'LOCATION_ADRESS', 'SUB_AREA_CD (TBD)': 'LOCATION_SUB', 'SUB_AREA_NAME (TBD)': 'sub area name (source TBD)', 'Sub Area Master (TBD)': 'Sub Area source (TBD)',
   'LATITUDE, LONGITUDE (TBD)': 'LOCATION_LATITUDE, LOCATION_LANGITUDE', 'LATITUDE (TBD)': 'LOCATION_LATITUDE', 'LONGITUDE (TBD)': 'LOCATION_LANGITUDE', 'RADIUS_M (TBD)': 'RADIUS',
   'AUTO_FINISH_FLAG (TBD)': 'AUTO_FINISH', 'AUTO_CYCLE_FLAG (TBD)': 'AUTO_CYCLE', 'CYCLE_TO_AREA (TBD)': 'CYCLE_LOC_TO', 'STATUS (TBD)': 'IS_DELETE (Active / Inactive: no column - Conflict)',
   'CREATED_BY, CREATED_DT (TBD)': 'CREATED_BY, CREATED_DATE', 'UPDATED_BY, UPDATED_DT (TBD)': 'UPDATED_BY, UPDATED_DATE', 'CREATED_BY (TBD)': 'CREATED_BY', 'CREATED_DT (TBD)': 'CREATED_DATE',
   'UPDATED_BY (TBD)': 'UPDATED_BY', 'UPDATED_DT (TBD)': 'UPDATED_DATE', 'VERSION (TBD)': 'VERSION (no column in ELIPS - Conflict)'},
 fields=[F('Location Name', L, 'LOCATION_NAME', items=['Location Name', 'Loc Name'], mapping='TRIM, UPPER', note='UI max 100 < DB 5000.'),
  F('Location Alias (Code)', L, 'LOCATION_ALIAS', items=['Location Alias', 'Location Code'], mapping='UPPER, unique', note='UI max 10 < DB 100; LOCATION_ID (PK) is a separate key.'),
  F('Location Address Google Map', L, 'LOCATION_ADDRESS_ORI', items=['Location Address Google Map', 'G.Map Address'], note='Link by name (inferred).'),
  F('Physical Location Address', L, 'LOCATION_ADRESS', items=['Physical Location Address', 'Physical Address'], note='Column spelled LOCATION_ADRESS.'),
  F('Location Sub Area', L, 'LOCATION_SUB', items=['Location Sub Area', 'Loc Sub Area'], status='TBD', note='LOCATION_SUB / LOCATION_AREA varchar(10); list source TBD.'),
  F('Radius (m)', L, 'RADIUS', mapping='Numeric > 0 stored as text', status='Conflict', note="varchar(5) default '50'."),
  F('Auto Finish Order', L, 'AUTO_FINISH', items=['Auto Finish Order', 'Auto Finish'], mapping="Yes / No -> values TBD (default 0)"),
  F('Auto Generate Cycle', L, 'AUTO_CYCLE', items=['Auto Generate Cycle', 'Auto Cycle'], mapping='Yes / No -> values TBD (default 0)'),
  F('Cycle To Area', L, 'CYCLE_LOC_TO'),
  F('Latitude', L, 'LOCATION_LATITUDE', status='Conflict', note='varchar(100) NOT NULL; UI Number(10,7).'),
  F('Longitude', L, 'LOCATION_LANGITUDE', status='Conflict', note='Column spelled LANGITUDE; varchar(100).'),
  F('Coordinates (list)', L, 'LOCATION_LATITUDE', items=['Coordinates'], rw='R'),
  F('Status Active / Inactive', L, 'IS_DELETE', items=['Status'], mapping='Deactivate / Delete -> IS_DELETE (values TBD)', status='Conflict', note='No separate inactive state.'),
  F('Created By / At', L, 'CREATED_BY', items=['Created By / Created At'], rw='W (insert)'), F('Updated By / At', L, 'UPDATED_BY', items=['Updated By / Updated At'], rw='W (update)'),
  F('(key) Location ID', L, 'LOCATION_ID', items=[], rw='W (insert)', mapping='Generated - rule TBD', status='TBD'), F('(system) App ID', L, 'APP_ID', items=[], status='TBD')],
 conflicts=[C('G-MLC-01', 'Coordinates type', 'Number(10,7)', 'LOCATION_LATITUDE / LOCATION_LANGITUDE varchar(100) NOT NULL', 'Store as text with 7 decimals; validate in the application'),
  C('G-MLC-02', 'Radius', 'Number', "RADIUS varchar(5) default '50'", 'Max 5 characters'),
  C('G-MLC-03', 'Active / Inactive', 'STATUS + Deactivate', 'Only IS_DELETE varchar(100)', 'Confirm deactivate = IS_DELETE or add a status column', 'master-location.js deactivate'),
  C('G-MLC-04', 'Concurrency', 'VERSION', 'No VERSION column', 'Use UPDATED_DATE or add VERSION')],
 tbd=['LOCATION_ID generation; which key other tables use (FROM_LOC / TO_LOC varchar(10) = LOCATION_ID or LOCATION_ALIAS?)', 'Values of AUTO_FINISH / AUTO_CYCLE / IS_DELETE', 'Source of LOCATION_AREA / LOCATION_SUB', 'APP_ID value'])

# ---------------- Mileage (screen + batch)
M = 'ielp.TB_M_MILEAGE'
rep_m = {'Route Mileage Master (TBD)': M, 'Location Master (TBD)': L, 'LOCATION_ALIAS + LOCATION_NAME (TBD)': 'LOCATION_ALIAS + LOCATION_NAME', 'LOCATION_NAME (TBD)': 'LOCATION_NAME',
   'FROM_LOCATION (TBD)': 'FROM_CODE', 'TO_LOCATION (TBD)': 'TO_CODE', 'MILEAGE_KM (TBD)': 'MILEAGE', 'STATUS (TBD)': 'IS_DELETE (Active / Inactive: no column - Conflict)',
   'CREATED_BY (TBD)': 'CREATED_BY', 'CREATED_DT (TBD)': 'CREATED_DT', 'UPDATED_BY (TBD)': 'CHANGED_BY', 'UPDATED_DT (TBD)': 'CHANGED_DT', 'VERSION (TBD)': 'VERSION (no column in ELIPS - Conflict)',
   'Price Master (TBD)': 'ielp.MS_ROUTE_PRICE (inferred)'}
mil_conf = [C('G-MML-01', 'Mileage decimals', 'Number 7,2 (max 2 decimals)', 'MILEAGE decimal(18,0) - no decimals', 'Round to whole KM in the UI or change the column (DB change request)', 'master-mileage.js parseMileage'),
  C('G-MML-02', 'Route key', 'From + To unique', 'PK = LOC_NAME_FROM + FROM_CODE; TO_CODE nullable, not in key', 'Only one route per From is possible with this PK - confirm the table or change the PK'),
  C('G-MML-03', 'Location names stored', 'Names read from Master Location', 'LOC_NAME_FROM / LOC_NAME_TO NOT NULL in TB_M_MILEAGE (denormalised)', 'Copy names on insert / update; define refresh when a location is renamed'),
  C('G-MML-04', 'Active / Inactive and VERSION', 'STATUS, VERSION', 'Only IS_DELETE varchar(5); no VERSION', 'Map status to IS_DELETE; concurrency by CHANGED_DT')]
MAPS['UISS_Screen_Master_Mileage'] = dict(
 revision='Database mapping revised to the ELIPS schema (ielp.TB_M_MILEAGE, ielp.MS_LOCATION): columns / types from the DDL; conflicts recorded (no decimals, PK without TO_CODE, no status / VERSION); no sample data',
 replace=rep_m,
 fields=[F('From', L, 'LOCATION_ALIAS', items=['From'], rw='R (list) / W FROM_CODE', mapping='Active locations; saved in TB_M_MILEAGE.FROM_CODE', note='List source MS_LOCATION; which key (LOCATION_ID / ALIAS) is TBD.'),
  F('To', L, 'LOCATION_ALIAS', items=['To'], rw='R (list) / W TO_CODE', mapping='Saved in TB_M_MILEAGE.TO_CODE'),
  F('From Code (list)', M, 'FROM_CODE', items=['From Code'], rw='R'), F('To Code (list)', M, 'TO_CODE', items=['To Code'], rw='R', status='Conflict', note='Nullable, not part of PK.'),
  F('From name (stored)', M, 'LOC_NAME_FROM', items=[], rw='W', mapping='Copy of MS_LOCATION.LOCATION_NAME', status='Revised', note='PK column, NOT NULL.'),
  F('To name (stored)', M, 'LOC_NAME_TO', items=[], rw='W', mapping='Copy of MS_LOCATION.LOCATION_NAME', note='NOT NULL.'),
  F('Mileage (Km)', M, 'MILEAGE', mapping='> 0', status='Conflict', note='decimal(18,0): decimals not stored.'),
  F('Created Date', M, 'CREATED_DT', rw='W (insert)'), F('Created By', M, 'CREATED_BY', rw='W (insert)', note='varchar(20).'),
  F('Change Date', M, 'CHANGED_DT', rw='W (update)'), F('Changed By', M, 'CHANGED_BY', rw='W (update)'),
  F('Status / delete', M, 'IS_DELETE', items=[], mapping='values TBD', status='Conflict')],
 conflicts=mil_conf, tbd=['Values of IS_DELETE (varchar(5))', 'Whether FROM_CODE / TO_CODE hold LOCATION_ID or LOCATION_ALIAS', 'Whether TB_M_MILEAGE is shared with other ELIPS modules'])
MAPS['UISS_Batch_Master_Mileage_Upload'] = dict(
 revision='Database mapping revised: target master = ielp.TB_M_MILEAGE (definition from the ELIPS DDL); temp / log / history tables stay proposed (not in ELIPS); conflicts recorded; no sample data',
 replace={**rep_m, 'INSERT Route Mileage Master (TBD)': f'INSERT {M}', 'UPDATE Route Mileage Master (TBD)': f'UPDATE {M}'},
 fields=[F('FROM CODE (file)', M, 'FROM_CODE', items=[], rw='W'), F('TO CODE (file)', M, 'TO_CODE', items=[], rw='W', status='Conflict', note='Not in PK.'),
  F('MILEAGE (KM) (file)', M, 'MILEAGE', items=[], rw='W', status='Conflict', note='decimal(18,0).'), F('From / To names', M, 'LOC_NAME_FROM', items=[], rw='W', mapping='Copy of location names (NOT NULL)'),
  F('Audit', M, 'CREATED_BY', items=[], rw='W'), X('Temp / log / history (TB_T_MILEAGE_UPLOAD, TB_R_MILEAGE_UPLOAD_LOG, TB_H_MILEAGE)', items=[], status='Missing', note='Proposed tables, not in ELIPS.')],
 conflicts=mil_conf + [C('G-MML-05', 'LAST_UPLOAD_ID', 'Column on the route master', 'No such column in TB_M_MILEAGE', 'Drop or add the column (DB change request)')],
 tbd=['Approval for the three proposed tables', 'Function ID of the upload (dbo.TB_M_FUNCTION)'])

# ---------------- Renban
R = 'ielp.MS_RENBAN_TCPBR'
MAPS['UISS_Screen_Master_Renban'] = dict(
 revision='Database mapping revised to the ELIPS schema (ielp.MS_RENBAN_TCPBR): key PLANT_CD + DEST_CD + RENBAN_CD, SOURCE_LOCATION_ID, VERSION and audit columns confirmed by the DDL; plant name source TBD; no sample data',
 replace={'Renban Master (TBD)': R, 'PLANT_CD (TBD)': 'PLANT_CD', 'DEST_CD (TBD)': 'DEST_CD', 'RENBAN_CD (TBD)': 'RENBAN_CD', 'SOURCE_CD (TBD)': 'SOURCE_LOCATION_ID',
   'Source Master (TBD)': f'{L} (inferred)', 'CREATED_BY (TBD)': 'CREATED_BY', 'CREATED_DT (TBD)': 'CREATED_DT', 'CHANGED_BY (TBD)': 'CHANGED_BY', 'CHANGED_DT (TBD)': 'CHANGED_DT',
   'VERSION (TBD)': 'VERSION', 'Plant Master (TBD)': 'Plant source (TBD)', 'PLANT_NAME (TBD)': 'plant name (source TBD)'},
 fields=[F('Plant', R, 'PLANT_CD', items=['Plant (Code - Description)'], mapping='Code from plant list (source TBD)', note='varchar(10) PK.'),
  F('Dest', R, 'DEST_CD', mapping='UPPER, ^[A-Z0-9]{1,10}$', status='Verified'), F('Renban Code', R, 'RENBAN_CD', mapping='UPPER, ^[A-Z0-9]{1,3}$', status='Verified'),
  F('Source', R, 'SOURCE_LOCATION_ID', mapping='Location (inferred MS_LOCATION.LOCATION_ID)', note='varchar(20) NOT NULL; UISS had SOURCE_CD.'),
  F('Created By', R, 'CREATED_BY', rw='W (insert)', status='Verified'), F('Created Dt', R, 'CREATED_DT', rw='W (insert)', mapping='default sysdatetime()', status='Verified'),
  F('Changed By', R, 'CHANGED_BY', rw='W (update)', status='Verified'), F('Changed Dt', R, 'CHANGED_DT', rw='W (update)', status='Verified'),
  F('(concurrency) Version', R, 'VERSION', items=[], rw='W', mapping='+1 on update, default 1', status='Verified')],
 conflicts=[C('G-MRB-01', 'Plant name', 'PLANT_CD + PLANT_NAME from Plant Master', 'No plant master with PLANT_CD varchar(10) found (TB_M_LOGISTIC_POINT.PLANT_CD is char(1))', 'Confirm the plant list source')],
 tbd=['Plant list source', 'SOURCE_LOCATION_ID = MS_LOCATION.LOCATION_ID? (inferred)', 'Legacy ielp.MS_RENBAN still used?'])

# ---------------- Priority (no table)
MAPS['UISS_Screen_Master_Priority'] = dict(
 revision='Database review: no ELIPS table holds route priority - priority columns marked TBD - Not confirmed from existing schema/data/code; locations / mileage mapped to ielp.MS_LOCATION / ielp.TB_M_MILEAGE; no sample data',
 replace={'Route Priority Master (TBD)': 'Route Priority Master (no ELIPS table - TBD)', 'Location Master (TBD)': L, 'Route Mileage Master (TBD)': M,
   'LOCATION_CD + LOCATION_NAME (TBD)': 'LOCATION_ALIAS + LOCATION_NAME', 'LOCATION_NAME (TBD)': 'LOCATION_NAME', 'MILEAGE_KM (TBD)': 'MILEAGE'},
 fields=[F('From / To (list)', L, 'LOCATION_ALIAS', items=['From', 'To'], rw='R', mapping='Active locations'),
  F('From / To Description', L, 'LOCATION_NAME', items=['From Description', 'To Description'], rw='R'),
  F('Mileage', M, 'MILEAGE', rw='R', note='decimal(18,0).'),
  X('Priority', items=['Priority']), X('Created / Changed By / DT', items=['Created DT', 'Created By', 'Changed DT', 'Changed By']), X('(table) Route Priority Master', items=[], status='Missing')],
 conflicts=[C('G-MPY-01', 'Route priority storage', 'Route Priority Master', 'No table in ELIPS', 'New table needed (DB change request) or confirm existing storage')],
 tbd=['Table / columns for route priority (FROM, TO, PRIORITY_NO, audit)'])

# ---------------- KPI
K, KP, CL, CS = 'ielp.MS_KPI', 'ielp.MS_KPI_PERCENTAGE', 'ielp.CRITERIA_LAST_ORDER', 'ielp.CRITERIA_SCORE_DETAIL'
MAPS['UISS_Screen_Master_KPI'] = dict(
 revision='Database mapping revised to the ELIPS schema: KPI items = ielp.MS_KPI, score ranges = ielp.MS_KPI_PERCENTAGE, order sharing = ielp.CRITERIA_LAST_ORDER (per period); company KPI values, payment type and daily trip have no master table (conflicts / TBD); no sample data',
 replace={'KPI Item Master (TBD)': K, 'KPI_NAME (TBD)': 'KPI_NAME', 'KPI_CD (TBD)': 'KPI_ID', 'SEQ_NO (TBD)': 'ORDER_SEQ', 'COLOR (TBD)': 'COLOR (no column - TBD)',
   'Trucking Company Master (TBD)': T, 'VENDOR_CD + VENDOR_NAME (TBD)': 'COMPANY_CODE + COMPANY_NAME', 'VENDOR_CD (TBD)': 'COMPANY_ID',
   'KPI Master (TBD)': 'KPI per company (no ELIPS master table - TBD)', 'KPI Value (TBD)': 'KPI value per company (no ELIPS master table - TBD; period data in ielp.CRITERIA_SCORE_DETAIL)',
   'Master KPI setting (TBD)': 'setting (TBD)'},
 fields=[F('Enter New KPI (KPI item name)', K, 'KPI_NAME', items=['Enter New KPI'], mapping='Unique, max 15 in UI', note='DB varchar(50) NOT NULL.'),
  F('KPI item code', K, 'KPI_ID', items=[], rw='W', mapping='Generated (rule TBD)', status='TBD', note='Column has no PK constraint in the DDL.'),
  F('KPI item order', K, 'ORDER_SEQ', items=[], rw='W'), F('KPI weight', K, 'WEIGHT', items=[], rw='-', status='TBD', note='Exists in ELIPS, not used by the mock-up.'),
  F('Select Trucking Company', T, 'COMPANY_CODE', items=['Select Trucking Company'], rw='R', mapping='Active companies (IS_DELETE)'),
  F('Trucking Company (row)', T, 'COMPANY_ID', items=['Trucking Company'], rw='R/W', status='TBD', note='Key of the per-company KPI row (table TBD).'),
  X('Payment Type', items=['Payment Type', 'Payment Type (new row)'], status='Conflict', note='No payment type column in ELIPS.'),
  F('Score', CS, 'SCORE', items=['Score'], rw='R', status='TBD', note='Period score per company / route; master score per company not in ELIPS.'),
  F('KPI item columns (values)', CS, 'CRITERIA_VALUE', items=['KPI item columns'], status='TBD', note='Period data, not master.'),
  F('Score grade ranges', KP, 'VALUE', items=[], rw='R', mapping='FROM_PERCENTAGE..TO_PERCENTAGE -> VALUE', status='TBD', note='Mock-up grade thresholds (master-kpi.js grade) vs MS_KPI_PERCENTAGE.'),
  F('Order Sharing %', CL, 'ORDER_SHARING', items=['Order Sharing %'], status='Conflict', note='float per COMPANY_ID + ROUTE + CRITERIA_PERIODE (period, not master).'),
  X('Daily Trip / Trips per day', items=['Daily Trip', 'Trips per day'], status='Conflict', note='No column in ELIPS.'),
  X('UoM', items=['UoM']), F('Created / Changed (KPI item)', K, 'CREATED_BY', items=['Created Dt', 'Created By', 'Changed Dt', 'Changed By'], rw='W', note='MS_KPI uses CREATED_DATE / UPDATED_DATE / UPDATED_BY.')],
 conflicts=[C('G-MKP-01', 'Per-company KPI master', 'KPI Master per trucking company (score, values, payment type, order sharing, daily trip)', 'Only MS_KPI (items) and period tables CRITERIA_SCORE_DETAIL / CRITERIA_LAST_ORDER', 'New master table or confirm the period tables are the source'),
  C('G-MKP-02', 'Payment type / daily trip', 'By Resources / By Trip, Daily Trip, Trips per day', 'No columns', 'DB change request'),
  C('G-MKP-03', 'Grade thresholds', 'Fixed in code (master-kpi.js)', 'MS_KPI_PERCENTAGE (FROM / TO_PERCENTAGE -> VALUE)', 'Read thresholds from MS_KPI_PERCENTAGE')],
 tbd=['KPI_ID generation', 'Meaning of MS_KPI.WEIGHT', 'Table for per-company KPI values', 'APP_ID value'])

# ---------------- Price
P = 'ielp.MS_ROUTE_PRICE'
MAPS['UISS_Screen_Master_Price'] = dict(
 revision='Database mapping revised to the ELIPS schema: price data = ielp.MS_ROUTE_PRICE (eCatalogue interface staging ielp.ITG_ECAT / ITG_LOG); component and vehicle type mapping TBD; read-only screen; no sample data',
 replace={'Price Master (TBD)': P, 'Trucking Company Master (TBD)': T, 'VENDOR_CD + VENDOR_NAME (TBD)': 'COMPANY_CODE + COMPANY_NAME', 'VENDOR_CD (TBD)': 'COMPANY_CODE',
   'PERIOD (TBD)': 'period from VALID_DT_FROM (TBD)', 'VEHICLE_TYPE (TBD)': 'ROUTE_PRICE_SIZE (inferred)', 'COMPONENT (TBD)': 'component (no column - TBD)', 'PRICE (TBD)': 'ROUTE_PRICE_VALUE',
   'EFF_START_DT (TBD)': 'VALID_DT_FROM', 'EFF_END_DT (TBD)': 'VALID_DT_TO', 'SOURCE_REF (TBD)': 'ROUTE_PRICE_DESC (inferred)', 'CREATED_BY (TBD)': 'CREATED_BY', 'CREATED_DT (TBD)': 'CREATED_DATE',
   'CHANGED_BY (TBD)': 'UPDATED_BY', 'CHANGED_DT (TBD)': 'UPDATED_DATE'},
 fields=[F('Periode', P, 'VALID_DT_FROM', items=['Periode'], rw='R', mapping='YYYYMM of VALID_DT_FROM (inferred)', status='TBD'),
  F('Trucking Company', P, 'COMPANY_CODE', items=['Trucking Company'], rw='R', mapping='= MS_TRUCKING_COMPANY.COMPANY_CODE (inferred)'),
  F('Vehicle Type', P, 'ROUTE_PRICE_SIZE', rw='R', status='TBD', note='varchar(2) - container size? inferred.'),
  X('Component (FIX / KM)', items=['Component'], status='Conflict', note='No component column; maybe ROUTE_PRICE_MAT_CODE / ROUTE_PRICE_MAT_FEATURE.'),
  F('Price', P, 'ROUTE_PRICE_VALUE', rw='R', note='float (UISS Number 15).'), F('Effective Start', P, 'VALID_DT_FROM', rw='R'), F('Effective End', P, 'VALID_DT_TO', rw='R'),
  F('Source', P, 'ROUTE_PRICE_DESC', rw='R', status='TBD'), F('Created By', P, 'CREATED_BY', rw='R'), F('Created Dt', P, 'CREATED_DATE', rw='R'),
  F('Changed By', P, 'UPDATED_BY', rw='R'), F('Changed Dt', P, 'UPDATED_DATE', rw='R'),
  F('(interface) eCatalogue price', 'ielp.ITG_ECAT', 'PRICE_AMOUNT', items=[], rw='R', status='TBD', note='Staging of the eCatalogue interface (VENDOR_CD, MAT_NO).')],
 conflicts=[C('G-MPR-01', 'Price component', 'FIX / KM components', 'No component column in MS_ROUTE_PRICE', 'Confirm component identification (material code?)'),
  C('G-MPR-02', 'Period', 'Periode YYYYMM column', 'Only VALID_DT_FROM / VALID_DT_TO', 'Derive period from validity dates')],
 tbd=['Which table the screen reads (MS_ROUTE_PRICE vs ITG_ECAT)', 'ROUTE_PRICE_SIZE meaning', 'Currency (ROUTE_PRICE_CURRENCY) display'])

# ---------------- Route Percentage
RH, RD, RP = 'ielp.MS_ROUTE_HEADER', 'ielp.MS_ROUTE_DETAIL', 'ielp.MS_ROUTE_PERCENTAGE_HIST'
MAPS['UISS_Screen_Master_Route_Percentage'] = dict(
 revision='Database mapping revised to the ELIPS schema: route header = ielp.MS_ROUTE_HEADER (percentage), route code / description = ielp.MS_ROUTE_DETAIL, history = ielp.MS_ROUTE_PERCENTAGE_HIST; ordered stops and distance have no column (conflicts); no sample data',
 replace={'Route Percentage Master (TBD)': RH, 'Route Stop (TBD)': 'Route stops (no ELIPS table - TBD)', 'Location Master (TBD)': L, 'Route Mileage Master (TBD)': M,
   'ROUTE_ID (TBD)': 'ROUTE_HEADER_ID', 'ROUTE_CD (TBD)': 'ROUTE_CODE', 'ROUTE_DESC (TBD)': 'ROUTE_DESCR', 'PERCENTAGE (TBD)': 'ROUTE_PERCENTAGE_VALUE',
   'DISTANCE_KM (TBD)': 'DISTANCE (MS_ROUTE_PERCENTAGE_HIST, inferred)', 'STATUS (TBD)': 'IS_DELETE', 'LOCATION_CD + LOCATION_NAME (TBD)': 'LOCATION_ALIAS + LOCATION_NAME',
   'LOCATION_CD (TBD)': 'LOCATION_ALIAS', 'LOCATION_NAME (TBD)': 'LOCATION_NAME', 'VERSION (TBD)': 'VERSION (no column - Conflict)',
   'CHANGED_BY / CHANGED_DT (TBD)': 'UPDATED_BY / UPDATED_DATE', 'CREATED_BY / CREATED_DT (TBD)': 'CREATED_BY / CREATED_DATE', 'CHANGED_DT (TBD)': 'UPDATED_DATE', 'CREATED_BY (TBD)': 'CREATED_BY', 'CREATED_DT (TBD)': 'CREATED_DATE',
   'ROUTE_CD / ROUTE_DESC / DISTANCE_KM / PERCENTAGE (TBD)': 'ROUTE_PERCENTAGE_VALUE (ROUTE_CODE / ROUTE_DESCR in MS_ROUTE_DETAIL; distance: no column)'},
 fields=[F('Route Code', RD, 'ROUTE_CODE', items=['Route Code'], rw='R/W', note='varchar(100) NOT NULL, per ROUTE_HEADER_ID.'),
  F('Route Description', RD, 'ROUTE_DESCR', items=['Route Description', 'Description']),
  F('Percentage', RH, 'ROUTE_PERCENTAGE_VALUE', items=['Percentage', 'Percentage (%)'], mapping='0 < % <= 100', note='float NOT NULL (UISS Number 5,2).'),
  F('Location Pick / stop', L, 'LOCATION_ALIAS', items=['Location Pick', 'Code'], rw='R'), F('Location Name', L, 'LOCATION_NAME', rw='R'),
  F('Distance (Km)', RP, 'DISTANCE', items=['Distance (Km)'], status='Conflict', note='int in the history table; no distance on MS_ROUTE_HEADER.'),
  F('Status (Deactivate)', RH, 'IS_DELETE', items=[], mapping='Deactivate -> IS_DELETE (values TBD)'),
  F('Created By', RH, 'CREATED_BY', items=['Created By'], rw='W'), F('Changed Dt', RH, 'UPDATED_DATE', items=['Changed Dt'], rw='W'),
  X('Ordered stops (sequence, leg km)', items=[], status='Conflict', note='No stop / sequence table.'),
  F('Sync flag', RH, 'IS_SYNC', items=[], rw='-', status='TBD', note='Exists in ELIPS (sync to another system?), not used by the mock-up.')],
 conflicts=[C('G-MRP-01', 'Route stops', 'Ordered stops with leg distance', 'MS_ROUTE_DETAIL has only ROUTE_CODE / ROUTE_DESCR', 'New table or encode stops in ROUTE_CODE (confirm)'),
  C('G-MRP-02', 'Distance', 'DISTANCE_KM on the route', 'Only MS_ROUTE_PERCENTAGE_HIST.DISTANCE int (per period)', 'Confirm source; decimals not stored'),
  C('G-MRP-03', 'Percentage storage', 'Number 5,2', 'MS_ROUTE_HEADER float; HIST varchar(4)', 'Confirm which table is maintained by the screen')],
 tbd=['Relation MS_ROUTE (ROUTE_CODE, PRICE_CODE) vs MS_ROUTE_DETAIL', 'Role of MS_ROUTE_PERCENTAGE_HIST (period copy?)', 'ROUTE_HEADER_ID generation'])
for k, v in MAPS.items():
    json.dump({'uiss': k, **v}, open(f'{k}.json', 'w'), indent=1)
print('written', len(MAPS))
