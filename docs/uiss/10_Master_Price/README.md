# Master Price

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): MPR-01  
Code: price.js, master-price.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_Master_Price](UISS_Screen_Master_Price.xlsx) | screen | 0.3 (14-Nov-26) | [src/UISS_Screen_Master_Price.json](src/UISS_Screen_Master_Price.json) | 8 |

Rules / specification:

- [master-price-rules.md](master-price-rules.md)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.ITG_ECAT`, `ielp.MS_ROUTE_PRICE`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/uiss/scripts/build_all.py UISS_Screen_Master_Price`
