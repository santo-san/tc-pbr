// ELIPS Master Trucking Company: validation and add / update / delete rules for tc-PBR vendors.
// Pure logic (no DOM) so it can be used by master.html and tested with Node.
(function (root) {
  const SERVICE_TYPES = ['MRO'];
  const FIELDS = [
    ['name', 'Vendor Name', true], ['code', 'Vendor Code', true], ['sapCode', 'SAP Vendor Code', true], ['serviceType', 'Service Type', true],
    ['npwp', 'NPWP', true], ['contact', 'Contact Name', false], ['email', 'E-Mail', false], ['phone', 'Phone', false],
    ['mobile', 'Mobile Phone', false], ['address', 'Address', false],
  ];
  const MAX = { name: 100, contact: 100, email: 100, address: 300 };

  const clean = v => String(v ?? '').trim();
  const digits = v => clean(v).replace(/\D/g, '');
  // NPWP (16 digits) shown as 999.999.999.9-999.999, as on the existing vendor list
  function formatNPWP(v) {
    const d = digits(v);
    if (d.length !== 16) return clean(v);
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}.${d.slice(9, 10)}-${d.slice(10, 13)}.${d.slice(13)}`;
  }

  function normalize(f) {
    return {
      name: clean(f.name).replace(/\s+/g, ' ').toUpperCase(), code: clean(f.code).toUpperCase(), sapCode: clean(f.sapCode),
      serviceType: clean(f.serviceType), npwp: formatNPWP(f.npwp), contact: clean(f.contact), email: clean(f.email).toLowerCase(),
      phone: clean(f.phone), mobile: clean(f.mobile), address: clean(f.address),
    };
  }

  // mode 'add' | 'update'; current = record being updated
  function validate(form, list, mode, current) {
    const f = normalize(form), errors = {};
    FIELDS.forEach(([k, label, req]) => { if (req && !f[k]) errors[k] = `${label} wajib diisi`; });
    Object.entries(MAX).forEach(([k, n]) => { if (!errors[k] && f[k].length > n) errors[k] = `Maksimal ${n} karakter`; });
    if (!errors.code && !/^[A-Z0-9]{3}$/.test(f.code)) errors.code = 'Vendor Code harus 3 karakter huruf / angka (contoh: DNX)';
    if (!errors.sapCode && !/^\d{10}$/.test(f.sapCode)) errors.sapCode = 'SAP Vendor Code harus 10 digit angka (contoh: 4000006763)';
    if (!errors.serviceType && !SERVICE_TYPES.includes(f.serviceType)) errors.serviceType = 'Service Type tidak valid';
    if (!errors.npwp && digits(f.npwp).length !== 16) errors.npwp = 'NPWP harus 16 digit (format 999.999.999.9-999.999)';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) errors.email = 'Format E-Mail tidak valid';
    if (f.phone && !/^\+?[\d\s()-]{6,20}$/.test(f.phone)) errors.phone = 'Phone hanya angka, spasi, +, -, ( ) (6-20 karakter)';
    if (f.mobile && !/^(\+62|62|0)8\d{7,12}$/.test(f.mobile.replace(/[\s-]/g, ''))) errors.mobile = 'Mobile Phone harus diawali 08 / +628 (10-15 digit)';

    // Uniqueness is checked against active (not deleted) vendors
    const others = list.filter(v => !v.deleted && v !== current);
    if (!errors.code && others.some(v => v.code === f.code)) errors.code = `Vendor Code ${f.code} sudah dipakai`;
    if (!errors.sapCode && others.some(v => v.sapCode === f.sapCode)) errors.sapCode = `SAP Vendor Code ${f.sapCode} sudah dipakai`;
    if (!errors.npwp && others.some(v => digits(v.npwp) === digits(f.npwp))) errors.npwp = `NPWP sudah dipakai vendor lain`;
    if (mode === 'update') {
      if (!current) errors._ = 'Data tidak ditemukan';
      else if (current.deleted) errors._ = `Vendor ${current.code} sudah dihapus, tidak bisa di-update`;
      else if (f.code !== current.code) errors.code = 'Vendor Code tidak bisa diubah';
    }
    return { ok: !Object.keys(errors).length, errors, data: f };
  }

  function add(form, list, user, at) {
    const r = validate(form, list, 'add');
    if (!r.ok) return r;
    const v = { ...r.data, deleted: false, createdBy: user, createdAt: at, updatedBy: user, updatedAt: at, version: 1 };
    list.push(v);
    return { ok: true, vendor: v };
  }
  // version = optimistic concurrency check: the record must not have changed since it was loaded into the form
  function update(form, list, current, version, user, at) {
    if (current && current.version !== version) return { ok: false, errors: { _: 'Data sudah diubah user lain, silakan Cancel lalu Update ulang' } };
    const r = validate(form, list, 'update', current);
    if (!r.ok) return r;
    Object.assign(current, r.data, { updatedBy: user, updatedAt: at, version: current.version + 1 });
    return { ok: true, vendor: current };
  }
  // Logical delete: the record stays in the list with Deletion = Yes and can no longer be updated or deleted
  function remove(current, usage, user, at) {
    if (!current) return { ok: false, error: 'Data tidak ditemukan' };
    if (current.deleted) return { ok: false, error: `Vendor ${current.code} sudah dihapus` };
    const used = usage[current.code];
    if (used) return { ok: false, error: `Vendor ${current.code} masih dipakai di ${used}, tidak bisa dihapus` };
    Object.assign(current, { deleted: true, updatedBy: user, updatedAt: at, version: current.version + 1 });
    return { ok: true };
  }

  const api = { SERVICE_TYPES, FIELDS, MAX, formatNPWP, normalize, validate, add, update, remove };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MasterTrucking = api;
})(this);
