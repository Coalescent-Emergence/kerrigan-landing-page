/* Shortlists, compare rows, notes and the client handout (Kerrigan tracker 252).
   No DOM, no network: finder.js does both and hands the data in. Everything
   here that touches a counselor's words (notes) or the handout stays in the
   browser: the only thing the server ever sees of a shortlist is item ids. */
(function (root) {
  'use strict';

  // Shown above every note box, word for word (tracker 252).
  var NOTE_WARNING = 'Notes stay in this browser. They are about the facility; do not enter client names or details.';

  // Compare shows at most this many entries side by side.
  var COMPARE_MAX = 4;
  // A handout carries at most this many entries: it is one printed sheet or two.
  var HANDOUT_MAX = 10;

  // ── notes and list names: localStorage only ──────────────
  // One place builds the keys. A signed-in counselor's notes are keyed by the
  // account and the facility; a signed-out note keeps the older key
  // 'finder-note:<id>', which a signed-in counselor's first look at that
  // facility moves under their account (migrateNote).
  function noteKey(account, id) { return account ? 'finder-note:' + account + ':' + id : 'finder-note:' + id; }
  function legacyNoteKey(id) { return 'finder-note:' + id; }
  function listNameKey(account, listId) { return 'finder-listname:' + account + ':' + listId; }

  function safeGet(store, k) { try { return store.getItem(k); } catch (e) { return null; } }
  function safeSet(store, k, v) { try { store.setItem(k, v); } catch (e) { /* storage blocked: the box keeps its text until reload */ } }
  function safeDel(store, k) { try { store.removeItem(k); } catch (e) { /* ignore */ } }

  // Move a pre-account note under the account, once. Never overwrites a note
  // already kept under the account.
  function migrateNote(store, account, id) {
    if (!account) return;
    var old = safeGet(store, legacyNoteKey(id));
    if (old === null) return;
    if (safeGet(store, noteKey(account, id)) === null) safeSet(store, noteKey(account, id), old);
    safeDel(store, legacyNoteKey(id));
  }

  function getNote(store, account, id) {
    migrateNote(store, account, id);
    return safeGet(store, noteKey(account, id)) || '';
  }

  function setNote(store, account, id, text) {
    if (text) safeSet(store, noteKey(account, id), text);
    else safeDel(store, noteKey(account, id));
  }

  function listName(store, account, listId, position) {
    return safeGet(store, listNameKey(account, listId)) || (position === 1 ? 'My shortlist' : 'Shortlist ' + position);
  }

  function setListName(store, account, listId, name) {
    name = String(name || '').trim().slice(0, 60);
    if (name) safeSet(store, listNameKey(account, listId), name); else safeDel(store, listNameKey(account, listId));
  }

  // ── compare: the six named fields ────────────────────────
  // Setting or level, payment, medication, population, phone and transit time.
  // Transit time joins this list when the transit slice (tracker 250) ships; no
  // row, and no empty cell, stands in for it before then.
  var NOT_REPORTED = 'Not reported';

  // facetValue(key, facet) is finder.js's reader: [[text, isUnknown], ...].
  function known(parts) {
    var out = (parts || []).filter(function (p) { return p && !p[1]; }).map(function (p) { return p[0]; });
    return out.length ? out.join('; ') : null;
  }

  function compareRows(recs, facetValue) {
    function facet(r, key) { return (r.facets || {})[key]; }
    function cell(r, key) { return known(facetValue(key, facet(r, key))) || NOT_REPORTED; }
    var rows = [
      { label: 'Setting or level', cells: recs.map(function (r) {
        if (r.kind === 'residence') return 'Recovery residence';
        var parts = [known(facetValue('setting', facet(r, 'setting'))), known(facetValue('licensed_level', facet(r, 'licensed_level'))),
          known(facetValue('medicaid_level', facet(r, 'medicaid_level')))].filter(Boolean);
        return parts.length ? parts.join('; ') : NOT_REPORTED;
      }) },
      { label: 'Payment', cells: recs.map(function (r) { return r.kind === 'residence' ? NOT_REPORTED : cell(r, 'payment'); }) },
      { label: 'Medication for opioid use disorder', cells: recs.map(function (r) { return r.kind === 'residence' ? NOT_REPORTED : cell(r, 'moud'); }) },
      { label: 'Population', cells: recs.map(function (r) { return r.kind === 'residence' ? NOT_REPORTED : cell(r, 'population'); }) },
      { label: 'Phone', cells: recs.map(function (r) { return r.phone ? String(r.phone) : NOT_REPORTED; }) }
    ];
    return rows;
  }

  // The entries compare opens with: the ticked ones, else the first four, never more than four.
  function pickForCompare(entries, ticked) {
    var chosen = entries.filter(function (e) { return ticked.indexOf(e.id) !== -1; });
    if (!chosen.length) chosen = entries;
    return chosen.slice(0, COMPARE_MAX);
  }

  // ── handout ──────────────────────────────────────────────
  // model = { entries: [{name, address, phone, hours}], crisis: [{area, lines: [{name, phone, hours}]}] }
  // 988 and 911 are always on it. Nothing here reads a note.
  function handoutModel(recs, addressOf, crisisAreas) {
    var entries = recs.slice(0, HANDOUT_MAX).map(function (r) {
      var name = r.name || 'Program';
      if (r.subname && r.subname !== r.name) name += ' (' + r.subname + ')';
      return { name: name, address: addressOf(r) || '', phone: r.phone ? String(r.phone) : '', hours: r.hours ? String(r.hours) : '' };
    });
    return { entries: entries, crisis: crisisAreas || [] };
  }

  var ALWAYS = [
    { name: 'Medical emergency', phone: '911', hours: '' },
    { name: 'Suicide and crisis lifeline (call or text)', phone: '988', hours: '24 hours' }
  ];

  // ── PDF, made here ───────────────────────────────────────
  // A text-only PDF 1.4 with the two standard fonts: no library, no request.
  var W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
    278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611,
    722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584]; // Helvetica widths for U+0020..U+007E

  var FIX = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', ' ': ' ', '•': '*' };
  // The PDF is written in plain ASCII: anything else becomes '?'.
  function ascii(s) {
    return String(s).replace(/[^\x20-\x7e]/g, function (c) { return FIX[c] || '?'; });
  }

  function textWidth(s, size, bold) {
    var w = 0;
    for (var i = 0; i < s.length; i++) w += W[s.charCodeAt(i) - 32] || 556;
    return w * size / 1000 * (bold ? 1.08 : 1);
  }

  function wrap(s, size, bold, max) {
    var out = [];
    var line = '';
    ascii(s).split(/\s+/).filter(Boolean).forEach(function (word) {
      var next = line ? line + ' ' + word : word;
      if (line && textWidth(next, size, bold) > max) { out.push(line); line = word; } else line = next;
    });
    if (line) out.push(line);
    return out.length ? out : [''];
  }

  function esc(s) { return s.replace(/[\\()]/g, '\\$&'); }

  var PAGE = { w: 612, h: 792, margin: 54 };

  // Lay the handout out as pages of {font, size, x, y, text} lines.
  function layout(model, title) {
    var pages = [[]];
    var y = PAGE.h - PAGE.margin;
    var max = PAGE.w - 2 * PAGE.margin;
    function put(text, size, bold, indent, gap) {
      wrap(text, size, bold, max - indent).forEach(function (ln) {
        if (y - size < PAGE.margin) { pages.push([]); y = PAGE.h - PAGE.margin; }
        pages[pages.length - 1].push({ bold: bold, size: size, x: PAGE.margin + indent, y: y - size, text: ln });
        y -= size * 1.3;
      });
      y -= gap || 0;
    }
    put(title, 20, true, 0, 6);
    put('Places to call. Call ahead to confirm before you go.', 10, false, 0, 10);
    model.entries.forEach(function (e) {
      put(e.name, 13, true, 0, 1);
      if (e.address) put('Address: ' + e.address, 11, false, 10, 0);
      put('Phone: ' + (e.phone || 'not listed'), 11, false, 10, 0);
      if (e.hours) put('Hours: ' + e.hours, 11, false, 10, 0);
      y -= 8;
    });
    put('If you need help right now', 14, true, 0, 2);
    ALWAYS.forEach(function (l) { put(l.name + ': ' + l.phone + (l.hours ? ' (' + l.hours + ')' : ''), 11, false, 10, 0); });
    (model.crisis || []).forEach(function (a) {
      y -= 6;
      put(a.area, 12, true, 0, 1);
      a.lines.forEach(function (l) { put((l.name ? l.name + ': ' : '') + l.phone + (l.hours ? ' (' + l.hours + ')' : ''), 11, false, 10, 0); });
    });
    return pages;
  }

  function buildPdf(model, title) {
    var pages = layout(model, title || 'Treatment options');
    var objs = []; // objs[i] is the body of object i+1
    var nPages = pages.length;
    // 1 catalog, 2 page tree, 3 and 4 fonts, then (page, content) pairs.
    var kids = [];
    for (var i = 0; i < nPages; i++) kids.push((5 + 2 * i) + ' 0 R');
    objs[0] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[1] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + nPages + ' >>';
    objs[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    pages.forEach(function (lines, p) {
      var s = lines.map(function (l) {
        return 'BT /' + (l.bold ? 'F2' : 'F1') + ' ' + l.size + ' Tf ' + l.x.toFixed(2) + ' ' + l.y.toFixed(2) + ' Td (' + esc(l.text) + ') Tj ET';
      }).join('\n');
      objs[4 + 2 * p] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PAGE.w + ' ' + PAGE.h + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (6 + 2 * p) + ' 0 R >>';
      objs[5 + 2 * p] = '<< /Length ' + s.length + ' >>\nstream\n' + s + '\nendstream';
    });
    var out = '%PDF-1.4\n';
    var offsets = [];
    objs.forEach(function (body, i) {
      offsets.push(out.length);
      out += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
    });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    var bytes = new Uint8Array(out.length);
    for (var j = 0; j < out.length; j++) bytes[j] = out.charCodeAt(j);
    return bytes;
  }

  var api = {
    NOTE_WARNING: NOTE_WARNING, COMPARE_MAX: COMPARE_MAX, HANDOUT_MAX: HANDOUT_MAX, ALWAYS: ALWAYS,
    noteKey: noteKey, legacyNoteKey: legacyNoteKey, listNameKey: listNameKey,
    getNote: getNote, setNote: setNote, migrateNote: migrateNote, listName: listName, setListName: setListName,
    compareRows: compareRows, pickForCompare: pickForCompare, handoutModel: handoutModel, buildPdf: buildPdf
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FinderLists = api;
})(typeof window !== 'undefined' ? window : globalThis);
