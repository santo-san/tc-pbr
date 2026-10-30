# ELIPS Master Price (Pricing Data): Rules

Master Price monitors the price data sourced from **eCatalogue** for each Logistic Partner (trucking company). It is the price reference when PR Monthly is generated. The screen is **read only**: prices are maintained in eCatalogue and synchronised to ELIPS (`createdBy = SYSTEM`).

Mock-up: `master.html#price` (Master > Price, title "Pricing Data", following the existing screen). Rules: [`master-price.js`](../master-price.js).

## 1. Price components

| Component (screen) | Meaning | Basis | Unit |
|---|---|---|---|
| **Fix Cost** | Monthly Price | SPK GAD: rental of vehicle + driver for one month, per Logistic Partner | IDR / month |
| **Mileage** | Price per KM | Vehicle maintenance cost, paid by actual KM traveled (Price per KM × actual KM) | IDR / KM |

## 2. Screen

| Section | Content |
|---|---|
| Filter | Periode (month), Trucking Company (searchable, Master Trucking Company), Component, Status (Active / Expired / Future). Search, Cancel |
| Summary | Active Monthly Price, Active Price per KM, Future (not yet active), Expired, Partners without an active price (per component) |
| List | Search, Table View, Export .xls. Columns: Periode, Trucking Company, Component (with Monthly Price / Price per KM), Price (with unit), Effective Start, Effective End, Status, Created By, Created Dt, Changed By, Changed Dt; Vehicle Type and Source via Table View |
| Paging | Per page 10 / 25 / 50, first / previous / pages / next / last, "Showing x to y of z entries" |

## 3. Rules

| ID | Rule |
|---|---|
| MP-01 | Price data originates from eCatalogue; every record belongs to one Logistic Partner (Trucking Company) and one component |
| MP-02 | Status from the effective period and today: **Future / Not Yet Active** (start > today), **Active** (start ≤ today ≤ end), **Expired** (end < today) |
| MP-03 | PR Monthly uses the price of the partner + component (+ vehicle type) whose effective period covers the whole PR production month |
| MP-04 | Expired prices are never used for a new PR Monthly: "Monthly Price / Price per KM for {partner} period {YYYYMM} is expired and cannot be used for a new PR Monthly." |
| MP-05 | No price for the period: PR Monthly is not generated for that partner/component and the user is informed ("No ... found in Master Price for {partner} period {YYYYMM}.") |
| MP-06 | More than one valid price for the same partner / component / vehicle type and period is a data error ("More than one valid ..."); overlaps are counted in the data check |
| MP-07 | Summary is calculated on all data (not on the filter) and lists partners without an active price per component |
| MP-08 | Periode filter shows prices whose effective period overlaps the selected month |
| MP-09 | Search is free text over the visible values and the partner name; Export .xls exports all filtered rows (Price as number + unit column) |

## 4. Open questions

1. **Screen title:** "Pricing Data" (existing screen) vs "Master Price" (requirement). The mock-up uses Pricing Data.
2. **Effective period:** is a price always one calendar month (as in the reference Periode column), or can an SPK GAD / eCatalogue price cover several months?
3. **Vehicle Type:** does the price differ per vehicle type? The mock-up has one type (TRAILER 40FT), hidden by default.
4. **Source reference:** which eCatalogue / SPK GAD reference number must be shown?
5. **Synchronisation:** schedule and behaviour of the eCatalogue interface (new / changed / deleted prices), to be specified in a UISS-Batch.
6. **PR Monthly rule** when a price changes after the PR was created (keep the PR price or recalculate?).
