# 04 - Missing or Questionable UISS

Evidence classes used below: **[Schema]** confirmed by `docs/db/ELIPS_Schema.sql` · **[Code]** confirmed by the
mock-up code · **[Inferred]** by name / structure only · **[TBD]** requires confirmation. No sample data has been
provided yet, so nothing here is "observed from data".

## A. Missing UISS (functions without a specification)

| # | Function ID | Missing UISS / section | Why it is needed | Proposed |
|---|---|---|---|---|
| M1 | COM-01, COM-02 | Common UISS "TC-PBR Menu & Authorization" | Menus, menu IDs and role access are only implied per screen. ELIPS keeps them in `MASTER_MENU`, `MASTER_MENU_LANG`, `USERID_CLASS`, `USERID_DETAIL`, `USERID_MENU_OPTION` [Schema] | UISS-Screen (common) with the menu tree and role matrix; values from sample data |
| M2 | INT-04 | UISS-Batch "SA to PAS Interface (send + feedback)" | Implemented as simulation in the SA Monitoring screen only (`sa-pas-rules.js send, applyFeedback`) [Code]; ELIPS has `SA_DETAIL.IS_PAS / PAS_STATUS / PAS_CREATED_DATE / IS_PAS_CALLBACK / PAS_CALLBACK_STATUS / PAS_PR_NUMBER / PAS_PO_NUMBER / LOG_ITG_SEND_ID / LOG_ITG_CALLBACK_ID` and `LOG_ITGPAS` [Schema] | New UISS-Batch |
| M3 | INT-05, DTP-05 | UISS-Batch "IPMS to DTP Interface" | Screen "Load / Refresh from IPMS" (`dtp.js:703`) [Code]; source system / table not identifiable in the schema [TBD] | New UISS-Batch once the IPMS source is confirmed |
| M4 | SA-07 | Export of SA Monitoring | Button implemented (`sa-monitoring.js:224`) [Code], no layout / column spec | Report section in U11 or UISS-Report |
| M5 | DM-05 | Print / PDF of Daily Monitoring | Button implemented (`index.html`) [Code] | Section in U01 |
| M6 | TA-05 | Driver app view | "Open Driver app view" (`truck-assign.js`) [Code] | Note in U09 (out of TC-PBR web scope, TBD) |

## B. Function exists in code but not documented

| # | Function ID | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| N1 | DM-15 | Legacy "+ Create DTP" dialog in Daily Order Monitoring (IELP Admin) still in the mock-up, while DTP creation is now the Planning Order screen (Planner VPLD only) | `index.html` (+ Create DTP), `app.js:558 openCreateDTP`, `workflow.js:84 checkDTP`, `:97 createDTP` (role IELP_ADMIN) vs `dtp-rules.js canCreate` (PLANNER) [Code] | **Potential application issue**: two creation paths with different roles. Decide: remove the old dialog, or document it. Not changed in this review |
| N2 | DTP-14, DTP-15 | Demo helpers (driver start, demo reset) | `dtp.js:808`, `dtp.js:531` [Code] | No UISS; label as mock-up only |

## C. UISS exists but the function cannot be found in code

| # | UISS | Finding | Recommendation |
|---|---|---|---|
| C1 | U08 Driver Order Sync (HiveMQ) | No sync code; its tables (`TB_T_DRIVER_SYNC_QUEUE`, `TB_R_DRIVER_ORDER`, `TB_R_DRIVER_MQ_OUTBOX`, `TB_R_DRIVER_SYNC_LOG`) are not in ELIPS [Schema]. ELIPS driver data: `MS_DRIVER`, `TB_M_DRIVER` (FIREBASE_TOKEN, DEVICE_ID) [Schema] | Confirm whether ELIPS already pushes orders to the driver app (Firebase vs HiveMQ); keep U08 as "to-be" with proposed tables flagged |
| C2 | U26 PAS PR Interface | Talend job, existing tJava in `docs/pas-interface/current-tjava-json-to-pas.java`; PAS tables are outside ELIPS | Keep; verify ELIPS source side against `CRITERIA_*` / `TB_R_PR_*` |
| C3 | U27 PAS Callback | Talend job | Keep; ELIPS target columns to be confirmed |
| C4 | U28 GR Attachment | Talend / FTP job; screen part simulated in `dn-rules.js attachPAS` | Keep; PDF source TBD |

## D. Questionable UISS content (UISS vs schema) - found in this first pass

These are **confirmed by schema** differences between what the UISS specifies and what the ELIPS table holds
(candidate table chosen by name / structure, see `05`). They will be resolved in Phase 6-8; nothing has been changed yet.

| # | UISS | UISS says | ELIPS schema says | Question |
|---|---|---|---|---|
| Q1 | U12 Master Trucking Company | Vendor Code `Char 3` (`^[A-Z0-9]{3}$`), SAP Vendor Code `Char 10`, Vendor Name `Varchar 100`, E-Mail `Varchar 100`, Contact `100`, Address `300`, Deletion `DELETION_FLAG` Y/N, concurrency by `VERSION` | `MS_TRUCKING_COMPANY`: `COMPANY_ID` vc(10) PK, `COMPANY_CODE` vc(20) NN, `SAP_COMPANY_CODE` vc(20) NN, `COMPANY_NAME` vc(500) NN, `NPWP` vc(100) NN, `EMAIL` vc(**50**), `CONTACT_NAME` vc(200), `COMPANY_ADDRESS` vc(500), `IS_DELETE` vc(1) default `0`, `APP_ID` default `'ENVITRUCK'`, `BUSINESS_TYPE` int; **no VERSION, no SERVICE_TYPE** | E-mail 100 in UISS exceeds DB 50; is the 3-character code a new rule or existing data? Service Type -> `BUSINESS_TYPE`? Concurrency check needs a column |
| Q2 | U13 Master Location | Latitude / Longitude `Number(10,7)`, Radius number, Alias `Varchar 10`, Name `Varchar 100`, Status Active / Inactive | `MS_LOCATION`: `LOCATION_LATITUDE` / `LOCATION_LANGITUDE` vc(100) NN, `RADIUS` vc(5) default `'50'`, `LOCATION_ALIAS` vc(100) NN, `LOCATION_NAME` vc(5000) NN, `IS_DELETE` vc(100) default 0, `AUTO_FINISH` / `AUTO_CYCLE` vc(1), `CYCLE_LOC_TO`, `LOCATION_AREA`, `LOCATION_SUB` | Coordinates stored as text; is there a separate inactive state? |
| Q3 | U14 / U15 Master Mileage | Mileage `Number 7,2` (2 decimals), key = From + To, Status Active / Inactive, VERSION | `TB_M_MILEAGE`: `MILEAGE` decimal(**18,0**), PK = `LOC_NAME_FROM` + `FROM_CODE` (**TO_CODE not in the key, nullable**), `LOC_NAME_TO` NN, `IS_DELETE` vc(5), `CREATED_BY` vc(20) | Decimals and route uniqueness cannot be stored as specified; is `TB_M_MILEAGE` the table used by TC-PBR? |
| Q4 | U17 Master Priority | Route Priority Master `(TBD)` | **No table** found | Which table holds route priority (new table?) |
| Q5 | U18 Master KPI / U04 DTP | KPI per trucking company with Payment Type, Order Sharing %, Daily Trip | `MS_KPI` (KPI_ID, KPI_NAME vc50, WEIGHT, ORDER_SEQ), `MS_KPI_PERCENTAGE` (FROM / TO_PERCENTAGE, VALUE), `CRITERIA_LAST_ORDER.ORDER_SHARING` (per company / route / period); **no payment type, no daily trip** | Where are payment type and daily trip stored? |
| Q6 | U19 Master Route Percentage | Route with ordered stops and legs, percentage `Number 5,2` | `MS_ROUTE_HEADER.ROUTE_PERCENTAGE_VALUE` float, `MS_ROUTE_DETAIL` (ROUTE_CODE, ROUTE_DESCR, no sequence), `MS_ROUTE`, `MS_ROUTE_PERCENTAGE_HIST` (ROUTE_PERCENTAGE_VALUE vc(4), DISTANCE int, ROUTE_PERIOD vc(6)) | Stop sequence storage; percentage precision |
| Q7 | U20 Master Renban | Source `SOURCE_CD`, logical names | `MS_RENBAN_TCPBR`: PK `PLANT_CD` vc(10) + `DEST_CD` vc(10) + `RENBAN_CD` vc(3), `SOURCE_LOCATION_ID` vc(20) NN, `VERSION` int default 1, `CREATED_DT` datetime2 default sysdatetime() | Good match; confirm Source = location ID and delete = physical |
| Q8 | U16 Master Price | Components FIX / KM per period, Effective Start / End | `MS_ROUTE_PRICE` (ROUTE_PRICE_VALUE float, VALID_DT_FROM / TO, COMPANY_CODE, ROUTE_PRICE_MAT_CODE, ROUTE_PRICE_SIZE, CURRENCY), `ITG_ECAT` (MAT_NO, PRICE_AMOUNT real, VENDOR_CD, SAP_VENDOR_ID) | How are FIX / KM components identified (material code?) |
| Q9 | U04-U07, U09, U10 DTP / orders / SA | Proposed tables `TB_R_DTP_RECORD`, `TB_R_DAILY_ORDER`, `TB_R_ORDER_TRUCK_ASSIGN`, `TB_R_SA_HEADER`... | ELIPS: `DTP_HEADER`, `DTP_1..4_DETAIL`, `ORDER_CYCLE` (74 columns), `ORDER_TRUCK_H`, `ORDER_CYCLE_ROLLBACK_H`, `ORDER_CYCLE_MAINTENANCE_H`, `SA_HEADER`, `SA_DETAIL`, `SA_WBS_PERCENTAGE` | Re-base all DTP / order / SA UISS on these tables |
| Q10 | U04 DTP Creation | Payment Type per DTP | No column in `DTP_HEADER` / `DTP_n_DETAIL` | New column needed or stored elsewhere? |
| Q11 | All screens | Audit columns `CREATED_BY / CREATED_DT / CHANGED_BY / CHANGED_DT` | ELIPS masters mostly use `CREATED_DATE / CREATED_BY / UPDATED_DATE / UPDATED_BY` and `IS_DELETE`; only some TMMIN-style tables (`TB_M_*`, `MS_RENBAN_TCPBR`) use `*_DT`, `CHANGED_*` | Use per-table names |
| Q12 | All UISS | MSG ID `TBD` | `dbo.TB_M_MESSAGE` exists | Assign message IDs from TB_M_MESSAGE (sample data) |
| Q13 | Schema itself | Table literally named `[ielp].[ielp.TB_M_WORKING_CALENDAR]` besides `ielp.TB_M_WORKING_CALENDAR`; duplicate tables in `dbo` and `ielp` (`DTP_4_DETAIL`, `TB_M_JOB`, `TB_R_ROUTE_GROUPING_COMPOSITION`, `TB_R_SHIPPING_SCHEDULE_UPLOAD`); backup copies (`MS_SYSCODE_20260925`, `TB_M_SYSTEM_20260925`, `ORDER_CYCLE_20250703`) | Which copy is the live one? |
| Q14 | Schema itself | Only 6 foreign keys in 200 tables; relationships (e.g. `ORDER_CYCLE.DTP_HEADER_ID` -> `DTP_HEADER`) are by naming only | Relationships documented as [Inferred] until confirmed |
