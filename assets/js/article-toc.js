/* Article "On this page" rail (tracker 27). No dependencies.
   1. scroll-spy: the last h2 whose top is within 120px gets aria-current on its ToC link
   2. desktop (>=1180px): list always open, summary is a static label; below: collapsible
   3. phone: a fixed "Contents" shortcut once the ToC has scrolled out of view
   4. clicking the shortcut or "Back to top" opens the list */
(function () {
  var toc = document.getElementById('contents');
  var det = document.getElementById('toc-details');
  if (!toc || !det) return;
  var sum = det.querySelector('summary');
  var fab = document.querySelector('.toc-fab');
  var mq = window.matchMedia('(min-width:1180px)');
  var links = Array.prototype.slice.call(toc.querySelectorAll('ol a'));
  var heads = links.map(function (a) {
    return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
  });

  function mode() {
    if (mq.matches) {
      det.open = true;
      sum.tabIndex = -1;
    } else {
      sum.removeAttribute('tabindex');
    }
  }
  if (mq.addEventListener) mq.addEventListener('change', function () {
    mode();
    if (!mq.matches) det.open = false;
  });
  else if (mq.addListener) mq.addListener(mode);
  mode();
  sum.addEventListener('click', function (e) { if (mq.matches) e.preventDefault(); });

  var ticking = false;
  function spy() {
    ticking = false;
    var cur = -1;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i] && heads[i].getBoundingClientRect().top <= 120) cur = i;
    }
    links.forEach(function (a, i) {
      if (i === cur) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(spy); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  spy();

  if (fab && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1];
      fab.classList.toggle('is-visible', !e.isIntersecting);
    }).observe(toc);
  }
  function open() { det.open = true; }
  if (fab) fab.addEventListener('click', open);
  var top = toc.querySelector('.toc-top');
  if (top) top.addEventListener('click', open);
})();
