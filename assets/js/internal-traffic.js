// Marks owner and automated browsers as internal so PostHog can filter them out.
// ?internal=1 sets a flag in localStorage, ?internal=0 clears it; webdriver browsers count as internal.
(function (root) {
  var KEY = 'lwx_internal';

  function isInternal(search, store, webdriver) {
    try {
      var v = new URLSearchParams(search || '').get('internal');
      if (v === '1') store.setItem(KEY, '1');
      else if (v === '0') store.removeItem(KEY);
    } catch (e) { /* storage blocked: fall through */ }
    var flagged = false;
    try { flagged = store.getItem(KEY) === '1'; } catch (e) { /* storage blocked */ }
    return flagged || webdriver === true;
  }

  var api = { isInternal: isInternal, KEY: KEY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LwxInternalTraffic = api;
})(typeof window !== 'undefined' ? window : globalThis);
