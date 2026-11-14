# PAS PR Interface

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): INT-01..02  
Code: (Talend - existing tJava in this folder)

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Batch_ELIPS_PAS_PR_Interface](UISS_Batch_ELIPS_PAS_PR_Interface.xlsx) | batch | 0.2 (14-Nov-26) | [src/UISS_Batch_ELIPS_PAS_PR_Interface.json](src/UISS_Batch_ELIPS_PAS_PR_Interface.json) | 0 |
| [UISS_Batch_PAS_ELIPS_PR_PO_Callback](UISS_Batch_PAS_ELIPS_PR_PO_Callback.xlsx) | batch | 0.2 (14-Nov-26) | [src/UISS_Batch_PAS_ELIPS_PR_PO_Callback.json](src/UISS_Batch_PAS_ELIPS_PR_PO_Callback.json) | 0 |

Rules / specification:

- [current-tjava-json-to-pas.java](current-tjava-json-to-pas.java)
- [elips-pas-pr-interface-spec.md](elips-pas-pr-interface-spec.md)
- [pas-elips-callback-spec.md](pas-elips-callback-spec.md)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.LOG_ITGPAS`, `ielp.SA_DETAIL`, `ielp.SA_HEADER`, `ielp.SA_WBS_PERCENTAGE`, `ielp.TB_M_SYSTEM`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/uiss/scripts/build_all.py UISS_Batch_ELIPS_PAS_PR_Interface UISS_Batch_PAS_ELIPS_PR_PO_Callback`
