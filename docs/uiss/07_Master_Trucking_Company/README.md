# Master Trucking Company

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): MTC-01..03  
Code: master.js, master-trucking.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_Master_Trucking_Company](UISS_Screen_Master_Trucking_Company.xlsx) | screen | 0.4 (14-Nov-26) | [src/UISS_Screen_Master_Trucking_Company.json](src/UISS_Screen_Master_Trucking_Company.json) | 14 |

Rules / specification:

- [master-trucking-company-rules.md](master-trucking-company-rules.md)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.MS_TRUCKING_COMPANY`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/uiss/scripts/build_all.py UISS_Screen_Master_Trucking_Company`
