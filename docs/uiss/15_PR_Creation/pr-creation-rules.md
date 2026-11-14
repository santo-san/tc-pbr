# ELIPS PR Creation: Process, Calculation and Validation Rules

PR Creation (menu **Monthly > PR Creation**) creates the monthly Purchase Requisitions (PR) for each Logistics Partner (LP / trucking company). There are two PR types:

1. **Monthly PR - Fixed Cost**: the Monthly Cost from E-Catalogue, paid once per month.
2. **Route-Based PR for LP Operations**: the planned route cost, based on Route Percentage and the TMMIN Calendar.

The created PRs use the existing PR structure and approval workflow, so they appear in PR Approval / PR Inquiry and become a PO after approval.

- **Mock-up:** `monthly.html#pr-creation`
- **Rules:** [`pr-creation-rules.js`](../../../pr-creation-rules.js)
- **Data sources:** [`pr-sources.js`](../../../pr-sources.js)
- **Unit tests:** [`tests/pr-creation.test.js`](../../../tests/pr-creation.test.js)
- **UISS:** [`docs/uiss/15_PR_Creation/UISS_Screen_PR_Creation.xlsx`](UISS_Screen_PR_Creation.xlsx)

---

## 1. Implementation approach (existing logic reused)

| Need | Existing logic / data reused |
|---|---|
| PR record, number, sequence | PR structure of `monthly.js`: PR number `{LP}{YY}{MM}{running no.}`, `rev` = PR sequence, Production Month shown as `MM/YYYY-seq` |
| Approval hierarchy | `monthly-workflow.js`: levels `LEVELS` (SH, DpH, DH), Skip rule, PO creation after the last approval. Nothing hard-coded in PR Creation |
| Monthly Cost / Mileage Cost | Master Price (E-Catalogue): `MasterPrice.priceForPR`. Fix Cost = Monthly Price; Mileage = Price per KM; expired prices are never used |
| Route plan | Master Route Percentage: active routes, distance and `MasterRoutePercentage.split` (orders split by percentage) |
| Daily orders per LP | Master KPI: **Order Sharing = daily QTY in PR creation** (KP-09) |
| Cost per delivery | Master Mileage: Variable Cost = Mileage (KM) × Price per KM |
| Working days | TMMIN Calendar: working days per operational month |
| Creation period, creators | System Master parameter and authorization configuration (`pr-sources.js`) |

The mock-up pages keep data in memory, so `pr-sources.js` holds the same records that the Master screens show (Pricing Data, Route Percentage, KPI). It reads them through the existing rule functions. In the application these are the existing tables and services; no new table or API is needed for them.

---

## 2. Screen

| Section | Content |
|---|---|
| Header | Title "PR Creation - List Summary", subtitle "Review and create Purchase Requisition for each trucking company"; buttons **Generate Route Plan**, **Create PR**, **Export** (List Summary / Route Plan Detail .xls) |
| Parameters | **PR Creation Type***, **Operational Month*** (month), **Logistics Partner*** (All or one), **PR Sequence** (read only). Cancel resets everything |
| Info chips | Creation period result, TMMIN Calendar working days, Route Percentage (number of active routes, total %), Total By Resource (Master KPI), System Master "PR in Month N" |
| List Summary | ☐, No., Trucking Company, PR Sequence (next; "adds to {initial PR}" for sequence > 1), Mileage Cost (IDR/Km), Fixed Cost (IDR/Month), Working Days, Delivery Cost (IDR/Day), Monthly Delivery Cost (IDR), PR Amount (IDR, selected type), Status, Detail. The Total row sums Fixed Cost, Monthly Delivery Cost and PR Amount |
| Footer | "Showing x to y of z records", **Total PR Cost (selected n)**, pager. Search on trucking company; Column show / hide |
| Detail pop-up | Logistics Partner, Operational Month, PR Sequence, PR type, Working Days, Order Sharing, Mileage Cost, Fixed Cost. Then the route table (Route, Route Percentage, Number of Orders, Working Days, Distance, Planned Cost, PR = "In {PR}" / New / No order) or the cost components (Monthly Cost, Mileage Cost) for the Fixed Cost type, with Total Cost. The table scrolls with sticky header and footer. **Close** / **Confirm & Create PR** |
| Status | **Ready** (what will be created), error in red (missing data / price), grey when the component is already in an earlier PR, blue **Created {PR No} ({status})** |

Confirmation dialog before submission (list, total, approval path, Current PIC). Loading indicators while calculating and submitting. Toast on success; failed partners are listed.

---

## 3. Calculation

### 3.1 Monthly PR - Fixed Cost

| Component | Source | Amount in this PR |
|---|---|---|
| **Monthly Cost** | E-Catalogue Fix Cost (Monthly Price) for the LP and period `YYYYMM` | Yes: PR amount = Monthly Cost |
| **Mileage Cost** | E-Catalogue Price per KM for the LP and period | No: shown as base price (IDR/Km); the amount comes from the route-based PR |

After approval and PO, the Monthly Cost transaction goes directly to SA (Service Acceptance), with no daily order realisation.

### 3.2 Route-Based PR

```
Monthly orders (LP)        = Order Sharing (daily QTY, Master KPI) × Working Days (TMMIN Calendar)
Orders per route           = Monthly orders split by Route Percentage (largest remainder; MasterRoutePercentage.split)
Planned Cost (route)       = Orders × Route distance (Km) × Mileage Cost (IDR/Km, E-Catalogue)
Route-Based PR amount      = Σ Planned Cost of the routes in this PR
Delivery Cost (IDR/Day)    = Σ Planned Cost of all routes ÷ Working Days
Monthly Delivery Cost      = Fixed Cost + Σ Planned Cost of all routes   (= Fixed Cost + Delivery Cost/Day × Working Days)
```

Example (DNX, December 2026):
- 4 orders/day × 22 working days = 88 orders.
- Route DPCMR_CYKRW (15%) gets 14 orders: 14 × 57 Km × IDR 2,700 = IDR 2,154,600.

The reference screen follows the same relation. For JMP: 50,000,000 + 1,250,000 × 22 = 77,500,000.

---

## 4. Rules

| ID | Rule |
|---|---|
| PC-01 | PR Creation Type, Operational Month and Logistics Partner are mandatory |
| PC-02 | Only users in the authorization configuration may create PR: **VPLD Staff** and **VPLD Section Head**. Others can generate and view the plan only (Create PR disabled with a message) |
| PC-03 | **Creation period:** PR is created in Month N-1 for operational Month N. Month N itself is allowed only when the System Master parameter allows it. If the parameter is not configured, an error is shown and no default is assumed. Past months are rejected, and months after N+1 are rejected (see open questions) |
| PC-04 | Monthly Cost and Mileage Cost come from E-Catalogue. Missing or expired prices block the PR with the Master Price message |
| PC-05 | Route-based PR needs active Route Percentage data, TMMIN Calendar working days, the LP's Order Sharing (Master KPI) and the Mileage Cost. Each missing item blocks with its own message |
| PC-06 | **Cost components:** Fixed Cost type = `FIX`; Route-based = one component per route (`ROUTE:{code}`). A component already in a PR of the same LP and operational month cannot be created again. PRs that are Rejected or Returned do not count |
| PC-07 | **PR Sequence** = highest existing sequence of the LP and month + 1 (Rejected / Returned included, so numbers are never reused). Each PR gets its own PR number. Sequence > 1 keeps a link to the initial PR (`parentPrNo`). Earlier PRs are never changed |
| PC-08 | An additional route-based sequence contains only the planned routes that are not yet in earlier PRs (e.g. a new route). If all routes are already included, it is blocked |
| PC-09 | The calculated PR amount must be greater than 0 |
| PC-10 | **Approval:** levels come from the workflow configuration. PR by VPLD Staff: SH → DpH → DH. PR by VPLD Section Head: SH is **Skip** (history note "SH Skip: PR created by SH") and the PR starts at DpH; the SH cannot approve his own PR. Current PIC = creator |
| PC-11 | Sequence and components are checked again right before saving (another user may have created a PR in the meantime) |
| PC-12 | Several LPs can be created in one submission. LPs with errors are not created and are listed; the others are created |

### Messages

| Case | Message |
|---|---|
| Mandatory | PR Creation Type is required. · Operational Month is required. · Logistics Partner is required. |
| Authorization | You are not authorized to create PR. PR Creation is available to VPLD Staff and VPLD Section Head. |
| Period | System Master parameter "Allow PR creation in current operational month" is not configured. Please contact the system administrator. · PR for the current operational month ({ym}) cannot be created: not allowed by System Master. … · Operational Month {ym} has already passed. … · PR for Operational Month {ym} cannot be created yet. … |
| Data | TMMIN Calendar (working days) for {ym} is not available. … · No active Route Percentage data. … · No Order Sharing for {LP} in Master KPI (By Resources). … · No orders are planned for {LP} … · No Monthly Price / Price per KM found in Master Price for {LP} period {YYYYMM}. (Master Price) |
| Duplicate | Monthly Cost of {LP} for this operational month is already included in PR {no}. It cannot be duplicated. · All planned routes of {LP} for this operational month are already included in PR {nos}. … |
| Amount | Calculated PR amount for {LP} is not valid (must be greater than 0). … |
| Success | {n} PR created: {PR numbers}. Status: Waiting SH / Waiting DpH. |

---

## 5. Sample data in the mock-up

- **December 2026 (DNX):** sequence 1 = Monthly Cost (VPLD Staff); sequence 2 = Route-based created by the SH before route D1_S1_D3 existed, so SH is Skip. A new route-based PR for DNX becomes sequence 3 with only D1_S1_D3, and a new Monthly Cost PR is blocked as a duplicate.
- **December 2026 (JMP):** Monthly Cost sequence 1 was rejected by the DpH, so the Monthly Cost can be created again as sequence 2.
- **AGR / GIB:** no E-Catalogue price → blocked.
- **PNJ / SRL:** no Order Sharing → no route-based PR, but a Fixed Cost PR is possible. SRL also has no Price per KM from October 2026.
- **TMMIN Calendar:** maintained for November 2026, December 2026 and January 2027 only.
- **System Master "PR in Month N":** *not configured* by default. It can be changed on the screen for testing.

---

## 6. Tests

`node tests/pr-creation.test.js` runs 12 tests (all passing):
- mandatory fields;
- authorization;
- creation period (N-1, N with parameter true / false / not configured, past, too far);
- E-Catalogue prices;
- route plan calculation;
- missing calendar / order sharing / route percentage / price;
- Fixed Cost PR by VPLD Staff;
- Route-Based PR by VPLD Section Head (SH Skip, SH cannot approve, DpH approves);
- additional sequences without duplicated components, with link to the initial PR;
- rejected PR does not block;
- several LPs with partial failure;
- amount > 0.

The screens were also tested end to end with Playwright.

---

## 7. Open questions (TBD)

1. **Route-based formula:** the mock-up chains the confirmed pieces as Order Sharing × Working Days split by Route Percentage, then orders × route Km × Price per KM. Please confirm this, or provide the exact formula of the current system (e.g. container size 20/40 ft, round trip, a price per route instead of per KM).
2. **Working days per LP:** the reference screen shows different working days per LP (22, 21, 20). The mock-up uses one TMMIN Calendar value per month. Is there an LP-specific calendar?
3. **Reference total:** on the reference, QWE shows 1,180,000 × 22 + 47,500,000 = 73,460,000 but displays 73,960,000. Which value is correct?
4. **Months after N+1:** may PR be created further ahead (e.g. Month N-2)? The mock-up allows only next month (plus Month N by parameter).
5. **Mileage Cost component:** is Mileage Cost only a base price (mock-up), or must it also be a separate PR line?
6. **Fixed Cost to SA:** does the Monthly Cost PR still need the full approval and PO before SA (mock-up), or does it go to SA right after creation?
7. **Route Percentage total below 100%:** currently 95%, and orders are split proportionally. Should PR creation be blocked until the total is 100%?
8. **Route Percentage per LP:** the mock-up uses one route list for every LP. Is the percentage defined per LP?
9. **Additional sequence for changed quantities:** may sequence 2 add more orders to a route that is already in sequence 1 (the mock-up blocks it as a duplicate component)?
10. **Physical tables / APIs:** E-Catalogue interface, TMMIN Calendar table, System Master parameter key, and the PR header / detail tables are still to be named.

## Database mapping (ELIPS schema, review 14-Nov-2026)

The UISS of this function were revised against `docs/db/ELIPS_Schema.sql` (revision marked [DB-R1]); see the section
"Database Specification (ELIPS AE070_ILS_DB)" in each UISS. No sample data was available, so value lists / status codes stay TBD.

- **UISS_Screen_PR_Creation** - tables: `ielp.CRITERIA_SCORE_APPROVAL`, `ielp.CRITERIA_SCORE_DETAIL_FINAL`, `ielp.CRITERIA_SCORE_DETAIL_ROUTE`, `ielp.CRITERIA_SCORE_HEADER`, `ielp.MS_ROUTE_DETAIL`, `ielp.MS_ROUTE_HEADER`, `ielp.MS_ROUTE_PRICE`, `ielp.MS_TRUCKING_COMPANY`, `ielp.TB_M_WORKING_CALENDAR`, `ielp.TB_R_PR_DAILY`
  - G-MO-01 PR document: CRITERIA_SCORE_HEADER (period, PR_NO) + CRITERIA_SCORE_DETAIL_FINAL (company, PR_NO_DET) -> Use PR_NO_DET per company (confirm)
  - G-MO-02 Approval levels: CRITERIA_SCORE_APPROVAL.APPROVAL_CLASS + APPROVAL_STS varchar(2) -> Level codes TBD
  - G-PRC-01 Fixed-cost PR: TB_R_PR_DAILY / TB_R_PR_SUMMARY (truck / driver / DOT / HOT model) -> Confirm the fixed-cost calculation model against these tables

Full lists: [../../review/07-gap-analysis.md](../../review/07-gap-analysis.md) (conflicts), [../../review/10-tbd-list.md](../../review/10-tbd-list.md) (TBD), [../../review/09-potential-application-bugs.md](../../review/09-potential-application-bugs.md).
