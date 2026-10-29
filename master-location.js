// ELIPS Master Location: validation, add / update / deactivate rules, geofence (Haversine) and Auto Finish check.
// Pure logic (no DOM) so it can be used by master.html and tested with Node.
(function (root) {
  const STATUS = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' };
  const YN = ['Yes', 'No'];
  const MAX = { name: 100, gmapAddress: 300, physicalAddress: 300 };
  const EARTH_RADIUS_M = 6371008.8;   // mean Earth radius (IUGG)

  const clean = v => String(v ?? '').trim();
  const isNum = v => clean(v) !== '' && Number.isFinite(Number(v));

  function normalize(f) {
    return {
      name: clean(f.name).replace(/\s+/g, ' ').toUpperCase(), code: clean(f.code).toUpperCase(),
      gmapAddress: clean(f.gmapAddress), physicalAddress: clean(f.physicalAddress), subArea: clean(f.subArea),
      lat: isNum(f.lat) ? Number(Number(f.lat).toFixed(7)) : clean(f.lat), lng: isNum(f.lng) ? Number(Number(f.lng).toFixed(7)) : clean(f.lng),
      radius: isNum(f.radius) ? Number(f.radius) : clean(f.radius), autoFinish: clean(f.autoFinish), autoCycle: clean(f.autoCycle) || 'No',
    };
  }

  // subAreas = Sub Area master list; mode 'add' | 'update'
  function validate(form, list, subAreas, mode, current) {
    const f = normalize(form), e = {};
    if (!f.name) e.name = 'Location Name wajib diisi';
    else if (f.name.length > MAX.name) e.name = `Maksimal ${MAX.name} karakter`;
    if (!f.code) e.code = 'Location Alias wajib diisi';
    else if (!/^[A-Z0-9]{1,10}$/.test(f.code)) e.code = 'Location Alias hanya huruf / angka tanpa spasi, maksimal 10 karakter (contoh: A1, K1E)';
    // Code stays unique across ACTIVE and INACTIVE locations so historical deliveries keep a single reference
    else if (list.some(l => l !== current && l.code === f.code)) e.code = `Location Alias ${f.code} sudah dipakai`;
    ['gmapAddress', 'physicalAddress'].forEach(k => { if (f[k].length > MAX[k]) e[k] = `Maksimal ${MAX[k]} karakter`; });
    if (f.subArea && !subAreas.includes(f.subArea)) e.subArea = 'Location Sub Area tidak terdaftar di master Sub Area';
    if (f.lat === '' || f.lng === '') e.coord = 'Koordinat wajib: pilih lokasi di peta atau isi Latitude / Longitude';
    if (f.lat !== '' && !(isNum(f.lat) && f.lat >= -90 && f.lat <= 90)) e.lat = 'Latitude harus angka -90 s/d 90';
    if (f.lng !== '' && !(isNum(f.lng) && f.lng >= -180 && f.lng <= 180)) e.lng = 'Longitude harus angka -180 s/d 180';
    if (f.radius === '') e.radius = 'Radius wajib diisi';
    else if (!(isNum(f.radius) && f.radius > 0)) e.radius = 'Radius harus angka lebih dari 0 (meter)';
    if (!YN.includes(f.autoFinish)) e.autoFinish = 'Auto Finish Order wajib dipilih (Yes / No)';
    if (!YN.includes(f.autoCycle)) e.autoCycle = 'Auto Generate Cycle harus Yes / No';
    if (mode === 'update') {
      if (!current) e._ = 'Data tidak ditemukan';
      else if (current.status === STATUS.INACTIVE) e._ = `Lokasi ${current.code} sudah INACTIVE, tidak bisa diubah`;
      // A location already used by deliveries keeps its code so history stays readable
      else if (current.usedInDelivery && f.code !== current.code) e.code = 'Location Alias tidak bisa diubah karena sudah dipakai di transaksi delivery';
    }
    return { ok: !Object.keys(e).length, errors: e, data: f };
  }

  function add(form, list, subAreas, user, at) {
    const r = validate(form, list, subAreas, 'add');
    if (!r.ok) return r;
    const loc = { ...r.data, status: STATUS.ACTIVE, usedInDelivery: false, createdBy: user, createdAt: at, updatedBy: user, updatedAt: at, version: 1 };
    list.push(loc);
    return { ok: true, location: loc };
  }
  function update(form, list, subAreas, current, version, user, at) {
    if (current && current.version !== version) return { ok: false, errors: { _: 'Data sudah diubah user lain, silakan Cancel lalu Edit ulang' } };
    const r = validate(form, list, subAreas, 'update', current);
    if (!r.ok) return r;
    Object.assign(current, r.data, { updatedBy: user, updatedAt: at, version: current.version + 1 });
    return { ok: true, location: current };
  }
  // Used in delivery -> Deactivate (status INACTIVE, history kept). Never used -> Delete is allowed.
  const removalAction = loc => loc.usedInDelivery ? 'deactivate' : 'delete';
  function deactivate(loc, user, at) {
    if (!loc) return { ok: false, error: 'Data tidak ditemukan' };
    if (loc.status === STATUS.INACTIVE) return { ok: false, error: `Lokasi ${loc.code} sudah INACTIVE` };
    Object.assign(loc, { status: STATUS.INACTIVE, updatedBy: user, updatedAt: at, version: loc.version + 1 });
    return { ok: true };
  }
  function remove(loc, list) {
    if (!loc) return { ok: false, error: 'Data tidak ditemukan' };
    if (loc.usedInDelivery) return { ok: false, error: `Lokasi ${loc.code} sudah dipakai di transaksi delivery, gunakan Deactivate` };
    list.splice(list.indexOf(loc), 1);
    return { ok: true };
  }

  // ---------- Geofence ----------
  const rad = d => d * Math.PI / 180;
  // Great-circle distance in meters (Haversine formula)
  function distanceMeters(lat1, lng1, lat2, lng2) {
    const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  // Manual closing check: outside the radius only produces a warning, the closing itself is not blocked
  function geofence(loc, gpsLat, gpsLng) {
    const distance = distanceMeters(loc.lat, loc.lng, Number(gpsLat), Number(gpsLng));
    const inside = distance <= loc.radius;
    return {
      distance, inside, status: inside ? 'INSIDE GEOFENCE' : 'OUTSIDE GEOFENCE',
      warning: inside ? '' : 'Anda melakukan closing delivery di luar radius lokasi tujuan.',
    };
  }
  // Finish record for the delivery history: AUTO when the destination allows Auto Finish and the trigger is met
  function finishRecord(loc, { trigger, gpsLat, gpsLng, at, user }) {
    const auto = loc.autoFinish === 'Yes' && !!trigger;
    const gps = gpsLat !== undefined && gpsLat !== '' ? { lat: Number(gpsLat), lng: Number(gpsLng) } : null;
    return {
      mechanism: auto ? 'AUTO' : 'MANUAL/SCAN', finishedAt: at, destination: loc.code,
      gps, geofence: gps ? geofence(loc, gps.lat, gps.lng).status : 'NO GPS', by: auto ? 'SYSTEM' : user,
    };
  }

  const api = { STATUS, YN, MAX, normalize, validate, add, update, removalAction, deactivate, remove, distanceMeters, geofence, finishRecord };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MasterLocation = api;
})(this);
