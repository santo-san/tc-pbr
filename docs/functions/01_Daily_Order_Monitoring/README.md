# Daily Order Monitoring

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): DM-01..DM-11, DM-04  
Code: app.js, workflow.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_Daily_Order_Monitoring](uiss/UISS_Screen_Daily_Order_Monitoring.xlsx) | screen | 0.5 (14-Nov-26) | [uiss/src/UISS_Screen_Daily_Order_Monitoring.json](uiss/src/UISS_Screen_Daily_Order_Monitoring.json) | 9 |
| [UISS_Report_Download_Daily_Order_Monitoring](uiss/UISS_Report_Download_Daily_Order_Monitoring.xlsx) | report | 0.4 (14-Nov-26) | [uiss/src/UISS_Report_Download_Daily_Order_Monitoring.json](uiss/src/UISS_Report_Download_Daily_Order_Monitoring.json) | 3 |

Rules / specification (`uiss/`):

- [daily-monitoring-rules.md](uiss/daily-monitoring-rules.md)

ST test scripts (`test/`, generated with the uiss-test-script skill; spec JSON in `test/src/`):

- [ST-ELIPS_TBD_Daily_Order_Monitoring.xlsx](test/ST-ELIPS_TBD_Daily_Order_Monitoring.xlsx)
- [ST-ELIPS_TBD_Download_Daily_Order_Monitoring.xlsx](test/ST-ELIPS_TBD_Download_Daily_Order_Monitoring.xlsx)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.DTP_HEADER`, `ielp.LOG_ACTIVITY_ORDER`, `ielp.MS_DRIVER`, `ielp.MS_LOCATION`, `ielp.MS_TRUCKING_COMPANY`, `ielp.MS_TRUCK_REGISTRATION`, `ielp.ORDER_CYCLE`, `ielp.ORDER_FILES`, `ielp.ORDER_TRUCK_H`, `ielp.SA_DETAIL`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/functions/scripts/build_all.py UISS_Screen_Daily_Order_Monitoring UISS_Report_Download_Daily_Order_Monitoring`
