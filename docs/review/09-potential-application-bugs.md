# 09 - Potential Application Bugs (documented, not fixed)

The mock-up behaviour was **not** changed in this review. Items below are behaviours that are inconsistent inside
the application, or that will fail / lose data once the screens are connected to the existing ELIPS tables.

| ID | Severity | Where (code) | Finding | Evidence | Impact | Recommendation |
|---|---|---|---|---|---|---|
| BUG-01 | Medium | `index.html` (+ Create DTP), `app.js:558 openCreateDTP`, `workflow.js:84 checkDTP`, `:97 createDTP` | Two ways to create a DTP with different roles: legacy dialog in Daily Monitoring for **IELP Admin**, Planning Order for **Planner VPLD** only | `workflow.js:86` "Hanya IELP Admin yang dapat membuat DTP" vs `dtp-rules.js canCreate` (PLANNER) | Users / testers may create orders outside the DTP rules (no KPI, payment type, queue) | Remove the legacy dialog or align roles (decision needed) |
| BUG-02 | Medium | `master.js`, `location.js`, `mileage.js`, `kpi.js`, `price.js`, `priority.js`, `renban.js`, `route-percentage.js` | No role check on any Master screen; Master Mileage even shows "IELP Admin only" | No `role` test in these files; badge in `master.html` | Any logged-in role can maintain master data | Add role check per UISS Menu & Authorization (roles TBD) |
| BUG-03 | High (when connected) | `master-trucking.js` (e-mail max 100) | E-mail up to 100 characters accepted | `MS_TRUCKING_COMPANY.EMAIL varchar(50)` | Insert / update fails or truncates | Limit to 50 or extend column (G-MTC-01) |
| BUG-04 | High (when connected) | `master-mileage.js parseMileage` (2 decimals) | Decimal mileage accepted | `TB_M_MILEAGE.MILEAGE decimal(18,0)` | Decimals silently rounded / lost; cost calculation differs | G-MML-01 |
| BUG-05 | High (when connected) | `master-mileage.js validate` (route = From + To) | Several routes from the same From are allowed | `TB_M_MILEAGE` PK = `LOC_NAME_FROM`, `FROM_CODE` (TO_CODE not in PK) | Second route from the same origin violates the PK | G-MML-02 |
| BUG-06 | High (when connected) | `sa-rules.js saNumber`, `sa-pas-rules.js SA_RE` | SA number `ILS/TR/<LP>/<YYMMDD><NNNN>` (up to 22 characters) | `SA_DETAIL.SA_CODE` / `ORDER_CYCLE.SA_CODE` varchar(16) | SA number does not fit | G-SA-01 |
| BUG-07 | Medium (when connected) | all rule modules (`version` checks) | Optimistic lock by VERSION | Only `MS_RENBAN_TCPBR` has VERSION | Concurrency check cannot work as coded | G-GEN-04 |
| BUG-08 | Medium (when connected) | `dtp-rules.js` (ORDER_NO assigned by the queue) | DTP records exist without order number until processed | `DTP_n_DETAIL.ORDER_NO` NOT NULL (PK in DTP_2 / DTP_3) | Records cannot be stored before processing | G-DTP-02 |
| BUG-09 | Low | `location.js:99, :117` | Map / geocoding via OpenStreetMap Nominatim, UISS specifies Google Maps | code vs UISS U13 | Stand-in only; external call from the mock-up | Keep UISS; replace in implementation (G-MLC-05) |
| BUG-10 | Low (when connected) | `master-location.js` (Active / Inactive) | Deactivate keeps the record usable for history | `MS_LOCATION` has only `IS_DELETE` | Inactive and deleted cannot be distinguished | G-MLC-03 |

"When connected" = not a defect of the static mock-up itself, but a guaranteed failure if the implementation keeps
the coded rule on the existing table.
