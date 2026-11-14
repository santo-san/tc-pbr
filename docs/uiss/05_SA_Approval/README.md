# SA Approval

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): SA-01..SA-03  
Code: sa.js, sa-rules.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_SA_Approval](UISS_Screen_SA_Approval.xlsx) | screen | 0.5 (14-Nov-26) | [src/UISS_Screen_SA_Approval.json](src/UISS_Screen_SA_Approval.json) | 14 |

Rules / specification:

- [sa-approval-spec.md](sa-approval-spec.md)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.CRITERIA_SCORE_HEADER`, `ielp.DTP_2_DETAIL`, `ielp.DTP_HEADER`, `ielp.MS_ROUTE_PRICE`, `ielp.MS_TRUCKING_COMPANY`, `ielp.ORDER_CYCLE`, `ielp.PO_HEADER`, `ielp.SA_DETAIL`, `ielp.SA_HEADER`, `ielp.TB_M_MILEAGE`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/uiss/scripts/build_all.py UISS_Screen_SA_Approval`
