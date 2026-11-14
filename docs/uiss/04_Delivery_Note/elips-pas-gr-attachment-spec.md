# ELIPS Surat Jalan PDF → PAS FTP for Auto GR – Talend Design

| Item | Value |
|---|---|
| Interface | PAS GR candidate (`TB_R_GR_IR`) → ELIPS Surat Jalan PDF → PAS FTP / SFTP → PAS indicators |
| Tool | Talend scheduled job; PAS DB-to-DB + ELIPS PDF (existing Delivery Note generator) + SFTP / FTP |
| Previous steps | [ELIPS → PAS PR](../17_PAS_PR_Interface/elips-pas-pr-interface-spec.md) · [PAS → ELIPS PR / PO callback](../17_PAS_PR_Interface/pas-elips-callback-spec.md) |
| ELIPS PDF | [Delivery Note / Surat Jalan spec](delivery-note-spec.md) · `dn-rules.js` · `dn-pdf.js` · `delivery-note.js` |
| UISS | [`../uiss/UISS_Batch_ELIPS_PAS_GR_Attachment.xlsx`](UISS_Batch_ELIPS_PAS_GR_Attachment.xlsx) |
| Status | Draft 0.1, 06-Nov-2026 – **analysis and design only, no implementation change** |

**Notation:**
- Names in `< >` are not in the supplied code or schema:
  - PAS: TBD - Requires PAS table/column confirmation;
  - ELIPS: TBD - Requires ELIPS table/column confirmation.
- **[C]** means confirmed from code or spec. **[A]** means assumption / needs confirmation.

---

## 0. Analysis before implementation (requirement §18)

### 0.1 What was analysed
- The forward interface (tJava, `current-tjava-json-to-pas.java`) and its DB-to-DB redesign.
- The PAS → ELIPS callback design.
- The ELIPS Delivery Note (Surat Jalan) mock-up: `dn-rules.js`, `dn-pdf.js`, `delivery-note.js`, `docs/uiss/04_Delivery_Note/delivery-note-spec.md`, UISS_Report_Delivery_Note.
- The SA Approval rules (`sa-rules.js`, `docs/uiss/05_SA_Approval/sa-approval-spec.md`).

Not available in this repository: the PAS Auto GR code, the `TB_R_GR_IR` / `TB_R_PO_H` DDL, any PAS FTP configuration, a Talend project, or ELIPS production code.

### 0.2 Findings

| # | Topic | CONFIRMED FROM CODE / SPEC | ASSUMPTION / NEEDS CONFIRMATION |
|---|---|---|---|
| 1 | How ELIPS creates / stores the PDF | **[C]** The Surat Jalan is **generated on the fly** on each request from the latest Daily Order cycle data. **No PDF is stored**: no BLOB, no file path, no batch (DN-R03).<br>It is exposed by the Base64 API `GET /api/delivery-note/{deliveryId}`, which returns `{ deliveryId, orderNo, cycle, fileName, contentType, size, dataHash, generatedAt, base64 }`. | **[A]** The endpoint path is TBD in the spec ("real endpoint not defined"). ELIPS production must provide the same API (OQ-G01). |
| 2 | ELIPS module / table / file | **[C]** Module Daily Monitoring › Order Detail › Cycle n › *Surat Jalan ELIPS*.<br>Generator: `dn-pdf.js` (jsPDF) and rules `dn-rules.js` (`model`, `api`, `checkPdfBase64`, `fileName`, `attachPAS`).<br>Data source: Daily Order + cycle (driver, plate, Start Cycle date, origin / destination, container). | **[A]** The physical ELIPS tables of Daily Order / cycle are TBD. |
| 3 | SA_DETAIL ↔ PDF | **[C]**<br>- One SA detail = one delivery = one **Daily Order** (`ORDER_NO`, sent to PAS in `MAT_DESC = ORDER_NO;ROUTE`).<br>- One Surat Jalan = one **cycle** (Delivery ID = No Cycle Order, format `^\d{6}C\d[A-Z]{2,5}\d{3}$`).<br>- An order has 1–5 cycles, so **one SA_DETAIL has 1..n PDFs**.<br>- The SA uses only finished cycles (SA-04). | **[A]** The `SA_DETAIL` column holding ORDER_NO, and how the cycles / No Cycle Orders of an order are read in ELIPS (OQ-G02). |
| 4 | TB_R_GR_IR ↔ PO | – | **[A]** Not in the supplied information: `<GR_PO_NO_COL>` (+ PO item?) (OQ-G03) |
| 5 | PO ↔ PR | – | **[A]** Not in the supplied information: `<PAS_PO_PR_LINK>` (same open point as callback OQ-C01) |
| 6 | Key TB_R_PO_H ↔ TB_R_PR_H | – | **[A]** Not in the supplied information (callback OQ-C01) |
| 7 | PAS PR / PO → ELIPS SA | **[C]**<br>- `TB_R_PR_H.PR_DESC = SA_NUMBER`.<br>- `TB_R_PR_ITEM.PR_ITEM_NO = ITEM_NO`.<br>- The callback writes `SA_DETAIL.PAS_PR_NUMBER / PAS_PO_NUMBER` (requirement). | **[A]** The SA_DETAIL key columns (callback OQ-C04) |
| 8 | PR_NOTES format / meaning | **[C]**<br>- The forward interface computes `"ILSTC_" + yyyyMMdd + "_1"`, but **inserts NULL**.<br>- Its code comments show the example `ILSTC_20250630_0`.<br>- The callback requires the last character to be '0'; this requirement turns '0' into '1'. | **[A]** Who sets the value ending '0'; the full format (pattern `ILSTC_yyyyMMdd_n`?); the meaning of 0 / 1 (OQ-G04 = callback OQ-C02). |
| 9 | TB_R_GR_IR.SOURCE_TYPE | **[C]** The required final value is `'1'`. | **[A]** The other values and their meaning (NULL / '0' / other?) and which value marks "waiting for ELIPS attachment" (OQ-G05). It is **not** the same column as `TB_R_PR_ITEM.SOURCE_TYPE` (TB_M_SYSTEM `SRCILS`) used by Auto PO; do not mix the two. |
| 10 | PAS FTP / SFTP, directory | – | **[A]** Protocol (SFTP or FTP), host, port, authentication, target directory and sub-folder rule (OQ-G06) |
| 11 | Attachment naming | **[C]**<br>- The ELIPS mock-up name is `SJ_<No Cycle Order>.pdf`, marked "TBD-04, not defined".<br>- **The SA number contains '/'** (`ILS/TR/{LP}/{YYMMDD}{NNNN}`, sa-rules `saNumber`), so it cannot be used unchanged in a file name. | **[A]** The PAS convention (OQ-G07). The proposal in §7 is **not implemented** until PAS confirms. |
| 12 | Existing Auto GR logic | – | **[A]** How PAS Auto GR finds the file: by name / folder, or by a DB attachment record? Does it read SOURCE_TYPE / PR_NOTES? Does it support several files per GR? (OQ-G08) |
| 13 | Talend pattern | **[C]** Forward: one tJava with JDBC, manual commit, `System.out`.<br>Designs in this repo:<br>- per-unit transaction;<br>- context variables;<br>- run log + detail log;<br>- tracking claim / reconciliation. | **[A]** Talend edition (TMC / TAC), the secret store, and the FTP components available. |

### 0.3 Critical findings

| ID | Finding | Design answer |
|---|---|---|
| **GR-01** | **The PDF is not stored in ELIPS.** It is generated per request (DN-R03). | Reuse the existing ELIPS Delivery Note Base64 API (`tRESTClient` / `tHttpClient`). No new storage or generator. |
| **GR-02** | **There is one PDF per cycle**, so one SA_DETAIL (order) has 1..5 PDFs, and a GR can map to several orders. "Multiple PDFs for one transaction" is the normal case, not an error. | All PDFs of the GR are uploaded **before** any indicator update. The PAS support for several files per GR must be confirmed (OQ-G08). A combined PDF would be a new ELIPS mechanism, so it is not proposed unless PAS requires one file. |
| **GR-03** | **PR_NOTES 0 → 1 also stops the callback** (the callback selects `RIGHT(PR_NOTES,1)='0'`). | A GR is eligible only when the callback is complete for its SA (`SA_DETAIL.PAS_PR_NUMBER / PAS_PO_NUMBER` filled and equal). |
| **GR-04** | **PR_NOTES is per PR (per SA); SOURCE_TYPE is per GR row.** A PR can have several GR rows. | PR_NOTES is updated once (first GR whose files are complete). For later GRs it is "already '1'", which is not an error. SOURCE_TYPE is updated per GR row by its unique key. |
| **GR-05** | Each generation embeds the print timestamp, so **the PDF bytes differ on every call**. The API `dataHash` is a hash of the data model, not of the file bytes. | Idempotency uses the GR key + Delivery ID + `dataHash` stored in the attachment log, not a byte comparison with the FTP file. |
| **GR-06** | FTP upload and DB update cannot be one atomic transaction. | Sequence:<br>1. upload to a temporary name;<br>2. verify;<br>3. rename to the final name;<br>4. one PAS DB transaction for PR_NOTES + SOURCE_TYPE.<br>If a crash happens after the upload, the next run finds the file in the attachment log and only repeats the DB update. |
| GR-07 | Not every PAS GR is an ELIPS GR. | Candidates are restricted to GRs whose PO → PR has `PR_DESC` = an ELIPS SA (and optionally `TB_T_JOB_AUTOPO.CREATED_BY = 'ILSTC'`). |

---

## A. Current architecture

```
ELIPS SA (VPLD approved) ─▶ Talend ELIPS→PAS PR ─▶ PAS PR / budget / TB_T_JOB_AUTOPO ─▶ PAS Auto PO + Auto-Approval ─▶ PO released (44)
                                                                                                   │
ELIPS SA_DETAIL.PAS_PR_NUMBER / PAS_PO_NUMBER ◀── Talend PAS→ELIPS callback (RIGHT(PR_NOTES,1)='0') ┘
PAS creates GR data ─▶ TB_R_GR_IR  (Auto GR waits for the attachment)
ELIPS Daily Monitoring › Order Detail › Cycle n ─▶ Surat Jalan PDF on the fly (Base64 API, deliveryId = No Cycle Order)
```

## B. Proposed architecture

```
Talend job ELIPS_PAS_GR_ATTACHMENT (scheduled, single instance)
 1 PAS: eligible GR (SOURCE_TYPE <> '1') ─ PO ─ PR (PR_DESC = SA, RIGHT(PR_NOTES,1) IN ('0','1'))
 2 ELIPS: SA_DETAIL of the SA, callback complete (PAS_PR / PAS_PO equal) ─▶ orders ─▶ finished cycles ─▶ Delivery IDs
 3 per GR: for every Delivery ID ─▶ ELIPS Base64 API ─▶ decode ─▶ validate (%PDF-, %%EOF, size, deliveryId / orderNo) ─▶ staging file
 4 SFTP: upload <name>.part ─▶ verify size ─▶ rename to <name>.pdf ─▶ attachment log UPLOADED
 5 all files of the GR uploaded? ─ no ─▶ GR stays eligible (retry)
                                  └ yes ─▶ PAS transaction: PR_NOTES last char 0→1 (if 0) + TB_R_GR_IR.SOURCE_TYPE = '1' (GR key) ─▶ COMMIT
 6 log GR result; delete staging files; run log totals ─▶ PAS Auto GR (existing) continues
```

Principles:
- Talend only reads PAS (except the 2 indicators) and only reads ELIPS (except its own log).
- PDF generation stays in ELIPS.
- Auto GR stays in PAS.

---

## C. Source-to-target mapping

| Source | Field | Target / Usage | Status |
|---|---|---|---|
| PAS TB_R_GR_IR | `<GR_KEY_COLS>` | GR identifier; WHERE key of the SOURCE_TYPE update; log | [A] OQ-G03 |
| PAS TB_R_GR_IR | `<GR_PO_NO_COL>` (+ `<GR_PO_ITEM_COL>`) | Link to the PO | [A] |
| PAS TB_R_GR_IR | SOURCE_TYPE | Eligibility (≠ '1'); target value '1'; before / after in the log | [C] column, [A] values |
| PAS TB_R_PO_H | `<PO_NO_COL>` | PAS PO Number (4450288442); file name; cross-check with SA_DETAIL.PAS_PO_NUMBER | [A] column name |
| PAS `<PAS_PO_PR_LINK>` | PR_NO (+ PR_ITEM_NO) | Link PO → PR | [A] |
| PAS TB_R_PR_H | PR_NO | PAS PR Number (5000269261); cross-check with SA_DETAIL.PAS_PR_NUMBER | [C] |
| PAS TB_R_PR_H | PR_DESC | = ELIPS SA_NUMBER, the transaction reference | [C] |
| PAS TB_R_PR_H | PR_NOTES | Processing indicator: eligible when ending '0' or '1'; target last char '1' | [C] column, [A] format |
| PAS TB_R_PR_ITEM | PR_ITEM_NO | = ELIPS ITEM_NO (item-level GR / PO link) | [C] |
| ELIPS SA_DETAIL | `<SA_NUMBER_COL>`, `<ITEM_NO_COL>` | Identify SA detail rows | [A] |
| ELIPS SA_DETAIL | PAS_PR_NUMBER, PAS_PO_NUMBER | Callback complete and equal to PAS (guard GR-03) | [C] |
| ELIPS SA_DETAIL | `<ORDER_NO_COL>` | Daily Order of the detail | [C] field ORDER_NO, [A] column |
| ELIPS Daily Order cycle | No Cycle Order (Delivery ID), cycle no, finish time | One PDF per finished cycle | [C] mock-up, [A] tables |
| ELIPS Delivery Note API | base64, fileName, size, dataHash, deliveryId, orderNo, cycle | PDF content (decoded); validation; idempotency hash | [C] mock-up API |
| Talend | file name (§7) | PAS FTP file | [A] OQ-G07 |
| Talend | context PAS_FTP_TARGET_DIR | FTP destination | [A] |

---

## D. SQL queries

### D.1 PAS – eligible GR candidates (chunked, read only)

```sql
SELECT TOP (:CB_BATCH_SIZE)
       GR.<GR_KEY_COLS>,                                  -- TBD - Requires PAS table/column confirmation
       GR.SOURCE_TYPE                AS SOURCE_TYPE_BEFORE,
       PO.<PO_NO_COL>                AS PAS_PO_NUMBER,
       PR.PR_NO                      AS PAS_PR_NUMBER,
       PR.PR_DESC                    AS SA_NUMBER,
       PR.PR_NOTES,
       L.<LINK_PR_ITEM_NO_COL>       AS PR_ITEM_NO        -- item-level link only
FROM   TB_R_GR_IR GR
JOIN   TB_R_PO_H  PO ON PO.<PO_NO_COL> = GR.<GR_PO_NO_COL>                      -- TBD
JOIN   <PAS_PO_PR_LINK> L ON L.<LINK_PO_NO_COL> = PO.<PO_NO_COL>                -- TBD
                          [AND L.<LINK_PO_ITEM_COL> = GR.<GR_PO_ITEM_COL>]       -- TBD, item level
JOIN   TB_R_PR_H  PR ON PR.PR_NO = L.<LINK_PR_NO_COL>
WHERE  (GR.SOURCE_TYPE IS NULL OR GR.SOURCE_TYPE <> '1')                         -- waiting value TBD (OQ-G05)
  AND  <GR_WAITING_FOR_ATTACHMENT_CONDITION>                                     -- TBD (e.g. GR status), OQ-G05
  AND  PR.PR_NOTES IS NOT NULL
  AND  RIGHT(RTRIM(PR.PR_NOTES), 1) IN ('0', '1')                                -- '1' = PR already flagged by an earlier GR (GR-04)
  AND  EXISTS (SELECT 1 FROM TB_T_JOB_AUTOPO J                                   -- ILS TC PRs only (confirmed columns)
               WHERE J.[TYPE] = 'PR' AND J.DOCUMENT_NO = PR.PR_NO AND J.CREATED_BY = 'ILSTC')
  AND  GR.<GR_CREATED_DT_COL> >= DATEADD(DAY, -:CB_LOOKBACK_DAYS, GETDATE())    -- TBD, limits the scan
ORDER  BY GR.<GR_CREATED_DT_COL>;
```

GRs whose PR_NOTES is NULL, empty, or in another format are not selected here. A diagnostic count query (the same joins, with the PR_NOTES condition negated) feeds the run log with `PRNOTES_UNEXPECTED`, so these GRs are visible without being processed.

### D.2 ELIPS – SA detail rows and their Daily Orders

```sql
SELECT D.<SA_NUMBER_COL>, D.<ITEM_NO_COL>, D.<ORDER_NO_COL>, D.PAS_PR_NUMBER, D.PAS_PO_NUMBER
FROM   SA_DETAIL D
WHERE  D.<SA_NUMBER_COL> = :SA_NUMBER
  [AND D.<ITEM_NO_COL>   = :PR_ITEM_NO];      -- item-level GR
```

Checks:
- at least 1 row;
- all rows have `PAS_PR_NUMBER = :PAS_PR_NUMBER` and `PAS_PO_NUMBER = :PAS_PO_NUMBER` (the callback is complete);
- item level: exactly 1 row.

### D.3 ELIPS – cycles of an order → Delivery IDs

```sql
SELECT C.<NO_CYCLE_ORDER_COL> AS DELIVERY_ID, C.<CYCLE_SEQ_COL> AS CYCLE_NO
FROM   <ELIPS_DAILY_ORDER_CYCLE> C                         -- TBD - Requires ELIPS table/column confirmation
WHERE  C.<ORDER_NO_COL> = :ORDER_NO
  AND  C.<FINISH_CYCLE_DT_COL> IS NOT NULL                 -- finished cycles = SA route legs (SA-04)
ORDER  BY C.<CYCLE_SEQ_COL>;
```

0 rows → `PDF_NOT_FOUND`. Delivery ID not matching `^\d{6}C\d[A-Z]{2,5}\d{3}$` → `INVALID_DELIVERY_ID`.

### D.4 PAS – indicator update (one transaction per GR, after all files are uploaded)

```sql
BEGIN TRAN;   -- SET XACT_ABORT ON on the connection

-- (1) PR_NOTES: change only the last character, only when it is '0' and the value is the one read in D.1
UPDATE TB_R_PR_H
SET    PR_NOTES = LEFT(RTRIM(PR_NOTES), LEN(RTRIM(PR_NOTES)) - 1) + '1'
       -- , CHANGED_BY = :CB_USER, CHANGED_DT = GETDATE()     -- only if PAS confirms (OQ-G09)
WHERE  PR_NO    = :PAS_PR_NUMBER
  AND  PR_NOTES = :PR_NOTES_READ                             -- optimistic check: unchanged since read
  AND  RIGHT(RTRIM(PR_NOTES), 1) = '0'
  AND  PR_NOTES LIKE :CB_PRNOTES_PATTERN;                    -- confirmed format, e.g. 'ILSTC[_]________[_]0' (OQ-G04)
-- rows = 1 → updated; rows = 0 → re-read: already ends '1' → OK (GR-04); otherwise → ROLLBACK, PRNOTES_CHANGED

-- (2) SOURCE_TYPE: exactly this GR row
UPDATE TB_R_GR_IR
SET    SOURCE_TYPE = '1'
WHERE  <GR_KEY_COLS> = :GR_KEY                               -- full unique key, never a broad filter
  AND  (SOURCE_TYPE IS NULL OR SOURCE_TYPE <> '1');
-- rows must be 1; rows = 0 and SOURCE_TYPE already '1' → ALREADY_DONE (no error); otherwise → ROLLBACK

COMMIT;
```

Until the PR_NOTES format is confirmed, `CB_PRNOTES_UPDATE_ENABLED = 'N'` keeps statement (1) disabled. GRs then stop at `WAIT_PRNOTES_CONFIRMATION` after the upload, and nothing is half-updated.

---

## E. Talend component flow

| # | Component | Purpose |
|---|---|---|
| 1 | `tPrejob` → `tMSSqlConnection` cnx_PAS (auto-commit OFF, `SET XACT_ABORT ON`), `tDBConnection` cnx_ELIPS (read + log), `tFTPConnection` cnx_FTP (**SFTP** if supported; key or password from the secret store) | Connections from context |
| 2 | `tDBRow` (log DB) | Run log START |
| 3 | `tMSSqlInput` (PAS) | D.1 candidates + diagnostic count |
| 4 | `tFlowToIterate` (per GR) | Unit of work = one GR |
| 5 | `tDBInput` (attachment log) | Already-uploaded files of this GR (idempotency) |
| 6 | `tDBInput` (ELIPS) D.2 → `tJavaRow` | SA detail checks (callback complete, unique match) |
| 7 | `tDBInput` (ELIPS) D.3 | Delivery IDs of the orders |
| 8 | `tFlowToIterate` (per Delivery ID) → `tRESTClient` / `tHttpClient` | ELIPS Delivery Note API `GET …/{deliveryId}` (endpoint TBD) with a service account |
| 9 | `tExtractJSONFields` → `tJava` | Decode Base64; validate (F.2); write `staging/<run>/<name>.part` |
| 10 | `tFTPFileExist` / `tFTPFileList` | Target file present? (G.3) |
| 11 | `tFTPPut` (file `.part`) → `tFTPFileProperties` (size) → `tFTPRename` (`.part` → `.pdf`) | Upload and verify |
| 12 | `tDBOutput` (attachment log) | Per file: UPLOADED / SKIPPED / FAILED |
| 13 | `tJava` | All files of the GR UPLOADED (this run or earlier with the same dataHash)? |
| 14 | `tMSSqlRow` × 2 (D.4) → `tMSSqlCommit` / `tMSSqlRollback` | Indicators |
| 15 | `tDBOutput` (GR log) | GR result, SOURCE_TYPE before / after, PR_NOTES status |
| 16 | `tFileDelete` | Remove staging files of the GR |
| 17 | `tLogCatcher` → rollback + file log; `tPostjob` → run log END, `tFTPClose`, `tDBClose` | Errors / summary |

---

## F. PDF retrieval mechanism

### F.1 Retrieval (reuse, no new mechanism)
- **Source:** the existing ELIPS Delivery Note generator, through its Base64 API.
  - Key: `deliveryId` = No Cycle Order.
  - Response: `deliveryId`, `orderNo`, `cycle`, `fileName`, `contentType`, `size`, `dataHash`, `base64`.
- **Authorisation:** a Talend service account with a role that can view all trucking companies (DN-R05). Its credential is kept in the secret store.
- **API errors:**

  | Response | Meaning | Handling |
  |---|---|---|
  | 404 | Not found | `PDF_NOT_FOUND` |
  | 409 `AMBIGUOUS_DELIVERY` | Delivery ID matches more than one cycle | `MULTIPLE_PDF` |
  | 422 `INCOMPLETE_DATA` | Mandatory data missing | `PDF_INCOMPLETE` |
  | 500 | Generation failed / corrupted | `PDF_INVALID` |
  | 504 / timeout | – | `PDF_TIMEOUT` (retry) |

- **Alternative:** if ELIPS production stores PDFs (BLOB or path) instead of generating them, Talend reads that store with the same validation. This must be confirmed (OQ-G01).

### F.2 Validation (before any upload)
1. HTTP 200, and `contentType = application/pdf`.
2. The response `deliveryId` equals the requested one, and `orderNo` equals the SA_DETAIL `ORDER_NO`. This is the "belongs to the correct SA" check.
3. Base64 decodes; decoded size > 0 and equal to `size`.
4. The bytes start with `%PDF-` and end with `%%EOF` (same rule as DN-R06).
5. The staging file is written and read back with the same size.
6. The file name ends in `.pdf`.
- Any failure → the file is not uploaded, and the GR stays eligible.

---

## G. FTP upload mechanism

1. **Protocol:**
   - Use **SFTP** if PAS supports it (`tFTPConnection` SFTP mode, key authentication preferred);
   - plain FTP only if PAS has no SFTP (OQ-G06), and then FTPS if possible.
2. **Target:** `PAS_FTP_TARGET_DIR` (+ sub-folder rule TBD, for example per date or per PO). The directory is created only if PAS allows it.
3. **Existing file check** (requirement §12):

   | Situation | Action |
   |---|---|
   | File in the target **and** in the attachment log as UPLOADED with the same dataHash | Skip the upload (`ALREADY_UPLOADED`) |
   | File in the target but not in the log, or with a different dataHash | **Do not overwrite.** `FILE_EXISTS` error, manual check. Overwrite only if `CB_REPLACE_EXISTING = 'Y'` (OQ-G10, cf. DN-R08 replace policy) |

4. **Upload:**
   - put `<name>.part`;
   - compare the remote size with the local size;
   - rename to `<name>.pdf`, so PAS never sees a partial file;
   - on failure, delete the `.part` file.
5. **Verify:** check that the final file exists with the expected size. Only then the attachment log row = UPLOADED.

### 7. File naming (proposal, not implemented until PAS confirms – OQ-G07)
- If PAS has a convention, use it.
- Otherwise the proposal is `ELIPS_<SA_NUMBER_SAFE>_<PO_NUMBER>_<DELIVERY_ID>.pdf`, for example `ELIPS_ILS-TR-PBM-2611050001_4450288442_261026C2PBM311.pdf`.
  - `SA_NUMBER_SAFE` = SA number with `/` and other characters not allowed in file names replaced by `-`.
  - `DELIVERY_ID` is needed because one GR has several PDFs (GR-02). `ELIPS_<SA>_<PO>.pdf` alone would not be unique.
- The pattern is a context variable (`CB_FILE_PATTERN`), not hard-coded.

---

## H. Database update logic
- **Order:** files uploaded and verified → PAS transaction (D.4) → commit. There is no indicator update without all files of the GR being UPLOADED.
- **PR_NOTES:**
  - Only the last character changes, and only `0 → 1`.
  - The value must be the one read (optimistic check) and match the confirmed pattern.
  - Already ending '1': no update (another GR of the same PR did it).
  - NULL, empty or unexpected: not selected or not updated, logged as `PRNOTES_UNEXPECTED`.
- **SOURCE_TYPE:**
  - updated by the full GR key, and must affect 1 row;
  - already '1' → `ALREADY_DONE`, no update.
- Any error → ROLLBACK of both statements. Uploaded files stay; the next run skips their upload (G.3) and repeats only D.4.

## I. Retry mechanism
- A failed GR keeps `SOURCE_TYPE ≠ '1'`, so it is selected again by the next run.
- The attachment log keeps the uploaded files, so there is no duplicate upload.
- Each failed attempt adds 1 to `RETRY_COUNT` in the GR log. After `CB_MAX_RETRY` (proposed 5) the GR is still selected, but processed at most once a day, and an alert is raised (`MAX_RETRY_REACHED`). Manual reset is done in the log (no PAS change).
- `PDF_TIMEOUT`, `FTP_CONNECTION` and DB errors are retried automatically. `PDF_INCOMPLETE`, `FILE_EXISTS` and `PRNOTES_UNEXPECTED` need a manual fix.

## J. Error handling

| # | Scenario | Code | Indicators | Retry |
|---|---|---|---|---|
| 1 | GR found, PR not identified | PR_NOT_FOUND | unchanged | auto |
| 2 | PR found, PO not identified (or GR → PO missing) | PO_NOT_FOUND | unchanged | auto |
| 3 | ELIPS SA not identified / callback not complete | SA_NOT_FOUND / CALLBACK_PENDING | unchanged | auto |
| 4 | ELIPS PDF not found (no finished cycle, API 404) | PDF_NOT_FOUND | unchanged | auto |
| 5 | PDF empty (0 byte) | PDF_EMPTY | unchanged | manual / auto |
| 6 | PDF invalid / corrupted (header, EOF, size, wrong deliveryId / orderNo) | PDF_INVALID | unchanged | auto |
| 7 | FTP connection fails | FTP_CONNECTION | unchanged | auto (run stops FTP part) |
| 8 | FTP authentication fails | FTP_AUTH | unchanged | after credential fix |
| 9 | FTP upload / rename / verify fails | FTP_UPLOAD | unchanged | auto |
| 10 | File already exists (not ours / different) | FILE_EXISTS | unchanged | manual (OQ-G10) |
| 11 | PR_NOTES unexpected format | PRNOTES_UNEXPECTED | unchanged | manual |
| 12 | SOURCE_TYPE already '1' | ALREADY_DONE | – | – (skipped) |
| 13 | DB update fails | DB_UPDATE_FAILED | rolled back | auto |
| 14 | Several ELIPS records match one GR (item level) / PR_DESC ambiguous | MULTIPLE_SA_MATCH | unchanged | manual |
| 15 | Several PDFs for one Delivery ID (API 409) | MULTIPLE_PDF | unchanged | manual |
| 16 | PAS / ELIPS DB connection failure | DB_CONNECTION | unchanged | next run |

Isolation: every GR is its own iteration and transaction, so an error never touches another GR. PR_NOTES is changed only by PR_NO with the optimistic check.

## K. Logging design
- Talend `tStatCatcher` / `tLogCatcher` → file / AMC.
- Proposed tables (placeholder names, ELIPS or integration DB; OQ-G11):
  - `<GR_ATTACH_RUN_LOG>`: `RUN_ID` (Talend job id / pid), `ENV`, `START_DT`, `END_DT`, `GR_CANDIDATE_CNT`, `GR_SUCCESS_CNT`, `GR_SKIPPED_CNT`, `GR_FAILED_CNT`, `FILE_UPLOADED_CNT`, `RUN_STATUS`, `MESSAGE`.
  - `<GR_ATTACH_GR_LOG>`: `RUN_ID`, `GR_KEY`, `PAS_PR_NUMBER`, `PAS_PO_NUMBER`, `SA_NUMBER`, `FILE_CNT`, `SOURCE_TYPE_BEFORE`, `SOURCE_TYPE_AFTER`, `PRNOTES_STATUS` (UPDATED / ALREADY_1 / DISABLED / UNEXPECTED), `RESULT` (SUCCESS / FAILED / SKIPPED), `REASON_CD`, `MESSAGE`, `RETRY_COUNT`, `CREATED_DT`.
  - `<GR_ATTACH_FILE_LOG>`: `RUN_ID`, `GR_KEY`, `DELIVERY_ID`, `ORDER_NO`, `CYCLE_NO`, `FILE_NAME`, `SOURCE_REF` (API + deliveryId), `FTP_DESTINATION` (host alias + path, no credentials), `FILE_SIZE`, `DATA_HASH`, `UPLOAD_STATUS` (UPLOADED / ALREADY_UPLOADED / FAILED), `REASON_CD`, `MESSAGE`, `CREATED_DT`.
- **Never logged:** passwords, keys, tokens, connection strings. The FTP host is logged as an alias from the context.

## L. Files / jobs / components to create or modify

| Object | Action |
|---|---|
| Talend job `ELIPS_PAS_GR_ATTACHMENT` | **New** |
| Context groups `CTX_PAS_DB`, `CTX_ELIPS_DB`, `CTX_PAS_FTP`, `CTX_GR_ATTACH` (env DEV / SIT / UAT / PROD) | **New** (PAS / ELIPS groups shared with the other jobs) |
| Secret store entries: PAS / ELIPS DB, FTP password / key, ELIPS API service account | **New** (Ops) |
| ELIPS Delivery Note Base64 API | **Reuse**. Confirm that it exists in production, plus a service account (OQ-G01) |
| Log tables (3, proposed) | **New** DDL (OQ-G11) |
| PAS `TB_R_PR_H.PR_NOTES`, `TB_R_GR_IR.SOURCE_TYPE` | Updated by the job (no DDL) |
| Forward interface | Must insert the PR_NOTES value ending '0' if PAS does not set it (OQ-G04 / forward OQ-08) |
| Callback job | No change. The GR job relies on its result (GR-03) |
| This repository's mock-up (`dn-rules.js`) | No change now. The file name convention is updated only after OQ-G07 |

## M. Assumptions requiring confirmation

| # | Question | Owner |
|---|---|---|
| OQ-G01 | Does ELIPS production generate the Surat Jalan on the fly (like the mock-up) with a Base64 API Talend can call (endpoint, auth, service account)? Or is the PDF stored (BLOB / path)? | ELIPS |
| OQ-G02 | SA_DETAIL → ORDER_NO column; ELIPS Daily Order cycle table (No Cycle Order, cycle no, finish time) | ELIPS |
| OQ-G03 | TB_R_GR_IR: unique key, PO (and PO item) columns, created-date column, GR status | PAS |
| OQ-G04 | PR_NOTES full format and meaning of the last digit 0 / 1; who sets '0' (the forward code inserts NULL) | PAS / Business |
| OQ-G05 | SOURCE_TYPE values and meaning; which value / condition means "waiting for ELIPS attachment" | PAS |
| OQ-G06 | PAS FTP: SFTP or FTP, host / port per environment, key or password, target directory and sub-folders, permissions (rename, list) | PAS / Infra |
| OQ-G07 | PAS attachment naming convention (proposal `ELIPS_<SA_SAFE>_<PO>_<DELIVERY_ID>.pdf`) | PAS |
| OQ-G08 | Auto GR: how is the file linked to the GR (name, folder, DB record)? Several files per GR allowed, or one combined PDF required? Does Auto GR read SOURCE_TYPE / PR_NOTES? | PAS |
| OQ-G09 | Should CHANGED_BY / CHANGED_DT of TB_R_PR_H / TB_R_GR_IR be set by Talend? | PAS |
| OQ-G10 | Existing file with different content: replace (DN-R08 REPLACED, rev + 1), version, or block? | Business / PAS |
| OQ-G11 | Where do the log tables live (ELIPS / integration DB / file only)? Who receives alerts? | Ops |
| OQ-G12 | Granularity: one GR per PO, per PO item (= SA detail), or per delivery (cycle)? | PAS |
| OQ-G13 | Schedule interval, lookback, batch size, max retry | Ops / Business |

---

## SIT scenarios

| TC | Scenario | Expected |
|---|---|---|
| TC01 | GR of PO 4450288442 / PR 5000269261, SA with 1 order × 2 finished cycles, callback done | 2 PDFs validated and uploaded; PR_NOTES …0 → …1; SOURCE_TYPE '1'; logs SUCCESS |
| TC02 | Second GR of the same PR | PDFs uploaded; PR_NOTES already '1' (ALREADY_1); SOURCE_TYPE '1' |
| TC03 | Callback not yet done (SA_DETAIL PAS_PO empty) | CALLBACK_PENDING; nothing uploaded; indicators unchanged |
| TC04 | API returns 422 / 404 for one cycle | GR FAILED; other files of the GR may be uploaded, **indicators unchanged**; retry next run |
| TC05 | PDF corrupted (no %%EOF) / 0 byte | PDF_INVALID / PDF_EMPTY; not uploaded |
| TC06 | Response deliveryId / orderNo different | PDF_INVALID (wrong transaction); not uploaded |
| TC07 | SFTP down / wrong password | FTP_CONNECTION / FTP_AUTH; no indicator change; no password in the log |
| TC08 | Upload breaks mid-file | `.part` deleted; FTP_UPLOAD; retry |
| TC09 | Crash after upload, before DB update | Next run: ALREADY_UPLOADED (log + same dataHash), then D.4; no duplicate file |
| TC10 | Target file exists, not in the log | FILE_EXISTS; not overwritten |
| TC11 | PR_NOTES NULL / 'ABC' | Not selected / PRNOTES_UNEXPECTED; counted in the run log |
| TC12 | SOURCE_TYPE already '1' | Not selected (or ALREADY_DONE); no upload |
| TC13 | DB update of SOURCE_TYPE fails | Both updates rolled back; retry only repeats D.4 |
| TC14 | Several SA_DETAIL rows for one item-level GR | MULTIPLE_SA_MATCH; nothing uploaded |
| TC15 | API 409 AMBIGUOUS_DELIVERY | MULTIPLE_PDF; nothing uploaded for that GR |
| TC16 | 3 GRs, the 2nd fails | GR 1 and 3 SUCCESS; GR 2 unchanged |
| TC17 | Rerun after SUCCESS | GR not selected; no upload; no update |
| TC18 | `CB_PRNOTES_UPDATE_ENABLED = 'N'` | Upload done; GR WAIT_PRNOTES_CONFIRMATION; no indicator change |
| TC19 | Non-ELIPS PAS GR | Not selected (no ILSTC Auto PO job / PR_DESC not an SA) |
| TC20 | SA number with '/' | File name sanitised; upload OK |
