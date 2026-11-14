# SA Monitoring

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): SA-04..SA-07, INT-04  
Code: sa-monitoring.js, sa-pas-rules.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_SA_Monitoring](UISS_Screen_SA_Monitoring.xlsx) | screen | 0.6 (14-Nov-26) | [src/UISS_Screen_SA_Monitoring.json](src/UISS_Screen_SA_Monitoring.json) | 14 |
| [UISS_Batch_SA_PAS_Interface](UISS_Batch_SA_PAS_Interface.xlsx) | batch | 0.2 (14-Nov-26) | [src/UISS_Batch_SA_PAS_Interface.json](src/UISS_Batch_SA_PAS_Interface.json) | 0 |

Rules / specification:

- [sa-monitoring-spec.md](sa-monitoring-spec.md)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.LOG_ITGPAS`, `ielp.SA_DETAIL`, `ielp.SA_HEADER`, `ielp.SA_WBS_PERCENTAGE`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/uiss/scripts/build_all.py UISS_Screen_SA_Monitoring UISS_Batch_SA_PAS_Interface`
