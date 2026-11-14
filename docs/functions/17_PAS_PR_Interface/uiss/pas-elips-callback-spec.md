# PAS → ELIPS Callback (PAS PR / PO Number) – Talend DB-to-DB Design

| Item | Value |
|---|---|
| Interface | PAS (released PO + PR) → ELIPS `SA_DETAIL.PAS_PR_NUMBER` / `PAS_PO_NUMBER` |
| Tool | Talend scheduled job, DB-to-DB (no API) |
| Forward interface | [ELIPS → PAS PR interface](elips-pas-pr-interface-spec.md) and the as-is code [`current-tjava-json-to-pas.java`](current-tjava-json-to-pas.java) |
| UISS | [`../uiss/UISS_Batch_PAS_ELIPS_PR_PO_Callback.xlsx`](UISS_Batch_PAS_ELIPS_PR_PO_Callback.xlsx) |
| Status | Draft 0.1, 06-Nov-2026 |

**Notation:**
- Names in `< >` are **not** in the supplied code or schema, and must be confirmed before development:
  - PAS: "TBD - Requires PAS table/column confirmation";
  - ELIPS: "TBD - Requires ELIPS table/column confirmation".
- Everything else is confirmed by the requirement or by the forward-interface code.

---

## 1. Current flow discovered from the code / schema

### 1.1 What was analysed
- The forward interface (Talend tJava, JSON → PAS): `docs/functions/17_PAS_PR_Interface/uiss/current-tjava-json-to-pas.java`.
- The DB-to-DB redesign of the forward interface: `docs/functions/17_PAS_PR_Interface/uiss/elips-pas-pr-interface-spec.md`.
- The ELIPS mock-ups in this repository:
  - SA Monitoring, `sa-pas-rules.js`: the PAS feedback rules `applyFeedback` (PR / PO received, conflict and duplicate checks);
  - its spec, `docs/functions/06_SA_Monitoring/uiss/sa-monitoring-spec.md`.

This repository contains **no Talend project, no PAS / ELIPS DDL, and no connection configuration**. Answers that depend on them are therefore open questions (section 9).

### 1.2 Answers to the analysis questions

| # | Question | Finding | Source / status |
|---|---|---|---|
| 1 | Existing ELIPS → PAS flow | Per SA, on one PAS connection:<br>1. `fn_get_last_process_id`, `TB_R_LOG_H`;<br>2. PR numbering (`TB_M_PROCUREMENT_TYPE` / `TB_M_DOC_NUMBERING` / `TB_H_DOCUMENT_NUMBER`);<br>3. `TB_R/T_PR_H`, `TB_R/T_PR_ITEM`, `TB_R/T_PR_SUBITEM`;<br>4. `SP_ILS_GENERATE_PR_ITEM`, `sp_prcreation_budgetProcessing`;<br>5. `TB_T_JOB_AUTOPO` ('PR', PR_NO, NULL, **'ILSTC'**, …);<br>6. commit.<br>The PAS Auto PO job and Auto-Approval then create and release the PO. | tJava code (confirmed) |
| 2 | How the SA reference is sent | Header `SA_NUMBER` → `TB_R_PR_H.PR_DESC`. Detail `ITEM_NO` → `TB_R_PR_ITEM.PR_ITEM_NO`. `ORDER_NO;ROUTE` → `MAT_DESC` (item and sub item). | tJava code (confirmed) |
| 3 | PAS column holding the ELIPS reference | **`TB_R_PR_H.PR_DESC` = SA_NUMBER**: the only reference, and it is header level. Item level: `TB_R_PR_ITEM.PR_ITEM_NO` = ELIPS `ITEM_NO`. PROCESS_ID is PAS-generated and is not stored in ELIPS today. | tJava code (confirmed) |
| 4 | Key between `TB_R_PO_H` and `TB_R_PR_H` | **Not in the supplied information.** The forward code never touches PO tables. `TB_T_JOB_AUTOPO.DOCUMENT_NO` = PR_NO is the input of the Auto PO job, but no PO number column of that table is known. | `<PAS_PO_PR_LINK>` – OQ-C01 |
| 5 | Structure of `SA_DETAIL` | Only `PAS_PR_NUMBER` and `PAS_PO_NUMBER` are confirmed (this requirement). The SA number and item number columns, audit columns and the primary key are not given. The fields known from the forward JSON are `ITEM_NO`, `SA_DET_NUMBER`, `COST`, `ORDER_FINISH_DATE`, `ROUTE`, `ORDER_NO`. | `<SA_NUMBER_COL>`, `<ITEM_NO_COL>` – OQ-C04 |
| 6 | Types of `PAS_PR_NUMBER` / `PAS_PO_NUMBER` | Not given. The examples `5000269261` and `4450288442` are 10 characters, which fits the PAS numbering block (2-char prefix + 8-digit sequence). Store them as **character** values: leading digits are part of the prefix and must not be converted to a number. | OQ-C05 |
| 7 | Existing Talend pattern | One `tJava` with JDBC on `conn_tDBConnection_2`, a manual `conn.commit()`, and `System.out` logging. There is no reject or log table. | tJava code |
| 8 | Connection configuration | Only the component name `tDBConnection_2` is known; there are no context variables in the supplied code. | OQ-C09 |
| 9 | Logging / error handling | PAS `TB_R_LOG_H` + `sp_PutLog` (forward only), and `System.out` / `System.err`. There is no callback log. | Proposed in section 7 |

### 1.3 Critical findings before development

| ID | Finding | Impact | Needed |
|---|---|---|---|
| **CB-01** | **PR_NOTES.** The current forward interface inserts `PR_NOTES = NULL`. The value it computes (`ILSTC_yyyyMMdd_1`) ends with **'1'**. With the code as-is, `RIGHT(PR_NOTES,1) = '0'` is never true, so **no record would be called back** unless a PAS process (Auto PO / Auto-Approval) or the forward interface sets PR_NOTES to a value ending with '0'. | Callback finds nothing | OQ-C02: who sets PR_NOTES, and what do the suffixes 0 / 1 mean? Align with forward-interface OQ-08 |
| **CB-02** | **PO ↔ PR relation unknown.** It cannot be derived from the code, and no join is invented. If the relation is at PR-item level (PO item → PR_NO + PR_ITEM_NO), the PO can be written per SA_DETAIL row. If it is at header level, every SA_DETAIL row of the SA gets the same PO. | Defines the update grain | OQ-C01 |
| **CB-03** | **The PO status column name is unknown.** Only the value `44` (Released) is given. | Query | OQ-C03 |
| **CB-04** | **Header-level reference.** PR_DESC identifies the SA, not the detail row. The detail row is identified by SA_NUMBER + ITEM_NO (= PR_ITEM_NO), which requires `ITEM_NO` to be stored in SA_DETAIL. | Correct row | OQ-C04 |
| CB-05 | Several PRs with the same PR_DESC (manual PAS PR, or a re-sent SA) or several released POs for one PR at header level are ambiguous. | Wrong update risk | Rejected, never guessed (5.3) |
| CB-06 | Earlier ELIPS proposals kept the PAS PR / PO on the SA **header** (SA Monitoring spec §11). This requirement puts them on **SA_DETAIL**. | Model alignment | OQ-C06 |

---

## 2. Proposed callback architecture

```
          ┌──────────────────────────── Talend job PAS_ELIPS_PR_PO_CALLBACK (scheduled, single instance) ──────────────────────────┐
ELIPS     │ 1 start: run log, contexts                                                                                              │
SA_DETAIL ├─▶ 2 pending SAs: rows with PAS_PR_NUMBER or PAS_PO_NUMBER empty (lookback window)                                        │
          │ 3 chunk of SA numbers ─────────────────────────────────────────────────────────▶ PAS TB_R_PR_H (PR_DESC IN …)            │
          │                                                                                   └▶ <PAS_PO_PR_LINK> ─▶ TB_R_PO_H (44)  │
          │ 4 classify: no PR / PO not released / PR_NOTES NULL / not '0' / ambiguous / eligible                                   │
          │ 5 identify SA_DETAIL rows (SA_NUMBER [+ ITEM_NO]); row count and conflict check                                        │
SA_DETAIL ◀─ 6 UPDATE per SA in one ELIPS transaction (idempotent WHERE); commit / rollback; continue                                   │
          │ 7 detail log per SA, run log totals                                                                                    │
          └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Direction of reading (performance).** The job starts from the **small ELIPS set** (SAs still waiting for PR / PO) and reads PAS only for those PR_DESC values, in chunks.
  - `TB_R_PO_H` and `TB_R_PR_H` are never read in full.
  - The filters `PO status = 44` and `PR_NOTES` are applied in the PAS query.
- **Optional mode B (PO-driven):** used only if `TB_R_PO_H` has a change / release timestamp (OQ-C07). It reads POs released since the last watermark. It is the only way to report "released PO without PR" for POs that are not linked to a pending SA.
- **Read-only on PAS.** The callback writes **only** to ELIPS. PAS is not flagged, so a PO can be detected again; idempotency is handled on the ELIPS side (6.2).
- **Transactions:**
  - PAS: one read per chunk, `READ COMMITTED`, no locks held.
  - ELIPS: **one transaction per SA** (all its detail rows); one SA failing does not affect the others.
- **Database technology:**
  - PAS is SQL Server (T-SQL in the forward code).
  - The ELIPS database engine is TBD (OQ-C09). The ELIPS statements below are ANSI SQL; only the PAS query uses T-SQL `RIGHT` / `LEN`.

---

## 3. Source-to-target mapping

| Source System | Source Table | Source Column | Transformation / Rule | Target System | Target Table | Target Column | Mandatory? | Remarks |
|---|---|---|---|---|---|---|---|---|
| PAS | TB_R_PR_H | PR_NO | Trim; character value as stored | ELIPS | SA_DETAIL | PAS_PR_NUMBER | Y | e.g. '5000269261' |
| PAS | TB_R_PO_H | `<PO_NO_COL>` | Trim; character value; only when `<PO_STATUS_COL>` = '44' | ELIPS | SA_DETAIL | PAS_PO_NUMBER | Y | e.g. '4450288442'. Column TBD (OQ-C03) |
| PAS | TB_R_PR_H | PR_DESC | = SA number; key of the target rows, not written | ELIPS | SA_DETAIL | `<SA_NUMBER_COL>` (WHERE) | Y | TBD - Requires ELIPS table/column confirmation |
| PAS | `<PAS_PO_PR_LINK>` / TB_R_PR_ITEM | PR_ITEM_NO | = ELIPS ITEM_NO; key of the target row; only if the PO link is item level | ELIPS | SA_DETAIL | `<ITEM_NO_COL>` (WHERE) | Cond. | OQ-C01 / OQ-C04 |
| PAS | TB_R_PR_H | PR_NOTES | Filter only: not NULL, not empty, `RIGHT(…,1) = '0'` | – | – | – | Y | Not written (CB-01) |
| PAS | TB_R_PO_H | `<PO_STATUS_COL>` | Filter only: = '44' (Released) | – | – | – | Y | Type (char / int) TBD |
| Talend | – | – | Callback user (context `CB_USER`, e.g. 'TALEND_CB') | ELIPS | SA_DETAIL | `<CHANGED_BY_COL>` | TBD | Only if SA_DETAIL has audit columns |
| Talend | – | – | ELIPS server date-time | ELIPS | SA_DETAIL | `<CHANGED_DT_COL>` | TBD | Only if SA_DETAIL has audit columns |

---

## 4. Queries

### 4.1 ELIPS – SAs waiting for PR / PO (step 2)

```sql
SELECT D.<SA_NUMBER_COL>             AS SA_NUMBER,
       COUNT(*)                      AS DETAIL_CNT,
       SUM(CASE WHEN D.PAS_PR_NUMBER IS NOT NULL AND D.PAS_PO_NUMBER IS NOT NULL THEN 1 ELSE 0 END) AS DONE_CNT
FROM   SA_DETAIL D
WHERE  (D.PAS_PR_NUMBER IS NULL OR D.PAS_PO_NUMBER IS NULL)
  AND  <SA_INTERFACED_TO_PAS_CONDITION>          -- e.g. forward interface status SUCCESS (TBD, forward OQ-01)
  AND  <SA_DATE_COL> >= :CB_LOOKBACK_FROM        -- lookback window, context CB_LOOKBACK_DAYS (TBD column)
GROUP  BY D.<SA_NUMBER_COL>;
```

The index `SA_DETAIL(<SA_NUMBER_COL>)` is needed, plus an index that supports the NULL filter (for example a filtered index where `PAS_PO_NUMBER IS NULL`, if the ELIPS engine allows it).

### 4.2 PAS – callback candidates for a chunk of SA numbers (step 3)
The query does **not** filter PR_NOTES in the WHERE clause, so that skipped records can be counted and logged with their reason. The set is small, because it is restricted by PR_DESC.

```sql
SELECT PR.PR_DESC                          AS SA_NUMBER,
       PR.PR_NO                            AS PAS_PR_NUMBER,
       PR.PR_NOTES,
       L.<LINK_PR_ITEM_NO_COL>             AS PR_ITEM_NO,          -- only if the link is item level (OQ-C01)
       PO.<PO_NO_COL>                      AS PAS_PO_NUMBER,
       PO.<PO_STATUS_COL>                  AS PO_STATUS,
       CASE WHEN PR.PR_NOTES IS NULL OR LEN(LTRIM(RTRIM(PR.PR_NOTES))) = 0 THEN 'NOTES_EMPTY'
            WHEN RIGHT(RTRIM(PR.PR_NOTES), 1) <> '0'                         THEN 'NOTES_NOT_0'
            ELSE 'ELIGIBLE' END            AS NOTES_CHECK
FROM   TB_R_PR_H PR
LEFT   JOIN <PAS_PO_PR_LINK> L  ON L.<LINK_PR_NO_COL> = PR.PR_NO                 -- TBD - Requires PAS table/column confirmation
LEFT   JOIN TB_R_PO_H        PO ON PO.<PO_NO_COL> = L.<LINK_PO_NO_COL>          -- TBD
                               AND PO.<PO_STATUS_COL> = '44'
WHERE  PR.PR_DESC IN (:SA_1, :SA_2, … :SA_n)                                     -- chunk, context CB_CHUNK_SIZE
-- optional narrowing to ILS TC PRs (confirmed columns of the forward interface):
--   AND EXISTS (SELECT 1 FROM TB_T_JOB_AUTOPO J WHERE J.[TYPE] = 'PR' AND J.DOCUMENT_NO = PR.PR_NO AND J.CREATED_BY = 'ILSTC')
```

- A SA number with **no row** returned means the PR was not found.
- A row with `PAS_PO_NUMBER` NULL means the PO is not released yet.
- In both cases the record is skipped and stays pending for the next run.
- Index `TB_R_PR_H(PR_DESC)` should be confirmed by PAS (OQ-C08). If it is missing, the `PR_DESC IN` lookup scans the table; a lookback on `TB_R_PR_H.CREATED_DT` (confirmed column) then limits the scan.

**If the relation is a direct column on `TB_R_PO_H`** (for example the PO header holds the PR number), `<PAS_PO_PR_LINK>` disappears and the join becomes `PO.<PO_PR_NO_COL> = PR.PR_NO`. This is not assumed (OQ-C01).

### 4.3 Mode B (optional, PO-driven, only with a PO timestamp)

```sql
SELECT PO.<PO_NO_COL>, PR.PR_NO, PR.PR_DESC, PR.PR_NOTES
FROM   TB_R_PO_H PO
LEFT   JOIN <PAS_PO_PR_LINK> L ON L.<LINK_PO_NO_COL> = PO.<PO_NO_COL>
LEFT   JOIN TB_R_PR_H PR       ON PR.PR_NO = L.<LINK_PR_NO_COL>
WHERE  PO.<PO_STATUS_COL> = '44'
  AND  PO.<PO_CHANGED_DT_COL> > :LAST_WATERMARK                   -- TBD (OQ-C07)
```

The watermark is stored in the run log (section 7). A PO without a PR is logged as `PR_NOT_FOUND`.

---

## 5. Validation and record classification (step 4 / 5)

### 5.1 Per PAS row

| Result | Condition | Action | Counted as |
|---|---|---|---|
| PR_NOT_FOUND | SA in the pending list, no TB_R_PR_H with PR_DESC = SA | Skip; next run | skipped |
| PO_NOT_RELEASED | PR found, no linked PO with status 44 | Skip | skipped (not in "released PO found") |
| NOTES_EMPTY | PR_NOTES NULL or blank | Skip, warning | released PO found, skipped |
| NOTES_NOT_0 | PR_NOTES does not end with '0' (including any unexpected format) | Skip, info | released PO found, skipped |
| ELIGIBLE | Released PO and PR_NOTES ends with '0' | Go to 5.2 | eligible |

PR_NOTES is handled only through string functions (`RTRIM`, `RIGHT`, `LEN`), with no conversion or parsing, so no value can fail the job.

### 5.2 Per SA (all eligible rows of one SA)

| Check | Rule | Fail → |
|---|---|---|
| Unique PR | Exactly one distinct PR_NO for the SA (PR_DESC) | FAILED `AMBIGUOUS_PR` |
| Unique PO | Header-level link: exactly one released PO for the PR. Item-level link: one released PO per PR_ITEM_NO | FAILED `AMBIGUOUS_PO` |
| SA exists | `SELECT COUNT(*) FROM SA_DETAIL WHERE <SA_NUMBER_COL> = :SA` > 0 | FAILED `SA_NOT_FOUND` |
| Row match | Header link: every SA_DETAIL row of the SA. Item link: exactly one SA_DETAIL row per (SA, ITEM_NO). The row count must equal the number of TB_R_PR_ITEM rows of the PR (optional cross-check, confirmed columns PR_NO / PR_ITEM_NO) | FAILED `DETAIL_MISMATCH` / `MULTIPLE_DETAIL_MATCH` |
| No conflict | No target row has a **different** non-empty PAS_PR_NUMBER or PAS_PO_NUMBER | FAILED `VALUE_CONFLICT` (never overwritten; OQ-C10) |
| Forward reference (if available) | When the forward tracking store (`<ELIPS_SA_INTERFACE_STATUS>.PR_NO`) exists, it must equal PR_NO | FAILED `PR_MISMATCH` |
| Already done | All target rows already hold the same PR and PO | NO_CHANGE (no UPDATE) |

### 5.3 Never update by PAS numbers alone
- The target rows are identified only by the **ELIPS SA_NUMBER** (sent as PR_DESC) and, at item level, by ITEM_NO (sent as PR_ITEM_NO).
- `PAS_PR_NUMBER` / `PAS_PO_NUMBER` are never used to find the target rows; they are only compared, to detect conflicts.

---

## 6. Update logic for SA_DETAIL

### 6.1 Statement (one transaction per SA, ELIPS connection auto-commit OFF)

```sql
-- header-level PO link: all detail rows of the SA
UPDATE SA_DETAIL
SET    PAS_PR_NUMBER   = :PAS_PR_NUMBER,
       PAS_PO_NUMBER   = :PAS_PO_NUMBER
       -- , <CHANGED_BY_COL> = :CB_USER, <CHANGED_DT_COL> = <ELIPS current timestamp>   (if the columns exist)
WHERE  <SA_NUMBER_COL> = :SA_NUMBER
  -- AND <ITEM_NO_COL> = :PR_ITEM_NO                                   (item-level PO link)
  AND  (PAS_PR_NUMBER IS NULL OR PAS_PR_NUMBER = :PAS_PR_NUMBER)       -- never overwrite another value
  AND  (PAS_PO_NUMBER IS NULL OR PAS_PO_NUMBER = :PAS_PO_NUMBER)
  AND  NOT (PAS_PR_NUMBER = :PAS_PR_NUMBER AND PAS_PO_NUMBER = :PAS_PO_NUMBER);   -- skip rows already equal
```

### 6.2 Idempotency and transaction
1. The pre-check of 5.2 is run in the same ELIPS transaction (`SELECT … FOR UPDATE` / `WITH (UPDLOCK)` on the SA rows). It gives:
   - `TOTAL` = target rows;
   - `SAME` = rows already equal;
   - `CONFLICT` = rows with different values.
2. `CONFLICT > 0` → ROLLBACK, FAILED `VALUE_CONFLICT`.
3. `SAME = TOTAL` → ROLLBACK (nothing to do), result **NO_CHANGE**. There is no UPDATE, so there are no audit changes and no triggers.
4. Otherwise run the UPDATE. The rows affected must equal `TOTAL − SAME`; if not, ROLLBACK, FAILED `UPDATE_COUNT_MISMATCH`.
5. COMMIT → result **UPDATED** (rows affected).
6. Any DB error → ROLLBACK that SA, FAILED `UPDATE_FAILED`, and continue with the next SA.
7. Re-running the job with the same PAS data:
   - every SA ends as NO_CHANGE;
   - SAs that are complete drop out of the pending list (4.1), so they are not even read again.

### 6.3 Concurrency
- The job runs as a single instance (TMC / TAC: no parallel run).
- The row lock in step 1 protects against a concurrent ELIPS screen update of the same SA.

---

## 7. Logging and error handling

### 7.1 Talend logging
- `tStatCatcher` / `tLogCatcher` → job log (file or AMC).
- **Proposed ELIPS log tables** (placeholder names; TBD - Requires ELIPS table/column confirmation, OQ-C11). If the project prefers, the same content can go to a log file only.

`<ELIPS_PAS_CALLBACK_RUN_LOG>` (one row per run):

| Column | Type | Description |
|---|---|---|
| RUN_ID | VARCHAR(50) | Talend pid / run id (PK) |
| START_DT / END_DT | DATETIME | Job start / end |
| PENDING_SA_CNT | INT | SAs read in step 2 |
| RELEASED_PO_CNT | INT | Released POs found (status 44) |
| ELIGIBLE_CNT | INT | Released and PR_NOTES ends with '0' |
| UPDATED_CNT | INT | SAs updated (rows in DETAIL log) |
| UPDATED_ROW_CNT | INT | SA_DETAIL rows updated |
| NO_CHANGE_CNT | INT | Already up to date |
| SKIPPED_CNT | INT | Skipped (not found / not released / notes) |
| FAILED_CNT | INT | Failed |
| WATERMARK | DATETIME | Mode B only |
| RUN_STATUS | VARCHAR(10) | SUCCESS / PARTIAL / FAILED |
| MESSAGE | VARCHAR(2000) | Summary / fatal error |

`<ELIPS_PAS_CALLBACK_DETAIL_LOG>` (one row per SA, or per SA + item):

| Column | Type | Description |
|---|---|---|
| RUN_ID | VARCHAR(50) | Run |
| SEQ | INT | Sequence in the run |
| SA_NUMBER | VARCHAR(TBD) | ELIPS SA / reference (= PR_DESC) |
| ITEM_NO | VARCHAR(TBD) | Item (item-level link only) |
| PAS_PR_NUMBER | VARCHAR(20) | PAS PR |
| PAS_PO_NUMBER | VARCHAR(20) | PAS PO |
| PR_NOTES | VARCHAR(TBD) | Value seen (for skipped records) |
| RESULT | VARCHAR(20) | UPDATED / NO_CHANGE / SKIPPED / FAILED |
| REASON_CD | VARCHAR(30) | PR_NOT_FOUND, PO_NOT_RELEASED, NOTES_EMPTY, NOTES_NOT_0, AMBIGUOUS_PR, AMBIGUOUS_PO, SA_NOT_FOUND, DETAIL_MISMATCH, MULTIPLE_DETAIL_MATCH, VALUE_CONFLICT, PR_MISMATCH, UPDATE_COUNT_MISMATCH, UPDATE_FAILED |
| MESSAGE | VARCHAR(2000) | Error text (no credentials, no connection string) |
| ROWS_AFFECTED | INT | Updated rows |
| CREATED_DT | DATETIME | Log time |

**Logging volume:** PR_NOT_FOUND and PO_NOT_RELEASED are normal waiting states. They are logged as counts only, plus a detail row once the SA has been waiting longer than `CB_WAIT_ALERT_DAYS` (TBD), so the detail log does not grow on every run.

### 7.2 Error handling

| Condition | Handling | Job result |
|---|---|---|
| No released PO found | Info "no callback candidates"; run log SUCCESS with 0 | Success |
| PO found but PR not found | Mode A: SA stays pending (PR_NOT_FOUND count). Mode B: detail log PR_NOT_FOUND | Success |
| PR_NOTES NULL / empty | Skip, NOTES_EMPTY | Success |
| PR_NOTES not ending with '0' | Skip, NOTES_NOT_0 | Success |
| ELIPS SA cannot be identified | FAILED SA_NOT_FOUND; no update | Partial |
| Multiple SA_DETAIL records unexpectedly match | FAILED MULTIPLE_DETAIL_MATCH / DETAIL_MISMATCH; rollback | Partial |
| Ambiguous PR / PO | FAILED AMBIGUOUS_PR / AMBIGUOUS_PO | Partial |
| Existing different PR / PO in ELIPS | FAILED VALUE_CONFLICT; not overwritten | Partial |
| ELIPS update failure | Rollback this SA; continue | Partial |
| PAS connection failure | Stop the run; no ELIPS change; run log FAILED | Failed (retried next schedule) |
| ELIPS connection failure | Stop; the run log is written to the file (DB not available) | Failed |
| PAS query error in one chunk | Log; skip the chunk; continue with the next | Partial |

---

## 8. Talend component design and deliverables

### 8.1 Components

| # | Component | Purpose / settings |
|---|---|---|
| 1 | `tPrejob` → `tMSSqlConnection` **cnx_PAS** | Context `PAS_DB_*`; read only (`ApplicationIntent=ReadOnly` if a replica is used, TBD) |
| 2 | `tDBConnection` **cnx_ELIPS** | Context `ELIPS_DB_*`; auto-commit OFF; engine TBD (OQ-C09) |
| 3 | `tDBRow` (ELIPS) | Insert the run log (START) |
| 4 | `tDBInput` (ELIPS) | Query 4.1 → `tHashOutput` pending SAs |
| 5 | `tJavaFlex` / `tFlowToIterate` | Build chunks of `CB_CHUNK_SIZE` SA numbers |
| 6 | `tMSSqlInput` (PAS) | Query 4.2 with the chunk (prepared statement parameters) |
| 7 | `tMap` | Join the pending list with the PAS rows; classify (5.1); route ELIGIBLE / SKIPPED |
| 8 | `tAggregateRow` + `tJavaRow` | Per SA: distinct PR / PO, ambiguity checks (5.2) |
| 9 | `tFlowToIterate` (per SA) → `tDBInput` (ELIPS pre-check, lock) → `tJavaRow` | TOTAL / SAME / CONFLICT decision |
| 10 | `tDBRow` (ELIPS) | UPDATE 6.1; read rows affected (`NB_LINE`) |
| 11 | `tDBCommit` / `tDBRollback` (ELIPS, close = false) | Per SA |
| 12 | `tDBOutput` (ELIPS) | Detail log (UPDATED / NO_CHANGE / SKIPPED / FAILED) |
| 13 | `tLogCatcher` → `tDBRollback` + `tFileOutputDelimited` | Fatal errors |
| 14 | `tPostjob` → `tDBRow` (run log END, counts) → `tDBClose` × 2 | Summary |

### 8.2 Context variables (no hard-coded credentials)
- **Databases:** `PAS_DB_HOST`, `PAS_DB_PORT`, `PAS_DB_NAME`, `PAS_DB_USER`, `PAS_DB_PASSWORD`, `ELIPS_DB_HOST`, `ELIPS_DB_PORT`, `ELIPS_DB_NAME`, `ELIPS_DB_USER`, `ELIPS_DB_PASSWORD`.
  - The password type is *Password*.
  - Values are loaded by Implicit Context Load or TMC / TAC environment parameters.
  - They are never printed, and never written to the log.
- **Rules:** `CB_PO_RELEASED_STATUS` = '44', `CB_NOTES_SUFFIX` = '0', `CB_LOOKBACK_DAYS` (TBD, proposed 90), `CB_CHUNK_SIZE` (proposed 500), `CB_USER` (TBD), `CB_WAIT_ALERT_DAYS` (TBD), `CB_MODE` (A / B).
- **Schedule:** TMC / TAC plan, every N minutes (TBD, proposed 30 min), with no overlapping runs.

### 8.3 Files / jobs / objects to create or modify

| Object | Type | Action |
|---|---|---|
| `PAS_ELIPS_PR_PO_CALLBACK` | Talend job | **New** |
| Context groups `CTX_PAS_DB`, `CTX_ELIPS_DB`, `CTX_CALLBACK` | Talend context | **New** (`CTX_PAS_DB` may be shared with the forward job) |
| `<ELIPS_PAS_CALLBACK_RUN_LOG>`, `<ELIPS_PAS_CALLBACK_DETAIL_LOG>` | ELIPS DDL | **New**, proposed (OQ-C11) |
| `SA_DETAIL` | ELIPS DDL | Check / add `PAS_PR_NUMBER`, `PAS_PO_NUMBER` (character type), index on the SA number column |
| TB_R_PR_H index on `PR_DESC` | PAS DDL | Request to PAS (OQ-C08); no change by this project |
| Forward interface | Talend job | Align the PR_NOTES value (CB-01, forward OQ-08) |
| TMC / TAC schedule | Ops | **New** plan |
| SA Monitoring screen (ELIPS) | App | Read PR / PO from SA_DETAIL (OQ-C06). No change in this repository's mock-up logic; the mock-up already shows PAS PR / PO |

---

## 9. Assumptions and open questions

**Assumptions** (to be confirmed):
- PAS is SQL Server.
- One PR per SA, as in the forward interface (PR_DESC = SA_NUMBER).
- PO status `44` is stored as text or a number that compares to '44'.
- Callback values are written as text.

| # | Question | Owner |
|---|---|---|
| OQ-C01 | Relation between `TB_R_PO_H` and `TB_R_PR_H`: which table / columns (PO item → PR_NO + PR_ITEM_NO, or a PR number on the PO header)? Can one PR become several POs? | PAS |
| OQ-C02 | **PR_NOTES:** the forward interface inserts NULL today, and its computed value ends with '1'. Who sets PR_NOTES ending with '0', and when (Auto PO / Auto-Approval)? What do '0' and '1' mean? Must the forward interface insert `ILSTC_yyyyMMdd_0`? | PAS / Business |
| OQ-C03 | Column name and type of the PO status in `TB_R_PO_H` (value 44 = Released); column name of the PO number | PAS |
| OQ-C04 | `SA_DETAIL` structure: SA number column, item number column (= ITEM_NO sent as PR_ITEM_NO), PK, audit columns | ELIPS |
| OQ-C05 | Data types / lengths of `SA_DETAIL.PAS_PR_NUMBER` / `PAS_PO_NUMBER` and of the PAS PR_NO / PO number | ELIPS / PAS |
| OQ-C06 | PR / PO on SA_DETAIL (this requirement) vs on the SA header (SA Monitoring proposal): keep both, or detail only? | Business |
| OQ-C07 | Does `TB_R_PO_H` have a change / release timestamp for incremental mode B? | PAS |
| OQ-C08 | Index on `TB_R_PR_H.PR_DESC`? Read access for the Talend user to TB_R_PO_H / TB_R_PR_H / link table | PAS / DBA |
| OQ-C09 | ELIPS database engine, and connection details per environment | Infra |
| OQ-C10 | If ELIPS already has a different PR / PO (PO cancelled and re-created in PAS), may the callback overwrite it? Proposed: no, it is reported as VALUE_CONFLICT | Business |
| OQ-C11 | Log tables in ELIPS (proposed) or file / AMC log only? Who monitors failures and is notified (e-mail)? | ELIPS / Ops |
| OQ-C12 | Should the callback also set the ELIPS SA / daily order status (for example SA Monitoring *PO Received* / Daily order *SA Approved with PO Number*)? Not in scope of this requirement | Business |
| OQ-C13 | Schedule frequency and lookback window | Business / Ops |

---

## 10. SIT scenarios

| TC | Scenario | Expected result |
|---|---|---|
| TC01 | PO 4450288442 status 44, PR 5000269261, PR_NOTES ends '0', SA found | All target SA_DETAIL rows: PAS_PR_NUMBER '5000269261', PAS_PO_NUMBER '4450288442'; detail log UPDATED |
| TC02 | PO not released (status ≠ 44) | Not updated; SA stays pending |
| TC03 | PR_NOTES NULL / blank | Skipped NOTES_EMPTY; job does not fail |
| TC04 | PR_NOTES ends '1' / unexpected text | Skipped NOTES_NOT_0 |
| TC05 | Rerun with the same data | NO_CHANGE; no UPDATE; SA no longer pending |
| TC06 | ELIPS already holds a different PO | FAILED VALUE_CONFLICT; value not overwritten |
| TC07 | PR_DESC not found in ELIPS SA_DETAIL | FAILED SA_NOT_FOUND |
| TC08 | Item-level link: an ITEM_NO matches 2 rows / no row | FAILED MULTIPLE_DETAIL_MATCH / DETAIL_MISMATCH; rollback SA |
| TC09 | Two PRs with the same PR_DESC | FAILED AMBIGUOUS_PR |
| TC10 | Header-level link: two released POs for one PR | FAILED AMBIGUOUS_PO |
| TC11 | DB error while updating SA 2 of 3 | SA 2 rolled back (no partial rows); SA 1 and 3 updated |
| TC12 | PAS DB unavailable | Run FAILED; no ELIPS change; next schedule retries |
| TC13 | ELIPS DB unavailable | Run FAILED; file log; no partial update |
| TC14 | No released PO | Run SUCCESS with 0; info log |
| TC15 | 2,000 pending SAs | Read in chunks; PAS queried by PR_DESC only; duration within the schedule interval |
| TC16 | Item-level link, PR split into 2 POs | Each SA_DETAIL row gets the PO of its item |
| TC17 | Credentials | No password in the job log / run log / detail log |
