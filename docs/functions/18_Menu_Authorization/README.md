# Menu Authorization

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): COM-01..02  
Code: index.html, master.html, monthly.html, app.js, workflow.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_TCPBR_Menu_Authorization](uiss/UISS_Screen_TCPBR_Menu_Authorization.xlsx) | screen | 0.2 (14-Nov-26) | [uiss/src/UISS_Screen_TCPBR_Menu_Authorization.json](uiss/src/UISS_Screen_TCPBR_Menu_Authorization.json) | 0 |

Rules / specification (`uiss/`):

- [menu-authorization-rules.md](uiss/menu-authorization-rules.md)

ST test scripts (`test/`, generated with the uiss-test-script skill; spec JSON in `test/src/`):

- [ST-ELIPS_TBD_TC_PBR_Menu_Authorization.xlsx](test/ST-ELIPS_TBD_TC_PBR_Menu_Authorization.xlsx)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): see UISS

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/functions/scripts/build_all.py UISS_Screen_TCPBR_Menu_Authorization`
