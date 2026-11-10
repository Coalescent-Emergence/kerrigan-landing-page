/* Upgrade choice for a signed-in free finder account. Pure helpers: finder.js
   does the fetching and the DOM. Contract (Kerrigan internal/api/handlers):
   GET /api/signup/plans -> {plans:[{code,name,price_cents,interval,trial_days,available}]}
   POST /api/billing/checkout {plan_code} (Bearer) -> 200 {url}
     | 400 {error:{code:"invalid_tier"}} | 409 {error:"already_subscribed"|"founder_full"}
     | 503 {error:{code:"checkout_unavailable"}}. Both error shapes are read. */
(function (root) {
  'use strict';

  var DEFAULT_APP_URL = 'https://ui.latentworx.com/';

  function errorCode(body) {
    if (!body) return '';
    var e = body.error;
    if (typeof e === 'string') return e;
    if (e && typeof e === 'object' && e.code) return String(e.code);
    return '';
  }

  // Plans the account can choose now, in the order the API gave them.
  function offered(body) {
    var list = body && Array.isArray(body.plans) ? body.plans : [];
    return list.filter(function (p) { return p && typeof p.code === 'string' && p.code && p.available !== false; });
  }

  function hasTrial(plans) {
    return plans.some(function (p) { return Number(p.trial_days) > 0; });
  }

  function heading(plans) {
    var days = plans.reduce(function (m, p) { return Math.max(m, Number(p.trial_days) || 0); }, 0);
    return days > 0 ? 'Start your ' + days + '-day trial' : 'Upgrade to full Kerrigan';
  }

  function price(p) {
    var cents = Number(p.price_cents);
    if (!isFinite(cents) || cents <= 0) return '';
    var dollars = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
    var per = p.interval === 'year' ? 'year' : p.interval === 'month' ? 'month' : p.interval || '';
    return '$' + dollars + (per ? ' per ' + per : '');
  }

  function planLabel(p) {
    var bits = [p.name || p.code];
    var pr = price(p);
    if (pr) bits.push(pr);
    if (Number(p.trial_days) > 0) bits.push(p.trial_days + '-day trial');
    return bits.join(' - ');
  }

  // Only an https address is followed: the API answers a Stripe Checkout URL.
  function safeCheckoutUrl(u) {
    if (typeof u !== 'string') return '';
    try { return new URL(u).protocol === 'https:' ? u : ''; } catch (e) { return ''; }
  }

  // Turns a checkout reply into what the page does next:
  // {go: url} | {text, app?: url, retry?: true}
  function checkoutOutcome(res, appUrl) {
    var app = appUrl || DEFAULT_APP_URL;
    var status = res ? res.status : 0;
    var body = res ? res.body : null;
    var code = errorCode(body);
    if (status === 200) {
      var url = safeCheckoutUrl(body && body.url);
      if (url) return { go: url };
      return { text: 'Checkout did not return a payment page. Try again in a moment.' };
    }
    if (code === 'already_subscribed') return { text: 'This account already has a Kerrigan subscription. Open Kerrigan to continue.', app: app };
    if (code === 'founder_full') return { text: 'The Founder plan is full. Choose another plan.', retry: true };
    if (code === 'checkout_unavailable') return { text: 'Checkout is not available right now. Try again in a few minutes.' };
    if (code === 'invalid_tier') return { text: 'That plan is no longer offered. Close this and choose again.', retry: true };
    if (status === 401) return { text: 'Your sign-in expired. Sign in again to upgrade.' };
    return { text: 'Could not start checkout. Try again in a moment.' };
  }

  var api = {
    DEFAULT_APP_URL: DEFAULT_APP_URL, errorCode: errorCode, offered: offered, hasTrial: hasTrial,
    heading: heading, planLabel: planLabel, safeCheckoutUrl: safeCheckoutUrl, checkoutOutcome: checkoutOutcome
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FinderUpgrade = api;
})(typeof window !== 'undefined' ? window : globalThis);
