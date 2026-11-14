# Planning Truck Assignment

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): TA-01..TA-05, DTP-16  
Code: truck-assign.js, workflow.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_Planning_Truck_Assignment](uiss/UISS_Screen_Planning_Truck_Assignment.xlsx) | screen | 0.4 (14-Nov-26) | [uiss/src/UISS_Screen_Planning_Truck_Assignment.json](uiss/src/UISS_Screen_Planning_Truck_Assignment.json) | 12 |
| [UISS_Batch_Driver_Order_Sync](uiss/UISS_Batch_Driver_Order_Sync.xlsx) | batch | 0.4 (14-Nov-26) | [uiss/src/UISS_Batch_Driver_Order_Sync.json](uiss/src/UISS_Batch_Driver_Order_Sync.json) | 0 |

Rules / specification (`uiss/`):

- [truck-assignment-spec.md](uiss/truck-assignment-spec.md)

ST test scripts (`test/`, generated with the uiss-test-script skill; spec JSON in `test/src/`):

- (none yet)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.DTP_2_DETAIL`, `ielp.MS_DRIVER`, `ielp.MS_LOCATION`, `ielp.MS_TRUCK_REGISTRATION`, `ielp.ORDER_CYCLE`, `ielp.ORDER_TRUCK_H`, `ielp.TB_M_DRIVER`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/functions/scripts/build_all.py UISS_Screen_Planning_Truck_Assignment UISS_Batch_Driver_Order_Sync`
