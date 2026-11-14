# Master Priority

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): MPY-01..02  
Code: priority.js, master-priority.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_Master_Priority](UISS_Screen_Master_Priority.xlsx) | screen | 0.3 (14-Nov-26) | [src/UISS_Screen_Master_Priority.json](src/UISS_Screen_Master_Priority.json) | 12 |

Rules / specification:

- [master-priority-rules.md](master-priority-rules.md)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.MS_LOCATION`, `ielp.TB_M_MILEAGE`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/uiss/scripts/build_all.py UISS_Screen_Master_Priority`
