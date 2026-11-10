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

  /* Vacancies as the house posted them (Kerrigan tracker 254). vacancyView(vacancy, admission, today)
     takes the API's residence.vacancy ({beds, posted_on, stale_after_days}) and residence.admission
     ('interview_and_house_vote' for an Oxford House, else null), and returns the lines the card shows as
     [{cls, text}]. `today` is 'YYYY-MM-DD'. Nothing here is a counselor posting; those are a separate list. */
  var ADMISSION_INTERVIEW_VOTE = 'interview_and_house_vote';
  var DEFAULT_STALE_DAYS = 7;
  var DAY_MS = 86400000;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function ageDays(posted, today) {
    if (!DATE_RE.test(String(posted || '')) || !DATE_RE.test(String(today || ''))) return null;
    return Math.round((Date.parse(today) - Date.parse(posted)) / DAY_MS);
  }

  function vacancyView(vacancy, admission, today) {
    var out = [];
    var v = vacancy || null;
    if (v) {
      var beds = v.beds;
      var bedsText = typeof beds === 'number'
        ? (beds === 0 ? 'No vacancies posted' : 'Vacancies: ' + beds + (beds === 1 ? ' bed' : ' beds'))
        : 'Vacancies: number not posted';
      out.push({ cls: 'finder-vacancy', text: bedsText });

      var limit = typeof v.stale_after_days === 'number' ? v.stale_after_days : DEFAULT_STALE_DAYS;
      var age = ageDays(v.posted_on, today);
      var posted;
      var stale;
      if (!DATE_RE.test(String(v.posted_on || ''))) {
        posted = 'Posted by the house, no date given. Out of date.';
        stale = true;
      } else {
        stale = age === null || age > limit;
        posted = 'Posted by the house ' + v.posted_on + (stale ? '. Out of date: older than ' + limit + ' days.' : '');
      }
      out.push({ cls: 'finder-vacancy-posted' + (stale ? ' finder-vacancy-stale' : ''), text: posted });
    }
    if (admission === ADMISSION_INTERVIEW_VOTE) out.push({ cls: 'finder-admission', text: 'Admission is by interview and house vote.' });
    return out;
  }

  var api = { certLine: certLine, vacancyView: vacancyView };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FinderCert = api;
})(typeof window !== 'undefined' ? window : globalThis);
