# ELIPS PR Creation: Process, Calculation and Validation Rules

PR Creation (menu **Monthly > PR Creation**) creates, per operational month, the route-based Purchase Requisition (PR) of every
trucking company (LP) paid By Resources. All trucking companies of one submission form **one approval bundle** with one PR Sequence;
the bundle is approved or rejected together in PR Approval and each approved PR becomes a PO.

**Revision 26-Nov-26 (user review):** PR Creation Type, Logistics Partner and the System Master setting removed from the screen;
**Generate Route Plan → Create PR** (calculate), **Create PR → Submit PR** (send to approval); bundle approval (no partial approval);
new List Summary columns / formulas; read-only detail pop-up. The Fixed Cost PR is no longer created here (OP-11).

- **Mock-up:** `monthly.html#pr-creation`
- **Rules:** [`pr-creation-rules.js`](../../../../../pr-creation-rules.js) · bundle approval: [`monthly-workflow.js`](../../../../../monthly-workflow.js) (`approveBundle`, `rejectBundle`)
- **Data sources:** [`pr-sources.js`](../../../../../pr-sources.js)
- **Unit tests:** [`tests/pr-creation.test.js`](../../../../../tests/pr-creation.test.js)
- **UISS:** [`UISS_Screen_PR_Creation.xlsx`](UISS_Screen_PR_Creation.xlsx) (rev 0.7)

---

## 1. Implementation approach (existing logic reused)

| Need | Existing logic / data reused |
|---|---|
| PR record, number, sequence | PR structure of `monthly.js`: PR number `{LP}{YY}{MM}{running no.}`, `rev` = PR Sequence, Production Month `MM/YYYY-seq`; `bundle` = `{YYYY-MM}#{seq}` |
| Approval hierarchy | `monthly-workflow.js`: levels `LEVELS` (SH, DpH, DH), Skip rule, PO creation after the last approval; applied to every PR of the bundle |
| Mileage Cost / Fixed Cost | Master Price (E-Catalogue): `MasterPrice.priceForPR` (Price per KM; Monthly Price for information) |
| Routes | Master Route Percentage: active routes, percentage and distance |
| Daily orders per LP | Master KPI: **Order Sharing = orders per day** (KP-09); defines the trucking companies of the list |
| Working days | TMMIN Calendar: working days per operational month |
| Creation period, creators | System Master parameter (read in the background) and authorization configuration (`pr-sources.js`) |
| Bundle storage | `ielp.CRITERIA_SCORE_HEADER` (CRITERIA_PERIODE + PR_SEQ + APPROVAL_STS) - existing table, no DB change |

---

## 2. Screen

| Section | Content |
|---|---|
| Header | Title "PR Creation - List Summary"; buttons **Create PR** (calculate), **Submit PR** (send the bundle to approval), **Export** (List Summary / Route Plan Detail .xls) |
| Parameters | **Operational Month*** only; **PR Sequence** (read only, one number for the bundle). Cancel resets |
| Alert | Only the view-only notice and the creation period error (no info chips, no abnormality alert) |
| List Summary | No., Trucking Company (all By Resources), Mileage Cost (IDR/Km), Fixed Cost (IDR/Month, information), Working Days, Delivery Cost (IDR/Day), Monthly Delivery Cost (IDR), Status, Detail. Total row: Fixed Cost, Delivery Cost, Monthly Delivery Cost. No check box, no PR Amount |
| Footer | "Showing x to y of z records", **Total PR Cost (bundle, n trucking companies)**, pager. Search on trucking company; Column show / hide |
| Detail pop-up | Read only, no header information: Route, Distance, Planned Cost, **Total Cost (IDR/Day)** row. Route Percentage and Number of Orders are not shown (still used in the calculation). Closed with × only |
| Status | Empty. Filled (red) only when the **Price per KM** of the detail is not found or is **0** |

Confirmation dialog before Submit PR (one line per trucking company, total, approval path, Current PIC). When Submit PR is not possible, a dialog lists the problems: price problems, other data errors (TMMIN Calendar, Route Percentage, Order Sharing, amount) and the trucking companies already in an active PR. Loading indicators while calculating and submitting. Toast on success.

---

## 3. Calculation

### 3.1 Fixed Cost

No longer created by this screen (OP-11). The Monthly Price is shown in the List Summary for information only (OP-16).

### 3.2 Route-Based PR (per trucking company)

```
Number of Orders (route, per day) = Order Sharing (Master KPI) × Route % ÷ Σ active Route %   (2 decimals)
Planned Cost (route)              = Distance (Km) × Mileage Cost (IDR/Km, E-Catalogue)
Total Cost (pop-up row)           = Σ Planned Cost of the routes                             (OP-14, decided by user review)
Delivery Cost (IDR/Day)           = Total Cost
Monthly Delivery Cost (IDR)       = Delivery Cost (IDR/Day) × Working Days (TMMIN Calendar)  = PR amount
```

Example (DNX, December 2026): route DPCMR_CYKRW Planned Cost 57 Km × IDR 2,700 = IDR 153,900; Total Cost = Σ Planned Cost of the
11 routes (393 Km × IDR 2,700) = IDR 1,061,100 = Delivery Cost / day; Monthly Delivery Cost IDR 1,061,100 × 22 = IDR 23,344,200.
Number of Orders (Order Sharing × Route % ÷ Σ Route %) is used only for the PR quantity (TOTAL_TRIP), not for the cost.

---

## 4. Rules

| ID | Rule |
|---|---|
| PC-01 | **Operational Month** is mandatory (the only parameter) |
| PC-02 | Only users in the authorization configuration may submit PR: **VPLD Staff** and **VPLD Section Head**. Others can calculate and view only (Submit PR disabled with a message) |
| PC-03 | **Creation period:** PR is created in Month N-1 for operational Month N. Month N itself is allowed only when the System Master parameter allows it; the parameter is read in the background (not on the screen). Not configured: error, no default. Past months and months after N+1 are rejected |
| PC-04 | Mileage Cost comes from E-Catalogue; a missing / expired / duplicated price or a price of **0** is an **abnormality** and the only content of the **Status** column. The Fixed Cost is information only |
| PC-05 | The calculation needs active Route Percentage data, TMMIN Calendar working days and the Order Sharing (> 0) of the trucking company; each missing item is an abnormality with its own message, not shown in the Status but listed when Submit PR is clicked |
| PC-06 | **Cost components:** one per route (`ROUTE:{code}`). A route already in a PR of the same trucking company and month cannot be created again. Rejected / Returned PRs do not count |
| PC-07 | **PR Sequence** = highest sequence of the **operational month** (all trucking companies, all statuses) + 1, the same for every trucking company of the bundle; numbers are never reused. Each trucking company keeps its own PR number; sequence > 1 links to its first PR |
| PC-08 | An additional bundle contains only the routes that are not yet in active PRs (e.g. a new route). A trucking company without new routes is not in the bundle (grey status) |
| PC-09 | The calculated amount must be greater than 0 (abnormality) |
| PC-10 | **Approval per bundle:** levels from the workflow configuration; approve / reject applies to every PR of the bundle, no partial approval. Submitted by VPLD Staff: SH → DpH → DH. By VPLD Section Head: SH is **Skip** and the bundle starts at DpH; the SH cannot approve it. Current PIC = submitter |
| PC-11 | Sequence and abnormalities are checked again right before saving (another user may have submitted in the meantime) |
| PC-12 | **All-or-nothing:** Submit PR is not possible while any trucking company has an abnormality (OP-13): the dialog lists the problems; if the final check fails nothing is created |

### Messages

| Case | Message |
|---|---|
| Mandatory | Operational Month is required. |
| Authorization | You are not authorized to create PR. PR Creation is available to VPLD Staff and VPLD Section Head. |
| Period | System Master parameter "Allow PR creation in current operational month" is not configured. … · PR for the current operational month ({ym}) cannot be created: not allowed by System Master. … · Operational Month {ym} has already passed. … · PR for Operational Month {ym} cannot be created yet. … |
| Status (price) | No Price per KM found in Master Price for {LP} period {YYYYMM}. · Price per KM of {LP} for period {YYYYMM} is 0 in Master Price. |
| Submit PR problem list | TMMIN Calendar (working days) for {ym} is not available. … · No active Route Percentage data. … · No Order Sharing for {LP} in Master KPI (By Resources). … · No orders are planned for {LP} in this month (Order Sharing = 0). · Calculated PR amount for {LP} is not valid … · Not in the new bundle - all routes already in an active PR: {LPs}. |
| Submit | Submit PR is not possible: {n} trucking company(ies) have an abnormality (see the list below and the Status column). Please correct the data first. · There is no trucking company with new routes to submit for this operational month. · PR Sequence {n} for {ym} already exists. Please click Create PR again. · Click Create PR first. |
| Success | PR bundle {ym} sequence {n} submitted: {n} PR ({PR numbers}). Status: Waiting SH / Waiting DpH. |

---

## 5. Sample data in the mock-up

- **December 2026:** bundle sequence 1 (AGR, DNX, GIB, JMP, PBM) was submitted by VPLD Staff, approved by SH and **rejected by DpH**, so the whole bundle went back to PR Creation; a new Submit PR becomes **sequence 2** with all routes. After that all rows show "Already in PR" and Submit PR is not possible (no new route).
- **Trucking companies:** the five companies paid By Resources (Master KPI). E-Catalogue prices were added for AGR and GIB so that December 2026 has no abnormality. PNJ / SRL (no Order Sharing) are not listed any more.
- **Abnormality demo:** remove a Price per KM (e.g. GIB 202612) in the test data: the Status shows the Master Price message and Submit PR is blocked.
- **TMMIN Calendar:** maintained for November 2026, December 2026 and January 2027 only. **System Master "PR in Month N":** not configured (read in the background).

---

## 6. Tests

`node tests/pr-creation.test.js` runs 15 tests (all passing): mandatory Operational Month; authorization; creation period; list of
trucking companies and E-Catalogue prices; detail formulas (orders per day, Planned Cost, Total Cost); Delivery Cost / Monthly Delivery
Cost; abnormalities; bundle plan with one sequence; Submit PR blocked by an abnormality (nothing created); Submit PR by VPLD Staff and
by VPLD Section Head (SH Skip); bundle approve / reject (no partial approval, PO per trucking company); sequence after a rejected bundle
and additional bundle with only new routes; sequence taken in the meantime; PR without bundle still approved alone.
The screens were also tested end to end with Playwright.

---

## 7. Open questions (TBD)

Revision 26-Nov-26 (default assumption in brackets; UISS Operation Desc 5.10):

11. **OP-11 PR type:** without PR Creation Type, does one Submit PR create Fixed Cost and Route-Based PR together, or is the Fixed Cost no longer created here? *(route-based only; list = trucking companies By Resources)*
12. **OP-12 Abnormality:** definition and text of the Status. *(user review: Status only for Price per KM not found or 0; calendar / route percentage / Order Sharing / amount listed in the Submit PR dialog; "Created" and grey status removed)*
13. **OP-13 Submit with an abnormal trucking company:** block the whole bundle? *(yes, blocked until corrected)*
14. **OP-14 Total Cost per route:** *decided (user review 26-Nov-26)*: Total Cost = Σ Planned Cost; Number of Orders not shown and not part of the cost.
15. **OP-15 Reject / Return of a bundle:** where do the trucking companies go back, and does the next submit use a new sequence? *(reject at any level rejects the whole bundle back to PR Creation; new sequence; a PO rejected by GA still returns only its own PR)*
16. **OP-16 Fixed Cost column:** still shown? *(yes, information only)*

Earlier questions (still open unless noted):

1. **Route-based formula** - superseded by the revision formulas (3.2); container size 20/40 ft and round trips are still not considered.
2. **Working days per LP:** the reference screen shows different working days per LP (22, 21, 20). The mock-up uses one TMMIN Calendar value per month.
3. **Reference total** (QWE 73,460,000 vs 73,960,000) - obsolete: Fixed Cost is no longer added to the Monthly Delivery Cost.
4. **Months after N+1:** may PR be created further ahead? The mock-up allows only next month (plus Month N by parameter).
5. **Mileage Cost component** - obsolete (no Fixed Cost type any more).
6. **Fixed Cost to SA** - see OP-11.
7. **Route Percentage total below 100%:** currently 95 %, orders split proportionally. Should PR creation be blocked until the total is 100 %?
8. **Route Percentage per LP:** the mock-up uses one route list for every LP. Is the percentage defined per LP?
9. **Additional sequence for changed quantities:** may a later bundle add more orders to a route already in an earlier PR (the mock-up blocks it)?
10. **Physical tables / APIs:** E-Catalogue interface, TMMIN Calendar table, System Master parameter key; bundle = `CRITERIA_SCORE_HEADER` (approval rows per bundle or per trucking company TBD).

## Database mapping (ELIPS schema, review 14-Nov-2026)

The UISS of this function were revised against `docs/db/ELIPS_Schema.sql` ([DB-R1]) and the conflicts were resolved by the decision of
14-Nov-2026 ([DB-R2]): **the existing application logic is kept**; where the existing table cannot hold it a DB change request (DCR) is raised
([../../review/12-db-change-requests.md](../../../../review/12-db-change-requests.md)). No sample data was available: value lists / status codes stay TBD.

- **UISS_Screen_PR_Creation** - tables: `ielp.CRITERIA_SCORE_APPROVAL`, `ielp.CRITERIA_SCORE_DETAIL_FINAL`, `ielp.CRITERIA_SCORE_DETAIL_ROUTE`, `ielp.CRITERIA_SCORE_HEADER`, `ielp.MS_ROUTE_DETAIL`, `ielp.MS_ROUTE_HEADER`, `ielp.MS_ROUTE_PRICE`, `ielp.MS_TRUCKING_COMPANY`, `ielp.TB_M_WORKING_CALENDAR`, `ielp.TB_R_PR_DAILY`
  - G-MO-01 PR document: Existing logic kept: one PR per trucking company (PR_NO_DET) under the period PR (CRITERIA_SCORE_HEADER). (no DB change)
  - G-MO-02 Approval levels: Existing logic kept: approval levels SH / DpH / DH; stored as APPROVAL_CLASS values with APPROVAL_STS. **DCR-34**: Register APPROVAL_CLASS / APPROVAL_STS values - data, no column change
  - G-PRC-01 (revision 26-Nov-26): route-based PR only; the Fixed Cost PR is no longer created by this screen (OP-11). One bundle = one `CRITERIA_SCORE_HEADER` row (CRITERIA_PERIODE + PR_SEQ), one `CRITERIA_SCORE_DETAIL_FINAL` row (PR_NO_DET) per trucking company. (no DB change)

Full lists: [../../review/07-gap-analysis.md](../../../../review/07-gap-analysis.md), [../../review/12-db-change-requests.md](../../../../review/12-db-change-requests.md), [../../review/10-tbd-list.md](../../../../review/10-tbd-list.md).
