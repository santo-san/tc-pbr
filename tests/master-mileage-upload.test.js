// Unit tests for Master Mileage Excel upload (master-mileage.js readSheet / checkUpload / applyUpload). Run: node tests/master-mileage-upload.test.js
const assert = require('assert');
const MM = require('../master-mileage.js');
const A = MM.ACTION;
const LOC = ['SNT', 'KRW', 'CKR', 'DPCMR', 'CYSTR'].map(code => ({ code, status: 'ACTIVE' })).concat([{ code: 'OLD', status: 'INACTIVE' }]);
const at = new Date('2026-11-13T09:00:00');
const base = () => [
  { from: 'SNT', to: 'KRW', mileage: 65, status: 'Active', createdBy: 'ielp1', createdAt: at, updatedBy: 'ielp1', updatedAt: at, version: 1 },
  { from: 'CKR', to: 'KRW', mileage: 28, status: 'Active', createdBy: 'ielp1', createdAt: at, updatedBy: 'ielp1', updatedAt: at, version: 1 },
  { from: 'KRW', to: 'CKR', mileage: 30, status: 'Inactive', createdBy: 'ielp1', createdAt: at, updatedBy: 'ielp1', updatedAt: at, version: 1 },
];
const sheet = rows => [['Route Mileage Upload'], [], ['FROM CODE', 'TO CODE', 'MILEAGE (KM)', 'REMARK'], ...rows];
const tests = [];
const test = (n, f) => tests.push([n, f]);

test('MM-21 template: header row found anywhere, codes upper case, empty rows skipped, Excel row numbers', () => {
  const r = MM.readSheet(sheet([['snt', 'ckr', '42'], ['', '', ''], ['DPCMR', 'CYSTR', 16.5, 'x']]));
  assert.deepStrictEqual([r.ok, r.data.map(d => [d.row, d.from, d.to, d.mileage])], [true, [[4, 'SNT', 'CKR', '42'], [6, 'DPCMR', 'CYSTR', '16.5']]]);
});
test('MM-21 template errors: missing column, no data, too many rows', () => {
  assert.match(MM.readSheet([['FROM CODE', 'TO CODE'], ['SNT', 'KRW']]).error, /MILEAGE \(KM\) not found/);
  assert.match(MM.readSheet([['A', 'B']]).error, /FROM CODE, TO CODE, MILEAGE \(KM\) not found/);
  assert.strictEqual(MM.readSheet(sheet([])).error, MM.UMSG.empty);
  assert.match(MM.readSheet(sheet(Array.from({ length: 1001 }, (_, i) => ['SNT', 'KRW', i + 1]))).error, /maximum 1000/);
});
test('MM-22..24 row check: New / Update / No change, same validations as the screen', () => {
  const c = MM.checkUpload(MM.readSheet(sheet([['SNT', 'CKR', '42'], ['SNT', 'KRW', '66,5'], ['CKR', 'KRW', 28]])).data, base(), LOC);
  assert.deepStrictEqual(c.rows.map(r => [r.action, r.value, r.old]), [[A.NEW, 42, null], [A.UPDATE, 66.5, 65], [A.SAME, 28, 28]]);
  assert.deepStrictEqual([c.ok, c.counts[A.NEW], c.counts[A.UPDATE], c.counts[A.SAME]], [true, 1, 1, 1]);
});
test('MM-23 row errors: mandatory, inactive / unknown location, same location, mileage 0 / text, duplicate in file, inactive route', () => {
  const c = MM.checkUpload(MM.readSheet(sheet([['', 'KRW', 5], ['OLD', 'XYZ', 5], ['SNT', 'SNT', 5], ['SNT', 'CKR', '0'], ['DPCMR', 'CYSTR', 'abc'],
    ['DPCMR', 'KRW', 7], ['DPCMR', 'KRW', 8], ['KRW', 'CKR', 31]])).data, base(), LOC);
  const e = c.rows.map(r => r.errors.join(' | '));
  assert.match(e[0], /Location From is required/);
  assert.match(e[1], /OLD is not an active.*XYZ is not an active/);
  assert.match(e[2], /cannot be the same/);
  assert.match(e[3], /greater than 0/); assert.match(e[4], /greater than 0/);
  assert.strictEqual(c.rows[5].action, A.NEW); assert.match(e[6], /repeated in the file \(row 9\)/);
  assert.match(e[7], /exists but is Inactive/);
  assert.deepStrictEqual([c.ok, c.counts[A.ERROR]], [false, 7]);
  assert.match(c.error, /7 row\(s\) have errors/);
});
test('MM-25 all-or-nothing: one error -> nothing saved; valid file -> inserts and updates with audit', () => {
  const list = base();
  const bad = MM.checkUpload(MM.readSheet(sheet([['SNT', 'CKR', 42], ['SNT', 'SNT', 1]])).data, list, LOC);
  assert.deepStrictEqual([MM.applyUpload(bad, list, 'u1', at).ok, list.length], [false, 3]);
  const later = new Date('2026-11-13T10:00:00');
  const ok = MM.checkUpload(MM.readSheet(sheet([['SNT', 'CKR', 42], ['SNT', 'KRW', 70]])).data, list, LOC);
  const res = MM.applyUpload(ok, list, 'u1', later);
  assert.deepStrictEqual([res.ok, res.created, res.updated, list.length], [true, 1, 1, 4]);
  const upd = list.find(m => m.from === 'SNT' && m.to === 'KRW'), neu = list.find(m => m.from === 'SNT' && m.to === 'CKR');
  assert.deepStrictEqual([upd.mileage, upd.version, upd.updatedBy, upd.createdBy, upd.createdAt], [70, 2, 'u1', 'ielp1', at]);
  assert.deepStrictEqual([neu.status, neu.createdBy, neu.version], ['Active', 'u1', 1]);
  assert.strictEqual(res.message, 'Upload completed: 1 route(s) created, 1 route(s) updated.');
});
test('MM-26 nothing to save when every route already has the same mileage; uploaded routes are used by lookup', () => {
  const list = base();
  const same = MM.checkUpload(MM.readSheet(sheet([['SNT', 'KRW', 65]])).data, list, LOC);
  assert.deepStrictEqual([same.ok, same.error], [false, MM.UMSG.nothing]);
  MM.applyUpload(MM.checkUpload(MM.readSheet(sheet([['DPCMR', 'CYSTR', 16]])).data, list, LOC), list, 'u1', at);
  assert.strictEqual(MM.lookup(list, 'DPCMR', 'CYSTR').mileage, 16);
});

let fail = 0;
for (const [n, f] of tests) { try { f(); console.log('ok  -', n); } catch (e) { fail++; console.log('FAIL-', n, '\n   ', e.message); } }
console.log(`\n${tests.length - fail}/${tests.length} passed`);
process.exit(fail ? 1 : 0);
