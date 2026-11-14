# Planning Order DTP

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): DTP-01..DTP-13, DTP-05 (IPMS)  
Code: dtp.js, dtp-rules.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_DTP_Creation](UISS_Screen_DTP_Creation.xlsx) | screen | 0.9 (14-Nov-26) | [src/UISS_Screen_DTP_Creation.json](src/UISS_Screen_DTP_Creation.json) | 34 |
| [UISS_Batch_DTP_Excel_Upload](UISS_Batch_DTP_Excel_Upload.xlsx) | batch | 0.5 (14-Nov-26) | [src/UISS_Batch_DTP_Excel_Upload.json](src/UISS_Batch_DTP_Excel_Upload.json) | 0 |
| [UISS_Batch_DTP_Queue_Processing](UISS_Batch_DTP_Queue_Processing.xlsx) | batch | 0.4 (14-Nov-26) | [src/UISS_Batch_DTP_Queue_Processing.json](src/UISS_Batch_DTP_Queue_Processing.json) | 0 |
| [UISS_Batch_DTP_Switching](UISS_Batch_DTP_Switching.xlsx) | batch | 0.5 (14-Nov-26) | [src/UISS_Batch_DTP_Switching.json](src/UISS_Batch_DTP_Switching.json) | 0 |
| [UISS_Batch_IPMS_DTP_Interface](UISS_Batch_IPMS_DTP_Interface.xlsx) | batch | 0.2 (14-Nov-26) | [src/UISS_Batch_IPMS_DTP_Interface.json](src/UISS_Batch_IPMS_DTP_Interface.json) | 0 |

Rules / specification:

- [dtp-creation-rules.md](dtp-creation-rules.md)
- [dtp-switching-spec.md](dtp-switching-spec.md)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.CRITERIA_LAST_ORDER`, `ielp.DTP_2_DETAIL`, `ielp.DTP_FILES`, `ielp.DTP_HEADER`, `ielp.LOG_ACTIVITY_ORDER`, `ielp.ORDER_CYCLE`, `ielp.ORDER_CYCLE_ROLLBACK_H`, `ielp.ORDER_TRUCK_H`, `ielp.TB_M_SYSTEM`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/uiss/scripts/build_all.py UISS_Screen_DTP_Creation UISS_Batch_DTP_Excel_Upload UISS_Batch_DTP_Queue_Processing UISS_Batch_DTP_Switching UISS_Batch_IPMS_DTP_Interface`
