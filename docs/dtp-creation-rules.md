# ELIPS TC-PBR DTP Creation (Planning Order): Process and Validation Rules

**DTP (Daily Trucking Plan) Creation** is used by the **VPLD Planner** to create the trucking delivery orders that go to the trucking company (LP). TC-PBR uses **one Universal DTP model** for both Import and Export.

- **Menu:** Daily > **Planning Order** (`index.html#planning-order`). Daily now has three sub menus: Daily Monitoring, Planning Order and Planning Truck Assignment ([truck-assignment-spec.md](truck-assignment-spec.md)).
- **Rules:** [`dtp-rules.js`](../dtp-rules.js)
- **UI:** [`dtp.js`](../dtp.js)
- **Unit tests:** [`tests/dtp-creation.test.js`](../tests/dtp-creation.test.js)
- **Excel template:** based on `format_DTP2_1.xlsx`
- **UISS:**
  - [`UISS_Screen_DTP_Creation.xlsx`](uiss/UISS_Screen_DTP_Creation.xlsx) (screen)
  - [`UISS_Batch_DTP_Excel_Upload.xlsx`](uiss/UISS_Batch_DTP_Excel_Upload.xlsx) (upload backend)
  - [`UISS_Batch_DTP_Queue_Processing.xlsx`](uiss/UISS_Batch_DTP_Queue_Processing.xlsx) (processing queue)

```
DTP Calendar → Select Date → Universal DTP → DTP Creation → Upload Excel / Manual Entry / IPMS Interface
→ Delivery Grid → Select Deliveries → Submit DTP → Processing Queue → LP Admin (Daily order: Planning Order / DTP Creation Release)
```

---

## 1. Screens

### 1.1 DTP Calendar

| Element | Content |
|---|---|
| Toolbar | ‹ › Today, month title, view **Month / Week / Day** |
| Info | System Master range: *backdate n day(s), advance n day(s) → selectable dd-Mon-yyyy to dd-Mon-yyyy*; view-only notice for users who are not VPLD Planner |
| Day cell | **Selectable** (white, "+ DTP" on hover), **Disabled** (hatched, outside the System Master range, click shows the reason), **Today** (blue number), **Selected** (navy outline) |
| Entries | One entry per date and DTP type of the Daily orders: `DTP - U ( dd/mm/yyyy ) [ assigned / total ]` (U = Universal; older orders show DTP 1-4). "+n more" opens the Day view. Clicking an entry opens the **DTP Maintenance** list of that date and type (§1.4); Daily Monitoring is reachable from there |
| Draft badge | "n open · n in queue" for DTP records of the date that are not processed yet |
| Legend | Waiting Assignment (blue), Assigned to Truck (green), Rejected by LP (red), Order Finish (navy); Selectable / Disabled / Today / Selected |

Entry colour (orders of the date and type):
- **Order Finish**: every order is Finish / SA / PO.
- **Rejected by LP**: at least one order was rejected by the LP and is still in Planning Order.
- **Assigned to Truck**: every order has a truck.
- **Waiting Assignment**: in all other cases.

### 1.2 Universal DTP selection (modal)

Title `Planning order form #dd/mm/yyyy`, *Choose Transaction Type**, banner "Please select the Universal DTP", one card **Universal DTP (Import / Export)**. **Next** is enabled after the card is selected and opens DTP Creation for that date (`#planning-order/YYYY-MM-DD`), so the date stays in the URL.

### 1.4 DTP Maintenance (calendar entry → "DTP n List")

Opened by clicking a calendar entry (`#planning-order/maint/YYYY-MM-DD/<type>`). It lists the Daily orders of that date and DTP type, so the planner can **change or cancel / delete** a DTP as long as the driver has **not started**. Rules: `dtp-rules.js` `maintValues`, `maintCheck`, `maintValidate`, `maintSave`; tests `tests/dtp-maintenance.test.js` (9).

| Element | Content |
|---|---|
| Header | `Daily Plan Date : dd/mm/yyyy` · link *Open in Daily Monitoring* · Demo menu · `▸ DTP n - Maintenance` (Universal DTP for DTP Creation orders) |
| Bar | Title **DTP n List**, **Delete Selected (n)**, **Restore Selected (n)**, "n selected", Search (from 3 characters), **Kolom** (show / hide columns) |
| Columns | Options (checkbox; label *Delete* when the row is marked), Round Use, Truck Company, Renban, From, To, Destination, ETD, Ctr Size, Agent, Ctr Book No, Container No (read only: entered by the driver at Pick Up), Ctr Type (GP / HC), Ctr DG ?, Vessel, Truck Type, Description, Service Type (Container for Export / Import = Import/Export of the record), Shift, Arr. Date, Arr. Time, Order No, Driver Status |
| Footer | Showing x to y of n records, pager; **Back** (asks before discarding unsaved changes), **Cancel** (discard pending changes), **Save** |

| ID | Rule |
|---|---|
| MT-01 | A row can be changed or cancelled only while the driver has not started: order Planning Order / Order Release and no cycle with Start Cycle (same rule as DTP Switching). Started rows are read only and their checkbox is disabled with the reason. |
| MT-01a | **Multiple delete:** a checkbox per row and **Select All** in the Options header (all rows of the current search, every page, that can still be deleted; started rows are excluded and their checkbox is disabled). **Delete Selected** marks every selected row for deletion at once (one row: select only that row), **Restore Selected** removes the mark of the selected marked rows. There is no ✕ button per row. The deletion is executed with **Save** (MT-04), together with other changes, in one confirmation. A row whose driver starts meanwhile leaves the selection. |
| MT-02 | Only the VPLD Planner may change / cancel (DT-01). Other roles see the list read only. |
| MT-03 | Changed cells are highlighted. Save validates with the DTP Creation rules (DT-04..DT-10: mandatory fields, mapping codes, From ≠ To, formats, options; Ctr Size + Ctr Type must give 20 / 40 / 40 HC / 45). Errors are shown per cell and in a list; nothing is saved. Orders without a DTP record (older DTP 1-4 data) are checked on the order fields only. |
| MT-04 | Save asks for confirmation (list of cancellations and changes) and runs as one transaction, all-or-nothing (as Submit DT-15). **Cancel**: the Daily order is cancelled (removed for LP Admin, Truck Assignment and the driver; truck released) and the DTP record is deleted, with a history note. **Change**: the DTP record and the Daily order (LP, From / To, Renban, Shift, planned cycles, DTP details) are updated, with an order history row *DTP Maintenance*. |
| MT-05 | The driver status is checked again at Save; if any row started meanwhile, nothing is saved and the rows are listed. |
| MT-06 | Another Truck Company on an assigned / accepted order releases the truck and the LP decision; the order is back to Planning Order and the new LP must accept and assign again. |
| MT-07 | Cancelled DTP no longer consume the Master KPI Order Sharing (§4a). |
| MT-08 | Mock-up: changes of orders without a DTP record are kept only until reload; DTP Creation orders are rebuilt from the stored DTP records. |

### 1.3 DTP Creation

| Section | Content |
|---|---|
| Header | **Daily Plan Date**, **DTP Model: Universal DTP**, **Operation Type** Import / Export (applies to uploaded and manual records), **Planner** (logged-in user), Demo menu (simulate IPMS error, simulate submission failure, reset demo data) |
| Upload Excel | Filename, **Choose File** (.xlsx / .xls), **Download Template** |
| Manual Entry | Form with all template fields plus Import/Export, Exporter, Importer CD; **+ Add to Grid** / Clear |
| Interface Data (IPMS) | Number of records received for the date; **Load / Refresh from IPMS** |
| Grid toolbar | **Select All** (eligible rows of the current filter) with "n Selected", **Delete** (selected Excel / Manual records), filters Status / Source / Import-Export, Search, Kolom |
| Grid | ☐, Options (✎ Edit, 🗑 Delete, ↻ Retry, ⓘ History), **Import/Export, Exporter, Importer CD, Container No., Renban, ETD Based, Vessel Name, Data Source, Status**, LP, Order No. Other template columns are available via Kolom. Header click sorts; 25 / 50 / 100 rows per page |
| Footer | ← Back (calendar); summary "n record(s) selected · n validation error · n in queue · n processed"; **Cancel** (clear selection); **Submit DTP (n)** |

Rows that are not selectable are greyed and their check box is disabled. Rows with a validation error are red; the error text is shown on the status badge and in the Edit dialog.

---

## 2. Data sources and the Excel template

| Source | How it arrives | Notes |
|---|---|---|
| **IPMS Interface** | Received automatically per planning date; **Load / Refresh from IPMS** asks for new records | Invalid interface records stay in the grid with **Validation Error** (never dropped) and can be corrected with Edit. They cannot be deleted |
| **Excel Upload** | Template upload | Operation Type from the header. Exporter / Importer CD are not in the template |
| **Manual Entry** | Form | Same validation as upload and interface |

**Template columns** (header row found by the cell `ROUNDUSE`, as in `format_DTP2_1.xlsx` row 7; * = mandatory):

ROUNDUSE*, LP*, RENBAN*, FROM LOCATION*, TO LOCATION*, DESTINATION*, ETD*, CONTAINER SIZE*, SHIPPING AGENT, CTR BOOKING NO, VESSEL NAME, TRUCK TYPE*, CONTAINER NO, DESCRIPTION, SHIFT, CTR DG FLAG, ARRIVAL DATE, ARRIVAL TIME.

The **DATA MAPPING** sheet lists the codes:

| Kind | Codes in the mock-up |
|---|---|
| LP | PBM, PNJ, SRL, TFL, SML (the trucking companies of Daily Monitoring) |
| FROM | D1 Depo Sunter, D2 Depo Cikarang, D3 Depo Cakung Marunda |
| TO | K1E CY TMMIN Karawang (EMPTY), S1E CY TMMIN Sunter (EMPTY) |

Download Template creates `Format_DTP_Universal.xlsx` with the same layout and both sheets.

---

## 3. Status of a DTP record

| Status | Meaning | Selectable |
|---|---|---|
| Available | Valid, not selected | Yes |
| Validation Error | Fails a validation (interface record or edit); fix with Edit | No |
| Ready to Submit | Valid and selected | Yes (selected) |
| Submitted | Submitted by the planner | No |
| Queued | In the processing queue | No |
| Processing | Picked up by the background service | No |
| Processed | Daily order created; visible for the LP Admin (Daily Monitoring, Planning Order / DTP Creation Release) | No |
| Failed | Processing failed (retryable); reason on the badge; **Retry** sends it to the queue again | No (Retry) |

```mermaid
stateDiagram-v2
  [*] --> Available : valid record (IPMS / Excel / Manual)
  [*] --> ValidationError : invalid record (IPMS)
  ValidationError --> Available : Edit and re-validate
  Available --> ReadyToSubmit : select
  ReadyToSubmit --> Available : unselect / Cancel
  ReadyToSubmit --> Submitted : Submit DTP (confirmed)
  Submitted --> Queued
  Queued --> Processing
  Processing --> Processed : Daily order created
  Processing --> Failed : processing error
  Failed --> Queued : Retry
  Processed --> [*]
```

---

## 4. Rules

| ID | Rule |
|---|---|
| DT-01 | Only the **VPLD Planner** can create DTP. Other users see the calendar and grid read only |
| DT-02 | **Date range from System Master:** the planning date must be between today − *backdate days* and today + *advance days*. Mock-up: 3 / 14. Dates outside are disabled. If the range is not configured, no date is selectable and the message says so |
| DT-03 | One **Universal DTP** model for Import and Export; Operation Type is a record field |
| DT-04 | Mandatory: all template columns marked * and Import/Export |
| DT-05 | ROUNDUSE Y / N; CONTAINER SIZE 20 / 40 / 40 HC / 45; SHIFT DAY / NIGHT (optional); CTR DG FLAG blank or DG |
| DT-06 | LP, FROM and TO must exist in the data mapping; TO ≠ FROM |
| DT-07 | RENBAN, DESTINATION, CTR BOOKING NO, IMPORTER CD: letters and numbers, max 20 |
| DT-08 | ETD / ARRIVAL DATE valid dates (Excel date, serial number, `yyyy-mm-dd` or `dd/mm/yyyy`); ARRIVAL TIME HH:MM |
| DT-09 | CONTAINER NO (when filled) must pass the ISO 6346 check digit (same rule as Daily Monitoring) |
| DT-10 | **Duplicates:** key = Container No, otherwise Ctr Booking No. Not allowed twice in one file, not if it already exists in the grid, and not if it was already submitted. Failed records do not block |
| DT-11 | **Upload:** wrong file type or header → whole file rejected. Any invalid row → **no row is added**; every error is listed per row and column (downloadable). The planner corrects the file and uploads again |
| DT-12 | Manual entry and Edit use the same validations. Only valid manual records are added |
| DT-13 | Only **Available / Ready to Submit** rows can be selected. Submit is disabled without a selection |
| DT-14 | **Submit** asks for confirmation: "Submit n delivery record(s) as DTP for dd-Mon-yyyy? Submitted records cannot be submitted again." Cancel / Confirm Submit |
| DT-15 | On success the records become Submitted and leave the selectable set at once; then Queued → Processing → Processed / Failed. If the submission itself fails, nothing changes and the records stay selected |
| DT-16 | **No double submission after refresh:** the record status is stored (mock-up: browser storage), and submitted records stay locked after reload |
| DT-17 | **Processed:** one Daily order per record (type `Universal`, status Planning Order / DTP Creation Release, supplier = LP, From / To names, Renban, Shift, Planned Cycle = 2 if ROUNDUSE = Y else 1). The LP Admin sees it in Daily Monitoring |
| DT-18 | **Failed** shows the reason (e.g. LP Admin service timeout) and can be retried |
| DT-19 | **Reject by LP** (new action for the LP Admin in Daily Monitoring, order still in Planning Order without truck, reason ≥ 10 characters). The calendar shows **Rejected by LP**; Assign Truck and Order Release are blocked for that order |
| DT-20 | IPMS interface error: message, nothing received, retry later |
| DT-21 | **DTP Switching** (rollback): Submitted / Queued / Failed records, and Processed records whose driver has not started (Daily order Planning Order / Order Release, no Start Cycle), can be rolled back to **Available**. Processed: the Daily order is cancelled and the truck assignment released. Checked again immediately before the rollback; all-or-nothing; history kept. See [dtp-switching-spec.md](dtp-switching-spec.md) |

---

## 4a. DTP Creation vs Master KPI monitoring

A collapsible panel above the delivery grid shows, for the planning date shown and per trucking company, two tables:
- **By Resources:** Order Sharing % (information only), **Daily Trip** (typed limit per day), Assigned DTP (by resource), **Remaining Slot**, Usage %, Status, Selected (not yet submitted), After Submit, Rejected by LP. A company that is also By Trip shows "total n = x by resource + y by trip" and *Full → By Trip* when its limit is reached.
- **By Trip:** Order Sharing %, **Daily Trip** (limit per day = trips per day shared by %, KP-15), Trips by trip today, **Remaining Trip**, Usage %, Status, Selected, After Submit, and the Total By Trip row (red warning when the % total ≠ 100).

| ID | Rule |
|---|---|
| KM-01 | **Per date and trucking company:** quantities of different dates are never combined. Rows are the LP codes of the data mapping, plus any LP found in the records of the date. |
| KM-02 | **Limit** = Daily Trip of the applicable By Resources Master KPI row (typed; the Order Sharing % is only shown) (`MasterKpi.applicable`). Master KPI has one current row per company and no validity period (KP-01); with an effective period the rule is DTP date within effective from – to (TBD). Payment Type must be *By Resources*. |
| KM-03 | **Unit:** Order Sharing is the daily order share (daily QTY of PR Creation, KP-08 / KP-09). One DTP record = one Daily order, so **Assigned** = number of DTP records of the date and LP that consume the allocation. |
| KM-04 | **Consuming:** Submitted, Queued, Processing, Processed, Failed. **Not consuming:** Available, Ready to Submit, Validation Error, rolled back by DTP Switching (back to Available), and a Processed order rejected by the LP Admin (shown as *Rejected by LP*). The Failed and LP-rejected rules are TBD. |
| KM-05 | **Remaining** = max(0, Limit − Assigned); **Over Allocation** = Assigned − Limit when > 0 (red, never hidden); **Usage %** = Assigned / Limit × 100. Colours: green < 80 %, yellow ≥ 80 % (threshold TBD), red ≥ 100 % (existing status badge colours). |
| KM-06 | **Dynamic:** recalculated from the records on every grid change (select, submit, queue result, DTP Switching, LP reject); no page reload. |
| KM-07 | **No blocking:** DTP Creation has no limit rule, so Submit is not blocked. The confirmation shows a warning when *After Submit* exceeds the limit or the LP has no Master KPI. |
| KM-09 | **Trips by trip:** for a company with a By Resources row and a By Trip row, the trips up to its By Resources limit count *by resource*, the trips above it count *by trip* (not as over allocation). For a By Trip only company every trip counts by trip. A By Resources only company keeps the over allocation of KM-05. |
| KM-10 | **Daily Trip** (trip limit) of a By Trip company = its part of the **trips per day** (Master KPI KP-15 / KP-16: 1 trip each, the rest by Order Sharing %; reference 20 trips → 2 / 1). Every eligible By Trip company (share > 0) is listed, also without trips on the date. |
| KM-11 | **Remaining Trip** = max(0, Daily Trip − Trips by trip); **Over Limit** when trips exceed the limit; Usage % and colours as KM-05. After Submit adds the selected records the same way (first up to the By Resources limit, the rest by trip). |
| KM-12 | **Total By Trip** of Master KPI must be 100.00%; otherwise a warning is shown above the By Trip table (not blocking). |
| KM-13 | **Payment Type per DTP (chosen by the planner):** every DTP record has a Payment Type *By Resources* or *By Trip*. The By Resources table counts the records with By Resources (above the Daily Trip = over allocation, the planner's choice is kept); the By Trip table counts the records with By Trip. Records without a Payment Type (older data) fill the By Resources Daily Trip first and go by trip above it (KM-09). |
| KM-14 | **Choices and default:** only the payment types of the trucking company in Master KPI can be chosen (By Trip only with Order Sharing > 0). Default for a new / imported / edited record: *By Resources* while the company still has a free By Resources Daily Trip on the date (records already planned By Resources counted), otherwise *By Trip*; a company with one type always gets that type. |
| KM-15 | **Change:** in the grid (Payment Type column, per row) or for all selected records (button **Payment Type ▾ → Set By Resources / Set By Trip**), in Manual Entry and in Edit, only for records not submitted yet (Available, Ready to Submit, Validation Error). After submission the Payment Type is changed in DTP Maintenance while the driver has not started (MT-01). **Submit** is blocked when a selected record of a company with Master KPI has no valid Payment Type; the confirmation shows the count per payment type. The Payment Type is passed to the Daily order. |
| KM-08 | **No Master KPI:** status *No Master KPI*, limit and remaining "-", not treated as 0. A KPI row with another payment type shows *Not By Resources*. |

Mock-up: the Master KPI rows come from `MasterKpi.SEED`, the same seed as the Master KPI screen (By Resources and By Trip reference tables; PNJ, SRL, TFL added By Resources). Trips per day = `MasterKpi.DAILY_TRIPS` (20). SML has no Master KPI (it is not in Master Trucking Company). Tests: `tests/dtp-kpi.test.js` (13).

## 5. Open questions (TBD)

1. **System Master values:** how many days may the planner backdate and plan ahead (mock-up 3 / 14)?
2. **Template vs interface fields:** Exporter and Importer CD are not in the Excel template. Should the template get these columns, together with IMPORT/EXPORT?
3. **Duplicate key:** for records without Container No and Booking No, which fields identify a duplicate?
4. **Data mapping:** the final LP and location code lists. The template has only D1 / D2 / D3 and K1E / S1E, and the sample row uses D1, which is not in the template mapping. Also, "CY TEMMIN" in the template is probably a typo.
5. **ROUNDUSE → Planned Cycle:** is Y = round use (2 cycles) correct?
6. **Partial upload:** should valid rows be added while invalid rows are rejected? The mock-up rejects the whole file.
7. **IPMS interface:** schedule, record key, and how changes or cancellations from IPMS after submission are handled.
8. **Queue failure rules:** which errors are retryable, how many retries, and who is notified.
9. **Rejected by LP:** may the planner change the LP of a rejected order from DTP Creation, or must a new record be submitted?
10. **Truck Assignment menu:** done, see [truck-assignment-spec.md](truck-assignment-spec.md).
11. **DTP vs Master KPI (KM-OQ1):** Does a **Failed** record (not yet a Daily order, retryable) consume the Order Sharing allocation? Mock-up: yes.
12. **DTP vs Master KPI (KM-OQ2):** Does a Daily order **rejected by the LP** release the slot? Mock-up: yes (not counted).
13. **DTP vs Master KPI (KM-OQ3):** Should Submit be **blocked** above the Order Sharing limit, or only warned (mock-up)?
14. **DTP vs Master KPI (KM-OQ4):** Will Master KPI get an **effective period** (validity) per company?
15. **DTP vs Master KPI (KM-OQ5):** Behaviour when Master KPI is **missing** for a company: warning only (mock-up), or no DTP allowed?
16. **DTP vs Master KPI (KM-OQ6):** Yellow threshold (80 %) or another rule, for example remaining ≤ 1?
17. **DTP Maintenance (MT-OQ1):** Cancel = delete the DTP record and cancel the Daily order (mock-up), or keep the record with a *Cancelled* status? Is a reason mandatory?
18. **DTP Maintenance (MT-OQ2):** Which fields may be changed after the LP accepted / a truck is assigned (mock-up: all, a new Truck Company releases the truck)? Must the LP Admin / driver be notified?
19. **DTP Maintenance (MT-OQ3):** Ctr Type, Service Type and Shift options: final master lists (mock-up GP / HC, Container for Export / Import, DAY / NIGHT).
20. **DTP vs Master KPI By Trip (KM-OQ7):** answered 13-Nov-2026: the planner chooses the Payment Type per DTP (KM-13..KM-15).
21. **DTP vs Master KPI By Trip (KM-OQ8):** trips per day for By Trip: fixed (20), per date from the plan, or equal to Total By Resource?
22. **Payment Type (KM-OQ9):** should the Excel template / IPMS interface carry the Payment Type, or is it always chosen in ELIPS (default rule KM-14)? Does the Payment Type change the price / SA calculation (By Trip vs By Resources rates)?
