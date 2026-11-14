/* Opening posts and reports (Kerrigan tracker 253). Pure helpers, no DOM, no
   network: finder.js fetches and draws. Contract (kerr-finder, tracker 253):
   GET  /v1/availability?items=svc-1,res-4          public
   GET  /v1/me/availability?items=...               signed in; adds reported, reported_by_me
        -> {"items":{"svc-1":{post_id,status,posted_on,stale,author_kind},"res-4":null}}
   POST /v1/me/posts {item,status}                  201 | 400 | 401
   POST /v1/me/reports {target,reason}              201 | 401 | 409 (already reported)
   A post never carries its author: the page says "a signed-in counselor" and nothing else. */
(function (root) {
  'use strict';

  var STATUSES = ['open', 'waitlist', 'full'];
  var LABELS = { open: 'Open', waitlist: 'Waitlist', full: 'Full' };
  var REASONS = [['wrong', 'Wrong information'], ['closed', 'Closed or gone'], ['not_stated', 'Not what the source says'], ['abuse', 'Abusive or spam']];
  var AUTHOR = 'a signed-in counselor';
  var NO_REPORT = 'no recent report';
  // A post older than this is out of date. The server sets "stale" from rule post_stale;
  // the page applies the same bound to the date it shows, so a cached answer cannot read fresh.
  var STALE_DAYS = 7;

  function dayNumber(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : NaN;
  }

  function isStale(entry, today) {
    if (entry.stale === true) return true;
    var age = dayNumber(today) - dayNumber(entry.posted_on);
    return age > STALE_DAYS;
  }

  // Detox and crisis results never show a post as a same-day opening: a bed that was open
  // this morning is not open now. They read "Posted open on <date>" and nothing stronger.
  function noSameDay(rec, pageCrisis) {
    if (pageCrisis) return true;
    if (!rec) return false;
    if (rec.type === 'crisis_receiving') return true;
    var f = rec.facets || {};
    return !!(f.wm && f.wm.value === 'yes');
  }

  function validStatus(s) { return STATUSES.indexOf(s) !== -1; }

  // What one result shows. entry: the item's availability value (null or missing = none).
  // Returns {kind: none|reported|current|stale, text, status}.
  function view(entry, rec, today, pageCrisis) {
    if (!entry || typeof entry !== 'object' || !validStatus(entry.status)) return { kind: 'none', text: NO_REPORT, status: '' };
    if (entry.reported === true) return { kind: 'reported', text: 'reported', status: '' };
    var stale = isStale(entry, today);
    var label = LABELS[entry.status];
    var text;
    if (noSameDay(rec, pageCrisis)) text = 'Posted ' + entry.status + ' on ' + entry.posted_on + ' by ' + AUTHOR;
    else text = label + ' on ' + entry.posted_on + ' by ' + AUTHOR;
    if (stale) text += ' · out of date';
    return { kind: stale ? 'stale' : 'current', text: text, status: entry.status };
  }

  // GET parameter for an availability read: item ids joined by commas, deduplicated.
  function itemsParam(ids) {
    var seen = {}, out = [];
    (ids || []).forEach(function (id) { if (id && !seen[id]) { seen[id] = 1; out.push(id); } });
    return out.join(',');
  }

  // Message for a failed report or post, by HTTP status.
  function failText(status, what) {
    if (status === 409) return 'You already reported this.';
    if (status === 401) return 'Sign in to ' + what + '.';
    return 'Could not ' + what + ' (HTTP ' + status + ').';
  }

  var api = {
    STATUSES: STATUSES, LABELS: LABELS, REASONS: REASONS, AUTHOR: AUTHOR, NO_REPORT: NO_REPORT, STALE_DAYS: STALE_DAYS,
    view: view, isStale: isStale, noSameDay: noSameDay, validStatus: validStatus, itemsParam: itemsParam, failText: failText
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FinderPosts = api;
})(typeof window !== 'undefined' ? window : globalThis);
