# Master Trucking Company

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): MTC-01..03  
Code: master.js, master-trucking.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_Master_Trucking_Company](uiss/UISS_Screen_Master_Trucking_Company.xlsx) | screen | 0.5 (14-Nov-26) | [uiss/src/UISS_Screen_Master_Trucking_Company.json](uiss/src/UISS_Screen_Master_Trucking_Company.json) | 14 |

Rules / specification (`uiss/`):

- [master-trucking-company-rules.md](uiss/master-trucking-company-rules.md)

ST test scripts (`test/`, generated with the uiss-test-script skill; spec JSON in `test/src/`):

- [ST-ELIPS_TBD_Master_Trucking_Company.xlsx](test/ST-ELIPS_TBD_Master_Trucking_Company.xlsx)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.MS_TRUCKING_COMPANY`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/functions/scripts/build_all.py UISS_Screen_Master_Trucking_Company`
