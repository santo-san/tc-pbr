# Master Renban

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): MRB-01..02  
Code: renban.js, master-renban.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_Master_Renban](uiss/UISS_Screen_Master_Renban.xlsx) | screen | 0.3 (14-Nov-26) | [uiss/src/UISS_Screen_Master_Renban.json](uiss/src/UISS_Screen_Master_Renban.json) | 9 |

Rules / specification (`uiss/`):

- [master-renban-rules.md](uiss/master-renban-rules.md)

ST test scripts (`test/`, generated with the uiss-test-script skill; spec JSON in `test/src/`):

- (none yet)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.MS_RENBAN_TCPBR`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/functions/scripts/build_all.py UISS_Screen_Master_Renban`
