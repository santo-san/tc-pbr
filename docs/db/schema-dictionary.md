# ELIPS schema - data dictionary of the tables relevant to TC-PBR

Generated from `docs/db/ELIPS_Schema.sql` (script date 11/14/2026, database AE070_ILS_DB) by `scripts/make_dictionary.py`.
Everything below is **confirmed by schema**. No sample data was provided, so value patterns are not described here.
Legend: PK = primary key column, NN = NOT NULL, default as scripted.

Schema totals: 200 tables, 4823 columns, 124 tables with a PK, 6 foreign keys, 212 defaults, no views / procedures / triggers in the script.

## Master data

### ielp.MS_TRUCKING_COMPANY

PK: COMPANY_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | COMPANY_ID | varchar(10) | Y | Y |  |
| 2 | COMPANY_CODE | varchar(20) | Y |  |  |
| 3 | SAP_COMPANY_CODE | varchar(20) | Y |  |  |
| 4 | COMPANY_NAME | varchar(500) | Y |  |  |
| 5 | NPWP | varchar(100) | Y |  |  |
| 6 | EMAIL | varchar(50) |  |  |  |
| 7 | PHONE | varchar(20) |  |  |  |
| 8 | MOBILE_PHONE | varchar(20) |  |  |  |
| 9 | CONTACT_NAME | varchar(200) |  |  |  |
| 10 | COMPANY_ADDRESS | varchar(500) |  |  |  |
| 11 | CREATED_DATE | datetime | Y |  |  |
| 12 | CREATED_BY | varchar(500) | Y |  |  |
| 13 | UPDATED_DATE | datetime |  |  |  |
| 14 | UPDATED_BY | varchar(100) |  |  |  |
| 15 | IS_DELETE | varchar(1) |  |  | (0) |
| 16 | APP_ID | varchar(20) |  |  | 'ENVITRUCK' |
| 17 | BUSINESS_TYPE | int |  |  |  |

### ielp.MS_TRUCKING_COMPANY_CY

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | COMPANY_CY_ID | varchar(10) |  |  |  |
| 2 | COMPANY_ID | varchar(10) |  |  |  |
| 3 | LOCATION_ID | varchar(10) |  |  |  |
| 4 | LOCATION_SUB | varchar(10) |  |  |  |
| 5 | IS_DELETE | varchar(1) |  |  | '0' |
| 6 | CREATED_BY | varchar(100) |  |  |  |
| 7 | CREATED_DATE | datetime |  |  |  |
| 8 | APP_ID | varchar(20) |  |  | 'ENVITRUCK' |

### ielp.MS_LOCATION

PK: LOCATION_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | LOCATION_ID | varchar(10) | Y | Y |  |
| 2 | LOCATION_NAME | varchar(5000) | Y |  |  |
| 3 | LOCATION_ALIAS | varchar(100) | Y |  |  |
| 4 | LOCATION_LATITUDE | varchar(100) | Y |  |  |
| 5 | LOCATION_LANGITUDE | varchar(100) | Y |  |  |
| 6 | LOCATION_ADDRESS_ORI | varchar(5000) |  |  |  |
| 7 | LOCATION_AREA | varchar(10) |  |  |  |
| 8 | AUTO_FINISH | varchar(1) |  |  | (0) |
| 9 | AUTO_CYCLE | varchar(1) |  |  | (0) |
| 10 | CYCLE_LOC_TO | varchar(10) |  |  |  |
| 11 | LOCATION_ADRESS | varchar(5000) |  |  |  |
| 12 | CREATED_DATE | datetime | Y |  |  |
| 13 | CREATED_BY | varchar(500) | Y |  |  |
| 14 | UPDATED_DATE | datetime |  |  |  |
| 15 | UPDATED_BY | varchar(5000) |  |  |  |
| 16 | IS_DELETE | varchar(100) |  |  | (0) |
| 17 | LOCATION_SUB | varchar(10) |  |  |  |
| 18 | RADIUS | varchar(5) |  |  | '50' |
| 19 | APP_ID | varchar(20) |  |  |  |

### ielp.TB_M_MILEAGE

PK: LOC_NAME_FROM, FROM_CODE · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | LOC_NAME_FROM | varchar(100) | Y | Y |  |
| 2 | TO_CODE | varchar(100) |  |  |  |
| 3 | FROM_CODE | varchar(100) | Y | Y |  |
| 4 | LOC_NAME_TO | varchar(100) | Y |  |  |
| 5 | MILEAGE | decimal(18, 0) |  |  |  |
| 6 | CREATED_BY | varchar(20) | Y |  |  |
| 7 | CREATED_DT | datetime | Y |  |  |
| 8 | CHANGED_BY | varchar(20) |  |  |  |
| 9 | CHANGED_DT | datetime |  |  |  |
| 10 | IS_DELETE | varchar(5) |  |  |  |

### ielp.MS_ROUTE

PK: ROUTE_ID, PRICE_CODE · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ROUTE_ID | varchar(10) | Y | Y |  |
| 2 | PRICE_CODE | varchar(100) | Y | Y |  |
| 3 | ROUTE_CODE | varchar(100) | Y |  |  |
| 4 | CREATED_DATE | datetime |  |  |  |
| 5 | CREATED_BY | varchar(500) |  |  |  |
| 6 | UPDATED_DATE | datetime |  |  |  |
| 7 | UPDATED_BY | varchar(500) |  |  |  |
| 8 | IS_DELETE | varchar(1) |  |  | (0) |

### ielp.MS_ROUTE_HEADER

PK: ROUTE_HEADER_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ROUTE_HEADER_ID | varchar(10) | Y | Y |  |
| 2 | ROUTE_PERCENTAGE_VALUE | float | Y |  |  |
| 3 | REMARK | varchar(max) |  |  |  |
| 4 | CREATED_DATE | datetime | Y |  |  |
| 5 | CREATED_BY | varchar(500) | Y |  |  |
| 6 | UPDATED_DATE | datetime |  |  |  |
| 7 | UPDATED_BY | varchar(500) |  |  |  |
| 8 | IS_DELETE | varchar(1) | Y |  | (0) |
| 9 | IS_SYNC | varchar(1) |  |  |  |

### ielp.MS_ROUTE_DETAIL

PK: ROUTE_DETAIL_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ROUTE_DETAIL_ID | varchar(16) | Y | Y |  |
| 2 | ROUTE_HEADER_ID | varchar(10) | Y |  |  |
| 3 | ROUTE_CODE | varchar(100) | Y |  |  |
| 4 | CREATED_DATE | datetime |  |  |  |
| 5 | CREATED_BY | varchar(500) |  |  |  |
| 6 | UPDATED_DATE | datetime |  |  |  |
| 7 | UPDATED_BY | varchar(500) |  |  |  |
| 8 | IS_DELETE | varchar(1) |  |  | (0) |
| 9 | ROUTE_DESCR | varchar(500) |  |  |  |
| 10 | IS_SYNC | varchar(1) |  |  |  |

### ielp.MS_ROUTE_PRICE

PK: ROUTE_PRICE_ID, ROUTE_HEADER_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ROUTE_HEADER_ID | varchar(10) | Y | Y |  |
| 2 | ROUTE_PRICE_ID | varchar(50) | Y | Y |  |
| 3 | ROUTE_PRICE_CODE | varchar(20) | Y |  |  |
| 4 | ROUTE_PRICE_VALUE | float |  |  |  |
| 5 | ROUTE_PRICE_DESC | varchar(max) |  |  |  |
| 6 | ROUTE_PRICE_MAT_CODE | varchar(23) |  |  |  |
| 7 | ROUTE_PRICE_MAT_FEATURE | varchar(500) |  |  |  |
| 8 | ROUTE_PRICE_SIZE | varchar(2) |  |  |  |
| 9 | ROUTE_PRICE_CURRENCY | varchar(5) |  |  |  |
| 10 | REMARK | varchar(max) |  |  |  |
| 11 | CREATED_DATE | datetime | Y |  |  |
| 12 | CREATED_BY | varchar(500) | Y |  |  |
| 13 | UPDATED_DATE | datetime |  |  |  |
| 14 | UPDATED_BY | varchar(500) |  |  |  |
| 15 | IS_DELETE | varchar(1) | Y |  | (0) |
| 16 | COMPANY_CODE | varchar(20) |  |  |  |
| 17 | VALID_DT_FROM | datetime |  |  |  |
| 18 | VALID_DT_TO | datetime |  |  |  |
| 19 | SYNC_DATE | datetime |  |  |  |
| 20 | SYNC_BY | varchar(500) |  |  |  |
| 21 | IS_SYNC | varchar(1) |  |  |  |

### ielp.MS_ROUTE_PERCENTAGE_HIST

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ROUTE_PERCENTAGE_ID | varchar(14) |  |  |  |
| 2 | ROUTE_PERIOD | varchar(6) |  |  |  |
| 3 | ROUTE_PRICE_CODE | varchar(14) |  |  |  |
| 4 | ROUTE_CODE | varchar(20) |  |  |  |
| 5 | ROUTE_TOTAL_CYCLE | varchar(4) |  |  |  |
| 6 | ROUTE_PERCENTAGE_VALUE | varchar(4) |  |  |  |
| 7 | PLANT | varchar(14) |  |  |  |
| 8 | DISTANCE | int |  |  |  |
| 9 | REMARK | varchar(100) |  |  |  |
| 10 | CREATED_DATE | datetime |  |  |  |
| 11 | CREATED_BY | varchar(500) |  |  |  |
| 12 | UPDATED_DATE | datetime |  |  |  |
| 13 | UPDATED_BY | varchar(500) |  |  |  |
| 14 | IS_DELETE | varchar(1) |  |  | (0) |
| 15 | DESCRIPTION | varchar(500) |  |  |  |

### ielp.MS_KPI

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | KPI_ID | varchar(20) | Y |  |  |
| 2 | KPI_NAME | varchar(50) | Y |  |  |
| 3 | DESCRIPTION | varchar(150) |  |  |  |
| 4 | WEIGHT | numeric(38, 0) |  |  |  |
| 5 | IS_DELETE | varchar(1) | Y |  | (0) |
| 6 | CREATED_DATE | datetime | Y |  |  |
| 7 | CREATED_BY | varchar(500) |  |  |  |
| 8 | UPDATED_DATE | datetime | Y |  |  |
| 9 | UPDATED_BY | varchar(500) |  |  |  |
| 10 | ORDER_SEQ | numeric(38, 0) |  |  |  |
| 11 | APP_ID | varchar(20) |  |  |  |

### ielp.MS_KPI_PERCENTAGE

PK: KPI_PERCENTAGE_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | KPI_PERCENTAGE_ID | varchar(10) | Y | Y |  |
| 2 | FROM_PERCENTAGE | int | Y |  |  |
| 3 | TO_PERCENTAGE | int | Y |  |  |
| 4 | VALUE | int | Y |  |  |
| 5 | CREATED_DATE | datetime |  |  |  |
| 6 | CREATED_BY | varchar(500) |  |  |  |
| 7 | UPDATED_DATE | datetime |  |  |  |
| 8 | UPDATED_BY | varchar(500) |  |  |  |
| 9 | IS_DELETE | varchar(1) |  |  | (0) |

### ielp.MS_RENBAN

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | RENBAN_ID | varchar(10) | Y |  |  |
| 2 | SOURCES | varchar(10) | Y |  |  |
| 3 | RENBAN_DESTINATION | varchar(2) |  |  |  |
| 4 | RENBAN_LOCATION | varchar(5) |  |  |  |
| 5 | DESCRIPTION | varchar(500) |  |  |  |
| 6 | CREATED_DATE | datetime |  |  |  |
| 7 | CREATED_BY | varchar(500) |  |  |  |
| 8 | UPDATED_DATE | datetime |  |  |  |
| 9 | UPDATED_BY | varchar(500) |  |  |  |
| 10 | IS_DELETE | varchar(100) |  |  | (0) |

### ielp.MS_RENBAN_TCPBR

PK: PLANT_CD, DEST_CD, RENBAN_CD · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | PLANT_CD | varchar(10) | Y | Y |  |
| 2 | DEST_CD | varchar(10) | Y | Y |  |
| 3 | RENBAN_CD | varchar(3) | Y | Y |  |
| 4 | SOURCE_LOCATION_ID | varchar(20) | Y |  |  |
| 5 | VERSION | int | Y |  | (1) |
| 6 | CREATED_BY | varchar(50) | Y |  |  |
| 7 | CREATED_DT | datetime2(0) | Y |  | sysdatetime() |
| 8 | CHANGED_BY | varchar(50) |  |  |  |
| 9 | CHANGED_DT | datetime2(0) |  |  |  |

### ielp.MS_DRIVER

PK: DRIVER_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | DRIVER_ID | varchar(10) | Y | Y |  |
| 2 | DRIVER_NAME | varchar(500) | Y |  |  |
| 3 | KTP_NO | varchar(100) |  |  |  |
| 4 | PHONE | varchar(20) |  |  |  |
| 5 | MOBILE_PHONE | varchar(20) |  |  |  |
| 6 | DRIVER_LICENSE_NO | varchar(50) |  |  |  |
| 7 | DRIVER_LICENSE_EXPIRED | date |  |  |  |
| 8 | CREATED_DATE | datetime | Y |  |  |
| 9 | CREATED_BY | varchar(500) | Y |  |  |
| 10 | UPDATED_DATE | datetime |  |  |  |
| 11 | UPDATED_BY | varchar(500) |  |  |  |
| 12 | IS_DELETE | varchar(1) |  |  | (0) |
| 13 | USER_NAME | varchar(100) | Y |  |  |
| 14 | PASSWORD | varchar(250) | Y |  |  |
| 15 | COMPANY_ID | varchar(10) | Y |  |  |

### ielp.MS_TRUCK_REGISTRATION

PK: TRUCK_ID, COMPANY_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | TRUCK_ID | varchar(10) | Y | Y |  |
| 2 | COMPANY_ID | varchar(10) | Y | Y |  |
| 3 | LICENSE_PLATE | varchar(20) | Y |  |  |
| 4 | STNK_NO | varchar(50) |  |  |  |
| 5 | TRUCK_TYPE | varchar(15) |  |  |  |
| 6 | STNK_EXPIRED | date |  |  |  |
| 7 | TRADE_MARK | varchar(100) |  |  |  |
| 8 | CHASIS_SIZE | varchar(2) |  |  |  |
| 9 | DRIVER_ID | varchar(20) |  |  |  |
| 10 | DRIVER_NAME | varchar(500) |  |  |  |
| 11 | YEAR_MADE | int |  |  |  |
| 12 | CREATED_DATE | datetime | Y |  |  |
| 13 | CREATED_BY | varchar(500) | Y |  |  |
| 14 | UPDATED_DATE | datetime |  |  |  |
| 15 | UPDATED_BY | varchar(500) |  |  |  |
| 16 | IS_DELETE | varchar(1) |  |  | (0) |

### ielp.MS_TRUCK

PK: POLICE_NO · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | POLICE_NO | varchar(12) | Y | Y |  |
| 2 | CUSTOMER | varchar(20) |  |  |  |
| 3 | SITE_ID | varchar(20) |  |  |  |
| 4 | OWNER_NAME | varchar(40) |  |  |  |
| 5 | TRADE_MARK | varchar(20) |  |  |  |
| 6 | STNK_NO | varchar(35) |  |  |  |
| 7 | MACHINE_NO | varchar(20) |  |  |  |
| 8 | DESIGN_NO | varchar(20) |  |  |  |
| 9 | UPD_TS | datetime |  |  |  |
| 10 | TRUCK_CODE | varchar(5) |  |  | (0) |
| 11 | TRUCK_WEIGHT | varchar(10) |  |  |  |
| 12 | STATE | varchar(10) |  |  |  |
| 13 | OPER_NAME | varchar(15) |  |  |  |
| 14 | GATE_NO | varchar(2) |  |  |  |
| 15 | TOTAL_WEIGHT_HT_CH | varchar(10) |  |  | (0) |
| 16 | YEAR_MADE | varchar(4) |  |  |  |
| 17 | EXPIRED_LISENCE | datetime |  |  |  |
| 18 | CHASSIS_CODE | varchar(5) |  |  |  |
| 19 | BBG_YN | varchar(1) |  |  |  |
| 20 | OTL_YN | varchar(1) |  |  |  |
| 21 | ID_RFID | varchar(30) |  |  |  |
| 22 | TRUCK_TYPE | varchar(10) |  |  |  |
| 23 | CHS_SIZE | varchar(10) |  |  |  |
| 24 | IS_2_FULL | varchar(1) |  |  |  |
| 25 | EXPIRED_INSPACTION | datetime |  |  |  |
| 26 | ORDER_MAX | varchar(10) |  |  |  |
| 27 | BASE_LOC | varchar(6) |  |  |  |
| 28 | APP_ID | varchar(20) |  |  |  |
| 29 | IS_ACTIVE | varchar(1) | Y |  | 'Y' |
| 30 | UPD_BY | varchar(100) |  |  |  |
| 31 | IS_USE | varchar(1) |  |  | (0) |
| 32 | DRIVER_ID | varchar(10) |  |  |  |
| 33 | CHASSHIS_NUMBER | varchar(50) |  |  |  |
| 34 | DRIVER_NAME | varchar(100) |  |  |  |
| 35 | CODETP | varchar(100) |  |  |  |
| 36 | CODEREF | varchar(100) |  |  |  |

### ielp.MS_STATUS

PK: STATUS_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | STATUS_ID | numeric(38, 0) | Y | Y |  |
| 2 | STATUS_TYPE | varchar(100) | Y |  |  |
| 3 | STATUS_CODE | varchar(3) | Y |  |  |
| 4 | STATUS_NAME | varchar(100) | Y |  |  |
| 5 | STATUS_DESCRIPTION | varchar(500) |  |  |  |
| 6 | IS_DELETE | varchar(1) |  |  | '0' |
| 7 | CREATED_DATE | datetime | Y |  |  |
| 8 | CREATED_BAY | varchar(500) | Y |  |  |
| 9 | UPDATED_DATE | datetime |  |  |  |
| 10 | UPDATED_BY | varchar(500) |  |  |  |

### ielp.MS_SYSCODE

PK: SYSCODE_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | SYSCODE_ID | varchar(10) | Y | Y |  |
| 2 | CODE_TP | varchar(500) | Y |  |  |
| 3 | CODE_REF | varchar(max) | Y |  |  |
| 4 | DESCRIPTION | varchar(5000) | Y |  |  |
| 5 | CREATED_DATE | datetime | Y |  |  |
| 6 | CREATED_BY | varchar(50) | Y |  |  |
| 7 | UPDATED_DATE | datetime |  |  |  |
| 8 | UPDATED_BY | varchar(500) |  |  |  |
| 9 | IS_DELETE | varchar(100) |  |  | (0) |
| 10 | CODE_REF2 | varchar(500) |  |  |  |
| 11 | CODE_TP_DESCR | varchar(250) |  |  |  |
| 12 | APP_ID | varchar(20) | Y |  |  |

### ielp.MS_WBS

PK: MS_WBS_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | MS_WBS_ID | varchar(10) | Y | Y |  |
| 2 | WBS_NUMBER | varchar(100) | Y |  |  |
| 3 | SERVICE_TYPE | varchar(100) |  |  |  |
| 4 | SERVICE_CODE | varchar(10) |  |  |  |
| 5 | VALID_FROM | date |  |  |  |
| 6 | VALID_TO | date |  |  |  |
| 7 | CREATED_DATE | datetime |  |  |  |
| 8 | CREATED_BY | varchar(500) |  |  |  |
| 9 | UPDATED_DATE | datetime |  |  |  |
| 10 | UPDATED_BY | varchar(500) |  |  |  |
| 11 | IS_DELETE | varchar(1) | Y |  | (0) |
| 12 | GL_ACCOUNT | varchar(50) |  |  |  |
| 13 | COST_CENTER | varchar(10) |  |  |  |
| 14 | APP_ID | varchar(20) |  |  |  |

### ielp.TB_M_SYSTEM

PK: SYS_CAT, SYS_SUB_CAT, SYS_CD · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | SYS_CAT | varchar(30) | Y | Y |  |
| 2 | SYS_SUB_CAT | varchar(250) | Y | Y |  |
| 3 | SYS_CD | varchar(30) | Y | Y |  |
| 4 | SYS_VALUE | varchar(2000) | Y |  |  |
| 5 | REMARKS | varchar(100) |  |  |  |
| 6 | CREATED_BY | varchar(20) | Y |  |  |
| 7 | CREATED_DT | datetime | Y |  |  |
| 8 | CHANGED_BY | varchar(20) |  |  |  |
| 9 | CHANGED_DT | datetime |  |  |  |

### ielp.ITG_ECAT

PK: ITG_ECAT_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ITG_ECAT_ID | varchar(10) | Y | Y |  |
| 2 | ITG_LOG_ID | varchar(10) | Y |  |  |
| 3 | MAT_DESC | varchar(500) | Y |  |  |
| 4 | MAT_NO | varchar(100) | Y |  |  |
| 5 | PRICE_AMOUNT | real | Y |  |  |
| 6 | SAP_VENDOR_ID | varchar(100) | Y |  |  |
| 7 | VENDOR_CD | varchar(100) | Y |  |  |
| 8 | VENDOR_NAME | varchar(1000) |  |  |  |
| 9 | IS_DELETE | varchar(1) | Y |  | (0) |
| 10 | CREATED_DATE | datetime |  |  |  |
| 11 | CREATED_BY | varchar(100) |  |  |  |
| 12 | CURR_CD | varchar(100) |  |  |  |
| 13 | MATERIAL_FEATURE | varchar(max) |  |  |  |
| 14 | PRICE_ID | varchar(100) |  |  |  |

## DTP / Daily order

### ielp.DTP_HEADER

PK: DTP_HEADER_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | DTP_HEADER_ID | varchar(10) | Y | Y |  |
| 2 | DTP_DESC | varchar(50) | Y |  |  |
| 3 | DTP_DATE | date | Y |  |  |
| 4 | DTP_START_DATE | datetime |  |  |  |
| 5 | DTP_END_DATE | datetime |  |  |  |
| 6 | DTP_TOTAL_ORDER | int |  |  |  |
| 7 | IS_DELETE | varchar(1) |  |  | (0) |
| 8 | CREATED_DATE | datetime | Y |  |  |
| 9 | CREATED_BY | varchar(500) | Y |  |  |
| 10 | UPDATED_DATE | datetime |  |  |  |
| 11 | UPDATED_BY | varchar(500) |  |  |  |
| 12 | DTP_STATUS | varchar(100) | Y |  |  |
| 13 | DTP_TYPE | varchar(1) |  |  |  |

### ielp.DTP_1_DETAIL

PK: DTP_DET_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | DTP_DET_ID | varchar(20) | Y | Y |  |
| 2 | ORDER_NO | varchar(20) | Y |  |  |
| 3 | COMPANY_ID | varchar(10) |  |  |  |
| 4 | LICENSE_PLATE | varchar(20) |  |  |  |
| 5 | DRIVER_ID | varchar(10) |  |  |  |
| 6 | FROM_LOC | varchar(10) |  |  |  |
| 7 | TO_LOC | varchar(10) |  |  |  |
| 8 | PO_NUMBER | varchar(20) |  |  |  |
| 9 | SOURCES | varchar(10) |  |  |  |
| 10 | VESSEL | varchar(500) |  |  |  |
| 11 | FORWADING_AGENT | varchar(10) |  |  |  |
| 12 | TOTAL_BL | numeric(38, 0) |  |  |  |
| 13 | CONTAINER_NO | varchar(11) |  |  |  |
| 14 | CTR_SIZE | int |  |  |  |
| 15 | RENBAN | varchar(500) |  |  |  |
| 16 | CREATED_DATE | datetime | Y |  |  |
| 17 | CREATED_BY | varchar(500) |  |  |  |
| 18 | UPDATED_DATE | datetime | Y |  |  |
| 19 | UPDATED_BY | varchar(500) |  |  |  |
| 20 | PO_NUMBER_TC | varchar(100) |  |  |  |
| 21 | PO_NUMBER_FA | varchar(100) |  |  |  |
| 22 | DELIVERY_FROM_PORT_PLAN | datetime |  |  |  |
| 23 | DELIVERY_FROM_PORT_ACT | datetime |  |  |  |
| 24 | ARRIVAL_CONTAINER_PLAN | datetime |  |  |  |
| 25 | ARRIVAL_CONTAINER_ACT | datetime |  |  |  |
| 26 | DTP_HEADER_ID | varchar(10) | Y |  |  |
| 27 | IS_DELETE | varchar(1) | Y |  | (0) |
| 28 | SERVICE_TYPE | varchar(5) | Y |  |  |
| 29 | TRUCK_TYPE | varchar(5) | Y |  |  |
| 30 | BL_NO | varchar(500) |  |  |  |
| 31 | DESCRIPTION | varchar(max) |  |  |  |
| 32 | STATUS_CODE | varchar(3) |  |  |  |
| 33 | SHIFT | varchar(100) |  |  |  |
| 34 | IS_SA | varchar(1) |  |  | '0' |
| 35 | CTR_TYPE | varchar(10) |  |  |  |
| 36 | IS_DG | varchar(1) |  |  | '0' |
| 37 | CTR_SIZE_PLN_UPD | int |  |  |  |

### ielp.DTP_2_DETAIL

PK: ORDER_NO · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | DTP_DET_ID | varchar(20) | Y |  |  |
| 2 | ORDER_NO | varchar(20) | Y | Y |  |
| 3 | COMPANY_ID | varchar(10) |  |  |  |
| 4 | LICENSE_PLATE | varchar(20) |  |  |  |
| 5 | DRIVER_ID | varchar(10) |  |  |  |
| 6 | FROM_LOC | varchar(10) |  |  |  |
| 7 | TO_LOC | varchar(10) |  |  |  |
| 8 | PO_NUMBER | varchar(20) |  |  |  |
| 9 | CTR_BOOKING_NO | varchar(50) |  |  |  |
| 10 | SOURCES | varchar(10) |  |  |  |
| 11 | COUNTRY | varchar(100) |  |  |  |
| 12 | VESSEL | varchar(500) |  |  |  |
| 13 | SHIPPING_AGENT | varchar(500) |  |  |  |
| 14 | FORWADING_AGENT | varchar(10) |  |  |  |
| 15 | TOTAL_BL | numeric(38, 0) |  |  |  |
| 16 | CONTAINER_NO | varchar(11) |  |  |  |
| 17 | CTR_SIZE | int |  |  |  |
| 18 | SEAL_NO | varchar(100) |  |  |  |
| 19 | RENBAN | varchar(500) |  |  |  |
| 20 | CREATED_DATE | datetime | Y |  |  |
| 21 | CREATED_BY | varchar(500) |  |  |  |
| 22 | DTP_HEADER_ID | varchar(10) | Y |  |  |
| 23 | IS_DELETE | varchar(1) |  |  | '0' |
| 24 | SERVICE_TYPE | varchar(5) |  |  |  |
| 25 | TRUCK_TYPE | varchar(5) |  |  |  |
| 26 | UPDATED_BY | varchar(500) |  |  |  |
| 27 | UPDATED_DATE | datetime |  |  |  |
| 28 | ETD | date |  |  |  |
| 29 | STATUS_CODE | varchar(3) |  |  |  |
| 30 | IS_ROUNDUSE | varchar(1) |  |  | '0' |
| 31 | DESCRIPTION | varchar(max) |  |  |  |
| 32 | SHIFT | varchar(100) |  |  |  |
| 33 | IS_SA | varchar(1) |  |  | '0' |
| 34 | CTR_TYPE | varchar(10) |  |  |  |
| 35 | IS_DG | varchar(1) |  |  | '0' |
| 36 | ARRIVAL_DATE | date |  |  |  |
| 37 | ARRIVAL_TIME | varchar(10) |  |  |  |
| 38 | CTR_SIZE_PLN_UPD | int |  |  |  |

### ielp.DTP_3_DETAIL

PK: ORDER_NO · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | DTP_DET_ID | varchar(20) | Y |  |  |
| 2 | ORDER_NO | varchar(20) | Y | Y |  |
| 3 | COMPANY_ID | varchar(10) |  |  |  |
| 4 | LICENSE_PLATE | varchar(20) |  |  |  |
| 5 | DRIVER_ID | varchar(10) |  |  |  |
| 6 | FROM_LOC | varchar(10) |  |  |  |
| 7 | TO_LOC | varchar(10) |  |  |  |
| 8 | PO_NUMBER | varchar(20) |  |  |  |
| 9 | CTR_BOOKING_NO | varchar(50) |  |  |  |
| 10 | SOURCES | varchar(10) |  |  |  |
| 11 | COUNTRY | varchar(100) |  |  |  |
| 12 | VESSEL | varchar(500) |  |  |  |
| 13 | SHIPPING_AGENT | varchar(500) |  |  |  |
| 14 | FORWADING_AGENT | varchar(10) |  |  |  |
| 15 | TOTAL_BL | numeric(38, 0) |  |  |  |
| 16 | CONTAINER_NO | varchar(11) |  |  |  |
| 17 | CTR_SIZE | varchar(4) |  |  |  |
| 18 | SEAL_NO | varchar(100) |  |  |  |
| 19 | RENBAN | varchar(500) |  |  |  |
| 20 | CREATED_DATE | datetime | Y |  |  |
| 21 | CREATED_BY | varchar(500) |  |  |  |
| 22 | DTP_HEADER_ID | varchar(10) | Y |  |  |
| 23 | SERVICE_TYPE | varchar(20) |  |  |  |
| 24 | TRUCK_TYPE | varchar(20) |  |  |  |
| 25 | IS_DELETE | varchar(1) |  |  | '0' |
| 26 | UPDATED_BY | varchar(200) |  |  |  |
| 27 | UPDATED_DATE | datetime |  |  |  |
| 28 | ETD_DATE | date |  |  |  |
| 29 | DESCR | varchar(500) |  |  |  |
| 30 | STATUS_CODE | varchar(3) |  |  |  |
| 31 | SHIFT | varchar(100) |  |  |  |
| 32 | IS_SA | varchar(1) |  |  | '0' |
| 33 | CTR_TYPE | varchar(10) |  |  |  |
| 34 | IS_DG | varchar(1) |  |  | '0' |
| 35 | ARRIVAL_DATE | date |  |  |  |
| 36 | ARRIVAL_TIME | varchar(10) |  |  |  |
| 37 | CTR_SIZE_PLN_UPD | int |  |  |  |

### ielp.DTP_4_DETAIL

PK: DTP_DET_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | DTP_DET_ID | varchar(20) | Y | Y |  |
| 2 | DTP_HEADER_ID | varchar(10) | Y |  |  |
| 3 | ORDER_DATE | datetime | Y |  |  |
| 4 | ORDER_NO | varchar(20) | Y |  |  |
| 5 | COMPANY_ID | varchar(10) |  |  |  |
| 6 | LICENSE_PLATE | varchar(20) |  |  |  |
| 7 | DRIVER_ID | varchar(10) |  |  |  |
| 8 | FROM_LOC | varchar(10) |  |  |  |
| 9 | TO_LOC | varchar(10) |  |  |  |
| 10 | PO_NUMBER | varchar(20) |  |  |  |
| 11 | SOURCES | varchar(10) |  |  |  |
| 12 | VESSEL | varchar(500) |  |  |  |
| 13 | FORWADING_AGENT | varchar(10) |  |  |  |
| 14 | TOTAL_BL | numeric(38, 0) |  |  |  |
| 15 | CONTAINER_NO | varchar(11) |  |  |  |
| 16 | CTR_SIZE | int |  |  |  |
| 17 | RENBAN | varchar(500) |  |  |  |
| 18 | PO_NUMBER_TC | varchar(100) |  |  |  |
| 19 | PO_NUMBER_FA | varchar(100) |  |  |  |
| 20 | SERVICE_TYPE | varchar(5) |  |  |  |
| 21 | TRUCK_TYPE | varchar(5) |  |  |  |
| 22 | BL_NO | varchar(500) |  |  |  |
| 23 | DESCRIPTION | varchar(max) |  |  |  |
| 24 | DELIVERY_FROM_PORT_PLAN | datetime |  |  |  |
| 25 | DELIVERY_FROM_PORT_ACT | datetime |  |  |  |
| 26 | ARRIVAL_CONTAINER_PLAN | datetime |  |  |  |
| 27 | ARRIVAL_CONTAINER_ACT | datetime |  |  |  |
| 28 | IS_DELETE | varchar(1) | Y |  | (0) |
| 29 | CREATED_DATE | datetime | Y |  |  |
| 30 | CREATED_BY | varchar(500) |  |  |  |
| 31 | UPDATED_DATE | datetime | Y |  |  |
| 32 | UPDATED_BY | varchar(500) |  |  |  |
| 33 | STATUS_CODE | varchar(3) |  |  |  |
| 34 | IS_SA | varchar(1) |  |  | '0' |

### ielp.DTP_FILES

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | DTP_HEADER_ID | varchar(10) | Y |  |  |
| 2 | UPLOAD_SEQ | int |  |  | (0) |
| 3 | FILE_TYPE | varchar(10) |  |  |  |
| 4 | FILE_NAME | varchar(500) |  |  |  |
| 5 | FILE_NEW_NAME | varchar(500) |  |  |  |
| 6 | DESCRIPTION | varchar(500) |  |  |  |
| 7 | IS_DELETE | varchar(1) |  |  | '0' |
| 8 | CREATED_DATE | datetime | Y |  |  |
| 9 | CREATED_BY | varchar(500) |  |  |  |
| 10 | UPDATED_DATE | datetime |  |  |  |
| 11 | DELETED_BY | varchar(500) |  |  |  |
| 12 | DELETED_DATE | datetime |  |  |  |

### ielp.ORDER_CYCLE

PK: ORDER_CYCLE_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ORDER_CYCLE_ID | varchar(20) | Y | Y |  |
| 2 | ORDER_NO | varchar(20) | Y |  |  |
| 3 | DTP_HEADER_ID | varchar(10) | Y |  |  |
| 4 | COMPANY_ID | varchar(10) |  |  |  |
| 5 | LICENSE_PLATE | varchar(20) |  |  |  |
| 6 | DRIVER_ID | varchar(10) |  |  |  |
| 7 | FROM_LOC | varchar(10) |  |  |  |
| 8 | TO_LOC | varchar(10) |  |  |  |
| 9 | PO_NUMBER | varchar(20) |  |  |  |
| 10 | SOURCES | varchar(10) |  |  |  |
| 11 | VESSEL | varchar(500) |  |  |  |
| 12 | FORWADING_AGENT | varchar(10) |  |  |  |
| 13 | TOTAL_BL | numeric(38, 0) |  |  |  |
| 14 | CONTAINER_NO | varchar(11) |  |  |  |
| 15 | CTR_SIZE | int |  |  |  |
| 16 | RENBAN | varchar(500) |  |  |  |
| 17 | CREATED_DATE | datetime | Y |  |  |
| 18 | CREATED_BY | varchar(500) |  |  |  |
| 19 | UPDATED_DATE | datetime |  |  |  |
| 20 | UPDATED_BY | varchar(500) |  |  |  |
| 21 | PO_NUMBER_TC | varchar(100) |  |  |  |
| 22 | PO_NUMBER_FA | varchar(100) |  |  |  |
| 23 | DELIVERY_FROM_PORT_PLAN | datetime |  |  |  |
| 24 | DELIVERY_FROM_PORT_ACT | datetime |  |  |  |
| 25 | ARRIVAL_CONTAINER_PLAN | datetime |  |  |  |
| 26 | ARRIVAL_CONTAINER_ACT | datetime |  |  |  |
| 27 | IS_DELETE | varchar(1) | Y |  | (0) |
| 28 | IS_COMPLETE | varchar(1) | Y |  | (0) |
| 29 | STATUS_CODE | varchar(3) | Y |  |  |
| 30 | START_DATE | datetime |  |  |  |
| 31 | PICKUP_DATE | datetime |  |  |  |
| 32 | COMPLETE_DATE | datetime |  |  |  |
| 33 | IS_FORCE_COMPLETE | varchar(1) |  |  | '0' |
| 34 | IS_AUTO_FINISH_ORDER | varchar(1) |  |  | '0' |
| 35 | IS_AUTO_CYCLE | varchar(1) |  |  | '0' |
| 36 | SEAL_NO | varchar(100) |  |  |  |
| 37 | CTR_BOOKING_NO | varchar(50) |  |  |  |
| 38 | SHIPPING_AGENT | varchar(500) |  |  |  |
| 39 | CYCLE_SEQ | varchar(2) | Y |  |  |
| 40 | DTP_DET_ID | varchar(20) |  |  |  |
| 41 | SERVICE_TYPE | varchar(5) |  |  |  |
| 42 | TRUCK_TYPE | varchar(5) |  |  |  |
| 43 | BL_NO | varchar(500) |  |  |  |
| 44 | DESCRIPTION | varchar(max) |  |  |  |
| 45 | ORDER_DATE | date |  |  |  |
| 46 | ETD | date |  |  |  |
| 47 | NEXT_ORDER_NO | varchar(20) |  |  |  |
| 48 | CANCEL_REMARKS | varchar(500) |  |  |  |
| 49 | CANCEL_DATE | date |  |  |  |
| 50 | FINISH_REMARKS | varchar(500) |  |  |  |
| 51 | IS_ROUNDUSE | varchar(1) |  |  | (0) |
| 52 | SHIFT | varchar(100) |  |  |  |
| 53 | PICKUP_EST | datetime |  |  |  |
| 54 | COMPLETE_EST | datetime |  |  |  |
| 55 | SA_CODE | varchar(16) |  |  |  |
| 56 | FINISH_BY_LP | varchar(1) |  |  | '0' |
| 57 | PICKUP_BY_LP | varchar(1) |  |  | '0' |
| 58 | START_BY_LP | varchar(1) |  |  | '0' |
| 59 | START_LATITUDE | varchar(100) |  |  |  |
| 60 | START_LONGITUDE | varchar(100) |  |  |  |
| 61 | PICKUP_LATITUDE | varchar(100) |  |  |  |
| 62 | PICKUP_LONGITUDE | varchar(100) |  |  |  |
| 63 | FINISH_LATITUDE | varchar(100) |  |  |  |
| 64 | FINISH_LONGITUDE | varchar(100) |  |  |  |
| 65 | CTR_TYPE | varchar(10) |  |  |  |
| 66 | IS_DG | varchar(1) |  |  | '0' |
| 67 | FINISH_ORDER_DATE | datetime |  |  |  |
| 68 | FINISH_ORDER_BY | varchar(500) |  |  |  |
| 69 | ARRIVAL_DATE | date |  |  |  |
| 70 | ARRIVAL_TIME | varchar(10) |  |  |  |
| 71 | PICKUP_DISTANCE | varchar(100) |  |  |  |
| 72 | FINISH_DISTANCE | varchar(100) |  |  |  |
| 73 | IS_PICKUP_EX_GEOFENCE | varchar(1) |  |  |  |
| 74 | IS_FINISH_EX_GEOFENCE | varchar(1) |  |  |  |

### ielp.ORDER_CYCLE_ROLLBACK_H

PK: ROLLBACK_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ROLLBACK_ID | varchar(20) | Y | Y |  |
| 2 | ORDER_CYCLE_ID | varchar(20) | Y |  |  |
| 3 | DTP_HEADER_ID | varchar(10) | Y |  |  |
| 4 | ORDER_NO | varchar(20) |  |  |  |
| 5 | CURR_STATUS_CODE | varchar(3) |  |  |  |
| 6 | ROLLBACK_BY | varchar(500) |  |  |  |
| 7 | ROLLBACK_DATE | datetime |  |  |  |
| 8 | ROLLBACK_REMARKS | varchar(max) |  |  |  |
| 9 | IS_DELETE | varchar(1) | Y |  | (0) |
| 10 | CYCLE_SEQ | varchar(2) |  |  |  |
| 11 | START_DATE | datetime |  |  |  |
| 12 | PICKUP_DATE | datetime |  |  |  |

### ielp.ORDER_CYCLE_MAINTENANCE_H

PK: ROLLBACK_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ROLLBACK_ID | varchar(20) | Y | Y |  |
| 2 | ORDER_CYCLE_ID | varchar(20) | Y |  |  |
| 3 | ORDER_NO | varchar(20) | Y |  |  |
| 4 | DTP_HEADER_ID | varchar(10) | Y |  |  |
| 5 | COMPANY_ID | varchar(10) |  |  |  |
| 6 | LICENSE_PLATE | varchar(20) |  |  |  |
| 7 | DRIVER_ID | varchar(10) |  |  |  |
| 8 | FROM_LOC | varchar(10) |  |  |  |
| 9 | TO_LOC | varchar(10) |  |  |  |
| 10 | PO_NUMBER | varchar(20) |  |  |  |
| 11 | SOURCES | varchar(10) |  |  |  |
| 12 | VESSEL | varchar(500) |  |  |  |
| 13 | FORWADING_AGENT | varchar(10) |  |  |  |
| 14 | TOTAL_BL | numeric(38, 0) |  |  |  |
| 15 | CONTAINER_NO | varchar(11) |  |  |  |
| 16 | CTR_SIZE | int |  |  |  |
| 17 | RENBAN | varchar(500) |  |  |  |
| 18 | CREATED_DATE | datetime | Y |  |  |
| 19 | CREATED_BY | varchar(500) |  |  |  |
| 20 | UPDATED_DATE | datetime |  |  |  |
| 21 | UPDATED_BY | varchar(500) |  |  |  |
| 22 | PO_NUMBER_TC | varchar(100) |  |  |  |
| 23 | PO_NUMBER_FA | varchar(100) |  |  |  |
| 24 | DELIVERY_FROM_PORT_PLAN | datetime |  |  |  |
| 25 | DELIVERY_FROM_PORT_ACT | datetime |  |  |  |
| 26 | ARRIVAL_CONTAINER_PLAN | datetime |  |  |  |
| 27 | ARRIVAL_CONTAINER_ACT | datetime |  |  |  |
| 28 | IS_DELETE | varchar(1) | Y |  | (0) |
| 29 | IS_COMPLETE | varchar(1) | Y |  | (0) |
| 30 | STATUS_CODE | varchar(3) | Y |  |  |
| 31 | START_DATE | datetime |  |  |  |
| 32 | PICKUP_DATE | datetime |  |  |  |
| 33 | COMPLETE_DATE | datetime |  |  |  |
| 34 | IS_FORCE_COMPLETE | varchar(1) |  |  | '0' |
| 35 | IS_AUTO_FINISH_ORDER | varchar(1) |  |  | '0' |
| 36 | IS_AUTO_CYCLE | varchar(1) |  |  | '0' |
| 37 | SEAL_NO | varchar(100) |  |  |  |
| 38 | CTR_BOOKING_NO | varchar(50) |  |  |  |
| 39 | SHIPPING_AGENT | varchar(500) |  |  |  |
| 40 | CYCLE_SEQ | varchar(2) | Y |  |  |
| 41 | DTP_DET_ID | varchar(20) |  |  |  |
| 42 | SERVICE_TYPE | varchar(5) |  |  |  |
| 43 | TRUCK_TYPE | varchar(5) |  |  |  |
| 44 | BL_NO | varchar(500) |  |  |  |
| 45 | DESCRIPTION | varchar(max) |  |  |  |
| 46 | ORDER_DATE | date |  |  |  |
| 47 | ETD | date |  |  |  |
| 48 | NEXT_ORDER_NO | varchar(20) |  |  |  |
| 49 | CANCEL_REMARKS | varchar(500) |  |  |  |
| 50 | CANCEL_DATE | date |  |  |  |
| 51 | FINISH_REMARKS | varchar(500) |  |  |  |
| 52 | IS_ROUNDUSE | varchar(1) |  |  | (0) |
| 53 | SHIFT | varchar(100) |  |  |  |
| 54 | PICKUP_EST | datetime |  |  |  |
| 55 | COMPLETE_EST | datetime |  |  |  |
| 56 | SA_CODE | varchar(16) |  |  |  |
| 57 | FINISH_BY_LP | varchar(1) |  |  | '0' |
| 58 | PICKUP_BY_LP | varchar(1) |  |  | '0' |
| 59 | START_BY_LP | varchar(1) |  |  | '0' |
| 60 | START_LATITUDE | varchar(100) |  |  |  |
| 61 | START_LONGITUDE | varchar(100) |  |  |  |
| 62 | PICKUP_LATITUDE | varchar(100) |  |  |  |
| 63 | PICKUP_LONGITUDE | varchar(100) |  |  |  |
| 64 | FINISH_LATITUDE | varchar(100) |  |  |  |
| 65 | FINISH_LONGITUDE | varchar(100) |  |  |  |
| 66 | CTR_TYPE | varchar(10) |  |  |  |
| 67 | IS_DG | varchar(1) |  |  | '0' |
| 68 | FINISH_ORDER_DATE | datetime |  |  |  |
| 69 | FINISH_ORDER_BY | varchar(500) |  |  |  |
| 70 | ARRIVAL_DATE | date |  |  |  |
| 71 | ARRIVAL_TIME | varchar(10) |  |  |  |
| 72 | MAINTENANCE_BY | varchar(500) |  |  |  |
| 73 | MAINTENANCE_DATE | datetime |  |  |  |
| 74 | MAINTENANCE_REMARKS | varchar(max) |  |  |  |
| 75 | MAINTENANCE_TYPE | varchar(500) |  |  |  |

### ielp.ORDER_TRUCK_H

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ORDER_TRUCK_H_ID | varchar(10) |  |  |  |
| 2 | ORDER_NO | varchar(20) |  |  |  |
| 3 | LICENSE_PLATE | varchar(20) |  |  |  |
| 4 | UPDATED_BY | varchar(500) |  |  |  |
| 5 | CREATED_DATE | datetime |  |  |  |
| 6 | REMARK | varchar(500) |  |  |  |

### ielp.ORDER_CTR_H

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ORDER_CTR_H_ID | varchar(10) |  |  |  |
| 2 | ORDER_NO | varchar(20) |  |  |  |
| 3 | CONTAINER_NO | varchar(11) |  |  |  |
| 4 | REMARK | varchar(500) |  |  |  |
| 5 | CREATED_BY | varchar(100) |  |  |  |
| 6 | CREATED_DATE | datetime |  |  |  |
| 7 | CTR_SIZE | varchar(4) |  |  |  |
| 8 | CTR_TYPE | varchar(10) |  |  |  |
| 9 | IS_DG | varchar(1) |  |  |  |

### ielp.ORDER_FILES

PK: ORDER_FILE_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ORDER_FILE_ID | varchar(10) | Y | Y |  |
| 2 | ORDER_NO | varchar(20) | Y |  |  |
| 3 | FILE_TYPE | varchar(10) |  |  |  |
| 4 | FILE_NAME | varchar(500) |  |  |  |
| 5 | FILE_NEW_NAME | varchar(500) |  |  |  |
| 6 | DESCRIPTION | varchar(500) |  |  |  |
| 7 | IS_DELETE | varchar(1) |  |  | '0' |
| 8 | CREATED_DATE | datetime | Y |  |  |
| 9 | CREATED_BY | varchar(500) |  |  |  |
| 10 | UPDATED_DATE | datetime |  |  |  |
| 11 | DELETED_BY | varchar(500) |  |  |  |
| 12 | DELETED_DATE | datetime |  |  |  |
| 13 | APP_ID | varchar(100) |  |  |  |
| 14 | FILE_PATH | varchar(100) |  |  |  |

### ielp.ORDER_REMARK

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ORDER_REMARK_ID | varchar(10) |  |  |  |
| 2 | DTP_DET_ID | varchar(20) |  |  |  |
| 3 | ORDER_NO | varchar(20) |  |  |  |
| 4 | PROCESS_TYPE | varchar(5) |  |  |  |
| 5 | REMARK_TYPE | varchar(2) |  |  |  |
| 6 | REMARK | varchar(1000) |  |  |  |
| 7 | CREATED_DATE | datetime |  |  |  |
| 8 | CREATED_BY | varchar(100) |  |  |  |
| 9 | IS_DELETE | varchar(1) |  |  | '0' |
| 10 | IS_CLOSE | varchar(1) |  |  | '0' |

### ielp.LOG_CANCEL_FINISH_ORDER

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | LOG_ID | varchar(30) |  |  |  |
| 2 | ORDER_NO | varchar(30) |  |  |  |
| 3 | DTP_HEADER_ID | varchar(30) |  |  |  |
| 4 | REMARK | varchar(500) |  |  |  |
| 5 | CREATED_BY | varchar(100) |  |  |  |
| 6 | CRETED_DATE | datetime |  |  |  |

## Service Acceptance

### ielp.SA_HEADER

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | SA_HEADER_ID | varchar(20) |  |  |  |
| 2 | SA_PERIODE | date |  |  |  |
| 3 | STATUS_CODE | varchar(1) |  |  |  |
| 4 | IS_DELETE | varchar(1) |  |  | '0' |
| 5 | CREATED_BY | varchar(100) |  |  |  |
| 6 | CREATED_DATE | datetime |  |  |  |
| 7 | SA_TOTAL | varchar(5) |  |  | '0' |
| 8 | PO_NUMBER | varchar(16) |  |  |  |
| 9 | COMPANY_ID | varchar(10) |  |  |  |
| 10 | SA_TYPE | varchar(1) |  |  |  |
| 11 | UPDATED_BY | varchar(100) |  |  |  |
| 12 | UPDATED_DATE | datetime |  |  |  |

### ielp.SA_DETAIL

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | SA_DETAIL_ID | varchar(10) |  |  |  |
| 2 | DTP_DET_ID | varchar(100) |  |  |  |
| 3 | DTP_TYPE | varchar(30) |  |  |  |
| 4 | COMPANY_ID | varchar(10) |  |  |  |
| 5 | CTR_SIZE | varchar(2) |  |  |  |
| 6 | ROUTE_HEADER_ID | varchar(100) |  |  |  |
| 7 | ROUTE_PRICE_ID | varchar(16) |  |  |  |
| 8 | STATUS_CODE | varchar(2) |  |  |  |
| 9 | APPROVED_BY | varchar(100) |  |  |  |
| 10 | APPROVED_DATE | datetime |  |  |  |
| 11 | DELETED_BY | varchar(100) |  |  |  |
| 12 | DELETED_DATE | datetime |  |  |  |
| 13 | ORDER_ROUTE | varchar(100) |  |  |  |
| 14 | PRICE_ROUTE | varchar(100) |  |  |  |
| 15 | PO_NUMBER | varchar(100) |  |  |  |
| 16 | SA_CODE | varchar(16) |  |  |  |
| 17 | IS_DELETE | varchar(1) |  |  | '0' |
| 18 | SA_HEADER_ID | varchar(20) |  |  |  |
| 19 | IS_VISION | varchar(1) |  |  | '0' |
| 20 | VISION_STATUS | varchar(100) |  |  |  |
| 21 | VISION_CREATED_DATE | datetime |  |  |  |
| 22 | IS_VISION_CALLBACK | varchar(1) |  |  | '0' |
| 23 | VISION_CALLBACK_STATUS | varchar(100) |  |  |  |
| 24 | VISION_CALLBACK_DATE | datetime |  |  |  |
| 25 | IS_PAS | varchar(1) |  |  | '0' |
| 26 | PAS_STATUS | varchar(100) |  |  |  |
| 27 | PAS_CREATED_DATE | datetime |  |  |  |
| 28 | IS_PAS_CALLBACK | varchar(1) |  |  | '0' |
| 29 | PAS_CALLBACK_STATUS | varchar(100) |  |  |  |
| 30 | PAS_CALLBACK_DATE | datetime |  |  |  |
| 31 | TOTAL_TRIP | varchar(10) |  |  | '0' |
| 32 | PRICE | varchar(100) |  |  |  |
| 33 | TOTAL_PRICE | varchar(100) |  |  |  |
| 34 | REMARK | varchar(1000) |  |  |  |
| 35 | PAS_PR_NUMBER | varchar(20) |  |  |  |
| 36 | PAS_PR_DATE | date |  |  |  |
| 37 | PAS_PO_NUMBER | varchar(20) |  |  |  |
| 38 | PAS_PO_DATE | date |  |  |  |
| 39 | LOG_ITG_SEND_ID | varchar(20) |  |  |  |
| 40 | LOG_ITG_CALLBACK_ID | varchar(20) |  |  |  |
| 41 | SA_TYPE | varchar(1) |  |  |  |
| 42 | CREATED_BY | varchar(100) |  |  |  |
| 43 | CREATED_DATE | datetime |  |  |  |
| 44 | UPDATED_BY | varchar(100) |  |  |  |
| 45 | UPDATED_DATE | datetime |  |  |  |

### ielp.SA_WBS_PERCENTAGE

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | SA_WBS_ID | varchar(10) |  |  |  |
| 2 | WBS_NUMBER | varchar(100) |  |  |  |
| 3 | SERVICE_CODE | varchar(10) |  |  |  |
| 4 | SA_CODE | varchar(16) |  |  |  |
| 5 | WBS_PERCENTAGE | varchar(20) |  |  |  |
| 6 | WBS_COST | varchar(100) |  |  |  |
| 7 | CREATED_BY | varchar(100) |  |  |  |
| 8 | CREATED_DATE | datetime |  |  |  |
| 9 | TOTAL_CYCLE | varchar(10) |  |  |  |
| 10 | IS_DELETE | varchar(1) |  |  | '0' |
| 11 | WBS_GL_ACCOUNT | varchar(50) |  |  |  |
| 12 | WBS_COST_CENTER | varchar(10) |  |  |  |
| 13 | SA_HEADER_ID | varchar(20) |  |  |  |
| 14 | SA_TYPE | varchar(1) |  |  |  |
| 15 | UPDATED_BY | varchar(100) |  |  |  |
| 16 | UPDATED_DATE | datetime |  |  |  |

### ielp.SA_ROUTE_PRICE_TMP

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | SA_PRICE_TMP_ID | varchar(10) |  |  |  |
| 2 | DTP_DET_ID | varchar(20) |  |  |  |
| 3 | ROUTE | varchar(100) |  |  |  |
| 4 | PRICE | varchar(100) |  |  |  |
| 5 | PRICE_CODE | varchar(100) |  |  |  |
| 6 | PRICE_ID | varchar(100) |  |  |  |
| 7 | ROUTE_SEQ | varchar(2) |  |  |  |
| 8 | CREATED_BY | varchar(100) |  |  |  |
| 9 | CREATED_DATE | datetime |  |  |  |
| 10 | ROUTE_HEADER_ID | varchar(10) |  |  |  |

## Monthly PR / PO (criteria)

### ielp.CRITERIA_SCORE_HEADER

PK: CRITERIA_HEADER_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | CRITERIA_HEADER_ID | varchar(10) | Y | Y |  |
| 2 | CRITERIA_PERIODE | varchar(7) | Y |  |  |
| 3 | IS_DELETE | varchar(1) |  |  | (0) |
| 4 | CREATED_DATE | datetime |  |  |  |
| 5 | CREATED_BY | varchar(500) |  |  |  |
| 6 | UPDATED_DATE | datetime |  |  |  |
| 7 | UPDATED_BY | varchar(500) |  |  |  |
| 8 | APPROVAL_STS | varchar(2) |  |  | (0) |
| 9 | APPROVAL_BY | varchar(500) |  |  |  |
| 10 | APPROVAL_DATE | datetime |  |  |  |
| 11 | APPROVAL_REMARK | nvarchar(max) |  |  |  |
| 12 | PR_NO | varchar(11) |  |  |  |
| 13 | APP_ID | varchar(20) |  |  |  |
| 14 | PR_SEQ | int |  |  | (1) |
| 15 | BUSINESS_TYPE | varchar(1) |  |  |  |
| 16 | PERIODE_FR | date |  |  |  |
| 17 | PERIODE_TO | date |  |  |  |

### ielp.CRITERIA_SCORE_DETAIL

PK: CRITERIA_DETAIL_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | CRITERIA_DETAIL_ID | varchar(10) | Y | Y |  |
| 2 | KPI_ID | varchar(20) | Y |  |  |
| 3 | KPI_NAME | varchar(50) | Y |  |  |
| 4 | CRITERIA_VALUE | varchar(100) |  |  |  |
| 5 | IS_DELETE | varchar(1) |  |  | (0) |
| 6 | CREATED_DATE | datetime |  |  |  |
| 7 | CREATED_BY | varchar(500) |  |  |  |
| 8 | UPDATED_DATE | datetime |  |  |  |
| 9 | UPDATED_BY | varchar(500) |  |  |  |
| 10 | CRITERIA_HEADER_ID | varchar(10) |  |  |  |
| 11 | COMPANY_ID | varchar(10) |  |  |  |
| 12 | SCORE | float |  |  |  |
| 13 | ROUTE | varchar(100) |  |  |  |

### ielp.CRITERIA_SCORE_DETAIL_FINAL

PK: CRITERIA_DETAIL_FINAL_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | CRITERIA_DETAIL_FINAL_ID | varchar(10) | Y | Y |  |
| 2 | CRITERIA_HEADER_ID | varchar(10) |  |  |  |
| 3 | COMPANY_ID | varchar(10) |  |  |  |
| 4 | TOTAL_SCORE | float |  |  |  |
| 5 | TOTAL_TRIP | int |  |  |  |
| 6 | TOTAL_TRIP_ORDER_SHARING | int |  |  |  |
| 7 | TOTAL_ORDER_SHARING | float |  |  |  |
| 8 | TOTAL_PRICE | float |  |  |  |
| 9 | PR_NO_DET | varchar(11) |  |  |  |
| 10 | IS_DELETE | varchar(1) |  |  | (0) |
| 11 | CREATED_DATE | datetime |  |  |  |
| 12 | CREATED_BY | varchar(500) |  |  |  |
| 13 | UPDATED_DATE | datetime |  |  |  |
| 14 | UPDATED_BY | varchar(500) |  |  |  |
| 15 | APPROVAL_STS | varchar(2) |  |  | (0) |
| 16 | APPROVAL_BY | varchar(500) |  |  |  |
| 17 | APPROVAL_DATE | datetime |  |  |  |
| 18 | APPROVAL_REMARK | nvarchar(max) |  |  |  |
| 19 | ROUTE | varchar(100) |  |  |  |
| 20 | SERVICE_TYPE | varchar(500) |  |  |  |

### ielp.CRITERIA_SCORE_DETAIL_ROUTE

PK: CRITERIA_DETAIL_ROUTE_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | CRITERIA_DETAIL_ROUTE_ID | varchar(20) | Y | Y |  |
| 2 | CRITERIA_HEADER_ID | varchar(10) | Y |  |  |
| 3 | COMPANY_ID | varchar(10) | Y |  |  |
| 4 | ROUTE_HEADER_ID | varchar(10) | Y |  |  |
| 5 | ROUTE_PERCENTAGE_VALUE | float |  |  |  |
| 6 | TOTAL_ORDER_SHARING | float |  |  |  |
| 7 | ROUTE_QTY | int |  |  |  |
| 8 | ROUTE_QTY_20 | int |  |  |  |
| 9 | ROUTE_QTY_40 | int |  |  |  |
| 10 | PRICE_20 | float |  |  |  |
| 11 | PRICE_40 | float |  |  |  |
| 12 | TOTAL_PRICE_20 | float |  |  |  |
| 13 | TOTAL_PRICE_40 | float |  |  |  |
| 14 | TOTAL_PRICE_ALL | float |  |  |  |
| 15 | IS_DELETE | varchar(1) |  |  | (0) |
| 16 | CREATED_DATE | datetime |  |  |  |
| 17 | CREATED_BY | varchar(500) |  |  |  |
| 18 | UPDATED_DATE | datetime |  |  |  |
| 19 | UPDATED_BY | varchar(500) |  |  |  |
| 20 | ROUTE_QTY_ACT | varchar(10) |  |  |  |
| 21 | ROUTE_QTY_20_ACT | varchar(10) |  |  |  |
| 22 | ROUTE_QTY_40_ACT | varchar(10) |  |  |  |
| 23 | TOTAL_PRICE_20_ACT | float |  |  |  |
| 24 | TOTAL_PRICE_40_ACT | float |  |  |  |
| 25 | TOTAL_PRICE_ALL_ACT | float |  |  |  |
| 26 | MAT_NO | varchar(23) |  |  |  |
| 27 | MAT_DESC | varchar(50) |  |  |  |
| 28 | DELIVERY_MODE | varchar(100) |  |  |  |
| 29 | ROUTE_PRICE_ID | varchar(50) |  |  |  |
| 30 | ROUTE | varchar(500) |  |  |  |
| 31 | SERVICE_TYPE | varchar(500) |  |  |  |
| 32 | ETD | datetime |  |  |  |

### ielp.CRITERIA_SCORE_APPROVAL

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | CRITERIA_APPROVAL_ID | varchar(10) | Y |  |  |
| 2 | CRITERIA_HEADER_ID | varchar(10) | Y |  |  |
| 3 | CRITERIA_DETAIL_FINAL_ID | varchar(10) | Y |  |  |
| 4 | CRITERIA_PERIODE | varchar(7) | Y |  |  |
| 5 | APPROVAL_STS | varchar(2) |  |  | (0) |
| 6 | APPROVAL_BY | varchar(500) |  |  |  |
| 7 | APPROVAL_DATE | datetime |  |  |  |
| 8 | APPROVAL_REMARK | nvarchar(max) |  |  |  |
| 9 | IS_DELETE | varchar(1) |  |  | (0) |
| 10 | APPROVAL_CLASS | varchar(100) |  |  |  |

### ielp.CRITERIA_VOLUME_DETAIL

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | CRITERIA_HEADER_ID | varchar(10) |  |  |  |
| 2 | VOLUME_ID | varchar(10) |  |  |  |
| 3 | VOLUME_NAME | varchar(500) |  |  |  |
| 4 | VOLUME_VALUE | varchar(10) |  |  |  |
| 5 | CREATED_DATE | datetime |  |  |  |
| 6 | CREATED_BY | varchar(500) |  |  |  |
| 7 | IS_DELETE | varchar(1) |  |  | (0) |
| 8 | UPDATED_DATE | datetime |  |  |  |
| 9 | UPDATED_BY | varchar(500) |  |  |  |
| 10 | COMPANY_ID | varchar(10) |  |  |  |
| 11 | ROUTE | varchar(100) |  |  |  |

### ielp.CRITERIA_LAST_ORDER

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | CRITERIA_ID | varchar(10) |  |  |  |
| 2 | CRITERIA_PERIODE | varchar(7) |  |  |  |
| 3 | ORDER_SHARING | float |  |  |  |
| 4 | IS_DELETE | varchar(1) |  |  | (0) |
| 5 | CREATED_DATE | datetime |  |  |  |
| 6 | CREATED_BY | varchar(500) |  |  |  |
| 7 | UPDATED_DATE | datetime |  |  |  |
| 8 | UPDATED_BY | varchar(500) |  |  |  |
| 9 | COMPANY_ID | varchar(10) |  |  |  |
| 10 | APP_ID | varchar(20) |  |  |  |
| 11 | ROUTE | varchar(100) |  |  |  |

### ielp.PO_HEADER

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | PO_HEADER_ID | varchar(10) |  |  |  |
| 2 | PO_PERIODE | varchar(7) |  |  |  |
| 3 | APPROVAL_STS | varchar(1) |  |  |  |
| 4 | APPROVAL_BY | varchar(100) |  |  |  |
| 5 | APPROVAL_DATE | datetime |  |  |  |
| 6 | APPROVAL_REMARK | varchar(max) |  |  |  |
| 7 | CREATED_BY | varchar(100) |  |  |  |
| 8 | CREATED_DATE | datetime |  |  |  |
| 9 | IS_DELETE | varchar(1) |  |  | '0' |
| 10 | CRITERIA_HEADER_ID | varchar(10) |  |  |  |
| 11 | PO_SEQ | int |  |  |  |
| 12 | APP_ID | varchar(20) |  |  |  |
| 13 | UPDATED_BY | varchar(100) |  |  |  |
| 14 | UPDATED_DATE | datetime |  |  |  |
| 15 | BUSINESS_TYPE | varchar(20) |  |  |  |

### ielp.PO_DETAIL

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | PO_DETAIL_ID | varchar(10) |  |  |  |
| 2 | PO_NUMBER | varchar(16) |  |  |  |
| 3 | PO_APPROVAL_ID | varchar(10) |  |  |  |
| 4 | COMPANY_ID | varchar(10) |  |  |  |
| 5 | CREATED_BY | varchar(100) |  |  |  |
| 6 | CREATED_DATE | datetime |  |  |  |
| 7 | IS_DELETE | varchar(1) |  |  | '0' |
| 8 | PO_HEADER_ID | varchar(10) |  |  |  |
| 9 | PO_TYPE | varchar(1) |  |  |  |
| 10 | APP_ID | varchar(20) |  |  |  |
| 11 | ROUTE | varchar(100) |  |  |  |
| 12 | UPDATED_BY | varchar(100) |  |  |  |
| 13 | UPDATED_DATE | datetime |  |  |  |
| 14 | SERVICE_TYPE | varchar(500) |  |  |  |

### ielp.PO_APPROVAL

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | PO_APPROVAL_ID | varchar(10) |  |  |  |
| 2 | PO_HEADER_ID | varchar(10) |  |  |  |
| 3 | PO_PERIODE | varchar(7) |  |  |  |
| 4 | CRITERIA_HEADER_ID | varchar(10) |  |  |  |
| 5 | CRITERIA_DETAIL_FINAL_ID | varchar(10) |  |  |  |
| 6 | CRITERIA_PERIODE | varchar(7) |  |  |  |
| 7 | APPROVAL_STS | varchar(1) |  |  |  |
| 8 | APPROVAL_BY | varchar(100) |  |  |  |
| 9 | APPROVAL_REMARK | varchar(max) |  |  |  |
| 10 | APPROVAL_CLASS | varchar(100) |  |  |  |
| 11 | IS_DELETE | varchar(1) |  |  | '0' |
| 12 | APPROVAL_DATE | datetime |  |  |  |
| 13 | APP_ID | varchar(20) |  |  |  |
| 14 | CREATED_DATE | datetime |  |  |  |
| 15 | CREATED_BY | varchar(100) |  |  |  |
| 16 | UPDATED_DATE | datetime |  |  |  |
| 17 | UPDATED_BY | varchar(100) |  |  |  |

### ielp.PO_APPROVAL_EST

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | PO_APPROVAL_EST_ID | varchar(10) |  |  |  |
| 2 | PO_PERIODE | varchar(7) |  |  |  |
| 3 | CREATERIA_HEADER_ID | varchar(10) |  |  |  |
| 4 | APPROVAL_CLASS | varchar(100) |  |  |  |
| 5 | APPROVAL_LIMIT | datetime |  |  |  |

### ielp.TB_R_PR_DAILY

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | PR_DAILY_ID | varchar(20) | Y |  |  |
| 2 | CRITERIA_HEADER_ID | varchar(10) | Y |  |  |
| 3 | PRODUCTION_MONTH | char(6) | Y |  |  |
| 4 | ROUTE | varchar(20) | Y |  |  |
| 5 | LP | varchar(10) |  |  |  |
| 6 | TOTAL_DISTANCE | decimal(10, 2) |  |  |  |
| 7 | CYCLE_GENERATED | int |  |  |  |
| 8 | TRUCK | int |  |  |  |
| 9 | DRIVER | int |  |  |  |
| 10 | DOT | int |  |  |  |
| 11 | DOT_HOURS | decimal(10, 2) |  |  |  |
| 12 | HOT_DAYS | decimal(10, 2) |  |  |  |
| 13 | HOT_HOURS | decimal(10, 2) |  |  |  |
| 14 | ROW_ID | int |  |  |  |
| 15 | BASE_DISTANCE | decimal(18, 2) |  |  |  |
| 16 | BASE_TRUCK | decimal(18, 2) |  |  |  |
| 17 | BASE_DRIVER | decimal(18, 2) |  |  |  |
| 18 | VARIABLE_1 | decimal(18, 2) |  |  |  |
| 19 | DOT_TOLL | decimal(18, 2) |  |  |  |
| 20 | DOT_OT | decimal(18, 2) |  |  |  |
| 21 | DOT_TOTAL | decimal(18, 2) |  |  |  |
| 22 | HOT_TOLL | decimal(18, 2) |  |  |  |
| 23 | HOT_OT | decimal(18, 2) |  |  |  |
| 24 | HOT_TOTAL | decimal(18, 2) |  |  |  |
| 25 | TOTAL_PRICE | decimal(18, 2) |  |  |  |
| 26 | TOTAL_PRICE_HOT | decimal(18, 2) |  |  |  |
| 27 | GRAND_TOTAL | decimal(18, 2) |  |  |  |
| 28 | BASE_DISTANCE_PRICE_ID | varchar(20) |  |  |  |
| 29 | BASE_TRUCK_PRICE_ID | varchar(20) |  |  |  |
| 30 | BASE_DRIVER_PRICE_ID | varchar(20) |  |  |  |
| 31 | TOLL_PRICE_ID | varchar(20) |  |  |  |
| 32 | OT_PRICE_ID | varchar(20) |  |  |  |
| 33 | OT_PRICE | decimal(18, 2) |  |  |  |
| 34 | IS_DELETE | varchar(1) |  |  | (0) |
| 35 | CREATED_DATE | datetime |  |  | getdate() |
| 36 | CREATED_BY | varchar(500) |  |  |  |
| 37 | UPDATED_DATE | datetime |  |  |  |
| 38 | UPDATED_BY | varchar(500) |  |  |  |
| 39 | BASE_TOLL | decimal(38, 0) |  |  |  |
| 40 | MGMT_FEE | decimal(18, 2) |  |  |  |
| 41 | DAILY_GRAND_TOTAL | decimal(18, 2) |  |  |  |
| 42 | DAILY_TRUCK | decimal(18, 2) |  |  |  |
| 43 | DAILY_DRIVER | decimal(18, 2) |  |  |  |
| 44 | TOTAL_TRAVEL_TIME | decimal(18, 2) |  |  |  |
| 45 | BASE_DRIVER_DISPLAY | nvarchar(100) |  |  |  |
| 46 | PERIODE_FR | date |  |  |  |
| 47 | PERIODE_TO | date |  |  |  |

### ielp.TB_R_PR_DAILY_DETAIL

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | PR_DAILY_DETAIL_ID | varchar(20) | Y |  |  |
| 2 | CRITERIA_HEADER_ID | varchar(10) | Y |  |  |
| 3 | ROUTE | varchar(20) | Y |  |  |
| 4 | SUPPLIER_CODE | varchar(10) |  |  |  |
| 5 | PLANT_CD | int |  |  |  |
| 6 | RIT | int |  |  |  |
| 7 | DISTANCE | decimal(10, 2) |  |  |  |
| 8 | IS_DELETE | int |  |  | (0) |
| 9 | CREATED_DATE | datetime |  |  | getdate() |
| 10 | CREATED_BY | varchar(500) |  |  |  |
| 11 | UPDATED_DATE | datetime |  |  |  |
| 12 | UPDATED_BY | varchar(500) |  |  |  |
| 13 | ROW_ID | int |  |  |  |
| 14 | TRUCK_AMOUNT | decimal(38, 0) |  |  |  |
| 15 | DRIVER_AMOUNT | decimal(38, 0) |  |  |  |
| 16 | DOT_HOUR_AMOUNT | decimal(38, 0) |  |  |  |
| 17 | DOT | int |  |  |  |
| 18 | DOT_HOURS | decimal(10, 2) |  |  |  |
| 19 | HOT_DAYS | decimal(10, 2) |  |  |  |
| 20 | HOT_HOURS | decimal(10, 2) |  |  |  |
| 21 | TRUCK_NO | varchar(100) |  |  |  |
| 22 | DRIVER_NO | varchar(100) |  |  |  |
| 23 | VARIABLE_1 | decimal(18, 2) |  |  |  |
| 24 | HOT_TOLL | decimal(18, 2) |  |  |  |
| 25 | HOT_OT | decimal(18, 2) |  |  |  |
| 26 | HOT_TOTAL | decimal(18, 2) |  |  |  |
| 27 | FLAG_SHIFT | varchar(100) |  |  |  |
| 28 | VEHICLE_COST | varchar(5) |  |  |  |
| 29 | DRIVER_COST | varchar(5) |  |  |  |
| 30 | TRAVEL_TIME | decimal(18, 2) |  |  |  |
| 31 | BASE_DRIVER_PRICE_ID | varchar(20) |  |  |  |

### ielp.TB_R_PR_SUMMARY

PK: PR_SUMMARY_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | CRITERIA_HEADER_ID | varchar(20) | Y |  |  |
| 2 | PRODUCTION_MONTH | varchar(6) | Y |  |  |
| 3 | ROUTE | varchar(50) |  |  |  |
| 4 | LP | varchar(50) |  |  |  |
| 5 | MONTHLY_DISTANCE | decimal(18, 2) |  |  |  |
| 6 | MONTHLY_TOTAL_HOT_DAYS | decimal(10, 2) |  |  |  |
| 7 | MONTHLY_TRUCK | decimal(18, 2) |  |  |  |
| 8 | MONTHLY_DRIVER | decimal(18, 2) |  |  |  |
| 9 | MONTHLY_VARIABLE1 | decimal(18, 2) |  |  |  |
| 10 | MONTHLY_DOT_TOLL | decimal(18, 2) |  |  |  |
| 11 | MONTHLY_DOT_OT | decimal(18, 2) |  |  |  |
| 12 | MONTHLY_DOT_TOTAL | decimal(18, 2) |  |  |  |
| 13 | MONTHLY_HOT_TOLL | decimal(18, 2) |  |  |  |
| 14 | MONTHLY_HOT_OT | decimal(18, 2) |  |  |  |
| 15 | MONTHLY_HOT_TOTAL | decimal(18, 2) |  |  |  |
| 16 | MONTHLY_TOTAL_PRICE_HOT | decimal(18, 2) |  |  |  |
| 17 | MONTHLY_TOTAL_PRICE | decimal(18, 2) |  |  |  |
| 18 | MGMT_FEE | decimal(18, 2) |  |  |  |
| 19 | MONTHLY_GRAND_TOTAL | decimal(18, 2) |  |  |  |
| 20 | ROW_ID | int |  |  |  |
| 21 | HOT_DAYS | decimal(10, 2) |  |  |  |
| 22 | MONTHLY_CYCLE_RIT | int |  |  |  |
| 23 | MONTHLY_VARIABLE1_HOT | decimal(18, 2) |  |  |  |
| 24 | IS_DELETE | varchar(1) |  |  | '0' |
| 25 | CREATED_DATE | datetime |  |  | getdate() |
| 26 | CREATED_BY | varchar(500) |  |  |  |
| 27 | UPDATED_DATE | datetime |  |  |  |
| 28 | UPDATED_BY | varchar(500) |  |  |  |
| 29 | PR_SUMMARY_ID | varchar(20) | Y | Y |  |
| 30 | DOT | int |  |  |  |
| 31 | TOT_MON_DISTANCE | varchar(9) |  |  |  |
| 32 | TOT_MON_CYCLE | decimal(18, 2) |  |  |  |
| 33 | TOT_MON_TRUCK | decimal(18, 2) |  |  |  |
| 34 | TOT_MON_DRIVER | decimal(18, 2) |  |  |  |
| 35 | TOT_MON_DOT_HOURS | decimal(18, 2) |  |  |  |
| 36 | HOT_HOURS | decimal(18, 2) |  |  |  |

## Log / interface / user

### ielp.LOG_ACTIVITY_ORDER

PK: LOG_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | LOG_ID | varchar(20) | Y | Y |  |
| 2 | MENU_ID | varchar(50) |  |  |  |
| 3 | ACT | varchar(100) |  |  |  |
| 4 | ORDER_NO | varchar(20) |  |  |  |
| 5 | PROCESS_ID | varchar(3) |  |  |  |
| 6 | URL | varchar(100) |  |  |  |
| 7 | IP | varchar(100) |  |  |  |
| 8 | PARAM_REQ | nvarchar(max) |  |  |  |
| 9 | PARAM_RES | nvarchar(max) |  |  |  |
| 10 | FILENAME | varchar(500) |  |  |  |
| 11 | REMARK | varchar(500) |  |  |  |
| 12 | COST_TIME | numeric(38, 0) |  |  |  |
| 13 | STS_CODE | varchar(10) |  |  |  |
| 14 | STS_MESSAGE | varchar(1000) |  |  |  |
| 15 | CREATED_BY | varchar(100) |  |  |  |
| 16 | CRETED_DATE | datetime |  |  |  |
| 17 | DTP_TYPE | varchar(2) |  |  |  |
| 18 | DTP_DET_ID | varchar(20) |  |  |  |
| 19 | DTP_HEADER_ID | varchar(10) |  |  |  |

### ielp.LOG_ACTIVITY_MASTER

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | LOG_ID | varchar(20) |  |  |  |
| 2 | MENU_ID | varchar(50) |  |  |  |
| 3 | PARAM_REQ | nvarchar(max) |  |  |  |
| 4 | PARAM_RES | nvarchar(max) |  |  |  |
| 5 | FILENAME | varchar(500) |  |  |  |
| 6 | STS_CODE | varchar(10) |  |  |  |
| 7 | STS_MESSAGE | nvarchar(max) |  |  |  |
| 8 | CREATED_DATE | datetime |  |  |  |
| 9 | ACT | varchar(100) |  |  |  |
| 10 | CREATED_BY | varchar(500) |  |  |  |

### ielp.LOG_ITGPAS

PK: LOG_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | LOG_ID | varchar(20) | Y | Y |  |
| 2 | MENU_ID | varchar(50) |  |  |  |
| 3 | ACT | varchar(100) |  |  |  |
| 4 | PROCESS_ID | varchar(20) |  |  |  |
| 5 | URL | varchar(100) |  |  |  |
| 6 | IP | varchar(100) |  |  |  |
| 7 | PARAM_REQ | nvarchar(max) |  |  |  |
| 8 | PARAM_RES | nvarchar(max) |  |  |  |
| 9 | FILENAME | varchar(500) |  |  |  |
| 10 | REMARK | varchar(500) |  |  |  |
| 11 | COST_TIME | numeric(38, 0) |  |  |  |
| 12 | STS_CODE | varchar(10) |  |  |  |
| 13 | STS_MESSAGE | varchar(1000) |  |  |  |
| 14 | CREATED_BY | varchar(100) |  |  |  |
| 15 | CRETED_DATE | datetime |  |  |  |

### ielp.ITG_LOG

PK: ITG_LOG_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | ITG_LOG_ID | varchar(10) | Y | Y |  |
| 2 | REQUEST_API | nvarchar(max) | Y |  |  |
| 3 | RESPONSE_API | nvarchar(max) | Y |  |  |
| 4 | APP_NAME | varchar(100) | Y |  |  |
| 5 | CREATED_DATE | datetime |  |  |  |
| 6 | RES_CD | varchar(2) |  |  |  |
| 7 | RES_MSG | varchar(500) |  |  |  |

### dbo.TB_R_LOG_H

PK: PROCESS_ID · FK: FUNCTION_ID -> dbo.TB_M_FUNCTION(FUNCTION_ID); MODULE_ID -> dbo.TB_M_MODULE(MODULE_ID)

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | PROCESS_ID | bigint | Y | Y |  |
| 2 | FUNCTION_ID | varchar(10) | Y |  |  |
| 3 | MODULE_ID | varchar(10) | Y |  |  |
| 4 | START_DT | datetime | Y |  |  |
| 5 | END_DT | datetime |  |  |  |
| 6 | PROCESS_STS | varchar(1) |  |  |  |
| 7 | USER_ID | varchar(20) |  |  |  |
| 8 | READ_FLAG | varchar(1) |  |  |  |
| 9 | REMARK | varchar(50) |  |  |  |

### dbo.TB_R_LOG_D

PK: PROCESS_ID, SEQ_NO · FK: PROCESS_ID -> dbo.TB_R_LOG_H(PROCESS_ID)

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | PROCESS_ID | bigint | Y | Y |  |
| 2 | SEQ_NO | int | Y | Y |  |
| 3 | ERR_DT | datetime | Y |  |  |
| 4 | LOC | varchar(200) | Y |  |  |
| 5 | USER_ID | varchar(20) | Y |  |  |
| 6 | MSG_ID | varchar(15) | Y |  |  |
| 7 | MSG_TYPE | varchar(3) | Y |  |  |
| 8 | MSG_TEXT | varchar(5000) | Y |  |  |

### dbo.TB_M_MESSAGE

PK: MSG_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | MSG_ID | varchar(15) | Y | Y |  |
| 2 | MSG_TYPE | varchar(3) | Y |  |  |
| 3 | MSG_TEXT | varchar(1000) | Y |  |  |
| 4 | CREATED_BY | varchar(20) | Y |  |  |
| 5 | CREATED_DT | datetime | Y |  |  |
| 6 | CHANGED_BY | varchar(20) |  |  |  |
| 7 | CHANGED_DT | datetime |  |  |  |

### ielp.TB_R_NOTIFICATION

PK: **none** · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | NOTIF_ID | varchar(10) |  |  |  |
| 2 | USER_ID_FROM | varchar(100) |  |  |  |
| 3 | USER_ID_TO | varchar(100) |  |  |  |
| 4 | USER_CLASS_FROM | varchar(100) |  |  |  |
| 5 | USER_CLASS_TO | varchar(100) |  |  |  |
| 6 | REF_ID | varchar(50) |  |  |  |
| 7 | TITLE | varchar(100) |  |  |  |
| 8 | MESSAGE | varchar(500) |  |  |  |
| 9 | NOTIF_TYPE | varchar(20) |  |  |  |
| 10 | IS_READ | varchar(1) |  |  |  |
| 11 | READ_DATE | datetime |  |  |  |
| 12 | IS_ACTIVE | varchar(1) |  |  |  |
| 13 | LINK_URL | varchar(500) |  |  |  |
| 14 | CREATED_DATE | datetime |  |  |  |
| 15 | CREATED_BY | varchar(100) |  |  |  |
| 16 | APP_ID | varchar(100) |  |  |  |
| 17 | ACT_DIRECT_APP | varchar(100) |  |  |  |
| 18 | APP_MODULE | varchar(50) |  |  |  |
| 19 | MENU_APP | varchar(100) |  |  |  |

### ielp.USERID

PK: USER_NAME · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | USER_NAME | varchar(100) | Y | Y |  |
| 2 | PASSWORD | varchar(250) | Y |  |  |
| 3 | FULL_NAME | varchar(100) |  |  |  |
| 4 | CONTACT_NO | varchar(20) |  |  |  |
| 5 | EMAIL | varchar(50) |  |  |  |
| 6 | COMPANY | varchar(100) |  |  |  |
| 7 | KD_AGEN | varchar(10) |  |  |  |
| 8 | CUSTOMER | varchar(10) |  |  |  |
| 9 | LOG_COUNT | int |  |  | (0) |
| 10 | KD_SHIPPER | varchar(10) |  |  |  |
| 11 | LOG_COUNT_MAX | int |  |  |  |
| 12 | MASTER_TYPE | varchar(2) |  |  | (1) |
| 13 | STATUS | varchar(1) |  |  |  |
| 14 | USER_PARENT | varchar(100) |  |  | NULL |
| 15 | CHILD_INDEX | varchar(100) |  |  | (1) |
| 16 | NAME | varchar(50) |  |  |  |
| 17 | NEW_REGIST | char(1) |  |  | 'N' |
| 18 | HIST_FLG | char(1) |  |  | 'N' |
| 19 | IS_ADMIN | char(1) |  |  | 'N' |
| 20 | CREATED_TS | datetime |  |  |  |
| 21 | UPDATE_TS | datetime |  |  |  |
| 22 | UPDATE_BY | varchar(50) | Y |  |  |
| 23 | EXPIRED_DATE | datetime |  |  |  |
| 24 | FAULT | int |  |  | (0) |
| 25 | FAULT_DATE | datetime |  |  |  |
| 26 | SUB_LOC | varchar(3) |  |  |  |

### ielp.USERID_DETAIL

PK: USERNAME, USERID_CLASS, SITE_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | USERNAME | varchar(100) | Y | Y |  |
| 2 | USERID_CLASS | varchar(50) | Y | Y |  |
| 3 | SITE_ID | varchar(20) | Y | Y |  |
| 4 | DEFAULT_YN | char(1) |  |  |  |

### ielp.USERID_CLASS

PK: APP_NAME, USERID_CLASS, SITE_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | APP_NAME | varchar(20) | Y | Y |  |
| 2 | SITE_ID | varchar(20) | Y | Y |  |
| 3 | USERID_CLASS | varchar(50) | Y | Y |  |
| 4 | DESCRIPTION | varchar(100) |  |  |  |

### ielp.USERID_MENU_OPTION

PK: USERID_CLASS, APP_NAME, SITE_ID, MENU_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | USERID_CLASS | varchar(50) | Y | Y |  |
| 2 | APP_NAME | varchar(20) | Y | Y |  |
| 3 | SITE_ID | varchar(20) | Y | Y |  |
| 4 | MENU_ID | varchar(50) | Y | Y |  |

### ielp.MASTER_MENU

PK: MENU_ID · FK: none

| # | Column | Type | NN | PK | Default |
|---|---|---|---|---|---|
| 1 | APP_NAME | varchar(20) | Y |  |  |
| 2 | MENU_ID | varchar(50) | Y | Y |  |
| 3 | MENU_INDEX | int |  |  |  |
| 4 | MENU_PARENT | varchar(100) |  |  |  |
| 5 | MENU_LEVEL | varchar(10) |  |  |  |
| 6 | MAIN_MENU | varchar(50) |  |  |  |
| 7 | MENU_ITEM | varchar(100) |  |  |  |
| 8 | MENU_ACT | varchar(100) |  |  |  |
| 9 | MENU_APP | varchar(100) |  |  |  |
| 10 | MENU_ICON | varchar(50) |  |  |  |

