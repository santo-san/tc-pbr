# 01 - Existing Function Inventory (TC-PBR)

Review date: 14-Nov-2026 · Repository: `tc-pbr` (branch `main`) · Reviewer role: Senior System Engineer / System Analyst.

## How the existing implementation is built (evidence)

| Fact | Evidence |
|---|---|
| The TC-PBR "application" in this repository is a **static HTML / JavaScript mock-up**: 3 pages (`index.html`, `master.html`, `monthly.html`), no server, no HTTP API, no database connection. | `index.html`, `master.html`, `monthly.html`; no backend folder, no `fetch(`/`XMLHttpRequest` to an API (`grep fetch( *.js` finds only map tiles / geocoding in `location.js`). |
| Business rules live in **pure rule modules** (UMD, tested with Node). They act as the "backend / service layer" of the mock-up. | `workflow.js`, `dtp-rules.js`, `sa-rules.js`, `sa-pas-rules.js`, `dn-rules.js`, `master-*.js`, `monthly-workflow.js`, `pr-creation-rules.js`; tests `tests/*.test.js` (10 files). |
| "Database operations" are **in-memory arrays** seeded in the page scripts; some screens keep state in `localStorage`. | e.g. `VENDORS` (`master.js`), `LOCATIONS` (`location.js`), `MILEAGES` (`mileage.js`), `RECS` (`dtp.js:27` localStorage), `SAS` (`sa.js:51`, `sa-monitoring.js:24`), PAS attachments (`delivery-note.js:8`). |
| Authentication is **simulated** by a "Login sebagai" role selector; roles are checked by the rule modules. | `index.html:63`, `monthly.html:165`, `app.js:510 setActor`, `app.js:519 openLogin`; `workflow.js:26 roleLabel`, `workflow.js:57 canView`. Roles: IELP Admin, Planner VPLD, Supplier (Viewer / LP Admin), Driver, System; Monthly: VPLD Staff, Section Head, approvers, GA, Supplier. |
| Interfaces to PAS / Talend / HiveMQ are **specified only** (UISS-Batch + specs); the screens simulate their result. | `docs/pas-interface/*.md`, `docs/pas-interface/current-tjava-json-to-pas.java`; simulation in `workflow.js:307-321`, `sa-monitoring.js:189 runSim`, `delivery-note.js:21-29`. |

Consequence for this review: the trace **UI -> code -> "API" -> DB** ends in the mock-up at the rule module and the
in-memory store. The link to real tables can only come from the ELIPS schema (`docs/db/ELIPS_Schema.sql`) and is
recorded as a *candidate* until confirmed (Phase 4 / 5).

Legend for "UISS Available?": **Y** = a UISS covers it · **P** = partially (function mentioned, not specified) · **N** = no UISS.
"Related DB (mock-up)" is the in-memory store; ELIPS tables are mapped in `05-database-candidate-mapping.md`.

## A. Common / navigation / authorization

| ID | Module | Screen/Page | Function | Description | Code Reference | Related API/Service | Related DB (mock-up) | UISS Available? |
|----|--------|-------------|----------|-------------|----------------|---------------------|----------------------|-----------------|
| COM-01 | Common | all pages | Side menu navigation | Menus Dashboard, Master (8 sub-menus), Daily (Monitoring, Planning Order, Truck Assignment), Monthly (PR Creation, PR/PO Approval, PR/PO Inquiry), Service Acceptance (SA Approval, SA Monitoring); hash routing `#view` | `index.html` (`data-view`), `master.html`, `monthly.html`, `master.js:go`, `monthly.js:280 go` | - | - | P (breadcrumb / menu path in each UISS-Screen; no menu UISS) |
| COM-02 | Common | index / monthly | Role selection "Login sebagai" | Switch the acting user (IELP Admin, Planner VPLD, Supplier Viewer / LP Admin per company, Driver per truck with login check; monthly roles) | `app.js:510 setActor`, `app.js:519 openLogin`, `monthly.js:325` | `workflow.js:57 canView`, `monthly-workflow.js canView` | in-memory actor | P (roles in Daily Monitoring / PR / PO UISS; no login UISS) |
| COM-03 | Common | all lists | Table View (show / hide columns) | Column chooser per list | `app.js:233 applyColumns`, `kpi.js kBuildViewMenu`, `price.js:55`, `sa.js`, `sa-monitoring.js`, `monthly.js` | - | - | Y (per screen) |
| COM-04 | Common | all lists | Pagination, rows per page | Pager + "Tampilkan" 10 / 25 / 50 | `app.js:181 render`, `master.js:137`, `sa-monitoring.js pager`, `monthly.js pagerHtml` | - | - | Y (per screen) |
| COM-05 | Common | all | Toast / dialog / busy mask | Messages, confirmation dialogs, loading | `app.js toast/showPreview`, `master.js showPreview`, `dtp.js busy` | - | - | Y (Display Message per UISS) |

## B. Daily - Daily Order Monitoring (`index.html#monitoring`)

| ID | Module | Screen/Page | Function | Description | Code Reference | Related API/Service | Related DB (mock-up) | UISS Available? |
|----|--------|-------------|----------|-------------|----------------|---------------------|----------------------|-----------------|
| DM-01 | Daily | Daily Order Monitoring | Initial display / list | Orders with cycles, status badges, sync time, totals | `app.js:181 render`, `app.js seed` | `workflow.js` | `DATA[]` (app.js:50, seeded) | Y (UISS_Screen_Daily_Order_Monitoring) |
| DM-02 | Daily | Daily Order Monitoring | Search / filter | DTP type tabs (ALL, DTP 1-4), keyword, date from / to, From / To, clear filters | `app.js filtered`, `app.js:269 clearFilters`, `index.html` DTP buttons | - | `DATA[]` (app.js:50) | Y |
| DM-03 | Daily | Daily Order Monitoring | Sort / Table View / Paging | Column sort, column chooser, pager | `app.js:181`, `app.js:233` | - | - | Y |
| DM-04 | Daily | Daily Order Monitoring | Export to Excel (.xlsx) | Export of the filtered list with header (printed by / date) | `app.js:303 exportExcel` | SheetJS | `DATA[]` (app.js:50) | Y (UISS_Report_Download_Daily_Order_Monitoring) |
| DM-05 | Daily | Daily Order Monitoring | Print / PDF | Browser print of the list | `index.html` (Print / PDF button) | `window.print` | - | P (not specified) |
| DM-06 | Daily | Order Detail | Order detail view | Order header, cycles, history log, files, actions bar per role | `app.js:378 openDetail`, `app.js cycleDetail` | `workflow.js:342 blockReason` | `DATA[]` (app.js:50) | Y |
| DM-07 | Daily | Order Detail | Assign Truck (IELP Admin) | Link a truck to the order; truck availability (Other LP, Maintenance, License Expired, In Use, Type Mismatch) | `app.js:482 openAction` | `workflow.js:151 linkTruck`, `:158`, `:135-142` | `DATA[]` (app.js:50), `MASTER.trucks` | Y |
| DM-08 | Daily | Order Detail | Order Release (LP Admin) | Manual release with reason + driver | `app.js:482` | `workflow.js:174` | `DATA[]` (app.js:50) | Y |
| DM-09 | Daily | Order Detail | Accept / Reject order (LP), Assign Truck (LP), Change Truck | LP confirmation and truck change with replacement truck | `app.js:482` | `workflow.js:194, 202, 209, 219` | `DATA[]` (app.js:50) | Y (+ Planning Truck Assignment) |
| DM-10 | Daily | Order Detail | Driver cycle actions | Start Order, Pickup Container (container no. + check digit), Finish Cycle, Start Next Cycle, Finish Order; LP Admin may act with reason | `app.js:482`, `app.js:558` | `workflow.js:230, 240, 265, 276, 285`, `workflow.js:49 containerError` | `DATA[]` cycles | Y |
| DM-11 | Daily | Order Detail | SA Approval / Proses ke SA / Proses ke PAS (simulated) | Status steps after Finish; failure simulation | `app.js:482` | `workflow.js:301, 307, 318` | `DATA[]` (app.js:50) | Y (+ SA UISS) |
| DM-12 | Daily | Order Detail | Delivery Note (Surat Jalan) View / Download | On-the-fly PDF of a cycle | `delivery-note.js:54 view`, `:83 dl`, `dn-pdf.js render` | `dn-rules.js model, fileName` | cycle of `DATA[]` (app.js:50) | Y (UISS_Report_Delivery_Note) |
| DM-13 | Daily | Order Detail | Delivery Note API simulation (Base64, decode / verify) | Response with base64, data hash, error codes 400/401/403/404/409/422/500/503/504 | `delivery-note.js:21 generate`, `:23 call` | `dn-rules.js api, checksum, dataHash, createGuard` | - | Y (UISS_Report_Delivery_Note) |
| DM-14 | Daily | Order Detail | Attach Delivery Note to PAS GR (simulated) | Idempotent attach, revision + 1, failure | `delivery-note.js` (Attach ke PAS GR) | `dn-rules.js attachPAS` | `localStorage` PAS store (`delivery-note.js:8`) | Y (UISS_Batch_ELIPS_PAS_GR_Attachment, Report Delivery Note §4) |
| DM-15 | Daily | Daily Order Monitoring | Create DTP (legacy dialog, IELP Admin) | Old "+ Create DTP" dialog with DTP check | `app.js:558 openCreateDTP` | `workflow.js:84 checkDTP`, `:97 createDTP` | `DATA[]` (app.js:50) | P (superseded by Planning Order; not in a UISS) |

## C. Daily - Planning Order / DTP Creation (`index.html#planning-order`)

| ID | Module | Screen/Page | Function | Description | Code Reference | Related API/Service | Related DB (mock-up) | UISS Available? |
|----|--------|-------------|----------|-------------|----------------|---------------------|----------------------|-----------------|
| DTP-01 | Daily | Planning Order | DTP calendar | Month calendar with DTP counts per date, date range check | `dtp.js:184 renderCalendar` | `dtp-rules.js dateRange, dateCheck, calStatus` | `RECS` (localStorage) | Y (UISS_Screen_DTP_Creation) |
| DTP-02 | Daily | Planning Order | Create DTP for a date (Planner VPLD only) | Open the creation screen, header (date, IO, model), role check | `dtp.js:444 openCreate` | `dtp-rules.js canCreate` | `RECS` | Y |
| DTP-03 | Daily | Planning Order | Excel upload (Choose File, Download Template) | Validate whole file (Row / Column / Error modal, CSV); valid rows added | `dtp.js:714 uploadFile`, `:747 downloadTemplate` | `dtp-rules.js readSheet, validate, duplicates` | `RECS` | Y (Screen + UISS_Batch_DTP_Excel_Upload) |
| DTP-04 | Daily | Planning Order | Manual entry (+ Add to Grid) | Form with validation | `dtp.js:691 addManual` | `dtp-rules.js normalize, validate` | `RECS` | Y |
| DTP-05 | Daily | Planning Order | Load / Refresh from IPMS | Pull interface records (simulated) | `dtp.js:703 loadIpms`, `pullIpms` | - | `RECS`, `PULLED` | Y |
| DTP-06 | Daily | Planning Order | Grid: select, edit row, delete selected, restore | Record grid with status, selection, multiple delete | `dtp.js:572 renderGrid`, `:763 deleteSelected`, `rowAction` | `dtp-rules.js revalidate, selectable` | `RECS` | Y |
| DTP-07 | Daily | Planning Order | Payment Type per DTP (By Resources / By Trip) | Select payment type per record; suggestion; check before submit | `dtp.js:436 applyPayType`, `payCell` | `dtp-rules.js payTypesFor, suggestPayType, setPayType, payIssues` | `RECS` | Y (rev 0.7) |
| DTP-08 | Daily | Planning Order | KPI monitor (order sharing / daily trip vs limit) | Per-company usage vs Master KPI | `dtp.js:616 renderKpi`, `kpiMon` | `dtp-rules.js kpiMonitor`, `master-kpi.js` | `RECS`, `KPI_ROWS` | Y |
| DTP-09 | Daily | Planning Order | Submit DTP | Confirmation, records to queue | `dtp.js:773 confirmSubmit` | `dtp-rules.js submit` | `RECS` | Y |
| DTP-10 | Daily | Planning Order | Queue processing (Daily order creation, retry) | Records -> daily orders, failure + retry | `dtp.js:86 runQueue`, `resumeQueue` | `dtp-rules.js step, canRetry, orderPayload` | `RECS`, `DATA[]` (app.js:50) | Y (UISS_Batch_DTP_Queue_Processing) |
| DTP-11 | Daily | Planning Order | DTP Switching (rollback while driver not started) | Rollback submitted records | `dtp.js:819 confirmSwitch`, `swCheck` | `dtp-rules.js switchCheck, canSwitch, switchBack` | `RECS`, `DATA[]` (app.js:50) | Y (UISS_Batch_DTP_Switching) |
| DTP-12 | Daily | Planning Order | DTP Maintenance (change / cancel submitted orders) | Edit values or cancel orders, confirm | `dtp.js:264 openMaint`, `:370 confirmMaint` | `dtp-rules.js maintValues, maintCheck, maintValidate, maintSave` | `RECS`, `DATA[]` (app.js:50) | Y (DTP Creation rev 0.5+) |
| DTP-13 | Daily | Planning Order | Open in Daily Monitoring / DTP monitoring | Jump to monitoring of the DTP | `dtp.js:234 openMonitoring` | - | - | Y |
| DTP-14 | Daily | Planning Order | Driver start simulation | "Driver starts the first assigned order" (blocks switching) | `dtp.js:808 driverStart` | `dtp-rules.js driverStarted` | `DATA[]` (app.js:50) | P (demo helper) |
| DTP-15 | Daily | Planning Order | Demo reset | Reset local demo data | `dtp.js:531` | - | localStorage | N (demo only, no UISS needed) |
| DTP-16 | Daily | Driver APK | Driver order sync (HiveMQ) | Push assigned orders to the driver app | not in code (only "Open Driver app view" in `truck-assign.js`) | - | - | Y (UISS_Batch_Driver_Order_Sync) - **no code** |

## D. Daily - Planning Truck Assignment (`index.html#truck-assignment`)

| ID | Module | Screen/Page | Function | Description | Code Reference | Related API/Service | Related DB (mock-up) | UISS Available? |
|----|--------|-------------|----------|-------------|----------------|---------------------|----------------------|-----------------|
| TA-01 | Daily | Planning Truck Assignment | Calendar view | Orders per day for the LP | `truck-assign.js:78 renderTaCalendar` | `workflow.js canView` | `DATA[]` (app.js:50) | Y (UISS_Screen_Planning_Truck_Assignment) |
| TA-02 | Daily | Planning Truck Assignment | Order list, filters, refresh | List per date / status | `truck-assign.js:199 renderTaList` | - | `DATA[]` (app.js:50) | Y |
| TA-03 | Daily | Planning Truck Assignment | Accept / Reject order | LP confirmation with reason | `truck-assign.js:173 confirmDialog`, `:177 rejectDialog` | `workflow.js:194, 202` | `DATA[]` (app.js:50) | Y |
| TA-04 | Daily | Planning Truck Assignment | Assign / Change truck (single and batch) | Truck picker with availability | `truck-assign.js:239 truckPicker`, `:119 openBatch`, `:158 batchAction` | `workflow.js:151 linkTruck, :209, :219` | `DATA[]` (app.js:50), `MASTER.trucks` | Y |
| TA-05 | Daily | Planning Truck Assignment | Detail / Driver app view | Order detail, open driver view | `truck-assign.js:277 openDetailTa` | - | - | Y / P (driver view) |

## E. Service Acceptance

| ID | Module | Screen/Page | Function | Description | Code Reference | Related API/Service | Related DB (mock-up) | UISS Available? |
|----|--------|-------------|----------|-------------|----------------|---------------------|----------------------|-----------------|
| SA-01 | SA | SA Approval | Daily SA list (Regular Trip / Inter Plant Trip), search, columns | Finished cycles waiting for SA | `sa.js:134 render`, `rows` | `sa-rules.js eligible, route, totalKm, calculate` | `DATA[]` (app.js:50), `SAS` (localStorage) | Y (UISS_Screen_SA_Approval) |
| SA-02 | SA | SA Approval | Approve daily SA (Planner VPLD) | Confirm -> SA number, SA header / detail | `sa.js:231 confirmApprove` | `sa-rules.js approve, saNumber, mapPO` | `SAS` | Y |
| SA-03 | SA | SA Approval | Monthly Truck (Fixed Cost) SA | Monthly SA calculation and approval | `sa.js:199 confirmMonthly`, `monthlyRows` | `sa-rules.js calculateMonthly, approveMonthly` | `SAS` | Y (rev 0.3) |
| SA-04 | SA | SA Monitoring | SA list / WBS group list, search, columns, paging | Monitoring of SAs and PAS status | `sa-monitoring.js:124 render`, `listTable`, `groupTable` | `sa-pas-rules.js wbsSplit` | `SAS`, localStorage | Y (UISS_Screen_SA_Monitoring) |
| SA-05 | SA | SA Monitoring | SA detail + interface log | Detail rows, PAS log | `sa-monitoring.js:165 detail`, `log` | - | `SAS` | Y |
| SA-06 | SA | SA Monitoring | Send to PAS / feedback / retry (simulated) | Run simulation, retry failed sends | `sa-monitoring.js:189 runSim`, `:217 retry` | `sa-pas-rules.js send, applyFeedback, overdue` | `SAS` | Y |
| SA-07 | SA | SA Monitoring | Export Excel | Export of the SA list | `sa-monitoring.js:224 exportExcel` | SheetJS | `SAS` | P (button in UISS; no report UISS) |

## F. Master data (`master.html`)

| ID | Module | Screen/Page | Function | Description | Code Reference | Related API/Service | Related DB (mock-up) | UISS Available? |
|----|--------|-------------|----------|-------------|----------------|---------------------|----------------------|-----------------|
| MTC-01 | Master | Trucking Company | List, search, sort, Table View, paging, Export .xls | Vendors incl. deleted | `master.js:137 render`, `filtered` | - | `VENDORS[]` | Y (UISS_Screen_Master_Trucking_Company) |
| MTC-02 | Master | Trucking Company | Add / Update vendor | Normalise, validate, unique code / SAP / NPWP, version check | `master.js:85 readForm`, `:93 startUpdate` | `master-trucking.js normalize, validate, add, update` | `VENDORS[]` | Y |
| MTC-03 | Master | Trucking Company | Delete (logical) | Confirmation, blocked when used by open transaction | `master.js` (Delete) | `master-trucking.js remove` | `VENDORS[]` | Y |
| MLC-01 | Master | Location Code | List, search, view, Table View, paging | Locations with map | `location.js:179 lRender`, `:243 lView` | - | `LOCATIONS[]` | Y (UISS_Screen_Master_Location) |
| MLC-02 | Master | Location Code | Add / Edit with map (pin, geocode, geofence radius) | Leaflet map, reverse geocoding, validation | `location.js:51 initMap`, `:115 reverseGeocode`, `:140 lStartEdit` | `master-location.js normalize, validate, add, update, geofence`; OpenStreetMap Nominatim | `LOCATIONS[]` | Y |
| MLC-03 | Master | Location Code | Remove / Deactivate | Delete if unused, else deactivate | `location.js:226 lRemove` | `master-location.js removalAction, deactivate, remove` | `LOCATIONS[]` | Y |
| MML-01 | Master | Mileage | List, search, Table View, paging, Export .xls | Route mileage list | `mileage.js:78 mRender` | - | `MILEAGES[]` | Y (UISS_Screen_Master_Mileage) |
| MML-02 | Master | Mileage | Add / Edit (Manual Entry) | From / To (active locations), mileage > 0 | `mileage.js:106 setForm` | `master-mileage.js validate, add, update, setStatus` | `MILEAGES[]` | Y |
| MML-03 | Master | Mileage | Excel upload (like Planning Order) | Template, validation modal, all-or-nothing save | `mileage.js:191 mileageUpload` | `master-mileage.js readSheet, checkUpload, applyUpload` | `MILEAGES[]` | Y (Screen rev 0.5 + UISS_Batch_Master_Mileage_Upload) |
| MML-04 | Master | (used by PR / SA) | Mileage lookup / variable cost | Lookup Active mileage, cost = KM x price | - | `master-mileage.js lookup, variableCost` | `MILEAGES[]` | Y (operation desc) |
| MPR-01 | Master | Price | Price monitoring (read only), filters, quick search, Table View | eCatalogue prices per LP and period | `price.js:69 pRender`, `pLoad` | `master-price.js status, overlaps, summary` | `PRICES[]` | Y (UISS_Screen_Master_Price) |
| MPY-01 | Master | Priority | List, search, paging | Route priority per LP | `priority.js:68 qRender` | `master-priority.js sorted, byPriority, rank` | `PRIORITIES[]` | Y (UISS_Screen_Master_Priority) |
| MPY-02 | Master | Priority | Add / Update / Move / Delete with renumbering | Priority order maintenance | `priority.js` | `master-priority.js add, update, move, remove, renumber` | `PRIORITIES[]` | Y |
| MKP-01 | Master | KPI | KPI list per type (By Resources / By Trip) with summaries | Order sharing %, daily trip, totals | `kpi.js:75 kRender`, `:108 kRenderSums` | `master-kpi.js total*, allocateTrip, dailyTripOf` | `KPIS`, `KPI_ITEMS` (kpi.js:8-12) | Y (UISS_Screen_Master_KPI) |
| MKP-02 | Master | KPI | Add Company / edit / delete row | Edit order sharing / daily trip | `kpi.js:126 kStartEdit`, `:137 kSave` | `master-kpi.js addItem, updateRow, removeCompany, validTrips` | `KPIS`, `KPI_ITEMS` (kpi.js:8-12) | Y |
| MRP-01 | Master | Route Percentage | List, search, Table View | Routes with stops and percentage | `route-percentage.js:90 rRender` | `master-route-percentage.js describe, distance, totalActive` | `ROUTES[]` | Y (UISS_Screen_Master_Route_Percentage) |
| MRP-02 | Master | Route Percentage | Add / Edit route, set percentage, deactivate | Stops, legs, 100 % check | `route-percentage.js:120 rSavePct` | `master-route-percentage.js addStop, moveStop, checkPct, validate, save, setPercentage, deactivate, split` | `ROUTES[]` | Y |
| MRB-01 | Master | Renban | List, search, paging | Renban per plant / destination | `renban.js:61 bRender` | - | `RENBANS[]` | Y (UISS_Screen_Master_Renban) |
| MRB-02 | Master | Renban | Add / Update / Delete | Validate unique plant + dest + renban | `renban.js` | `master-renban.js validate, add, update, remove` | `RENBANS[]` | Y |

## G. Monthly PR / PO (`monthly.html`)

| ID | Module | Screen/Page | Function | Description | Code Reference | Related API/Service | Related DB (mock-up) | UISS Available? |
|----|--------|-------------|----------|-------------|----------------|---------------------|----------------------|-----------------|
| PRC-01 | Monthly | PR Creation | Period / criteria input, calculate routes | Production month, sources (KPI, price, route %), rows per company and route | `pr-creation.js:40 calculateRows`, `:59 generate` | `pr-creation-rules.js period, periodCheck, calculate, prepare`; `pr-sources.js` | `PRS[]` | Y (UISS_Screen_PR_Creation) |
| PRC-02 | Monthly | PR Creation | Result list, detail, select, Confirm Create PR | Create PRs with sequence and initial approval | `pr-creation.js:84 prcRender`, `:161 openPcDetail`, `:209 confirmCreate` | `pr-creation-rules.js nextSequence, createPRs, initialApproval` | `PRS[]` | Y |
| PRI-01 | Monthly | PR Inquiry | Search, list, detail, downloads (List Summary .xls, Route Plan Detail .xls) | PR inquiry per role | `monthly.js:205 render`, `:405 openDetail`, `:477 download` | `monthly-workflow.js canView, prStatus` | `PRS[]` | Y (UISS_Screen_PR_Inquiry) |
| PRA-01 | Monthly | PR Approval | Approve / Reject (single, bulk), levels, reason | Approval per level and role | `monthly.js:354 openApproval` | `monthly-workflow.js approvePR, rejectPR, currentLevel, needsMe` | `PRS[]` | Y (UISS_Screen_PR_Approval) |
| PRA-02 | Monthly | PR Approval | Auto approve (deadline) | "Jalankan Auto Approve sekarang" | `monthly.js` | `monthly-workflow.js runAutoApprove` | `PRS[]` | Y |
| POA-01 | Monthly | PO Approval | Approve / Reject PO (single, bulk), auto approve | PO created from approved PR | `monthly.js:354` | `monthly-workflow.js createPO, approvePO, rejectPO, poBlock` | `PRS[]` | Y (UISS_Screen_PO_Approval) |
| POI-01 | Monthly | PO Inquiry | Search, list, detail, downloads | PO inquiry per role | `monthly.js:205, :405, :477` | `monthly-workflow.js canView` | `PRS[]` | Y (UISS_Screen_PO_Inquiry) |

## H. Interfaces / batch (specified; executed outside this repository)

| ID | Module | Screen/Page | Function | Description | Code Reference | Related API/Service | Related DB | UISS Available? |
|----|--------|-------------|----------|-------------|----------------|---------------------|------------|-----------------|
| INT-01 | Interface | - | ELIPS TC-PBR -> PAS PR interface (Talend DB-to-DB) | Send PRs to PAS | `docs/pas-interface/elips-pas-pr-interface-spec.md`, `current-tjava-json-to-pas.java` (existing tJava) | Talend | PAS tables | Y (UISS_Batch_ELIPS_PAS_PR_Interface) - **no code in repo** |
| INT-02 | Interface | - | PAS -> ELIPS callback PR / PO number | Write back PR / PO no. | `docs/pas-interface/pas-elips-callback-spec.md` | Talend | - | Y (UISS_Batch_PAS_ELIPS_PR_PO_Callback) - **no code in repo** |
| INT-03 | Interface | - | Surat Jalan PDF to PAS FTP for Auto GR | GR attachment job | `docs/pas-interface/elips-pas-gr-attachment-spec.md`; simulated in `dn-rules.js attachPAS` | Talend / FTP | - | Y (UISS_Batch_ELIPS_PAS_GR_Attachment) |
| INT-04 | Interface | - | SA -> PAS (Proses ke PAS) | Send SA, PO feedback | simulated `workflow.js:318`, `sa-pas-rules.js send, applyFeedback` | - | - | P (in SA Monitoring UISS; no UISS-Batch) |
| INT-05 | Interface | - | IPMS -> DTP interface | DTP records from IPMS | simulated `dtp.js pullIpms` | - | - | P (in DTP Creation UISS; no UISS-Batch) |

**Totals:** 79 functions (A 5 · B 15 · C 16 · D 5 · E 7 · F 19 · G 7 · H 5). Demo-only helpers (DTP-14, DTP-15) are listed for completeness.
