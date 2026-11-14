# Master KPI

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): MKP-01..02  
Code: kpi.js, master-kpi.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_Master_KPI](UISS_Screen_Master_KPI.xlsx) | screen | 0.4 (14-Nov-26) | [src/UISS_Screen_Master_KPI.json](src/UISS_Screen_Master_KPI.json) | 17 |

Rules / specification:

- [master-kpi-rules.md](master-kpi-rules.md)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.CRITERIA_LAST_ORDER`, `ielp.CRITERIA_SCORE_DETAIL`, `ielp.MS_KPI`, `ielp.MS_KPI_PERCENTAGE`, `ielp.MS_TRUCKING_COMPANY`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/uiss/scripts/build_all.py UISS_Screen_Master_KPI`
