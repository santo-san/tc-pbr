# Master Location

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): MLC-01..03  
Code: location.js, master-location.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_Master_Location](UISS_Screen_Master_Location.xlsx) | screen | 0.2 (14-Nov-26) | [src/UISS_Screen_Master_Location.json](src/UISS_Screen_Master_Location.json) | 6 |

Rules / specification:

- [master-location-rules.md](master-location-rules.md)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.MS_LOCATION`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/uiss/scripts/build_all.py UISS_Screen_Master_Location`
