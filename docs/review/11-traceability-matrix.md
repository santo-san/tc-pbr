# 11 - Final Traceability Matrix

Database -> Backend / Logic -> Function -> UI -> UISS. One row per mapped UI element (from the revised UISS).
Status: **Verified** (UISS already matched the schema) · **Revised** (UISS changed to the schema; former conflicts: existing logic kept + DB change request, decision 14-Nov-26) · **TBD** (not confirmed) · **Missing** (no table / no UISS before). No item is left in status Conflict.

| ID | Module | Screen | Function | UI Field/Component | Code Reference | API/Logic | DB Table.Column | UISS Reference | Status |
|---|---|---|---|---|---|---|---|---|---|
| TR-001 | Daily | Planning Order (upload) | DTP-03 | LP (Trucking Company) | dtp.js:714 | dtp-rules.js readSheet / validate | ielp.DTP_2_DETAIL.COMPANY_ID | Batch_DTP_Excel_Upload rev 0.5 | Revised |
| TR-002 | Daily | Planning Order (upload) | DTP-03 | Renban | dtp.js:714 | dtp-rules.js readSheet / validate | ielp.DTP_2_DETAIL.RENBAN | Batch_DTP_Excel_Upload rev 0.5 | Revised |
| TR-003 | Daily | Planning Order (upload) | DTP-03 | From / To Location | dtp.js:714 | dtp-rules.js readSheet / validate | ielp.DTP_2_DETAIL.FROM_LOC | Batch_DTP_Excel_Upload rev 0.5 | Revised |
| TR-004 | Daily | Planning Order (upload) | DTP-03 | ETD | dtp.js:714 | dtp-rules.js readSheet / validate | ielp.DTP_2_DETAIL.ETD | Batch_DTP_Excel_Upload rev 0.5 | Revised |
| TR-005 | Daily | Planning Order (upload) | DTP-03 | Container No | dtp.js:714 | dtp-rules.js readSheet / validate | ielp.DTP_2_DETAIL.CONTAINER_NO | Batch_DTP_Excel_Upload rev 0.5 | Verified |
| TR-006 | Daily | Planning Order (upload) | DTP-03 | Record status | dtp.js:714 | dtp-rules.js readSheet / validate | ielp.DTP_2_DETAIL.STATUS_CODE | Batch_DTP_Excel_Upload rev 0.5 | Revised |
| TR-007 | Daily | Planning Order (upload) | DTP-03 | Order No | dtp.js:714 | dtp-rules.js readSheet / validate | ielp.DTP_2_DETAIL.ORDER_NO | Batch_DTP_Excel_Upload rev 0.5 | Revised |
| TR-008 | Daily | Planning Order (upload) | DTP-03 | Payment Type | dtp.js:714 | dtp-rules.js readSheet / validate | TBD | Batch_DTP_Excel_Upload rev 0.5 | Revised |
| TR-009 | Daily | Planning Order (upload) | DTP-03 | History | dtp.js:714 | dtp-rules.js readSheet / validate | ielp.LOG_ACTIVITY_ORDER.ACT | Batch_DTP_Excel_Upload rev 0.5 | TBD |
| TR-010 | Daily | Planning Order (upload) | DTP-03 | Uploaded file | dtp.js:714 | dtp-rules.js readSheet / validate | ielp.DTP_FILES.FILE_NAME | Batch_DTP_Excel_Upload rev 0.5 | TBD |
| TR-011 | Daily | Planning Order (queue) | DTP-09..10 | Order No | dtp.js:86 | dtp-rules.js step / orderPayload | ielp.ORDER_CYCLE.ORDER_NO | Batch_DTP_Queue_Processing rev 0.4 | Revised |
| TR-012 | Daily | Planning Order (queue) | DTP-09..10 | Cycle sequence | dtp.js:86 | dtp-rules.js step / orderPayload | ielp.ORDER_CYCLE.CYCLE_SEQ | Batch_DTP_Queue_Processing rev 0.4 | Revised |
| TR-013 | Daily | Planning Order (queue) | DTP-09..10 | DTP header | dtp.js:86 | dtp-rules.js step / orderPayload | ielp.ORDER_CYCLE.DTP_HEADER_ID | Batch_DTP_Queue_Processing rev 0.4 | Revised |
| TR-014 | Daily | Planning Order (queue) | DTP-09..10 | DTP detail | dtp.js:86 | dtp-rules.js step / orderPayload | ielp.ORDER_CYCLE.DTP_DET_ID | Batch_DTP_Queue_Processing rev 0.4 | Revised |
| TR-015 | Daily | Planning Order (queue) | DTP-09..10 | Cycle status | dtp.js:86 | dtp-rules.js step / orderPayload | ielp.ORDER_CYCLE.STATUS_CODE | Batch_DTP_Queue_Processing rev 0.4 | TBD |
| TR-016 | Daily | Planning Order (queue) | DTP-09..10 | Record status | dtp.js:86 | dtp-rules.js step / orderPayload | ielp.DTP_2_DETAIL.STATUS_CODE | Batch_DTP_Queue_Processing rev 0.4 | Revised |
| TR-017 | Daily | Planning Order (queue) | DTP-09..10 | Attempt count / fail reason | dtp.js:86 | dtp-rules.js step / orderPayload | TBD | Batch_DTP_Queue_Processing rev 0.4 | Revised |
| TR-018 | Daily | Planning Order (queue) | DTP-09..10 | Activity log | dtp.js:86 | dtp-rules.js step / orderPayload | ielp.LOG_ACTIVITY_ORDER.STS_CODE | Batch_DTP_Queue_Processing rev 0.4 | TBD |
| TR-019 | Daily | Planning Order (switching) | DTP-11 | Rollback history | dtp.js:819 | dtp-rules.js switchCheck / switchBack | ielp.ORDER_CYCLE_ROLLBACK_H.ROLLBACK_REMARKS | Batch_DTP_Switching rev 0.5 | TBD |
| TR-020 | Daily | Planning Order (switching) | DTP-11 | Truck history | dtp.js:819 | dtp-rules.js switchCheck / switchBack | ielp.ORDER_TRUCK_H.LICENSE_PLATE | Batch_DTP_Switching rev 0.5 | Revised |
| TR-021 | Daily | Planning Order (switching) | DTP-11 | Released truck | dtp.js:819 | dtp-rules.js switchCheck / switchBack | ielp.DTP_2_DETAIL.LICENSE_PLATE | Batch_DTP_Switching rev 0.5 | Revised |
| TR-022 | Daily | Planning Order (switching) | DTP-11 | Order cancel | dtp.js:819 | dtp-rules.js switchCheck / switchBack | ielp.ORDER_CYCLE.CANCEL_REMARKS | Batch_DTP_Switching rev 0.5 | Revised |
| TR-023 | Daily | Planning Order (switching) | DTP-11 | Switch request / audit | dtp.js:819 | dtp-rules.js switchCheck / switchBack | TBD | Batch_DTP_Switching rev 0.5 | Missing |
| TR-024 | Daily | Driver APK sync | DTP-16 | Cycle order | - (no code) | - | ielp.ORDER_CYCLE.ORDER_CYCLE_ID | Batch_Driver_Order_Sync rev 0.4 | Revised |
| TR-025 | Daily | Driver APK sync | DTP-16 | Plate | - (no code) | - | ielp.ORDER_CYCLE.LICENSE_PLATE | Batch_Driver_Order_Sync rev 0.4 | Revised |
| TR-026 | Daily | Driver APK sync | DTP-16 | Driver | - (no code) | - | ielp.MS_DRIVER.DRIVER_NAME | Batch_Driver_Order_Sync rev 0.4 | Revised |
| TR-027 | Daily | Driver APK sync | DTP-16 | Location name / coordinates | - (no code) | - | ielp.MS_LOCATION.LOCATION_NAME | Batch_Driver_Order_Sync rev 0.4 | Revised |
| TR-028 | Daily | Driver APK sync | DTP-16 | Driver device token | - (no code) | - | ielp.TB_M_DRIVER.FIREBASE_TOKEN | Batch_Driver_Order_Sync rev 0.4 | TBD |
| TR-029 | Daily | Driver APK sync | DTP-16 | Sync tables | - (no code) | - | TBD | Batch_Driver_Order_Sync rev 0.4 | Missing |
| TR-030 | Interface | GR attachment | INT-03 | SA / PO link | dn-rules.js attachPAS (simulated) | Talend / FTP | ielp.SA_DETAIL.PAS_PO_NUMBER | Batch_ELIPS_PAS_GR_Attachment rev 0.3 | Revised |
| TR-031 | Interface | GR attachment | INT-03 | Cycles of the SA | dn-rules.js attachPAS (simulated) | Talend / FTP | ielp.ORDER_CYCLE.SA_CODE | Batch_ELIPS_PAS_GR_Attachment rev 0.3 | Revised |
| TR-032 | Interface | GR attachment | INT-03 | Run log | dn-rules.js attachPAS (simulated) | Talend / FTP | ielp.LOG_ITGPAS.STS_CODE | Batch_ELIPS_PAS_GR_Attachment rev 0.3 | TBD |
| TR-033 | Interface | GR attachment | INT-03 | PAS tables (TB_R_GR_IR, TB_R_PR_H) | dn-rules.js attachPAS (simulated) | Talend / FTP | TBD | Batch_ELIPS_PAS_GR_Attachment rev 0.3 | TBD |
| TR-034 | Interface | ELIPS -> PAS PR | INT-01 | SA header | - (Talend) | current-tjava-json-to-pas.java | ielp.SA_HEADER.SA_HEADER_ID | Batch_ELIPS_PAS_PR_Interface rev 0.3 | Revised |
| TR-035 | Interface | ELIPS -> PAS PR | INT-01 | SA detail | - (Talend) | current-tjava-json-to-pas.java | ielp.SA_DETAIL.SA_CODE | Batch_ELIPS_PAS_PR_Interface rev 0.3 | Revised |
| TR-036 | Interface | ELIPS -> PAS PR | INT-01 | Interface status | - (Talend) | current-tjava-json-to-pas.java | ielp.SA_DETAIL.PAS_STATUS | Batch_ELIPS_PAS_PR_Interface rev 0.3 | TBD |
| TR-037 | Interface | ELIPS -> PAS PR | INT-01 | Sub items (WBS) | - (Talend) | current-tjava-json-to-pas.java | ielp.SA_WBS_PERCENTAGE.WBS_NUMBER | Batch_ELIPS_PAS_PR_Interface rev 0.3 | TBD |
| TR-038 | Interface | ELIPS -> PAS PR | INT-01 | Fixed parameters | - (Talend) | current-tjava-json-to-pas.java | ielp.TB_M_SYSTEM.SYS_VALUE | Batch_ELIPS_PAS_PR_Interface rev 0.3 | TBD |
| TR-039 | Interface | ELIPS -> PAS PR | INT-01 | Interface log | - (Talend) | current-tjava-json-to-pas.java | ielp.LOG_ITGPAS.STS_CODE | Batch_ELIPS_PAS_PR_Interface rev 0.3 | TBD |
| TR-040 | Interface | ELIPS -> PAS PR | INT-01 | PAS tables (TB_R_PR_H ...) | - (Talend) | current-tjava-json-to-pas.java | TBD | Batch_ELIPS_PAS_PR_Interface rev 0.3 | TBD |
| TR-041 | Master | Mileage (upload) | MML-03 | FROM CODE (file) | mileage.js:191 | master-mileage.js readSheet / checkUpload / applyUpload | ielp.TB_M_MILEAGE.FROM_CODE | Batch_Master_Mileage_Upload rev 0.5 | Revised |
| TR-042 | Master | Mileage (upload) | MML-03 | TO CODE (file) | mileage.js:191 | master-mileage.js readSheet / checkUpload / applyUpload | ielp.TB_M_MILEAGE.TO_CODE | Batch_Master_Mileage_Upload rev 0.5 | Revised |
| TR-043 | Master | Mileage (upload) | MML-03 | MILEAGE (KM) (file) | mileage.js:191 | master-mileage.js readSheet / checkUpload / applyUpload | ielp.TB_M_MILEAGE.MILEAGE | Batch_Master_Mileage_Upload rev 0.5 | Revised |
| TR-044 | Master | Mileage (upload) | MML-03 | From / To names | mileage.js:191 | master-mileage.js readSheet / checkUpload / applyUpload | ielp.TB_M_MILEAGE.LOC_NAME_FROM | Batch_Master_Mileage_Upload rev 0.5 | Revised |
| TR-045 | Master | Mileage (upload) | MML-03 | Audit | mileage.js:191 | master-mileage.js readSheet / checkUpload / applyUpload | ielp.TB_M_MILEAGE.CREATED_BY | Batch_Master_Mileage_Upload rev 0.5 | Revised |
| TR-046 | Master | Mileage (upload) | MML-03 | Temp / log / history (TB_T_MILEAGE_UPLOAD, TB_R_MILEAGE_UPLOAD_LOG, TB_H_MILEAGE) | mileage.js:191 | master-mileage.js readSheet / checkUpload / applyUpload | TBD | Batch_Master_Mileage_Upload rev 0.5 | Missing |
| TR-047 | Interface | PAS -> ELIPS callback | INT-02 | PR number | - (Talend) | - | ielp.SA_DETAIL.PAS_PR_NUMBER | Batch_PAS_ELIPS_PR_PO_Callback rev 0.3 | Revised |
| TR-048 | Interface | PAS -> ELIPS callback | INT-02 | PR date | - (Talend) | - | ielp.SA_DETAIL.PAS_PR_DATE | Batch_PAS_ELIPS_PR_PO_Callback rev 0.3 | Revised |
| TR-049 | Interface | PAS -> ELIPS callback | INT-02 | PO number | - (Talend) | - | ielp.SA_DETAIL.PAS_PO_NUMBER | Batch_PAS_ELIPS_PR_PO_Callback rev 0.3 | Revised |
| TR-050 | Interface | PAS -> ELIPS callback | INT-02 | PO date | - (Talend) | - | ielp.SA_DETAIL.PAS_PO_DATE | Batch_PAS_ELIPS_PR_PO_Callback rev 0.3 | Revised |
| TR-051 | Interface | PAS -> ELIPS callback | INT-02 | Callback flag / status | - (Talend) | - | ielp.SA_DETAIL.IS_PAS_CALLBACK | Batch_PAS_ELIPS_PR_PO_Callback rev 0.3 | Revised |
| TR-052 | Interface | PAS -> ELIPS callback | INT-02 | Run log | - (Talend) | - | ielp.LOG_ITGPAS.STS_CODE | Batch_PAS_ELIPS_PR_PO_Callback rev 0.3 | TBD |
| TR-053 | Daily | Order Detail (Surat Jalan) | DM-12..14 | Nama (driver) | delivery-note.js | dn-rules.js, dn-pdf.js | ielp.MS_DRIVER.DRIVER_NAME | Report_Delivery_Note rev 0.4 | Revised |
| TR-054 | Daily | Order Detail (Surat Jalan) | DM-12..14 | No. Telp | delivery-note.js | dn-rules.js, dn-pdf.js | ielp.MS_DRIVER.MOBILE_PHONE | Report_Delivery_Note rev 0.4 | TBD |
| TR-055 | Daily | Order Detail (Surat Jalan) | DM-12..14 | No Polisi | delivery-note.js | dn-rules.js, dn-pdf.js | ielp.ORDER_CYCLE.LICENSE_PLATE | Report_Delivery_Note rev 0.4 | Revised |
| TR-056 | Daily | Order Detail (Surat Jalan) | DM-12..14 | Tanggal | delivery-note.js | dn-rules.js, dn-pdf.js | ielp.ORDER_CYCLE.START_DATE | Report_Delivery_Note rev 0.4 | Revised |
| TR-057 | Daily | Order Detail (Surat Jalan) | DM-12..14 | SA Number | delivery-note.js | dn-rules.js, dn-pdf.js | ielp.ORDER_CYCLE.SA_CODE | Report_Delivery_Note rev 0.4 | Revised |
| TR-058 | Daily | Order Detail (Surat Jalan) | DM-12..14 | No Order | delivery-note.js | dn-rules.js, dn-pdf.js | ielp.ORDER_CYCLE.ORDER_NO | Report_Delivery_Note rev 0.4 | Revised |
| TR-059 | Daily | Order Detail (Surat Jalan) | DM-12..14 | No Cycle Order (deliveryId) | delivery-note.js | dn-rules.js, dn-pdf.js | ielp.ORDER_CYCLE.ORDER_CYCLE_ID | Report_Delivery_Note rev 0.4 | TBD |
| TR-060 | Daily | Order Detail (Surat Jalan) | DM-12..14 | Cycle | delivery-note.js | dn-rules.js, dn-pdf.js | ielp.ORDER_CYCLE.CYCLE_SEQ | Report_Delivery_Note rev 0.4 | Revised |
| TR-061 | Daily | Order Detail (Surat Jalan) | DM-12..14 | Lokasi Asal / Tujuan | delivery-note.js | dn-rules.js, dn-pdf.js | ielp.MS_LOCATION.LOCATION_NAME | Report_Delivery_Note rev 0.4 | Revised |
| TR-062 | Daily | Order Detail (Surat Jalan) | DM-12..14 | CTR NO | delivery-note.js | dn-rules.js, dn-pdf.js | ielp.ORDER_CYCLE.CONTAINER_NO | Report_Delivery_Note rev 0.4 | Revised |
| TR-063 | Daily | Order Detail (Surat Jalan) | DM-12..14 | KETERANGAN | delivery-note.js | dn-rules.js, dn-pdf.js | TBD | Report_Delivery_Note rev 0.4 | TBD |
| TR-064 | Daily | Order Detail (Surat Jalan) | DM-12..14 | Delivery note file / GR attachment | delivery-note.js | dn-rules.js, dn-pdf.js | ielp.ORDER_FILES.FILE_PATH | Report_Delivery_Note rev 0.4 | TBD |
| TR-065 | Daily | Daily Monitoring (export) | DM-04 | Date | app.js:303 | SheetJS | ielp.ORDER_CYCLE.ORDER_DATE | Report_Download_Daily_Order_Monitoring rev 0.4 | Revised |
| TR-066 | Daily | Daily Monitoring (export) | DM-04 | No. Order | app.js:303 | SheetJS | ielp.ORDER_CYCLE.ORDER_NO | Report_Download_Daily_Order_Monitoring rev 0.4 | Revised |
| TR-067 | Daily | Daily Monitoring (export) | DM-04 | Type | app.js:303 | SheetJS | ielp.DTP_HEADER.DTP_TYPE | Report_Download_Daily_Order_Monitoring rev 0.4 | TBD |
| TR-068 | Daily | Daily Monitoring (export) | DM-04 | Trucking Comp. | app.js:303 | SheetJS | ielp.MS_TRUCKING_COMPANY.COMPANY_NAME | Report_Download_Daily_Order_Monitoring rev 0.4 | Revised |
| TR-069 | Daily | Daily Monitoring (export) | DM-04 | License Plate | app.js:303 | SheetJS | ielp.ORDER_CYCLE.LICENSE_PLATE | Report_Download_Daily_Order_Monitoring rev 0.4 | Revised |
| TR-070 | Daily | Daily Monitoring (export) | DM-04 | Driver | app.js:303 | SheetJS | ielp.MS_DRIVER.DRIVER_NAME | Report_Download_Daily_Order_Monitoring rev 0.4 | Revised |
| TR-071 | Daily | Daily Monitoring (export) | DM-04 | DTP Loc. From / To | app.js:303 | SheetJS | ielp.MS_LOCATION.LOCATION_NAME | Report_Download_Daily_Order_Monitoring rev 0.4 | Revised |
| TR-072 | Daily | Daily Monitoring (export) | DM-04 | Renban | app.js:303 | SheetJS | ielp.ORDER_CYCLE.RENBAN | Report_Download_Daily_Order_Monitoring rev 0.4 | Revised |
| TR-073 | Daily | Daily Monitoring (export) | DM-04 | Shift | app.js:303 | SheetJS | ielp.ORDER_CYCLE.SHIFT | Report_Download_Daily_Order_Monitoring rev 0.4 | Revised |
| TR-074 | Daily | Daily Monitoring (export) | DM-04 | FA | app.js:303 | SheetJS | TBD | Report_Download_Daily_Order_Monitoring rev 0.4 | TBD |
| TR-075 | Daily | Daily Monitoring (export) | DM-04 | Cycle n - Time | app.js:303 | SheetJS | ielp.ORDER_CYCLE.START_DATE | Report_Download_Daily_Order_Monitoring rev 0.4 | Revised |
| TR-076 | Daily | Daily Monitoring (export) | DM-04 | Cycle n - Status | app.js:303 | SheetJS | ielp.ORDER_CYCLE.STATUS_CODE | Report_Download_Daily_Order_Monitoring rev 0.4 | TBD |
| TR-077 | Daily | Daily Monitoring (export) | DM-04 | Cycle n - Container | app.js:303 | SheetJS | ielp.ORDER_CYCLE.CONTAINER_NO | Report_Download_Daily_Order_Monitoring rev 0.4 | Revised |
| TR-078 | Daily | Daily Monitoring (export) | DM-04 | SA Approved At | app.js:303 | SheetJS | ielp.SA_DETAIL.APPROVED_DATE | Report_Download_Daily_Order_Monitoring rev 0.4 | TBD |
| TR-079 | Daily | Daily Monitoring (export) | DM-04 | PO Number | app.js:303 | SheetJS | ielp.ORDER_CYCLE.PO_NUMBER | Report_Download_Daily_Order_Monitoring rev 0.4 | Revised |
| TR-080 | Daily | Planning Order | DTP-01..13 | Daily Plan Date | dtp.js | dtp-rules.js | ielp.DTP_HEADER.DTP_DATE | Screen_DTP_Creation rev 0.9 | Revised |
| TR-081 | Daily | Planning Order | DTP-01..13 | DTP Model / type | dtp.js | dtp-rules.js | ielp.DTP_HEADER.DTP_TYPE | Screen_DTP_Creation rev 0.9 | TBD |
| TR-082 | Daily | Planning Order | DTP-01..13 | DTP header status | dtp.js | dtp-rules.js | ielp.DTP_HEADER.DTP_STATUS | Screen_DTP_Creation rev 0.9 | TBD |
| TR-083 | Daily | Planning Order | DTP-01..13 | Import / Export (Service Type) | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.SERVICE_TYPE | Screen_DTP_Creation rev 0.9 | Revised |
| TR-084 | Daily | Planning Order | DTP-01..13 | Exporter / Importer CD | dtp.js | dtp-rules.js | TBD | Screen_DTP_Creation rev 0.9 | Revised |
| TR-085 | Daily | Planning Order | DTP-01..13 | Round Use | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.IS_ROUNDUSE | Screen_DTP_Creation rev 0.9 | Revised |
| TR-086 | Daily | Planning Order | DTP-01..13 | LP (Trucking Company) | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.COMPANY_ID | Screen_DTP_Creation rev 0.9 | Revised |
| TR-087 | Daily | Planning Order | DTP-01..13 | Renban | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.RENBAN | Screen_DTP_Creation rev 0.9 | Revised |
| TR-088 | Daily | Planning Order | DTP-01..13 | Destination | dtp.js | dtp-rules.js | TBD | Screen_DTP_Creation rev 0.9 | Revised |
| TR-089 | Daily | Planning Order | DTP-01..13 | From / To Location | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.FROM_LOC | Screen_DTP_Creation rev 0.9 | Revised |
| TR-090 | Daily | Planning Order | DTP-01..13 | To | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.TO_LOC | Screen_DTP_Creation rev 0.9 | Revised |
| TR-091 | Daily | Planning Order | DTP-01..13 | ETD | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.ETD | Screen_DTP_Creation rev 0.9 | Revised |
| TR-092 | Daily | Planning Order | DTP-01..13 | Arrival Date | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.ARRIVAL_DATE | Screen_DTP_Creation rev 0.9 | Revised |
| TR-093 | Daily | Planning Order | DTP-01..13 | Arrival Time | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.ARRIVAL_TIME | Screen_DTP_Creation rev 0.9 | Revised |
| TR-094 | Daily | Planning Order | DTP-01..13 | Container Size | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.CTR_SIZE | Screen_DTP_Creation rev 0.9 | Revised |
| TR-095 | Daily | Planning Order | DTP-01..13 | Ctr Type | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.CTR_TYPE | Screen_DTP_Creation rev 0.9 | Revised |
| TR-096 | Daily | Planning Order | DTP-01..13 | Shipping Agent | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.SHIPPING_AGENT | Screen_DTP_Creation rev 0.9 | Revised |
| TR-097 | Daily | Planning Order | DTP-01..13 | Ctr Booking No | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.CTR_BOOKING_NO | Screen_DTP_Creation rev 0.9 | Revised |
| TR-098 | Daily | Planning Order | DTP-01..13 | Vessel | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.VESSEL | Screen_DTP_Creation rev 0.9 | Revised |
| TR-099 | Daily | Planning Order | DTP-01..13 | Description | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.DESCRIPTION | Screen_DTP_Creation rev 0.9 | Revised |
| TR-100 | Daily | Planning Order | DTP-01..13 | Truck Type | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.TRUCK_TYPE | Screen_DTP_Creation rev 0.9 | Revised |
| TR-101 | Daily | Planning Order | DTP-01..13 | Container No | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.CONTAINER_NO | Screen_DTP_Creation rev 0.9 | Verified |
| TR-102 | Daily | Planning Order | DTP-01..13 | Shift | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.SHIFT | Screen_DTP_Creation rev 0.9 | Revised |
| TR-103 | Daily | Planning Order | DTP-01..13 | Ctr DG flag | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.IS_DG | Screen_DTP_Creation rev 0.9 | Revised |
| TR-104 | Daily | Planning Order | DTP-01..13 | Record status | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.STATUS_CODE | Screen_DTP_Creation rev 0.9 | Revised |
| TR-105 | Daily | Planning Order | DTP-01..13 | Order No | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.ORDER_NO | Screen_DTP_Creation rev 0.9 | Revised |
| TR-106 | Daily | Planning Order | DTP-01..13 | Data Source (Excel / Manual / IPMS) | dtp.js | dtp-rules.js | TBD | Screen_DTP_Creation rev 0.9 | TBD |
| TR-107 | Daily | Planning Order | DTP-01..13 | Payment Type | dtp.js | dtp-rules.js | TBD | Screen_DTP_Creation rev 0.9 | Revised |
| TR-108 | Daily | Planning Order | DTP-01..13 | Delete | dtp.js | dtp-rules.js | ielp.DTP_2_DETAIL.IS_DELETE | Screen_DTP_Creation rev 0.9 | Revised |
| TR-109 | Daily | Planning Order | DTP-01..13 | History | dtp.js | dtp-rules.js | ielp.LOG_ACTIVITY_ORDER.ACT | Screen_DTP_Creation rev 0.9 | TBD |
| TR-110 | Daily | Planning Order | DTP-01..13 | System parameters | dtp.js | dtp-rules.js | ielp.TB_M_SYSTEM.SYS_VALUE | Screen_DTP_Creation rev 0.9 | TBD |
| TR-111 | Daily | Planning Order | DTP-01..13 | Daily order / cycle | dtp.js | dtp-rules.js | ielp.ORDER_CYCLE.ORDER_NO | Screen_DTP_Creation rev 0.9 | Revised |
| TR-112 | Daily | Planning Order | DTP-01..13 | Order Sharing % (KPI) | dtp.js | dtp-rules.js | ielp.CRITERIA_LAST_ORDER.ORDER_SHARING | Screen_DTP_Creation rev 0.9 | Revised |
| TR-113 | Daily | Planning Order | DTP-01..13 | Daily Trip (KPI) | dtp.js | dtp-rules.js | TBD | Screen_DTP_Creation rev 0.9 | Revised |
| TR-114 | Daily | Planning Order | DTP-01..13 | Uploaded file | dtp.js | dtp-rules.js | ielp.DTP_FILES.FILE_NAME | Screen_DTP_Creation rev 0.9 | TBD |
| TR-115 | Daily | Daily Monitoring | DM-01..11 | Date | app.js | workflow.js | ielp.ORDER_CYCLE.ORDER_DATE | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-116 | Daily | Daily Monitoring | DM-01..11 | No. Order | app.js | workflow.js | ielp.ORDER_CYCLE.ORDER_NO | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-117 | Daily | Daily Monitoring | DM-01..11 | Type (DTP 1-4) | app.js | workflow.js | ielp.DTP_HEADER.DTP_TYPE | Screen_Daily_Order_Monitoring rev 0.5 | TBD |
| TR-118 | Daily | Daily Monitoring | DM-01..11 | Trucking Comp. | app.js | workflow.js | ielp.ORDER_CYCLE.COMPANY_ID | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-119 | Daily | Daily Monitoring | DM-01..11 | License Plate | app.js | workflow.js | ielp.ORDER_CYCLE.LICENSE_PLATE | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-120 | Daily | Daily Monitoring | DM-01..11 | Driver | app.js | workflow.js | ielp.ORDER_CYCLE.DRIVER_ID | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-121 | Daily | Daily Monitoring | DM-01..11 | From / To | app.js | workflow.js | ielp.ORDER_CYCLE.FROM_LOC | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-122 | Daily | Daily Monitoring | DM-01..11 | To | app.js | workflow.js | ielp.ORDER_CYCLE.TO_LOC | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-123 | Daily | Daily Monitoring | DM-01..11 | Renban | app.js | workflow.js | ielp.ORDER_CYCLE.RENBAN | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-124 | Daily | Daily Monitoring | DM-01..11 | Shift | app.js | workflow.js | ielp.ORDER_CYCLE.SHIFT | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-125 | Daily | Daily Monitoring | DM-01..11 | FA | app.js | workflow.js | TBD | Screen_Daily_Order_Monitoring rev 0.5 | TBD |
| TR-126 | Daily | Daily Monitoring | DM-01..11 | Cycle status | app.js | workflow.js | ielp.ORDER_CYCLE.STATUS_CODE | Screen_Daily_Order_Monitoring rev 0.5 | TBD |
| TR-127 | Daily | Daily Monitoring | DM-01..11 | Cycle sequence | app.js | workflow.js | ielp.ORDER_CYCLE.CYCLE_SEQ | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-128 | Daily | Daily Monitoring | DM-01..11 | Container No | app.js | workflow.js | ielp.ORDER_CYCLE.CONTAINER_NO | Screen_Daily_Order_Monitoring rev 0.5 | Verified |
| TR-129 | Daily | Daily Monitoring | DM-01..11 | Start / Pick Up / Finish | app.js | workflow.js | ielp.ORDER_CYCLE.START_DATE | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-130 | Daily | Daily Monitoring | DM-01..11 | SA approved | app.js | workflow.js | ielp.SA_DETAIL.APPROVED_DATE | Screen_Daily_Order_Monitoring rev 0.5 | TBD |
| TR-131 | Daily | Daily Monitoring | DM-01..11 | PO Number | app.js | workflow.js | ielp.ORDER_CYCLE.PO_NUMBER | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-132 | Daily | Daily Monitoring | DM-01..11 | Planned / Actual Cycle | app.js | workflow.js | TBD | Screen_Daily_Order_Monitoring rev 0.5 | TBD |
| TR-133 | Daily | Daily Monitoring | DM-01..11 | Files | app.js | workflow.js | ielp.ORDER_FILES.FILE_NAME | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-134 | Daily | Daily Monitoring | DM-01..11 | Status history | app.js | workflow.js | ielp.LOG_ACTIVITY_ORDER.ACT | Screen_Daily_Order_Monitoring rev 0.5 | TBD |
| TR-135 | Daily | Daily Monitoring | DM-01..11 | Truck Number (picker) | app.js | workflow.js | ielp.MS_TRUCK_REGISTRATION.LICENSE_PLATE | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-136 | Daily | Daily Monitoring | DM-01..11 | Driver (picker) | app.js | workflow.js | ielp.MS_DRIVER.DRIVER_ID | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-137 | Daily | Daily Monitoring | DM-01..11 | Truck change history | app.js | workflow.js | ielp.ORDER_TRUCK_H.LICENSE_PLATE | Screen_Daily_Order_Monitoring rev 0.5 | Revised |
| TR-138 | Daily | Daily Monitoring | DM-01..11 | Reason (release / reject) | app.js | workflow.js | TBD | Screen_Daily_Order_Monitoring rev 0.5 | TBD |
| TR-139 | Master | KPI | MKP-01..02 | Enter New KPI (KPI item name) | kpi.js | master-kpi.js | ielp.MS_KPI.KPI_NAME | Screen_Master_KPI rev 0.5 | Revised |
| TR-140 | Master | KPI | MKP-01..02 | KPI item code | kpi.js | master-kpi.js | ielp.MS_KPI.KPI_ID | Screen_Master_KPI rev 0.5 | TBD |
| TR-141 | Master | KPI | MKP-01..02 | KPI item order | kpi.js | master-kpi.js | ielp.MS_KPI.ORDER_SEQ | Screen_Master_KPI rev 0.5 | Revised |
| TR-142 | Master | KPI | MKP-01..02 | KPI weight | kpi.js | master-kpi.js | ielp.MS_KPI.WEIGHT | Screen_Master_KPI rev 0.5 | TBD |
| TR-143 | Master | KPI | MKP-01..02 | Select Trucking Company | kpi.js | master-kpi.js | ielp.MS_TRUCKING_COMPANY.COMPANY_CODE | Screen_Master_KPI rev 0.5 | Revised |
| TR-144 | Master | KPI | MKP-01..02 | Trucking Company (row) | kpi.js | master-kpi.js | ielp.MS_TRUCKING_COMPANY.COMPANY_ID | Screen_Master_KPI rev 0.5 | TBD |
| TR-145 | Master | KPI | MKP-01..02 | Payment Type | kpi.js | master-kpi.js | TBD | Screen_Master_KPI rev 0.5 | Revised |
| TR-146 | Master | KPI | MKP-01..02 | Score | kpi.js | master-kpi.js | ielp.CRITERIA_SCORE_DETAIL.SCORE | Screen_Master_KPI rev 0.5 | TBD |
| TR-147 | Master | KPI | MKP-01..02 | KPI item columns (values) | kpi.js | master-kpi.js | ielp.CRITERIA_SCORE_DETAIL.CRITERIA_VALUE | Screen_Master_KPI rev 0.5 | TBD |
| TR-148 | Master | KPI | MKP-01..02 | Score grade ranges | kpi.js | master-kpi.js | ielp.MS_KPI_PERCENTAGE.VALUE | Screen_Master_KPI rev 0.5 | TBD |
| TR-149 | Master | KPI | MKP-01..02 | Order Sharing % | kpi.js | master-kpi.js | ielp.CRITERIA_LAST_ORDER.ORDER_SHARING | Screen_Master_KPI rev 0.5 | Revised |
| TR-150 | Master | KPI | MKP-01..02 | Daily Trip / Trips per day | kpi.js | master-kpi.js | TBD | Screen_Master_KPI rev 0.5 | Revised |
| TR-151 | Master | KPI | MKP-01..02 | UoM | kpi.js | master-kpi.js | TBD | Screen_Master_KPI rev 0.5 | TBD |
| TR-152 | Master | KPI | MKP-01..02 | Created / Changed (KPI item) | kpi.js | master-kpi.js | ielp.MS_KPI.CREATED_BY | Screen_Master_KPI rev 0.5 | Revised |
| TR-153 | Master | Location Code | MLC-01..03 | Location Name | location.js | master-location.js | ielp.MS_LOCATION.LOCATION_NAME | Screen_Master_Location rev 0.3 | Revised |
| TR-154 | Master | Location Code | MLC-01..03 | Location Alias (Code) | location.js | master-location.js | ielp.MS_LOCATION.LOCATION_ALIAS | Screen_Master_Location rev 0.3 | Revised |
| TR-155 | Master | Location Code | MLC-01..03 | Location Address Google Map | location.js | master-location.js | ielp.MS_LOCATION.LOCATION_ADDRESS_ORI | Screen_Master_Location rev 0.3 | Revised |
| TR-156 | Master | Location Code | MLC-01..03 | Physical Location Address | location.js | master-location.js | ielp.MS_LOCATION.LOCATION_ADRESS | Screen_Master_Location rev 0.3 | Revised |
| TR-157 | Master | Location Code | MLC-01..03 | Location Sub Area | location.js | master-location.js | ielp.MS_LOCATION.LOCATION_SUB | Screen_Master_Location rev 0.3 | TBD |
| TR-158 | Master | Location Code | MLC-01..03 | Radius (m) | location.js | master-location.js | ielp.MS_LOCATION.RADIUS | Screen_Master_Location rev 0.3 | Revised |
| TR-159 | Master | Location Code | MLC-01..03 | Auto Finish Order | location.js | master-location.js | ielp.MS_LOCATION.AUTO_FINISH | Screen_Master_Location rev 0.3 | Revised |
| TR-160 | Master | Location Code | MLC-01..03 | Auto Generate Cycle | location.js | master-location.js | ielp.MS_LOCATION.AUTO_CYCLE | Screen_Master_Location rev 0.3 | Revised |
| TR-161 | Master | Location Code | MLC-01..03 | Cycle To Area | location.js | master-location.js | ielp.MS_LOCATION.CYCLE_LOC_TO | Screen_Master_Location rev 0.3 | Revised |
| TR-162 | Master | Location Code | MLC-01..03 | Latitude | location.js | master-location.js | ielp.MS_LOCATION.LOCATION_LATITUDE | Screen_Master_Location rev 0.3 | Revised |
| TR-163 | Master | Location Code | MLC-01..03 | Longitude | location.js | master-location.js | ielp.MS_LOCATION.LOCATION_LANGITUDE | Screen_Master_Location rev 0.3 | Revised |
| TR-164 | Master | Location Code | MLC-01..03 | Coordinates (list) | location.js | master-location.js | ielp.MS_LOCATION.LOCATION_LATITUDE | Screen_Master_Location rev 0.3 | Revised |
| TR-165 | Master | Location Code | MLC-01..03 | Status Active / Inactive | location.js | master-location.js | ielp.MS_LOCATION.IS_DELETE | Screen_Master_Location rev 0.3 | Revised |
| TR-166 | Master | Location Code | MLC-01..03 | Created By / At | location.js | master-location.js | ielp.MS_LOCATION.CREATED_BY | Screen_Master_Location rev 0.3 | Revised |
| TR-167 | Master | Location Code | MLC-01..03 | Updated By / At | location.js | master-location.js | ielp.MS_LOCATION.UPDATED_BY | Screen_Master_Location rev 0.3 | Revised |
| TR-168 | Master | Location Code | MLC-01..03 | (key) Location ID | location.js | master-location.js | ielp.MS_LOCATION.LOCATION_ID | Screen_Master_Location rev 0.3 | TBD |
| TR-169 | Master | Location Code | MLC-01..03 | (system) App ID | location.js | master-location.js | ielp.MS_LOCATION.APP_ID | Screen_Master_Location rev 0.3 | TBD |
| TR-170 | Master | Mileage | MML-01..04 | From | mileage.js | master-mileage.js | ielp.MS_LOCATION.LOCATION_ALIAS | Screen_Master_Mileage rev 0.7 | Revised |
| TR-171 | Master | Mileage | MML-01..04 | To | mileage.js | master-mileage.js | ielp.MS_LOCATION.LOCATION_ALIAS | Screen_Master_Mileage rev 0.7 | Revised |
| TR-172 | Master | Mileage | MML-01..04 | From Code (list) | mileage.js | master-mileage.js | ielp.TB_M_MILEAGE.FROM_CODE | Screen_Master_Mileage rev 0.7 | Revised |
| TR-173 | Master | Mileage | MML-01..04 | To Code (list) | mileage.js | master-mileage.js | ielp.TB_M_MILEAGE.TO_CODE | Screen_Master_Mileage rev 0.7 | Revised |
| TR-174 | Master | Mileage | MML-01..04 | From name (stored) | mileage.js | master-mileage.js | ielp.TB_M_MILEAGE.LOC_NAME_FROM | Screen_Master_Mileage rev 0.7 | Revised |
| TR-175 | Master | Mileage | MML-01..04 | To name (stored) | mileage.js | master-mileage.js | ielp.TB_M_MILEAGE.LOC_NAME_TO | Screen_Master_Mileage rev 0.7 | Revised |
| TR-176 | Master | Mileage | MML-01..04 | Mileage (Km) | mileage.js | master-mileage.js | ielp.TB_M_MILEAGE.MILEAGE | Screen_Master_Mileage rev 0.7 | Revised |
| TR-177 | Master | Mileage | MML-01..04 | Created Date | mileage.js | master-mileage.js | ielp.TB_M_MILEAGE.CREATED_DT | Screen_Master_Mileage rev 0.7 | Revised |
| TR-178 | Master | Mileage | MML-01..04 | Created By | mileage.js | master-mileage.js | ielp.TB_M_MILEAGE.CREATED_BY | Screen_Master_Mileage rev 0.7 | Revised |
| TR-179 | Master | Mileage | MML-01..04 | Change Date | mileage.js | master-mileage.js | ielp.TB_M_MILEAGE.CHANGED_DT | Screen_Master_Mileage rev 0.7 | Revised |
| TR-180 | Master | Mileage | MML-01..04 | Changed By | mileage.js | master-mileage.js | ielp.TB_M_MILEAGE.CHANGED_BY | Screen_Master_Mileage rev 0.7 | Revised |
| TR-181 | Master | Mileage | MML-01..04 | Status / delete | mileage.js | master-mileage.js | ielp.TB_M_MILEAGE.IS_DELETE | Screen_Master_Mileage rev 0.7 | Revised |
| TR-182 | Master | Price | MPR-01 | Periode | price.js | master-price.js | ielp.MS_ROUTE_PRICE.VALID_DT_FROM | Screen_Master_Price rev 0.3 | TBD |
| TR-183 | Master | Price | MPR-01 | Trucking Company | price.js | master-price.js | ielp.MS_ROUTE_PRICE.COMPANY_CODE | Screen_Master_Price rev 0.3 | Revised |
| TR-184 | Master | Price | MPR-01 | Vehicle Type | price.js | master-price.js | ielp.MS_ROUTE_PRICE.ROUTE_PRICE_SIZE | Screen_Master_Price rev 0.3 | TBD |
| TR-185 | Master | Price | MPR-01 | Component (FIX / KM) | price.js | master-price.js | TBD | Screen_Master_Price rev 0.3 | Revised |
| TR-186 | Master | Price | MPR-01 | Price | price.js | master-price.js | ielp.MS_ROUTE_PRICE.ROUTE_PRICE_VALUE | Screen_Master_Price rev 0.3 | Revised |
| TR-187 | Master | Price | MPR-01 | Effective Start | price.js | master-price.js | ielp.MS_ROUTE_PRICE.VALID_DT_FROM | Screen_Master_Price rev 0.3 | Revised |
| TR-188 | Master | Price | MPR-01 | Effective End | price.js | master-price.js | ielp.MS_ROUTE_PRICE.VALID_DT_TO | Screen_Master_Price rev 0.3 | Revised |
| TR-189 | Master | Price | MPR-01 | Source | price.js | master-price.js | ielp.MS_ROUTE_PRICE.ROUTE_PRICE_DESC | Screen_Master_Price rev 0.3 | TBD |
| TR-190 | Master | Price | MPR-01 | Created By | price.js | master-price.js | ielp.MS_ROUTE_PRICE.CREATED_BY | Screen_Master_Price rev 0.3 | Revised |
| TR-191 | Master | Price | MPR-01 | Created Dt | price.js | master-price.js | ielp.MS_ROUTE_PRICE.CREATED_DATE | Screen_Master_Price rev 0.3 | Revised |
| TR-192 | Master | Price | MPR-01 | Changed By | price.js | master-price.js | ielp.MS_ROUTE_PRICE.UPDATED_BY | Screen_Master_Price rev 0.3 | Revised |
| TR-193 | Master | Price | MPR-01 | Changed Dt | price.js | master-price.js | ielp.MS_ROUTE_PRICE.UPDATED_DATE | Screen_Master_Price rev 0.3 | Revised |
| TR-194 | Master | Price | MPR-01 | (interface) eCatalogue price | price.js | master-price.js | ielp.ITG_ECAT.PRICE_AMOUNT | Screen_Master_Price rev 0.3 | TBD |
| TR-195 | Master | Priority | MPY-01..02 | From / To (list) | priority.js | master-priority.js | ielp.MS_LOCATION.LOCATION_ALIAS | Screen_Master_Priority rev 0.3 | Revised |
| TR-196 | Master | Priority | MPY-01..02 | From / To Description | priority.js | master-priority.js | ielp.MS_LOCATION.LOCATION_NAME | Screen_Master_Priority rev 0.3 | Revised |
| TR-197 | Master | Priority | MPY-01..02 | Mileage | priority.js | master-priority.js | ielp.TB_M_MILEAGE.MILEAGE | Screen_Master_Priority rev 0.3 | Revised |
| TR-198 | Master | Priority | MPY-01..02 | Priority | priority.js | master-priority.js | TBD | Screen_Master_Priority rev 0.3 | TBD |
| TR-199 | Master | Priority | MPY-01..02 | Created / Changed By / DT | priority.js | master-priority.js | TBD | Screen_Master_Priority rev 0.3 | TBD |
| TR-200 | Master | Priority | MPY-01..02 | (table) Route Priority Master | priority.js | master-priority.js | TBD | Screen_Master_Priority rev 0.3 | Missing |
| TR-201 | Master | Renban | MRB-01..02 | Plant | renban.js | master-renban.js | ielp.MS_RENBAN_TCPBR.PLANT_CD | Screen_Master_Renban rev 0.3 | Revised |
| TR-202 | Master | Renban | MRB-01..02 | Dest | renban.js | master-renban.js | ielp.MS_RENBAN_TCPBR.DEST_CD | Screen_Master_Renban rev 0.3 | Verified |
| TR-203 | Master | Renban | MRB-01..02 | Renban Code | renban.js | master-renban.js | ielp.MS_RENBAN_TCPBR.RENBAN_CD | Screen_Master_Renban rev 0.3 | Verified |
| TR-204 | Master | Renban | MRB-01..02 | Source | renban.js | master-renban.js | ielp.MS_RENBAN_TCPBR.SOURCE_LOCATION_ID | Screen_Master_Renban rev 0.3 | Revised |
| TR-205 | Master | Renban | MRB-01..02 | Created By | renban.js | master-renban.js | ielp.MS_RENBAN_TCPBR.CREATED_BY | Screen_Master_Renban rev 0.3 | Verified |
| TR-206 | Master | Renban | MRB-01..02 | Created Dt | renban.js | master-renban.js | ielp.MS_RENBAN_TCPBR.CREATED_DT | Screen_Master_Renban rev 0.3 | Verified |
| TR-207 | Master | Renban | MRB-01..02 | Changed By | renban.js | master-renban.js | ielp.MS_RENBAN_TCPBR.CHANGED_BY | Screen_Master_Renban rev 0.3 | Verified |
| TR-208 | Master | Renban | MRB-01..02 | Changed Dt | renban.js | master-renban.js | ielp.MS_RENBAN_TCPBR.CHANGED_DT | Screen_Master_Renban rev 0.3 | Verified |
| TR-209 | Master | Renban | MRB-01..02 | (concurrency) Version | renban.js | master-renban.js | ielp.MS_RENBAN_TCPBR.VERSION | Screen_Master_Renban rev 0.3 | Verified |
| TR-210 | Master | Route Percentage | MRP-01..02 | Route Code | route-percentage.js | master-route-percentage.js | ielp.MS_ROUTE_DETAIL.ROUTE_CODE | Screen_Master_Route_Percentage rev 0.3 | Revised |
| TR-211 | Master | Route Percentage | MRP-01..02 | Route Description | route-percentage.js | master-route-percentage.js | ielp.MS_ROUTE_DETAIL.ROUTE_DESCR | Screen_Master_Route_Percentage rev 0.3 | Revised |
| TR-212 | Master | Route Percentage | MRP-01..02 | Percentage | route-percentage.js | master-route-percentage.js | ielp.MS_ROUTE_HEADER.ROUTE_PERCENTAGE_VALUE | Screen_Master_Route_Percentage rev 0.3 | Revised |
| TR-213 | Master | Route Percentage | MRP-01..02 | Location Pick / stop | route-percentage.js | master-route-percentage.js | ielp.MS_LOCATION.LOCATION_ALIAS | Screen_Master_Route_Percentage rev 0.3 | Revised |
| TR-214 | Master | Route Percentage | MRP-01..02 | Location Name | route-percentage.js | master-route-percentage.js | ielp.MS_LOCATION.LOCATION_NAME | Screen_Master_Route_Percentage rev 0.3 | Revised |
| TR-215 | Master | Route Percentage | MRP-01..02 | Distance (Km) | route-percentage.js | master-route-percentage.js | ielp.MS_ROUTE_PERCENTAGE_HIST.DISTANCE | Screen_Master_Route_Percentage rev 0.3 | Revised |
| TR-216 | Master | Route Percentage | MRP-01..02 | Status (Deactivate) | route-percentage.js | master-route-percentage.js | ielp.MS_ROUTE_HEADER.IS_DELETE | Screen_Master_Route_Percentage rev 0.3 | Revised |
| TR-217 | Master | Route Percentage | MRP-01..02 | Created By | route-percentage.js | master-route-percentage.js | ielp.MS_ROUTE_HEADER.CREATED_BY | Screen_Master_Route_Percentage rev 0.3 | Revised |
| TR-218 | Master | Route Percentage | MRP-01..02 | Changed Dt | route-percentage.js | master-route-percentage.js | ielp.MS_ROUTE_HEADER.UPDATED_DATE | Screen_Master_Route_Percentage rev 0.3 | Revised |
| TR-219 | Master | Route Percentage | MRP-01..02 | Ordered stops (sequence, leg km) | route-percentage.js | master-route-percentage.js | TBD | Screen_Master_Route_Percentage rev 0.3 | Revised |
| TR-220 | Master | Route Percentage | MRP-01..02 | Sync flag | route-percentage.js | master-route-percentage.js | ielp.MS_ROUTE_HEADER.IS_SYNC | Screen_Master_Route_Percentage rev 0.3 | TBD |
| TR-221 | Master | Trucking Company | MTC-01..03 | Vendor Name | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.COMPANY_NAME | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-222 | Master | Trucking Company | MTC-01..03 | Vendor Code | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.COMPANY_CODE | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-223 | Master | Trucking Company | MTC-01..03 | SAP Vendor Code | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.SAP_COMPANY_CODE | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-224 | Master | Trucking Company | MTC-01..03 | Service Type | master.js | master-trucking.js | TBD | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-225 | Master | Trucking Company | MTC-01..03 | NPWP | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.NPWP | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-226 | Master | Trucking Company | MTC-01..03 | Contact Name | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.CONTACT_NAME | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-227 | Master | Trucking Company | MTC-01..03 | E-Mail | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.EMAIL | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-228 | Master | Trucking Company | MTC-01..03 | Phone | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.PHONE | Screen_Master_Trucking_Company rev 0.5 | Verified |
| TR-229 | Master | Trucking Company | MTC-01..03 | Mobile Phone | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.MOBILE_PHONE | Screen_Master_Trucking_Company rev 0.5 | Verified |
| TR-230 | Master | Trucking Company | MTC-01..03 | Address | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.COMPANY_ADDRESS | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-231 | Master | Trucking Company | MTC-01..03 | Deletion | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.IS_DELETE | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-232 | Master | Trucking Company | MTC-01..03 | Created By / Created Date | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.CREATED_BY | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-233 | Master | Trucking Company | MTC-01..03 | Updated By / Updated Date | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.UPDATED_BY | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-234 | Master | Trucking Company | MTC-01..03 | (key) Company ID | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.COMPANY_ID | Screen_Master_Trucking_Company rev 0.5 | TBD |
| TR-235 | Master | Trucking Company | MTC-01..03 | (system) App ID | master.js | master-trucking.js | ielp.MS_TRUCKING_COMPANY.APP_ID | Screen_Master_Trucking_Company rev 0.5 | TBD |
| TR-236 | Master | Trucking Company | MTC-01..03 | (concurrency) Version | master.js | master-trucking.js | TBD | Screen_Master_Trucking_Company rev 0.5 | Revised |
| TR-237 | Monthly | PO Approval | POA-01 | PO Number | monthly.js | monthly-workflow.js | ielp.PO_DETAIL.PO_NUMBER | Screen_PO_Approval rev 0.4 | Revised |
| TR-238 | Monthly | PO Approval | POA-01 | Production Month | monthly.js | monthly-workflow.js | ielp.PO_HEADER.PO_PERIODE | Screen_PO_Approval rev 0.4 | Revised |
| TR-239 | Monthly | PO Approval | POA-01 | PR Number | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.PR_NO_DET | Screen_PO_Approval rev 0.4 | Revised |
| TR-240 | Monthly | PO Approval | POA-01 | PO Status | monthly.js | monthly-workflow.js | ielp.PO_HEADER.APPROVAL_STS | Screen_PO_Approval rev 0.4 | TBD |
| TR-241 | Monthly | PO Approval | POA-01 | Auto Approve At | monthly.js | monthly-workflow.js | ielp.PO_APPROVAL_EST.APPROVAL_LIMIT | Screen_PO_Approval rev 0.4 | TBD |
| TR-242 | Monthly | PO Approval | POA-01 | Approved By | monthly.js | monthly-workflow.js | ielp.PO_APPROVAL.APPROVAL_BY | Screen_PO_Approval rev 0.4 | Revised |
| TR-243 | Monthly | PO Approval | POA-01 | PO date | monthly.js | monthly-workflow.js | ielp.PO_HEADER.CREATED_DATE | Screen_PO_Approval rev 0.4 | Revised |
| TR-244 | Monthly | PO Approval | POA-01 | Trucking Code / Name | monthly.js | monthly-workflow.js | ielp.PO_DETAIL.COMPANY_ID | Screen_PO_Approval rev 0.4 | Revised |
| TR-245 | Monthly | PO Approval | POA-01 | Order Sharing | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.TOTAL_ORDER_SHARING | Screen_PO_Approval rev 0.4 | Revised |
| TR-246 | Monthly | PO Approval | POA-01 | Route lines | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_ROUTE.ROUTE_HEADER_ID | Screen_PO_Approval rev 0.4 | Revised |
| TR-247 | Monthly | PO Approval | POA-01 | Approval History | monthly.js | monthly-workflow.js | TBD | Screen_PO_Approval rev 0.4 | TBD |
| TR-248 | Monthly | PO Inquiry | POI-01 | PO Number | monthly.js | monthly-workflow.js | ielp.PO_DETAIL.PO_NUMBER | Screen_PO_Inquiry rev 0.4 | Revised |
| TR-249 | Monthly | PO Inquiry | POI-01 | Production Month | monthly.js | monthly-workflow.js | ielp.PO_HEADER.PO_PERIODE | Screen_PO_Inquiry rev 0.4 | Revised |
| TR-250 | Monthly | PO Inquiry | POI-01 | PR Number | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.PR_NO_DET | Screen_PO_Inquiry rev 0.4 | Revised |
| TR-251 | Monthly | PO Inquiry | POI-01 | PO Status | monthly.js | monthly-workflow.js | ielp.PO_HEADER.APPROVAL_STS | Screen_PO_Inquiry rev 0.4 | TBD |
| TR-252 | Monthly | PO Inquiry | POI-01 | Auto Approve At | monthly.js | monthly-workflow.js | ielp.PO_APPROVAL_EST.APPROVAL_LIMIT | Screen_PO_Inquiry rev 0.4 | TBD |
| TR-253 | Monthly | PO Inquiry | POI-01 | Approved By | monthly.js | monthly-workflow.js | ielp.PO_APPROVAL.APPROVAL_BY | Screen_PO_Inquiry rev 0.4 | Revised |
| TR-254 | Monthly | PO Inquiry | POI-01 | PO date | monthly.js | monthly-workflow.js | ielp.PO_HEADER.CREATED_DATE | Screen_PO_Inquiry rev 0.4 | Revised |
| TR-255 | Monthly | PO Inquiry | POI-01 | Trucking Code / Name | monthly.js | monthly-workflow.js | ielp.PO_DETAIL.COMPANY_ID | Screen_PO_Inquiry rev 0.4 | Revised |
| TR-256 | Monthly | PO Inquiry | POI-01 | Order Sharing | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.TOTAL_ORDER_SHARING | Screen_PO_Inquiry rev 0.4 | Revised |
| TR-257 | Monthly | PO Inquiry | POI-01 | Route lines | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_ROUTE.ROUTE_HEADER_ID | Screen_PO_Inquiry rev 0.4 | Revised |
| TR-258 | Monthly | PO Inquiry | POI-01 | Approval History | monthly.js | monthly-workflow.js | TBD | Screen_PO_Inquiry rev 0.4 | TBD |
| TR-259 | Monthly | PR Approval | PRA-01..02 | Production Month / PR seq | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_HEADER.CRITERIA_PERIODE | Screen_PR_Approval rev 0.4 | Revised |
| TR-260 | Monthly | PR Approval | PRA-01..02 | PR Number (per trucking company) | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.PR_NO_DET | Screen_PR_Approval rev 0.4 | Revised |
| TR-261 | Monthly | PR Approval | PRA-01..02 | Trucking Code / Name | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.COMPANY_ID | Screen_PR_Approval rev 0.4 | Revised |
| TR-262 | Monthly | PR Approval | PRA-01..02 | Order Sharing % | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.TOTAL_ORDER_SHARING | Screen_PR_Approval rev 0.4 | Revised |
| TR-263 | Monthly | PR Approval | PRA-01..02 | Order Sharing Qty | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.TOTAL_TRIP | Screen_PR_Approval rev 0.4 | Revised |
| TR-264 | Monthly | PR Approval | PRA-01..02 | Order Sharing Total Price | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.TOTAL_PRICE | Screen_PR_Approval rev 0.4 | Revised |
| TR-265 | Monthly | PR Approval | PRA-01..02 | Approval status per level | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_APPROVAL.APPROVAL_STS | Screen_PR_Approval rev 0.4 | TBD |
| TR-266 | Monthly | PR Approval | PRA-01..02 | Route | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_ROUTE.ROUTE_HEADER_ID | Screen_PR_Approval rev 0.4 | Revised |
| TR-267 | Monthly | PR Approval | PRA-01..02 | Route Percentage | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_ROUTE.ROUTE_PERCENTAGE_VALUE | Screen_PR_Approval rev 0.4 | Revised |
| TR-268 | Monthly | PR Approval | PRA-01..02 | Qty 20 / 40 | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_ROUTE.ROUTE_QTY_20 | Screen_PR_Approval rev 0.4 | Revised |
| TR-269 | Monthly | PR Approval | PRA-01..02 | Price 20 / 40 | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_ROUTE.PRICE_20 | Screen_PR_Approval rev 0.4 | Revised |
| TR-270 | Monthly | PR Approval | PRA-01..02 | Approval History | monthly.js | monthly-workflow.js | TBD | Screen_PR_Approval rev 0.4 | TBD |
| TR-271 | Monthly | PR Approval | PRA-01..02 | Current PIC / PR date | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.CREATED_BY | Screen_PR_Approval rev 0.4 | Revised |
| TR-272 | Monthly | PR Approval | PRA-01..02 | Approve / Reject | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_APPROVAL.APPROVAL_BY | Screen_PR_Approval rev 0.4 | Revised |
| TR-273 | Monthly | PR Approval | PRA-01..02 | PR status | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.APPROVAL_STS | Screen_PR_Approval rev 0.4 | TBD |
| TR-274 | Monthly | PR Creation | PRC-01..02 | PR Creation Type | pr-creation.js | pr-creation-rules.js, pr-sources.js | ielp.CRITERIA_SCORE_HEADER.BUSINESS_TYPE | Screen_PR_Creation rev 0.4 | TBD |
| TR-275 | Monthly | PR Creation | PRC-01..02 | Operational Month | pr-creation.js | pr-creation-rules.js, pr-sources.js | ielp.CRITERIA_SCORE_HEADER.CRITERIA_PERIODE | Screen_PR_Creation rev 0.4 | Revised |
| TR-276 | Monthly | PR Creation | PRC-01..02 | Trucking Company | pr-creation.js | pr-creation-rules.js, pr-sources.js | ielp.MS_TRUCKING_COMPANY.COMPANY_CODE | Screen_PR_Creation rev 0.4 | Revised |
| TR-277 | Monthly | PR Creation | PRC-01..02 | Mileage / Fixed cost price | pr-creation.js | pr-creation-rules.js, pr-sources.js | ielp.MS_ROUTE_PRICE.ROUTE_PRICE_VALUE | Screen_PR_Creation rev 0.4 | Revised |
| TR-278 | Monthly | PR Creation | PRC-01..02 | Working Days | pr-creation.js | pr-creation-rules.js, pr-sources.js | ielp.TB_M_WORKING_CALENDAR.WORKING_FLAG | Screen_PR_Creation rev 0.4 | Revised |
| TR-279 | Monthly | PR Creation | PRC-01..02 | Route | pr-creation.js | pr-creation-rules.js, pr-sources.js | ielp.MS_ROUTE_DETAIL.ROUTE_CODE | Screen_PR_Creation rev 0.4 | Revised |
| TR-280 | Monthly | PR Creation | PRC-01..02 | Route Percentage | pr-creation.js | pr-creation-rules.js, pr-sources.js | ielp.MS_ROUTE_HEADER.ROUTE_PERCENTAGE_VALUE | Screen_PR_Creation rev 0.4 | Revised |
| TR-281 | Monthly | PR Creation | PRC-01..02 | Distance (Km) | pr-creation.js | pr-creation-rules.js, pr-sources.js | TBD | Screen_PR_Creation rev 0.4 | Revised |
| TR-282 | Monthly | PR Creation | PRC-01..02 | PR per company | pr-creation.js | pr-creation-rules.js, pr-sources.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.PR_NO_DET | Screen_PR_Creation rev 0.4 | Revised |
| TR-283 | Monthly | PR Creation | PRC-01..02 | PR route lines | pr-creation.js | pr-creation-rules.js, pr-sources.js | ielp.CRITERIA_SCORE_DETAIL_ROUTE.TOTAL_PRICE_ALL | Screen_PR_Creation rev 0.4 | Revised |
| TR-284 | Monthly | PR Creation | PRC-01..02 | PR approval levels | pr-creation.js | pr-creation-rules.js, pr-sources.js | ielp.CRITERIA_SCORE_APPROVAL.APPROVAL_CLASS | Screen_PR_Creation rev 0.4 | Revised |
| TR-285 | Monthly | PR Creation | PRC-01..02 | Fixed cost (by resource) lines | pr-creation.js | pr-creation-rules.js, pr-sources.js | ielp.TB_R_PR_DAILY.TOTAL_PRICE | Screen_PR_Creation rev 0.4 | TBD |
| TR-286 | Monthly | PR Inquiry | PRI-01 | Production Month / PR seq | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_HEADER.CRITERIA_PERIODE | Screen_PR_Inquiry rev 0.4 | Revised |
| TR-287 | Monthly | PR Inquiry | PRI-01 | PR Number (per trucking company) | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.PR_NO_DET | Screen_PR_Inquiry rev 0.4 | Revised |
| TR-288 | Monthly | PR Inquiry | PRI-01 | Trucking Code / Name | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.COMPANY_ID | Screen_PR_Inquiry rev 0.4 | Revised |
| TR-289 | Monthly | PR Inquiry | PRI-01 | Order Sharing % | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.TOTAL_ORDER_SHARING | Screen_PR_Inquiry rev 0.4 | Revised |
| TR-290 | Monthly | PR Inquiry | PRI-01 | Order Sharing Qty | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.TOTAL_TRIP | Screen_PR_Inquiry rev 0.4 | Revised |
| TR-291 | Monthly | PR Inquiry | PRI-01 | Order Sharing Total Price | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.TOTAL_PRICE | Screen_PR_Inquiry rev 0.4 | Revised |
| TR-292 | Monthly | PR Inquiry | PRI-01 | Approval status per level | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_APPROVAL.APPROVAL_STS | Screen_PR_Inquiry rev 0.4 | TBD |
| TR-293 | Monthly | PR Inquiry | PRI-01 | Route | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_ROUTE.ROUTE_HEADER_ID | Screen_PR_Inquiry rev 0.4 | Revised |
| TR-294 | Monthly | PR Inquiry | PRI-01 | Route Percentage | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_ROUTE.ROUTE_PERCENTAGE_VALUE | Screen_PR_Inquiry rev 0.4 | Revised |
| TR-295 | Monthly | PR Inquiry | PRI-01 | Qty 20 / 40 | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_ROUTE.ROUTE_QTY_20 | Screen_PR_Inquiry rev 0.4 | Revised |
| TR-296 | Monthly | PR Inquiry | PRI-01 | Price 20 / 40 | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_ROUTE.PRICE_20 | Screen_PR_Inquiry rev 0.4 | Revised |
| TR-297 | Monthly | PR Inquiry | PRI-01 | Approval History | monthly.js | monthly-workflow.js | TBD | Screen_PR_Inquiry rev 0.4 | TBD |
| TR-298 | Monthly | PR Inquiry | PRI-01 | Current PIC / PR date | monthly.js | monthly-workflow.js | ielp.CRITERIA_SCORE_DETAIL_FINAL.CREATED_BY | Screen_PR_Inquiry rev 0.4 | Revised |
| TR-299 | Daily | Planning Truck Assignment | TA-01..05 | Order list | truck-assign.js | workflow.js | ielp.ORDER_CYCLE.ORDER_NO | Screen_Planning_Truck_Assignment rev 0.4 | Revised |
| TR-300 | Daily | Planning Truck Assignment | TA-01..05 | Delivery Date | truck-assign.js | workflow.js | ielp.ORDER_CYCLE.ORDER_DATE | Screen_Planning_Truck_Assignment rev 0.4 | Revised |
| TR-301 | Daily | Planning Truck Assignment | TA-01..05 | Trucking Company | truck-assign.js | workflow.js | ielp.ORDER_CYCLE.COMPANY_ID | Screen_Planning_Truck_Assignment rev 0.4 | Revised |
| TR-302 | Daily | Planning Truck Assignment | TA-01..05 | Origin / Destination | truck-assign.js | workflow.js | ielp.ORDER_CYCLE.FROM_LOC | Screen_Planning_Truck_Assignment rev 0.4 | Revised |
| TR-303 | Daily | Planning Truck Assignment | TA-01..05 | Truck Type | truck-assign.js | workflow.js | ielp.ORDER_CYCLE.TRUCK_TYPE | Screen_Planning_Truck_Assignment rev 0.4 | Revised |
| TR-304 | Daily | Planning Truck Assignment | TA-01..05 | Truck picker | truck-assign.js | workflow.js | ielp.MS_TRUCK_REGISTRATION.LICENSE_PLATE | Screen_Planning_Truck_Assignment rev 0.4 | Revised |
| TR-305 | Daily | Planning Truck Assignment | TA-01..05 | Assigned plate | truck-assign.js | workflow.js | ielp.DTP_2_DETAIL.LICENSE_PLATE | Screen_Planning_Truck_Assignment rev 0.4 | Revised |
| TR-306 | Daily | Planning Truck Assignment | TA-01..05 | Assigned driver | truck-assign.js | workflow.js | ielp.DTP_2_DETAIL.DRIVER_ID | Screen_Planning_Truck_Assignment rev 0.4 | Revised |
| TR-307 | Daily | Planning Truck Assignment | TA-01..05 | Audit trail | truck-assign.js | workflow.js | ielp.ORDER_TRUCK_H.LICENSE_PLATE | Screen_Planning_Truck_Assignment rev 0.4 | Revised |
| TR-308 | Daily | Planning Truck Assignment | TA-01..05 | LP status (accept / reject) | truck-assign.js | workflow.js | TBD | Screen_Planning_Truck_Assignment rev 0.4 | Revised |
| TR-309 | Daily | Planning Truck Assignment | TA-01..05 | Reject Reason | truck-assign.js | workflow.js | TBD | Screen_Planning_Truck_Assignment rev 0.4 | Revised |
| TR-310 | Daily | Planning Truck Assignment | TA-01..05 | Seal No | truck-assign.js | workflow.js | TBD | Screen_Planning_Truck_Assignment rev 0.4 | TBD |
| TR-311 | SA | SA Approval | SA-01..03 | Order Number / Date | sa.js | sa-rules.js | ielp.ORDER_CYCLE.ORDER_NO | Screen_SA_Approval rev 0.5 | Revised |
| TR-312 | SA | SA Approval | SA-01..03 | DTP Type | sa.js | sa-rules.js | ielp.DTP_HEADER.DTP_TYPE | Screen_SA_Approval rev 0.5 | TBD |
| TR-313 | SA | SA Approval | SA-01..03 | Truck Company | sa.js | sa-rules.js | ielp.MS_TRUCKING_COMPANY.COMPANY_NAME | Screen_SA_Approval rev 0.5 | Revised |
| TR-314 | SA | SA Approval | SA-01..03 | PO Number | sa.js | sa-rules.js | ielp.SA_DETAIL.PO_NUMBER | Screen_SA_Approval rev 0.5 | Revised |
| TR-315 | SA | SA Approval | SA-01..03 | PO Validity / Currency | sa.js | sa-rules.js | TBD | Screen_SA_Approval rev 0.5 | TBD |
| TR-316 | SA | SA Approval | SA-01..03 | CTR Size | sa.js | sa-rules.js | ielp.SA_DETAIL.CTR_SIZE | Screen_SA_Approval rev 0.5 | Revised |
| TR-317 | SA | SA Approval | SA-01..03 | Total KM | sa.js | sa-rules.js | ielp.TB_M_MILEAGE.MILEAGE | Screen_SA_Approval rev 0.5 | Revised |
| TR-318 | SA | SA Approval | SA-01..03 | Rate / KM | sa.js | sa-rules.js | ielp.MS_ROUTE_PRICE.ROUTE_PRICE_VALUE | Screen_SA_Approval rev 0.5 | TBD |
| TR-319 | SA | SA Approval | SA-01..03 | Price (cost) | sa.js | sa-rules.js | ielp.SA_DETAIL.TOTAL_PRICE | Screen_SA_Approval rev 0.5 | Revised |
| TR-320 | SA | SA Approval | SA-01..03 | Order Route | sa.js | sa-rules.js | ielp.SA_DETAIL.ORDER_ROUTE | Screen_SA_Approval rev 0.5 | Revised |
| TR-321 | SA | SA Approval | SA-01..03 | Cycle route | sa.js | sa-rules.js | ielp.ORDER_CYCLE.FROM_LOC | Screen_SA_Approval rev 0.5 | Revised |
| TR-322 | SA | SA Approval | SA-01..03 | SA number | sa.js | sa-rules.js | ielp.SA_DETAIL.SA_CODE | Screen_SA_Approval rev 0.5 | Revised |
| TR-323 | SA | SA Approval | SA-01..03 | SA header | sa.js | sa-rules.js | ielp.SA_HEADER.SA_HEADER_ID | Screen_SA_Approval rev 0.5 | Revised |
| TR-324 | SA | SA Approval | SA-01..03 | Approved by / date | sa.js | sa-rules.js | ielp.SA_DETAIL.APPROVED_BY | Screen_SA_Approval rev 0.5 | Revised |
| TR-325 | SA | SA Approval | SA-01..03 | Order flag | sa.js | sa-rules.js | ielp.ORDER_CYCLE.SA_CODE | Screen_SA_Approval rev 0.5 | Revised |
| TR-326 | SA | SA Approval | SA-01..03 | DTP flag | sa.js | sa-rules.js | ielp.DTP_2_DETAIL.IS_SA | Screen_SA_Approval rev 0.5 | Revised |
| TR-327 | SA | SA Approval | SA-01..03 | Production Month (monthly) | sa.js | sa-rules.js | ielp.CRITERIA_SCORE_HEADER.CRITERIA_PERIODE | Screen_SA_Approval rev 0.5 | Revised |
| TR-328 | SA | SA Approval | SA-01..03 | PO status (monthly) | sa.js | sa-rules.js | ielp.PO_HEADER.APPROVAL_STS | Screen_SA_Approval rev 0.5 | TBD |
| TR-329 | SA | SA Approval | SA-01..03 | SA type | sa.js | sa-rules.js | ielp.SA_HEADER.SA_TYPE | Screen_SA_Approval rev 0.5 | TBD |
| TR-330 | SA | SA Monitoring | SA-04..07 | SA No | sa-monitoring.js | sa-pas-rules.js | ielp.SA_DETAIL.SA_CODE | Screen_SA_Monitoring rev 0.6 | Revised |
| TR-331 | SA | SA Monitoring | SA-04..07 | SA Type | sa-monitoring.js | sa-pas-rules.js | ielp.SA_HEADER.SA_TYPE | Screen_SA_Monitoring rev 0.6 | TBD |
| TR-332 | SA | SA Monitoring | SA-04..07 | SA Det No | sa-monitoring.js | sa-pas-rules.js | ielp.SA_DETAIL.SA_DETAIL_ID | Screen_SA_Monitoring rev 0.6 | Revised |
| TR-333 | SA | SA Monitoring | SA-04..07 | Delivery No / Date | sa-monitoring.js | sa-pas-rules.js | ielp.SA_DETAIL.DTP_DET_ID | Screen_SA_Monitoring rev 0.6 | Revised |
| TR-334 | SA | SA Monitoring | SA-04..07 | Truck Company | sa-monitoring.js | sa-pas-rules.js | ielp.SA_HEADER.COMPANY_ID | Screen_SA_Monitoring rev 0.6 | Revised |
| TR-335 | SA | SA Monitoring | SA-04..07 | PAS PR / PO No / PR Date | sa-monitoring.js | sa-pas-rules.js | ielp.SA_DETAIL.PAS_PR_NUMBER | Screen_SA_Monitoring rev 0.6 | Revised |
| TR-336 | SA | SA Monitoring | SA-04..07 | Interface Status | sa-monitoring.js | sa-pas-rules.js | ielp.SA_DETAIL.PAS_STATUS | Screen_SA_Monitoring rev 0.6 | TBD |
| TR-337 | SA | SA Monitoring | SA-04..07 | Route Code | sa-monitoring.js | sa-pas-rules.js | ielp.SA_DETAIL.ROUTE_HEADER_ID | Screen_SA_Monitoring rev 0.6 | Revised |
| TR-338 | SA | SA Monitoring | SA-04..07 | Ctr Size | sa-monitoring.js | sa-pas-rules.js | ielp.SA_DETAIL.CTR_SIZE | Screen_SA_Monitoring rev 0.6 | Revised |
| TR-339 | SA | SA Monitoring | SA-04..07 | Total KM / Rate / Currency | sa-monitoring.js | sa-pas-rules.js | TBD | Screen_SA_Monitoring rev 0.6 | Revised |
| TR-340 | SA | SA Monitoring | SA-04..07 | Price | sa-monitoring.js | sa-pas-rules.js | ielp.SA_DETAIL.TOTAL_PRICE | Screen_SA_Monitoring rev 0.6 | Revised |
| TR-341 | SA | SA Monitoring | SA-04..07 | WBS % | sa-monitoring.js | sa-pas-rules.js | ielp.SA_WBS_PERCENTAGE.WBS_PERCENTAGE | Screen_SA_Monitoring rev 0.6 | Revised |
| TR-342 | SA | SA Monitoring | SA-04..07 | Approval Date | sa-monitoring.js | sa-pas-rules.js | ielp.SA_DETAIL.APPROVED_DATE | Screen_SA_Monitoring rev 0.6 | Revised |
| TR-343 | SA | SA Monitoring | SA-04..07 | Integration log | sa-monitoring.js | sa-pas-rules.js | ielp.LOG_ITGPAS.STS_CODE | Screen_SA_Monitoring rev 0.6 | TBD |
| TR-344 | Common | Menu / role | COM-01..02 | Menu tree / role access | index.html, master.html, monthly.html, app.js:510 | workflow.js canView, *-rules canCreate | see UISS | Screen_TCPBR_Menu_Authorization rev 0.1 (new) | Missing -> created |
| TR-345 | SA | SA Monitoring (interface) | SA-06, INT-04 | SA send / PAS feedback | sa-monitoring.js:189-217 | sa-pas-rules.js send / applyFeedback | see UISS | Batch_SA_PAS_Interface rev 0.1 (new) | Missing -> created |
| TR-346 | Daily | Planning Order (IPMS) | DTP-05, INT-05 | Load / Refresh from IPMS | dtp.js:60 pullIpms, :703 loadIpms | dtp-rules.js makeRecord | see UISS | Batch_IPMS_DTP_Interface rev 0.1 (new) | Missing -> created |

Status count: Missing 4, Missing (created) 3, Revised 251, TBD 76, Verified 12.
