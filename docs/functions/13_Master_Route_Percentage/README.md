# Master Route Percentage

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): MRP-01..02  
Code: route-percentage.js, master-route-percentage.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_Master_Route_Percentage](uiss/UISS_Screen_Master_Route_Percentage.xlsx) | screen | 0.3 (14-Nov-26) | [uiss/src/UISS_Screen_Master_Route_Percentage.json](uiss/src/UISS_Screen_Master_Route_Percentage.json) | 13 |

Rules / specification (`uiss/`):

- [master-route-percentage-rules.md](uiss/master-route-percentage-rules.md)

ST test scripts (`test/`, generated with the uiss-test-script skill; spec JSON in `test/src/`):

- (none yet)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.MS_LOCATION`, `ielp.MS_ROUTE_DETAIL`, `ielp.MS_ROUTE_HEADER`, `ielp.MS_ROUTE_PERCENTAGE_HIST`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/functions/scripts/build_all.py UISS_Screen_Master_Route_Percentage`
