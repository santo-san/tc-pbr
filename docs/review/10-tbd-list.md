# 10 - TBD / Items Requiring Confirmation

Wording: **TBD - Not confirmed from existing schema/data/code**. Grouped per UISS; field-level TBD come from the Database Specification of each UISS.

## UISS_Batch_DTP_Excel_Upload

- DTP records are stored per DTP type in ielp.DTP_1_DETAIL .. DTP_4_DETAIL; the Universal DTP template columns (round use, booking no., shipping agent, ETD, arrival date / time) match ielp.DTP_2_DETAIL (inferred).
- Whether ELIPS uploads use DTP_n_DETAIL_TMP tables (exist for DTP 1 and 4 only)
- History: LOG_ACTIVITY_ORDER (ACT, STS_CODE, STS_MESSAGE, DTP_DET_ID, CRETED_DATE) inferred as status history.
- Uploaded file: DTP_FILES (DTP_HEADER_ID, FILE_NAME, FILE_NEW_NAME) inferred for the uploaded Excel.

## UISS_Batch_DTP_Queue_Processing

- DTP records are stored per DTP type in ielp.DTP_1_DETAIL .. DTP_4_DETAIL; the Universal DTP template columns (round use, booking no., shipping agent, ETD, arrival date / time) match ielp.DTP_2_DETAIL (inferred).
- ORDER_CYCLE_ID / ORDER_NO generation
- Planned cycles: one ORDER_CYCLE row created per cycle at start or all at once?
- Cycle status: Codes TBD.
- Activity log: -

## UISS_Batch_DTP_Switching

- Is "DTP Switching" the same as ELIPS rollback (ORDER_CYCLE_ROLLBACK_H)?
- Rollback history: ROLLBACK_ID, ORDER_CYCLE_ID, CURR_STATUS_CODE, ROLLBACK_BY / DATE.

## UISS_Batch_Driver_Order_Sync

- MS_DRIVER vs TB_M_DRIVER as driver master
- Driver device token: Existing ELIPS push mechanism?

## UISS_Batch_ELIPS_PAS_GR_Attachment

- Surat Jalan API endpoint
- PDF storage (ORDER_FILES?)
- Run log: -
- PAS tables (TB_R_GR_IR, TB_R_PR_H): Outside ELIPS.

## UISS_Batch_ELIPS_PAS_PR_Interface

- Approval history source
- Mapping of SA sub items
- Interface status: IS_PAS, PAS_CREATED_DATE, LOG_ITG_SEND_ID.
- Sub items (WBS): -
- Fixed parameters: -
- Interface log: -
- PAS tables (TB_R_PR_H ...): Outside ELIPS - not verifiable with this schema.

## UISS_Batch_Master_Mileage_Upload

- Approval for the three proposed tables
- Function ID of the upload (dbo.TB_M_FUNCTION)

## UISS_Batch_PAS_ELIPS_PR_PO_Callback

- SA item key column
- Callback status values
- Run log: -

## UISS_Report_Delivery_Note

- KETERANGAN source
- Logo / stamp images
- PAS GR attachment record
- No. Telp: PHONE or MOBILE_PHONE?
- No Cycle Order (deliveryId): varchar(20); format YYMMDDC2XXX999 to confirm.
- KETERANGAN: TBD - Not confirmed from existing schema/data/code
- Delivery note file / GR attachment: Attachment record table TBD.

## UISS_Report_Download_Daily_Order_Monitoring

- Status names from MS_STATUS
- FA flag source
- Type: -
- FA: TBD - Not confirmed from existing schema/data/code
- Cycle n - Status: -
- SA Approved At: -

## UISS_Screen_DTP_Creation

- DTP records are stored per DTP type in ielp.DTP_1_DETAIL .. DTP_4_DETAIL; the Universal DTP template columns (round use, booking no., shipping agent, ETD, arrival date / time) match ielp.DTP_2_DETAIL (inferred).
- DTP_HEADER_ID / DTP_DET_ID generation
- MS_STATUS codes for DTP / order / cycle
- TB_M_SYSTEM keys for back-date / advance days
- IPMS interface source
- DTP Model / type: varchar(1); DTP 1-4 meaning TBD.
- DTP header status: varchar(100) NOT NULL; values TBD.
- Data Source (Excel / Manual / IPMS): No data-source column (SOURCES varchar(10)? TBD).
- History: LOG_ACTIVITY_ORDER (ACT, STS_CODE, STS_MESSAGE, DTP_DET_ID, CRETED_DATE) inferred as status history.
- System parameters: SYS_CAT / SYS_SUB_CAT / SYS_CD for back-date / advance days TBD.
- Uploaded file: DTP_FILES (DTP_HEADER_ID, FILE_NAME, FILE_NEW_NAME) inferred for the uploaded Excel.

## UISS_Screen_Daily_Order_Monitoring

- MS_STATUS codes (order, cycle)
- Which DTP_n_DETAIL per DTP type
- Accept / reject by LP storage
- Type (DTP 1-4): -
- FA: No FA flag column (PO_NUMBER_FA?).
- Cycle status: Codes via MS_STATUS (data needed).
- SA approved: -
- Planned / Actual Cycle: No planned-cycle column; actual = count of ORDER_CYCLE rows.
- Status history: Inferred; columns ACT, STS_CODE, STS_MESSAGE, REMARK, CREATED_BY, CRETED_DATE.
- Reason (release / reject): LOG_ACTIVITY_ORDER.REMARK or ORDER_REMARK (inferred).

## UISS_Screen_Master_KPI

- KPI_ID generation
- Meaning of MS_KPI.WEIGHT
- Table for per-company KPI values
- APP_ID value
- KPI item code: Column has no PK constraint in the DDL.
- KPI weight: Exists in ELIPS, not used by the mock-up.
- Trucking Company (row): Key of the per-company KPI row (table TBD).
- Score: Period score per company / route; master score per company not in ELIPS.
- KPI item columns (values): Period data, not master.
- Score grade ranges: Mock-up grade thresholds (master-kpi.js grade) vs MS_KPI_PERCENTAGE.
- UoM: TBD - Not confirmed from existing schema/data/code

## UISS_Screen_Master_Location

- LOCATION_ID generation; which key other tables use (FROM_LOC / TO_LOC varchar(10) = LOCATION_ID or LOCATION_ALIAS?)
- Values of AUTO_FINISH / AUTO_CYCLE / IS_DELETE
- Source of LOCATION_AREA / LOCATION_SUB
- APP_ID value
- Location Sub Area: LOCATION_SUB / LOCATION_AREA varchar(10); list source TBD.
- (key) Location ID: Generated - rule TBD
- (system) App ID: -

## UISS_Screen_Master_Mileage

- Values of IS_DELETE (varchar(5))
- Whether FROM_CODE / TO_CODE hold LOCATION_ID or LOCATION_ALIAS
- Whether TB_M_MILEAGE is shared with other ELIPS modules

## UISS_Screen_Master_Price

- Which table the screen reads (MS_ROUTE_PRICE vs ITG_ECAT)
- ROUTE_PRICE_SIZE meaning
- Currency (ROUTE_PRICE_CURRENCY) display
- Periode: YYYYMM of VALID_DT_FROM (inferred)
- Vehicle Type: varchar(2) - container size? inferred.
- Source: -
- (interface) eCatalogue price: Staging of the eCatalogue interface (VENDOR_CD, MAT_NO).

## UISS_Screen_Master_Priority

- Table / columns for route priority (FROM, TO, PRIORITY_NO, audit)
- Priority: TBD - Not confirmed from existing schema/data/code
- Created / Changed By / DT: TBD - Not confirmed from existing schema/data/code

## UISS_Screen_Master_Renban

- Plant list source
- SOURCE_LOCATION_ID = MS_LOCATION.LOCATION_ID? (inferred)
- Legacy ielp.MS_RENBAN still used?

## UISS_Screen_Master_Route_Percentage

- Relation MS_ROUTE (ROUTE_CODE, PRICE_CODE) vs MS_ROUTE_DETAIL
- Role of MS_ROUTE_PERCENTAGE_HIST (period copy?)
- ROUTE_HEADER_ID generation
- Sync flag: Exists in ELIPS (sync to another system?), not used by the mock-up.

## UISS_Screen_Master_Trucking_Company

- COMPANY_ID generation rule
- APP_ID value for TC-PBR records
- BUSINESS_TYPE meaning
- Use of MS_TRUCKING_COMPANY_CY / MS_TRUCKING_COMPANY_TMP (not in the mock-up)
- (key) Company ID: Generated - rule TBD
- (system) App ID: Default 'ENVITRUCK'

## UISS_Screen_PO_Approval

- PO APPROVAL_STS values
- PO_TYPE values
- APPROVAL_LIMIT meaning
- PO Status: -
- Auto Approve At: Per PO_PERIODE + APPROVAL_CLASS (inferred).
- Approval History: Approvals in PO_APPROVAL rows.

## UISS_Screen_PO_Inquiry

- PO APPROVAL_STS values
- PO_TYPE values
- APPROVAL_LIMIT meaning
- PO Status: -
- Auto Approve At: Per PO_PERIODE + APPROVAL_CLASS (inferred).
- Approval History: Approvals in PO_APPROVAL rows.

## UISS_Screen_PR_Approval

- APPROVAL_STS / APPROVAL_CLASS values
- CRITERIA_HEADER_ID / PR number generation
- Approval status per level: varchar(2); APPROVAL_CLASS = level (values TBD).
- Approval History: No history table; approvals in CRITERIA_SCORE_APPROVAL / PO_APPROVAL rows.
- PR status: -

## UISS_Screen_PR_Creation

- Sequence of PR numbers (PR_NO vc11, PR_SEQ)
- Which of CRITERIA_* vs TB_R_PR_* is used per PR type
- PR Creation Type: varchar(1) (inferred).
- Fixed cost (by resource) lines: TB_R_PR_DAILY / _DETAIL / TB_R_PR_SUMMARY (truck, driver, DOT / HOT) inferred for the fixed-cost PR.

## UISS_Screen_PR_Inquiry

- APPROVAL_STS / APPROVAL_CLASS values
- CRITERIA_HEADER_ID / PR number generation
- Approval status per level: varchar(2); APPROVAL_CLASS = level (values TBD).
- Approval History: No history table; approvals in CRITERIA_SCORE_APPROVAL / PO_APPROVAL rows.

## UISS_Screen_Planning_Truck_Assignment

- Seal No source (SEAL_NO columns exist)
- Truck maintenance status source
- Seal No: SEAL_NO exists in ORDER_CYCLE / DTP_2_DETAIL.

## UISS_Screen_SA_Approval

- SA_HEADER_ID / SA_DETAIL_ID generation
- STATUS_CODE / SA_TYPE values
- SA_ROUTE_PRICE_TMP use (route price per order)
- DTP Type: -
- PO Validity / Currency: No validity / currency on SA; MS_ROUTE_PRICE.VALID_DT_FROM / TO, ROUTE_PRICE_CURRENCY (inferred).
- Rate / KM: -
- PO status (monthly): -
- SA type: varchar(1): daily / monthly values TBD.

## UISS_Screen_SA_Monitoring

- PAS_STATUS values
- Meaning of VISION_* columns
- Monthly SA detail (fixed cost) rows in SA_DETAIL
- SA Type: -
- Interface Status: IS_PAS, PAS_CREATED_DATE, IS_PAS_CALLBACK, PAS_CALLBACK_STATUS, PAS_CALLBACK_DATE.
- Integration log: LOG_ITGPAS: ACT, PARAM_REQ / RES, STS_CODE, STS_MESSAGE; SA_DETAIL.LOG_ITG_SEND_ID / LOG_ITG_CALLBACK_ID.

## New UISS (created in this review)

- UISS_Screen_TCPBR_Menu_Authorization: USERID_CLASS per role, MENU_ID / APP_NAME, master-screen role rules, supplier / driver user link
- UISS_Batch_SA_PAS_Interface: PAS endpoint / transport, PAS_STATUS values, correlation id / attempts storage, overdue limit
- UISS_Batch_IPMS_DTP_Interface: IPMS system, source tables, trigger and record key

Total: 152 items.
