// ELIPS PR Creation data sources for the Monthly mock-up page.
// In the application these are the existing tables / services; the mock-up pages keep their data in memory,
// so this file holds the same records the Master screens show (master.html: Price, Route Percentage, KPI)
// and reads them through the existing rules (MasterPrice.priceForPR, MasterRoutePercentage.split).
(function (root) {
  const MP = root.MasterPrice, RP = root.MasterRoutePercentage;

  // System Master: PR creation in the current operational month (true / false); undefined = not configured
  const SYSTEM_MASTER = { prAllowCurrentMonth: undefined };
  // Authorization configuration: who may create PR (approval levels themselves come from monthly-workflow.js)
  const PR_CREATORS = [{ role: 'VPLD_STAFF', division: 'VPLD' }, { role: 'APPROVER', level: 'SH', division: 'VPLD' }];

  // TMMIN Calendar: working days per operational month (weekdays minus holidays)
  const CALENDAR = { '2026-11': 21, '2026-12': 22, '2027-01': 20 };

  // eCatalogue prices (Master Price / Pricing Data): Fix Cost (Monthly Price) and Mileage (Price per KM)
  const PRICES = [];
  (() => {
    const partners = { DNX: [28000000, 2600], PNJ: [29000000, 2800], PBM: [27500000, 2550], JMP: [28250000, 2650], SRL: [27800000, 2700] };
    ['202607', '202608', '202609', '202610', '202611', '202612'].forEach(period => Object.entries(partners).forEach(([partner, [fix, km]]) => {
      const raise = period >= '202610' ? 1 : 0;
      const base = { partner, period, vehicleType: 'TRAILER 40FT', effStart: MP.periodStart(period), effEnd: MP.periodEnd(period) };
      PRICES.push({ ...base, component: 'FIX', price: fix + raise * 500000 });
      if (!(partner === 'SRL' && raise)) PRICES.push({ ...base, component: 'KM', price: partner === 'DNX' && period === '202610' ? 2750 : km + raise * 100 });
    }));
  })();

  // Master KPI: Order Sharing (daily QTY) of the trucking companies paid By Resources
  const ORDER_SHARING = { AGR: 3, DNX: 4, GIB: 5, JMP: 4, PBM: 4 };

  // Master Route Percentage: active routes with their distance (Master Mileage legs) and percentage
  const ROUTES = [
    ['D1_S1_X1', 'DEPO SUNTER - CY TMMIN SUNTER 1 - CY EXTERNAL CAKUNG / MARUNDA', 17, 7],
    ['D1_S1_D3', 'DEPO SUNTER - CY TMMIN SUNTER 1 - DEPO CAKUNG MARUNDA', 18, 6],
    ['DPCMR_CYKRW', 'DEPO CAKUNG/MARUNDA - CY INTERNAL KARAWANG', 57, 15],
    ['PRTGP_WHCKR', 'PORT TANJUNG PRIOK - WAREHOUSE CIKARANG', 61, 12],
    ['PRTGP_CYKRW', 'PORT TANJUNG PRIOK - CY INTERNAL KARAWANG', 67, 10],
    ['DPCMR_CYSTR', 'DEPO CAKUNG/MARUNDA - CY INTERNAL SUNTER', 16, 9],
    ['PRTGP_CYSTR', 'PORT TANJUNG PRIOK - CY INTERNAL SUNTER', 11, 8],
    ['CYSTR_PRTGP', 'CY INTERNAL SUNTER - PORT TANJUNG PRIOK', 11, 8],
    ['SNT_KRW', 'SUNTER - KARAWANG', 65, 10],
    ['SNT_CKR', 'SUNTER - CIKARANG', 42, 5],
    ['CKR_KRW', 'CIKARANG - KARAWANG', 28, 5],
  ].map(([code, description, distance, percentage]) => ({ code, description, distance, percentage, status: RP.STATUS.ACTIVE }));

  const today = () => MP.ymd(new Date());
  const src = {
    workingDays: ym => CALENDAR[ym] ?? null,
    // asOf can fix the price date (tests); default today
    price: (partner, component, period) => MP.priceForPR(PRICES, { partner, component, period }, root.PrSources.asOf || today()),
    orderSharing: partner => ORDER_SHARING[partner] ?? null,
    routes: () => ROUTES.filter(r => r.status === RP.STATUS.ACTIVE && r.percentage > 0),
    routePercentageTotal: () => RP.totalActive(ROUTES),
    split: RP.split,
    shareTotal: () => Object.values(ORDER_SHARING).reduce((s, n) => s + n, 0),
    // Logistics Partners that can get a PR: paid By Resources (Master KPI) or with an eCatalogue price
    partners: () => [...new Set([...Object.keys(ORDER_SHARING), ...PRICES.map(p => p.partner)])].sort(),
  };

  root.PrSources = { SYSTEM_MASTER, PR_CREATORS, CALENDAR, PRICES, ORDER_SHARING, ROUTES, src };
})(typeof window !== 'undefined' ? window : globalThis);
