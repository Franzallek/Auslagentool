const S = require('./sync.js');

function remoteStore() {
  let n = 0;
  const files = {};
  return {
    files,
    io: {
      list: async () => {
        const out = { receipts: {}, tombs: {} };
        Object.entries(files).forEach(([fid, f]) => {
          if (f.name.startsWith('r_')) out.receipts[f.name.slice(2, -5)] = { fileId: fid, updatedAt: f.props.updatedAt || '' };
          if (f.name.startsWith('t_')) out.tombs[f.name.slice(2, -5)] = { fileId: fid, deletedAt: f.props.deletedAt || '' };
        });
        return out;
      },
      read: async (fid) => JSON.parse(JSON.stringify(files[fid].data)),
      create: async (name, props, data) => { const fid = 'f' + (++n); files[fid] = { name, props, data: JSON.parse(JSON.stringify(data)) }; return fid; },
      update: async (fid, props, data) => { files[fid].props = props; files[fid].data = JSON.parse(JSON.stringify(data)); },
      remove: async (fid) => { delete files[fid]; }
    }
  };
}

function device(remote, clock) {
  let rows = [];
  let state = {};
  return {
    rows,
    get: () => rows,
    add(r) { rows.push(r); },
    edit(id, patch, at) { const r = rows.find(x => x.id === id); Object.assign(r, patch, { updatedAt: at }); },
    del(id) { rows = rows.filter(x => x.id !== id); },
    sync: () => S.syncCore({
      local: { all: async () => rows.map(r => JSON.parse(JSON.stringify(r))), put: async (l) => { l.forEach(r => { rows = rows.filter(x => x.id !== r.id); rows.push(r); }); }, del: async (id) => { rows = rows.filter(x => x.id !== id); } },
      remote: remote.io,
      state: { load: () => state, save: (s) => { state = s; } },
      now: () => clock.t()
    })
  };
}

function rec(id, vendor, at) {
  return { id, date: '2026-10-28', vendor, invoice: '', project: '', purpose: '', currency: 'EUR', net: 10000, tax: 1900, gross: 11900, status: 'Entwurf', taxes: [], file: null, updatedAt: at };
}

let tick = 0;
const clock = { t: () => '2026-11-02T10:00:' + String(++tick).padStart(2, '0') + '.000Z' };
const assert = (c, m) => { if (!c) { console.error('FEHLER:', m); process.exit(1); } };

(async () => {
  const remote = remoteStore();
  const A = device(remote, clock), B = device(remote, clock);

  A.add(rec('r1', 'Laden A', '2026-11-02T09:00:01.000Z'));
  let s = await A.sync();
  assert(s.up === 1, 'A laedt hoch');
  s = await B.sync();
  assert(s.down === 1 && B.get().length === 1, 'B laedt herunter');

  B.edit('r1', { vendor: 'Laden B neu' }, '2026-11-02T09:30:00.000Z');
  await B.sync();
  s = await A.sync();
  assert(A.get()[0].vendor === 'Laden B neu', 'A bekommt Bearbeitung von B');

  A.del('r1');
  await A.sync();
  assert(Object.values(remote.files).some(f => f.name === 't_r1.json'), 'Loeschmarke vorhanden');
  assert(!Object.values(remote.files).some(f => f.name === 'r_r1.json'), 'Remote-Beleg entfernt');
  await B.sync();
  assert(B.get().length === 0, 'B loescht ebenfalls');

  A.add(rec('r2', 'Laden C', '2026-11-02T11:00:00.000Z'));
  await A.sync();
  await B.sync();
  B.del('r2');
  A.edit('r2', { vendor: 'Laden C bearbeitet' }, '2026-11-02T12:00:00.000Z');
  await B.sync();
  await A.sync();
  assert(A.get().length === 1, 'A behaelt neuere Bearbeitung');
  await B.sync();
  assert(B.get().length === 1 && B.get()[0].vendor === 'Laden C bearbeitet', 'B bekommt Beleg zurueck');

  const bad = { id: 'x1', vendor: 5 };
  assert(!S.validReceipt(bad, 'x1'), 'ungueltiger Beleg abgelehnt');
  remote.files.fbad = { name: 'r_x1.json', props: { updatedAt: '2026-11-02T13:00:00.000Z' }, data: bad };
  s = await A.sync();
  assert(s.skipped === 1 && !A.get().some(r => r.id === 'x1'), 'ungueltige Remote-Daten uebersprungen');

  s = await A.sync();
  assert(s.up === 0 && s.down === 0, 'idempotent');
  console.log('ALLE TESTS OK');
})();
