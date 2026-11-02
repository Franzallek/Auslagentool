(function (root) {
  'use strict';
  var SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  var DRIVE = 'https://www.googleapis.com/drive/v3';
  var UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  var STATE_KEY = 'auslagen-sync-state-v1';
  var HINT_KEY = 'auslagen-sync-connected';

  /* ---------- Abgleichslogik (ohne Browser, testbar) ---------- */
  function validReceipt(r, id) {
    if (!r || typeof r !== 'object' || r.id !== id) return false;
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return false;
    if (typeof r.vendor !== 'string' || typeof r.date !== 'string') return false;
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(r.date)) return false;
    if (['EUR', 'USD', 'GBP', 'CHF'].indexOf(r.currency) < 0) return false;
    if (['Entwurf', 'Geprüft', 'Eingereicht', 'Erstattet'].indexOf(r.status) < 0) return false;
    if (![r.net, r.tax, r.gross].every(Number.isSafeInteger)) return false;
    if (!Array.isArray(r.taxes)) return false;
    if (['invoice', 'project', 'purpose'].some(function (k) { return typeof r[k] !== 'string'; })) return false;
    if (r.file) {
      var typeOk = new RegExp('^image/[a-z0-9.+-]+$|^application/pdf$', 'i').test(r.file.type || '');
      if (typeof r.file.name !== 'string' || !typeOk || typeof r.file.data !== 'string') return false;
      if (r.file.data.indexOf('data:' + r.file.type + ';base64,') !== 0) return false;
    }
    return true;
  }

  async function syncCore(io) {
    var stats = { up: 0, down: 0, removed: 0, skipped: 0 };
    var local = await io.local.all();
    var remote = await io.remote.list();
    var st = io.state.load() || {};
    var known = st.known || {};
    var byId = {};
    local.forEach(function (r) { byId[r.id] = r; });
    var id;

    // 1) Lokal gelöschte Belege
    for (id of Object.keys(known)) {
      if (byId[id]) continue;
      var rr = remote.receipts[id];
      if (rr && rr.updatedAt > known[id]) continue; // anderswo neuer bearbeitet: behalten
      if (rr) { await io.remote.remove(rr.fileId); delete remote.receipts[id]; stats.removed++; }
      if (!remote.tombs[id]) {
        var at = io.now();
        var fid = await io.remote.create('t_' + id + '.json', { deletedAt: at }, { id: id, deletedAt: at });
        remote.tombs[id] = { fileId: fid, deletedAt: at };
      }
    }

    // 2) Löschmarken (anderswo gelöscht)
    for (id of Object.keys(remote.tombs)) {
      var tomb = remote.tombs[id];
      var lu = byId[id] ? (byId[id].updatedAt || '') : '';
      var ru = remote.receipts[id] ? remote.receipts[id].updatedAt : '';
      var newest = lu > ru ? lu : ru;
      if (newest > tomb.deletedAt) {
        await io.remote.remove(tomb.fileId); delete remote.tombs[id];
      } else {
        if (byId[id]) { await io.local.del(id); delete byId[id]; stats.removed++; }
        if (remote.receipts[id]) { await io.remote.remove(remote.receipts[id].fileId); delete remote.receipts[id]; }
      }
    }

    // 3) Belege abgleichen
    var ids = {};
    Object.keys(byId).forEach(function (k) { ids[k] = 1; });
    Object.keys(remote.receipts).forEach(function (k) { ids[k] = 1; });
    for (id of Object.keys(ids)) {
      var l = byId[id], r = remote.receipts[id];
      var lUp = l ? (l.updatedAt || '') : '';
      if (l && !r) {
        await io.remote.create('r_' + id + '.json', { updatedAt: lUp }, l); stats.up++;
      } else if (!l && r) {
        var got = await io.remote.read(r.fileId);
        if (validReceipt(got, id)) { await io.local.put([got]); byId[id] = got; stats.down++; } else { stats.skipped++; }
      } else if (lUp > r.updatedAt) {
        await io.remote.update(r.fileId, { updatedAt: lUp }, l); stats.up++;
      } else if (r.updatedAt > lUp) {
        var got2 = await io.remote.read(r.fileId);
        if (validReceipt(got2, id)) { await io.local.put([got2]); byId[id] = got2; stats.down++; } else { stats.skipped++; }
      }
    }

    var nk = {};
    Object.keys(byId).forEach(function (k) { nk[k] = byId[k].updatedAt || ''; });
    io.state.save({ known: nk, lastSync: io.now() });
    return stats;
  }

  var api = { syncCore: syncCore, validReceipt: validReceipt };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.AuslagenSync = api;
  if (typeof document === 'undefined') return;

  /* ---------- Google Drive (Browser) ---------- */
  var token = null, tokenExp = 0, gisPromise = null;
  var clientId = function () { return String(root.AUSLAGEN_GOOGLE_CLIENT_ID || ''); };

  function loadGis() {
    if (root.google && root.google.accounts && root.google.accounts.oauth2) return Promise.resolve();
    if (gisPromise) return gisPromise;
    gisPromise = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { gisPromise = null; rej(new Error('Google-Anmeldung konnte nicht geladen werden (offline?).')); };
      document.head.appendChild(s);
    });
    return gisPromise;
  }

  function getToken() {
    if (token && Date.now() < tokenExp - 60000) return Promise.resolve(token);
    return loadGis().then(function () {
      return new Promise(function (res, rej) {
        var client = root.google.accounts.oauth2.initTokenClient({
          client_id: clientId(),
          scope: SCOPE,
          callback: function (r) {
            if (r.error) { rej(new Error('Anmeldung abgebrochen: ' + r.error)); return; }
            token = r.access_token;
            tokenExp = Date.now() + (Number(r.expires_in) || 3600) * 1000;
            res(token);
          },
          error_callback: function (e) { rej(new Error('Anmeldung nicht abgeschlossen' + (e && e.type ? ' (' + e.type + ')' : '') + '.')); }
        });
        client.requestAccessToken({ prompt: '' });
      });
    });
  }

  async function call(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ Authorization: 'Bearer ' + token }, opts.headers || {});
    var r = await fetch(url, opts);
    if (r.status === 401) { token = null; throw new Error('Anmeldung abgelaufen. Bitte erneut verbinden.'); }
    if (r.status === 403) throw new Error('Zugriff verweigert (403). Ist die Google-Drive-API im Cloud-Projekt aktiviert?');
    if (!r.ok) throw new Error('Google Drive Fehler ' + r.status + '.');
    return r;
  }

  function multipart(meta, data) {
    var b = 'auslagen' + Math.random().toString(36).slice(2);
    var CRLF = String.fromCharCode(13, 10);
    var body = '--' + b + CRLF + 'Content-Type: application/json; charset=UTF-8' + CRLF + CRLF + JSON.stringify(meta) + CRLF +
      '--' + b + CRLF + 'Content-Type: application/json; charset=UTF-8' + CRLF + CRLF + JSON.stringify(data) + CRLF + '--' + b + '--';
    return { body: body, type: 'multipart/related; boundary=' + b };
  }

  var remoteIo = {
    list: async function () {
      var out = { receipts: {}, tombs: {} }, page = '';
      do {
        var url = DRIVE + '/files?spaces=appDataFolder&pageSize=1000&fields=' +
          encodeURIComponent('nextPageToken,files(id,name,appProperties)') + (page ? '&pageToken=' + encodeURIComponent(page) : '');
        var j = await (await call(url)).json();
        (j.files || []).forEach(function (f) {
          var n = f.name || '', p = f.appProperties || {};
          if (n.indexOf('r_') === 0 && n.slice(-5) === '.json') out.receipts[n.slice(2, -5)] = { fileId: f.id, updatedAt: p.updatedAt || '' };
          else if (n.indexOf('t_') === 0 && n.slice(-5) === '.json') out.tombs[n.slice(2, -5)] = { fileId: f.id, deletedAt: p.deletedAt || '' };
        });
        page = j.nextPageToken || '';
      } while (page);
      return out;
    },
    read: async function (fileId) {
      return (await call(DRIVE + '/files/' + encodeURIComponent(fileId) + '?alt=media')).json();
    },
    create: async function (name, props, data) {
      var m = multipart({ name: name, parents: ['appDataFolder'], appProperties: props }, data);
      var r = await call(UPLOAD + '/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': m.type }, body: m.body });
      return (await r.json()).id;
    },
    update: async function (fileId, props, data) {
      var m = multipart({ appProperties: props }, data);
      await call(UPLOAD + '/files/' + encodeURIComponent(fileId) + '?uploadType=multipart&fields=id', { method: 'PATCH', headers: { 'Content-Type': m.type }, body: m.body });
    },
    remove: async function (fileId) {
      await call(DRIVE + '/files/' + encodeURIComponent(fileId), { method: 'DELETE' });
    }
  };

  function loadState() { try { return JSON.parse(localStorage.getItem(STATE_KEY) || 'null') || {}; } catch (e) { return {}; } }
  function saveState(s) { localStorage.setItem(STATE_KEY, JSON.stringify(s)); }

  /* ---------- Oberfläche ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function disclose() {
    var notice = document.querySelector('.notice');
    var footer = document.querySelector('footer');
    var note = ' Bei aktivem Geräte-Abgleich werden Belegdaten und Belegbilder zusätzlich in dein Google Drive (App-Ordner) übertragen.';
    if (notice && !notice.getAttribute('data-sync')) { notice.setAttribute('data-sync', '1'); notice.appendChild(document.createTextNode(note)); }
    if (footer && !footer.getAttribute('data-sync')) { footer.setAttribute('data-sync', '1'); footer.appendChild(document.createTextNode(' Geräte-Abgleich aktiv: Anbieter Google (Drive, Anmeldung).')); }
  }

  function buildUi() {
    var host = document.getElementById('export');
    if (!host) return;
    var card = el('div', 'card');
    card.appendChild(el('h2', '', 'Geräte-Abgleich (Google Drive)'));
    card.appendChild(el('p', 'sub', 'Gleicht deine Belege samt Bildern zwischen Handy und PC ab. Dafür meldest du dich mit deinem Google-Konto an. Die Daten liegen im versteckten App-Ordner deines Google Drive und zählen auf dein Speicherkontingent. Beim Verbinden wird ein Skript von Google geladen. Ohne Verbindung bleibt alles nur auf diesem Gerät.'));
    var status = el('p', 'sub', '');
    status.setAttribute('role', 'status');
    var actions = el('div', 'actions');
    var go = el('button', '', 'Mit Google verbinden und abgleichen');
    go.type = 'button';
    var off = el('button', 'secondary', 'Verbindung trennen');
    off.type = 'button';
    actions.appendChild(go); actions.appendChild(off);
    card.appendChild(actions); card.appendChild(status);
    host.insertBefore(card, host.firstChild);

    function showLast() {
      var s = loadState();
      status.textContent = s.lastSync ? 'Letzter Abgleich: ' + new Date(s.lastSync).toLocaleString('de-DE') : (clientId() ? 'Noch nicht abgeglichen.' : 'Noch nicht eingerichtet: Es fehlt die Google-Client-ID.');
    }
    showLast();
    if (localStorage.getItem(HINT_KEY)) disclose();

    go.onclick = async function () {
      if (!clientId()) { status.textContent = 'Noch nicht eingerichtet: Es fehlt die Google-Client-ID.'; return; }
      if (!localStorage.getItem(HINT_KEY) && !confirm('Google-Skript laden und deine Belege samt Bildern in den App-Ordner deines Google Drive abgleichen?')) return;
      go.disabled = true;
      try {
        status.textContent = 'Verbinde mit Google …';
        await getToken();
        status.textContent = 'Gleiche ab …';
        var stats = await syncCore({
          local: { all: function () { return dbAll(); }, put: function (l) { return dbPut(l); }, del: function (id) { return dbDel(id); } },
          remote: remoteIo,
          state: { load: loadState, save: saveState },
          now: function () { return new Date().toISOString(); }
        });
        db = await dbAll();
        render();
        localStorage.setItem(HINT_KEY, '1');
        disclose();
        status.textContent = 'Fertig: ' + stats.up + ' hochgeladen, ' + stats.down + ' geladen, ' + stats.removed + ' gelöscht' + (stats.skipped ? ', ' + stats.skipped + ' ungültig übersprungen' : '') + '.';
      } catch (e) {
        status.textContent = 'Abgleich fehlgeschlagen: ' + (e && e.message ? e.message : e);
      } finally { go.disabled = false; }
    };

    off.onclick = function () {
      if (!confirm('Verbindung trennen? Lokale Belege bleiben erhalten. Daten im Google Drive bleiben bestehen.')) return;
      if (token && root.google && root.google.accounts && root.google.accounts.oauth2) { try { root.google.accounts.oauth2.revoke(token, function () {}); } catch (e) { /* ignorieren */ } }
      token = null; tokenExp = 0;
      localStorage.removeItem(HINT_KEY); localStorage.removeItem(STATE_KEY);
      status.textContent = 'Getrennt. Lokale Belege bleiben erhalten.';
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUi); else buildUi();
})(typeof self !== 'undefined' ? self : this);
