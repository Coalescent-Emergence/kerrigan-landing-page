/* Certification wording for recovery residences (Kerrigan tracker 244).
   No DOM. certLine(cert) takes the API's residence.certification object
   ({status, expires_on, accreditor}) and returns the one line the card shows. */
(function (root) {
  'use strict';

  function certLine(cert) {
    var c = cert || {};
    if (c.status === 'certified') {
      return 'Certified by Virginia (DBHDS), through ' + (c.accreditor || 'an accreditor the state list does not name');
    }
    if (c.status === 'conditional') {
      var line = 'Conditionally certified by Virginia (DBHDS)';
      return c.expires_on
        ? line + ' until ' + c.expires_on
        : line + ", end date not readable on the state's list";
    }
    return "Status: not on Virginia's certified list";
  }

  var api = { certLine: certLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FinderCert = api;
})(typeof window !== 'undefined' ? window : globalThis);
