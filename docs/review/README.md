# TC-PBR implementation and UISS review

Goal: **existing system + existing database + actual implementation = accurate UISS.** The application is not
redesigned; differences are documented first and resolved by evidence.

| Phase | Deliverable | Status |
|---|---|---|
| 1 Existing system inventory | [01-function-inventory.md](01-function-inventory.md) - 79 functions | Done (14-Nov-26) |
| 2 UISS coverage | [02-uiss-inventory.md](02-uiss-inventory.md) - 28 UISS · [03-uiss-coverage-matrix.md](03-uiss-coverage-matrix.md) · [04-missing-and-questionable-uiss.md](04-missing-and-questionable-uiss.md) | Done (14-Nov-26) |
| 3 Database input | Schema received: [`../db/ELIPS_Schema.sql`](../db/ELIPS_Schema.sql) (UTF-8 copy), [`../db/schema-dictionary.md`](../db/schema-dictionary.md), [`../db/schema.json`](../db/schema.json). **Sample data: not yet received** | Partly |
| 4-5 Database analysis, DB -> application trace | Preliminary: [05-database-candidate-mapping.md](05-database-candidate-mapping.md) (links marked Inferred) | Waiting for sample data |
| 6-8 Review / revise / create UISS, gap analysis, traceability | - | Not started (no UISS changed yet) |
| Final | One folder per function with its UISS + rules `.md` | After Phase 8 |

Evidence classes: **Schema** (DDL), **Code** (mock-up source), **Data** (sample rows - none yet), **Inferred**, **TBD**.

Key facts so far:
- The repository is a static HTML / JS mock-up: rule modules act as service layer, in-memory arrays as database.
  There is no API or DB access code; interfaces (PAS, Talend, HiveMQ, IPMS) are simulated or only specified.
- Every UISS database section is unconfirmed: 37 of the 39 `TB_*` tables named in the UISS do not exist in ELIPS
  (only `TB_M_SYSTEM`, `TB_R_LOG_H` do; the PAS tables are outside ELIPS).
- The ELIPS schema has direct candidates for nearly every function (`MS_TRUCKING_COMPANY`, `MS_LOCATION`, `TB_M_MILEAGE`,
  `MS_RENBAN_TCPBR`, `DTP_HEADER` / `DTP_n_DETAIL`, `ORDER_CYCLE`, `SA_HEADER` / `SA_DETAIL`, `CRITERIA_SCORE_*`,
  `PO_*`), none for Master Priority, and several hard conflicts (mileage without decimals, e-mail 50 vs 100 ...).
