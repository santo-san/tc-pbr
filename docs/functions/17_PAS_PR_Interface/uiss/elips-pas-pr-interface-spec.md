# ELIPS TC-PBR → PAS Purchase Requisition Interface (Talend DB-to-DB) – Design

| Item | Value |
|---|---|
| Interface | ELIPS TC-PBR (SA) → PAS (PR, budget, Auto PO job) |
| Tool | Talend, DB-to-DB (replaces the JSON input of the current tJava job) |
| Current code | [`current-tjava-json-to-pas.java`](current-tjava-json-to-pas.java) (as provided, unchanged) |
| UISS | [`../uiss/UISS_Batch_ELIPS_PAS_PR_Interface.xlsx`](UISS_Batch_ELIPS_PAS_PR_Interface.xlsx) |
| Related | [SA Approval](../../05_SA_Approval/uiss/sa-approval-spec.md), [SA Monitoring](../../06_SA_Monitoring/uiss/sa-monitoring-spec.md) (PAS status / feedback on the ELIPS side) |
| Status | Draft 0.1, 05-Nov-2026 |

**Principle:** ELIPS owns the SA data and its approval. Talend only orchestrates. PAS owns PROCESS_ID, PR numbering, PR processing, budget and Auto PO. Talend creates **no PO** and contains **no new PAS business logic**; it calls the existing PAS logic exactly as the current tJava job does.

**Notation:**
- ELIPS physical tables are not in the supplied information. They are written as the placeholders `<ELIPS_SA_HEADER>`, `<ELIPS_SA_DETAIL>`, `<ELIPS_SA_SUBITEM>`, `<ELIPS_APPROVAL_HISTORY>` and `<ELIPS_PAS_FIX_PARAMETER>` (today the `FIX_PARAMETER` list of the JSON).
- Columns marked `*` are the JSON key names of the current interface. Their physical ELIPS column is **TBD - Requires ELIPS table/column confirmation**.
- `<ELIPS_SA_INTERFACE_STATUS>` is the proposed ELIPS tracking store (see D.3). Its name is a placeholder too.
- PAS table, column, SP and function names are taken **only** from the supplied code and requirement.

---

## A. Overview

### A.1 Scope
For every SA that is approved in ELIPS and ready to send, Talend:
1. reads the SA header, detail items and sub items from ELIPS;
2. creates one PAS PR with the same PAS logic as today: PROCESS_ID, PR number, TB_R/TB_T PR tables, `SP_ILS_GENERATE_PR_ITEM`, budget commitment, Auto PO job;
3. writes the PR number, or the error, back to ELIPS.

Out of scope:
- PO creation. It is done by the existing PAS Auto PO job, from `TB_T_JOB_AUTOPO`.
- The PO number feedback to ELIPS. That is a separate interface (SA Monitoring).

### A.2 Current solution (as-is)
A Talend job receives a JSON body (`resObj[]`). Each element holds:
- the header: `SA_NUMBER`, `TC_VENDOR_CD`, `TC_NAME`, `CREATED_BY`;
- `FIX_PARAMETER[]` (COLUMN / VALUE);
- `DETAIL_ITEM[]` (`ITEM_NO`, `SA_DET_NUMBER`, `COST`, `ORDER_FINISH_DATE`, `ROUTE`, `ORDER_NO`), each with `DETAIL_SUBITEM[]` (`SUB_ITEM`, `WBS_NO`, `SERVICE_TYPE`, `TARIF`, `GL_ACCOUNT`, `COST_CENTER_CD`).

One tJava component loops over the SAs on one PAS connection (`conn_tDBConnection_2`) and commits after each SA.

### A.3 Analysis of the current tJava code
Behaviour that the redesign keeps **unchanged** unless confirmed otherwise (observations A–E of the request):

| ID | Observation | Code |
|---|---|---|
| A | Header `DELIVERY_PLAN_DT` = run date (yyyy-MM-dd); the FIX VALUE is ignored. Item `DELIVERY_PLAN_DT` = date part of `ORDER_FINISH_DATE`. | FIX loop `DELIVERY_PLAN_DT`; item param 23 |
| B | `PROC_MONTH` = run date yyyyMM; the FIX VALUE is ignored. | FIX loop `PROC_MONTH` |
| C | `PR_NOTES` is computed as `ILSTC_yyyyMMdd_1` but **NULL** is inserted (`setString(20, null)`). Not changed silently: OQ-08. | header param 20 |
| D | `SA_DET_NUMBER` is read but not used. `MAT_DESC` = `ORDER_NO;ROUTE` on item and sub item (the old commented code used `SA_DET_NUMBER;ROUTE`). | item param 6, sub item param 5 |
| E | `SERVICE_TYPE` is read but not mapped. No target is invented: OQ-10. | sub item loop |

Defects and risks found in the current code. The redesign must fix those marked **Fix**:

| ID | Finding | Impact | Redesign |
|---|---|---|---|
| OBS-01 | **No rollback.** The outer `catch` only prints the error. Statements already executed for the failing SA stay pending on the shared connection and are committed by the `conn.commit()` of the next SA. | Partial PR (header without items, consumed number, budget without PR) | **Fix**: ROLLBACK per SA |
| OBS-02 | The numbering block returns `PR_NO = 'FAILED'` on error, but the code does not check it and inserts PR `'FAILED'`. | Wrong PR rows | **Fix**: stop the SA |
| OBS-03 | Duplicate SA: the header insert is skipped (`WHERE NOT EXISTS PR_DESC`), but a new PROCESS_ID, a TB_R_LOG_H row and a PR number (TB_M_DOC_NUMBERING / TB_H_DOCUMENT_NUMBER) are still consumed. Both SPs then run for a PR number that has no header. Rows affected are never checked. | Gaps in PR numbers; unknown SP effect | **Fix**: check PR_DESC first (J) |
| OBS-04 | Numbering loop: if the next number is already used (`@@EXIST > 0`), `CURRENT_NUMBER` is not advanced and the `WHILE` loop never ends. | Job hangs, locks held | PAS fix (OQ-04); Talend query timeout |
| OBS-05 | Numbering reads `TB_M_DOC_NUMBERING` without `UPDLOCK`, so two sessions can compute the same number. The `TB_H_DOCUMENT_NUMBER` check plus OBS-04 then hangs one of them. | Duplicate / hang under concurrency | PAS fix (OQ-04); single Talend instance |
| OBS-06 | `createdBy`, `processId` and `prType` are concatenated into the numbering SQL. | SQL injection; breaks on `'` | **Fix**: parameters |
| OBS-07 | PreparedStatements (log, TB_T_PR_H, items, sub items) are not closed. | Resource leak in long runs | **Fix** |
| OBS-08 | Item `MAT_NO`, `WBS_NO`, `WBS_NAME`, `GL_ACCOUNT` and `COST_CENTER_CD` = FIX `DEFAULT_VALUES`. FIX `MAT_NO` is used only on the sub item; FIX `WBS_NO` / `WBS_NAME` / `GL_ACCOUNT` are not used. | As-is | Keep |
| OBS-09 | Header `LOCAL_AMOUNT` = FIX `LOCAL_AMOUNT`, not the sum of item COST. | Header amount may be wrong | Keep; OQ-11 |
| OBS-10 | Item `PRICE_PER_UOM` = `ORI_AMOUNT` = `LOCAL_AMOUNT` = COST (no × PR_QTY, no × EXCHANGE_RATE). Sub item price / amounts = TARIF (no × SUBITEM_QTY). | As-is (correct only for qty 1, rate 1) | Keep; validate qty / rate (OQ-11) |
| OBS-11 | `SP_ILS_GENERATE_PR_ITEM` RESULT is only printed. Budget SP result and rows affected are not checked. | Silent failure | **Fix**: check |
| OBS-12 | `Integer.parseInt(divisionId)` throws when DIVISION_ID is empty or non-numeric, after all inserts. | Partial data (OBS-01) | **Fix**: validate first |
| OBS-13 | No duplicate guard on `TB_T_JOB_AUTOPO`. | Duplicate Auto PO job on re-run | **Fix**: NOT EXISTS (proposed) |
| OBS-14 | `TB_R_LOG_H`: `END_DT` = start time, `PROCESS_STATUS` = 1 and never updated. MODULE / FUNCTION are `'1'/'1'`, while `sp_PutLog` uses `'2'/'201002'`. | Log not meaningful | Keep; OQ-07 |
| OBS-15 | `ORDER_FINISH_DATE.split(" ")[0]`: no format validation. | Bad date reaches PAS | **Fix**: validate |
| OBS-16 | The internal transaction handling of the SPs is unknown. `sp_PutLog` rows written inside the transaction are lost on rollback. | Unknown rollback scope | OQ-05; error kept in ELIPS |
| OBS-17 | FIX values are only set when the key is present. A missing key gives `''` (strings), 0 (numbers) or 1 (EXCHANGE_RATE). FIX `CREATED_BY` overrides the header `CREATED_BY`. | Silent defaults | Validate mandatory keys (D.2) |
| OBS-18 | `DOC_DT` / `CREATED_DT` use the Talend JVM clock; other dates use the PAS `GETDATE()`. | Time difference | Keep; OQ-19 |
| OBS-19 | FIX parameters read but never inserted: `PR_ITEM_NO`, `MAT_DESC`, `WBS_NO`, `WBS_NAME`, `GL_ACCOUNT`, `ASSET_CLASS`, `ASSET_LOCATION`, `ASSET_NO`, `DELIVERY_ADDR`, `CANCEL_QTY`, `CHANGED_BY`, `PRICE_PER_UOM`, `ORI_AMOUNT`. | None | Keep (not mapped) |
| OBS-20 | Lock scope: the `TB_M_DOC_NUMBERING` row is locked from the numbering update until the commit (SPs included), which blocks PR creation of PAS online users for that prefix. | Waits in PAS | Short transaction per SA; serial processing |
| OBS-21 | One exception leaves the loop (the outer `try`), so the remaining SAs of the body are not processed. | One bad SA blocks the others | **Fix**: isolate per SA |

---

## B. Process flow

```
ELIPS (SA approved, READY)                Talend job                                   PAS
──────────────────────────                ──────────                                   ───
                               1 connect ELIPS (autocommit) + PAS (manual commit)
                               2 recover PROCESSING older than timeout ─────────────▶ SELECT TB_R_PR_H by PR_DESC
<ELIPS_SA_INTERFACE_STATUS> ◀─ 3 select READY / FAILED(retry<max)
                               ── per SA ──────────────────────────────────────────
<ELIPS_SA_INTERFACE_STATUS> ◀─ 4 claim → PROCESSING (commit ELIPS)
<ELIPS_SA_HEADER/DETAIL/..> ─▶ 5 read + validate (invalid → FAILED, PAS not touched)
                               6 duplicate check ───────────────────────────────────▶ TB_R_PR_H.PR_DESC = SA_NUMBER ? → SUCCESS
                               7 BEGIN TRAN ────────────────────────────────────────▶ fn_get_last_process_id, TB_R_LOG_H,
                                                                                      PR numbering (TB_M_PROCUREMENT_TYPE,
                                                                                      TB_M_DOC_NUMBERING, TB_H_DOCUMENT_NUMBER, sp_PutLog)
                               8 inserts ───────────────────────────────────────────▶ TB_R/T_PR_H, TB_R/T_PR_ITEM, TB_R/T_PR_SUBITEM
                               9 SPs ───────────────────────────────────────────────▶ SP_ILS_GENERATE_PR_ITEM, sp_prcreation_budgetProcessing,
                                                                                      TB_T_JOB_AUTOPO (eligible) → PAS Auto PO job (existing)
                              10 COMMIT  (any error 7-9 → ROLLBACK)
<ELIPS_SA_INTERFACE_STATUS> ◀─11 SUCCESS (PR_NO, PROCESS_ID) / FAILED (error, RETRY_COUNT+1)
                              12 end-of-run summary
```

---

## C. Talend job architecture

| Element | Design |
|---|---|
| Job | One job `ELIPS_PAS_PR_INTERFACE` (name TBD). It runs as a **single instance** (TAC / TMC: no parallel execution). |
| Connections | `cnx_ELIPS`: auto-commit **ON**, used for status updates (each update is its own commit). `cnx_PAS`: auto-commit **OFF**, `SET XACT_ABORT ON`, `SET LOCK_TIMEOUT` (TBD), query timeout (TBD, guards OBS-04). |
| Unit of work | One SA = one PAS transaction (`tFlowToIterate` over the SA list). |
| Subjobs | 1. Init / connect.<br>2. Recovery of stale PROCESSING.<br>3. Select eligible SA.<br>4. Per-SA iteration: claim, read, validate, duplicate check, PAS transaction, ELIPS status.<br>5. Summary / close. |
| PAS logic | Called exactly as today: `fn_get_last_process_id`, the numbering block, inserts, `SP_ILS_GENERATE_PR_ITEM`, `sp_prcreation_budgetProcessing`, the Auto PO insert. |
| Error isolation | A `try/catch` per iteration: ROLLBACK, ELIPS FAILED, continue with the next SA. A `tLogCatcher` / `tDie` covers job-level errors. |
| Context | `MAX_RETRY` (3), `PROCESSING_TIMEOUT_MIN` (30), `BATCH_SIZE` (TBD), `PAS_QUERY_TIMEOUT_S` (TBD), connection parameters. |
| Logging | Talend log (file / AMC), the ELIPS `ERROR_MESSAGE`, and the PAS `TB_R_LOG_H` + `sp_PutLog` as today. |

---

## D. ELIPS source requirement

### D.1 Source data (placeholders)

| Placeholder | Needed fields (JSON names of today) | Status |
|---|---|---|
| `<ELIPS_SA_HEADER>` | SA_NUMBER, TC_VENDOR_CD, TC_NAME, CREATED_BY | TBD - Requires ELIPS table/column confirmation |
| `<ELIPS_SA_DETAIL>` | ITEM_NO, SA_DET_NUMBER, COST, ORDER_FINISH_DATE, ROUTE, ORDER_NO (key to the header: TBD) | TBD - Requires ELIPS table/column confirmation |
| `<ELIPS_SA_SUBITEM>` | SUB_ITEM, WBS_NO, SERVICE_TYPE, TARIF, GL_ACCOUNT, COST_CENTER_CD (key to the detail: TBD) | TBD - Requires ELIPS table/column confirmation |
| `<ELIPS_APPROVAL_HISTORY>` | The condition "SA approved and ready to send to PAS" | TBD - Requires ELIPS table/column confirmation |
| `<ELIPS_PAS_FIX_PARAMETER>` | COLUMN / VALUE pairs (PR_TYPE, ITEM_TYPE, …, DEFAULT_VALUES), see E | TBD - Requires ELIPS table/column confirmation (OQ-03) |

The SA Approval and SA Monitoring mock-ups in this repository *propose* SA header / detail tables and a PAS status block. They are proposals, not confirmed ELIPS tables, so this design does not depend on them.

### D.1a Eligibility query (conceptual)
All names in `< >` and every column except the JSON field names are **TBD - Requires ELIPS table/column confirmation**. `APPROVAL_ROLE` / `APPROVAL_STATUS` and the values `'VPLD'` / `'APPROVED'` are the conceptual condition of the requirement, not confirmed ELIPS columns or codes.

```sql
SELECT H.SA_NUMBER, H.TC_VENDOR_CD, H.TC_NAME, H.CREATED_BY
FROM <ELIPS_SA_HEADER> H
JOIN <ELIPS_APPROVAL_HISTORY> A
     ON A.<SA_KEY> = H.<SA_KEY>                                   -- TBD
LEFT JOIN <ELIPS_SA_INTERFACE_STATUS> S
     ON S.SA_NUMBER = H.SA_NUMBER
WHERE A.APPROVAL_ROLE   = 'VPLD'                                  -- conceptual, TBD
  AND A.APPROVAL_STATUS = 'APPROVED'                              -- conceptual, TBD
  AND <LATEST_APPROVAL_CONDITION>                                 -- TBD: last approval row is not cancelled / re-opened
  AND ( S.SA_NUMBER IS NULL                                        -- <NOT_YET_INTERFACED_CONDITION>
        OR S.INTERFACE_STATUS = 'READY'
        OR (S.INTERFACE_STATUS = 'FAILED' AND S.RETRY_COUNT < :MAX_RETRY) )
  AND EXISTS (SELECT 1 FROM <ELIPS_SA_DETAIL> D WHERE D.<SA_KEY> = H.<SA_KEY>)   -- completeness pre-check
ORDER BY H.SA_NUMBER;
```

- **"Not processed by another run":** `PROCESSING` is excluded, and the claim UPDATE (step 4) must affect exactly 1 row.
- **Full completeness check:** done per SA in step 5 (D.2), so the reason can be stored.
- **If the tracking row is created at approval time by ELIPS:** the `S.SA_NUMBER IS NULL` branch is not needed (OQ-01 / OQ-02).

### D.2 Mandatory data (validated in step 5, before PAS is touched)
- **Header:** SA_NUMBER, TC_VENDOR_CD; CREATED_BY (from the header or FIX).
- **Detail:** at least one item; ITEM_NO unique per SA; COST numeric; ORDER_FINISH_DATE matches `yyyy-MM-dd[ HH:mm:ss]`; ORDER_NO and ROUTE present.
- **Sub item:** SUB_ITEM unique per item; TARIF numeric; WBS_NO, GL_ACCOUNT, COST_CENTER_CD present. An item without sub items: OQ-11.
- **FIX:**
  - PR_TYPE, DIVISION_ID (numeric), VALUATION_CLASS and SOURCE_TYPE present;
  - the keys PROC_MONTH and DELIVERY_PLAN_DT present (otherwise empty today, OBS-17);
  - numeric values parse.

### D.3 ELIPS interface status (proposed, ELIPS side)
The fields requested for tracking. The store is a separate ELIPS table or columns on the SA header (OQ-01). **No new PAS table is created.**

| Column | Type | Description |
|---|---|---|
| SA_NUMBER | VARCHAR(TBD) | Key; equals PAS `TB_R_PR_H.PR_DESC` |
| PROCESS_ID | VARCHAR(50) | PAS process id of the last attempt |
| PR_NO | VARCHAR(TBD) | PAS PR number |
| INTERFACE_STATUS | VARCHAR(10) | READY / PROCESSING / SUCCESS / FAILED |
| ERROR_MESSAGE | VARCHAR(2000) | Error of the last attempt |
| START_DT / END_DT | DATETIME | Start / end of the last attempt |
| RETRY_COUNT | INT | Failed attempts |
| CREATED_DT / CHANGED_DT | DATETIME | Audit |

**Status transitions:**

```
READY ──claim──▶ PROCESSING ──commit PAS + ELIPS──▶ SUCCESS
  ▲                  │  └─error, PAS rollback──▶ FAILED ──(RETRY_COUNT < max, next run)──▶ PROCESSING
  │                  └─timeout (recovery by PR_DESC)──▶ SUCCESS | FAILED
  └──────── user Resend (SA Monitoring) after correcting data ◀── FAILED
```

The SA Monitoring screen statuses map as follows: READY = *Not Sent*, PROCESSING = *Processing*, SUCCESS = *PR Received*, FAILED = *Failed*.

**Optional, separate PAS proposal (not part of this design):** a PAS-side interface log keyed by SA_NUMBER would let PAS users see attempts that were rolled back. It is not needed for correctness, because PR_DESC already identifies a committed SA.

---

## E. Mapping matrix

Only columns written by the current code are mapped. `*` = JSON key of today; the physical ELIPS column is TBD - Requires ELIPS table/column confirmation. "Not set" = column copied from a TB_R table where the interface did not fill it, so it stays NULL / column default.

<!-- MAPPING:BEGIN -->
<!-- MAPPING:END -->

---

## F. PAS tables used

| Table | READ | INSERT | UPDATE | LOOKUP | Purpose |
|---|---|---|---|---|---|
| TB_R_LOG_H | | ✔ | | | Process log header (PROCESS_ID) |
| TB_M_PROCUREMENT_TYPE | | | | ✔ | NUMBERING_PREFIX / PROCUREMENT_DESC by PR_TYPE |
| TB_M_DOC_NUMBERING | ✔ | | ✔ | | CURRENT_NUMBER, MAXIMUM_RANGE by NUMBERING_PREFIX + VARIANT |
| TB_H_DOCUMENT_NUMBER | ✔ | ✔ | | | Used numbers (DOC_NO, USED_STATUS) |
| TB_R_PR_H | ✔ (duplicate / recovery by PR_DESC) | ✔ | | | PR header |
| TB_T_PR_H | | ✔ | | | PR header work copy |
| TB_R_PR_ITEM | ✔ (copy, Auto PO) | ✔ | | | PR items |
| TB_T_PR_ITEM | ✔ (NOT EXISTS) | ✔ | | | Item work copy |
| TB_R_PR_SUBITEM | ✔ (copy) | ✔ | | | PR sub items |
| TB_T_PR_SUBITEM | ✔ (NOT EXISTS) | ✔ | | | Sub item work copy |
| TB_M_VALUATION_CLASS | | | | ✔ | PURCHASING_GROUP_CD by VALUATION_CLASS |
| TB_M_SYSTEM | | | | ✔ | AUTOPO / PURCHASING_GROUP_CD, SRCILS |
| TB_T_JOB_AUTOPO | ✔ (proposed guard) | ✔ | | | Auto PO job queue |
| Tables written inside the SPs | ? | ? | ? | ? | Not in the supplied information (OQ-05) |

---

## G. Stored procedures and functions

| Object | Call | Purpose | Result handling (redesign) |
|---|---|---|---|
| `dbo.fn_get_last_process_id()` | `SELECT dbo.fn_get_last_process_id()` | New PROCESS_ID | Empty / NULL → error. Uniqueness: OQ-06 |
| `dbo.sp_PutLog` | Inside the numbering block (MSG0000002 / MSG0000003 / EXCEPTION, module '2', function '201002') | PAS detail log | Unchanged; rows are lost on rollback (OBS-16) |
| PR numbering block | T-SQL batch (as today, but parameterised) | New PR_NO | 'FAILED' / NULL / timeout → error (OBS-02 / 04) |
| `dbo.SP_ILS_GENERATE_PR_ITEM` | `{call dbo.[SP_ILS_GENERATE_PR_ITEM](@PROCESS_ID)}` | PAS PR item processing | Read RESULT; success value TBD (OQ-05) |
| `dbo.sp_prcreation_budgetProcessing` | `(PROCESS_ID, DIVISION_ID int, PR_NO, SA_NUMBER, CREATED_BY, 'NEW_COMMIT', 0, 'SC')` | Budget commitment | Exception → error; return value TBD (OQ-05) |
| `dbo.fnSplitString` | `fnSplitString(SYSTEM_VALUE, ',')` | Split the AUTOPO purchasing groups | Lookup only |

---

## H. PR number flow (PAS logic, reused)
1. `@@PR_PREFIX = TB_M_PROCUREMENT_TYPE.NUMBERING_PREFIX` where `PROCUREMENT_TYPE = PR_TYPE`.
2. If no `TB_M_DOC_NUMBERING` row exists with `NUMBERING_PREFIX = SUBSTRING(prefix,1,2)` and `VARIANT = SUBSTRING(prefix,3,4)`: RAISERROR "Prefix for procurement type … not registered yet in doc. numbering master".
3. Loop:
   1. `NEW_SEQ = CURRENT_NUMBER + 1`.
   2. `PR_NO = NUMBERING_PREFIX + 8-digit NEW_SEQ`.
   3. If `MAXIMUM_RANGE` is reached: RAISERROR "Doc. Numbering for this prefix already reach maximum range".
   4. If PR_NO is not used in `TB_H_DOCUMENT_NUMBER` (other PROCESS_ID, `USED_STATUS 'Y'`): UPDATE `CURRENT_NUMBER`, INSERT `TB_H_DOCUMENT_NUMBER`, and leave the loop. Otherwise the loop repeats with the same number (OBS-04).
4. `sp_PutLog` logs start, success or exception. On exception the block returns `'FAILED'`.

**Redesign:**
- The block is sent with parameters (`?`) instead of concatenated values.
- It runs inside the SA transaction, so a rollback also returns the number: TB_M_DOC_NUMBERING and TB_H_DOCUMENT_NUMBER are rolled back, and the number is reused by the next PR.
- Talend treats `'FAILED'`, NULL or empty as an error.
- PAS is asked to fix the loop and add `UPDLOCK` (OQ-04). Talend does not change the PAS logic itself.

---

## I. Transaction, rollback and distributed consistency

### I.1 Per SA

```
ELIPS: UPDATE status = PROCESSING  (own commit)
PAS:   BEGIN TRAN  (XACT_ABORT ON)
         process id, TB_R_LOG_H, numbering, header, items, sub items,
         SP_ILS_GENERATE_PR_ITEM, budget SP, TB_T_JOB_AUTOPO
       COMMIT                               ── error → ROLLBACK (everything of this SA)
ELIPS: UPDATE status = SUCCESS / FAILED     (own commit)
```

- **Everything** of one SA is in one PAS transaction: PR rows, the PR number, the log header, the budget commitment and the Auto PO job.
- A failed SA leaves nothing in PAS. Other SAs are not affected.
- **SP risk (OQ-05):** if an SP runs its own `ROLLBACK`, it rolls back the outer transaction as well. SQL Server then raises error 266 / 3902 / 3903, and Talend treats it as a failure. If an SP catches an error and does not re-raise it, Talend cannot see it, so the SP results must be checked.
- **Keep the transaction short** (OBS-20):
  - no ELIPS reads inside it; all ELIPS data is read and validated before BEGIN;
  - SAs are processed serially.

### I.2 Distributed consistency between ELIPS and PAS
ELIPS and PAS are separate databases. There is **no distributed (2PC/XA) transaction**: the PAS commit and the ELIPS update are two separate commits. This gives the following cases:

| Case | State after the failure | Resolution |
|---|---|---|
| Error before / inside the PAS transaction | PAS rolled back; ELIPS PROCESSING → FAILED | Retry (next run) or Resend |
| Crash after the PAS COMMIT, before the ELIPS update | PR exists in PAS; ELIPS still PROCESSING | Next run, step 2: PR found by PR_DESC → SUCCESS with that PR_NO |
| PAS COMMIT outcome unknown (connection lost during the commit) | Unknown | Treat as unknown: leave PROCESSING. Step 2 decides by PR_DESC |
| ELIPS update fails after the PAS commit | PR in PAS; ELIPS PROCESSING | Same as above (reconciliation) |
| SA resent while the PR already exists | – | Step 6 duplicate check → SUCCESS, no second PR |

The design is safe because **PR_DESC = SA_NUMBER** is checked before any PR number is taken (step 6) and again by the header insert (`WHERE NOT EXISTS`, rows affected = 1). OQ-13 asks whether PAS has a unique index on it; without one, a single job instance is required.

---

### I.3 Requirement step 13 ("mark ELIPS SUCCESS before COMMIT")
The requirement lists the ELIPS SUCCESS update inside the transaction. That is only atomic if the ELIPS status is written **through the PAS connection in the same SQL Server transaction**. This is possible only when:
- ELIPS and PAS are databases on the same SQL Server instance (cross-database transaction), or
- MSDTC is used through a linked server.

Neither is confirmed (OQ-20). The design therefore does not depend on it:
- PAS is committed first.
- ELIPS is updated right after.
- The gap between the two commits is closed by the reconciliation by PR_DESC (I.2).

If OQ-20 confirms the same instance, step 11 can be moved inside the PAS transaction and the recovery remains a safety net.

**Rollback failure:** if the `ROLLBACK` itself fails (for example the connection is broken), SQL Server rolls back the open transaction when the session ends. Talend then:
1. closes and reopens the PAS connection before the next SA;
2. leaves the SA in **PROCESSING**, because the outcome is unknown;
3. lets the next run decide by PR_DESC.

## J. Idempotency
- **Key:** `SA_NUMBER` = `TB_R_PR_H.PR_DESC`.
- **ELIPS status:** READY / PROCESSING / SUCCESS / FAILED, plus PROCESS_ID, PR_NO, ERROR_MESSAGE, START_DT, END_DT, RETRY_COUNT, CREATED_DT, CHANGED_DT.
- **Claim (step 4):** `UPDATE … SET PROCESSING WHERE SA_NUMBER = ? AND INTERFACE_STATUS IN ('READY','FAILED')`. Rows affected must be 1; otherwise the SA is skipped. This protects against two runs.
- **Duplicate check (step 6):** an existing PR → SUCCESS with that PR_NO. No PROCESS_ID, number or SP call is consumed (fixes OBS-03).
- **Header insert** keeps `WHERE NOT EXISTS (PR_DESC)`. Rows affected = 0 means another session inserted the PR first: ROLLBACK, and step 2 / step 6 reconciles in the next run.
- **Auto PO:** proposed `AND NOT EXISTS (SELECT 1 FROM TB_T_JOB_AUTOPO WHERE TYPE = 'PR' AND DOCUMENT_NO = PR_NO)`.
- **Retry:** FAILED is retried automatically while `RETRY_COUNT < MAX_RETRY`. After that the user corrects the data and uses Resend (→ READY, RETRY_COUNT 0).

---

## K. Error handling

| # | Error | Detected in | Action | ELIPS status | Retry |
|---|---|---|---|---|---|
| 1 | ELIPS / PAS connection failed | Step 1 | Stop the run; nothing is claimed | – | Next run |
| 2 | No eligible SA | Step 3 | Info log; end | – | – |
| 3 | SA claimed by another run | Step 4 | Skip | unchanged | – |
| 4 | Missing header / detail / sub item / FIX key; invalid number or date; DIVISION_ID not numeric | Step 5 | PAS not touched | FAILED | After correction (Resend) |
| 5 | SA already in PAS (PR_DESC) | Step 6 | No insert | SUCCESS (reconciled) | – |
| 6 | PROCESS_ID empty | Step 7 | ROLLBACK | FAILED | Auto |
| 7 | Prefix not registered / maximum range / numbering 'FAILED' / timeout | Step 7 | ROLLBACK | FAILED | After PAS master fix |
| 8 | Insert error or rows affected ≠ expected (header 1, items = n, sub items = m) | Step 8 | ROLLBACK | FAILED | Auto |
| 9 | SP_ILS_GENERATE_PR_ITEM error / RESULT not success | Step 9 | ROLLBACK | FAILED | Auto / PAS admin |
| 10 | Budget SP error (budget / WBS / division) | Step 9 | ROLLBACK | FAILED | After budget fix |
| 11 | Auto PO insert error | Step 9 | ROLLBACK | FAILED | Auto |
| 12 | Deadlock / lock timeout / connection lost | Steps 7–10 | ROLLBACK | FAILED (unknown commit → PROCESSING) | Auto |
| 13 | Commit OK, ELIPS update failed | Step 11 | Leave as is | PROCESSING → reconciled next run | Auto |
| 14 | RETRY_COUNT = max | Step 3 | Not selected | FAILED | Manual Resend |
| 15 | Unexpected Talend error | Any | ROLLBACK current SA; job ends with error | PROCESSING → recovered | Next run |
| 16 | VPLD approval missing / withdrawn at processing time | Step 3 (query), re-checked in step 5 | Not selected, or FAILED "SA not approved by VPLD" | unchanged / FAILED | After approval |
| 17 | ROLLBACK fails (connection broken) | Step 10 | Close and reopen the PAS connection; outcome unknown | PROCESSING → reconciled next run | Next run |

The full message texts are in the UISS, sheet Logging Message.

---

## L. Auto PO flow (PAS logic, unchanged)
1. After the budget SP, inside the same transaction:

   ```sql
   INSERT INTO TB_T_JOB_AUTOPO ([TYPE], DOCUMENT_NO, PROCESS_ID, CREATED_BY, CREATED_DT, COUNT_RETRY, IS_SUCCESS)
   SELECT DISTINCT 'PR', @PR_NO, NULL, 'ILSTC', GETDATE(), 0, 0
   FROM TB_R_PR_ITEM pri
   JOIN TB_M_VALUATION_CLASS vc ON pri.VALUATION_CLASS = vc.VALUATION_CLASS
   JOIN (SELECT DISTINCT splitdata AS SYSTEM_VALUE
         FROM TB_M_SYSTEM, dbo.fnSplitString((SELECT SYSTEM_VALUE FROM TB_M_SYSTEM
                                             WHERE FUNCTION_ID = 'AUTOPO' AND SYSTEM_CD = 'PURCHASING_GROUP_CD'), ',')) pgc
     ON vc.PURCHASING_GROUP_CD = pgc.SYSTEM_VALUE
   WHERE pri.PR_NO = @PR_NO
     AND SOURCE_TYPE IN (SELECT SYSTEM_VALUE FROM TB_M_SYSTEM WHERE FUNCTION_ID = 'SRCILS')
     AND NOT EXISTS (SELECT 1 FROM TB_T_JOB_AUTOPO j WHERE j.[TYPE] = 'PR' AND j.DOCUMENT_NO = @PR_NO)   -- proposed guard
   ```

2. 0 rows means the PR is not eligible. It is not an error: the PR stays for the manual PAS PO process.
3. The existing PAS Auto PO job reads `TB_T_JOB_AUTOPO` and creates the PO. Talend does nothing more.
4. The PO number goes back to ELIPS through a separate interface (SA Monitoring, OQ-15).
5. As-is detail: the subquery `FROM TB_M_SYSTEM, dbo.fnSplitString(...)` is a cross join, de-duplicated by DISTINCT. It is kept unchanged.

---

## M. Talend component design

| # | Component | Setting / purpose |
|---|---|---|
| 1 | `tPrejob` → `tDBConnection` (ELIPS) | Auto-commit ON |
| 2 | `tDBConnection` (PAS, `tMSSqlConnection`) | Auto-commit OFF; `tDBRow`: `SET XACT_ABORT ON; SET LOCK_TIMEOUT n` |
| 3 | `tDBInput` (ELIPS) → `tFlowToIterate` | Stale PROCESSING list → recovery |
| 4 | `tDBInput` (PAS) | `SELECT PR_NO, PROCESS_ID FROM TB_R_PR_H WHERE PR_DESC = ?` (recovery and step 6) |
| 5 | `tDBInput` (ELIPS) | Eligible SA list (READY / FAILED < max; approval condition TBD) |
| 6 | `tFlowToIterate` | One iteration per SA |
| 7 | `tDBRow` (ELIPS) | Claim UPDATE; `tJava` checks rows affected = 1 |
| 8 | `tDBInput` × 3 (ELIPS) + `tDBInput` FIX | Header / detail / sub item / FIX for the SA; `tHashOutput` cache |
| 9 | `tJavaRow` / `tSchemaComplianceCheck` | Validation D.2 → reject flow |
| 10 | `tJava` (PAS logic, refactored from today's code) | Steps 7–9 with PreparedStatements on `conn_PAS`: process id, log, numbering, inserts, SPs, Auto PO. Checks rows / results; throws on error |
| 11 | `tDBCommit` (PAS) / `tDBRollback` (PAS) | On OK / on error of #10 (close = false, so the connection is reused) |
| 12 | `tDBRow` (ELIPS) | SUCCESS / FAILED update |
| 13 | `tLogCatcher` → `tDBRollback` + `tDBOutput` / file | Job-level error |
| 14 | `tPostjob` → `tDBClose` × 2, `tLogRow` / `tStatCatcher` | Summary |

**Alternative (as in the requirement sketch):**
- `tMap` → `tMSSqlOutput` (TB_R_PR_H / TB_R_PR_ITEM / TB_R_PR_SUBITEM) → `tMSSqlRow` (TB_T_* copies) → `tMSSqlSP` × 2 → `tMSSqlRow` (TB_T_JOB_AUTOPO) → `tMSSqlCommit`.
- It also works, provided that:
  - every component uses the **same** existing PAS connection (`Use an existing connection`, no commit per batch);
  - `Die on error` is on;
  - `OnSubjobError` → `tMSSqlRollback` → ELIPS FAILED;
  - the header uses `tMSSqlRow` (INSERT … SELECT … WHERE NOT EXISTS), because `tMSSqlOutput` cannot express the NOT EXISTS guard;
  - the number of rows inserted is checked (`NB_LINE_INSERTED`).

Keeping the PAS steps in one `tJava` (as today) instead of many `tDBOutput` components keeps the exact order of the PAS calls and the row checks in one place. The ELIPS reads move out of `tJava` into `tDBInput` components.

---

## N. Pseudocode

```text
main():
  log "started"
  elips = connect(ELIPS, autocommit=true)
  pas   = connect(PAS, autocommit=false); exec(pas, "SET XACT_ABORT ON; SET LOCK_TIMEOUT :t")
  recoverStale(elips, pas)
  for sa in elips.query(ELIGIBLE_SA, maxRetry):            -- READY or FAILED with RETRY_COUNT < max
      try processOne(sa) catch (e) log e                    -- one SA never stops the run
  log summary; close

recoverStale():
  for sa in elips.query("… INTERFACE_STATUS='PROCESSING' AND START_DT < now - timeout"):
      pr = pas.query1("SELECT PR_NO, PROCESS_ID FROM TB_R_PR_H WHERE PR_DESC = ?", sa.no)
      if pr: setStatus(sa, SUCCESS, pr) else setStatus(sa, FAILED, "Recovered after timeout", retry+1)

processOne(sa):
  if elips.update(CLAIM, sa.no) != 1: log "claimed by another run"; return
  data = readSa(elips, sa.no)                                -- header, items, sub items, FIX
  err = validate(data); if err: setStatus(sa, FAILED, err, retry+1); return
  pr = pas.query1("SELECT PR_NO, PROCESS_ID FROM TB_R_PR_H WHERE PR_DESC = ?", sa.no)
  if pr: setStatus(sa, SUCCESS, pr, "reconciled"); return
  processId = null; prNo = null
  try:
      processId = pas.scalar("SELECT dbo.fn_get_last_process_id()");  require(processId)
      pas.exec(INSERT_TB_R_LOG_H, processId)
      prNo = pas.scalar(PR_NUMBERING_BLOCK, createdBy, processId, prType)   -- parameterised, query timeout
      require(prNo and prNo != 'FAILED', "PR number generation failed")
      require(pas.exec(INSERT_TB_R_PR_H … WHERE NOT EXISTS PR_DESC) == 1, "duplicate / header not inserted")
      pas.exec(INSERT_TB_T_PR_H, prNo, processId)
      for it in data.items:
          require(pas.exec(INSERT_TB_R_PR_ITEM, …, prNo) == 1)
          pas.exec(INSERT_TB_T_PR_ITEM, prNo, processId)
          for s in it.subitems:
              require(pas.exec(INSERT_TB_R_PR_SUBITEM, …, prNo) == 1)
              pas.exec(INSERT_TB_T_PR_SUBITEM, processId, prNo, processId)
      res = pas.call("SP_ILS_GENERATE_PR_ITEM", processId);  require(isSuccess(res))        -- success value TBD
      pas.call("sp_prcreation_budgetProcessing", processId, int(divisionId), prNo, sa.no, createdBy, 'NEW_COMMIT', 0, 'SC')
      autoPo = pas.exec(INSERT_TB_T_JOB_AUTOPO_IF_ELIGIBLE, prNo, 'ILSTC', prNo, prNo)         -- 0 or 1
      pas.commit()
  catch e:
      pas.rollback()
      setStatus(sa, FAILED, message(e), retry+1, processId); return
  try setStatus(sa, SUCCESS, prNo, processId)
  catch e: log "PR created but ELIPS not updated"            -- stays PROCESSING, recovered next run
```

---

## O. SIT scenarios

| TC | Scenario | Pre-condition | Expected result |
|---|---|---|---|
| TC01 | SA VPLD approved and eligible | SA approved by VPLD, status READY, valid data; valuation class / source type eligible for Auto PO | 1 PR: TB_R/T_PR_H, _ITEM, _SUBITEM; TB_R_LOG_H; number in TB_H_DOCUMENT_NUMBER; CURRENT_NUMBER + 1; both SPs run; 1 TB_T_JOB_AUTOPO row; ELIPS SUCCESS with PR_NO / PROCESS_ID |
| TC02 | SA not approved by VPLD | SA without VPLD approval (or rejected / pending) | Not selected by the eligibility query; nothing in PAS; ELIPS status unchanged |
| TC03 | SA already interfaced | (a) ELIPS SUCCESS; (b) ELIPS READY but a PR with PR_DESC = SA exists | (a) not selected; (b) SUCCESS (reconciled) with the existing PR_NO. No new PROCESS_ID, number, SP call or PR |
| TC04 | Header exists but item missing | SA header without detail items | FAILED at validation ("detail item missing"); PAS not touched; no PR number consumed |
| TC05 | One SA with multiple items | 3 detail items | 1 TB_R_PR_H; 3 TB_R_PR_ITEM + 3 TB_T_PR_ITEM; PR_ITEM_NO = ITEM_NO; MAT_DESC = ORDER_NO;ROUTE; DELIVERY_PLAN_DT = date of ORDER_FINISH_DATE |
| TC06 | One item with multiple sub items | 1 item × 3 sub items | 3 TB_R_PR_SUBITEM + 3 TB_T_PR_SUBITEM with PR_ITEM_NO / ITEM_NO of the parent; WBS / GL / cost center / TARIF per sub item |
| TC07 | PR number generation failure | PR_TYPE without TB_M_DOC_NUMBERING row, or maximum range reached | Numbering returns 'FAILED' → ROLLBACK: no PR rows, no TB_R_LOG_H, TB_M_DOC_NUMBERING unchanged; ELIPS FAILED with the PAS message |
| TC08 | SP_ILS_GENERATE_PR_ITEM failure | SP raises error / RESULT not success | ROLLBACK of all PR rows and the PR number; ELIPS FAILED |
| TC09 | Budget processing failure | Budget insufficient / WBS invalid | ROLLBACK; ELIPS FAILED. (DIVISION_ID non-numeric: FAILED at validation, PAS untouched) |
| TC10 | Eligible for Auto PO | Item VALUATION_CLASS → PURCHASING_GROUP_CD in TB_M_SYSTEM AUTOPO, SOURCE_TYPE in SRCILS | 1 TB_T_JOB_AUTOPO row ('PR', PR_NO, NULL, 'ILSTC', GETDATE(), 0, 0); PAS Auto PO job creates the PO |
| TC11 | Not eligible for Auto PO | Purchasing group or source type not configured | PR created, ELIPS SUCCESS, no TB_T_JOB_AUTOPO row (to be confirmed as PAS business rule) |
| TC12 | Rerun after SUCCESS | Run the job again | SA not selected; no PAS change; no second Auto PO job |
| TC13 | Rerun after FAILED | SA FAILED (e.g. TC08), cause fixed | SA retried (RETRY_COUNT < max); exactly 1 PR / item set / sub item set; no leftover rows from the failed attempt |
| TC14 | Multiple SAs in one batch | SA1 valid, SA2 budget error, SA3 valid | SA1, SA3 SUCCESS and committed; SA2 FAILED and rolled back alone; SA3 gets the next PR number |
| TC15 | PAS committed, ELIPS update fails | Simulate ELIPS down after the PAS commit | SA stays PROCESSING; next run after the timeout → SUCCESS with the same PR_NO; no second PR |
| TC16 | Retry limit | SA fails MAX_RETRY times | Not selected again; Resend → READY, RETRY_COUNT 0, processed |
| TC17 | Concurrency | Job started twice / PAS online user creates a PR at the same time | One run claims the SA; no duplicate PR / number; no hang (query timeout, OBS-04) |
| TC18 | As-is regression | Same SA through the old and the new job | Same values per mapping (PR_NOTES NULL, PROC_MONTH / header DELIVERY_PLAN_DT = run date, VENDOR_CD = TC_VENDOR_CD) |
| TC19 | Connection lost inside the transaction | Kill the PAS session during an insert | SQL Server rolls back; FAILED, or PROCESSING → recovered; no partial PR |
| TC20 | Invalid data | COST 'abc', ORDER_FINISH_DATE '31/13/2026', missing FIX key | FAILED with field and reason; PAS not touched |

---

## P. Open questions

<!-- OQ:BEGIN -->
<!-- OQ:END -->

## Database mapping (ELIPS schema, review 14-Nov-2026)

The UISS of this function were revised against `docs/db/ELIPS_Schema.sql` ([DB-R1]) and the conflicts were resolved by the decision of
14-Nov-2026 ([DB-R2]): **the existing application logic is kept**; where the existing table cannot hold it a DB change request (DCR) is raised
([../../review/12-db-change-requests.md](../../../review/12-db-change-requests.md)). No sample data was available: value lists / status codes stay TBD.

- **UISS_Batch_ELIPS_PAS_PR_Interface** - tables: `ielp.LOG_ITGPAS`, `ielp.SA_DETAIL`, `ielp.SA_HEADER`, `ielp.SA_WBS_PERCENTAGE`, `ielp.TB_M_SYSTEM`
- **UISS_Batch_PAS_ELIPS_PR_PO_Callback** - tables: `ielp.LOG_ITGPAS`, `ielp.SA_DETAIL`

Full lists: [../../review/07-gap-analysis.md](../../../review/07-gap-analysis.md), [../../review/12-db-change-requests.md](../../../review/12-db-change-requests.md), [../../review/10-tbd-list.md](../../../review/10-tbd-list.md).
