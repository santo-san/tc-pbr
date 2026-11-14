# SA Approval

Functions (see [../../review/01-function-inventory.md](../../review/01-function-inventory.md)): SA-01..SA-03  
Code: sa.js, sa-rules.js

| UISS | Type | Revision | Source | Screenshots |
|---|---|---|---|---|
| [UISS_Screen_SA_Approval](uiss/UISS_Screen_SA_Approval.xlsx) | screen | 0.5 (14-Nov-26) | [uiss/src/UISS_Screen_SA_Approval.json](uiss/src/UISS_Screen_SA_Approval.json) | 14 |

Rules / specification (`uiss/`):

- [sa-approval-spec.md](uiss/sa-approval-spec.md)

ST test scripts (`test/`, generated with the uiss-test-script skill; spec JSON in `test/src/`):

- [ST-ELIPS_TBD_TC_PBR_SA_Approval_Service_Acceptance.xlsx](test/ST-ELIPS_TBD_TC_PBR_SA_Approval_Service_Acceptance.xlsx)

ELIPS tables (schema, see [../../db/schema-dictionary.md](../../db/schema-dictionary.md)): `ielp.CRITERIA_SCORE_HEADER`, `ielp.DTP_2_DETAIL`, `ielp.DTP_HEADER`, `ielp.MS_ROUTE_PRICE`, `ielp.MS_TRUCKING_COMPANY`, `ielp.ORDER_CYCLE`, `ielp.PO_HEADER`, `ielp.SA_DETAIL`, `ielp.SA_HEADER`, `ielp.TB_M_MILEAGE`

Review: database mapping [../../review/06-database-mapping-matrix.md](../../review/06-database-mapping-matrix.md), gaps [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md), traceability [../../review/11-traceability-matrix.md](../../review/11-traceability-matrix.md).

Rebuild: `python3 docs/functions/scripts/build_all.py UISS_Screen_SA_Approval`
