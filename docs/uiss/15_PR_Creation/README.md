# PR Creation

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): PRC-01..02  
Code: pr-creation.js, pr-creation-rules.js, pr-sources.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_PR_Creation](UISS_Screen_PR_Creation.xlsx) | screen | 0.3 (14-Nov-26) | [src/UISS_Screen_PR_Creation.json](src/UISS_Screen_PR_Creation.json) | 13 |

Rules / specification:

- [pr-creation-rules.md](pr-creation-rules.md)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.CRITERIA_SCORE_APPROVAL`, `ielp.CRITERIA_SCORE_DETAIL_FINAL`, `ielp.CRITERIA_SCORE_DETAIL_ROUTE`, `ielp.CRITERIA_SCORE_HEADER`, `ielp.MS_ROUTE_DETAIL`, `ielp.MS_ROUTE_HEADER`, `ielp.MS_ROUTE_PRICE`, `ielp.MS_TRUCKING_COMPANY`, `ielp.TB_M_WORKING_CALENDAR`, `ielp.TB_R_PR_DAILY`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/uiss/scripts/build_all.py UISS_Screen_PR_Creation`
