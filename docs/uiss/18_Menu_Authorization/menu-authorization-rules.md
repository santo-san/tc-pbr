# TC-PBR Menu & Authorization - rules (as implemented in the mock-up)

UISS: [UISS_Screen_TCPBR_Menu_Authorization.xlsx](UISS_Screen_TCPBR_Menu_Authorization.xlsx) (created 14-Nov-26 in the UISS review,
see [../../review/04-missing-and-questionable-uiss.md](../../review/04-missing-and-questionable-uiss.md) M1).

## 1. Menu tree

| Menu | Sub-menu | Page | Code |
|---|---|---|---|
| Dashboard | - | all pages | - |
| Master | Trucking Company, Mileage, Price, Location Code, Priority, Renban, KPI, Route Percentage | `master.html#<view>` | [../../../master.html](../../../master.html), [../../../master.js](../../../master.js) |
| Daily | Daily Monitoring, Planning Order, Planning Truck Assignment | `index.html#monitoring`, `#planning-order`, `#truck-assignment` | [../../../index.html](../../../index.html) |
| Monthly | PR Creation, PR Approval, PO Approval, PR Inquiry, PO Inquiry | `monthly.html#<view>` | [../../../monthly.html](../../../monthly.html) |
| Service Acceptance | SA Approval, SA Monitoring | `index.html#sa-approval`, `#sa-monitoring` | [../../../index.html](../../../index.html) |

## 2. Roles and access (evidence = code)

| ID | Rule | Evidence |
|---|---|---|
| AU-01 | The acting user is chosen with "Login sebagai" (mock-up only); Driver needs a login check | `app.js:510 setActor`, `app.js:519 openLogin`, `monthly.js:325` |
| AU-02 | Daily Monitoring: IELP Admin, Planner VPLD, System see all orders; Supplier sees own company; Driver sees own truck | `workflow.js:57 canView` |
| AU-03 | Actions per role: Assign Truck = IELP Admin; Order Release / Accept / Reject / Assign Truck (LP) / Change Truck = LP Admin; Start / Pickup / Finish = Driver (LP Admin with reason for Pickup / Finish); SA Approval = Planner; Proses ke SA / PAS = System | `workflow.js:158-321` (`allow`) |
| AU-04 | Planning Order (DTP creation, submit, switching, maintenance) = Planner VPLD; others view only | `dtp-rules.js canCreate`, `dtp.js isPlanner` |
| AU-05 | Planning Truck Assignment actions = LP Admin of the trucking company | `truck-assign.js:8 isLpAdmin` |
| AU-06 | SA Approval: approve = Planner VPLD; view = IELP Admin | `sa.js:10-11` |
| AU-07 | SA Monitoring: view = Planner, IELP Admin, Supplier (own company); Retry Interface = IELP Admin | `sa-monitoring.js:15-17` |
| AU-08 | PR Creation = VPLD Staff and VPLD Section Head | `pr-creation-rules.js canCreate`, `pr-sources.js PR_CREATORS` |
| AU-09 | PR / PO Approval = approver of the current level (SH / DpH / DH); auto approve = System; Supplier sees own documents | `monthly-workflow.js canView, needsMe, runAutoApprove` |
| AU-10 | Master screens: **no role check** in the code (TBD); Master Mileage shows the badge "IELP Admin only" | `master.js`, `master-*.js` (no role test) - potential bug BUG-02 |

## 3. ELIPS tables (schema)

`ielp.MASTER_MENU` (menu tree), `ielp.MASTER_MENU_LANG`, `ielp.USERID_CLASS` (user classes), `ielp.USERID_MENU_OPTION`
(menu per class), `ielp.USERID_DETAIL` (class per user), `ielp.USERID`, `ielp.MASTER_APP` - definitions in
[../../db/schema-dictionary.md](../../db/schema-dictionary.md).

## 4. Open questions (TBD - Not confirmed from existing schema/data/code)

1. USERID_CLASS value of every role (IELP Admin, Planner VPLD, LP Admin, Supplier Viewer, Driver, VPLD Staff / SH, approvers, GA).
2. MENU_ID / APP_NAME of the TC-PBR menus.
3. Which roles maintain each Master screen.
4. Link of supplier / driver users to `MS_TRUCKING_COMPANY` / `MS_DRIVER.USER_NAME`.
