# TC-PBR implementation and UISS review

Goal: **existing system + existing database + actual implementation = accurate UISS.** The application was not
redesigned or changed; differences are documented and resolved by evidence (schema for database facts, code for
behaviour). No sample data was available (user confirmation 14-Nov-26), so value lists / status codes stay TBD.
**Decision 14-Nov-26: every conflict follows the existing application logic**; the database changes this needs are DB change requests (DCR, file 12).

| # | Deliverable | File |
|---|---|---|
| 1 | Function Inventory (79 functions) | [01-function-inventory.md](01-function-inventory.md) |
| 2 | UISS Coverage Matrix (baseline + status after revision) | [02-uiss-inventory.md](02-uiss-inventory.md), [03-uiss-coverage-matrix.md](03-uiss-coverage-matrix.md), [04-missing-and-questionable-uiss.md](04-missing-and-questionable-uiss.md) |
| - | Database candidate mapping (Phase 4 preparation) | [05-database-candidate-mapping.md](05-database-candidate-mapping.md) |
| 3 | Database Mapping Matrix (343 UI elements) | [06-database-mapping-matrix.md](06-database-mapping-matrix.md) |
| 4 | UISS vs Code vs Database Gap Analysis (97 items) | [07-gap-analysis.md](07-gap-analysis.md) |
| 5-7 | Missing (3 created) / Revised (28) / Unchanged-validated UISS | [08-uiss-status-lists.md](08-uiss-status-lists.md) |
| 8 | Potential Application Bugs (10) | [09-potential-application-bugs.md](09-potential-application-bugs.md) |
| 9 | TBD / items requiring confirmation | [10-tbd-list.md](10-tbd-list.md) |
| 10 | Final Traceability Matrix (346 rows) | [11-traceability-matrix.md](11-traceability-matrix.md) |
| - | DB Change Requests (43) to keep the existing logic | [12-db-change-requests.md](12-db-change-requests.md) |

Sources: ELIPS schema [`../db/ELIPS_Schema.sql`](../db/ELIPS_Schema.sql) (+ [`../db/schema-dictionary.md`](../db/schema-dictionary.md), `../db/schema.json`);
mapping decisions per UISS in [`db-mapping/`](db-mapping/) (`maps_master.py`, `maps_daily.py`, `maps_sa_monthly.py` write the JSON);
applied with [`../uiss/scripts/db_revision.py`](../uiss/scripts/db_revision.py) ([DB-R1]) and [`../uiss/scripts/db_decision.py`](../uiss/scripts/db_decision.py) ([DB-R2], decisions in `db-mapping/decisions.py`); DCR list by `scripts/make_dcr.py`; matrices regenerated with `scripts/make_matrices.py`.
UISS are now one folder per function: [`../uiss/README.md`](../uiss/README.md).

Evidence classes: **Schema** (DDL), **Code** (mock-up source), **Data** (none provided), **Inferred** (link by name / structure), **TBD**.
