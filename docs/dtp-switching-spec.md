# DTP Switching (rollback of a submitted DTP) – Spec & Implementation

DTP Switching rolls back a DTP record that was already submitted to the trucking company, as long as the driver has **not started**. After the rollback the record can be corrected and submitted again through the normal DTP Creation flow.

**Location:** Daily › Planning Order › DTP Creation grid. This is the DTP assignment grid of the planning date. The feature adds:
- a toolbar button **⇄ DTP Switching (n)**;
- a row option **⇄**;
- a column **Driver Status**.

**Files:**
- Rules: [`dtp-rules.js`](../dtp-rules.js): `SWITCHABLE`, `driverStarted`, `switchCheck`, `canSwitch`, `switchBack`, `MSG.sw*`.
- UI: [`dtp.js`](../dtp.js): grid, `confirmSwitch`, `swResult`, queue guard, demo.
- Style: [`dtp.css`](../dtp.css).
- Tests: [`tests/dtp-switching.test.js`](../tests/dtp-switching.test.js) (11).
- UISS: [`uiss/UISS_Batch_DTP_Switching.xlsx`](uiss/UISS_Batch_DTP_Switching.xlsx).

## 1. Analysis of the existing flow

| Step | What happens today (mock-up / UISS) | Records |
|---|---|---|
| Submit (DTP Creation) | `D.submit` sets the record to **Submitted**, with `submittedAt` / `submittedBy` and a history row, then puts it in the queue. Submitted records are locked (`LOCKED`) and cannot be submitted again (DT-15). | `TB_R_DTP_RECORD`, `TB_H_DTP_RECORD_STS` |
| Queue service | Submitted → **Queued** → **Processing** → **Processed**, which creates the Daily order (`ORDER_NO` on the record). It can also end in **Failed** (retryable) instead. See UISS-Batch DTP Queue Processing. | `TB_R_DTP_RECORD`, `TB_H_DTP_RECORD_STS`, Daily Order + Cycle 1 |
| Daily order | Status **Planning Order**, cycle 1 **DTP Creation Release**, LP status *Waiting for Confirmation* | `TB_R_DAILY_ORDER` (TBD), Daily Order Cycle (TBD) |
| Planning Truck Assignment | LP Accept or Reject. Assign Truck sets the order to **Order Release** with plate and driver (TA-01..TA-09). | Daily Order, `TB_R_ORDER_TRUCK_ASSIGN`, `TB_H_ORDER_ASSIGN` |
| Driver APK | The order is synced to the plate (UISS-Batch Driver Order Sync). The driver presses *Jalankan* → **Start Daily Order** / cycle **Start Cycle** (`startAt`). | Daily Order / Cycle, `TB_R_DRIVER_ORDER`, `TB_T_DRIVER_SYNC_QUEUE` |

**Existing statuses reused** (no new status):
- DTP record: Available, Ready to Submit, Validation Error, Submitted, Queued, Processing, Processed, Failed.
- Daily order: Planning Order, Order Release, Start Daily Order, Finish Daily Order, SA Approved, SA Approved with PO Number.
- Cycle: DTP Creation Release, Start Cycle, Pickup Container, Finish Cycle.

**Pre-submission status after rollback:** **Available**, the state of a valid record before it is selected or submitted. If re-validation finds an error (for example a duplicate added meanwhile), it becomes **Validation Error** and can be corrected with Edit.

## 2. Eligibility (SW-01 .. SW-04)

| DTP status | Linked Daily order | DTP Switching |
|---|---|---|
| Available / Ready to Submit / Validation Error | – | Not available: "DTP has not been submitted" |
| Submitted, Queued | not created yet | **Allowed**: removed from the queue |
| Failed | not created | **Allowed** (Retry also remains possible) |
| Processing | being created now | Not allowed: "DTP is no longer eligible for rollback. Please refresh the data and try again." |
| Processed | Planning Order or Order Release, no cycle started | **Allowed**, including when the LP accepted, rejected, or assigned a truck |
| Processed | Start Daily Order / Finish / SA / PO, or any cycle with Start Cycle | Not allowed: "DTP cannot be rolled back because the driver has already started the process." |
| Processed | order not found | Not allowed (no longer eligible) |

**Driver Started** = Daily order status is not *Planning Order* / *Order Release*, **or** any cycle has a Start Cycle time (`D.driverStarted`). The **Driver Status** column shows *Not Started (status)* or *Started (status)*.

## 3. Rollback logic (SW-05 .. SW-08)

1. **Screen check:** when the user clicks, the latest status and the driver status are checked again. Non-eligible records show the reason and no confirmation is opened.
2. **Confirmation:** "Confirm DTP Switching" with the message from the requirement. The dialog lists each record and its effect: *Removed from queue* or *Daily order cancelled*.
3. **Backend re-check:** `switchBack` checks every record again immediately before the change (role VPLD Planner, eligibility). This prevents a race with the driver starting at the same moment.
4. **Transaction** (all records, all tables; on any error nothing is changed):

| Record state | Action |
|---|---|
| Submitted / Queued / Failed | Remove the queue entry. |
| Processed | Cancel the Daily order and its cycle, so it disappears for the LP Admin, Truck Assignment and the driver:<br>- release the active truck assignment;<br>- queue a driver-sync REMOVE;<br>- keep a snapshot (order, status, LP status, truck, driver, order history) in the switch log. |
| All | DTP record: status **Available** (or Validation Error after re-validation); clear `ORDER_NO`, `SUBMITTED_BY/DT`, `ATTEMPT_CNT`, `FAIL_REASON`; `VERSION + 1`. |
| All | History row: "DTP Switching by {user}: rollback from {prev}; Daily order {no} ({status}, LP {status}, truck {plate}) cancelled", plus a switch-log row. |

5. **Result:** success toast "DTP rollback completed successfully." and the grid is refreshed. The record is selectable again; Edit, Delete (Excel / Manual) and Submit work as before.

**Queue guard:** the queue service stops when the record it picked up is no longer Submitted / Queued / Processing. The backend equivalent is a status check in the same transaction.

## 4. Batch handling

- The grid already supports multi-selection: checkboxes plus Select All for Submit. Submitted records now have an amber checkbox for DTP Switching, enabled only when eligible.
- Submit in DTP Creation is all-or-nothing (DT-15), so DTP Switching keeps that behaviour: if any selected record fails the re-check, nothing is rolled back. The result lists each failed record with its reason; the user refreshes, deselects it and repeats.
- A partial-success mode (summary "Successful 8 / Failed 2") is OQ-04.

## 5. Database / API changes (proposed)

| Object | Change |
|---|---|
| `TB_R_DTP_RECORD` | Update: STATUS, ORDER_NO = null, SUBMITTED_BY / DT = null, ATTEMPT_CNT = 0, FAIL_REASON = null, VERSION + 1 (optimistic lock) |
| `TB_H_DTP_RECORD_STS` | Insert history row (existing) |
| `TB_H_DTP_SWITCH` (new) | Audit of each switch: SWITCH_ID, DTP_REC_ID, PREV_STATUS, NEW_STATUS, ORDER_NO, ORDER_STATUS, LP_STATUS, PLATE_NO, DRIVER_ID, ORDER_SNAPSHOT (JSON), REQUEST_ID, CREATED_BY, CREATED_DT |
| Daily order | Logical cancel instead of a physical delete, so history is kept: `CANCEL_FLAG = 'Y'`, `CANCEL_REASON = 'DTP Switching'`, `CANCEL_BY/DT`. Status is not changed (no new status). Cancelled orders are hidden from Daily Monitoring, Truck Assignment, Driver API and SA. (OQ-01) |
| `TB_R_ORDER_TRUCK_ASSIGN` / `TB_H_ORDER_ASSIGN` | Active row `ACTIVE_FLAG = 'N'`, `RELEASED_BY/DT`; history action *DTP Switching* |
| `TB_T_DRIVER_SYNC_QUEUE` | Insert event `ORDER_UPDATE` (cancelled), so the Driver APK removes the card |
| Queue | Delete the queue row of Submitted / Queued records (or mark it cancelled) |
| API | `POST /api/dtp/switch { requestId, records: [{ id, version }] }` → `200 { count }` / `409 { failed[] }` / `403` / `500`. It runs in one transaction with row locks on the records and orders. |

## 6. Error handling

| Case | Message / result |
|---|---|
| Driver started (screen or backend re-check) | "DTP cannot be rolled back because the driver has already started the process." |
| Status changed (Processing, already rolled back, order missing, version changed) | "DTP is no longer eligible for rollback. Please refresh the data and try again." |
| Not submitted / nothing selected | "DTP has not been submitted…" / "Select at least one submitted DTP record that the driver has not started." |
| Not VPLD Planner | 403, "Only the VPLD Planner can create DTP." (DT-01) |
| DB error | "DTP rollback failed. No data was changed. Please try again." Full rollback. |

**Demo menu (mock-up only):**
- Simulate DTP Switching failure (DB).
- Driver starts during DTP Switching confirmation (race).
- Driver starts the first assigned order.

## 7. Impact on existing processes

- **DTP Creation:** unchanged for non-submitted records. Submitted records keep their lock until DTP Switching. Re-submission creates a new Daily order with a new Order No; the old number is kept in history.
- **Queue processing:** records that were rolled back are skipped.
- **Daily Monitoring / Truck Assignment / Driver APK / Calendar:** the cancelled order disappears. Its truck is free for other orders.
- **SA Approval:** not affected, because a started order can never be rolled back.
- **Mock-up limitation:** LP accept / truck assignment of DTP orders is not stored in the browser (existing behaviour), so after reload a processed order shows *Planning Order* again.

## 8. Open questions

| # | Question |
|---|---|
| OQ-01 | Cancel the Daily order logically (proposed) or delete it? Should cancelled orders be visible in Daily Monitoring (for example a filter)? |
| OQ-02 | Who may use DTP Switching: only the VPLD Planner (as Submit), or also IP Admin? Is a reason mandatory? |
| OQ-03 | Should the LP Admin / driver be notified when an accepted or assigned order is rolled back? |
| OQ-04 | All-or-nothing (as Submit, implemented) or partial success with a summary? |
| OQ-05 | Is DTP Switching allowed for past planning dates (outside the DTP date range of System Master)? |
| OQ-06 | Should the re-submitted record reuse the old Order No? |
