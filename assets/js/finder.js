/* Search page (Kerrigan tracker 249). Vanilla ES2017, no build step.
   Reads the kerr-finder API at data-api (contract: GET {api}/v1/search and
   GET {api}/v1/crisis). API strings reach the DOM through textContent only. */
(function () {
  'use strict';

  var root = document.getElementById('finder');
  if (!root) return;

  var API = (root.getAttribute('data-api') || '').replace(/\/+$/, '');
  var PAGE_SIZE = 200;
  var VA_CENTER = [-79.4, 37.5];
  // Basemaps, all free and keyless: OpenFreeMap vector styles, and USGS National
  // Map imagery (public domain, covers Virginia) for satellite.
  var BASEMAPS = {
    dark: 'https://tiles.openfreemap.org/styles/dark',
    light: 'https://tiles.openfreemap.org/styles/positron',
    streets: 'https://tiles.openfreemap.org/styles/liberty',
    '3d': 'https://tiles.openfreemap.org/styles/liberty', // same style; its building layer shows from zoom 14 once the map is tilted
    satellite: {
      version: 8,
      sources: { usgs: { type: 'raster', tileSize: 256, maxzoom: 16,
        tiles: ['https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'],
        attribution: 'Imagery: USGS National Map' } },
      layers: [{ id: 'usgs', type: 'raster', source: 'usgs' }]
    }
  };
  var BASEMAP_KEY = 'finder-basemap';
  function savedBasemap() {
    try { var k = window.localStorage.getItem(BASEMAP_KEY); if (k && BASEMAPS[k]) return k; } catch (e) { /* storage blocked */ }
    return 'dark';
  }
  var basemap = savedBasemap();

  var form = document.getElementById('finder-form');
  var details = root.querySelector('.finder-filters');
  var statusEl = document.getElementById('finder-status');
  var errorEl = document.getElementById('finder-error');
  var fullEl = document.getElementById('finder-full');
  var partialEl = document.getElementById('finder-partial');
  var partialHead = document.getElementById('finder-partial-head');
  var moreBtn = document.getElementById('finder-more');
  var areaBtn = document.getElementById('finder-area');
  var mapNote = document.getElementById('finder-map-note');
  var crisisEl = document.getElementById('finder-crisis');
  var crisisExtra = document.getElementById('finder-crisis-extra');
  var crisisHead = document.getElementById('finder-crisis-head');

  // Filters in the API contract, in form order. Multi-valued ones are sent comma-joined.
  // 'miles' is page-only: it becomes a map box around the place typed in q (see run).
  var FILTERS = ['q', 'town', 'miles', 'domain', 'setting', 'wm', 'length', 'payment', 'moud',
    'co_occurring', 'gender', 'age', 'population', 'language'];

  var FILTER_NAMES = {
    q: 'name or town', town: 'town', domain: 'type of care', setting: 'setting',
    wm: 'withdrawal management', length: 'length of stay', payment: 'payment',
    moud: 'medication for opioid use disorder', co_occurring: 'co-occurring disorders',
    gender: 'gender served', age: 'age', population: 'population', language: 'language',
    bbox: 'map area'
  };

  // Facets in display order, with their row label.
  var FACETS = [
    ['setting', 'Setting'], ['wm', 'Withdrawal management'], ['length', 'Length of stay'],
    ['payment', 'Payment'], ['moud', 'Medication for OUD'], ['co_occurring', 'Co-occurring'],
    ['gender', 'Gender served'], ['age', 'Age'], ['population', 'Population'],
    ['language', 'Language'], ['admission_rules', 'Admission rules'],
    ['referral_paperwork', 'Referral paperwork'], ['medicaid_level', 'Medicaid level'],
    ['licensed_level', 'Licensed level']
  ];

  var KEY_LABELS = {
    medicaid: 'Medicaid', medicare: 'Medicare', private: 'Private insurance',
    sliding_fee: 'Sliding fee scale', state_funded: 'State funded',
    children: 'Children / adolescents', young_adults: 'Young adults', adults: 'Adults', seniors: 'Seniors',
    pregnant_postpartum: 'Pregnant / postpartum', veterans: 'Veterans',
    justice_involved: 'Justice involved', adolescents: 'Adolescents',
    female: 'Female', male: 'Male', short_term: 'Short-term residential', long_term: 'Long-term residential',
    spanish: 'Spanish', asl: 'Sign language (ASL)', other: 'Other languages'
  };

  var state = { params: null, offset: 0, total: 0, results: [], bbox: null, seq: 0 };
  var map = null;
  var initialBbox = '';
  var mapReady = false;
  var lastFC = { type: 'FeatureCollection', features: [] };

  // ── helpers ──────────────────────────────────────────────
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function humanize(slug) {
    if (KEY_LABELS[slug]) return KEY_LABELS[slug];
    var s = String(slug).replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function triWord(v) {
    if (v === 'yes') return 'Yes';
    if (v === 'no') return 'No';
    return 'Unknown';
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function hideError() { errorEl.hidden = true; errorEl.textContent = ''; }

  // ── form and URL state ───────────────────────────────────
  function readForm() {
    var p = {};
    FILTERS.forEach(function (name) {
      var inputs = form.querySelectorAll('[name="' + name + '"]');
      var vals = [];
      Array.prototype.forEach.call(inputs, function (i) {
        if ((i.type === 'checkbox' || i.type === 'radio') ? i.checked : true) {
          var v = (i.value || '').trim();
          if (v) vals.push(v);
        }
      });
      if (vals.length && !(name === 'miles' && vals[0] === '0')) p[name] = vals.join(',');
    });
    return p;
  }

  function writeForm(p) {
    FILTERS.forEach(function (name) {
      var vals = p[name] ? String(p[name]).split(',') : [];
      var inputs = form.querySelectorAll('[name="' + name + '"]');
      Array.prototype.forEach.call(inputs, function (i) {
        if (i.type === 'checkbox') i.checked = vals.indexOf(i.value) !== -1;
        else if (i.type === 'radio') i.checked = vals.length ? vals.indexOf(i.value) !== -1 : i.value === '';
        else i.value = vals.length ? vals.join(',') : (i.type === 'range' ? '0' : '');
      });
    });
    syncReveal();
    showMiles();
  }

  // A sub-choice shows only under the choice it belongs to, and is cleared when hidden.
  function syncReveal() {
    Array.prototype.forEach.call(form.querySelectorAll('[data-showif]'), function (box) {
      var rule = box.getAttribute('data-showif').split('=');
      var wanted = rule[1].split('|');
      var on = Array.prototype.some.call(form.querySelectorAll('[name="' + rule[0] + '"]'), function (i) { return i.checked && wanted.indexOf(i.value) !== -1; });
      box.hidden = !on;
      if (!on) Array.prototype.forEach.call(box.querySelectorAll('input'), function (i) { i.checked = false; });
    });
  }

  function showMiles() {
    var r = form.querySelector('[name="miles"]');
    var out = document.getElementById('finder-miles-out');
    if (r && out) out.textContent = r.value === '0' ? 'Anywhere' : 'Within ' + r.value + ' miles';
  }

  // A distance is a map box around the town. The centre is the median of the
  // points the town matches; the box replaces the town so neighbours are included.
  // Returns the params the API takes. No matching place: the name search alone.
  function run(userParams, append) {
    return apiParamsFor(userParams).then(function (api) {
      // A distance search frames the box it asked for (search() only frames results when no box was sent).
      var wsen = (parseFloat(userParams.miles) > 0 && api.bbox) ? parseBbox(api.bbox) : null;
      if (wsen && map && !append) {
        try { map.fitBounds([[wsen[0], wsen[1]], [wsen[2], wsen[3]]], { animate: false }); } catch (e) { /* keep the view */ }
      }
      return search(api, append);
    }).catch(function (err) {
      showError('The search could not reach the directory (' + err.message + '). Check your connection and try again.');
    });
  }

  // Counselors choose Outpatient; the directory also files day treatment and
  // intensive outpatient there. Outpatient sends outpatient + day treatment;
  // with "Intensive outpatient only" it sends intensive outpatient alone.
  // Setting values combine as OR, so the narrowing choice replaces, never adds.
  function mapSettingParams(api) {
    if (!api.setting) return api;
    var list = String(api.setting).split(',');
    var only = list.indexOf('intensive_outpatient') !== -1;
    var out = [];
    list.forEach(function (v) {
      if (v === 'outpatient') { if (only) out.push('intensive_outpatient'); else out.push('outpatient', 'day_treatment'); }
      else if (v !== 'intensive_outpatient') out.push(v);
    });
    if (only && list.indexOf('outpatient') === -1) out.push('intensive_outpatient');
    api.setting = out.join(',');
    return api;
  }

  function apiParamsFor(userParams) {
    return apiParamsBase(userParams).then(mapSettingParams);
  }

  function apiParamsBase(userParams) {
    var miles = parseFloat(userParams.miles);
    if (!(miles > 0) || !userParams.town) {
      var plain = {};
      Object.keys(userParams).forEach(function (k) { if (k !== 'miles') plain[k] = userParams[k]; });
      return Promise.resolve(plain);
    }
    var probe = { town: userParams.town, limit: 100 };
    return getJSON('/v1/search', probe).then(function (body) {
      var pts = ((body && body.results) || []).filter(function (r) { return validPoint(r); });
      var api = {};
      Object.keys(userParams).forEach(function (k) { if (k !== 'miles') api[k] = userParams[k]; });
      if (!pts.length) return api;
      var lat = median(pts.map(function (r) { return r.lat; }));
      var lng = median(pts.map(function (r) { return r.lng; }));
      var dLat = miles / 69;
      var dLng = miles / (69 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
      delete api.town; // the box replaces the town so neighbouring towns count
      api.bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map(function (x) { return x.toFixed(5); }).join(',');
      return api;
    });
  }

  function paramsFromLocation() {
    var sp = new URLSearchParams(window.location.search);
    var p = {};
    FILTERS.concat(['bbox']).forEach(function (name) {
      var all = sp.getAll(name).filter(Boolean);
      if (all.length) p[name] = all.join(',');
    });
    return p;
  }

  function pushLocation(p) {
    var sp = new URLSearchParams();
    Object.keys(p).forEach(function (k) { sp.set(k, p[k]); });
    var qs = sp.toString();
    var url = window.location.pathname + (qs ? '?' + qs : '');
    try { window.history.replaceState(null, '', url); } catch (e) { /* ignore */ }
  }

  // ── fetch ────────────────────────────────────────────────
  function getJSON(path, params) {
    var sp = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) { sp.set(k, params[k]); });
    var url = API + path + (sp.toString() ? '?' + sp.toString() : '');
    return fetch(url, { credentials: 'omit', headers: { Accept: 'application/json' } })
      .then(function (res) {
        return res.json().catch(function () { return null; }).then(function (body) {
          if (!res.ok) {
            var msg = body && body.error ? body.error : 'HTTP ' + res.status;
            throw new Error(msg);
          }
          return body;
        });
      });
  }

  var TEL_RE = /^\+?[0-9\s().-]+$/;

  function search(params, append) {
    var seq = ++state.seq;
    if (!append) {
      state.params = params;
      state.offset = 0;
      state.results = [];
    }
    var q = {};
    Object.keys(state.params).forEach(function (k) { q[k] = state.params[k]; });
    q.limit = PAGE_SIZE;
    q.offset = state.offset;

    hideError();
    statusEl.textContent = 'Searching…';
    moreBtn.hidden = true;
    var cseq = append ? 0 : resetCrisis(state.params);

    return getJSON('/v1/search', q).then(function (body) {
      if (seq !== state.seq) return;
      var results = (body && Array.isArray(body.results)) ? body.results : [];
      state.total = typeof body.total === 'number' ? body.total : results.length;
      state.results = state.results.concat(results);
      state.offset = state.results.length;
      if (!append) {
        if (map && !parseBbox(params.bbox)) fitToResults(results);
        lookupCrisis(params, cseq, crisisPoint(params, body, results));
      }
      render();
    }).catch(function (err) {
      if (seq !== state.seq) return;
      statusEl.textContent = '';
      if (!append) { clear(fullEl); clear(partialEl); partialHead.hidden = true; setPins([]); }
      showError('The search could not reach the directory (' + err.message + '). Check your connection and try again.');
    });
  }

  // ── rendering ────────────────────────────────────────────
  function facetValue(key, facet) {
    if (!facet || facet.value === undefined || facet.value === null) return [['Unknown', true]];
    var v = facet.value;
    if (typeof v === 'string') {
      if (v === 'yes' || v === 'no' || v === 'unknown') return [[triWord(v), v === 'unknown']];
      return [[humanize(v), false]];
    }
    if (Array.isArray(v)) {
      if (key === 'language' && facet.reported === false) return [['Unknown', true]];
      if (!v.length) return [['Unknown', true]];
      var labels = Array.isArray(facet.labels) && facet.labels.length === v.length ? facet.labels : v.map(humanize);
      return [[labels.join(', '), false]];
    }
    if (typeof v === 'object') {
      var keys = Object.keys(v);
      if (!keys.length) return [['Unknown', true]];
      return keys.map(function (k) {
        var t = v[k];
        if (key === 'payment' && t === 'yes') return ['Reports ' + humanize(k), false];
        return [humanize(k) + ': ' + triWord(t), t !== 'yes' && t !== 'no'];
      });
    }
    return [['Unknown', true]];
  }

  // Key facts as icons with hover text. Only answers the directory reports as yes are shown.
  var ICONS = {
    medicaid: { tip: 'Accepts Medicaid', body: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>' },
    medicare: { tip: 'Accepts Medicare', body: '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 10h18M7 15h4"/>' },
    mat: { tip: 'Medication for opioid use disorder (methadone or buprenorphine)', body: '<path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l10-10a4.95 4.95 0 0 1 7 7z"/><path d="M8.5 8.5l7 7"/>' },
    housing: { tip: 'Residential program (live-in housing)', body: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>' },
    detox: { tip: 'Offers withdrawal management (detox)', body: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>' },
    dual: { tip: 'Treats co-occurring mental health and substance use', body: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>' }
  };

  function iconKeys(r) {
    var f = r.facets || {};
    var out = [];
    var pay = f.payment && f.payment.value;
    if (pay && typeof pay === 'object') {
      if (pay.medicaid === 'yes') out.push('medicaid');
      if (pay.medicare === 'yes') out.push('medicare');
    }
    if (f.moud && f.moud.value === 'yes') out.push('mat');
    var st = f.setting && f.setting.value;
    if (Array.isArray(st) && st.indexOf('residential') !== -1) out.push('housing');
    if (f.wm && f.wm.value === 'yes') out.push('detox');
    if (f.co_occurring && f.co_occurring.value === 'yes') out.push('dual');
    return out;
  }

  function iconStrip(r, labelled) {
    var keys = iconKeys(r);
    if (!keys.length) return null;
    var wrap = el('span', 'finder-icons');
    keys.forEach(function (k) {
      var ic = el('span', 'finder-ico');
      ic.setAttribute('data-k', k);
      ic.setAttribute('data-tip', ICONS[k].tip);
      ic.setAttribute('aria-label', ICONS[k].tip);
      ic.setAttribute('role', 'img');
      ic.tabIndex = 0;
      ic.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[k].body + '</svg>';
      if (labelled) ic.appendChild(el('span', 'finder-ico-label', ICONS[k].tip));
      wrap.appendChild(ic);
    });
    if (labelled) wrap.className += ' is-labelled';
    return wrap;
  }

  function compactTags(r) {
    var f = r.facets || {};
    var out = [];
    var st = f.setting && f.setting.value;
    if (Array.isArray(st) && st.length) {
      var labels = Array.isArray(f.setting.labels) && f.setting.labels.length === st.length ? f.setting.labels : st.map(humanize);
      labels.slice(0, 2).forEach(function (l) { out.push(l); });
    }
    return out;
  }

  // ── facts as a matrix: one row per fact, one icon per program ─────────
  var MX_ROWS = [
    ['Setting', 'setting', [['outpatient', 'Outpatient'], ['intensive_outpatient', 'Intensive outpatient'], ['day_treatment', 'Day treatment'], ['residential', 'Residential'], ['hospital_inpatient', 'Hospital inpatient'], ['otp', 'Opioid treatment program']]],
    ['Length of stay', 'length', [['short_term', 'Short-term'], ['long_term', 'Long-term']]],
    ['Services', 'wm', null, 'Withdrawal management'],
    ['Services', 'moud', null, 'Medication for opioid use disorder'],
    ['Services', 'co_occurring', null, 'Co-occurring care'],
    ['Payment', 'payment', [['medicaid', 'Medicaid'], ['medicare', 'Medicare'], ['private', 'Private insurance'], ['sliding_fee', 'Sliding fee'], ['state_funded', 'State funded']]],
    ['Age', 'age', [['children', 'Children / adolescents'], ['young_adults', 'Young adults'], ['adults', 'Adults'], ['seniors', 'Seniors']]],
    ['Gender served', 'gender', [['female', 'Female'], ['male', 'Male']]],
    ['Population', 'population', [['pregnant_postpartum', 'Pregnant / postpartum'], ['veterans', 'Veterans'], ['justice_involved', 'Justice involved'], ['adolescents', 'Adolescents']]]
  ];
  var MX_TEXT = [['admission_rules', 'Admission rules'], ['referral_paperwork', 'Referral paperwork'], ['medicaid_level', 'Medicaid level'], ['licensed_level', 'Licensed level']];
  var ST = {
    y: { tip: 'Yes', body: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>' },
    n: { tip: 'No', body: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>' },
    u: { tip: 'Not reported', body: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>' }
  };

  // y = yes, n = no, u = the directory does not say
  function mxState(r, facetKey, key) {
    var f = (r.facets || {})[facetKey];
    if (!f || f.value === undefined || f.value === null) return 'u';
    var v = f.value;
    if (Array.isArray(v)) {
      if (facetKey === 'language' && f.reported === false) return 'u';
      if (!v.length) return 'u';
      return v.indexOf(key) !== -1 ? 'y' : 'n';
    }
    if (typeof v === 'object') return v[key] === 'yes' ? 'y' : (v[key] === 'no' ? 'n' : 'u');
    if (typeof v === 'string' && key === null) return v === 'yes' ? 'y' : (v === 'no' ? 'n' : 'u');
    return 'u';
  }

  function stIcon(state, label) {
    var d = ST[state];
    var sp = el('span', 'finder-st st-' + state);
    sp.setAttribute('role', 'img');
    sp.setAttribute('aria-label', (label ? label + ': ' : '') + d.tip);
    sp.title = (label ? label + ': ' : '') + d.tip;
    sp.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d.body + '</svg>';
    return sp;
  }

  // Rows for these programs. A row no program answers is left out and named
  // in the returned note, so a wall of question marks never competes with facts.
  function matrixRows(recs, firstCol) {
    var specs = [];
    MX_ROWS.forEach(function (g) {
      if (g[2]) g[2].forEach(function (o) { specs.push({ group: g[0], facet: g[1], key: o[0], label: o[1] }); });
      else specs.push({ group: g[0], facet: g[1], key: null, label: g[3] });
    });
    var langs = [];
    recs.forEach(function (r) {
      var f = (r.facets || {}).language;
      if (f && Array.isArray(f.value) && f.reported !== false) f.value.forEach(function (l) { if (langs.indexOf(l) === -1) langs.push(l); });
    });
    langs.forEach(function (l) { specs.push({ group: 'Language', facet: 'language', key: l, label: humanize(l) }); });
    if (!langs.length) specs.push({ group: 'Language', facet: 'language', key: null, label: 'Language', silent: true });
    // A group is shown whole when any program answers any of its rows;
    // a group nobody answers is named once in the note instead.
    var order = [];
    var byGroup = {};
    specs.forEach(function (sp) { if (!byGroup[sp.group]) { byGroup[sp.group] = []; order.push(sp.group); } byGroup[sp.group].push(sp); });
    var rows = [];
    var unknownNames = [];
    order.forEach(function (g) {
      var list = byGroup[g];
      var answered = list.some(function (sp) {
        return !sp.silent && recs.some(function (r) { return mxState(r, sp.facet, sp.key) !== 'u'; });
      });
      if (!answered) { unknownNames.push(g === 'Services' ? 'Services (detox, medication, co-occurring)' : g); return; }
      var gh = el('tr', 'finder-mx-group');
      var gth = el('th', null, g); gth.colSpan = recs.length + 1; gth.scope = 'colgroup';
      gh.appendChild(gth); rows.push(gh);
      list.forEach(function (sp) {
        var tr = el('tr');
        var th = el('th', null, sp.label); th.scope = 'row'; tr.appendChild(th);
        recs.forEach(function (r) { var td = el('td', 'finder-mx-cell'); td.appendChild(stIcon(mxState(r, sp.facet, sp.key), sp.label)); tr.appendChild(td); });
        rows.push(tr);
      });
    });
    MX_TEXT.forEach(function (t) {
      var texts = recs.map(function (r) { var parts = facetValue(t[0], (r.facets || {})[t[0]]); return parts[0] && !parts[0][1] ? parts.map(function (x) { return x[0]; }).join('; ') : null; });
      // Fields the directory does not carry yet stay out of the note; they appear as rows once any program has text.
      if (texts.every(function (x) { return x === null; })) return;
      var tr = el('tr'); var th = el('th', null, t[1]); th.scope = 'row'; tr.appendChild(th);
      texts.forEach(function (x) { tr.appendChild(el('td', x === null ? 'finder-unknown' : null, x === null ? 'Not reported' : x)); });
      rows.push(tr);
    });
    return { rows: rows, note: unknownNames.length ? 'Not reported: ' + unknownNames.join(', ') : '' };
  }

  function mxLegend() {
    var lg = el('p', 'finder-mx-legend');
    [['y', 'Yes'], ['n', 'No'], ['u', 'Not reported']].forEach(function (x) {
      var sp = el('span', 'finder-mx-key'); sp.appendChild(stIcon(x[0], '')); sp.appendChild(document.createTextNode(' ' + x[1])); lg.appendChild(sp);
    });
    return lg;
  }

  function matrixTable(recs) {
    var mx = matrixRows(recs);
    var t = el('table', 'finder-mx');
    var tb = el('tbody');
    mx.rows.forEach(function (tr) { tb.appendChild(tr); });
    t.appendChild(tb);
    return { table: t, note: mx.note };
  }

  function buildDetail(r, withAddr) {
    var detail = el('div', 'finder-detail');
    var addr = [];
    if (r.kind !== 'residence') {
      if (r.street) addr.push(r.street);
      if (r.street2) addr.push(r.street2);
    }
    var townLine = [r.town, r.kind !== 'residence' ? r.zip : null].filter(Boolean).join(' ');
    if (townLine) addr.push(townLine);
    if (addr.length && withAddr) detail.appendChild(el('p', 'finder-addr', addr.join(', ')));

    if (r.kind !== 'residence' && r.phone && withAddr) {
      var ph = el('p', 'finder-phone');
      if (TEL_RE.test(String(r.phone))) {
        var a = el('a', null, r.phone);
        a.href = 'tel:' + String(r.phone).replace(/[^0-9+]/g, '');
        ph.appendChild(a);
      } else {
        ph.appendChild(document.createTextNode(String(r.phone)));
      }
      detail.appendChild(ph);
    }

    if (typeof r.lat !== 'number' || typeof r.lng !== 'number') {
      detail.appendChild(el('p', 'finder-nopin', 'No map location'));
    } else {
      var sm = el('button', 'finder-showmap btn btn-secondary', 'Show on map');
      sm.type = 'button';
      sm.addEventListener('click', function () { setView('map'); if (map) map.easeTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 13) }); });
      detail.appendChild(sm);
    }

    var mt = matrixTable([r]);
    if (mt.table.querySelector('tr')) { detail.appendChild(mt.table); detail.appendChild(mxLegend()); }
    if (mt.note) detail.appendChild(el('p', 'finder-unk-note', mt.note));

    var c = r.checked || {};
    var line = 'Checked against ' + (c.source || 'FindTreatment.gov') + ' on ' + (c.on || 'an unknown date');
    if (c.source_as_of) line += ' (source dated ' + c.source_as_of + ')';
    detail.appendChild(el('p', 'finder-checked', line));
    return detail;
  }

  function renderItem(r, inGroup) {
    var li = el('li', 'finder-item');
    li.id = 'finder-r-' + String(r.id).replace(/[^A-Za-z0-9_-]/g, '_');
    li.setAttribute('data-id', String(r.id));

    // Compact row: what you compare on. One button toggles the full record.
    var cmp = el('label', 'finder-cmp');
    var cb = el('input'); cb.type = 'checkbox'; cb.value = String(r.id);
    cb.checked = !!compare.recs[r.id];
    cb.setAttribute('aria-label', 'Compare ' + (r.name || 'program'));
    cb.addEventListener('change', function () { toggleCompare(r, cb.checked); });
    cmp.appendChild(cb);
    cmp.appendChild(el('span', null, 'Compare'));
    li.appendChild(cmp);
    var head = el('button', 'finder-row');
    head.type = 'button';
    head.setAttribute('aria-expanded', 'false');
    var h = el('span', 'finder-row-name', inGroup ? (r.type_label || r.name || '') : (r.name || ''));
    if (r.subname && r.subname !== r.name) {
      h.appendChild(document.createTextNode(' '));
      h.appendChild(el('span', 'finder-sub', '(' + r.subname + ')'));
    }
    head.appendChild(h);
    var meta = inGroup ? '' : [r.type_label, r.town].filter(Boolean).join(' · ');
    if (meta) head.appendChild(el('span', 'finder-row-meta', meta));
    var tags = compactTags(r);
    if (tags.length) {
      var tg = el('span', 'finder-tags');
      tags.forEach(function (t) { tg.appendChild(el('span', 'finder-tag', t)); });
      head.appendChild(tg);
    }
    var strip = iconStrip(r, false);
    if (strip) head.appendChild(strip);
    if (r.match === 'partial') head.appendChild(el('span', 'finder-row-partial', 'Some answers unknown'));
    li.appendChild(head);

    // Full record: built once, shown only when selected (inline on small screens, in the right panel on wide ones).
    var detail = buildDetail(r, !inGroup);
    detail.hidden = true;
    li.appendChild(detail);

    head.addEventListener('click', function () {
      if (li.classList.contains('is-active')) { selectItem(null); } else { selectItem(r.id, true); }
    });
    return li;
  }

  // ── wide screens: map stage with a results drawer (left) and a details panel (right) ──
  var selectedId = null;
  var stageMq = window.matchMedia('(min-width: 1024px)');
  var stage = root.querySelector('.finder-stage');
  var panel = document.getElementById('finder-panel');
  var resultsToggle = document.getElementById('finder-results-toggle');

  function padObj() {
    if (!stageMq.matches) return { top: 0, left: 0, right: 0, bottom: 0 };
    return { top: 84, left: stage.getAttribute('data-results') === 'open' ? 392 : 0, right: stage.getAttribute('data-panel') === 'open' ? 372 : 0, bottom: 0 };
  }
  // Fit padding keeps pins out from under the drawer, the panel and the search bar.
  function fitPad() {
    if (!stageMq.matches) return 40;
    var p = padObj();
    return { top: p.top + 24, left: p.left + 40, right: p.right + 40, bottom: 60 };
  }

  function setResultsOpen(open) {
    stage.setAttribute('data-results', open ? 'open' : 'closed');
    resultsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  resultsToggle.addEventListener('click', function () { setResultsOpen(stage.getAttribute('data-results') !== 'open'); });

  function hidePanel() {
    stage.setAttribute('data-panel', 'closed');
    panel.hidden = true;
    clear(panel);
  }

  function showPanel(r) {
    clear(panel);
    var head = el('div', 'finder-panel-head');
    var close = el('button', 'finder-panel-x', '\u00d7');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close details');
    close.addEventListener('click', function () { selectItem(null); });
    head.appendChild(close);
    var h = el('h2', 'finder-panel-name', r.name || '');
    if (r.subname && r.subname !== r.name) { h.appendChild(document.createTextNode(' ')); h.appendChild(el('span', 'finder-sub', '(' + r.subname + ')')); }
    head.appendChild(h);
    var meta = [r.type_label, r.town].filter(Boolean).join(' · ');
    if (meta) head.appendChild(el('p', 'finder-row-meta', meta));
    var strip = iconStrip(r, true);
    if (strip) head.appendChild(strip);
    panel.appendChild(head);
    var d = buildDetail(r, true);
    var cb = el('label', 'finder-panel-cmp');
    var box = el('input'); box.type = 'checkbox'; box.checked = !!compare.recs[r.id];
    box.disabled = !box.checked && compare.ids.length >= compare.max;
    box.addEventListener('change', function () { toggleCompare(r, box.checked); });
    cb.appendChild(box); cb.appendChild(el('span', null, 'Add to compare'));
    d.insertBefore(cb, d.firstChild);
    panel.appendChild(d);
    panel.hidden = false;
    panel.scrollTop = 0;
    stage.setAttribute('data-panel', 'open');
  }

  // One record open at a time; the map pin and the row stay in step.
  function selectItem(id, fromList) {
    Array.prototype.forEach.call(root.querySelectorAll('.finder-item.is-active'), function (n) {
      n.classList.remove('is-active');
      var d = n.querySelector('.finder-detail'); if (d) d.hidden = true;
      var b = n.querySelector('.finder-row'); if (b) b.setAttribute('aria-expanded', 'false');
    });
    selectedId = (id === null || id === undefined) ? null : id;
    if (id === null || id === undefined) { hidePanel(); return; }
    var item = document.getElementById('finder-r-' + String(id).replace(/[^A-Za-z0-9_-]/g, '_'));
    if (!item) return;
    var rec = state.results.filter(function (x) { return String(x.id) === String(id); })[0];
    item.classList.add('is-active');
    item.querySelector('.finder-row').setAttribute('aria-expanded', 'true');
    var wide = stageMq.matches;
    if (wide && rec) { showPanel(rec); } else { item.querySelector('.finder-detail').hidden = false; }
    // Scroll the list box, never the page, so the map stays in view.
    var list = root.querySelector('.finder-list');
    var headH = list.querySelector('.finder-listhead') ? list.querySelector('.finder-listhead').offsetHeight : 0;
    if (list) list.scrollTo({ top: Math.max(0, item.offsetTop - headH - 8), behavior: 'smooth' });
    if (fromList && map && rec && typeof rec.lat === 'number' && typeof rec.lng === 'number') {
      map.easeTo({ center: [rec.lng, rec.lat], zoom: Math.max(map.getZoom(), 12), padding: padObj() });
    }
  }

  // Group programs the directory places at one verified location: the same
  // name, street and zip across records. Different names at one address stay
  // separate (two operators may share a building). Facets are never merged:
  // each program keeps its own row and its own answers.
  function norm(x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function groupKey(r) {
    if (r.kind === 'residence' || !r.street || !r.zip || !r.name) return null;
    return [norm(r.name), norm(r.street), norm(r.street2), String(r.zip)].join('|');
  }
  function renderList(into, recs) {
    var order = [];
    var byKey = {};
    recs.forEach(function (r) {
      var k = groupKey(r);
      if (k === null) { order.push({ one: r }); return; }
      if (!byKey[k]) { byKey[k] = { members: [] }; order.push(byKey[k]); }
      byKey[k].members.push(r);
    });
    order.forEach(function (g) {
      var members = g.one ? [g.one] : g.members;
      if (members.length === 1) { into.appendChild(renderItem(members[0], false)); return; }
      var r0 = members[0];
      var gi = el('li', 'finder-group');
      var gh = el('div', 'finder-group-head');
      gh.appendChild(el('h3', 'finder-group-name', r0.name));
      var a = [r0.street, r0.street2, [r0.town, r0.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      gh.appendChild(el('p', 'finder-addr', a + ' · ' + members.length + ' programs'));
      if (r0.phone) {
        var ph = el('p', 'finder-phone');
        if (TEL_RE.test(String(r0.phone))) { var al = el('a', null, r0.phone); al.href = 'tel:' + String(r0.phone).replace(/[^0-9+]/g, ''); ph.appendChild(al); }
        else ph.appendChild(document.createTextNode(String(r0.phone)));
        gh.appendChild(ph);
      }
      gi.appendChild(gh);
      var ul = el('ul', 'finder-programs');
      members.forEach(function (m) { ul.appendChild(renderItem(m, true)); });
      gi.appendChild(ul);
      into.appendChild(gi);
    });
  }

  // ── compare ──────────────────────────────────────────────
  var compare = { ids: [], recs: {}, max: 4 };
  var cmpOpen = document.getElementById('finder-compare-open');
  var cmpDialog = document.getElementById('finder-compare-dialog');
  var cmpBody = document.getElementById('finder-compare-body');
  var cmpNote = '';

  function noteGet(id) { try { return window.localStorage.getItem('finder-note:' + id) || ''; } catch (e) { return ''; } }
  function noteSet(id, v) { try { window.localStorage.setItem('finder-note:' + id, v); } catch (e) { /* notes stay in the box only */ } }

  function toggleCompare(r, on) {
    var i = compare.ids.indexOf(r.id);
    if (on && i === -1 && compare.ids.length < compare.max) { compare.ids.push(r.id); compare.recs[r.id] = r; }
    if (!on && i !== -1) { compare.ids.splice(i, 1); delete compare.recs[r.id]; }
    syncCompare();
    if (cmpDialog.open) buildCompare();
  }

  function syncCompare() {
    var n = compare.ids.length;
    cmpOpen.hidden = n === 0;
    cmpOpen.textContent = 'Compare (' + n + (n >= compare.max ? ', full' : '') + ')';
    Array.prototype.forEach.call(root.querySelectorAll('.finder-cmp input'), function (cb) {
      cb.checked = !!compare.recs[cb.value];
      cb.disabled = !cb.checked && n >= compare.max;
    });
  }

  function buildCompare() {
    clear(cmpBody);
    if (!compare.ids.length) { cmpDialog.close(); return; }
    var t = el('table', 'finder-cmp-table');
    var hr = el('tr'); hr.appendChild(el('th'));
    compare.ids.forEach(function (id) {
      var r = compare.recs[id];
      var th = el('th'); th.scope = 'col';
      th.appendChild(el('strong', null, r.name || ''));
      th.appendChild(el('div', 'finder-sub', [r.type_label, r.town].filter(Boolean).join(' · ')));
      var rm = el('button', 'finder-cmp-remove', 'Remove'); rm.type = 'button';
      rm.addEventListener('click', function () { toggleCompare(r, false); });
      th.appendChild(rm);
      hr.appendChild(th);
    });
    t.appendChild(el('thead')).appendChild(hr);
    var tb = el('tbody');
    var info = [['Address', function (r) { return [r.street, r.street2, [r.town, r.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Not reported'; }],
                ['Phone', function (r) { return r.phone || 'Not reported'; }]];
    info.forEach(function (row) {
      var tr = el('tr'); tr.appendChild(el('th', null, row[0])).scope = 'row';
      compare.ids.forEach(function (id) { tr.appendChild(el('td', null, row[1](compare.recs[id]))); });
      tb.appendChild(tr);
    });
    var cm = matrixRows(compare.ids.map(function (id) { return compare.recs[id]; }));
    cm.rows.forEach(function (tr) { tb.appendChild(tr); });
    cmpNote = cm.note;
    var nr = el('tr'); var nth = el('th', null, 'Your notes'); nth.scope = 'row'; nr.appendChild(nth);
    compare.ids.forEach(function (id) {
      var td = el('td'); var ta = el('textarea', 'finder-note');
      ta.rows = 5; ta.value = noteGet(id); ta.setAttribute('aria-label', 'Notes on ' + (compare.recs[id].name || 'program'));
      ta.addEventListener('input', function () { noteSet(id, ta.value); });
      td.appendChild(ta); nr.appendChild(td);
    });
    tb.appendChild(nr);
    t.appendChild(tb);
    cmpBody.appendChild(mxLegend());
    cmpBody.appendChild(t);
    if (cmpNote) cmpBody.appendChild(el('p', 'finder-unk-note', cmpNote + ' (for every program selected)'));
  }

  cmpOpen.addEventListener('click', function () { buildCompare(); if (compare.ids.length) cmpDialog.showModal(); });
  document.getElementById('finder-compare-close').addEventListener('click', function () { cmpDialog.close(); });
  document.getElementById('finder-compare-clear').addEventListener('click', function () {
    compare.ids = []; compare.recs = {}; syncCompare(); cmpDialog.close();
  });

  // ── mobile: List or Map ──────────────────────────────────
  var mobileMq = window.matchMedia('(max-width: 767.98px)');
  var lastFit = null;
  function setView(v) {
    root.setAttribute('data-view', v);
    Array.prototype.forEach.call(root.querySelectorAll('.finder-tabs [data-view]'), function (b) {
      b.setAttribute('aria-selected', b.getAttribute('data-view') === v ? 'true' : 'false');
    });
    if (v === 'map' && map) {
      map.resize();
      if (lastFit) { try { map.fitBounds(lastFit, { animate: false, padding: fitPad(), maxZoom: 13 }); } catch (e) { /* keep view */ } lastFit = null; }
    }
  }
  Array.prototype.forEach.call(root.querySelectorAll('.finder-tabs [data-view]'), function (b) {
    b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
  });
  root.setAttribute('data-view', 'list');

  function render() {
    clear(fullEl);
    clear(partialEl);
    var full = [];
    var partial = [];
    state.results.forEach(function (r) { (r.match === 'partial' ? partial : full).push(r); });

    resultsToggle.textContent = 'Results (' + state.results.length + (state.total > state.results.length ? ' of ' + state.total : '') + ')';
    renderList(fullEl, full);
    renderList(partialEl, partial);
    syncCompare();
    if (selectedId !== null) {
      var again = document.getElementById('finder-r-' + String(selectedId).replace(/[^A-Za-z0-9_-]/g, '_'));
      if (again) again.classList.add('is-active'); else { selectedId = null; hidePanel(); }
    }

    if (partial.length) {
      var names = [];
      partial.forEach(function (r) {
        (r.unknown_filters || []).forEach(function (f) {
          var n = FILTER_NAMES[f] || humanize(f);
          if (names.indexOf(n) === -1) names.push(n);
        });
      });
      partialHead.textContent = 'The directory says nothing about: ' + (names.length ? names.join(', ') : 'some of your filters');
      partialHead.hidden = false;
    } else {
      partialHead.hidden = true;
    }

    var n = state.results.length;
    if (!n) statusEl.textContent = 'No programs match these filters.';
    else statusEl.textContent = 'Showing ' + n + ' of ' + state.total + ' (' + full.length + ' full match' +
      (full.length === 1 ? '' : 'es') + ', ' + partial.length + ' partial).';
    moreBtn.hidden = n >= state.total;

    var pinned = state.results.filter(function (r) { return typeof r.lat === 'number' && typeof r.lng === 'number'; });
    setPins(pinned);
  }

  // ── crisis strip ─────────────────────────────────────────
  // Centre of a "west,south,east,north" bbox as {lat, lng}, or null if it is not one.
  function parseBbox(bbox) {
    var parts = String(bbox || '').split(',');
    if (parts.length !== 4) return null;
    if (parts.some(function (x) { return x.trim() === ''; })) return null;
    var b = parts.map(Number);
    if (b.some(function (x) { return !isFinite(x); })) return null;
    if (b[0] < -180 || b[0] > 180 || b[2] < -180 || b[2] > 180) return null;
    if (b[1] < -90 || b[1] > 90 || b[3] < -90 || b[3] > 90) return null;
    if (!(b[0] < b[2]) || !(b[1] < b[3])) return null;
    return b;
  }

  function bboxCentre(bbox) {
    var b = parseBbox(bbox);
    if (!b) return null;
    return { lng: (b[0] + b[2]) / 2, lat: (b[1] + b[3]) / 2 };
  }

  // <li> of a label and a tel: link; tail (hours, distance) follows as text.
  function phoneItem(label, phone, tail) {
    var li = el('li');
    if (label) li.appendChild(document.createTextNode(label));
    if (phone) {
      if (TEL_RE.test(String(phone))) {
        var a = el('a', null, phone);
        a.href = 'tel:' + String(phone).replace(/[^0-9+]/g, '');
        li.appendChild(a);
      } else {
        li.appendChild(document.createTextNode(String(phone)));
      }
    }
    if (tail) li.appendChild(document.createTextNode(tail));
    return li;
  }

  var crisisSeq = 0;
  var crisisOn = false;

  function median(a) {
    var v = a.slice().sort(function (x, y) { return x - y; });
    var m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  function validPoint(o) {
    return !!o && typeof o.lat === 'number' && typeof o.lng === 'number' &&
      Math.abs(o.lat) <= 90 && Math.abs(o.lng) <= 180;
  }

  // Where the crisis lookup is made, in order: the centre of a valid URL bbox;
  // the origin the search itself resolved (body.origin {lat, lng}, if the API
  // sends one); the median lat and median lng of the results that have
  // coordinates; else null (statewide lines only, never the map's centre).
  function crisisPoint(p, body, results) {
    var c = bboxCentre(p.bbox);
    if (c) return c;
    if (body && validPoint(body.origin)) return { lat: body.origin.lat, lng: body.origin.lng };
    var pts = results.filter(function (r) { return validPoint(r); });
    if (!pts.length) return null;
    return {
      lat: median(pts.map(function (r) { return r.lat; })),
      lng: median(pts.map(function (r) { return r.lng; }))
    };
  }

  function fitToResults(results) {
    var pts = results.filter(function (r) { return validPoint(r); });
    if (!pts.length) return;
    var w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    pts.forEach(function (r) {
      w = Math.min(w, r.lng); e = Math.max(e, r.lng);
      s = Math.min(s, r.lat); n = Math.max(n, r.lat);
    });
    lastFit = [[w, s], [e, n]];
    try { map.fitBounds(lastFit, { animate: false, padding: fitPad(), maxZoom: 13 }); } catch (err) { /* keep the current view */ }
    if (!mobileMq.matches || root.getAttribute('data-view') === 'map') lastFit = null;
  }

  // Called when a new search starts: show or hide the strip and drop stale
  // content. Returns the sequence number the later lookup must still match.
  function resetCrisis(p) {
    var cseq = ++crisisSeq;
    var domains = p.domain ? p.domain.split(',') : [];
    crisisOn = domains.indexOf('crisis') !== -1 || p.wm === 'yes';
    crisisEl.hidden = !crisisOn;
    clear(crisisExtra);
    crisisHead.hidden = true;
    return cseq;
  }

  // Called once the first page of results is in. c is null when there is no
  // point: the call then carries no lat/lng and the API answers statewide.
  function lookupCrisis(p, cseq, c) {
    if (!crisisOn || cseq !== crisisSeq) return;
    var q = c ? { lat: c.lat.toFixed(4), lng: c.lng.toFixed(4) } : {};
    getJSON('/v1/crisis', q).then(function (body) {
      if (!body || p !== state.params || cseq !== crisisSeq) return;
      clear(crisisExtra);
      var loc = body.locality, auth = body.authority;
      if (loc && loc.name) {
        crisisHead.textContent = 'Crisis lines for ' + loc.name + (auth && auth.name ? ' (' + auth.name + ')' : '');
        crisisHead.hidden = false;
      }
      (body.lines || []).forEach(function (ln) {
        if (ln.kind === '988' || !ln.phone) return; // 988 is fixed page text above
        crisisExtra.appendChild(phoneItem((ln.name ? ln.name + ': ' : ''), ln.phone, ln.hours ? ' (' + ln.hours + ')' : ''));
      });
      (body.emergency_departments || []).slice(0, 3).forEach(function (ed) {
        var where = [ed.name, ed.town].filter(Boolean).join(', ');
        var dist = typeof ed.distance_km === 'number' ? ' · ' + ed.distance_km.toFixed(1) + ' km straight-line' : '';
        crisisExtra.appendChild(phoneItem('Emergency department: ' + where + (ed.phone ? ' · ' : ''), ed.phone, dist));
      });
    }).catch(function () { /* the fixed 911 / 988 text stays; nothing else to add */ });
  }

  // ── map ──────────────────────────────────────────────────
  function accent() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-secondary');
    return (v && v.trim()) || '#3b82f6';
  }

  function setPins(results) {
    if (!mapReady) { state.pending = results; return; }
    var fc = {
      type: 'FeatureCollection',
      features: results.map(function (r) {
        return { type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: { id: String(r.id) } };
      })
    };
    lastFC = fc;
    map.getSource('results').setData(fc);
  }

  // 3D is the streets style tilted and zoomed to where buildings draw (zoom 14+).
  // Centre: the current view when already close, else the middle of the pins.
  function tilt(on) {
    if (!map) return;
    if (!on) { map.easeTo({ pitch: 0, bearing: 0, duration: 600 }); return; }
    var opts = { pitch: 60, bearing: -20, duration: 900 };
    if (map.getZoom() < 14) {
      var f = lastFC.features;
      if (f.length) {
        opts.center = [median(f.map(function (x) { return x.geometry.coordinates[0]; })),
                       median(f.map(function (x) { return x.geometry.coordinates[1]; }))];
      }
      opts.zoom = 14.8;
    }
    map.easeTo(opts);
  }

  var prevKey = null;

  function setBasemap(key) {
    if (!map || !BASEMAPS[key] || key === basemap) return;
    prevKey = basemap;
    basemap = key;
    try { window.localStorage.setItem(BASEMAP_KEY, key); } catch (e) { /* storage blocked */ }
    // Streets and 3D share one style URL: switching between them keeps the loaded map.
    if (BASEMAPS[key] !== BASEMAPS[prevKey]) map.setStyle(BASEMAPS[key]);
    tilt(key === '3d');
    markBasemap();
  }

  function markBasemap() {
    Array.prototype.forEach.call(root.querySelectorAll('[data-basemap]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-basemap') === basemap ? 'true' : 'false');
    });
  }

  Array.prototype.forEach.call(root.querySelectorAll('[data-basemap]'), function (b) {
    b.addEventListener('click', function () { setBasemap(b.getAttribute('data-basemap')); });
  });
  markBasemap();

  function focusItem(id) { selectItem(id, false); }

  function initMap() {
    if (!window.maplibregl) {
      mapNote.textContent = 'The map could not load. The list below is complete.';
      mapNote.hidden = false;
      return;
    }
    try {
      map = new window.maplibregl.Map({
        container: 'finder-map', style: BASEMAPS[basemap], center: VA_CENTER, zoom: 6,
        attributionControl: { compact: true }
      });
    } catch (e) {
      mapNote.textContent = 'The map could not load. The list below is complete.';
      mapNote.hidden = false;
      return;
    }
    map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    // A style change drops custom sources and layers, so the pins are re-added
    // on every style load from the last results.
    map.on('style.load', function () {
      if (map.getSource('results')) return;
      map.addSource('results', { type: 'geojson', data: lastFC });
      map.addLayer({
        id: 'results-pins', type: 'circle', source: 'results',
        paint: { 'circle-radius': 6, 'circle-color': accent(), 'circle-stroke-width': 1.5, 'circle-stroke-color': '#ffffff' }
      });
    });
    map.on('load', function () {
      map.on('click', 'results-pins', function (e) {
        if (e.features && e.features[0]) { if (mobileMq.matches) setView('list'); focusItem(e.features[0].properties.id); }
      });
      map.on('mouseenter', 'results-pins', function () { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'results-pins', function () { map.getCanvas().style.cursor = ''; });
      mapReady = true;
      var wsen = parseBbox(initialBbox);
      if (wsen) {
        try { map.fitBounds([[wsen[0], wsen[1]], [wsen[2], wsen[3]]], { animate: false }); } catch (e) { /* bad bbox: keep default view */ }
      }
      if (basemap === '3d') tilt(true);
      map.on('moveend', function (ev) { if (ev.originalEvent) { areaBtn.hidden = false; lastFit = null; } });
      document.getElementById('finder-map').addEventListener('click', function (ev) {
        if (ev.target.closest && ev.target.closest('.maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out')) areaBtn.hidden = false;
      });
      if (state.pending) { setPins(state.pending); state.pending = null; }
    });
  }

  // ── wiring ───────────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var p = readForm();
    pushLocation(p);
    run(p, false);
  });

  form.addEventListener('input', function (e) { if (e.target && e.target.name === 'miles') showMiles(); });
  form.addEventListener('change', syncReveal);
  syncReveal();

  form.addEventListener('reset', function () {
    window.setTimeout(function () {
      pushLocation({});
      syncReveal();
      showMiles();
      search({}, false);
    }, 0);
  });

  moreBtn.addEventListener('click', function () { search(state.params, true); });

  areaBtn.addEventListener('click', function () {
    if (!map) return;
    var b = map.getBounds();
    var p = readForm();
    p.bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(function (x) { return x.toFixed(5); }).join(',');
    areaBtn.hidden = true;
    pushLocation(p);
    var q = {};
    Object.keys(p).forEach(function (k) { if (k !== 'miles') q[k] = p[k]; });
    search(mapSettingParams(q), false);
  });


  // ── filter drawer ────────────────────────────────────────
  var drawer = document.getElementById('finder-drawer');
  var backdrop = document.getElementById('finder-backdrop');
  var openBtn = document.getElementById('finder-drawer-open');
  var closeBtn = document.getElementById('finder-drawer-close');
  var countEl = document.getElementById('finder-filter-count');

  function setDrawer(open) {
    drawer.hidden = !open;
    backdrop.hidden = !open;
    openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('finder-drawer-open', open);
    (open ? closeBtn : openBtn).focus();
  }

  // Filters set inside the drawer; the bar's own fields (name, distance) are not counted.
  function updateCount() {
    var p = readForm();
    var n = 0;
    Object.keys(p).forEach(function (k) {
      if (k === 'q' || k === 'miles' || k === 'town') return;
      n += String(p[k]).split(',').length;
    });
    countEl.textContent = String(n);
    countEl.hidden = n === 0;
  }

  // Live count: how many programs match the filters as set right now. The API
  // lists full matches first, so paging stops at the first partial result.
  var liveEl = document.getElementById('finder-live');
  var showBtn = document.getElementById('finder-show');
  var liveSeq = 0, liveTimer = null, lastFull = null;

  function countMatches(api) {
    var full = 0;
    function page(offset) {
      var q = {}; Object.keys(api).forEach(function (k) { q[k] = api[k]; });
      q.limit = 200; q.offset = offset;
      return getJSON('/v1/search', q).then(function (body) {
        var rs = (body && body.results) || [];
        var sawPartial = false;
        rs.forEach(function (r) { if (r.match === 'full') full++; else sawPartial = true; });
        var total = body && typeof body.total === 'number' ? body.total : rs.length;
        if (sawPartial || !rs.length || offset + rs.length >= total) return { full: full, total: total };
        return page(offset + rs.length);
      });
    }
    return page(0);
  }

  function refreshLive() {
    var seq = ++liveSeq;
    liveEl.textContent = 'Counting…';
    apiParamsFor(readForm()).then(countMatches).then(function (c) {
      if (seq !== liveSeq) return;
      var more = c.total - c.full;
      var text = c.full + (c.full === 1 ? ' program matches' : ' programs match');
      if (more > 0) text += ' · ' + more + ' more with unknown answers';
      if (lastFull !== null && lastFull !== c.full) text += ' · ' + (c.full < lastFull ? 'down ' : 'up ') + Math.abs(c.full - lastFull) + ' from before';
      lastFull = c.full;
      liveEl.textContent = text;
      showBtn.textContent = 'Show ' + c.full + (c.full === 1 ? ' result' : ' results');
    }).catch(function () {
      if (seq !== liveSeq) return;
      liveEl.textContent = '';
      showBtn.textContent = 'Show results';
    });
  }

  function scheduleLive() {
    window.clearTimeout(liveTimer);
    liveTimer = window.setTimeout(refreshLive, 250);
  }

  form.addEventListener('change', scheduleLive);
  form.addEventListener('input', function (e) { if (e.target && e.target.name === 'miles') scheduleLive(); });
  form.addEventListener('reset', function () { lastFull = null; window.setTimeout(scheduleLive, 0); });
  openBtn.addEventListener('click', function () { setDrawer(true); refreshLive(); });
  closeBtn.addEventListener('click', function () { setDrawer(false); });
  backdrop.addEventListener('click', function () { setDrawer(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) setDrawer(false); });
  form.addEventListener('change', updateCount);
  form.addEventListener('reset', function () { window.setTimeout(updateCount, 0); });
  form.addEventListener('submit', function () { if (!drawer.hidden) setDrawer(false); });

  // ── search bar: collapses to a slim, obvious search strip on wide screens ──
  var bar = form.querySelector('.f-bar');
  var barText = document.getElementById('finder-bar-text');
  var barState = false;
  function barSummary() {
    var p = readForm();
    var parts = [];
    if (p.q) parts.push('\u201c' + p.q + '\u201d');
    if (p.town) parts.push(p.town + (p.miles ? ' \u00b7 within ' + p.miles + ' mi' : ''));
    return parts.length ? parts.join(' in ') : 'Search by provider, program or town';
  }
  function setBarCollapsed(c) {
    barState = c;
    barText.textContent = barSummary();
    bar.setAttribute('data-collapsed', c && stageMq.matches ? 'true' : 'false');
  }
  document.getElementById('finder-bar-summary').addEventListener('click', function () {
    setBarCollapsed(false);
    var q = form.querySelector('[name="q"]'); if (q) q.focus();
  });
  document.getElementById('finder-bar-collapse').addEventListener('click', function () { setBarCollapsed(true); });
  form.addEventListener('submit', function () { setBarCollapsed(true); });
  stageMq.addEventListener('change', function () { setBarCollapsed(barState); selectItem(null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stage.getAttribute('data-panel') === 'open' && drawer.hidden && !cmpDialog.open) selectItem(null); });

  var initial = paramsFromLocation();
  writeForm(initial);
  setBarCollapsed(Object.keys(initial).length > 0);
  initialBbox = initial.bbox || '';
  initMap();
  updateCount();
  run(initial, false);
})();
