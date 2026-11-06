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
  var STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

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
  var FILTERS = ['q', 'town', 'domain', 'setting', 'wm', 'length', 'payment', 'moud',
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
      if (vals.length) p[name] = vals.join(',');
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
        else i.value = vals.join(',');
      });
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

  function renderItem(r) {
    var li = el('li', 'finder-item');
    li.id = 'finder-r-' + String(r.id).replace(/[^A-Za-z0-9_-]/g, '_');
    li.setAttribute('data-id', String(r.id));

    if (r.type_label) li.appendChild(el('span', 'finder-chip', r.type_label));

    var h = el('h3', null, r.name || '');
    if (r.subname && r.subname !== r.name) {
      h.appendChild(document.createTextNode(' '));
      h.appendChild(el('span', 'finder-sub', '(' + r.subname + ')'));
    }
    li.appendChild(h);

    var addr = [];
    if (r.kind !== 'residence') {
      if (r.street) addr.push(r.street);
      if (r.street2) addr.push(r.street2);
    }
    var townLine = [r.town, r.kind !== 'residence' ? r.zip : null].filter(Boolean).join(' ');
    if (townLine) addr.push(townLine);
    if (addr.length) li.appendChild(el('p', 'finder-addr', addr.join(', ')));

    if (r.kind !== 'residence' && r.phone) {
      var ph = el('p', 'finder-phone');
      if (TEL_RE.test(String(r.phone))) {
        var a = el('a', null, r.phone);
        a.href = 'tel:' + String(r.phone).replace(/[^0-9+]/g, '');
        ph.appendChild(a);
      } else {
        ph.appendChild(document.createTextNode(String(r.phone)));
      }
      li.appendChild(ph);
    }

    if (typeof r.lat !== 'number' || typeof r.lng !== 'number') {
      li.appendChild(el('p', 'finder-nopin', 'No map location'));
    }

    if (r.match === 'partial' && Array.isArray(r.unknown_filters) && r.unknown_filters.length) {
      li.appendChild(el('p', 'finder-unk-note',
        'The directory says nothing about: ' + r.unknown_filters.map(function (f) { return FILTER_NAMES[f] || humanize(f); }).join(', ')));
    }

    var dl = el('dl', 'finder-facets');
    var facets = r.facets || {};
    FACETS.forEach(function (pair) {
      dl.appendChild(el('dt', null, pair[1]));
      var dd = el('dd');
      facetValue(pair[0], facets[pair[0]]).forEach(function (part, i) {
        if (i) dd.appendChild(document.createTextNode('; '));
        dd.appendChild(el('span', part[1] ? 'finder-unknown' : null, part[0]));
      });
      dl.appendChild(dd);
    });
    li.appendChild(dl);

    var c = r.checked || {};
    var line = 'Checked against ' + (c.source || 'FindTreatment.gov') + ' on ' + (c.on || 'an unknown date');
    if (c.source_as_of) line += ' (source dated ' + c.source_as_of + ')';
    li.appendChild(el('p', 'finder-checked', line));
    return li;
  }

  function render() {
    clear(fullEl);
    clear(partialEl);
    var full = [];
    var partial = [];
    state.results.forEach(function (r) { (r.match === 'partial' ? partial : full).push(r); });

    full.forEach(function (r) { fullEl.appendChild(renderItem(r)); });
    partial.forEach(function (r) { partialEl.appendChild(renderItem(r)); });

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
    try { map.fitBounds([[w, s], [e, n]], { animate: false, padding: 40, maxZoom: 13 }); } catch (err) { /* keep the current view */ }
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
    map.getSource('results').setData(fc);
  }

  function focusItem(id) {
    var prev = root.querySelectorAll('.finder-item.is-active');
    Array.prototype.forEach.call(prev, function (n) { n.classList.remove('is-active'); });
    var item = document.getElementById('finder-r-' + String(id).replace(/[^A-Za-z0-9_-]/g, '_'));
    if (!item) return;
    item.classList.add('is-active');
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function initMap() {
    if (!window.maplibregl) {
      mapNote.textContent = 'The map could not load. The list below is complete.';
      mapNote.hidden = false;
      return;
    }
    try {
      map = new window.maplibregl.Map({
        container: 'finder-map', style: STYLE_URL, center: VA_CENTER, zoom: 6,
        attributionControl: { compact: true }
      });
    } catch (e) {
      mapNote.textContent = 'The map could not load. The list below is complete.';
      mapNote.hidden = false;
      return;
    }
    map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', function () {
      map.addSource('results', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'results-pins', type: 'circle', source: 'results',
        paint: { 'circle-radius': 6, 'circle-color': accent(), 'circle-stroke-width': 1.5, 'circle-stroke-color': '#ffffff' }
      });
      map.on('click', 'results-pins', function (e) {
        if (e.features && e.features[0]) focusItem(e.features[0].properties.id);
      });
      map.on('mouseenter', 'results-pins', function () { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'results-pins', function () { map.getCanvas().style.cursor = ''; });
      mapReady = true;
      var wsen = parseBbox(initialBbox);
      if (wsen) {
        try { map.fitBounds([[wsen[0], wsen[1]], [wsen[2], wsen[3]]], { animate: false }); } catch (e) { /* bad bbox: keep default view */ }
      }
      areaBtn.hidden = false;
      if (state.pending) { setPins(state.pending); state.pending = null; }
    });
  }

  // ── wiring ───────────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var p = readForm();
    pushLocation(p);
    search(p, false);
  });

  form.addEventListener('reset', function () {
    window.setTimeout(function () {
      pushLocation({});
      search({}, false);
    }, 0);
  });

  moreBtn.addEventListener('click', function () { search(state.params, true); });

  areaBtn.addEventListener('click', function () {
    if (!map) return;
    var b = map.getBounds();
    var p = readForm();
    p.bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(function (x) { return x.toFixed(5); }).join(',');
    pushLocation(p);
    search(p, false);
  });

  if (details && window.matchMedia && window.matchMedia('(max-width: 767.98px)').matches) details.open = false;

  var initial = paramsFromLocation();
  writeForm(initial);
  initialBbox = initial.bbox || '';
  initMap();
  search(initial, false);
})();
