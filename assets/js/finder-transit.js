/* Client-home pin and transit times (Kerrigan tracker 250). Dev-only: loaded only when the
   finderTransit param is true (deploy/finder-dev.toml). The pin lives in this page's memory:
   no storage, no URL, no address field, no geocoder. Its coordinates go to one place,
   POST {data-api}/v1/travel, never to search or crisis. API strings reach the DOM through
   textContent only. The pure helpers (no DOM) are tested in finder-transit.test.mjs. */
(function (root) {
  'use strict';

  var MAX_IDS = 200; // the travel endpoint's cap per request

  // Service ids only: residences (res-…) are not sent.
  function travelIds(ids) {
    var out = [];
    (ids || []).forEach(function (id) {
      id = String(id);
      if (id && id.indexOf('res-') !== 0 && out.indexOf(id) === -1) out.push(id);
    });
    return out;
  }

  // The request body, or null when the pin or ids are unusable.
  function buildRequest(lat, lng, ids) {
    var list = travelIds(ids).slice(0, MAX_IDS);
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng) || !list.length) return null;
    return { lat: lat, lng: lng, ids: list };
  }

  // Only http(s) links from the API are followed.
  function safeUrl(u) {
    if (typeof u !== 'string') return null;
    try {
      var p = new URL(u);
      return (p.protocol === 'https:' || p.protocol === 'http:') ? p.href : null;
    } catch (e) { return null; }
  }

  // One entry of the answer -> what the card shows: {text} or {text, linkText, href}.
  function describe(e) {
    if (!e || typeof e !== 'object') return null;
    if (typeof e.minutes === 'number' && isFinite(e.minutes)) {
      return { text: 'About ' + Math.max(1, Math.round(e.minutes)) + ' min by transit' };
    }
    if (typeof e.distance_km === 'number' && isFinite(e.distance_km)) {
      var km = e.distance_km < 10 ? e.distance_km.toFixed(1) : String(Math.round(e.distance_km));
      var out = { text: km + ' km straight line' };
      var a = e.agency;
      if (a && typeof a.name === 'string' && a.name) {
        var href = safeUrl(a.url);
        if (href) { out.linkText = 'Plan the trip with ' + a.name; out.href = href; }
      }
      return out;
    }
    return null;
  }

  // The answer is an array of entries, or an object holding it under results.
  function entries(body) {
    if (Array.isArray(body)) return body;
    if (body && Array.isArray(body.results)) return body.results;
    return [];
  }

  var api = { MAX_IDS: MAX_IDS, travelIds: travelIds, buildRequest: buildRequest, safeUrl: safeUrl, describe: describe, entries: entries };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FinderTransit = api;

  var main = typeof document !== 'undefined' ? document.getElementById('finder') : null;
  if (!main) return;

  var API = (main.getAttribute('data-api') || '').replace(/\/+$/, '');
  var btn = document.getElementById('finder-pin-btn');
  var clearBtn = document.getElementById('finder-pin-clear');
  var status = document.getElementById('finder-pin-status');
  if (!btn || !clearBtn || !status) return;

  var map = null;
  var marker = null;
  var armed = false;
  var pin = null;          // {lat, lng}
  var known = {};          // id -> entry, for the current pin only
  var asked = {};          // ids already requested for the current pin
  var gen = 0;             // bumps on every pin change; stale answers are dropped
  var queued = 0;

  // finder.js keeps its map private. Take the instance as it is made: this script loads before it.
  if (root.maplibregl && root.maplibregl.Map) {
    var Base = root.maplibregl.Map;
    var Wrapped = function (opts) { var m = new Base(opts); map = m; return m; };
    Wrapped.prototype = Base.prototype;
    try { root.maplibregl.Map = Wrapped; } catch (e) { /* read-only: the pin control stays disabled below */ }
  }

  function say(t) { status.textContent = t; }

  function arm(on) {
    armed = on;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (map) map.getCanvas().style.cursor = on ? 'crosshair' : '';
    if (on) say('Click the map where the client lives.');
  }

  function cardIds() {
    return Array.prototype.map.call(main.querySelectorAll('.finder-item[data-id]'), function (li) { return li.getAttribute('data-id'); });
  }

  function paint() {
    Array.prototype.forEach.call(main.querySelectorAll('.finder-item[data-id]'), function (li) {
      var old = li.querySelector('.finder-travel');
      var d = pin ? describe(known[li.getAttribute('data-id')]) : null;
      if (!d) { if (old) old.remove(); return; }
      var key = d.text + '|' + (d.href || '');
      if (old && old.getAttribute('data-key') === key) return;
      var p = document.createElement('p');
      p.className = 'finder-travel';
      // .finder-item is a wrapping flex row (row, compare, save, detail): a full-width item of its own
      // keeps the line under the card's text. Inline, because finder.css carries no transit rules.
      p.style.cssText = 'order:3;flex:0 0 100%;box-sizing:border-box;margin:0;padding:var(--wp-space-1) var(--wp-space-2) var(--wp-space-2);font-size:var(--wp-text-sm)';
      p.setAttribute('data-key', key);
      p.appendChild(document.createTextNode(d.text));
      if (d.href) {
        p.appendChild(document.createTextNode(' · '));
        var a = document.createElement('a');
        a.href = d.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = d.linkText;
        p.appendChild(a);
      }
      if (old) old.replaceWith(p);
      else {
        var row = li.querySelector('.finder-row');
        if (row && row.nextSibling) li.insertBefore(p, row.nextSibling); else li.appendChild(p);
      }
    });
  }

  function post(batch, g) {
    var body = buildRequest(pin.lat, pin.lng, batch);
    if (!body) return Promise.resolve();
    batch.forEach(function (id) { asked[id] = true; });
    return fetch(API + '/v1/travel', {
      method: 'POST', credentials: 'omit',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (j) {
      if (g !== gen) return;
      entries(j).forEach(function (e) { if (e && e.id != null) known[String(e.id)] = e; });
      say('Trip times are from the pin you placed. They are not stored.');
      paint();
    }).catch(function () {
      if (g !== gen) return;
      batch.forEach(function (id) { delete asked[id]; });
      say('Trip times are unavailable right now.');
    });
  }

  // Ask for the cards that have no answer yet, at most MAX_IDS per request, one request at a time.
  function refresh() {
    if (!pin) return;
    var g = gen;
    var need = travelIds(cardIds()).filter(function (id) { return !asked[id]; });
    if (!need.length) { paint(); return; }
    var chain = Promise.resolve();
    for (var i = 0; i < need.length; i += MAX_IDS) {
      (function (batch) { chain = chain.then(function () { return g === gen ? post(batch, g) : null; }); })(need.slice(i, i + MAX_IDS));
    }
  }

  function place(lngLat) {
    pin = { lat: lngLat.lat, lng: lngLat.lng };
    known = {}; asked = {}; gen++;
    if (!marker) {
      marker = new root.maplibregl.Marker({ draggable: true, color: '#d6336c' }).setLngLat([pin.lng, pin.lat]).addTo(map);
      marker.getElement().setAttribute('aria-label', 'Client home pin. Drag to move it.');
      marker.on('dragend', function () { place(marker.getLngLat()); });
    } else {
      marker.setLngLat([pin.lng, pin.lat]);
    }
    paint();
    clearBtn.hidden = false;
    btn.textContent = 'Move client’s home';
    say('Looking up trip times…');
    refresh();
  }

  function clearPin() {
    pin = null; known = {}; asked = {}; gen++;
    if (marker) { marker.remove(); marker = null; }
    paint();
    clearBtn.hidden = true;
    btn.textContent = 'Set client’s home';
    say('');
  }

  btn.addEventListener('click', function () {
    if (!map) { say('The map is not available.'); return; }
    if (armed) { arm(false); say(''); return; }
    arm(true);
    map.once('click', function (ev) { arm(false); place(ev.lngLat); });
  });
  clearBtn.addEventListener('click', clearPin);

  // New results: render() rebuilds the cards, so re-apply what is known and ask for the rest.
  new MutationObserver(function (muts) {
    if (!pin) return;
    var own = muts.every(function (m) {
      return Array.prototype.every.call(m.addedNodes, function (n) { return n.nodeType === 1 && n.classList.contains('finder-travel'); }) &&
        Array.prototype.every.call(m.removedNodes, function (n) { return n.nodeType === 1 && n.classList.contains('finder-travel'); });
    });
    if (own) return;
    clearTimeout(queued);
    queued = setTimeout(function () { paint(); refresh(); }, 150);
  }).observe(main, { childList: true, subtree: true });
})(typeof window !== 'undefined' ? window : globalThis);
