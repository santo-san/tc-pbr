# Master Mileage

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): MML-01..04  
Code: mileage.js, master-mileage.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_Master_Mileage](uiss/UISS_Screen_Master_Mileage.xlsx) | screen | 0.7 (14-Nov-26) | [uiss/src/UISS_Screen_Master_Mileage.json](uiss/src/UISS_Screen_Master_Mileage.json) | 13 |
| [UISS_Batch_Master_Mileage_Upload](uiss/UISS_Batch_Master_Mileage_Upload.xlsx) | batch | 0.5 (14-Nov-26) | [uiss/src/UISS_Batch_Master_Mileage_Upload.json](uiss/src/UISS_Batch_Master_Mileage_Upload.json) | 0 |

Rules / specification (`uiss/`):

- [master-mileage-rules.md](uiss/master-mileage-rules.md)

ST test scripts (`test/`, generated with the uiss-test-script skill; spec JSON in `test/src/`):

- [ST-ELIPS_TBD_Master_Mileage_Route_Mileage.xlsx](test/ST-ELIPS_TBD_Master_Mileage_Route_Mileage.xlsx)
- [ST-ELIPS_TBD_Master_Mileage_Route_Mileage_Upload.xlsx](test/ST-ELIPS_TBD_Master_Mileage_Route_Mileage_Upload.xlsx)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.MS_LOCATION`, `ielp.TB_M_MILEAGE`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/functions/scripts/build_all.py UISS_Screen_Master_Mileage UISS_Batch_Master_Mileage_Upload`
