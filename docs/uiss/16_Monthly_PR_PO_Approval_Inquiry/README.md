# Monthly PR PO Approval Inquiry

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): PRI-01, PRA-01..02, POA-01, POI-01  
Code: monthly.js, monthly-workflow.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_PR_Inquiry](UISS_Screen_PR_Inquiry.xlsx) | screen | 0.4 (14-Nov-26) | [src/UISS_Screen_PR_Inquiry.json](src/UISS_Screen_PR_Inquiry.json) | 5 |
| [UISS_Screen_PR_Approval](UISS_Screen_PR_Approval.xlsx) | screen | 0.4 (14-Nov-26) | [src/UISS_Screen_PR_Approval.json](src/UISS_Screen_PR_Approval.json) | 6 |
| [UISS_Screen_PO_Approval](UISS_Screen_PO_Approval.xlsx) | screen | 0.4 (14-Nov-26) | [src/UISS_Screen_PO_Approval.json](src/UISS_Screen_PO_Approval.json) | 4 |
| [UISS_Screen_PO_Inquiry](UISS_Screen_PO_Inquiry.xlsx) | screen | 0.4 (14-Nov-26) | [src/UISS_Screen_PO_Inquiry.json](src/UISS_Screen_PO_Inquiry.json) | 3 |

Rules / specification:

- [monthly-pr-po-rules.md](monthly-pr-po-rules.md)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.CRITERIA_SCORE_APPROVAL`, `ielp.CRITERIA_SCORE_DETAIL_FINAL`, `ielp.CRITERIA_SCORE_DETAIL_ROUTE`, `ielp.CRITERIA_SCORE_HEADER`, `ielp.PO_APPROVAL`, `ielp.PO_APPROVAL_EST`, `ielp.PO_DETAIL`, `ielp.PO_HEADER`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/uiss/scripts/build_all.py UISS_Screen_PR_Inquiry UISS_Screen_PR_Approval UISS_Screen_PO_Approval UISS_Screen_PO_Inquiry`
