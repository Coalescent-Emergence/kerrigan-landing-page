/* Residence street rule (Kerrigan tracker 251). No DOM.
   streetLine(detail, result): detail is GET /v1/me/residences/{id} (signed in
   only), result is the search result. Returns the full address line, or null
   when the detail has no street. A signed-out page never calls this, so it
   shows the town only. */
(function (root) {
  'use strict';

  function streetLine(d, r) {
    if (!d || !d.street) return null;
    var first = [d.house_number, d.street].filter(Boolean).join(' ');
    var rest = [d.town || (r && r.town), d.zip].filter(Boolean).join(' ');
    return [first, rest].filter(Boolean).join(', ');
  }

  var api = { streetLine: streetLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FinderStreet = api;
})(typeof window !== 'undefined' ? window : globalThis);
